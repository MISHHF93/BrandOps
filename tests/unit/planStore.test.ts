import { describe, it, expect } from 'vitest';
import {
  updatePlanStatus,
  derivePlanStatusFromCheckpoints
} from '../../src/services/execution/planStore';
import type { BrandOpsData, Plan } from '../../src/types/domain';

function makeWorkspaceWithPlan(planId: string, status: Plan['status']): BrandOpsData {
  return {
    modules: [],
    brand: { operatorName: 'Test', primaryOffer: '', focusMetric: '' },
    brandVault: { positioning: '', bios: [], services: [], proofPoints: [], voiceNotes: [] },
    contentLibrary: [],
    publishingQueue: [],
    contacts: [],
    companies: [],
    opportunities: [],
    outreachDrafts: [],
    outreachTemplates: [],
    outreachHistory: [],
    followUps: [],
    activityNotes: [],
    settings: {} as BrandOpsData['settings'],
    planWorkspace: {
      plans: [
        {
          id: planId,
          title: 'Test Plan',
          status,
          source: { conversationId: 'conv-1' },
          steps: [],
          timeline: [],
          outputs: [],
          risks: [],
          nextActions: [],
          readiness: { score: 80, label: 'Ready' }
        }
      ],
      receipts: [],
      updatedAt: new Date().toISOString()
    }
  } as BrandOpsData;
}

describe('updatePlanStatus', () => {
  it('updates the plan status when plan is found', () => {
    const data = makeWorkspaceWithPlan('plan-1', 'pending-approval');
    const result = updatePlanStatus(data, 'plan-1', 'approved');
    expect(result.planWorkspace?.plans[0].status).toBe('approved');
  });

  it('returns data unchanged when plan is not found', () => {
    const data = makeWorkspaceWithPlan('plan-1', 'pending-approval');
    const result = updatePlanStatus(data, 'plan-nonexistent', 'approved');
    expect(result).toBe(data);
  });

  it('does not mutate the original workspace', () => {
    const data = makeWorkspaceWithPlan('plan-1', 'pending-approval');
    const result = updatePlanStatus(data, 'plan-1', 'approved');
    expect(data.planWorkspace?.plans[0].status).toBe('pending-approval');
    expect(result.planWorkspace?.plans[0].status).toBe('approved');
  });

  it('updates the updatedAt timestamp to a valid ISO string', () => {
    const data = makeWorkspaceWithPlan('plan-1', 'pending-approval');
    const result = updatePlanStatus(data, 'plan-1', 'approved');
    expect(result.planWorkspace?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('derivePlanStatusFromCheckpoints', () => {
  it('returns null when no checkpoints exist', () => {
    const data = makeWorkspaceWithPlan('plan-1', 'pending-approval');
    expect(derivePlanStatusFromCheckpoints(data, 'plan-1')).toBeNull();
  });

  it('derives approved from plan.approval_granted checkpoint', () => {
    const data = makeWorkspaceWithPlan('plan-1', 'pending-approval');
    data.checkpoints = {
      entries: [
        {
          id: 'cp-1',
          conversationId: 'conv-1',
          type: 'plan.approval_granted',
          state: 'COMPLETED',
          summary: 'Approved',
          source: 'user',
          at: new Date().toISOString(),
          associatedPlanRef: { id: 'plan-1', kind: 'saved' },
          approvalStatus: 'approved'
        }
      ]
    };
    expect(derivePlanStatusFromCheckpoints(data, 'plan-1')).toBe('approved');
  });

  it('derives executed from plan.execution_completed checkpoint', () => {
    const data = makeWorkspaceWithPlan('plan-1', 'approved');
    data.checkpoints = {
      entries: [
        {
          id: 'cp-1',
          conversationId: 'conv-1',
          type: 'plan.execution_completed',
          state: 'COMPLETED',
          summary: 'Done',
          source: 'automation',
          at: new Date().toISOString(),
          associatedPlanRef: { id: 'plan-1', kind: 'saved' }
        }
      ]
    };
    expect(derivePlanStatusFromCheckpoints(data, 'plan-1')).toBe('executed');
  });

  it('derives verified from plan.verified COMPLETED checkpoint', () => {
    const data = makeWorkspaceWithPlan('plan-1', 'executed');
    data.checkpoints = {
      entries: [
        {
          id: 'cp-1',
          conversationId: 'conv-1',
          type: 'plan.verified',
          state: 'COMPLETED',
          summary: 'Verified',
          source: 'user',
          at: new Date().toISOString(),
          associatedPlanRef: { id: 'plan-1', kind: 'saved' }
        }
      ]
    };
    expect(derivePlanStatusFromCheckpoints(data, 'plan-1')).toBe('verified');
  });

  it('returns null for checkpoints not associated with the plan', () => {
    const data = makeWorkspaceWithPlan('plan-1', 'pending-approval');
    data.checkpoints = {
      entries: [
        {
          id: 'cp-1',
          conversationId: 'conv-1',
          type: 'plan.approval_granted',
          state: 'COMPLETED',
          summary: 'Approved',
          source: 'user',
          at: new Date().toISOString(),
          associatedPlanRef: { id: 'plan-other', kind: 'saved' },
          approvalStatus: 'approved'
        }
      ]
    };
    expect(derivePlanStatusFromCheckpoints(data, 'plan-1')).toBeNull();
  });
});
