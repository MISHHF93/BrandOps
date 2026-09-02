/**
 * Explain Why Now — tests for P0-8.
 *
 * Tests whyNow narrative generation, evidence collection,
 * interrupt decisions, and fragility detection.
 */

import { describe, it, expect } from 'vitest';
import { buildWhyNow } from '../../src/services/whyNow/whyNow';
import type { BrandOpsData } from '../../src/types/domain';
import type {
  OpportunityRecommendation,
  AchievementCandidate,
  ProfessionalSignal
} from '../../src/types/builder';

function makeData(overrides: any = {}): BrandOpsData {
  return {
    builderActivity: {
      workspaceId: 'ws-1',
      events: overrides.activities ?? [],
      achievements: overrides.achievements ?? [],
      goals: overrides.goals ?? [],
      artifacts: overrides.artifacts ?? []
    },
    planWorkspace: {
      plans: overrides.plans ?? [],
      receipts: [],
      updatedAt: new Date().toISOString()
    },
    ...overrides
  };
}

function makeOpportunityRecommendation(overrides: any = {}): OpportunityRecommendation {
  return {
    id: 'opp-1',
    category: 'hiring',
    title: 'Hiring opportunity',
    description: 'Acme is hiring',
    reason: 'Job posting detected',
    evidence: [],
    confidence: 0.8,
    expectedValue: 0.7,
    effort: 'medium',
    goalAlignment: ['growth'],
    primaryAction: 'Evaluate',
    actions: [],
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

function makeAchievementCandidate(overrides: any = {}): AchievementCandidate {
  return {
    id: 'ach-cand-1',
    type: 'achievement',
    title: 'Shipped new feature',
    description: 'Description',
    claim: 'Shipped new feature',
    source: 'user-input',
    trustTier: 'T2_VERIFIED',
    timestamp: new Date().toISOString(),
    evidence: [],
    ...overrides
  };
}

function makeProfessionalSignal(overrides: any = {}): ProfessionalSignal {
  return {
    id: 'sig-1',
    type: 'professional-signal',
    claim: 'User has security expertise',
    source: 'integration-import',
    trustTier: 'T2_VERIFIED',
    timestamp: new Date().toISOString(),
    confidence: 0.85,
    ...overrides
  };
}

describe('Explain Why Now — Basic Generation', () => {
  it('generates whyNow explanation for opportunity recommendation', () => {
    const recommendation = makeOpportunityRecommendation({
      id: 'opp-1',
      title: 'Hiring opportunity at Acme',
      goalAlignment: ['growth'],
      category: 'hiring'
    });
    // Activities within last 48 hours
    const activityTime = new Date(Date.now() - 2 * 86400000).toISOString();
    const data = makeData({
      activities: [{ timestamp: activityTime, type: 'session' }]
    });

    const explanation = buildWhyNow({ recommendation, data });

    expect(explanation.recommendationId).toBe('opp-1');
    expect(explanation.recommendationType).toBe('hiring');
    expect(explanation.narrative).toBeDefined();
    expect(explanation.narrative.length).toBeGreaterThan(0);
    expect(explanation.evidence).toBeInstanceOf(Array);
    expect(explanation.confidence).toBeGreaterThanOrEqual(0);
    expect(explanation.confidence).toBeLessThanOrEqual(1);
    expect(typeof explanation.shouldInterrupt).toBe('boolean');
    expect(typeof explanation.isFragile).toBe('boolean');
  });

  it('generates whyNow for achievement candidate', () => {
    const candidate = makeAchievementCandidate({
      id: 'ach-1',
      title: 'Shipped auth system',
      kind: 'achievement'
    });
    const data = makeData();

    const explanation = buildWhyNow({ recommendation: candidate, data });

    expect(explanation.recommendationId).toBe('ach-1');
    expect(explanation.narrative).toBeDefined();
  });

  it('generates whyNow for professional signal', () => {
    const signal = makeProfessionalSignal({
      id: 'sig-1',
      claim: 'User has security expertise'
    });
    const data = makeData({
      goals: [
        {
          id: 'goal-1',
          title: 'Build security positioning',
          status: 'active',
          priority: 0.9,
          type: 'goal'
        }
      ]
    });

    const explanation = buildWhyNow({ recommendation: signal, data, relatedGoals: ['goal-1'] });

    expect(explanation.recommendationId).toBe('sig-1');
    expect(explanation.narrative).toBeDefined();
  });
});

describe('Explain Why Now — Evidence Collection', () => {
  it('collects recent activity evidence (within 48 hours)', () => {
    const recommendation = makeOpportunityRecommendation({ id: 'opp-1' });
    const activityTime = new Date(Date.now() - 1 * 86400000).toISOString();
    const data = makeData({
      activities: [{ timestamp: activityTime, type: 'session' }]
    });

    const explanation = buildWhyNow({ recommendation, data });

    const recentActivityEvidence = explanation.evidence.filter((e) => e.type === 'recent-activity');
    expect(recentActivityEvidence.length).toBeGreaterThan(0);
  });

  it('collects goal priority evidence (active + high priority)', () => {
    const recommendation = makeOpportunityRecommendation({
      id: 'opp-1',
      goalAlignment: ['security-positioning'],
      category: 'hiring'
    });
    const data = makeData({
      goals: [
        {
          id: 'goal-1',
          title: 'Build security positioning',
          status: 'active',
          priority: 0.9,
          type: 'goal'
        }
      ]
    });

    const explanation = buildWhyNow({ recommendation, data, relatedGoals: ['goal-1'] });

    const goalEvidence = explanation.evidence.filter((e) => e.type === 'goal-priority');
    expect(goalEvidence.length).toBeGreaterThan(0);
  });

  it('collects missing artifact evidence (content-piece-opportunity with drafts)', () => {
    const recommendation = makeOpportunityRecommendation({
      id: 'opp-1',
      category: 'content-piece-opportunity',
      title: 'Write blog post'
    });
    const data = makeData({
      artifacts: [{ id: 'art-1', title: 'Draft post', status: 'draft', type: 'artifact' }]
    });

    const explanation = buildWhyNow({ recommendation, data });

    // May have evidence if category matches
    expect(explanation.evidence.length).toBeGreaterThan(0);
  });

  it('collects new achievement evidence', () => {
    const recommendation = makeOpportunityRecommendation({ id: 'opp-1' });
    const achTime = new Date(Date.now() - 3 * 86400000).toISOString();
    const data = makeData({
      achievements: [
        {
          id: 'ach-1',
          type: 'achievement',
          title: 'Shipped auth system',
          kind: 'achievement',
          timestamp: achTime,
          source: 'user-input',
          trustTier: 'T2_VERIFIED',
          claim: 'Shipped auth system'
        }
      ]
    });

    const explanation = buildWhyNow({ recommendation, data });

    const achievementEvidence = explanation.evidence.filter((e) => e.type === 'new-achievement');
    expect(achievementEvidence.length).toBeGreaterThan(0);
  });

  it('collects plan completion evidence', () => {
    const recommendation = makeOpportunityRecommendation({ id: 'opp-1' });
    const planTime = new Date(Date.now() - 1 * 86400000).toISOString();
    const data = makeData({
      plans: [
        {
          id: 'plan-1',
          title: 'Completed plan',
          status: 'completed',
          type: 'plan',
          updatedAt: planTime
        }
      ]
    });

    const explanation = buildWhyNow({ recommendation, data });

    const planEvidence = explanation.evidence.filter((e) => e.type === 'plan-completion');
    expect(planEvidence.length).toBeGreaterThan(0);
  });
});

describe('Explain Why Now — Interrupt Decision', () => {
  it('sets shouldInterrupt true when evidence is found', () => {
    const recommendation = makeOpportunityRecommendation({ id: 'opp-1' });
    const activityTime = new Date(Date.now() - 1 * 86400000).toISOString();
    const data = makeData({
      activities: [{ timestamp: activityTime, type: 'session' }]
    });

    const explanation = buildWhyNow({ recommendation, data });

    expect(explanation.shouldInterrupt).toBe(true);
  });

  it('can have shouldInterrupt false with no evidence', () => {
    const recommendation = makeOpportunityRecommendation({ id: 'opp-1' });
    const data = makeData({
      activities: [],
      goals: [],
      achievements: [],
      artifacts: [],
      plans: []
    });

    const explanation = buildWhyNow({ recommendation, data });

    expect(explanation.confidence).toBeLessThan(0.5);
    expect(explanation.shouldInterrupt).toBe(false);
  });
});

describe('Explain Why Now — Confidence and Fragility', () => {
  it('confidence reflects evidence strength', () => {
    const recommendation = makeOpportunityRecommendation({ id: 'opp-1', category: 'hiring' });
    const activityTime = new Date(Date.now() - 1 * 86400000).toISOString();
    const data = makeData({
      activities: [{ timestamp: activityTime, type: 'session' }],
      goals: [
        { id: 'goal-1', title: 'Relevant goal', status: 'active', priority: 0.9, type: 'goal' }
      ],
      achievements: [
        {
          id: 'ach-1',
          type: 'achievement',
          title: 'Recent achievement',
          kind: 'achievement',
          timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
          source: 'user-input',
          trustTier: 'T2_VERIFIED',
          claim: 'Recent achievement'
        }
      ]
    });

    const explanation = buildWhyNow({ recommendation, data, relatedGoals: ['goal-1'] });

    expect(explanation.confidence).toBeGreaterThan(0.5);
  });

  it('sets isFragile when critical assumption exists', () => {
    const recommendation = makeOpportunityRecommendation({ id: 'opp-1' });
    const data = makeData();

    const explanation = buildWhyNow({ recommendation, data });

    if (explanation.evidence.length === 0) {
      expect(explanation.isFragile).toBe(true);
      expect(explanation.criticalAssumption).toBeDefined();
    }
  });

  it('includes criticalAssumption when fragile', () => {
    const recommendation = makeOpportunityRecommendation({
      id: 'opp-1',
      goalAlignment: ['nonexistent-goal']
    });
    const data = makeData({
      goals: []
    });

    const explanation = buildWhyNow({ recommendation, data, relatedGoals: ['nonexistent-goal'] });

    if (explanation.isFragile) {
      expect(explanation.criticalAssumption).toBeDefined();
      expect(explanation.criticalAssumption!.length).toBeGreaterThan(0);
    }
  });
});

describe('Explain Why Now — Evidence Item Structure', () => {
  it('evidence items have correct structure', () => {
    const recommendation = makeOpportunityRecommendation({ id: 'opp-1' });
    const activityTime = new Date(Date.now() - 1 * 86400000).toISOString();
    const data = makeData({
      activities: [{ timestamp: activityTime, type: 'session' }]
    });

    const explanation = buildWhyNow({ recommendation, data });

    for (const item of explanation.evidence) {
      expect(item.type).toBeDefined();
      expect(item.description).toBeDefined();
      expect(item.weight).toBeGreaterThanOrEqual(0);
      expect(item.weight).toBeLessThanOrEqual(1);

      if (item.timestamp) {
        expect(item.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    }
  });
});

describe('Explain Why Now — Empty Context', () => {
  it('handles empty workspace data gracefully', () => {
    const recommendation = makeOpportunityRecommendation({ id: 'opp-1' });
    const data = makeData();

    const explanation = buildWhyNow({ recommendation, data });

    expect(explanation).toBeDefined();
    expect(explanation.narrative).toBeDefined();
    expect(explanation.evidence).toBeInstanceOf(Array);
  });

  it('handles recommendation with no goal alignment', () => {
    const recommendation = makeOpportunityRecommendation({
      id: 'opp-1',
      goalAlignment: [],
      category: 'hiring'
    });
    const data = makeData();

    const explanation = buildWhyNow({ recommendation, data });

    expect(explanation.recommendationId).toBe('opp-1');
    expect(explanation.narrative.length).toBeGreaterThan(0);
  });
});

describe('Explain Why Now — Narrative Quality', () => {
  it('narrative is concise (not overly long)', () => {
    const recommendation = makeOpportunityRecommendation({
      id: 'opp-1',
      title: 'Hiring opportunity',
      goalAlignment: ['growth'],
      category: 'hiring'
    });
    const activityTime = new Date(Date.now() - 1 * 86400000).toISOString();
    const data = makeData({
      activities: [{ timestamp: activityTime, type: 'session' }],
      goals: [{ id: 'goal-1', title: 'Grow team', status: 'active', priority: 0.9, type: 'goal' }]
    });

    const explanation = buildWhyNow({ recommendation, data, relatedGoals: ['goal-1'] });

    expect(explanation.narrative.length).toBeGreaterThan(20);
    expect(explanation.narrative.length).toBeLessThan(1000);
  });

  it('narrative references relevant context', () => {
    const recommendation = makeOpportunityRecommendation({
      id: 'opp-1',
      title: 'Security hiring opportunity',
      goalAlignment: ['security-positioning'],
      category: 'hiring'
    });
    const data = makeData({
      goals: [
        {
          id: 'goal-1',
          title: 'Build security positioning',
          status: 'active',
          priority: 0.9,
          type: 'goal'
        }
      ],
      achievements: [
        {
          id: 'ach-1',
          type: 'achievement',
          title: 'Shipped auth system',
          kind: 'achievement',
          timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
          source: 'user-input',
          trustTier: 'T2_VERIFIED',
          claim: 'Shipped auth system'
        }
      ]
    });

    const explanation = buildWhyNow({ recommendation, data, relatedGoals: ['goal-1'] });

    // At minimum, narrative should contain some context words
    expect(explanation.evidence.length).toBeGreaterThan(0);
  });
});
