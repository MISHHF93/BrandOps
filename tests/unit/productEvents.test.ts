/**
 * Product analytics that counts what happened and says so when nothing did.
 *
 * There were no analytics of any kind. The funnel a Shipaton judge is asked to
 * evaluate — installs, activation, paywall exposure, conversion — was not
 * merely unmeasured, it was uncomputable, because nothing recorded the events
 * it is computed from.
 *
 * The tests below are mostly about the two ways analytics goes quietly wrong:
 *
 * **Zero that means "not measured".** A conversion rate of 0 says nobody
 * bought. No denominator says nobody was *asked*. Collapsing the second into
 * the first is how a dashboard states a confident falsehood, so every rate here
 * is `null` when its denominator is zero and there is a test for each one.
 *
 * **Demo activity counted as usage.** Clicking through seeded sample data
 * inflates precisely the numbers someone is being asked to trust. It is
 * labelled at the point of recording and excluded by default.
 *
 * Built on `operatorTraces`, so consent is inherited rather than re-implemented:
 * `prependOperatorTrace` returns the workspace untouched when collection is off,
 * and the first test here drives that through the real path rather than assuming
 * it.
 */
import { describe, expect, it } from 'vitest';
import {
  DEMO_EVENT_LABEL,
  EVENT_SINK,
  PRODUCT_EVENTS,
  PRODUCT_EVENT_LABEL,
  eventCounts,
  productEvents,
  productFunnel,
  rate,
  recordProductEvent
} from '../../src/services/analytics/productEvents';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';

/** A workspace with trace collection on, which is what recording requires. */
function consenting(): BrandOpsData {
  const base = withDefaults(populatedWorkspace());
  return {
    ...base,
    settings: { ...base.settings, operatorTraceCollectionEnabled: true },
    operatorTraces: { entries: [] }
  } as BrandOpsData;
}

function refusing(): BrandOpsData {
  const base = consenting();
  return {
    ...base,
    settings: { ...base.settings, operatorTraceCollectionEnabled: false }
  } as BrandOpsData;
}

describe('recording an event', () => {
  it('stores it where the funnel can find it', () => {
    const after = recordProductEvent(consenting(), 'app_open', { surface: 'chat' });

    const events = productEvents(after);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('app_open');
    expect(events[0].surface).toBe('chat');
  });

  it('records nothing when the person has not consented', () => {
    /**
     * Driven through the real path rather than asserted about it. Consent lives
     * in `prependOperatorTrace`; re-checking it here would be a second copy free
     * to drift from the one that runs.
     */
    const after = recordProductEvent(refusing(), 'app_open');

    expect(after.operatorTraces?.entries ?? []).toHaveLength(0);
    expect(productEvents(after)).toEqual([]);
  });

  it('labels the trace so it is distinguishable from ordinary activity', () => {
    const after = recordProductEvent(consenting(), 'core_action_completed');
    expect(after.operatorTraces?.entries[0].labels).toContain(PRODUCT_EVENT_LABEL);
  });

  it('does not transmit anything', () => {
    /**
     * `operatorTraces` is documented as workspace-only with no automatic
     * upload. Choosing a vendor means deciding to send someone's professional
     * activity to a third party, which is not a default to slip in — so the sink
     * ships null and this pins it.
     */
    expect(EVENT_SINK).toBeNull();
  });
});

describe('demo activity', () => {
  it('is excluded from the numbers by default', () => {
    let workspace = consenting();
    workspace = recordProductEvent(workspace, 'app_open');
    workspace = recordProductEvent(workspace, 'app_open', { isDemo: true });

    // Two recorded, one real. Counting both is how seeded sample data inflates
    // exactly the figure a judge is asked to trust.
    expect(productEvents(workspace)).toHaveLength(1);
    expect(productEvents(workspace, { includeDemo: true })).toHaveLength(2);
  });

  it('is labelled at the point of recording, not inferred later', () => {
    const after = recordProductEvent(consenting(), 'app_open', { isDemo: true });
    expect(after.operatorTraces?.entries[0].labels).toContain(DEMO_EVENT_LABEL);
  });
});

describe('the funnel', () => {
  function withEvents(events: Array<Parameters<typeof recordProductEvent>[1]>): BrandOpsData {
    let workspace = consenting();
    for (const event of events) workspace = recordProductEvent(workspace, event);
    return workspace;
  }

  it('says it is empty rather than reporting zeros', () => {
    /**
     * The distinction the whole module turns on. An untouched product and a
     * product nobody converted in produce different numbers, and a reader must
     * be able to tell which they are looking at.
     */
    const funnel = productFunnel(consenting());

    expect(funnel.empty).toBe(true);
    expect(funnel.activationRate).toBeNull();
    expect(funnel.paywallConversionRate).toBeNull();
    expect(funnel.purchaseCompletionRate).toBeNull();
  });

  it('counts each step from events that were actually recorded', () => {
    const workspace = withEvents([
      'app_open',
      'app_open',
      'onboarding_completed',
      'core_action_completed',
      'paywall_viewed',
      'purchase_started',
      'purchase_completed'
    ]);
    const funnel = productFunnel(workspace);

    expect(funnel.empty).toBe(false);
    expect(funnel.opened).toBe(2);
    expect(funnel.activated).toBe(1);
    expect(funnel.coreActionCompleted).toBe(1);
    expect(funnel.paywallViewed).toBe(1);
    expect(funnel.purchaseCompleted).toBe(1);
    expect(funnel.activationRate).toBeCloseTo(0.5);
    expect(funnel.paywallConversionRate).toBeCloseTo(1);
  });

  it('reports a real zero when the step happened and nobody converted', () => {
    // The counter-case to "empty". The paywall was seen twice and nothing was
    // bought: that is a measurement, and it must not read as missing data.
    const workspace = withEvents(['app_open', 'paywall_viewed', 'paywall_viewed']);
    const funnel = productFunnel(workspace);

    expect(funnel.paywallConversionRate).toBe(0);
    expect(funnel.paywallConversionRate).not.toBeNull();
  });

  it('leaves a rate null when its own denominator is missing', () => {
    // Purchases can be completed with no `purchase_started` recorded — a restore
    // path, or an event that failed to fire. The rate is unknown, not 100%.
    const workspace = withEvents(['app_open', 'purchase_completed']);
    expect(productFunnel(workspace).purchaseCompletionRate).toBeNull();
  });

  it('excludes demo activity from every step', () => {
    let workspace = consenting();
    workspace = recordProductEvent(workspace, 'paywall_viewed', { isDemo: true });
    workspace = recordProductEvent(workspace, 'purchase_completed', { isDemo: true });

    const real = productFunnel(workspace);
    expect(real.empty).toBe(true);
    expect(real.paywallViewed).toBe(0);
    expect(productFunnel(workspace, { includeDemo: true }).paywallViewed).toBe(1);
  });
});

describe('rate', () => {
  it('is null on a zero denominator and a number otherwise', () => {
    expect(rate(0, 0)).toBeNull();
    expect(rate(5, 0)).toBeNull();
    expect(rate(0, 5)).toBe(0);
    expect(rate(1, 4)).toBe(0.25);
  });
});

describe('the event vocabulary', () => {
  it('covers the funnel the competition asks about', () => {
    // Named explicitly: these are the events without which installs,
    // activation, paywall exposure and conversion cannot be computed at all.
    for (const required of [
      'app_open',
      'onboarding_completed',
      'core_action_completed',
      'paywall_viewed',
      'purchase_started',
      'purchase_completed',
      'restore_completed',
      'premium_feature_used'
    ] as const) {
      expect(PRODUCT_EVENTS, `${required} is not in the vocabulary`).toContain(required);
    }
  });

  it('ignores a labelled trace whose verb is not a product event', () => {
    /**
     * A trace can carry the product label and any verb, because
     * `prependOperatorTrace` is general. Counting an unknown verb would put a
     * phantom row in the funnel that no code path can explain.
     */
    const workspace = consenting();
    const forged: BrandOpsData = {
      ...workspace,
      operatorTraces: {
        entries: [
          {
            id: 't1',
            at: '2026-06-01T00:00:00.000Z',
            source: 'user',
            verb: 'not_a_product_event',
            labels: [PRODUCT_EVENT_LABEL]
          }
        ]
      }
    } as BrandOpsData;

    expect(productEvents(forged)).toEqual([]);
    expect(eventCounts(forged)).toEqual({});
  });
});
