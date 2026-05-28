import { describe, expect, it } from 'vitest';

import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { buildOperationalPlanFromWorkflowPrediction } from '../../src/pages/mobile/workflowPredictionPlanConversion';
import { buildWorkflowPredictionLayerReadout } from '../../src/services/plan/workflowPredictionLayer';
import { cloneSeedData } from '../helpers/fixtures';

const now = '2026-05-28T09:00:00.000Z';

function workspaceWithRepeatedWorkflowSignals() {
  const workspace = cloneSeedData();
  workspace.brandVault.signatureThemes = ['Creator workflow systems', 'Founder content pipelines'];
  workspace.brandVault.expertiseAreas = ['Creator operations', 'Content systems'];
  workspace.outreachDrafts = [
    {
      id: 'draft-founder-1',
      category: 'follow-up',
      targetName: 'Ari',
      company: 'Northstar',
      role: 'Founder',
      messageBody: 'Following up on the workflow discussion.',
      outreachGoal: 'Book founder workflow follow-up',
      tone: 'warm',
      status: 'ready',
      notes: 'Repeated founder follow-up pattern.',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'draft-founder-2',
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
  workspace.outreachTemplates = [
    {
      id: 'template-follow-up',
      name: 'Founder follow-up workflow',
      category: 'follow-up',
      openerBlock: 'Warm opener',
      valueBlock: 'Workflow value',
      proofBlock: 'Proof point',
      callToActionBlock: 'Book next step',
      signoffBlock: 'Thanks',
      createdAt: now,
      updatedAt: now
    }
  ];
  workspace.outreachHistory = [
    {
      id: 'history-follow-up',
      draftId: 'draft-founder-1',
      targetName: 'Ari',
      company: 'Northstar',
      status: 'sent',
      loggedAt: now,
      summary: 'Sent founder follow-up message.'
    }
  ];
  workspace.scheduler.tasks = [
    {
      id: 'task-review-1',
      sourceId: 'scheduler',
      sourceType: 'follow-up',
      title: 'Weekly founder follow-up review',
      detail: 'Review warm founder replies.',
      dueAt: now,
      remindAt: now,
      status: 'due',
      recurrence: { interval: 'weekly', every: 1 },
      snoozeCount: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'task-review-2',
      sourceId: 'scheduler',
      sourceType: 'follow-up',
      title: 'Founder follow-up review',
      detail: 'Review warm founder replies.',
      dueAt: now,
      remindAt: now,
      status: 'due-soon',
      snoozeCount: 0,
      createdAt: now,
      updatedAt: now
    }
  ];
  workspace.operatorTraces = {
    entries: [
      {
        id: 'trace-plan-1',
        at: now,
        source: 'user',
        verb: 'create_plan',
        surface: 'plan',
        outcome: 'success',
        reviewStatus: 'approved'
      },
      {
        id: 'trace-plan-2',
        at: now,
        source: 'assistant',
        verb: 'create_plan',
        surface: 'plan',
        outcome: 'success',
        reviewStatus: 'pending'
      }
    ]
  };
  workspace.aiAssistantTraces = {
    entries: [
      {
        id: 'ask-workflow',
        at: now,
        trace_schema_version: '1.0.0',
        surface: 'assistant_chat',
        outcome: 'success',
        user_turn_preview: 'Turn this repeated outreach into a workflow plan.',
        assistant_preview: 'Draft workflow steps.',
        citations: [],
        model_id: 'hosted-routing'
      }
    ]
  };
  workspace.contentLibrary = [
    {
      id: 'content-creator-1',
      type: 'post-draft',
      title: 'Creator workflow loop',
      body: 'Draft.',
      tags: ['creator', 'workflow'],
      audience: 'Founder creators',
      goal: 'Lead generation',
      status: 'drafting',
      publishChannel: 'linkedin',
      notes: 'Creator series pattern.',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'content-pipeline-2',
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
      id: 'queue-creator-1',
      title: 'Creator workflow post',
      body: 'Queued post.',
      platforms: ['linkedin'],
      tags: ['creator', 'workflow'],
      status: 'queued',
      contentLibraryItemId: 'content-creator-1',
      scheduledFor: now,
      createdAt: now,
      updatedAt: now
    }
  ];
  return workspace;
}

describe('Workflow Prediction Layer', () => {
  it('detects repeated outreach, scheduling, planning, creator, and content pipeline workflows', () => {
    const readout = buildWorkflowPredictionLayerReadout(workspaceWithRepeatedWorkflowSignals());

    expect(readout.predictions.map((prediction) => prediction.kind)).toEqual(
      expect.arrayContaining([
        'repeated-outreach',
        'repeated-scheduling',
        'repeated-planning',
        'repeated-creator-workflow',
        'repeated-content-pipeline'
      ])
    );
    expect(readout.predictions.every((prediction) => prediction.approvalRequired)).toBe(true);
    expect(readout.predictions.every((prediction) => prediction.suggestion.includes('Would you like'))).toBe(
      true
    );
    expect(readout.predictions.every((prediction) => prediction.controls.saveCommand.startsWith('ask:'))).toBe(
      true
    );
    expect(
      readout.predictions.every((prediction) =>
        prediction.controls.automateWithApprovalsCommand.includes('approval-gated automation')
      )
    ).toBe(true);
    expect(readout.approvalPolicy).toContain('review and approve');
  });

  it('converts workflow predictions into reusable PLAN workflow cards', () => {
    const prediction = buildWorkflowPredictionLayerReadout(workspaceWithRepeatedWorkflowSignals())
      .predictions[0];
    const card = buildOperationalPlanFromWorkflowPrediction(prediction);

    expect(card.title).toContain(prediction.reusableTemplateName);
    expect(card.sourceLabel).toBe('Converted from workflow prediction');
    expect(card.promise).toContain('Workflow Prediction Layer');
    expect(card.previewCommand).toContain('Workflow Prediction Layer');
    expect(card.exportPayload.type).toBe('workflow-prediction-plan');
  });

  it('exposes Workflow Prediction Layer on the mobile workspace snapshot', () => {
    const snapshot = buildWorkspaceSnapshot(workspaceWithRepeatedWorkflowSignals());

    expect(snapshot.workflowPredictionLayer.predictions.length).toBeGreaterThan(0);
    expect(snapshot.workflowPredictionLayer.averageConfidence).toBeGreaterThan(0);
  });
});

