/**
 * An idempotency key has to survive the crash it exists for.
 *
 * Eight existing tests cover replay protection, and they all pass: a repeated
 * key within a session returns the stored result, a burst produces one artifact,
 * a plan cannot execute twice. Every one of them runs inside a single process.
 *
 * The cache backing them is a process-local `Map`. So the guarantee held for
 * every case that had been tested and evaporated in the one case the mechanism
 * is actually for — **a client retrying after the server went away.** A retry
 * that follows a successful-but-unacknowledged call is the entire reason
 * idempotency keys exist; nobody sends one expecting the first attempt to have
 * been fine.
 *
 * Driving the real gateway showed it plainly: the same key, replayed after a
 * restart, ingested a second activity event. Two records where the client had
 * asked for one, and no error to notice.
 *
 * The record is now written into the workspace as well as the cache. The gateway
 * re-reads the workspace on every call, so a replay after a restart finds it.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientInfo': { name: 'restart-client', version: '1.0.0' },
  'io.modelcontextprotocol/clientCapabilities': {}
};

let dir = '';
let workspacePath = '';
let token = '';

const TITLE = 'Shipped the retry probe';

/** One request, through a gateway process that starts and dies around it. */
function callThroughFreshProcess(request: unknown): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/mcp-gateway.mjs'], {
      env: { ...process.env, BRANDOPS_MCP_WORKSPACE: workspacePath, BRANDOPS_MCP_TOKEN: token },
      stdio: ['pipe', 'pipe', 'ignore']
    });

    let out = '';
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString('utf8');
    });

    setTimeout(() => {
      child.stdin.write(`${JSON.stringify(request)}\n`);
      setTimeout(() => {
        child.kill();
        resolve(out);
      }, 2500);
    }, 1500);
  });
}

const ingest = (idempotencyKey: string, title = TITLE) => ({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    _meta: META,
    name: 'brandops_ingest_activity',
    idempotencyKey,
    arguments: {
      kind: 'feature-built',
      title,
      detail: 'Sent once, then retried with the same key after a restart.'
    }
  }
});

const eventsTitled = (title: string): number =>
  (
    (JSON.parse(readFileSync(workspacePath, 'utf8')).builderActivity?.events ?? []) as Array<{
      title: string;
    }>
  ).filter((event) => event.title === title).length;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'brandops-idem-restart-'));
  workspacePath = join(dir, 'workspace.json');

  const { createAgentSession } = await import('../../src/services/interop/sessions');
  const { withDefaults } = await import('../../src/services/storage/storage');
  const { populatedWorkspace } = await import('../helpers/populatedWorkspace');
  const created = await createAgentSession(withDefaults(populatedWorkspace()), {
    clientKind: 'claude-code',
    clientName: 'Restart Client',
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    grantedBundles: ['PUBLIC_IDENTITY'],
    grantedCapabilities: ['builder.activity.ingest']
  });
  token = created.token;
  writeFileSync(workspacePath, JSON.stringify(created.workspace, null, 2));
}, 60_000);

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('a retry after the server restarts', () => {
  it('does not repeat the work', async () => {
    const first = await callThroughFreshProcess(ingest('retry-after-crash-001'));
    expect(first, 'the first call must actually succeed').toContain('"ok":true');
    expect(eventsTitled(TITLE)).toBe(1);

    // The process is gone. This is the case an idempotency key is for.
    const second = await callThroughFreshProcess(ingest('retry-after-crash-001'));
    expect(second).toContain('"ok":true');

    // One record, because the client asked for one.
    expect(eventsTitled(TITLE), 'the retry created a second record').toBe(1);
  }, 60_000);

  it('still performs work under a different key', async () => {
    // The counter-case. Without it, a guard that refused everything would pass
    // the assertion above while breaking the product.
    await callThroughFreshProcess(ingest('a-different-key-002', 'A separate piece of work'));
    expect(eventsTitled('A separate piece of work')).toBe(1);
  }, 60_000);

  it('keeps the durable record in the workspace', async () => {
    const persisted = JSON.parse(readFileSync(workspacePath, 'utf8')) as {
      agentIdempotency?: { entries?: Array<{ hash: string; capabilityId: string }> };
    };
    const entries = persisted.agentIdempotency?.entries ?? [];

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => Boolean(entry.hash))).toBe(true);
    // Attributed, like every other durable record here: an entry that cannot say
    // which capability it belongs to cannot be reasoned about later.
    expect(entries.every((entry) => Boolean(entry.capabilityId))).toBe(true);
  });
});
