import { describe, expect, it } from 'vitest';

import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { buildOpportunityEngineReadout } from '../../src/services/plan/opportunityEngine';
import { cloneSeedData } from '../helpers/fixtures';

function workspaceWithOpportunityInputs() {
  const workspace = cloneSeedData();
  workspace.brand = {
    ...workspace.brand,
    operatorName: 'Maya Rivera',
    positioning: 'AI product operator for creator workflow systems',
    primaryOffer: 'Workflow systems and AI operator strategy for founders',
    voiceGuide: 'Clear, strategic, warm, and proof-led.'
  };
  workspace.settings.connectedIdentityLearningEnabled = true;
  workspace.integrationHub.sources = [
    {
      id: 'source-linkedin',
      name: 'LinkedIn profile',
      kind: 'linkedin-marketing',
      status: 'connected',
      artifactTypes: ['profile-summary'],
      tags: ['linkedin', 'positioning'],
      notes: 'Approved profile summary only.',
      createdAt: '2026-05-28T00:00:00.000Z'
    },
    {
      id: 'source-notion',
      name: 'Notion workspace',
      kind: 'notion',
      status: 'connected',
      artifactTypes: ['approved-note-summary'],
      tags: ['notion', 'content'],
      notes: 'Approved notes only.',
      createdAt: '2026-05-28T00:00:00.000Z'
    },
    {
      id: 'source-slack',
      name: 'Slack workspace',
      kind: 'slack',
      status: 'connected',
      artifactTypes: ['approved-thread-summary'],
      tags: ['slack', 'workflow'],
      notes: 'Approved thread summaries only.',
      createdAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  workspace.integrationHub.artifacts = [
    {
      id: 'artifact-gmail-founder',
      sourceId: 'source-gmail',
      title: 'Gmail founder conversation summary',
      artifactType: 'email-summary',
      summary: 'Founder asked for a concise AI workflow operator proposal.',
      tags: ['gmail', 'outreach'],
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z'
    },
    {
      id: 'artifact-notion-content',
      sourceId: 'source-notion',
      title: 'Notion content themes',
      artifactType: 'approved-note-summary',
      summary: 'Notes highlight creator workflow bottlenecks and operator systems.',
      tags: ['notion', 'content'],
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  workspace.operatorTraces = {
    entries: [
      {
        id: 'trace-approval',
        at: '2026-05-28T00:00:00.000Z',
        source: 'assistant',
        verb: 'draft_external_outreach',
        surface: 'plan',
        reviewStatus: 'pending'
      }
    ]
  };
  workspace.scheduler.tasks = [
    {
      id: 'task-founder-follow-up',
      sourceId: 'follow-up-001',
      sourceType: 'follow-up',
      title: 'Founder follow-up',
      detail: 'Reply to the founder proposal thread.',
      dueAt: '2026-05-28T12:00:00.000Z',
      remindAt: '2026-05-28T11:00:00.000Z',
      status: 'due',
      snoozeCount: 0,
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  workspace.companies = [
    {
      id: 'company-orbit',
      name: 'Orbit Labs',
      source: 'LinkedIn',
      relationshipStage: 'building',
      status: 'active',
      nextAction: 'Explore AI workflow partnership',
      notes: 'Potential partner for creator workflow systems.',
      links: ['https://example.com/orbit'],
      relatedOutreachDraftIds: [],
      relatedContentTags: ['creator-workflows']
    }
  ];
  workspace.contacts = [
    {
      id: 'contact-ari',
      name: 'Ari Founder',
      company: 'Orbit Labs',
      role: 'Founder',
      source: 'LinkedIn',
      relationshipStage: 'building',
      status: 'active',
      nextAction: 'Send partnership angle',
      notes: 'Warm founder contact.',
      links: ['https://example.com/ari'],
      relatedOutreachDraftIds: [],
      relatedContentTags: ['creator-workflows'],
      lastContactAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  return workspace;
}

describe('Opportunity Engine', () => {
  it('builds profession-aware platform-aware opportunity suggestions', () => {
    const readout = buildOpportunityEngineReadout(workspaceWithOpportunityInputs());

    expect(readout.totalCount).toBeGreaterThanOrEqual(6);
    expect(readout.headline).toContain('profession-aware');
    expect(readout.suggestions.map((item) => item.kind)).toEqual(
      expect.arrayContaining([
        'outreach',
        'content',
        'scheduling',
        'operational-bottleneck',
        'partnership',
        'workflow-optimization'
      ])
    );
    expect(
      readout.suggestions.every((item) => item.confidence >= 0 && item.confidence <= 100)
    ).toBe(true);
    expect(readout.suggestions.every((item) => item.sourceContext.length > 0)).toBe(true);
    expect(readout.suggestions.every((item) => item.expectedImpact.length > 0)).toBe(true);
    expect(readout.suggestions.some((item) => item.platformContext.includes('LinkedIn'))).toBe(
      true
    );
  });

  it('exposes Opportunity Engine on the workspace snapshot', () => {
    const snapshot = buildWorkspaceSnapshot(workspaceWithOpportunityInputs());

    expect(snapshot.opportunityEngine.totalCount).toBeGreaterThan(0);
    expect(snapshot.opportunityEngine.averageConfidence).toBeGreaterThan(0);
    expect(snapshot.opportunityEngine.suggestions[0]?.previewCommand).toMatch(/^ask:/);
  });
});
