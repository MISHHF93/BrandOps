import { describe, expect, it } from 'vitest';

import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { createDigitalTwinFromText, hydrateWorkspaceFromDigitalTwin } from '../../src/services/digitalTwin/digitalTwin';
import { buildPredictiveOpportunityLayerReadout } from '../../src/services/plan/predictiveOpportunityLayer';
import { cloneSeedData } from '../helpers/fixtures';

const resumeText = `
Maya Rivera
Senior AI Product Operator
Summary
AI product operator who builds workflow systems, GTM loops, and creator operations for founders.
Skills
TypeScript, React, NLP, GTM, creator operations, lifecycle marketing
`;

function workspaceWithPredictiveSignals() {
  const base = cloneSeedData();
  const { twin, resumeArtifact } = createDigitalTwinFromText({
    workspace: base,
    rawText: resumeText,
    sourceType: 'resume',
    reviewOverrides: {
      displayName: 'Maya Rivera',
      headline: 'Senior AI Product Operator'
    },
    now: new Date('2026-05-28T00:00:00.000Z')
  });
  const hydrated = hydrateWorkspaceFromDigitalTwin({
    workspace: base,
    twin,
    resumeArtifact,
    now: new Date('2026-05-28T00:00:00.000Z')
  }).workspace;

  return {
    ...hydrated,
    settings: {
      ...hydrated.settings,
      connectedIdentityLearningEnabled: true
    },
    integrationHub: {
      ...hydrated.integrationHub,
      sources: [
        ...hydrated.integrationHub.sources,
        {
          id: 'source-linkedin',
          name: 'LinkedIn profile',
          kind: 'linkedin-marketing' as const,
          status: 'connected' as const,
          artifactTypes: ['profile-summary'],
          tags: ['linkedin', 'positioning'],
          notes: 'Approved profile summary only.',
          createdAt: '2026-05-28T00:00:00.000Z'
        },
        {
          id: 'source-notion',
          name: 'Notion knowledge base',
          kind: 'notion' as const,
          status: 'connected' as const,
          artifactTypes: ['approved-doc-summary'],
          tags: ['notion', 'content', 'knowledge'],
          notes: 'Approved summaries only.',
          createdAt: '2026-05-28T00:00:00.000Z'
        }
      ],
      artifacts: [
        ...hydrated.integrationHub.artifacts,
        {
          id: 'artifact-linkedin-positioning',
          sourceId: 'source-linkedin',
          title: 'LinkedIn positioning approved summary',
          artifactType: 'profile-summary',
          summary: 'Positions Maya as an AI product operator for creator workflow systems.',
          tags: ['linkedin', 'positioning'],
          createdAt: '2026-05-28T00:00:00.000Z',
          updatedAt: '2026-05-28T00:00:00.000Z'
        },
        {
          id: 'artifact-notion-growth',
          sourceId: 'source-notion',
          title: 'Notion growth themes',
          artifactType: 'approved-doc-summary',
          summary: 'Approved notes mention founder workflow bottlenecks and lifecycle growth loops.',
          tags: ['notion', 'growth', 'content'],
          createdAt: '2026-05-28T00:00:00.000Z',
          updatedAt: '2026-05-28T00:00:00.000Z'
        }
      ],
      liveFeed: [
        {
          id: 'feed-1',
          source: 'LinkedIn',
          title: 'Profile context updated',
          detail: 'Approved positioning summary is available.',
          level: 'info' as const,
          happenedAt: '2026-05-28T09:00:00.000Z'
        }
      ]
    },
    operatorTraces: {
      entries: [
        {
          id: 'trace-1',
          at: '2026-05-28T09:10:00.000Z',
          source: 'user' as const,
          verb: 'draft_follow_up',
          surface: 'plan',
          outcome: 'success' as const,
          reviewStatus: 'pending' as const
        },
        {
          id: 'trace-2',
          at: '2026-05-28T09:15:00.000Z',
          source: 'assistant' as const,
          verb: 'draft_follow_up',
          surface: 'ask',
          outcome: 'success' as const,
          reviewStatus: 'approved' as const
        }
      ]
    },
    aiAssistantTraces: {
      entries: [
        {
          id: 'ask-1',
          at: '2026-05-28T09:12:00.000Z',
          trace_schema_version: '1.0.0',
          surface: 'assistant_chat' as const,
          outcome: 'success' as const,
          user_turn_preview: 'What buyer persona should I focus on this week?',
          assistant_preview: 'Use founder workflow operators and creator ops buyers.',
          citations: [],
          model_id: 'hosted-routing'
        }
      ]
    },
    aiTraceGraph: {
      schema_version: '1.0.0',
      bundles: [
        {
          trace_id: 'trace-bundle-1',
          schema_version: '1.0.0',
          created_at: '2026-05-28T09:20:00.000Z',
          surface: 'assistant_chat' as const,
          artifacts: [],
          links: [],
          invocations: [],
          retrieval_chunks: []
        }
      ]
    }
  };
}

describe('Predictive Opportunity Layer', () => {
  it('creates all proactive suggestion categories with explanations, confidence, signals, and impact', () => {
    const readout = buildPredictiveOpportunityLayerReadout(workspaceWithPredictiveSignals());

    expect(readout.suggestions.map((suggestion) => suggestion.kind)).toEqual(
      expect.arrayContaining([
        'buyer-persona-generation',
        'positioning-analysis',
        'outreach-opportunity',
        'content-ideation',
        'workflow-optimization',
        'operational-improvement',
        'follow-up-suggestion',
        'growth-opportunity',
        'scheduling-improvement'
      ])
    );
    expect(readout.totalCount).toBe(9);
    expect(readout.headline).toContain('predictive');
    expect(readout.approvalPolicy).toContain('user must approve');
    expect(readout.suggestions.every((suggestion) => suggestion.whyThisAppeared.length > 0)).toBe(
      true
    );
    expect(readout.suggestions.every((suggestion) => suggestion.supportingSignals.length > 0)).toBe(
      true
    );
    expect(readout.suggestions.every((suggestion) => suggestion.expectedImpact.length > 0)).toBe(
      true
    );
    expect(readout.suggestions.every((suggestion) => suggestion.approvalRequired)).toBe(true);
    expect(readout.suggestions.every((suggestion) => suggestion.previewCommand.startsWith('ask:'))).toBe(
      true
    );
    expect(
      readout.suggestions.every((suggestion) =>
        suggestion.previewCommand.includes('Do not execute externally')
      )
    ).toBe(true);
  });

  it('exposes the Predictive Opportunity Layer on the mobile workspace snapshot', () => {
    const snapshot = buildWorkspaceSnapshot(workspaceWithPredictiveSignals());

    expect(snapshot.predictiveOpportunityLayer.totalCount).toBe(9);
    expect(snapshot.predictiveOpportunityLayer.averageConfidence).toBeGreaterThan(0);
    expect(snapshot.predictiveOpportunityLayer.sourceCoverage.profession).toBeGreaterThan(0);
  });
});

