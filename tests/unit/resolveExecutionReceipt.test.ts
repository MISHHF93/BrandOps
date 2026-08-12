import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import { resolveExecutionReceipt } from '../../src/services/execution/resolveExecutionReceipt';
import { buildCheckpoint } from '../../src/services/execution/checkpointStore';
import type { BrandOpsData, Plan, PlanReceipt } from '../../src/types/domain';

function seedApprovedPlanWithReceipt(): BrandOpsData {
  let data = cloneSeedData();
  const plan: Plan = {
    id: 'plan-1',
    title: 'Outreach plan',
    summary: 's',
    objective: 'o',
    planType: 'outreach-plan',
    confidenceScore: 70,
    sourceResponseId: 'msg-1',
    assumptions: [],
    missingInputs: ['audience definition'],
    requiredApprovals: ['Approve before sending outreach'],
    steps: [],
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
      verifiedFactsUsed: ['operator confirmed 3 warm leads'],
      unverifiedMissingFacts: [],
      timestamp: new Date().toISOString(),
      conversationId: 'c1',
      messageId: 'msg-1'
    },
    estimatedEffort: '1 session',
    expectedOutput: 'outreach draft',
    savedAt: new Date().toISOString(),
    receiptId: 'plan-receipt-1'
  };
  const receipt: PlanReceipt = {
    id: 'plan-receipt-1',
    planId: 'plan-1',
    convertedFrom: 'Ask',
    planType: 'outreach-plan',
    sourceMessageId: 'msg-1',
    generatedSteps: ['Draft opener', 'Schedule follow-up'],
    userAction: 'save-plan',
    timestamp: new Date().toISOString(),
    summary: 'Converted outreach plan from Ask response.'
  };
  data = {
    ...data,
    planWorkspace: { plans: [plan], receipts: [receipt], updatedAt: new Date().toISOString() }
  };
  return data;
}

describe('resolveExecutionReceipt', () => {
  it('returns null when the checkpoint has no receiptRef', () => {
    const data = seedApprovedPlanWithReceipt();
    const checkpoint = buildCheckpoint({
      conversationId: 'c1',
      type: 'ask.response',
      state: 'COMPLETED',
      summary: 'ok',
      source: 'assistant'
    });
    expect(resolveExecutionReceipt(data, checkpoint)).toBeNull();
  });

  it('returns null when receiptRef does not match any persisted PlanReceipt', () => {
    const data = seedApprovedPlanWithReceipt();
    const checkpoint = buildCheckpoint({
      conversationId: 'c1',
      type: 'plan.saved',
      state: 'COMPLETED',
      summary: 'saved',
      source: 'assistant',
      receiptRef: 'does-not-exist'
    });
    expect(resolveExecutionReceipt(data, checkpoint)).toBeNull();
  });

  it('resolves the same enriched shape buildPlanExecutionReceipts computes, not a thinner parallel view', () => {
    const data = seedApprovedPlanWithReceipt();
    const checkpoint = buildCheckpoint({
      conversationId: 'c1',
      type: 'plan.saved',
      state: 'COMPLETED',
      summary: 'saved',
      source: 'assistant',
      associatedPlanRef: { id: 'plan-1', kind: 'saved' },
      receiptRef: 'plan-receipt-1'
    });
    const receipt = resolveExecutionReceipt(data, checkpoint);
    expect(receipt).not.toBeNull();
    expect(receipt?.id).toBe('plan-receipt-1');
    expect(receipt?.planTitle).toBe('Outreach plan');
    // Real Plan.status ('approved'), not the raw PlanReceipt.userAction enum.
    expect(receipt?.status).toBe('approved');
    // "Approved inputs" means facts already verified/used as input, not the (opposite) list of gates still requiring approval.
    expect(receipt?.approvedInputs).toEqual(['operator confirmed 3 warm leads']);
    expect(receipt?.result).toContain('Draft opener');
    expect(receipt?.result).toContain('Schedule follow-up');
    // Plan has a missing input — should surface as a warning folded into the result, not silently dropped.
    expect(receipt?.result).toContain('Missing input: audience definition');
  });
});
