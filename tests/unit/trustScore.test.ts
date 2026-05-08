import { describe, expect, it } from 'vitest';
import { deriveTrustScore } from '../../src/services/ai/trustScore';

describe('deriveTrustScore', () => {
  it('scores higher for low hallucination risk and full evidence', () => {
    const high = deriveTrustScore(
      { hallucination_risk: 'low', evidence_completeness: 'full' },
      { orphanMarkerCount: 0 }
    );
    expect(high.band).toBe('high');
    expect(high.score_0_100).toBeGreaterThanOrEqual(74);
  });

  it('penalizes orphans and missing evidence', () => {
    const low = deriveTrustScore(
      {
        hallucination_risk: 'high',
        evidence_completeness: 'none',
        missing_evidence_notes: ['gap']
      },
      { orphanMarkerCount: 2 }
    );
    expect(low.band).toBe('low');
    expect(low.score_0_100).toBeLessThanOrEqual(40);
    expect(low.rationale_lines.some((l) => l.includes('unresolved'))).toBe(true);
  });
});
