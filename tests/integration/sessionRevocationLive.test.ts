/**
 * Revoking a session has to stop a gateway that is already running.
 *
 * This is the user's kill switch. Someone connects an agent, watches it do
 * something they did not expect, and revokes it. If the running process keeps
 * serving the old token, the button did nothing — and the workspace they were
 * trying to protect is still open.
 *
 * **It works.** The gateway re-reads the workspace on every call, so revocation
 * takes effect on the next request with no restart. Verified against a live
 * process rather than an imported function, because that is the only place the
 * claim means anything.
 *
 * **What was wrong was how it said so.** A revoked session threw, and stdio
 * turned every throw into `-32603` — an *internal error*, which tells a client
 * the server is broken and the sane response is to retry. Forever, on a session
 * that will never work again, which is the opposite of what the person pressing
 * revoke wanted. The HTTP binding already answered `401`. Stdio now answers
 * `-32023`, in the same server-defined range as the other codes here.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientInfo': { name: 'revocation-client', version: '1.0.0' },
  'io.modelcontextprotocol/clientCapabilities': {}
};

const children: ChildProcessWithoutNullStreams[] = [];
const dirs: string[] = [];

afterEach(() => {
  for (const child of children.splice(0)) child.kill();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

async function connectedGateway() {
  const dir = mkdtempSync(join(tmpdir(), 'brandops-revoke-'));
  dirs.push(dir);
  const workspacePath = join(dir, 'workspace.json');

  const { createAgentSession } = await import('../../src/services/interop/sessions');
  const { withDefaults } = await import('../../src/services/storage/storage');
  const { populatedWorkspace } = await import('../helpers/populatedWorkspace');
  const created = await createAgentSession(withDefaults(populatedWorkspace()), {
    clientKind: 'claude-code',
    clientName: 'Revocation Client',
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    grantedBundles: ['PUBLIC_IDENTITY'],
    grantedCapabilities: ['plans.read']
  });
  writeFileSync(workspacePath, JSON.stringify(created.workspace, null, 2));
  const sessionId = (created.workspace.externalAgentSessions?.entries ?? [])[0].id;

  const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/mcp-gateway.mjs'], {
    env: {
      ...process.env,
      BRANDOPS_MCP_WORKSPACE: workspacePath,
      BRANDOPS_MCP_TOKEN: created.token
    },
    stdio: ['pipe', 'pipe', 'ignore']
  }) as ChildProcessWithoutNullStreams;
  children.push(child);

  let stdout = '';
  child.stdout.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf8');
  });

  let id = 0;
  const call = async (): Promise<Record<string, unknown>> => {
    const requestId = ++id;
    const before = stdout.length;
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'tools/call',
        params: { _meta: META, name: 'brandops_get_plan_status', arguments: {} }
      })}\n`
    );

    const deadline = Date.now() + 20_000;
    for (;;) {
      const hit = stdout
        .slice(before)
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.id === requestId);
      if (hit) return hit;
      if (Date.now() > deadline) throw new Error('no response');
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  };

  const revoke = async () => {
    const { revokeAgentSession } = await import('../../src/services/interop/sessions');
    const current = JSON.parse(readFileSync(workspacePath, 'utf8'));
    writeFileSync(workspacePath, JSON.stringify(revokeAgentSession(current, sessionId), null, 2));
  };

  await new Promise((resolve) => setTimeout(resolve, 1500));
  return { call, revoke, workspacePath };
}

describe('revoking a live agent session', () => {
  it('serves the session until it is revoked', async () => {
    const gateway = await connectedGateway();
    const before = await gateway.call();

    // The counter-case: if calls failed anyway, the assertion below would prove
    // nothing about revocation.
    expect(before.error, JSON.stringify(before).slice(0, 160)).toBeUndefined();
  }, 60_000);

  it('stops serving it on the very next call, with no restart', async () => {
    const gateway = await connectedGateway();
    expect((await gateway.call()).error).toBeUndefined();

    await gateway.revoke();

    const after = await gateway.call();
    // The process is the same one. The workspace is re-read per call, which is
    // what makes the button immediate rather than advisory.
    expect(after.error).toBeDefined();
    expect(after.result).toBeUndefined();
  }, 60_000);

  it('says it was an authorization failure, not a server fault', async () => {
    const gateway = await connectedGateway();
    await gateway.call();
    await gateway.revoke();

    const error = (await gateway.call()).error as { code?: number; message?: string };
    // `-32603` would tell a client the server is broken, and the reasonable
    // response to that is to retry — indefinitely, on a session someone revoked
    // precisely to make it stop.
    expect(error?.code).toBe(-32023);
    expect(error?.code).not.toBe(-32603);
    expect(error?.message).toContain('revoked');
  }, 60_000);

  it('keeps refusing, rather than recovering on its own', async () => {
    const gateway = await connectedGateway();
    await gateway.call();
    await gateway.revoke();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      // A revocation that lapsed after a retry or two would be worse than none:
      // the user would believe it held.
      expect((await gateway.call()).error, `attempt ${attempt}`).toBeDefined();
    }
  }, 60_000);
});
