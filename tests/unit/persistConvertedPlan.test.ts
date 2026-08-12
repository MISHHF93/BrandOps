import { describe, expect, it } from 'vitest';
import {
  persistConvertedPlan,
  planPresetForOperationalKind
} from '../../src/services/plan/persistConvertedPlan';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { cloneSeedData } from '../helpers/fixtures';

describe('persistConvertedPlan — single Convert-to-Plan contract', () => {
  it('persists a plan, receipt, and the canonical checkpoint chain', () => {
    const workspace = cloneSeedData();
    const result = persistConvertedPlan({
      workspace,
      conversationId: 'conversation-predictive',
      messageId: 'predictive-opportunity-opp-1',
      responseText:
        'Opportunity: Expand LinkedIn reach. Suggestion: Reuse the weekly posting rhythm.',
      userIntent: 'Convert predictive opportunity "Expand LinkedIn reach" to PLAN',
      activeTwinId: null,
      planPreset: 'content-plan',
      sourceSurface: 'predictive-opportunity',
      convertedFromLabel: 'Predictive opportunity'
    });

    expect(result.workspace.planWorkspace?.plans[0]?.id).toBe(result.plan.id);
    expect(result.receipt.planId).toBe(result.plan.id);
    expect(result.receipt.convertedFrom).toBe('Predictive opportunity');

    const checkpoints = result.workspace.checkpoints?.entries ?? [];
    expect(checkpoints.map((entry) => entry.type)).toEqual([
      'plan.saved',
      'plan.draft_created',
      'ask.convert_to_plan_requested'
    ]);
    expect(checkpoints[1]?.parentCheckpointId).toBe(checkpoints[2]?.id);
    expect(checkpoints[2]?.conversationId).toBe('conversation-predictive');
    expect(checkpoints[1]?.associatedPlanRef?.id).toBe(result.plan.id);

    const snapshot = buildWorkspaceSnapshot(result.workspace);
    expect(snapshot.convertedAskPlans.some((plan) => plan.id === result.plan.id)).toBe(true);
  });

  it('carries the honest source surface and linked receipt on the saved plan', () => {
    const workspace = cloneSeedData();
    const result = persistConvertedPlan({
      workspace,
      conversationId: 'conversation-agent',
      messageId: 'agent-opportunity-ab12cd',
      responseText: 'Approved content opportunity with a ready brief and next steps.',
      userIntent: 'Create a plan from an agent-approved opportunity: Approved content opportunity',
      activeTwinId: null,
      planPreset: 'content-plan',
      sourceSurface: 'agent-proposal',
      convertedFromLabel: 'Agent proposal'
    });

    const plan = result.workspace.planWorkspace?.plans.find((item) => item.id === result.plan.id);
    expect(plan?.source.sourceSurface).toBe('agent-proposal');
    expect(plan?.receiptId).toBe(result.receipt.id);
    const receipt = result.workspace.planWorkspace?.receipts.find(
      (item) => item.id === result.receipt.id
    );
    expect(receipt?.convertedFrom).toBe('Agent proposal');
  });

  it('defaults to the Ask surface when none is provided', () => {
    const workspace = cloneSeedData();
    const result = persistConvertedPlan({
      workspace,
      conversationId: 'conversation-ask',
      messageId: 'assistant-99',
      responseText: 'Turn this insight into a weekly execution plan.',
      userIntent: 'Convert this Ask response into a plan',
      activeTwinId: null,
      planPreset: 'weekly-execution-plan'
    });

    const plan = result.workspace.planWorkspace?.plans.find((item) => item.id === result.plan.id);
    expect(plan?.source.sourceSurface).toBe('ask-my-twin');
    expect(result.receipt.convertedFrom).toBe('Ask');
  });

  it('maps operational card kinds to canonical plan presets', () => {
    expect(planPresetForOperationalKind('outreach')).toBe('outreach-plan');
    expect(planPresetForOperationalKind('content-calendar')).toBe('content-plan');
    expect(planPresetForOperationalKind('workflow')).toBe('workflow-plan');
    expect(planPresetForOperationalKind('execution-sequence')).toBe('custom-plan');
    expect(planPresetForOperationalKind('action-queue')).toBe('custom-plan');
    expect(planPresetForOperationalKind('approval-flow')).toBe('custom-plan');
  });
});
