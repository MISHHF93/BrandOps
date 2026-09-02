/**
 * The stdio MCP gateway, spawned and driven down a real pipe.
 *
 * Stdio is the transport local MCP clients use — it is how Claude Desktop and
 * most editors attach to a server. `mcpSuccessCriterion.test.ts` covers the same
 * sequence and says so plainly: it "performs the same steps as
 * `scripts/mcp-gateway.mjs`, so what passes here is what passes on the wire."
 * That is an assumption, and the last three cycles each found something in the
 * gap between a tested module and an unexecuted entry point.
 *
 * What only a spawned process can show: the framing. Stdio is a byte stream, not
 * a request/response channel — the server has to split lines out of a buffer
 * that may deliver two requests in one chunk or half a request in two. Nothing
 * had ever pushed bytes at it that way.
 *
 * The rest is protocol behaviour confirmed at the boundary a client actually
 * meets: a notification producing *no line at all* rather than an error, a
 * malformed line answered without killing the process, and version negotiation
 * naming what it supports.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PROTOCOL = '2026-07-28';
let child: ChildProcessWithoutNullStreams | undefined;
let dir = '';
let stdout = '';

const meta = (version = PROTOCOL) => ({
  'io.modelcontextprotocol/protocolVersion': version,
  'io.modelcontextprotocol/clientInfo': { name: 'stdio-client', version: '1.0.0' },
  'io.modelcontextprotocol/clientCapabilities': {}
});

/** Write raw bytes and wait for the transcript to stop growing. */
async function send(raw: string, settleMs = 700): Promise<Record<string, unknown>[]> {
  const before = stdout.length;
  child!.stdin.write(raw);

  let last = -1;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, settleMs));
    if (stdout.length === last) break;
    last = stdout.length;
  }

  return stdout
    .slice(before)
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

const line = (body: unknown) => `${JSON.stringify(body)}\n`;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'brandops-mcp-stdio-'));

  const { createAgentSession } = await import('../../src/services/interop/sessions');
  const { withDefaults } = await import('../../src/services/storage/storage');
  const { seedData } = await import('../../src/modules/brandMemory/seed');
  const created = await createAgentSession(withDefaults(structuredClone(seedData)), {
    clientKind: 'claude-code',
    clientName: 'Stdio Client',
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    grantedBundles: [],
    grantedCapabilities: ['plans.read', 'context.read']
  });

  const workspacePath = join(dir, 'workspace.json');
  writeFileSync(workspacePath, JSON.stringify(created.workspace, null, 2));

  child = spawn(process.execPath, ['--import', 'tsx', 'scripts/mcp-gateway.mjs'], {
    env: {
      ...process.env,
      BRANDOPS_MCP_WORKSPACE: workspacePath,
      BRANDOPS_MCP_TOKEN: created.token
    },
    stdio: ['pipe', 'pipe', 'pipe']
  }) as ChildProcessWithoutNullStreams;

  child.stdout.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf8');
  });

  // Let the process boot and read its workspace before anything is sent.
  await new Promise((resolve) => setTimeout(resolve, 1500));
}, 60_000);

afterAll(() => {
  child?.kill();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('a client session over the pipe', () => {
  it('lists tools', async () => {
    const [response] = await send(
      line({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: meta() } })
    );
    const tools = (response.result as { tools?: unknown[] })?.tools;
    expect(Array.isArray(tools)).toBe(true);
    expect((tools ?? []).length).toBeGreaterThan(0);
  });

  it('answers a tool call with the envelope its schema declares', async () => {
    const [response] = await send(
      line({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { _meta: meta(), name: 'brandops_get_plan_status', arguments: {} }
      })
    );
    const result = response.result as { structuredContent?: { capabilityId?: string } };
    // The declared `outputSchema` is binding; this is it holding on the wire.
    expect(result?.structuredContent?.capabilityId).toBe('plans.read');
  });

  it('refuses an unknown method', async () => {
    const [response] = await send(
      line({ jsonrpc: '2.0', id: 3, method: 'nope/nope', params: { _meta: meta() } })
    );
    expect((response.error as { code?: number })?.code).toBe(-32601);
  });

  it('names the versions it supports when refusing one', async () => {
    const [response] = await send(
      line({ jsonrpc: '2.0', id: 4, method: 'tools/list', params: { _meta: meta('1999-01-01') } })
    );
    const error = response.error as { code?: number; data?: { supported?: string[] } };
    expect(error?.code).toBe(-32022);
    expect(error?.data?.supported).toContain(PROTOCOL);
  });
});

describe('framing, which only a real pipe exercises', () => {
  it('answers two requests delivered in a single write', async () => {
    // A client is under no obligation to flush one request per chunk, and the
    // server splits lines out of a buffer. Nothing had pushed bytes at it this
    // way before.
    const responses = await send(
      line({ jsonrpc: '2.0', id: 10, method: 'ping', params: { _meta: meta() } }) +
        line({ jsonrpc: '2.0', id: 11, method: 'ping', params: { _meta: meta() } })
    );
    expect(responses.map((entry) => entry.id).sort()).toEqual([10, 11]);
  });

  it('answers a request split across two writes', async () => {
    const whole = line({ jsonrpc: '2.0', id: 12, method: 'ping', params: { _meta: meta() } });
    const cut = Math.floor(whole.length / 2);

    child!.stdin.write(whole.slice(0, cut));
    await new Promise((resolve) => setTimeout(resolve, 200));
    // The half-line must be buffered, not parsed and discarded.
    const responses = await send(whole.slice(cut));
    expect(responses.some((entry) => entry.id === 12)).toBe(true);
  });

  it('writes nothing at all for a notification', async () => {
    // Cycle 7's fix, at the boundary where it matters: a stray line here is a
    // response to something the spec says must not be answered, and a strict
    // client treats it as a protocol violation.
    const responses = await send(
      line({ jsonrpc: '2.0', method: 'notifications/initialized', params: { _meta: meta() } })
    );
    expect(responses).toEqual([]);
  });
});

describe('the process survives bad input', () => {
  it('answers a parse error and keeps serving', async () => {
    const responses = await send('{ this is not json\n');
    expect((responses[0]?.error as { code?: number })?.code).toBe(-32700);

    // The important half: a malformed line from one client must not end the
    // session for everything that follows it.
    const [after] = await send(
      line({ jsonrpc: '2.0', id: 20, method: 'ping', params: { _meta: meta() } })
    );
    expect(after.id).toBe(20);
    expect(child?.killed).toBe(false);
  });

  it('ignores a blank line without answering it', async () => {
    const responses = await send('\n\n');
    expect(responses).toEqual([]);
  });
});
