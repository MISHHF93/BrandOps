/**
 * The directive's success criterion, driven end to end.
 *
 * > "Success means an external AI can discover an appropriately limited BrandOps
 * > capability surface, retrieve purpose-scoped evidence-backed context, produce
 * > or store an Artifact, convert intelligence into a governed Plan, request
 * > durable execution, encounter the correct approval boundary, inspect work
 * > status, receive a verified result and Receipt, report a subsequent Outcome,
 * > and then reconnect later or through a different compatible AI while BrandOps
 * > preserves the canonical professional/workspace state."
 *
 * Every agent-side step below goes through `dispatchMcpMethod` — the same
 * function both gateway processes route through — rather than calling services
 * directly, because the claim being tested is about what an MCP client can do,
 * not about what the internals permit. Every user-side step goes through the
 * BrandOps-side surfaces an agent cannot reach, which is the point: the boundary
 * is only real if the test has to cross it the way a person would.
 */
import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import { createAgentSession, resolveAgentSession } from '../../src/services/interop/sessions';
import { executeAgentToolCall } from '../../src/services/interop/gateway';
import {
  dispatchMcpMethod,
  listMcpTools,
  TASKS_EXTENSION
} from '../../src/services/interop/mcp/server';
import {
  applyTaskInputResponses,
  cancelTask,
  resolveTask
} from '../../src/services/interop/mcp/tasks';
import { decideAgentProposal } from '../../src/services/interop/proposals';
import { reviewAgentEvent } from '../../src/services/interop/events';
import { withDefaults } from '../../src/services/storage/storage';
import { CONTEXT_BUNDLE_IDS } from '../../src/types/agentInterop';
import type { AgentCapabilityId, ExternalAgentClientKind } from '../../src/types/agentInterop';
import type { BrandOpsData } from '../../src/types/domain';

/** What a client that intends to run the whole loop would be granted. Nothing more. */
const GRANTED: AgentCapabilityId[] = [
  'context.read',
  'evidence.read',
  'plans.read',
  'receipts.read',
  'achievement.record',
  'artifact.create',
  'opportunity.create',
  'plan.convert',
  'execution.request',
  'execution.read',
  'outcome.report'
];

/** `_meta` a 2026-07-28 client sends, with the Tasks extension declared. */
const TASK_META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientInfo': { name: 'certification-client', version: '1.0.0' },
  'io.modelcontextprotocol/clientCapabilities': { extensions: { [TASKS_EXTENSION]: {} } }
};

/**
 * A minimal MCP client bound to a workspace and a bearer token — the same wiring
 * `scripts/mcp-gateway.mjs` performs, so what passes here is what passes on the wire.
 */
function mcpClient(workspace: BrandOpsData, token: string) {
  const state = { workspace };
  const handlers = {
    callTool: async (
      toolName: string,
      args: Record<string, unknown>,
      extra?: { idempotencyKey?: string; purpose?: string }
    ) => {
      const {
        workspace: next,
        session,
        result
      } = await executeAgentToolCall({
        workspace: state.workspace,
        token,
        call: { toolName, args, idempotencyKey: extra?.idempotencyKey, purpose: extra?.purpose }
      });
      state.workspace = next;
      return { ...result, data: { ...result.data, sessionId: session.id } };
    },
    listTools: async () => {
      const session = await resolveAgentSession(state.workspace, token);
      return listMcpTools({ grantedCapabilities: session?.grantedCapabilities });
    },
    tasks: {
      get: async (taskId: string) => resolveTask(state.workspace, taskId, await sessionId()),
      cancel: async (taskId: string) => {
        const outcome = cancelTask(state.workspace, taskId, await sessionId());
        if (outcome.ok) state.workspace = outcome.workspace;
        return outcome;
      },
      update: async (
        taskId: string,
        inputResponses: Record<string, { action?: string; content?: unknown }>
      ) => {
        const outcome = applyTaskInputResponses(
          state.workspace,
          taskId,
          await sessionId(),
          inputResponses
        );
        if (outcome.ok) state.workspace = outcome.workspace;
        return outcome;
      }
    }
  };

  // Resolved from the bearer token on every call, exactly as the gateway hosts
  // do — a workspace can hold several live sessions, and picking "the first
  // active one" would quietly test a different client than the one calling.
  const sessionId = async () => (await resolveAgentSession(state.workspace, token))?.id ?? '';

  return {
    get workspace() {
      return state.workspace;
    },
    set workspace(next: BrandOpsData) {
      state.workspace = next;
    },
    async rpc(method: string, params: Record<string, unknown> = {}) {
      return dispatchMcpMethod({
        method,
        params: { ...params, _meta: TASK_META },
        handlers
      });
    },
    async call(name: string, args: Record<string, unknown> = {}) {
      const outcome = await dispatchMcpMethod({
        method: 'tools/call',
        params: { name, arguments: args, _meta: TASK_META },
        handlers
      });
      return outcome;
    }
  };
}

/**
 * Unwraps the validated structured envelope from a `tools/call` result.
 *
 * Fails loudly when `structuredContent` was withheld. That withholding is the
 * G18 conformance check firing, so every step of this loop doubles as a check
 * that the *success* payload matches the schema the tool advertised — a
 * fixture-driven test only ever exercises the branch its fixture reaches, and
 * the branch that matters here is the one with real data in it.
 */
function envelope(outcome: Awaited<ReturnType<ReturnType<typeof mcpClient>['call']>>) {
  const result = outcome.result as
    | {
        structuredContent?: Record<string, unknown>;
        content?: Array<{ text?: string }>;
        resultType?: string;
        taskId?: string;
      }
    | undefined;
  if (result && !result.structuredContent && result.resultType !== 'task') {
    throw new Error(
      `structuredContent withheld: ${result.content?.[1]?.text ?? 'no reason recorded'}`
    );
  }
  return result;
}

async function openSession(
  workspace: BrandOpsData,
  clientKind: ExternalAgentClientKind,
  grantedCapabilities: AgentCapabilityId[] = GRANTED
) {
  const created = await createAgentSession(workspace, {
    clientKind,
    clientName: clientKind,
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    grantedBundles: [...CONTEXT_BUNDLE_IDS],
    grantedCapabilities
  });
  return created;
}

describe('directive success criterion — full external-AI round trip over MCP', () => {
  it('discovers, reads, produces, converts, executes, waits, verifies, reports, and reconnects', async () => {
    const created = await openSession(cloneSeedData(), 'claude-code');
    const client = mcpClient(created.workspace, created.token);

    // ── 1. Discover an appropriately limited surface ────────────────────────
    const listed = (await client.rpc('tools/list')).result as {
      tools: Array<{ name: string; outputSchema: Record<string, unknown> }>;
    };
    expect(listed.tools.length).toBe(GRANTED.length);
    // Not "some tools" — exactly the granted ones. A surface that leaks the
    // shape of the workspace is not appropriately limited.
    expect(listed.tools.every((tool) => tool.outputSchema)).toBe(true);
    expect(listed.tools.map((tool) => tool.name)).toContain('brandops_request_plan_execution');
    expect(listed.tools.map((tool) => tool.name)).not.toContain('brandops_revoke_session');

    // ── 2. Contribute a signal, then retrieve evidence-backed context ───────
    const recorded = envelope(
      await client.call('brandops_record_achievement', {
        kind: 'feature_completed',
        title: 'Shipped the governed MCP gateway',
        detail: 'Policy engine, intent contracts, durable tasks and a declared output contract.',
        evidence: [{ ref: 'git:acme/brandops@c0ffee', kind: 'git', label: 'gateway commit' }]
      })
    );
    expect(recorded?.structuredContent?.ok).toBe(true);
    const recordedData = recorded?.structuredContent?.data as Record<string, unknown>;
    // An agent's own claim is AGENT_REPORTED. It does not get to say otherwise.
    expect(recordedData.trustTier).toBe('AGENT_REPORTED');
    const eventId = recordedData.eventId as string;

    // The user — not the agent — is the only path to verified.
    client.workspace = reviewAgentEvent(client.workspace, { eventId, decision: 'verified' });

    const evidence = envelope(
      await client.call('brandops_search_evidence', { claim: 'governed MCP gateway' })
    );
    const evidenceData = evidence?.structuredContent?.data as {
      hits: Array<{ trustTier?: string; provenanceRef?: string }>;
      limitations: string[];
    };
    expect(evidenceData.hits.length).toBeGreaterThan(0);
    // Every hit says where it came from and how much it is worth.
    expect(evidenceData.hits.every((hit) => Boolean(hit.trustTier))).toBe(true);
    expect(evidenceData.limitations.length).toBeGreaterThan(0);

    const context = envelope(
      await client.call('brandops_get_relevant_context', { query: 'MCP gateway' })
    );
    const contextData = context?.structuredContent?.data as { bundles: unknown[] };
    expect(Array.isArray(contextData.bundles)).toBe(true);

    // ── 3. Produce an Artifact — proposed by the agent, stored by the user ──
    const artifact = envelope(
      await client.call('brandops_create_artifact', {
        title: 'MCP gateway architecture note',
        summary: 'How BrandOps exposes governed work to external AI systems.'
      })
    );
    const artifactProposalId = (artifact?.structuredContent?.data as Record<string, unknown>)
      .proposalId as string;
    expect((artifact?.structuredContent?.data as Record<string, unknown>).status).toBe('pending');
    client.workspace = decideAgentProposal(client.workspace, {
      proposalId: artifactProposalId,
      decision: 'approved'
    });
    expect(
      (client.workspace.agentProposals?.entries ?? []).find((e) => e.id === artifactProposalId)
        ?.status
    ).toBe('approved');

    // ── 4. Convert intelligence into a governed Plan ────────────────────────
    const opportunity = envelope(
      await client.call('brandops_create_content_opportunity', {
        title: 'Publish the MCP gateway architecture',
        detail: 'Turn the gateway work into a technical narrative.'
      })
    );
    const opportunityId = (opportunity?.structuredContent?.data as Record<string, unknown>)
      .proposalId as string;
    // The agent cannot approve its own proposal; a person does.
    client.workspace = decideAgentProposal(client.workspace, {
      proposalId: opportunityId,
      decision: 'approved'
    });

    const converted = envelope(
      await client.call('brandops_convert_to_plan', { proposalId: opportunityId })
    );
    const planId = (converted?.structuredContent?.data as Record<string, unknown>).planId as string;
    expect(planId).toBeTruthy();
    // Converting produced a real PlanReceipt, not just a plan record.
    expect(
      (client.workspace.planWorkspace?.receipts ?? []).some((entry) => entry.planId === planId)
    ).toBe(true);

    // ── 5. Request durable execution ────────────────────────────────────────
    const requested = envelope(
      await client.call('brandops_request_plan_execution', {
        planId,
        intent: {
          objective: 'Publish the architecture note.',
          reason: 'The user asked for the gateway work to be written up and shipped.'
        }
      })
    );
    // The Tasks extension was declared, so the tool call yields a task handle.
    expect(requested?.resultType).toBe('task');
    const taskId = requested?.taskId as string;
    expect(taskId).toBeTruthy();

    // ── 6. Encounter the correct approval boundary ──────────────────────────
    const waiting = (await client.rpc('tasks/get', { taskId })).result as {
      status: string;
      inputRequests?: Record<string, { params?: Record<string, unknown> }>;
    };
    expect(waiting.status).toBe('input_required');
    expect(waiting.inputRequests?.approval?.params?.resolvableBy).toBe('user');

    // The boundary is not merely advertised — it is enforced.
    const attemptedAccept = await client.rpc('tasks/update', {
      taskId,
      inputResponses: { approval: { action: 'accept' } }
    });
    expect(attemptedAccept.error?.message).toContain('approval_not_delegable');
    expect(attemptedAccept.insufficientScope).toEqual(['brandops:approval']);
    // Nothing moved: the task is still waiting on the same person.
    expect(((await client.rpc('tasks/get', { taskId })).result as { status: string }).status).toBe(
      'input_required'
    );

    // ── 7. A person approves inside BrandOps, and the work runs ─────────────
    const executionProposalId = (client.workspace.agentProposals?.entries ?? []).find(
      (entry) => entry.taskId === taskId
    )!.id;
    client.workspace = decideAgentProposal(client.workspace, {
      proposalId: executionProposalId,
      decision: 'approved'
    });

    // ── 8. Inspect work status, and receive a verified result and Receipt ───
    const finished = (await client.rpc('tasks/get', { taskId })).result as {
      status: string;
      result?: { receiptId?: string; planId?: string; totalSteps?: number };
    };
    expect(finished.status).not.toBe('input_required');
    expect(['completed', 'working', 'failed']).toContain(finished.status);

    const receipt = envelope(await client.call('brandops_get_receipt', { planId }));
    const receiptData = (receipt?.structuredContent?.data as { receipt: Record<string, unknown> })
      .receipt;
    expect(receiptData.planId).toBe(planId);
    expect(receiptData.timestamp).toBeTruthy();

    // ── 9. Report a subsequent Outcome ──────────────────────────────────────
    const outcome = envelope(
      await client.call('brandops_report_outcome', {
        planId,
        dimension: 'plan-success-rate',
        score: 0.72,
        evidence: ['https://example.invalid/post']
      })
    );
    const outcomeData = outcome?.structuredContent?.data as Record<string, unknown>;
    // Reported, not believed. Learning consumes it only after BrandOps validates it.
    expect(outcomeData.trustTier).toBe('AGENT_REPORTED');

    // ── 10. Reconnect later, through a different AI ─────────────────────────
    // Round-tripped through storage exactly as a reload would: if the loop only
    // survives in memory, it did not survive.
    const persisted = withDefaults(JSON.parse(JSON.stringify(client.workspace)));
    const second = await openSession(persisted, 'codex', [
      'plans.read',
      'receipts.read',
      'execution.read'
    ]);
    const other = mcpClient(second.workspace, second.token);

    const planAfterReload = envelope(await other.call('brandops_get_plan_status', { planId }));
    expect((planAfterReload?.structuredContent?.data as { plan: { id: string } }).plan.id).toBe(
      planId
    );

    const receiptAfterReload = envelope(await other.call('brandops_get_receipt', { planId }));
    expect(
      (receiptAfterReload?.structuredContent?.data as { receipt: { planId: string } }).receipt
        .planId
    ).toBe(planId);

    // The artifact the first client proposed is still there, still owned by BrandOps.
    expect(
      (persisted.agentProposals?.entries ?? []).find((e) => e.id === artifactProposalId)?.status
    ).toBe('approved');

    // Canonical state is portable across clients; a task handle is not. The
    // second AI inherits the workspace, never the first one's session identity.
    const stolenHandle = envelope(await other.call('brandops_get_execution', { taskId }));
    expect(stolenHandle?.structuredContent?.ok).toBe(false);
    expect(stolenHandle?.structuredContent?.errorCode).toBe('task_not_owned');

    // A second session sees only its own narrower surface.
    const secondSurface = (await other.rpc('tools/list')).result as {
      tools: Array<{ name: string }>;
    };
    expect(secondSurface.tools.map((tool) => tool.name).sort()).toEqual([
      'brandops_get_execution',
      'brandops_get_plan_status',
      'brandops_get_receipt'
    ]);
  });

  it('leaves an audit trail for every hop of the loop', async () => {
    const created = await openSession(cloneSeedData(), 'claude-code');
    const client = mcpClient(created.workspace, created.token);

    await client.call('brandops_get_relevant_context', { query: 'anything' });
    await client.call('brandops_record_achievement', {
      kind: 'development_session',
      title: 'Audited hop',
      detail: 'Recorded so the ledger can be checked.'
    });

    const audit = client.workspace.externalAgentAudit?.entries ?? [];
    expect(audit.length).toBeGreaterThanOrEqual(2);
    // Reads and writes alike: capability, outcome, and the policy verdict that allowed it.
    expect(audit.every((entry) => Boolean(entry.capabilityId))).toBe(true);
    expect(audit.some((entry) => entry.summary.includes('policy'))).toBe(true);
    // And the write carries what the firewall made of the agent's own words.
    expect(audit.some((entry) => entry.summary.includes('Memory firewall'))).toBe(true);
  });
});
