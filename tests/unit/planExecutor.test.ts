import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import { executePlan } from '../../src/services/execution/planExecutor';
import { prependCheckpoint } from '../../src/services/execution/checkpointStore';
import type { BrandOpsData, Plan, PlanStep } from '../../src/types/domain';

function seedApprovedPlan(steps: PlanStep[]): BrandOpsData {
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
    status: 'approved',
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
    type: 'plan.approval_requested',
    state: 'NEEDS_APPROVAL',
    summary: 'Approval requested: Content plan',
    source: 'assistant',
    associatedPlanRef: { id: 'plan-1', kind: 'saved' },
    approvalStatus: 'pending'
  });
  return data;
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

describe('planExecutor', () => {
  it('marks a fully-internal plan as executed and emits execution checkpoints', () => {
    const data = seedApprovedPlan([step('Draft outline'), step('Collect internal feedback')]);
    const result = executePlan(data, 'plan-1');
    expect(result.executed).toBe(true);
    expect(result.blockedSteps).toHaveLength(0);
    expect(result.workspace.planWorkspace?.plans[0]?.status).toBe('executed');

    const entries = result.workspace.checkpoints?.entries ?? [];
    expect(entries[0]?.type).toBe('plan.execution_completed');
    expect(entries[0]?.state).toBe('COMPLETED');
    expect(entries.filter((c) => c.type === 'plan.step_executed')).toHaveLength(2);
    expect(
      entries.filter((c) => c.type === 'plan.step_executed').every((c) => c.state === 'COMPLETED')
    ).toBe(true);
    expect(entries.find((c) => c.type === 'plan.execution_started')?.state).toBe('EXECUTING');
    expect(result.workspace.operatorTraces?.entries[0]?.verb).toBe('plan.execution_completed');
    expect(result.workspace.operatorTraces?.entries[0]?.outcome).toBe('success');
  });

  it('blocks external steps, never performs them, and reports recovery', () => {
    const data = seedApprovedPlan([
      step('Draft outline'),
      step('Publish post to LinkedIn', { platform: 'linkedin' }),
      step('Send outreach email', { approvalRequired: true })
    ]);
    const result = executePlan(data, 'plan-1');
    expect(result.executed).toBe(false);
    expect(result.blockedSteps.map((b) => b.title)).toEqual([
      'Publish post to LinkedIn',
      'Send outreach email'
    ]);
    expect(result.workspace.planWorkspace?.plans[0]?.status).toBe('approved');

    const entries = result.workspace.checkpoints?.entries ?? [];
    const blocked = entries.find((c) => c.type === 'plan.execution_blocked');
    expect(blocked?.state).toBe('BLOCKED');
    expect(blocked?.errorState?.code).toBe('execution_blocked');
    expect(blocked?.errorState?.recoveryActions).toContain('inspect');
    const stepEvents = entries.filter((c) => c.type === 'plan.step_executed');
    expect(stepEvents).toHaveLength(3);
    expect(stepEvents.filter((c) => c.state === 'BLOCKED')).toHaveLength(2);
    expect(stepEvents.find((c) => c.state === 'BLOCKED')?.errorState?.code).toBe(
      'external_action_required'
    );
    expect(result.workspace.operatorTraces?.entries[0]?.verb).toBe('plan.execution_blocked');
    expect(result.workspace.operatorTraces?.entries[0]?.outcome).toBe('failure');
  });

  it('refuses to execute a plan that is not approved', () => {
    let data = seedApprovedPlan([]);
    data = {
      ...data,
      planWorkspace: {
        ...data.planWorkspace!,
        plans: [{ ...data.planWorkspace!.plans[0]!, status: 'pending-approval' as const }]
      }
    };
    const result = executePlan(data, 'plan-1');
    expect(result.executed).toBe(false);
    expect(result.blockedSteps).toHaveLength(0);
    expect(result.summary).toContain('not approved');
    expect(
      (result.workspace.checkpoints?.entries ?? []).filter((c) =>
        c.type.startsWith('plan.execution')
      )
    ).toHaveLength(0);
  });

  it('returns unchanged workspace for a missing plan', () => {
    const data = cloneSeedData();
    const result = executePlan(data, 'nope');
    expect(result.executed).toBe(false);
    expect(result.workspace).toBe(data);
  });
});
