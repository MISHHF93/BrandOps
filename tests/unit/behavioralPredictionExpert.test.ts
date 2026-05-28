import { describe, expect, it } from 'vitest';
import {
  buildBehavioralPredictionExpertReadout,
  summarizeBehavioralPredictionExpert
} from '../../src/services/ai/behavioralPredictionExpert';
import { cloneSeedData } from '../helpers/fixtures';

const now = '2026-05-28T09:00:00.000Z';
const overdue = '2020-01-01T09:00:00.000Z';

function workspaceWithPredictionSignals() {
  const workspace = cloneSeedData();
  workspace.settings.notificationCenter.maxDailyTasks = 1;
  workspace.brandVault.signatureThemes = ['Creator workflow systems', 'Founder content pipelines'];
  workspace.brandVault.expertiseAreas = ['Creator operations', 'Content systems'];
  workspace.operatorTraces = {
    entries: [
      {
        id: 'trace-1',
        at: now,
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
      },
      {
        id: 'trace-3',
        at: '2026-05-28T09:30:00.000Z',
        source: 'user',
        verb: 'create_plan',
        surface: 'plan',
        outcome: 'success',
        reviewStatus: 'pending'
      },
      {
        id: 'trace-4',
        at: '2026-05-28T09:45:00.000Z',
        source: 'assistant',
        verb: 'create_plan',
        surface: 'plan',
        outcome: 'success',
        reviewStatus: 'approved'
      }
    ]
  };
  workspace.aiAssistantTraces = {
    entries: [
      {
        id: 'ask-1',
        at: now,
        trace_schema_version: '1.0.0',
        surface: 'assistant_chat',
        outcome: 'success',
        user_turn_preview: 'Turn repeated outreach into a workflow plan.',
        assistant_preview: 'Draft workflow steps.',
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
      title: 'Weekly founder follow-up review',
      detail: 'Review warm founder replies.',
      dueAt: overdue,
      remindAt: now,
      status: 'missed',
      recurrence: { interval: 'weekly', every: 1 },
      snoozeCount: 2,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'task-2',
      sourceId: 'follow-up-2',
      sourceType: 'follow-up',
      title: 'Founder follow-up review',
      detail: 'Review warm founder replies.',
      dueAt: overdue,
      remindAt: now,
      status: 'due',
      snoozeCount: 0,
      createdAt: now,
      updatedAt: now
    }
  ];
  workspace.followUps = [
    {
      id: 'follow-1',
      contactId: 'contact-1',
      reason: 'Founder proposal follow-up',
      dueAt: overdue,
      completed: false
    }
  ];
  workspace.contentLibrary = [
    {
      id: 'content-1',
      type: 'post-draft',
      title: 'Creator workflow loop',
      body: 'Draft.',
      tags: ['creator', 'workflow'],
      audience: 'Founder creators',
      goal: 'Lead generation',
      status: 'ready',
      publishChannel: 'linkedin',
      notes: 'Creator series pattern.',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'content-2',
      type: 'post-idea',
      title: 'Content pipeline checklist',
      body: 'Idea.',
      tags: ['content', 'pipeline'],
      audience: 'Founder creators',
      goal: 'Audience growth',
      status: 'idea',
      publishChannel: 'linkedin',
      notes: 'Pipeline step.',
      createdAt: now,
      updatedAt: now
    }
  ];
  workspace.publishingQueue = [
    {
      id: 'queue-1',
      title: 'Creator workflow post',
      body: 'Queued post.',
      platforms: ['linkedin'],
      tags: ['creator', 'workflow'],
      status: 'queued',
      contentLibraryItemId: 'content-1',
      scheduledFor: now,
      createdAt: now,
      updatedAt: now
    }
  ];
  workspace.outreachDrafts = [
    {
      id: 'draft-1',
      category: 'follow-up',
      targetName: 'Ari',
      company: 'Northstar',
      role: 'Founder',
      messageBody: 'Following up on the workflow discussion.',
      outreachGoal: 'Book founder workflow follow-up call',
      tone: 'warm',
      status: 'ready',
      notes: 'Repeated founder follow-up pattern.',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'draft-2',
      category: 'follow-up',
      targetName: 'Noor',
      company: 'BrightOps',
      role: 'Founder',
      messageBody: 'Checking in on the operating loop.',
      outreachGoal: 'Book founder workflow follow-up',
      tone: 'warm',
      status: 'draft',
      notes: 'Repeated founder follow-up pattern.',
      createdAt: now,
      updatedAt: now
    }
  ];
  workspace.outreachHistory = [
    {
      id: 'history-1',
      draftId: 'draft-1',
      targetName: 'Ari',
      company: 'Northstar',
      status: 'sent',
      loggedAt: now,
      summary: 'Sent founder follow-up message.'
    }
  ];
  return workspace;
}

describe('Behavioral Prediction Expert', () => {
  it('analyzes all requested behavior signal families', () => {
    const readout = buildBehavioralPredictionExpertReadout(workspaceWithPredictionSignals());

    expect(readout.signals.map((signal) => signal.kind)).toEqual(
      expect.arrayContaining([
        'repeated-actions',
        'operational-habits',
        'scheduling-patterns',
        'content-behavior',
        'outreach-frequency',
        'workflow-repetition'
      ])
    );
    expect(readout.averageConfidence).toBeGreaterThan(0);
  });

  it('predicts next tasks, workflows, reusable plans, bottlenecks, content, and outreach timing', () => {
    const readout = buildBehavioralPredictionExpertReadout(workspaceWithPredictionSignals());
    const categories = readout.allPredictions.map((prediction) => prediction.category);

    expect(categories).toEqual(
      expect.arrayContaining([
        'next-likely-task',
        'workflow-opportunity',
        'reusable-plan',
        'operational-bottleneck',
        'content-idea',
        'outreach-timing'
      ])
    );
    expect(readout.nextLikelyTasks.length).toBeGreaterThan(0);
    expect(readout.workflowOpportunities.length).toBeGreaterThan(0);
    expect(readout.reusablePlans.length).toBeGreaterThan(0);
    expect(readout.operationalBottlenecks.length).toBeGreaterThan(0);
    expect(readout.contentIdeas.length).toBeGreaterThan(0);
    expect(readout.outreachTiming.length).toBeGreaterThan(0);
  });

  it('keeps predictions suggestion-only and approval gated', () => {
    const readout = buildBehavioralPredictionExpertReadout(workspaceWithPredictionSignals());

    expect(readout.approvalPolicy).toContain('suggestions only');
    expect(readout.allPredictions.every((prediction) => prediction.approvalRequired)).toBe(true);
    expect(
      readout.allPredictions.every((prediction) =>
        prediction.planPreviewCommand.includes('Do not execute externally')
      )
    ).toBe(true);
    expect(
      readout.allPredictions.every((prediction) =>
        prediction.planPreviewCommand.startsWith('ask:')
      )
    ).toBe(true);
    expect(summarizeBehavioralPredictionExpert(readout)).toContain('approval_required=yes');
  });
});
