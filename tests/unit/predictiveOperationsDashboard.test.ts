import { describe, expect, it } from 'vitest';

import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { buildPredictiveOperationsDashboardReadout } from '../../src/services/plan/predictiveOperationsDashboard';
import { cloneSeedData } from '../helpers/fixtures';

const now = '2026-05-28T09:00:00.000Z';

function workspaceWithPredictiveOpsSignals() {
  const workspace = cloneSeedData();
  workspace.settings.syncHub.linkedin.connectionStatus = 'connected';
  workspace.settings.operatorTraceCollectionEnabled = true;
  workspace.settings.connectedIdentityLearningEnabled = true;
  workspace.brand.focusMetric = 'High-fit founder workflow calls per month';
  workspace.integrationHub.sources = [
    {
      id: 'source-linkedin',
      name: 'LinkedIn profile',
      kind: 'linkedin-marketing',
      status: 'connected',
      artifactTypes: ['profile-summary'],
      tags: ['linkedin', 'creator', 'growth'],
      notes: 'Approved LinkedIn profile summary.',
      createdAt: now
    }
  ];
  workspace.integrationHub.artifacts = [
    {
      id: 'artifact-linkedin',
      sourceId: 'source-linkedin',
      title: 'LinkedIn engagement summary',
      artifactType: 'profile-summary',
      summary: 'Founder workflow content is driving comments and creator growth opportunities.',
      tags: ['linkedin', 'engagement', 'growth'],
      createdAt: now,
      updatedAt: now
    }
  ];
  workspace.integrationHub.liveFeed = [
    {
      id: 'feed-linkedin',
      source: 'LinkedIn',
      title: 'Creator workflow post gained replies',
      detail: 'Audience asked for the founder workflow checklist.',
      level: 'info',
      happenedAt: now
    }
  ];
  workspace.operatorTraces = {
    entries: [
      {
        id: 'trace-pending',
        at: now,
        source: 'assistant',
        verb: 'draft_follow_up',
        surface: 'plan',
        outcome: 'success',
        reviewStatus: 'pending'
      },
      {
        id: 'trace-repeat',
        at: now,
        source: 'user',
        verb: 'draft_follow_up',
        surface: 'ask',
        outcome: 'success',
        reviewStatus: 'approved'
      }
    ]
  };
  workspace.scheduler.tasks = [
    {
      id: 'task-missed',
      sourceId: 'scheduler',
      sourceType: 'follow-up',
      title: 'Founder follow-up review',
      detail: 'Review warm founder replies.',
      dueAt: '2026-05-27T09:00:00.000Z',
      remindAt: '2026-05-27T08:30:00.000Z',
      status: 'missed',
      snoozeCount: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'task-due',
      sourceId: 'scheduler',
      sourceType: 'follow-up',
      title: 'Weekly founder follow-up review',
      detail: 'Review warm founder replies.',
      dueAt: now,
      remindAt: now,
      status: 'due',
      snoozeCount: 0,
      createdAt: now,
      updatedAt: now
    }
  ];
  workspace.outreachDrafts = [
    {
      id: 'draft-founder',
      category: 'follow-up',
      targetName: 'Ari',
      company: 'Northstar',
      role: 'Founder',
      messageBody: 'Following up on the workflow checklist.',
      outreachGoal: 'Book founder workflow follow-up',
      tone: 'warm',
      status: 'ready',
      notes: 'Warm founder follow-up.',
      createdAt: now,
      updatedAt: now
    }
  ];
  workspace.contentLibrary = [
    {
      id: 'content-workflow',
      type: 'post-draft',
      title: 'Creator workflow checklist',
      body: 'Draft.',
      tags: ['creator', 'workflow'],
      audience: 'Founder creators',
      goal: 'Audience growth',
      status: 'ready',
      publishChannel: 'linkedin',
      notes: 'Strong growth signal.',
      createdAt: now,
      updatedAt: now
    }
  ];
  return workspace;
}

describe('Predictive Operations Dashboard', () => {
  it('builds live lanes for opportunities, needs, workflows, approvals, bottlenecks, growth, platforms, and next actions', () => {
    const readout = buildPredictiveOperationsDashboardReadout(workspaceWithPredictiveOpsSignals());

    expect(readout.opportunities.length).toBeGreaterThan(0);
    expect(readout.predictedNeeds.length).toBeGreaterThan(0);
    expect(readout.suggestedWorkflows.length).toBeGreaterThan(0);
    expect(readout.pendingApprovals.length).toBeGreaterThan(0);
    expect(readout.operationalBottlenecks.length).toBeGreaterThan(0);
    expect(readout.growthRecommendations.length).toBeGreaterThan(0);
    expect(readout.platformInsights.length).toBeGreaterThan(0);
    expect(readout.nextBestActions.length).toBeGreaterThan(0);
    expect(readout.allItems.every((item) => item.command.startsWith('ask:'))).toBe(true);
    expect(readout.headline).toContain('predictive operations');
    expect(readout.liveScore).toBeGreaterThan(0);
  });

  it('exposes the Predictive Operations Dashboard on the mobile workspace snapshot', () => {
    const snapshot = buildWorkspaceSnapshot(workspaceWithPredictiveOpsSignals());

    expect(snapshot.predictiveOperationsDashboard.allItems.length).toBeGreaterThan(0);
    expect(snapshot.predictiveOperationsDashboard.stateLine.length).toBeGreaterThan(0);
  });
});

