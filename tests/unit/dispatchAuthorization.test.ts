/**
 * Nothing reaches the outside world without a standing approval.
 *
 * Cycle 9 gave `decideAgentProposal` a way to *refuse*: a plan whose steps
 * changed after the user saw them becomes `superseded` instead of executing.
 * `approveAndDispatchExternalAction` was not updated. It decided the proposal,
 * read `decided.externalAction`, and dispatched — never looking at what the
 * decision returned.
 *
 * So a probe drove a connector to completion for a proposal whose approval had
 * just been withheld, and got back `outcome: 'executed'` with a verification id.
 * External execution with no valid approval, and a receipt asserting it worked.
 *
 * The shape is worth naming: the refusal existed and the layer above did not ask
 * about it. Presence of `externalAction` was a sound proxy for "approved" only
 * while deciding could not say no. The fix therefore sits in
 * `dispatchExternalAction`, which is exported and takes a proposal from
 * anywhere — a guard that protects one call path is the kind the next call path
 * walks past.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  dispatchExternalAction,
  type ExternalActionConnector
} from '../../src/services/execution/externalActionDispatch';
import {
  approveAndDispatchExternalAction,
  createAgentProposal
} from '../../src/services/interop/proposals';
import { planApprovalBinding } from '../../src/services/interop/approvalBinding';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace, POPULATED_IDS } from '../helpers/populatedWorkspace';
import type { BrandOpsData, Plan } from '../../src/types/domain';
import type { AgentProposal } from '../../src/types/agentInterop';

function recorder(): { connector: ExternalActionConnector; calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    connector: {
      id: 'recorder',
      label: 'Recording connector',
      actions: ['execute-plan', 'send-email'],
      execute: vi.fn(async (request) => {
        calls.push(request);
        return { ok: true, verification: 'provider-msg-1' };
      })
    }
  };
}

function planOf(workspace: BrandOpsData): Plan {
  const plan = (workspace.planWorkspace?.plans ?? []).find((p) => p.id === POPULATED_IDS.plan);
  if (!plan) throw new Error('fixture plan missing');
  return plan;
}

function pendingExecution(workspace: BrandOpsData): { workspace: BrandOpsData; id: string } {
  const next = createAgentProposal(workspace, {
    kind: 'external_action',
    title: 'Execute plan: Fixture plan',
    detail: 'Execute plan "Fixture plan" (2 steps).',
    rationale: 'Requested by an external agent.',
    sessionId: 'session-1',
    planId: POPULATED_IDS.plan,
    proposedState: {
      externalAction: { action: 'execute-plan', target: POPULATED_IDS.plan, summary: 'go' },
      approvalBinding: planApprovalBinding(planOf(workspace))
    }
  });
  return { workspace: next, id: (next.agentProposals?.entries ?? [])[0].id };
}

function tamper(workspace: BrandOpsData): BrandOpsData {
  return {
    ...workspace,
    planWorkspace: {
      ...workspace.planWorkspace!,
      plans: (workspace.planWorkspace?.plans ?? []).map((plan) =>
        plan.id === POPULATED_IDS.plan
          ? {
              ...plan,
              steps: [
                ...plan.steps,
                { ...plan.steps[0], id: 'injected', title: 'Email the full customer list' }
              ]
            }
          : plan
      )
    }
  };
}

describe('the dispatcher refuses anything without a standing approval', () => {
  it('does not call a connector for a superseded proposal', async () => {
    const base = withDefaults(populatedWorkspace());
    const { workspace: pending, id } = pendingExecution(base);
    const { connector, calls } = recorder();

    const out = await approveAndDispatchExternalAction(tamper(pending), id, [connector]);

    // The whole point: the outside world was not touched.
    expect(calls).toHaveLength(0);
    expect(connector.execute).not.toHaveBeenCalled();
    expect(out.outcome).toBe('not_approved');
    // The message carries the reason the approval did not stand, not a generic
    // refusal assembled after the fact.
    expect(out.message).toContain('changed after it was described to you');
  });

  it('does dispatch when the approval stands', async () => {
    const base = withDefaults(populatedWorkspace());
    const { workspace: pending, id } = pendingExecution(base);
    const { connector, calls } = recorder();

    const out = await approveAndDispatchExternalAction(pending, id, [connector]);

    // A guard that blocked legitimate approvals would be worse than none.
    expect(calls).toHaveLength(1);
    expect(out.outcome).toBe('executed');
  });

  for (const status of ['pending', 'rejected', 'superseded'] as const) {
    it(`refuses a ${status} proposal handed straight to the dispatcher`, async () => {
      const { connector, calls } = recorder();
      const proposal = {
        id: 'proposal-direct',
        kind: 'external_action',
        title: 'Send it',
        detail: 'd',
        rationale: 'r',
        status,
        tier: 'EXTERNAL_ACTION',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        externalAction: { action: 'send-email', target: 'someone@example.com', summary: 's' }
      } as AgentProposal;

      const out = await dispatchExternalAction(withDefaults(populatedWorkspace()), proposal, [
        connector
      ]);

      // `dispatchExternalAction` is exported and takes a proposal from anywhere.
      // Checking only inside the one wrapper would leave this path open.
      expect(calls, status).toHaveLength(0);
      expect(out.outcome, status).toBe('not_approved');
      expect(out.workspace.checkpoints?.entries?.[0]?.state, status).toBe('BLOCKED');
    });
  }

  it('records a blocked checkpoint rather than staying silent', async () => {
    const { connector } = recorder();
    const proposal = {
      id: 'proposal-quiet',
      kind: 'external_action',
      title: 'Send it',
      detail: 'd',
      rationale: 'r',
      status: 'superseded',
      tier: 'EXTERNAL_ACTION',
      decisionNote: 'The recipient list changed after you approved it.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      externalAction: { action: 'send-email', target: 'list-1', summary: 's' }
    } as AgentProposal;

    const out = await dispatchExternalAction(withDefaults(populatedWorkspace()), proposal, [
      connector
    ]);
    // Refusing quietly leaves the user with an action that simply never happened
    // and nothing saying why.
    expect(out.workspace.checkpoints?.entries?.[0]?.summary).toContain(
      'The recipient list changed'
    );
  });
});
