#!/usr/bin/env node
/**
 * Remote-capable MCP gateway over Streamable HTTP.
 *
 * Run: npm run mcp:http
 *
 * Unlike the stdio gateway, this one is reachable by any client that can make an
 * HTTP request, so every request must carry its own credential — there is no
 * ambient process token. Each POST authenticates its `Authorization: Bearer`
 * against a BrandOps session in the loaded workspace, and the resolved session's
 * capability grants govern the call exactly as they do over stdio.
 *
 * Env:
 *   BRANDOPS_MCP_WORKSPACE       Required. Workspace JSON exported from the
 *                                Connected Agents panel. Sessions live here, so
 *                                without it no token can resolve.
 *   BRANDOPS_MCP_HTTP_HOST       Default 127.0.0.1. Binding to 0.0.0.0 exposes
 *                                the workspace to the network — do it only
 *                                behind a reverse proxy that terminates TLS and
 *                                authenticates.
 *   BRANDOPS_MCP_HTTP_PORT       Default 8787.
 *   BRANDOPS_MCP_CANONICAL_URI   Default http://<host>:<port>/mcp. The RFC 8707
 *                                resource identifier advertised in Protected
 *                                Resource Metadata.
 *   BRANDOPS_MCP_ALLOWED_ORIGINS Comma-separated. Empty (default) rejects every
 *                                request carrying an Origin header, which is
 *                                what you want for non-browser clients.
 *   BRANDOPS_MCP_AUTH_SERVERS    Comma-separated authorization server issuers
 *                                advertised in Protected Resource Metadata.
 *                                Empty means no OAuth authorization server is
 *                                integrated: only BrandOps-issued session tokens
 *                                are accepted.
 *
 * Node-only. Never imported by the browser SPA.
 */
import process from 'node:process';
import { createServer } from 'node:http';
import { createWorkspaceFileStore } from './lib/workspaceStore.mjs';
import {
  listResourceTemplates,
  listResources,
  resolveResourceUri
} from '../src/services/interop/mcp/resources';
import { existsSync, readFileSync } from 'node:fs';
import { withDefaults } from '../src/services/storage/storage';
import { resolveAgentSession } from '../src/services/interop/sessions';
import { executeAgentToolCall } from '../src/services/interop/gateway';
import { dispatchMcpMethod, listMcpTools } from '../src/services/interop/mcp/server';
import { handleMcpHttpRequest } from '../src/services/interop/mcp/httpTransport';
import {
  applyTaskInputResponses,
  cancelTask,
  resolveTask
} from '../src/services/interop/mcp/tasks';
import { AGENT_CAPABILITY_DEFINITIONS } from '../src/services/interop/capabilityRegistry';

const workspacePath = process.env.BRANDOPS_MCP_WORKSPACE;
if (!workspacePath || !existsSync(workspacePath)) {
  process.stderr.write(
    'E_MISSING_WORKSPACE: set BRANDOPS_MCP_WORKSPACE to a workspace JSON exported from the ' +
      'Connected Agents panel ("Export workspace for MCP"). Sessions live in that file, so ' +
      'without it no bearer token can resolve.\n'
  );
  process.exit(1);
}

// Parsed once at startup only to fail fast on a malformed file. The request
// path never reads this value — it reads the store, which re-reads the file.
try {
  withDefaults(JSON.parse(readFileSync(workspacePath, 'utf8')));
} catch (error) {
  process.stderr.write(
    `E_INVALID_WORKSPACE: "${workspacePath}" is not valid JSON: ${
      error instanceof Error ? error.message : String(error)
    }\n`
  );
  process.exit(1);
}

/**
 * Every request reads the workspace fresh and writes it back under a
 * compare-and-swap. This host used to hold one snapshot for the life of the
 * process — invisible to the app's later writes, and silently clobbering them
 * on every save. Over HTTP that is worse than over stdio: concurrent clients are
 * the normal case here, not the exception. See `lib/workspaceStore.mjs`.
 */
const store = createWorkspaceFileStore(workspacePath, withDefaults);

const host = process.env.BRANDOPS_MCP_HTTP_HOST || '127.0.0.1';
const port = Number(process.env.BRANDOPS_MCP_HTTP_PORT || 8787);
const canonicalUri = process.env.BRANDOPS_MCP_CANONICAL_URI || `http://${host}:${port}/mcp`;
const splitList = (value) =>
  (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const config = {
  canonicalUri,
  mcpPath: new URL(canonicalUri).pathname,
  allowedOrigins: splitList(process.env.BRANDOPS_MCP_ALLOWED_ORIGINS),
  authorizationServers: splitList(process.env.BRANDOPS_MCP_AUTH_SERVERS),
  /**
   * BrandOps capability ids are the scopes — least privilege is already modeled
   * there. What is advertised, though, is only the minimal set needed for basic
   * functionality: reading context. Everything else is granted through a
   * step-up, where the 403 names the exact capability the call needed. A client
   * should never be nudged into asking for all 37 up front.
   */
  scopesSupported: AGENT_CAPABILITY_DEFINITIONS.filter((def) =>
    ['context.read', 'goals.read', 'artifacts.read', 'plans.read'].includes(def.id)
  ).map((def) => def.id)
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      // Refuse absurd bodies rather than buffering them.
      if (raw.length > 1_000_000) reject(new Error('Request body too large'));
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });

const handlers = {
  authenticate: async (token) => {
    const session = await resolveAgentSession(store.read(), token);
    if (!session) {
      return { ok: false, errorDescription: 'Unknown, revoked, or expired session token.' };
    }
    return { ok: true, sessionId: session.id };
  },
  dispatch: async ({ method, params, bearer }) =>
    dispatchMcpMethod({
      method,
      params,
      handlers: {
        callTool: async (toolName, args, extra) =>
          store.mutate(async (current) => {
            const {
              workspace: next,
              session,
              result
            } = await executeAgentToolCall({
              workspace: current,
              token: bearer,
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
        listTools: async () => {
          const current = store.read();
          const session = await resolveAgentSession(current, bearer);
          return listMcpTools({
            grantedCapabilities: session?.grantedCapabilities,
            professionPackId: current.settings?.professionPackId
          });
        },
        resources: {
          list: async () => {
            const current = store.read();
            const session = await resolveAgentSession(current, bearer);
            return listResources(current, { grantedCapabilities: session?.grantedCapabilities });
          },
          templates: async () => {
            const session = await resolveAgentSession(store.read(), bearer);
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
                token: bearer,
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
        tasks: {
          get: async (taskId) => {
            const current = store.read();
            const session = await resolveAgentSession(current, bearer);
            if (!session)
              return { ok: false, errorCode: 'unauthorized', error: 'Unknown session.' };
            return resolveTask(current, taskId, session.id);
          },
          cancel: async (taskId) =>
            store.mutate(async (current) => {
              const session = await resolveAgentSession(current, bearer);
              if (!session)
                return {
                  workspace: current,
                  value: { ok: false, errorCode: 'unauthorized', error: 'Unknown session.' }
                };
              const outcome = cancelTask(current, taskId, session.id);
              return { workspace: outcome.ok ? outcome.workspace : current, value: outcome };
            }),
          update: async (taskId, inputResponses) =>
            store.mutate(async (current) => {
              const session = await resolveAgentSession(current, bearer);
              if (!session)
                return {
                  workspace: current,
                  value: { ok: false, errorCode: 'unauthorized', error: 'Unknown session.' }
                };
              const outcome = applyTaskInputResponses(current, taskId, session.id, inputResponses);
              return { workspace: outcome.ok ? outcome.workspace : current, value: outcome };
            })
        }
      }
    })
};

const server = createServer(async (req, res) => {
  let body = '';
  try {
    body = req.method === 'POST' ? await readBody(req) : '';
  } catch (error) {
    res.writeHead(413, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: error instanceof Error ? error.message : 'Body too large' }
      })
    );
    return;
  }

  const path = new URL(req.url ?? '/', canonicalUri).pathname;
  const bearer = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization ?? '').trim())?.[1];

  const response = await handleMcpHttpRequest(
    { method: req.method ?? 'GET', path, headers: req.headers, body },
    config,
    {
      authenticate: handlers.authenticate,
      // The bearer is threaded through per request: nothing about this server is
      // stateful, and two clients hitting it concurrently never share identity.
      dispatch: ({ method, params }) => handlers.dispatch({ method, params, bearer })
    }
  );

  res.writeHead(response.status, response.headers);
  res.end(response.body ?? '');
});

server.listen(port, host, () => {
  process.stderr.write(
    `[BrandOps] MCP Streamable HTTP gateway on http://${host}:${port}${config.mcpPath}\n` +
      `  resource: ${canonicalUri}\n` +
      `  metadata: http://${host}:${port}/.well-known/oauth-protected-resource\n` +
      `  origins:  ${config.allowedOrigins.length ? config.allowedOrigins.join(', ') : '(none — any Origin header is rejected)'}\n` +
      `  auth:     ${
        config.authorizationServers.length
          ? config.authorizationServers.join(', ')
          : 'BrandOps session tokens only (no OAuth authorization server configured)'
      }\n` +
      `${host === '0.0.0.0' ? '  WARNING: bound to all interfaces. Put TLS and auth in front of it.\n' : ''}`
  );
});
