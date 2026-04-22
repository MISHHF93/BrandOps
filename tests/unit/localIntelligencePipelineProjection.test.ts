import { describe, expect, it } from 'vitest';
import { localIntelligence } from '../../src/services/intelligence/localIntelligence';
import type { Opportunity } from '../../src/types/domain';

const baseOpp = (overrides: Partial<Opportunity>): Opportunity => ({
  id: 'o1',
  name: 'Deal',
  company: 'Co',
  role: 'r',
  source: 's',
  relationshipStage: 'building',
  opportunityType: 'consulting',
  status: 'discovery',
  nextAction: 'n',
  followUpDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
  notes: '',
  links: [],
  relatedOutreachDraftIds: [],
  relatedContentTags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  valueUsd: 10000,
  confidence: 50,
  ...overrides
});

describe('localIntelligence pipelineProjection', () => {
  it('weights open value by confidence and excludes terminal stages', () => {
    const opps = [
      baseOpp({ id: 'a', valueUsd: 100_000, confidence: 80, status: 'proposal' }),
      baseOpp({ id: 'b', valueUsd: 50_000, confidence: 50, status: 'negotiation' }),
      baseOpp({ id: 'w', valueUsd: 999_000, confidence: 100, status: 'won' }),
      baseOpp({ id: 'l', valueUsd: 1, confidence: 1, status: 'lost' })
    ];
    const p = localIntelligence.pipelineProjection(opps);
    expect(p.activeDealCount).toBe(2);
    expect(p.rawOpenValueUsd).toBe(150_000);
    expect(p.weightedOpenValueUsd).toBe(Math.round(100_000 * 0.8 + 50_000 * 0.5));
  });

  it('returns zeros when pipeline is empty', () => {
    const p = localIntelligence.pipelineProjection([]);
    expect(p).toEqual({ weightedOpenValueUsd: 0, rawOpenValueUsd: 0, activeDealCount: 0 });
  });
});

describe('localIntelligence opportunitiesToClose', () => {
  it('lists only proposal and negotiation, ranked by health', () => {
    const opps = [
      baseOpp({ id: 'd', name: 'Early', status: 'discovery', valueUsd: 1e6, confidence: 99 }),
      baseOpp({
        id: 'p1',
        name: 'Close A',
        status: 'proposal',
        valueUsd: 20_000,
        confidence: 60,
        followUpDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      }),
      baseOpp({
        id: 'n1',
        name: 'Close B',
        status: 'negotiation',
        valueUsd: 80_000,
        confidence: 70,
        followUpDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      })
    ];
    const ranked = localIntelligence.opportunitiesToClose(opps, 10);
    expect(ranked).toHaveLength(2);
    expect(new Set(ranked.map((s) => s.id))).toEqual(new Set(['p1', 'n1']));
    expect(ranked[0]!.score).toBeGreaterThanOrEqual(ranked[1]!.score);
  });

  it('excludes archived', () => {
    const opps = [
      baseOpp({
        id: 'x',
        status: 'proposal',
        archivedAt: new Date().toISOString()
      })
    ];
    expect(localIntelligence.opportunitiesToClose(opps)).toEqual([]);
  });
});
