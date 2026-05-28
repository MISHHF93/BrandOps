import { describe, expect, it } from 'vitest';

import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { buildCrossPlatformOperationalTimeline } from '../../src/services/plan/crossPlatformOperationalTimeline';
import { cloneSeedData } from '../helpers/fixtures';

function workspaceWithTimelineSignals() {
  const workspace = cloneSeedData();
  workspace.brand = {
    ...workspace.brand,
    operatorName: 'Maya Rivera',
    positioning: 'AI operator for founder workflow systems',
    primaryOffer: 'AI workflow strategy and execution systems',
    voiceGuide: 'Clear, strategic, proof-led.'
  };
  workspace.integrationHub.sources = [
    {
      id: 'source-google',
      name: 'Google Workspace',
      kind: 'google-workspace',
      status: 'connected',
      artifactTypes: ['calendar-event', 'email-thread-summary'],
      tags: ['gmail', 'calendar'],
      notes: 'Approved Gmail and calendar summaries only.',
      createdAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  workspace.integrationHub.artifacts = [
    {
      id: 'artifact-gmail-founder',
      sourceId: 'source-google',
      title: 'Gmail founder conversation summary',
      artifactType: 'email-thread-summary',
      summary: 'Founder asked for a follow-up proposal.',
      tags: ['gmail', 'outreach'],
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  workspace.outreachDrafts = [
    {
      id: 'draft-founder',
      category: 'founder intro',
      targetName: 'Ari Founder',
      company: 'Orbit Labs',
      role: 'Founder',
      messageBody: 'Draft founder follow-up.',
      outreachGoal: 'Book a founder workflow strategy call.',
      tone: 'warm strategic',
      status: 'ready',
      notes: 'Needs human approval.',
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:10:00.000Z'
    }
  ];
  workspace.contentLibrary = [
    {
      id: 'content-proof',
      type: 'post-draft',
      title: 'AI operator proof post',
      body: 'Draft proof-led post.',
      tags: ['ai-operator'],
      audience: 'founders',
      goal: 'Show operational proof',
      status: 'published',
      publishChannel: 'linkedin',
      notes: 'Posted after approval.',
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T01:00:00.000Z'
    }
  ];
  workspace.operatorTraces = {
    entries: [
      {
        id: 'trace-approval',
        at: '2026-05-28T00:20:00.000Z',
        source: 'assistant',
        verb: 'draft_external_outreach',
        surface: 'PLAN',
        route: 'approval-queue',
        reviewStatus: 'pending'
      }
    ]
  };
  workspace.outreachHistory = [
    {
      id: 'history-founder',
      draftId: 'draft-founder',
      targetName: 'Ari Founder',
      company: 'Orbit Labs',
      status: 'sent',
      loggedAt: '2026-05-28T01:20:00.000Z',
      summary: 'Founder outreach was sent after approval.'
    }
  ];
  workspace.scheduler.tasks = [
    {
      id: 'task-founder-follow-up',
      sourceId: 'draft-founder',
      sourceType: 'follow-up',
      title: 'Follow up with Ari Founder',
      detail: 'Check reply window and prep next message.',
      dueAt: '2026-05-28T12:00:00.000Z',
      remindAt: '2026-05-28T11:45:00.000Z',
      status: 'scheduled',
      snoozeCount: 0,
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  workspace.aiPipelineRuns = {
    schema_version: '1.0.0',
    entries: [
      {
        run_id: 'run-proof',
        pipeline_id: 'workspace_audit_report',
        schema_version: '1.0.0',
        started_at: '2026-05-28T01:30:00.000Z',
        ended_at: '2026-05-28T01:31:00.000Z',
        status: 'success',
        steps: [{ step_id: 'summarize', status: 'success' }]
      }
    ]
  };

  return workspace;
}

describe('Cross-platform Operational Timeline', () => {
  it('builds a cross-platform feed for all requested operational event types', () => {
    const readout = buildCrossPlatformOperationalTimeline(workspaceWithTimelineSignals());
    const kinds = readout.items.map((item) => item.kind);

    expect(kinds).toEqual(
      expect.arrayContaining([
        'generated-draft',
        'approval',
        'sent-action',
        'scheduled-workflow',
        'connected-platform-action',
        'ai-recommendation',
        'completed-operation'
      ])
    );
    expect(readout.items.every((item) => item.whatHappened.length > 0)).toBe(true);
    expect(readout.items.every((item) => item.whereItHappened.length > 0)).toBe(true);
    expect(readout.items.every((item) => item.whatAiDid.length > 0)).toBe(true);
    expect(readout.headline).toContain('what happened');
  });

  it('exposes the operational timeline on the workspace snapshot', () => {
    const snapshot = buildWorkspaceSnapshot(workspaceWithTimelineSignals());

    expect(snapshot.crossPlatformOperationalTimeline.totalCount).toBeGreaterThan(0);
    expect(snapshot.crossPlatformOperationalTimeline.countsByKind.approval).toBeGreaterThan(0);
  });
});
