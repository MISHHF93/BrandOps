import { describe, expect, it } from 'vitest';

import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { buildBehavioralIntelligenceEngineReadout } from '../../src/services/intelligence/behavioralIntelligenceEngine';
import { cloneSeedData } from '../helpers/fixtures';

function workspaceWithBehavioralSignals() {
  const workspace = cloneSeedData();
  workspace.integrationHub.sources = [
    {
      id: 'source-google',
      name: 'Google Workspace',
      kind: 'google-workspace',
      status: 'connected',
      artifactTypes: ['calendar-event', 'email-thread-summary'],
      tags: ['gmail', 'calendar'],
      notes: 'Approved Gmail and Calendar summaries only.',
      createdAt: '2026-05-28T00:00:00.000Z'
    },
    {
      id: 'source-linkedin',
      name: 'LinkedIn profile',
      kind: 'linkedin-marketing',
      status: 'connected',
      artifactTypes: ['profile-summary'],
      tags: ['linkedin', 'outreach'],
      notes: 'Approved LinkedIn profile summary.',
      createdAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  workspace.integrationHub.artifacts = [
    {
      id: 'artifact-gmail',
      sourceId: 'source-google',
      title: 'Gmail founder summary',
      artifactType: 'email-thread-summary',
      summary: 'Founder asked for a follow-up proposal and calendar hold.',
      tags: ['gmail', 'follow-up'],
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  workspace.operatorTraces = {
    entries: [
      {
        id: 'trace-1',
        at: '2026-05-28T09:05:00.000Z',
        source: 'user',
        verb: 'draft_follow_up',
        surface: 'plan',
        outcome: 'success',
        reviewStatus: 'pending'
      },
      {
        id: 'trace-2',
        at: '2026-05-28T09:15:00.000Z',
        source: 'assistant',
        verb: 'draft_follow_up',
        surface: 'ask',
        outcome: 'success',
        reviewStatus: 'approved'
      }
    ]
  };
  workspace.aiAssistantTraces = {
    entries: [
      {
        id: 'ask-1',
        at: '2026-05-28T09:10:00.000Z',
        trace_schema_version: '1.0.0',
        surface: 'assistant_chat',
        outcome: 'success',
        user_turn_preview: 'What should I prioritize before founder follow-up?',
        assistant_preview: 'Review the founder thread, draft reply, and confirm approval gate.',
        citations: [],
        model_id: 'hosted-routing'
      }
    ]
  };
  workspace.scheduler.tasks = [
    {
      id: 'task-1',
      sourceId: 'follow-up-1',
      sourceType: 'follow-up',
      title: 'Follow up with founder',
      detail: 'Reply to the proposal thread.',
      dueAt: '2026-05-28T09:30:00.000Z',
      remindAt: '2026-05-28T09:00:00.000Z',
      status: 'due',
      snoozeCount: 1,
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T09:00:00.000Z'
    },
    {
      id: 'task-2',
      sourceId: 'follow-up-2',
      sourceType: 'follow-up',
      title: 'Weekly founder follow up',
      detail: 'Confirm next conversation.',
      dueAt: '2026-05-28T09:45:00.000Z',
      remindAt: '2026-05-28T09:15:00.000Z',
      status: 'due-soon',
      snoozeCount: 0,
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T09:00:00.000Z'
    }
  ];
  workspace.contentLibrary = [
    {
      id: 'content-1',
      type: 'post-draft',
      title: 'Founder workflow lessons',
      body: 'Draft body.',
      tags: ['founder-workflows', 'ops'],
      audience: 'Founders',
      goal: 'Lead generation',
      status: 'ready',
      publishChannel: 'linkedin',
      notes: 'Use after founder follow-up.',
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T09:00:00.000Z'
    }
  ];
  workspace.outreachDrafts = [
    {
      id: 'draft-1',
      category: 'founder intro',
      targetName: 'Ari Founder',
      company: 'Orbit Labs',
      role: 'Founder',
      messageBody: 'Draft message.',
      outreachGoal: 'Book a founder intro call.',
      tone: 'warm strategic',
      status: 'ready',
      notes: 'Needs approval before sending.',
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T09:00:00.000Z'
    }
  ];
  return workspace;
}

describe('Behavioral Intelligence Engine', () => {
  it('detects behavioral patterns and predicts approval-gated next actions', () => {
    const readout = buildBehavioralIntelligenceEngineReadout(workspaceWithBehavioralSignals());

    expect(readout.patterns.map((pattern) => pattern.kind)).toEqual(
      expect.arrayContaining([
        'user-action',
        'ask',
        'plan',
        'connected-platform',
        'workflow',
        'repeated-task',
        'operational-timing',
        'content',
        'outreach',
        'scheduling'
      ])
    );
    expect(readout.predictions.length).toBeGreaterThan(0);
    expect(readout.predictions.every((prediction) => prediction.approvalRequired)).toBe(true);
    expect(readout.predictions.every((prediction) => prediction.suggestedCommand.startsWith('ask:'))).toBe(
      true
    );
    expect(
      readout.predictions.every((prediction) =>
        prediction.suggestedCommand.includes('Do not execute externally')
      )
    ).toBe(true);
    expect(readout.approvalPolicy).toContain('user must approve');
  });

  it('exposes the behavioral readout on the mobile workspace snapshot', () => {
    const snapshot = buildWorkspaceSnapshot(workspaceWithBehavioralSignals());

    expect(snapshot.behavioralIntelligenceEngine.predictions.length).toBeGreaterThan(0);
    expect(snapshot.behavioralIntelligenceEngine.averageConfidence).toBeGreaterThan(0);
    expect(snapshot.behavioralIntelligenceEngine.signalCoverage['ask-behavior']).toBeGreaterThan(0);
  });
});

