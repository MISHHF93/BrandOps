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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInMemorySeededWorkspace, withDefaults } from '../src/services/storage/storage';
import { diagnoseAgentToken, listAgentSessions } from '../src/services/interop/sessions';
import { executeAgentToolCall } from '../src/services/interop/gateway';
import { startMcpStdioServer } from '../src/services/interop/mcp/server';

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

const persist = () => {
  if (!workspacePath) return;
  try {
    writeFileSync(workspacePath, JSON.stringify(workspace, null, 2));
  } catch (error) {
    process.stderr.write(`E_PERSIST: ${error instanceof Error ? error.message : String(error)}\n`);
  }
};

const startGateway = () =>
  startMcpStdioServer({
    getToken: () => token,
    callTool: async (toolName, args, extra) => {
      const {
        workspace: next,
        session,
        result
      } = await executeAgentToolCall({
        workspace,
        token,
        call: {
          toolName,
          args: args ?? {},
          idempotencyKey: extra?.idempotencyKey,
          purpose: extra?.purpose
        }
      });
      workspace = next;
      persist();
      return { ...result, data: { ...result.data, sessionId: session.id } };
    }
  });

const diagnostic = await diagnoseAgentToken(workspace, token);
if (!diagnostic.resolved) {
  const reasons = {
    'no-sessions':
      'the workspace has no agent sessions at all (create one in the Connected Agents panel)',
    'not-found':
      'the token hash does not match any session in the loaded workspace (wrong/expired token, or the workspace predates the session)',
    revoked: 'the matching session has been revoked (create a new session in the Connected Agents panel)',
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
