import { describe, expect, it } from 'vitest';

import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { buildPredictiveAskPromptGroups } from '../../src/pages/mobile/predictiveAskPrompts';
import {
  createDigitalTwinFromText,
  hydrateWorkspaceFromDigitalTwin
} from '../../src/services/digitalTwin/digitalTwin';
import { buildMemoryContextEngineReadout } from '../../src/services/memory/memoryContextEngine';
import type { PredictiveOpportunityLayerReadout } from '../../src/services/plan/predictiveOpportunityLayer';
import { cloneSeedData } from '../helpers/fixtures';

const now = '2026-05-28T09:00:00.000Z';
const resumeText = `
Maya Rivera
AI Product Operator
Summary
Builds workflow systems and creator operating loops for founder-led teams.
Skills
AI strategy, creator operations, GTM systems, workflow automation
`;

function workspaceWithMemorySignals() {
  const base = cloneSeedData();
  const { twin, resumeArtifact } = createDigitalTwinFromText({
    workspace: base,
    rawText: resumeText,
    sourceType: 'resume',
    reviewOverrides: {
      displayName: 'Maya Rivera',
      headline: 'AI Product Operator'
    },
    now: new Date(now)
  });
  const workspace = hydrateWorkspaceFromDigitalTwin({
    workspace: base,
    twin,
    resumeArtifact,
    now: new Date(now)
  }).workspace;

  const active = workspace.digitalTwins?.twins[0];
  if (active) {
    active.identity.goals = ['Book five founder workflow calls per month'];
    active.memory.preferences = ['Prefers concise, direct recommendations'];
    active.memory.approvedClaims = ['Built creator operating loops for founder-led teams'];
    active.memory.rejectedClaims = ['Do not claim Fortune 500 enterprise experience'];
    active.memory.voiceExamples = ['Clear, practical, and operator-led'];
  }
  workspace.settings.operatorTraceCollectionEnabled = true;
  workspace.settings.connectedIdentityLearningEnabled = true;
  workspace.brand.focusMetric = 'High-fit founder workflow calls per month';
  workspace.brand.voiceGuide = 'Concise, practical, and confident.';
  workspace.brandVault.preferredVoiceNotes = ['Avoid hype and explain the operating reason.'];
  workspace.operatorTraces = {
    entries: [
      {
        id: 'trace-approved',
        at: now,
        source: 'user',
        verb: 'draft_follow_up',
        surface: 'plan',
        outcome: 'success',
        reviewStatus: 'approved'
      },
      {
        id: 'trace-rejected',
        at: now,
        source: 'assistant',
        verb: 'auto_publish_post',
        surface: 'plan',
        outcome: 'failure',
        reviewStatus: 'rejected'
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
      id: 'task-1',
      sourceId: 'scheduler',
      sourceType: 'follow-up',
      title: 'Weekly founder follow-up review',
      detail: 'Review founder follow-ups.',
      dueAt: now,
      remindAt: now,
      status: 'due',
      snoozeCount: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'task-2',
      sourceId: 'scheduler',
      sourceType: 'follow-up',
      title: 'Founder follow-up review',
      detail: 'Review founder follow-ups.',
      dueAt: now,
      remindAt: now,
      status: 'due-soon',
      snoozeCount: 0,
      createdAt: now,
      updatedAt: now
    }
  ];
  return workspace;
}

const predictiveLayer: PredictiveOpportunityLayerReadout = {
  suggestions: [
    {
      id: 'predictive-workflow-optimization',
      kind: 'workflow-optimization',
      title: 'Optimize repeated founder follow-up workflow',
      suggestion: 'Turn repeated founder follow-up into a reusable workflow.',
      whyThisAppeared: 'Repeated follow-up and planning memory are available.',
      confidence: 84,
      supportingSignals: ['draft_follow_up repeated'],
      expectedImpact: 'Less duplicated planning.',
      generatedFrom: ['behavioral-history', 'memory-patterns'],
      approvalRequired: true,
      previewCommand: 'ask: review workflow'
    }
  ],
  totalCount: 1,
  averageConfidence: 84,
  sourceCoverage: {
    profession: 0,
    'twin-profile': 0,
    'connected-platforms': 0,
    'recent-actions': 0,
    'behavioral-history': 1,
    'memory-patterns': 1
  },
  approvalPolicy: 'Approve first.',
  headline: '1 opportunity.'
};

describe('Memory & Context Engine', () => {
  it('tracks goals, preferences, actions, patterns, workflows, approvals, style, and scheduling', () => {
    const readout = buildMemoryContextEngineReadout(workspaceWithMemorySignals());

    expect(readout.enabled).toBe(true);
    expect(readout.entriesByCategory.goals.length).toBeGreaterThan(0);
    expect(readout.entriesByCategory.preferences.length).toBeGreaterThan(0);
    expect(readout.entriesByCategory['recurring-actions'].length).toBeGreaterThan(0);
    expect(readout.entriesByCategory['behavioral-patterns'].length).toBeGreaterThan(0);
    expect(readout.entriesByCategory['preferred-workflows'].length).toBeGreaterThan(0);
    expect(readout.entriesByCategory['approved-outputs'].length).toBeGreaterThan(0);
    expect(readout.entriesByCategory['rejected-outputs'].length).toBeGreaterThan(0);
    expect(readout.entriesByCategory['communication-style'].length).toBeGreaterThan(0);
    expect(readout.entriesByCategory['scheduling-habits'].length).toBeGreaterThan(0);
    expect(readout.controls.viewCommand).toContain('Show my Memory & Context Engine summary');
    expect(readout.controls.editCommand).toContain('edit Memory & Context Engine');
    expect(readout.controls.deleteCommand).toContain('delete Memory & Context Engine');
    expect(readout.controls.disableCommand).toContain('disable Memory & Context Engine');
  });

  it('feeds persistent memory into ASK suggestions', () => {
    const memory = buildMemoryContextEngineReadout(workspaceWithMemorySignals());
    const groups = buildPredictiveAskPromptGroups({
      predictiveOpportunityLayer: predictiveLayer,
      memoryContextEngine: memory
    });
    const prompt = groups.flatMap((group) => group.prompts)[0];

    expect(prompt?.command).toContain('persistent memory context');
    expect(prompt?.command).toContain('founder workflow calls');
  });

  it('exposes Memory & Context Engine on the mobile workspace snapshot', () => {
    const snapshot = buildWorkspaceSnapshot(workspaceWithMemorySignals());

    expect(snapshot.memoryContextEngine.entries.length).toBeGreaterThan(0);
    expect(snapshot.memoryContextEngine.improvements['ask-suggestions'].length).toBeGreaterThan(0);
  });
});

