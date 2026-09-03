/**
 * Product analytics: the events that make the funnel computable.
 *
 * Built on `operatorTraces` rather than beside it. That substrate already has
 * the three things this needs and would otherwise have to reinvent: a consent
 * flag it fails closed on, a cap so an append-only log cannot grow without
 * bound, and a sanitiser that clamps detail values. Adding a second event store
 * would have duplicated all three and given the product two disagreeing
 * histories.
 *
 * ## What this deliberately is not
 *
 * **Nothing is transmitted.** There is no provider SDK here and no network
 * call. `operatorTraces` is documented as "stored in workspace only; no
 * automatic network upload", and that contract is kept. Choosing an analytics
 * vendor means deciding to send a person's professional activity to a third
 * party, which is the operator's decision to make, not a default to slip in.
 * `EVENT_SINK` exists so that decision is a wiring change rather than a rewrite.
 *
 * **No metric is manufactured.** Every number the funnel reports is counted
 * from events that were actually recorded. Where there is nothing to count it
 * says so, rather than returning a zero that reads like a measurement.
 *
 * **Demo activity is separated.** Clicking through seeded sample data is not
 * product usage, and letting it into the same counters would inflate exactly
 * the numbers a competition judge is asked to trust.
 */
import type { BrandOpsData } from '../../types/domain';
import { prependOperatorTrace } from '../dataset/operatorTraces';

/**
 * The closed set of product events.
 *
 * Closed on purpose. An open string would let a typo create a phantom event
 * that never appears in a funnel and never errors, which is the failure mode
 * that makes analytics quietly wrong rather than loudly broken.
 */
export const PRODUCT_EVENTS = [
  'app_open',
  'onboarding_started',
  'onboarding_completed',
  'signup_completed',
  'core_action_started',
  'core_action_completed',
  'core_action_failed',
  'result_viewed',
  'result_saved',
  'share_started',
  'share_completed',
  'paywall_viewed',
  'purchase_started',
  'purchase_completed',
  'purchase_failed',
  'trial_started',
  'restore_started',
  'restore_completed',
  'premium_feature_used',
  'install_offered',
  'install_accepted'
] as const;

export type ProductEvent = (typeof PRODUCT_EVENTS)[number];

/** Label marking a trace as a product event, so the funnel can find them. */
export const PRODUCT_EVENT_LABEL = 'product-event';

/** Label marking activity produced against seeded demo data. */
export const DEMO_EVENT_LABEL = 'demo-activity';

export interface RecordProductEventOptions {
  /** Where it happened — `chat`, `workspace`, `settings`. */
  surface?: string;
  /** Whether the thing being measured succeeded. */
  outcome?: 'success' | 'failure';
  /**
   * Extra dimensions. Clamped by the trace sanitiser, and never a place for a
   * name, an email, or the content of a person's work.
   */
  props?: Record<string, string | number | boolean | null>;
  /** True when this happened against seeded sample data. */
  isDemo?: boolean;
}

/**
 * Record one product event.
 *
 * Returns the workspace unchanged when trace collection is off, because
 * `prependOperatorTrace` refuses first — consent is enforced in one place
 * rather than re-checked here where it could drift.
 */
export function recordProductEvent(
  workspace: BrandOpsData,
  event: ProductEvent,
  options: RecordProductEventOptions = {}
): BrandOpsData {
  const labels = [PRODUCT_EVENT_LABEL];
  if (options.isDemo) labels.push(DEMO_EVENT_LABEL);

  return prependOperatorTrace(workspace, {
    source: 'user',
    verb: event,
    surface: options.surface,
    outcome: options.outcome,
    details: options.props,
    labels
  });
}

/** Every recorded product event, newest first. Demo activity excluded by default. */
export function productEvents(
  workspace: BrandOpsData,
  options: { includeDemo?: boolean } = {}
): { event: ProductEvent; at: string; surface?: string; outcome?: string }[] {
  const known = new Set<string>(PRODUCT_EVENTS);
  return (
    (workspace.operatorTraces?.entries ?? [])
      .filter((entry) => entry.labels?.includes(PRODUCT_EVENT_LABEL))
      .filter((entry) => options.includeDemo || !entry.labels?.includes(DEMO_EVENT_LABEL))
      // A trace labelled as a product event whose verb is not one is a bug
      // elsewhere; counting it would put a phantom row in the funnel.
      .filter((entry) => known.has(entry.verb))
      .map((entry) => ({
        event: entry.verb as ProductEvent,
        at: entry.at,
        surface: entry.surface,
        outcome: entry.outcome
      }))
  );
}

/** How many times each event was recorded. */
export function eventCounts(
  workspace: BrandOpsData,
  options: { includeDemo?: boolean } = {}
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { event } of productEvents(workspace, options)) {
    counts[event] = (counts[event] ?? 0) + 1;
  }
  return counts;
}

/**
 * A ratio, or `null` when the denominator is zero.
 *
 * `null` rather than `0`. A conversion rate of zero means nobody bought; no
 * denominator means nobody was asked, and reporting the second as the first is
 * how a dashboard tells a confident lie.
 */
export function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export interface ProductFunnel {
  opened: number;
  activated: number;
  coreActionCompleted: number;
  paywallViewed: number;
  purchaseStarted: number;
  purchaseCompleted: number;
  /** Null where the step above it never happened. */
  activationRate: number | null;
  paywallConversionRate: number | null;
  purchaseCompletionRate: number | null;
  /** True when nothing has been recorded, so a reader is not shown zeros. */
  empty: boolean;
}

/**
 * The funnel, counted from events that were actually recorded.
 *
 * Demo activity is excluded unless asked for. Every rate is `null` where its
 * denominator is zero, so "we have not measured this" and "this measured zero"
 * stay distinguishable all the way to the screen.
 */
export function productFunnel(
  workspace: BrandOpsData,
  options: { includeDemo?: boolean } = {}
): ProductFunnel {
  const counts = eventCounts(workspace, options);
  const at = (event: ProductEvent) => counts[event] ?? 0;

  const opened = at('app_open');
  const activated = at('onboarding_completed');
  const coreActionCompleted = at('core_action_completed');
  const paywallViewed = at('paywall_viewed');
  const purchaseStarted = at('purchase_started');
  const purchaseCompleted = at('purchase_completed');

  return {
    opened,
    activated,
    coreActionCompleted,
    paywallViewed,
    purchaseStarted,
    purchaseCompleted,
    activationRate: rate(activated, opened),
    paywallConversionRate: rate(purchaseCompleted, paywallViewed),
    purchaseCompletionRate: rate(purchaseCompleted, purchaseStarted),
    empty: Object.keys(counts).length === 0
  };
}

/**
 * Where a recorded event would additionally be sent.
 *
 * Null, and shipped null. A provider is a decision about sending a person's
 * professional activity off their device; this exists so making that decision
 * is a wiring change, and so the absence is visible in the code rather than
 * implied by its absence.
 */
export const EVENT_SINK: ((event: ProductEvent, props: unknown) => void) | null = null;
