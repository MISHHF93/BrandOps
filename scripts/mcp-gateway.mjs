#!/usr/bin/env node
/**
 * Standalone MCP stdio gateway for external agents (Claude Code, Codex, CLI).
 *
 * Run: npm run mcp:gateway
 *
 * Env:
 *   BRANDOPS_MCP_TOKEN      Required. Session token created in the Connected
 *                           Agents panel. Never committed; passed to the agent
 *                           config as a secret.
 *   BRANDOPS_MCP_WORKSPACE  Optional. Path to the workspace JSON exported from
 *                           the Connected Agents panel ("Export workspace for
 *                           MCP"). The gateway authenticates the token against
 *                           the session hash in this workspace, so without it
 *                           the token cannot resolve and every call returns
 *                           E_UNAUTHORIZED. When unset, an in-memory seeded
 *                           workspace is used (useful for tool-list smoke tests
 *                           only — no panel session can authenticate).
 *
 * Wire it into Claude Code (~/.claude/settings.json) using the snippet the
 * Connected Agents panel provides (it sets both BRANDOPS_MCP_TOKEN and
 * BRANDOPS_MCP_WORKSPACE):
 *   "mcpServers": {
 *     "brandops": {
 *       "type": "stdio",
 *       "command": "npx",
 *       "args": ["tsx", "scripts/mcp-gateway.mjs"],
 *       "env": {
 *         "BRANDOPS_MCP_TOKEN": "<token>",
 *         "BRANDOPS_MCP_WORKSPACE": "<path-to-exported-workspace.json>"
 *       }
 *     }
 *   }
 *
 * Node-only transport. Never imported by the browser SPA.
 */
import process from 'node:process';
import { existsSync, readFileSync } from 'node:fs';
import { createInMemorySeededWorkspace, withDefaults } from '../src/services/storage/storage';
import {
  diagnoseAgentToken,
  listAgentSessions,
  resolveAgentSession
} from '../src/services/interop/sessions';
import { executeAgentToolCall } from '../src/services/interop/gateway';
import { listMcpTools, startMcpStdioServer } from '../src/services/interop/mcp/server';
import { createInMemoryWorkspaceStore, createWorkspaceFileStore } from './lib/workspaceStore.mjs';
import {
  listResourceTemplates,
  listResources,
  resolveResourceUri
} from '../src/services/interop/mcp/resources';
import {
  applyTaskInputResponses,
  cancelTask,
  resolveTask
} from '../src/services/interop/mcp/tasks';

const isBrandOpsWorkspaceShape = (value) =>
  Boolean(
    value &&
    typeof value === 'object' &&
    Array.isArray(value.modules) &&
    Array.isArray(value.publishingQueue) &&
    Array.isArray(value.contentLibrary) &&
    Boolean(value.settings)
  );

const token = process.env.BRANDOPS_MCP_TOKEN;
if (!token) {
  process.stderr.write(
    'E_MISSING_TOKEN: set BRANDOPS_MCP_TOKEN to a session token from the Connected Agents panel.\n'
  );
  process.exit(1);
}

const workspacePath = process.env.BRANDOPS_MCP_WORKSPACE;
let workspace;
if (workspacePath) {
  if (!existsSync(workspacePath)) {
    process.stderr.write(
      `E_MISSING_WORKSPACE: BRANDOPS_MCP_WORKSPACE points to "${workspacePath}" which does not exist.\n` +
        'Export the workspace from the Connected Agents panel ("Export workspace for MCP") and point this var at that file.\n'
    );
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(workspacePath, 'utf8'));
  } catch (error) {
    process.stderr.write(
      `E_INVALID_WORKSPACE: "${workspacePath}" is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
    process.exit(1);
  }
  if (!isBrandOpsWorkspaceShape(parsed)) {
    process.stderr.write(
      'E_INVALID_WORKSPACE: the file does not look like a BrandOps workspace export. ' +
        'Export it from the Connected Agents panel ("Export workspace for MCP") and retry.\n'
    );
    process.exit(1);
  }
  workspace = withDefaults(parsed);
} else {
  workspace = createInMemorySeededWorkspace();
}

/**
 * Every call reads the workspace fresh and writes it back under a
 * compare-and-swap. The gateway used to hold one snapshot for the life of the
 * process: it never saw the app's later writes, and its own writes silently
 * clobbered anyone else's. See `lib/workspaceStore.mjs`.
 */
const store = workspacePath
  ? createWorkspaceFileStore(workspacePath, withDefaults)
  : createInMemoryWorkspaceStore(workspace);

const startGateway = () =>
  startMcpStdioServer({
    getToken: () => token,
    callTool: async (toolName, args, extra) =>
      store.mutate(async (current) => {
        const {
          workspace: next,
          session,
          result
        } = await executeAgentToolCall({
          workspace: current,
          token,
          call: {
            toolName,
            args: args ?? {},
            idempotencyKey: extra?.idempotencyKey,
            purpose: extra?.purpose
          }
        });
        return {
          workspace: next,
          value: { ...result, data: { ...result.data, sessionId: session.id } }
        };
      }),
    // Discovery is scoped to what this session may actually invoke — advertising
    // a tool the caller cannot use leaks workspace shape and invites refusals.
    listTools: async () => {
      const current = store.read();
      const session = await resolveAgentSession(current, token);
      return listMcpTools({
        grantedCapabilities: session?.grantedCapabilities,
        professionPackId: current.settings?.professionPackId
      });
    },
    resources: {
      list: async () => {
        const current = store.read();
        const session = await resolveAgentSession(current, token);
        return listResources(current, { grantedCapabilities: session?.grantedCapabilities });
      },
      templates: async () => {
        const session = await resolveAgentSession(store.read(), token);
        return listResourceTemplates({ grantedCapabilities: session?.grantedCapabilities });
      },
      /**
       * A resource read is a capability call. It goes through the same
       * gateway a tool call goes through, so identity, policy, rate limit
       * and audit all apply — resources are an address, not a side door.
       */
      read: async (uri) => {
        const resolved = resolveResourceUri(uri);
        if (!resolved) return { ok: false, error: `Unknown resource URI: ${uri}` };
        return store.mutate(async (current) => {
          const { workspace: next, result } = await executeAgentToolCall({
            workspace: current,
            token: token,
            call: { toolName: resolved.call.toolName, args: resolved.call.args }
          });
          return {
            workspace: next,
            value: {
              ok: result.ok,
              mimeType: resolved.mimeType,
              data: result.data,
              errorCode: result.errorCode,
              error: result.error,
              capabilityId: resolved.capabilityId
            }
          };
        });
      }
    },
    // Tasks extension: every handler resolves the caller's session from the same
    // token, so a task can only ever be read or cancelled by the session that
    // requested it.
    tasks: {
      get: async (taskId) => {
        const current = store.read();
        const session = await resolveAgentSession(current, token);
        if (!session) return { ok: false, errorCode: 'unauthorized', error: 'Unknown session.' };
        return resolveTask(current, taskId, session.id);
      },
      cancel: async (taskId) =>
        store.mutate(async (current) => {
          const session = await resolveAgentSession(current, token);
          if (!session)
            return {
              workspace: current,
              value: { ok: false, errorCode: 'unauthorized', error: 'Unknown session.' }
            };
          const outcome = cancelTask(current, taskId, session.id);
          // A refused cancel returns the workspace untouched, so nothing is written.
          return { workspace: outcome.ok ? outcome.workspace : current, value: outcome };
        }),
      update: async (taskId, inputResponses) =>
        store.mutate(async (current) => {
          const session = await resolveAgentSession(current, token);
          if (!session)
            return {
              workspace: current,
              value: { ok: false, errorCode: 'unauthorized', error: 'Unknown session.' }
            };
          const outcome = applyTaskInputResponses(current, taskId, session.id, inputResponses);
          return { workspace: outcome.ok ? outcome.workspace : current, value: outcome };
        })
    }
  });

const diagnostic = await diagnoseAgentToken(workspace, token);
if (!diagnostic.resolved) {
  const reasons = {
    'no-sessions':
      'the workspace has no agent sessions at all (create one in the Connected Agents panel)',
    'not-found':
      'the token hash does not match any session in the loaded workspace (wrong/expired token, or the workspace predates the session)',
    revoked:
      'the matching session has been revoked (create a new session in the Connected Agents panel)',
    expired: 'the matching session has expired (create a new session in the Connected Agents panel)'
  };
  const hint = workspacePath
    ? `BRANDOPS_MCP_WORKSPACE="${workspacePath}" does not contain this token. Re-export the workspace from the Connected Agents panel after creating the session, then restart this gateway.`
    : 'BRANDOPS_MCP_WORKSPACE is unset — the gateway loaded an in-memory seed with no sessions. Create a session in the Connected Agents panel, export the workspace ("Export workspace for MCP"), set BRANDOPS_MCP_WORKSPACE to that file, then restart this gateway.';
  process.stderr.write(
    `E_TOKEN_UNRESOLVED: ${diagnostic.reason} — ${reasons[diagnostic.reason]}. ` +
      `Token hash prefix: ${diagnostic.tokenHashPrefix}…; ${diagnostic.activeSessionCount} active session(s) in the loaded workspace.\n${hint}\n`
  );
  process.exit(1);
}

const sessions = listAgentSessions(workspace);
process.stderr.write(
  `[BrandOps] MCP gateway ready. Session resolved (token hash ${diagnostic.tokenHashPrefix}…, ` +
    `${sessions.filter((s) => s.status === 'active').length} active session(s) in workspace` +
    `${workspacePath ? ` ${workspacePath}` : ''}).\n`
);
startGateway();
