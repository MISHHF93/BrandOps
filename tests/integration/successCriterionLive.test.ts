/**
 * The directive's success criterion, run through the actual gateway process.
 *
 * `mcpSuccessCriterion.test.ts` walks the whole loop — discover, read, produce,
 * convert, request execution, poll, verify, report, revoke — against an
 * in-memory client, and says so honestly: it performs "the same wiring
 * `scripts/mcp-gateway.mjs` performs, so what passes here is what passes on the
 * wire."
 *
 * Cycle 34 showed that assumption is worth checking method by method. This
 * checks it for the sequence, because a loop is not the sum of its calls: it
 * carries state between them — a plan id, a task handle, a proposal — across
 * process boundaries and JSON round trips. The in-memory client passes objects;
 * a real client passes bytes, and everything that survives one does not
 * necessarily survive the other.
 *
 * What this adds over the in-memory version: the workspace is a file the process
 * re-reads, so each step sees what the previous step actually persisted rather
 * than a shared object it happens to hold.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TASKS_EXTENSION = 'io.modelcontextprotocol/tasks';
let child: ChildProcessWithoutNullStreams | undefined;
let dir = '';
let workspacePath = '';
let stdout = '';
let nextId = 1;

const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientInfo': { name: 'live-certification', version: '1.0.0' },
  'io.modelcontextprotocol/clientCapabilities': { extensions: { [TASKS_EXTENSION]: {} } }
};

interface Envelope {
  ok?: boolean;
  capabilityId?: string;
  data?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
}

/** One JSON-RPC round trip over the pipe. */
async function rpc(method: string, params: Record<string, unknown> = {}) {
  const id = nextId++;
  const before = stdout.length;
  child!.stdin.write(
    `${JSON.stringify({ jsonrpc: '2.0', id, method, params: { _meta: META, ...params } })}\n`
  );

  const deadline = Date.now() + 20_000;
  for (;;) {
    const lines = stdout
      .slice(before)
      .split('\n')
      .filter((line) => line.trim());
    const hit = lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((entry) => entry.id === id);
    if (hit) return hit;
    if (Date.now() > deadline) throw new Error(`no response to ${method}`);
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
}

/** A tool call, unwrapped to the BrandOps envelope the schema declares. */
async function call(name: string, args: Record<string, unknown> = {}): Promise<Envelope> {
  const response = await rpc('tools/call', { name, arguments: args });
  const result = response.result as { structuredContent?: Envelope } | undefined;
  if (!result?.structuredContent) {
    throw new Error(`${name}: no structuredContent — ${JSON.stringify(response).slice(0, 200)}`);
  }
  return result.structuredContent;
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'brandops-loop-'));
  workspacePath = join(dir, 'workspace.json');

  const { createAgentSession } = await import('../../src/services/interop/sessions');
  const { withDefaults } = await import('../../src/services/storage/storage');
  /**
   * A populated workspace, not the seed. The seed carries no plans, so the
   * execution half of the loop had nothing to request — the run was green on
   * everything it could reach and silent about the part that matters most.
   */
  const { populatedWorkspace } = await import('../helpers/populatedWorkspace');
  const created = await createAgentSession(withDefaults(populatedWorkspace()), {
    clientKind: 'claude-code',
    clientName: 'Live Certification',
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    /**
     * A bundle as well as a capability.
     *
     * The first version granted `context.read` and no bundles, and every context
     * call came back `bundles_not_granted`. That is the Context Policy doing its
     * job — holding the capability is not holding the scope — and it is the
     * directive's rule that possession of a connection is not authorisation. The
     * session was under-provisioned; the product was right.
     */
    grantedBundles: ['PUBLIC_IDENTITY'],
    grantedCapabilities: [
      'context.read',
      'plans.read',
      'plan.convert',
      'evidence.search',
      'execution.request',
      'execution.read',
      'builder.receipts.list'
    ]
  });
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

  await new Promise((resolve) => setTimeout(resolve, 1500));
}, 60_000);

afterAll(() => {
  child?.kill();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('the loop, over a real pipe', () => {
  it('discovers a tool surface', async () => {
    const response = await rpc('tools/list');
    const tools = (response.result as { tools?: Array<{ name: string }> })?.tools ?? [];
    expect(tools.length).toBeGreaterThan(0);
    // The tools the loop below depends on must actually be advertised.
    const names = tools.map((tool) => tool.name);
    for (const required of [
      'brandops_get_relevant_context',
      'brandops_request_plan_execution',
      'brandops_get_execution'
    ]) {
      expect(names, required).toContain(required);
    }
  });

  it('reads scoped context', async () => {
    const envelope = await call('brandops_get_relevant_context', { query: 'positioning' });
    expect(envelope.ok).toBe(true);
    expect(envelope.capabilityId).toBe('context.read');
  });

  it('requests execution and gets a task handle, not a running job', async () => {
    const plans = await call('brandops_get_plan_status');
    expect(plans.ok).toBe(true);

    const planId = (plans.data as { plan?: { id?: string } })?.plan?.id;
    // No conditional skip: a workspace without a plan would make the rest of
    // this test pass by never running, which is how the first version of it was
    // green while proving nothing about execution.
    expect(planId, 'the fixture workspace must carry a plan').toBeTruthy();

    const response = await rpc('tools/call', {
      name: 'brandops_request_plan_execution',
      arguments: {
        planId,
        intent: {
          objective: 'Run the plan the user approved.',
          reason: 'Certification loop.',
          target: planId,
          allowedActions: ['execute-plan']
        }
      }
    });

    /**
     * A `CreateTaskResult`, not a tool envelope — and that is the design.
     * `execution.request` is marked `createsTask` in the registry, so the
     * protocol answers with a task handle rather than a completion. The first
     * version of this test assumed every call returns `structuredContent` and
     * read the Tasks extension working correctly as a failure.
     */
    const task = response.result as {
      resultType?: string;
      taskId?: string;
      status?: string;
    };

    expect(task?.resultType).toBe('task');
    expect(task?.taskId).toBeTruthy();
    // The whole point of the design: what comes back first is the approval
    // boundary, not a running job. Confirmed here over the wire.
    expect(task?.status).toBe('input_required');
  });

  it('carries state across calls through the file, not through memory', async () => {
    // The proposal the previous step created must be visible to a later call
    // that re-reads the workspace from disk. In-memory clients share an object
    // and cannot show this.
    const persisted = JSON.parse(readFileSync(workspacePath, 'utf8')) as {
      agentProposals?: { entries?: Array<{ taskId?: string; status?: string }> };
    };
    const entries = persisted.agentProposals?.entries ?? [];
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].status).toBe('pending');
  });

  it('refuses a capability the session was never granted', async () => {
    const response = await rpc('tools/call', {
      name: 'brandops_record_achievement',
      arguments: { title: 'Something', detail: 'Not granted to this session.' }
    });

    /**
     * A protocol-level error, not a tool envelope — and deliberately so. Cycle 7
     * mapped `capability_not_granted` to `-32602` with the scope named, because
     * an ungranted capability is an authorization failure rather than a tool
     * that ran and declined. A client should see the same shape it would get for
     * a malformed request, not a successful call reporting sadness.
     */
    const error = response.error as { code?: number; message?: string } | undefined;
    expect(error?.code).toBe(-32602);
    expect(error?.message).toContain('not granted');
    expect(response.result).toBeUndefined();
  });

  it('refuses a bundle the session was never granted', async () => {
    const envelope = await call('brandops_get_relevant_context', {
      query: 'anything',
      bundles: ['BUILDER_CONTEXT']
    });
    // Scope is checked separately from capability: holding `context.read` does
    // not entitle a session to every bundle behind it.
    expect(envelope.ok).toBe(false);
    expect(envelope.errorCode).toBe('bundles_not_granted');
  });

  it('writes an audit entry for every call, including the refusal', async () => {
    const persisted = JSON.parse(readFileSync(workspacePath, 'utf8')) as {
      externalAgentAudit?: { entries?: Array<{ capabilityId?: string; ok?: boolean }> };
    };
    const entries = persisted.externalAgentAudit?.entries ?? [];

    expect(entries.length).toBeGreaterThan(2);
    // Every entry names the capability it was for; an unattributed line in an
    // audit trail is not evidence of anything.
    expect(entries.every((entry) => Boolean(entry.capabilityId))).toBe(true);
    // The bundle refusal reached the gateway and is recorded; the capability
    // refusal was rejected before it, at the protocol layer, and is recorded in
    // the transport's own error rather than as a tool call that happened.
    expect(entries.some((entry) => entry.ok === false)).toBe(true);
  });

  it('still answers after the whole sequence', async () => {
    const response = await rpc('ping');
    // A process that degraded over a session would show here rather than in
    // someone's editor an hour in.
    expect(response.error).toBeUndefined();
    expect(child?.killed).toBe(false);
  });
});
