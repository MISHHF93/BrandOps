import { describe, expect, it } from 'vitest';

import { buildOperationalPlanFromPredictiveSuggestion } from '../../src/pages/mobile/predictivePlanConversion';
import type { PredictiveOpportunitySuggestion } from '../../src/services/plan/predictiveOpportunityLayer';

function suggestion(
  overrides: Partial<PredictiveOpportunitySuggestion> = {}
): PredictiveOpportunitySuggestion {
  return {
    id: 'predictive-investor-update',
    kind: 'outreach-opportunity',
    title: 'Investor follow-up opportunity',
    suggestion: 'Use investor outreach context to create a repeatable update and follow-up flow.',
    whyThisAppeared: 'Recent investor outreach and fundraising follow-up signals appeared.',
    confidence: 88,
    supportingSignals: ['Investor outreach draft', 'VC follow-up task', 'Fundraising update note'],
    expectedImpact: 'Keeps investor communication consistent and approval-gated.',
    generatedFrom: ['recent-actions', 'behavioral-history', 'memory-patterns'],
    approvalRequired: true,
    previewCommand: 'ask: review investor follow-up',
    ...overrides
  };
}

describe('predictive PLAN conversion', () => {
  it('converts investor outreach predictions into reusable operational plan cards', () => {
    const plan = buildOperationalPlanFromPredictiveSuggestion(suggestion());

    expect(plan.title).toContain('Investor Update Flow');
    expect(plan.kind).toBe('outreach');
    expect(plan.sourceLabel).toBe('Converted from predictive opportunity');
    expect(plan.promise).toContain('Converted from a predictive opportunity');
    expect(plan.previewCommand).toContain('Convert this predictive opportunity');
    expect(plan.previewCommand).toContain('Do not execute externally');
    expect(plan.previewCommand).toContain('Convert this into a reusable operational plan');
    expect(plan.timeline).toEqual(
      expect.arrayContaining(['Gather updates', 'Draft investor narrative', 'Approve send list'])
    );
  });

  it('maps content and hiring patterns to specific reusable workflow templates', () => {
    const creator = buildOperationalPlanFromPredictiveSuggestion(
      suggestion({
        id: 'predictive-creator-campaign',
        kind: 'content-ideation',
        title: 'Creator campaign opportunity',
        suggestion: 'Turn creator content patterns into a campaign.',
        whyThisAppeared: 'Creator audience and campaign signals appeared in content history.',
        supportingSignals: ['creator campaign', 'audience growth'],
        expectedImpact: 'Improves creator campaign consistency.'
      })
    );
    const hiring = buildOperationalPlanFromPredictiveSuggestion(
      suggestion({
        id: 'predictive-hiring',
        kind: 'workflow-optimization',
        title: 'Hiring workflow opportunity',
        suggestion: 'Repeated candidate outreach suggests a hiring workflow.',
        whyThisAppeared: 'Hiring, recruiting, and candidate follow-up patterns appeared.',
        supportingSignals: ['candidate interview', 'recruiting follow-up'],
        expectedImpact: 'Improves hiring follow-through.'
      })
    );

    expect(creator.title).toContain('Creator Campaign');
    expect(creator.kind).toBe('content-calendar');
    expect(hiring.title).toContain('Hiring Workflow');
    expect(hiring.kind).toBe('workflow');
  });
});

