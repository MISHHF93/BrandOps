import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import { verifyPlanOutcomes } from '../../src/services/execution/planVerifier';
import { prependCheckpoint } from '../../src/services/execution/checkpointStore';
import { createDigitalTwinFromText } from '../../src/services/digitalTwin/digitalTwin';
import type { BrandOpsData, Plan, PlanStep } from '../../src/types/domain';

function withActiveTwin(data: BrandOpsData): BrandOpsData {
  const { twin } = createDigitalTwinFromText({
    workspace: data,
    rawText: 'Founder of Acme. I build auth systems and write technical posts.',
    sourceType: 'profile'
  });
  return { ...data, digitalTwins: { activeTwinId: twin.id, twins: [twin] } };
}

function step(title: string, extra: Partial<PlanStep> = {}): PlanStep {
  return {
    id: extra.id ?? `step-${title.toLowerCase().replace(/\s+/g, '-')}`,
    title,
    description: `${title} description`,
    owner: 'ops',
    requiredInput: '',
    approvalRequired: false,
    ...extra
  };
}

function seedPlan(status: Plan['status'], steps: PlanStep[]): BrandOpsData {
  const plan: Plan = {
    id: 'plan-1',
    title: 'Content plan',
    summary: 's',
    objective: 'o',
    planType: 'content-plan',
    confidenceScore: 70,
    sourceResponseId: 'msg-1',
    assumptions: [],
    missingInputs: [],
    requiredApprovals: [],
    steps,
    timeline: [],
    outputsAssets: [],
    risks: [],
    nextActions: [],
    status,
    source: {
      sourceSurface: 'ask-my-twin',
      originalUserMessage: 'x',
      aiResponse: 'y',
      activeTwinId: null,
      professionContext: '',
      verifiedFactsUsed: [],
      unverifiedMissingFacts: [],
      timestamp: new Date().toISOString(),
      conversationId: 'c1',
      messageId: 'msg-1'
    },
    estimatedEffort: '1 session',
    expectedOutput: 'content outline',
    savedAt: new Date().toISOString(),
    receiptId: 'receipt-1'
  };
  let data = cloneSeedData();
  data = {
    ...data,
    planWorkspace: { plans: [plan], receipts: [], updatedAt: new Date().toISOString() }
  };
  data = prependCheckpoint(data, {
    conversationId: 'c1',
    type: 'plan.execution_completed',
    state: 'COMPLETED',
    summary: 'Execution recorded for "Content plan".',
    source: 'automation',
    associatedPlanRef: { id: 'plan-1', kind: 'saved' }
  });
  return data;
}

describe('planVerifier', () => {
  it('records operator-confirmed outcomes and advances an executed plan to verified', () => {
    const data = seedPlan('executed', [step('Draft outline'), step('Collect internal feedback')]);
    const result = verifyPlanOutcomes(data, 'plan-1', {
      outcomes: [
        { stepId: 'step-draft-outline', achieved: true },
        { stepId: 'step-collect-internal-feedback', achieved: true }
      ]
    });

    expect(result.verified).toBe(true);
    expect(result.allAchieved).toBe(true);
    expect(result.confirmedCount).toBe(2);
    expect(result.notAchievedCount).toBe(0);
    expect(result.unconfirmedStepIds).toHaveLength(0);
    expect(result.workspace.planWorkspace?.plans[0]?.status).toBe('verified');
    expect(result.workspace.planWorkspace?.plans[0]?.steps.every((s) => s.status === 'done')).toBe(
      true
    );

    const entries = result.workspace.checkpoints?.entries ?? [];
    expect(entries[0]?.type).toBe('plan.verified');
    expect(entries[0]?.state).toBe('COMPLETED');
    expect(entries.find((c) => c.state === 'VERIFYING')?.type).toBe('plan.verified');
    expect(result.workspace.operatorTraces?.entries[0]?.verb).toBe('plan.verified');
    expect(result.workspace.operatorTraces?.entries[0]?.outcome).toBe('success');
  });

  it('records partial and unconfirmed outcomes honestly without claiming success', () => {
    const data = seedPlan('executed', [
      step('Draft outline'),
      step('Collect internal feedback'),
      step('Circulate for review')
    ]);
    const result = verifyPlanOutcomes(data, 'plan-1', {
      outcomes: [
        { stepId: 'step-draft-outline', achieved: true },
        { stepId: 'step-collect-internal-feedback', achieved: false, note: 'No responses yet.' }
      ]
    });

    expect(result.verified).toBe(true);
    expect(result.allAchieved).toBe(false);
    expect(result.confirmedCount).toBe(2);
    expect(result.notAchievedCount).toBe(1);
    expect(result.unconfirmedStepIds).toEqual(['step-circulate-for-review']);

    const steps = result.workspace.planWorkspace?.plans[0]?.steps ?? [];
    expect(steps.find((s) => s.id === 'step-draft-outline')?.status).toBe('done');
    expect(steps.find((s) => s.id === 'step-collect-internal-feedback')?.status).toBe('failed');
    /** Unconfirmed steps must not be silently marked done or failed. */
    expect(steps.find((s) => s.id === 'step-circulate-for-review')?.status).not.toBe('done');
    expect(steps.find((s) => s.id === 'step-circulate-for-review')?.status).not.toBe('failed');
    expect(result.workspace.operatorTraces?.entries[0]?.outcome).toBe('failure');
  });

  it('refuses to verify a plan that has not been executed', () => {
    const data = seedPlan('approved', [step('Draft outline')]);
    const result = verifyPlanOutcomes(data, 'plan-1', {
      outcomes: [{ stepId: 'step-draft-outline', achieved: true }]
    });

    expect(result.verified).toBe(false);
    expect(result.summary).toContain('cannot be verified');
    expect(result.workspace).toBe(data);
    expect(
      (result.workspace.checkpoints?.entries ?? []).filter((c) => c.type === 'plan.verified')
    ).toHaveLength(0);
  });

  it('returns unchanged workspace for a missing plan', () => {
    const data = cloneSeedData();
    const result = verifyPlanOutcomes(data, 'nope', { outcomes: [] });
    expect(result.verified).toBe(false);
    expect(result.workspace).toBe(data);
  });

  /**
   * Closes the other half of Learn: agent-reported achievements already
   * promote to Twin memory once a human verifies them; work the operator
   * plans, executes, and confirms themselves inside BrandOps did not, even
   * though the operator's own "Achieved" click is at least as strong a trust
   * signal. Consumers (`opportunityEngine.ts`, `positioningIntelligence.ts`,
   * `predictiveContentIdeationEngine.ts`) read `memory.approvedClaims` and
   * `resumeProfile.achievements` directly, so writing there is what actually
   * closes the loop, not just adding a checkpoint.
   */
  it('promotes a fully-achieved plan onto the active Twin so future suggestions can ground on it', () => {
    const data = withActiveTwin(
      seedPlan('executed', [step('Draft outline'), step('Collect internal feedback')])
    );
    const twinBefore = data.digitalTwins!.twins[0]!;

    const result = verifyPlanOutcomes(data, 'plan-1', {
      outcomes: [
        { stepId: 'step-draft-outline', achieved: true },
        { stepId: 'step-collect-internal-feedback', achieved: true }
      ]
    });

    expect(result.allAchieved).toBe(true);
    const twinAfter = result.workspace.digitalTwins!.twins[0]!;
    expect(twinAfter.memory.approvedClaims.some((c) => c.includes('Content plan'))).toBe(true);
    expect(twinAfter.resumeProfile.achievements.some((a) => a.includes('Content plan'))).toBe(true);
    // Only the Twin's own data changed shape — nothing else about it was disturbed.
    expect(twinAfter.id).toBe(twinBefore.id);
  });

  it('does not touch Twin memory when the plan is only partially achieved', () => {
    const data = withActiveTwin(
      seedPlan('executed', [step('Draft outline'), step('Collect internal feedback')])
    );
    const twinBefore = data.digitalTwins!.twins[0]!;

    const result = verifyPlanOutcomes(data, 'plan-1', {
      outcomes: [
        { stepId: 'step-draft-outline', achieved: true },
        { stepId: 'step-collect-internal-feedback', achieved: false }
      ]
    });

    expect(result.allAchieved).toBe(false);
    const twinAfter = result.workspace.digitalTwins!.twins[0]!;
    expect(twinAfter.memory.approvedClaims).toEqual(twinBefore.memory.approvedClaims);
    expect(twinAfter.resumeProfile.achievements).toEqual(twinBefore.resumeProfile.achievements);
  });
});
