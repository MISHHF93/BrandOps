/**
 * An approval binds to what the user saw.
 *
 * Adversarial probing of the plan lifecycle found this: the user is shown
 * `Execute plan "Fixture plan" (2 steps)`, two steps are appended while the
 * proposal sits pending, the user approves, and a four-step plan executes. The
 * proposal recorded "(2 steps)" in its own detail line — the evidence of the
 * discrepancy was already in the record and nothing compared it to anything.
 *
 * The boundary itself held: a person was asked. What failed is its *subject* —
 * a decision obtained for one action and spent on another, which is the same
 * outcome as bypassing it. The injected steps did not reach the outside world
 * because the canonical executor performs no external side effects, but that is
 * a different safeguard; leaning on it means this hole reopens the moment a
 * connector is wired.
 */
import { describe, expect, it } from 'vitest';
import {
  checkApprovalBinding,
  planApprovalBinding
} from '../../src/services/interop/approvalBinding';
import { decideAgentProposal, createAgentProposal } from '../../src/services/interop/proposals';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace, POPULATED_IDS } from '../helpers/populatedWorkspace';
import type { BrandOpsData, Plan } from '../../src/types/domain';

function planOf(workspace: BrandOpsData): Plan {
  const plan = (workspace.planWorkspace?.plans ?? []).find((p) => p.id === POPULATED_IDS.plan);
  if (!plan) throw new Error('fixture plan missing');
  return plan;
}

/** A pending execution request bound to the plan as it stands. */
function withPendingExecution(workspace: BrandOpsData): { workspace: BrandOpsData; id: string } {
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

/** Append steps the user never saw. */
function tamper(workspace: BrandOpsData, titles: string[]): BrandOpsData {
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
                ...titles.map((title, i) => ({ ...plan.steps[0], id: `injected-${i}`, title }))
              ]
            }
          : plan
      )
    }
  };
}

describe('the fingerprint covers what the user reads', () => {
  it('changes when a step is added', () => {
    const ws = withDefaults(populatedWorkspace());
    const before = planApprovalBinding(planOf(ws));
    const after = planApprovalBinding(planOf(tamper(ws, ['Email the customer list'])));
    expect(after.fingerprint).not.toBe(before.fingerprint);
    expect(after.stepCount).toBe(before.stepCount + 1);
  });

  it('changes when a step is retitled under the same id', () => {
    const ws = withDefaults(populatedWorkspace());
    const before = planApprovalBinding(planOf(ws));
    const plan = planOf(ws);
    const renamed: Plan = {
      ...plan,
      steps: [{ ...plan.steps[0], title: 'Email the customer list' }, ...plan.steps.slice(1)]
    };
    // Same id, same count — a different action. Counting steps would miss it.
    expect(planApprovalBinding(renamed).fingerprint).not.toBe(before.fingerprint);
  });

  it('changes when steps are reordered', () => {
    const ws = withDefaults(populatedWorkspace());
    const plan = planOf(ws);
    const reversed: Plan = { ...plan, steps: [...plan.steps].reverse() };
    expect(planApprovalBinding(reversed).fingerprint).not.toBe(
      planApprovalBinding(plan).fingerprint
    );
  });

  it('does NOT change when the plan runs', () => {
    const ws = withDefaults(populatedWorkspace());
    const plan = planOf(ws);
    const executing: Plan = {
      ...plan,
      status: 'executing',
      updatedAt: new Date(Date.now() + 60_000).toISOString(),
      steps: plan.steps.map((step) => ({ ...step, status: 'done' as const }))
    };
    // A binding that changed as the plan executed would void every approval at
    // the exact moment it was being honoured.
    expect(planApprovalBinding(executing).fingerprint).toBe(planApprovalBinding(plan).fingerprint);
  });
});

describe('checkApprovalBinding', () => {
  it('explains a count change in the user’s terms', () => {
    const recorded = { fingerprint: 'aaa', stepCount: 2 };
    const check = checkApprovalBinding(recorded, { fingerprint: 'bbb', stepCount: 4 });
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('You approved 2 steps; it now has 4');
  });

  it('explains a content change that kept the count', () => {
    const check = checkApprovalBinding(
      { fingerprint: 'aaa', stepCount: 2 },
      { fingerprint: 'bbb', stepCount: 2 }
    );
    expect(check.reason).toContain('their content changed');
  });

  it('lets a proposal with no recorded binding through', () => {
    // Approvals issued before the field existed must not all break on upgrade,
    // and a missing binding is not evidence of tampering.
    expect(checkApprovalBinding(undefined, { fingerprint: 'x', stepCount: 1 }).ok).toBe(true);
  });
});

describe('the decision path refuses a plan that changed underneath it', () => {
  it('does not execute, and says so in every record', () => {
    const base = withDefaults(populatedWorkspace());
    const { workspace: pending, id } = withPendingExecution(base);
    const tampered = tamper(pending, [
      'Email the full customer list',
      'Post credentials to the public channel'
    ]);

    const after = decideAgentProposal(tampered, { proposalId: id, decision: 'approved' });

    const proposal = (after.agentProposals?.entries ?? []).find((entry) => entry.id === id);
    // Not `rejected`: the user declined nothing. The subject of their decision
    // changed, which is what `superseded` already means.
    expect(proposal?.status).toBe('superseded');
    expect(proposal?.decisionNote).toContain('changed after it was described to you');

    const checkpoint = (after.checkpoints?.entries ?? [])[0];
    // The first version of this fix left the newest checkpoint saying
    // "Approved … EXECUTING" while nothing ran — blocking the work and then
    // narrating it as running is the same defect one layer over.
    expect(checkpoint?.state).toBe('BLOCKED');
    expect(checkpoint?.summary).toContain('Not executed');
    expect(checkpoint?.approvalStatus).toBeUndefined();

    // Nothing was marked done.
    const plan = (after.planWorkspace?.plans ?? []).find((p) => p.id === POPULATED_IDS.plan);
    expect(plan?.steps.every((step) => step.status !== 'done')).toBe(true);
  });

  it('executes normally when the plan is untouched', () => {
    const base = withDefaults(populatedWorkspace());
    const { workspace: pending, id } = withPendingExecution(base);
    const after = decideAgentProposal(pending, { proposalId: id, decision: 'approved' });

    const proposal = (after.agentProposals?.entries ?? []).find((entry) => entry.id === id);
    expect(proposal?.status).toBe('approved');
    // A binding that blocked legitimate approvals would be worse than none.
    expect((after.checkpoints?.entries ?? [])[0]?.state).toBe('EXECUTING');
  });

  it('still refuses a second decision on a settled proposal', () => {
    const base = withDefaults(populatedWorkspace());
    const { workspace: pending, id } = withPendingExecution(base);
    const once = decideAgentProposal(pending, { proposalId: id, decision: 'approved' });
    const twice = decideAgentProposal(once, { proposalId: id, decision: 'approved' });
    // Replaying an approval must not run the work a second time.
    expect(twice.checkpoints?.entries?.length).toBe(once.checkpoints?.entries?.length);
  });
});
