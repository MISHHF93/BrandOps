import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import {
  approveCheckpointForTrace,
  rejectCheckpointForTrace
} from '../../src/services/execution/checkpointActions';
import { prependCheckpoint } from '../../src/services/execution/checkpointStore';
import type { BrandOpsData, Plan } from '../../src/types/domain';

function seedPendingPlanReview(): BrandOpsData {
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
    missingInputs: [],
    requiredApprovals: ['send outreach'],
    steps: [],
    timeline: [],
    outputsAssets: [],
    risks: [],
    nextActions: [],
    status: 'pending-approval',
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
    expectedOutput: 'outreach draft',
    savedAt: new Date().toISOString(),
    receiptId: 'receipt-1'
  };
  data = {
    ...data,
    planWorkspace: { plans: [plan], receipts: [], updatedAt: new Date().toISOString() }
  };
  data = prependCheckpoint(data, {
    conversationId: 'c1',
    type: 'plan.approval_requested',
    state: 'NEEDS_APPROVAL',
    summary: 'Approval requested: Outreach plan',
    source: 'assistant',
    associatedPlanRef: { id: 'plan-1', kind: 'saved' },
    approvalStatus: 'pending'
  });
  data = {
    ...data,
    operatorTraces: {
      entries: [
        {
          id: 'trace-1',
          at: new Date().toISOString(),
          source: 'assistant',
          verb: 'ask.convert_to_plan',
          entityType: 'plan',
          entityId: 'plan-1',
          reviewStatus: 'pending'
        }
      ]
    }
  };
  return data;
}

describe('checkpointActions', () => {
  it('approve fans out to Plan.status and mirrors operatorTraces', () => {
    const data = seedPendingPlanReview();
    const next = approveCheckpointForTrace(data, 'trace-1');
    expect(next).not.toBeNull();
    expect(next?.planWorkspace?.plans[0]?.status).toBe('approved');
    expect(next?.operatorTraces?.entries[0]?.reviewStatus).toBe('approved');
    const granted = next?.checkpoints?.entries.find((c) => c.type === 'plan.approval_granted');
    expect(granted).toBeDefined();
    expect(granted?.state).toBe('COMPLETED');
    expect(granted?.associatedPlanRef?.id).toBe('plan-1');
    expect(granted?.parentCheckpointId).toBeDefined();
  });

  it('approve emits an honest plan.verified checkpoint that states no external execution occurred', () => {
    const data = seedPendingPlanReview();
    const next = approveCheckpointForTrace(data, 'trace-1')!;
    const verified = next.checkpoints?.entries.find((c) => c.type === 'plan.verified');
    expect(verified).toBeDefined();
    expect(verified?.state).toBe('COMPLETED');
    expect(verified?.source).toBe('automation');
    expect(verified?.associatedPlanRef?.id).toBe('plan-1');
    expect(verified?.parentCheckpointId).toBe(
      next.checkpoints?.entries.find((c) => c.type === 'plan.approval_granted')?.id
    );
    expect(verified?.summary).toContain('approval recorded');
    expect(verified?.summary).toContain('no external side effects were performed');
  });

  it('reject fans out to Plan.status and mirrors operatorTraces', () => {
    const data = seedPendingPlanReview();
    const next = rejectCheckpointForTrace(data, 'trace-1', 'Missing audience definition.');
    expect(next).not.toBeNull();
    expect(next?.planWorkspace?.plans[0]?.status).toBe('rejected');
    expect(next?.operatorTraces?.entries[0]?.reviewStatus).toBe('rejected');
    const rejected = next?.checkpoints?.entries.find((c) => c.type === 'plan.approval_rejected');
    expect(rejected?.state).toBe('REJECTED');
    expect(rejected?.summary).toBe('Missing audience definition.');
  });

  it('returns null when trace id is missing', () => {
    const data = seedPendingPlanReview();
    expect(approveCheckpointForTrace(data, 'nope')).toBeNull();
  });

  it('returns the same reference when the trace was not pending (idempotent, matches approveOperatorTraceEntry contract)', () => {
    const data = seedPendingPlanReview();
    const approved = approveCheckpointForTrace(data, 'trace-1')!;
    const again = approveCheckpointForTrace(approved, 'trace-1');
    expect(again).toBe(approved);
  });

  it('leaves Plan.status untouched when the trace is not linked to a plan', () => {
    let data = cloneSeedData();
    data = {
      ...data,
      operatorTraces: {
        entries: [
          {
            id: 'trace-2',
            at: new Date().toISOString(),
            source: 'user',
            verb: 'nav.tab_change',
            reviewStatus: 'pending'
          }
        ]
      }
    };
    const next = approveCheckpointForTrace(data, 'trace-2');
    expect(next?.operatorTraces?.entries[0]?.reviewStatus).toBe('approved');
    expect(next?.checkpoints?.entries.length ?? 0).toBe(0);
  });
});
