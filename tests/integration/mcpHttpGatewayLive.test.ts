/**
 * The MCP HTTP gateway, spawned and driven over a real socket.
 *
 * The directive's central claim is that BrandOps is a first-class MCP server.
 * `httpTransport.ts` is covered thoroughly as a module. The 289 lines that turn
 * it into a server someone can connect to — reading the body, parsing headers,
 * routing the path, writing the status — had never been executed by anything.
 *
 * That is the same gap as the webhook connector before cycle 31 and the provider
 * transport before cycle 32: the logic tested, the entry point not. It is the
 * gap that matters most here, because an external agent does not import a
 * module. It opens a socket.
 *
 * So this spawns the real script on a real port and talks to it with `fetch`.
 * What that proves and unit tests cannot: the process starts, binds, parses what
 * a client actually sends, and returns statuses a client actually reads.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PROTOCOL = '2026-07-28';
let child: ChildProcess | undefined;
let base = '';
let token = '';
let dir = '';

/** `_meta` as a conforming client sends it. */
const meta = (version = PROTOCOL) => ({
  'io.modelcontextprotocol/protocolVersion': version,
  'io.modelcontextprotocol/clientInfo': { name: 'live-client', version: '1.0.0' },
  'io.modelcontextprotocol/clientCapabilities': {}
});

async function rpc(
  body: unknown,
  init: {
    token?: string | null;
    path?: string;
    method?: string;
    headers?: Record<string, string>;
  } = {}
) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(init.headers ?? {})
  };
  const bearer = init.token === undefined ? token : init.token;
  if (bearer) headers.authorization = `Bearer ${bearer}`;

  const response = await fetch(`${base}${init.path ?? '/mcp'}`, {
    method: init.method ?? 'POST',
    headers,
    ...(init.method === 'GET' ? {} : { body: JSON.stringify(body) })
  });
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    json: (() => {
      try {
        return JSON.parse(text) as Record<string, unknown>;
      } catch {
        return null;
      }
    })(),
    text
  };
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'brandops-mcp-http-'));

  // A session, minted the way the gateway expects to find one.
  const { createAgentSession } = await import('../../src/services/interop/sessions');
  const { withDefaults } = await import('../../src/services/storage/storage');
  const { seedData } = await import('../../src/modules/brandMemory/seed');
  const created = await createAgentSession(withDefaults(structuredClone(seedData)), {
    clientKind: 'claude-code',
    clientName: 'Live HTTP Client',
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    grantedBundles: [],
    grantedCapabilities: ['plans.read', 'context.read']
  });
  token = created.token;

  const workspacePath = join(dir, 'workspace.json');
  writeFileSync(workspacePath, JSON.stringify(created.workspace, null, 2));

  const port = 8900 + Math.floor(Math.random() * 300);
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['--import', 'tsx', 'scripts/mcp-http-gateway.mjs'], {
    env: {
      ...process.env,
      BRANDOPS_MCP_HTTP_PORT: String(port),
      BRANDOPS_MCP_WORKSPACE: workspacePath,
      BRANDOPS_MCP_TOKEN: token
    },
    stdio: ['ignore', 'ignore', 'pipe']
  });

  // Wait for the port rather than a fixed sleep: a timing guess makes a suite
  // that fails on a slow machine and passes on a fast one.
  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      await fetch(`${base}/.well-known/oauth-protected-resource`);
      break;
    } catch {
      if (Date.now() > deadline) throw new Error('gateway did not start');
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}, 60_000);

afterAll(() => {
  child?.kill();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('the gateway answers a real client', () => {
  it('serves tools/list to an authenticated caller', async () => {
    const response = await rpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: { _meta: meta() }
    });

    expect(response.status).toBe(200);
    const tools = (response.json?.result as { tools?: unknown[] })?.tools;
    expect(Array.isArray(tools)).toBe(true);
    expect((tools ?? []).length).toBeGreaterThan(0);
  });

  it('answers ping', async () => {
    const response = await rpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'ping',
      params: { _meta: meta() }
    });
    expect(response.status).toBe(200);
    expect(response.json?.error).toBeUndefined();
  });
});

describe('authorization, over the wire', () => {
  it('refuses an unauthenticated request with 401', async () => {
    const response = await rpc(
      { jsonrpc: '2.0', id: 3, method: 'tools/list', params: { _meta: meta() } },
      { token: null }
    );
    expect(response.status).toBe(401);
  });

  it('challenges with WWW-Authenticate, as RFC 6750 requires', async () => {
    const response = await rpc(
      { jsonrpc: '2.0', id: 4, method: 'tools/list', params: { _meta: meta() } },
      { token: null }
    );
    // Without the challenge a client cannot discover how to authenticate; it
    // just sees a closed door.
    expect(response.headers.get('www-authenticate')).toBeTruthy();
  });

  it('refuses a token that is not a session', async () => {
    const response = await rpc(
      { jsonrpc: '2.0', id: 5, method: 'tools/list', params: { _meta: meta() } },
      { token: 'not-a-real-token' }
    );
    expect(response.status).toBe(401);
  });

  it('does not leak the workspace in a refusal', async () => {
    const response = await rpc(
      { jsonrpc: '2.0', id: 6, method: 'tools/list', params: { _meta: meta() } },
      { token: null }
    );
    // A 401 body that carried workspace content would make the whole gate
    // decorative.
    expect(response.text).not.toContain('local-workspace');
  });
});

describe('protocol behaviour survives the transport', () => {
  it('acknowledges a notification with 202 and no body', async () => {
    // Cycle 7 fixed this in the dispatcher. This is the first time it has been
    // checked through an actual HTTP response.
    const response = await rpc({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: { _meta: meta() }
    });
    expect(response.status).toBe(202);
    expect(response.text).toBe('');
  });

  it('refuses an unsupported protocol version with -32022', async () => {
    const response = await rpc({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/list',
      params: { _meta: meta('1999-01-01') }
    });
    const error = response.json?.error as { code?: number; data?: { supported?: string[] } };
    expect(error?.code).toBe(-32022);
    // The supported list is what lets a client retry instead of guessing.
    expect(error?.data?.supported).toContain(PROTOCOL);
  });

  /**
   * Learned by driving it: this binding requires `Mcp-Name` on a tool call, and
   * requires it to agree with the body. The point is a proxy that routes on the
   * header — if the two can disagree, what gets routed and what gets executed
   * are different tools. The module tests cover the rule; these confirm it
   * survives to the socket.
   */
  it('requires the Mcp-Name header on a tool call', async () => {
    const response = await rpc({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: { _meta: meta(), name: 'brandops_get_plan_status', arguments: {} }
    });
    expect((response.json?.error as { code?: number })?.code).toBe(-32020);
  });

  it('refuses a header that disagrees with the body', async () => {
    const response = await rpc(
      {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: { _meta: meta(), name: 'brandops_get_plan_status', arguments: {} }
      },
      { headers: { 'mcp-name': 'brandops_request_plan_execution' } }
    );
    // Routing on one tool while executing another is the whole reason the rule
    // exists.
    expect((response.json?.error as { code?: number })?.code).toBe(-32020);
  });

  it('rejects a nameless tools/call once the header agrees', async () => {
    const response = await rpc(
      { jsonrpc: '2.0', id: 10, method: 'tools/call', params: { _meta: meta() } },
      { headers: { 'mcp-name': '' } }
    );
    // Cycle 7's fix, reached through the transport rather than the dispatcher.
    expect((response.json?.error as { code?: number })?.code).toBe(-32602);
  });

  it('accepts a tool call whose header and body agree', async () => {
    const response = await rpc(
      {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: { _meta: meta(), name: 'brandops_get_plan_status', arguments: {} }
      },
      { headers: { 'mcp-name': 'brandops_get_plan_status' } }
    );
    // The counter-case: the rule must not reject everything.
    expect(response.status).toBe(200);
    expect((response.json?.error as { code?: number })?.code).toBeUndefined();
  });
});

describe('the resource advertises how to reach it', () => {
  it('serves RFC 9728 protected-resource metadata without a token', async () => {
    const response = await rpc(null, {
      path: '/.well-known/oauth-protected-resource',
      method: 'GET',
      token: null
    });

    expect(response.status).toBe(200);
    // Discovery has to work before authentication, or nothing can bootstrap.
    expect(response.json?.resource).toBeTruthy();
  });
});
