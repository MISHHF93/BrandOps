import { describe, expect, it } from 'vitest';
import type { OperatorTraceEntry } from '../../src/types/domain';
import { cloneSeedData } from '../helpers/fixtures';
import {
  countPendingOperatorReviews,
  approveOperatorTraceEntry,
  rejectOperatorTraceEntry
} from '../../src/services/plan/reviewQueue';
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

  it('approves a pending trace by id', () => {
    const data = cloneSeedData();
    data.operatorTraces = {
      entries: [
        {
          id: 't1',
          at: '2026-01-01',
          source: 'assistant',
          verb: 'ask',
          reviewStatus: 'pending'
        }
      ]
    };
    const next = approveOperatorTraceEntry(data, 't1');
    expect(next).not.toBeNull();
    expect(next?.operatorTraces?.entries[0]?.reviewStatus).toBe('approved');
    const noop = approveOperatorTraceEntry(next!, 't1');
    expect(noop).toBe(next);
  });

  it('rejects a pending trace by id without deleting the audit row', () => {
    const data = cloneSeedData();
    data.operatorTraces = {
      entries: [
        {
          id: 't1',
          at: '2026-01-01',
          source: 'assistant',
          verb: 'ask',
          reviewStatus: 'pending'
        }
      ]
    };
    const next = rejectOperatorTraceEntry(data, 't1', 'No external send approved.');
    expect(next).not.toBeNull();
    expect(next?.operatorTraces?.entries).toHaveLength(1);
    expect(next?.operatorTraces?.entries[0]?.reviewStatus).toBe('rejected');
    expect(next?.operatorTraces?.entries[0]?.annotatorNote).toBe('No external send approved.');
    expect(countPendingOperatorReviews(next?.operatorTraces?.entries)).toBe(0);
  });

  it('returns null when trace id missing', () => {
    const data = cloneSeedData();
    data.operatorTraces = { entries: [] };
    expect(approveOperatorTraceEntry(data, 'x')).toBeNull();
  });

  it('maps packaged intelligence rules to governance policy rows', () => {
    const rows = governancePoliciesFromPackagedRules();
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.every((r) => r.policy_id && r.schema_version > 0)).toBe(true);
  });
});
