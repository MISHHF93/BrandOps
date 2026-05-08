import { describe, expect, it } from 'vitest';
import type { OperatorTraceEntry } from '../../src/types/domain';
import { countPendingOperatorReviews } from '../../src/services/plan/reviewQueue';
import { governancePoliciesFromPackagedRules } from '../../src/services/plan/governancePoliciesReadout';

describe('review queue + governance readout', () => {
  it('counts pending reviews only', () => {
    const rows: OperatorTraceEntry[] = [
      {
        id: 'a',
        at: '2026-01-01',
        source: 'assistant',
        verb: 'ask',
        reviewStatus: 'pending'
      },
      {
        id: 'b',
        at: '2026-01-01',
        source: 'user',
        verb: 'nav',
        reviewStatus: 'approved'
      },
      { id: 'c', at: '2026-01-01', source: 'automation', verb: 'job' }
    ];
    expect(countPendingOperatorReviews(rows)).toBe(1);
  });

  it('maps packaged intelligence rules to governance policy rows', () => {
    const rows = governancePoliciesFromPackagedRules();
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.every((r) => r.policy_id && r.schema_version > 0)).toBe(true);
  });
});
