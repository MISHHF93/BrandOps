import { describe, expect, it } from 'vitest';

import { buildPredictiveAskPromptGroups } from '../../src/pages/mobile/predictiveAskPrompts';
import type { BehavioralIntelligenceEngineReadout } from '../../src/services/intelligence/behavioralIntelligenceEngine';
import type { PredictiveContentIdeationReadout } from '../../src/services/plan/predictiveContentIdeationEngine';
import type { PredictiveOpportunityLayerReadout } from '../../src/services/plan/predictiveOpportunityLayer';

const predictiveLayer: PredictiveOpportunityLayerReadout = {
  suggestions: [
    {
      id: 'predictive-outreach-opportunity',
      kind: 'outreach-opportunity',
      title: 'Find the next high-fit outreach opportunity',
      suggestion: 'Use investor outreach context to propose next touches.',
      whyThisAppeared:
        'Recent action and behavioral signals show investor outreach and follow-up work.',
      confidence: 86,
      supportingSignals: [
        'Investor outreach draft: follow-up sequence',
        'Recent ASK: investor pipeline next steps'
      ],
      expectedImpact: 'Faster movement on warm investor relationships.',
      generatedFrom: ['recent-actions', 'behavioral-history', 'memory-patterns'],
      approvalRequired: true,
      previewCommand: 'ask: review investor outreach'
    },
    {
      id: 'predictive-workflow-optimization',
      kind: 'workflow-optimization',
      title: 'Optimize repeated sales workflow',
      suggestion: 'Turn repeated sales outreach into a reusable workflow.',
      whyThisAppeared: 'Repeated sales outreach patterns appeared in local behavior.',
      confidence: 78,
      supportingSignals: ['Repeated sales outreach trace', 'CRM lead follow-up task'],
      expectedImpact: 'Less duplicated planning for outbound work.',
      generatedFrom: ['recent-actions', 'behavioral-history'],
      approvalRequired: true,
      previewCommand: 'ask: review sales workflow'
    }
  ],
  totalCount: 2,
  averageConfidence: 82,
  sourceCoverage: {
    profession: 0,
    'twin-profile': 0,
    'connected-platforms': 0,
    'recent-actions': 2,
    'behavioral-history': 2,
    'memory-patterns': 1
  },
  approvalPolicy: 'The user must approve before any execution.',
  headline: '2 predictive opportunities generated.'
};

const behavioralEngine: BehavioralIntelligenceEngineReadout = {
  patterns: [
    {
      id: 'behavior-investor-outreach',
      kind: 'outreach',
      label: 'Repeated action: investor outreach',
      confidence: 84,
      evidence: ['user on ask success', 'assistant on plan success'],
      sources: ['user-actions', 'outreach-patterns']
    }
  ],
  predictions: [],
  signalCoverage: {
    'user-actions': 2,
    'ask-behavior': 1,
    'plan-behavior': 1,
    'connected-platforms': 0,
    workflows: 0,
    'repeated-tasks': 1,
    'operational-timing': 0,
    'content-patterns': 0,
    'outreach-patterns': 2,
    'scheduling-behavior': 0
  },
  averageConfidence: 0,
  approvalPolicy: 'Prediction only.',
  headline: 'Behavior detected.'
};

const contentIdeation: PredictiveContentIdeationReadout = {
  themes: [],
  postIdeas: [
    {
      id: 'content-post-idea',
      kind: 'post-idea',
      title: 'Proof-led founder workflow post',
      idea: 'Draft a post from recent founder workflow signals.',
      whyNow: 'Recent content outputs and audience patterns suggest this post is timely.',
      confidence: 82,
      evidenceUsed: ['Founder workflow bottlenecks', 'Audience engagement signal'],
      expectedImpact: 'Sharper content planning.',
      suggestedFormat: 'LinkedIn post',
      generatedFrom: ['recent-outputs', 'audience-patterns'],
      askToPlanCommand: 'ask: Convert this predictive content idea into a PLAN-ready content workflow.'
    }
  ],
  campaignIdeas: [],
  threadStructures: [],
  creatorSeries: [],
  audienceHooks: [],
  trendOpportunities: [],
  allIdeas: [],
  sourceCoverage: {
    profession: 0,
    behavior: 0,
    'connected-platforms': 0,
    'recent-outputs': 1,
    'audience-patterns': 1,
    'engagement-data': 0
  },
  averageConfidence: 82,
  approvalPolicy: 'Review and approve before publishing.',
  headline: '1 content idea generated.'
};
contentIdeation.allIdeas = contentIdeation.postIdeas;

describe('predictive ASK prompts', () => {
  it('turns predictive opportunities into timely behavior-aware ASK prompts', () => {
    const groups = buildPredictiveAskPromptGroups({
      predictiveOpportunityLayer: predictiveLayer,
      behavioralIntelligenceEngine: behavioralEngine,
      recentCommandLines: ['ask: investor outreach next steps']
    });
    const prompts = groups.flatMap((group) => group.prompts);

    expect(prompts[0]?.prompt).toContain('You recently worked on investor outreach');
    expect(prompts[0]?.prompt).toContain('follow-up sequence');
    expect(prompts[0]?.confidence).toBe(86);
    expect(prompts[0]?.command).toContain('Do not execute externally');
    expect(prompts[0]?.sourceSuggestion?.id).toBe('predictive-outreach-opportunity');
    expect(prompts.some((prompt) => prompt.prompt.includes('reusable workflow'))).toBe(true);
  });

  it('falls back to a context-aware prompt instead of static starter groups', () => {
    const groups = buildPredictiveAskPromptGroups({
      platformAwareAsk: {
        connectedApps: ['LinkedIn'],
        unavailableApps: [],
        recentActivity: [],
        workflowState: [],
        operationalContext: [],
        contextBlock: ''
      }
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('Context-aware ASK');
    expect(groups[0]?.prompts[0]?.prompt).toContain('LinkedIn');
  });

  it('adds Predictive Content Ideation prompts with direct ASK to PLAN conversion sources', () => {
    const groups = buildPredictiveAskPromptGroups({
      predictiveContentIdeationEngine: contentIdeation
    });
    const prompts = groups.flatMap((group) => group.prompts);

    expect(groups[0]?.label).toBe('Predictive content');
    expect(prompts[0]?.prompt).toContain('PLAN-ready content workflow');
    expect(prompts[0]?.command).toContain('predictive content idea');
    expect(prompts[0]?.sourceContentIdeation?.id).toBe('content-post-idea');
  });
});

