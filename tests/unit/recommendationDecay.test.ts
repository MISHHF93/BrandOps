/**
 * Recommendation ranking, and the recency it was missing.
 *
 * `sortItems` ranked by urgency → confidence → **alphabetical title**. A signal
 * observed six months ago outranked one from this morning whenever confidence
 * tied, and the tiebreak was the first letter of the title. For the surface that
 * answers "what should I do today?", that is the wrong answer delivered
 * confidently — and the release scorecard had been calling the recommendation
 * contract incomplete on exactly this point for a long time.
 */
import { describe, expect, it } from 'vitest';
import {
  buildPredictiveOperationsDashboardReadout,
  sortPredictiveItemsForTest
} from '../../src/services/plan/predictiveOperationsDashboard';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { PredictiveOperationsItem } from '../../src/services/plan/predictiveOperationsDashboard';

const NOW = new Date('2026-08-31T00:00:00.000Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

function item(overrides: Partial<PredictiveOperationsItem>): PredictiveOperationsItem {
  return {
    id: 'i',
    kind: 'opportunity',
    title: 'Item',
    detail: 'detail',
    urgency: 'medium',
    confidence: 0.6,
    sourceLabel: 'test',
    signals: [],
    command: 'ask: …',
    ...overrides
  } as PredictiveOperationsItem;
}

describe('recommendation ranking', () => {
  it('ranks a fresh signal above a stale one of equal confidence', () => {
    const ranked = sortPredictiveItemsForTest(
      [
        item({ id: 'stale', title: 'Aaa stale', observedAt: daysAgo(240) }),
        item({ id: 'fresh', title: 'Zzz fresh', observedAt: daysAgo(1) })
      ],
      NOW
    );
    // Alphabetically 'Aaa stale' wins, which is exactly what used to happen.
    expect(ranked[0].id).toBe('fresh');
  });

  it('does not let freshness override urgency', () => {
    const ranked = sortPredictiveItemsForTest(
      [
        item({ id: 'fresh-medium', urgency: 'medium', observedAt: daysAgo(0) }),
        item({ id: 'stale-critical', urgency: 'critical', observedAt: daysAgo(300) })
      ],
      NOW
    );
    // Urgency is a statement about consequence, not about age. A critical item
    // does not fall behind a fresher medium one.
    expect(ranked[0].id).toBe('stale-critical');
  });

  it('treats an undated item as middling, never as fresh', () => {
    const ranked = sortPredictiveItemsForTest(
      [
        item({ id: 'undated', title: 'Aaa', confidence: 0.6 }),
        item({ id: 'fresh', title: 'Bbb', confidence: 0.6, observedAt: daysAgo(0) })
      ],
      NOW
    );
    expect(ranked[0].id).toBe('fresh');

    const versusStale = sortPredictiveItemsForTest(
      [
        item({ id: 'undated', title: 'Bbb', confidence: 0.6 }),
        item({ id: 'ancient', title: 'Aaa', confidence: 0.6, observedAt: daysAgo(500) })
      ],
      NOW
    );
    expect(versusStale[0].id).toBe('undated');
  });

  it('still prefers higher confidence when recency is equal', () => {
    const ranked = sortPredictiveItemsForTest(
      [
        item({ id: 'low', title: 'Aaa', confidence: 0.3, observedAt: daysAgo(5) }),
        item({ id: 'high', title: 'Zzz', confidence: 0.9, observedAt: daysAgo(5) })
      ],
      NOW
    );
    expect(ranked[0].id).toBe('high');
  });

  it('remains deterministic when everything else ties', () => {
    const ranked = sortPredictiveItemsForTest(
      [item({ id: 'b', title: 'Bbb' }), item({ id: 'a', title: 'Aaa' })],
      NOW
    );
    expect(ranked.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('the live readout still produces ranked, deduplicated actions', () => {
    const readout = buildPredictiveOperationsDashboardReadout(populatedWorkspace());
    const ids = readout.nextBestActions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(readout.nextBestActions.every((a) => typeof a.confidence === 'number')).toBe(true);
    // Every recommendation says why it is here — the "why" half of the contract.
    expect(readout.nextBestActions.every((a) => Boolean(a.sourceLabel && a.detail))).toBe(true);
  });
});
