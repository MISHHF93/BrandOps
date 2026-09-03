/**
 * What a paywall shows, derived from a RevenueCat offering.
 *
 * Pure, and separate from the SDK call for the same reason `entitlements.ts`
 * is: the mapping has branches, and branches that decide what a person is
 * charged should be testable without a store.
 *
 * The directive this follows is "communicate value before price". So the model
 * carries the value proposition as first-class content rather than leaving the
 * component to improvise copy around a list of SKUs, and a package with no
 * readable price is dropped rather than rendered as a blank button — an empty
 * price is the one thing a paywall must never show.
 */

/** One purchasable option, in the words a person reads. */
export interface PaywallPackage {
  /** RevenueCat package identifier, passed back to `purchasePackage`. */
  id: string;
  /** "Monthly", "Annual" — what the user is choosing between. */
  title: string;
  /** Localised price string from the store. Never assembled by us. */
  price: string;
  /** The underlying store product, for receipts and support. */
  productId: string;
  /** Set when this option is the better value, so the UI can say why. */
  highlight: string | null;
  /** The raw package, handed back to the SDK untouched. */
  raw: unknown;
}

export interface PaywallModel {
  packages: PaywallPackage[];
  /** Present when there is nothing to sell, and says why in a user's words. */
  emptyReason: string | null;
}

const PERIOD_TITLES: Record<string, string> = {
  $rc_weekly: 'Weekly',
  $rc_monthly: 'Monthly',
  $rc_two_month: 'Every two months',
  $rc_three_month: 'Quarterly',
  $rc_six_month: 'Every six months',
  $rc_annual: 'Annual',
  $rc_lifetime: 'Lifetime'
};

/** A readable name for a package, falling back to its own identifier. */
function titleFor(identifier: string): string {
  return PERIOD_TITLES[identifier] ?? identifier.replace(/^\$rc_/, '').replace(/_/g, ' ');
}

/**
 * Map an offering onto the model.
 *
 * Defensive about shape on purpose. This data crosses a native bridge from a
 * remote dashboard someone else configures, so "the field is missing" is an
 * ordinary Tuesday rather than an exceptional case — and the failure mode to
 * avoid is a purchase button with no price on it.
 */
export function paywallModelFromOffering(offering: unknown): PaywallModel {
  const availablePackages = (offering as { availablePackages?: unknown })?.availablePackages;
  if (!Array.isArray(availablePackages) || availablePackages.length === 0) {
    return {
      packages: [],
      emptyReason: 'No subscription options are available right now. Try again shortly.'
    };
  }

  const packages: PaywallPackage[] = [];
  for (const entry of availablePackages) {
    const pkg = entry as {
      identifier?: unknown;
      product?: { priceString?: unknown; identifier?: unknown };
    };
    const id = typeof pkg.identifier === 'string' ? pkg.identifier : '';
    const price = typeof pkg.product?.priceString === 'string' ? pkg.product.priceString : '';
    const productId = typeof pkg.product?.identifier === 'string' ? pkg.product.identifier : '';

    // A package we cannot price is a button that would charge an unknown
    // amount. Dropped rather than shown.
    if (!id || !price) continue;

    packages.push({
      id,
      title: titleFor(id),
      price,
      productId,
      highlight: null,
      raw: entry
    });
  }

  if (packages.length === 0) {
    return {
      packages: [],
      emptyReason: 'Subscription pricing could not be loaded. Nothing was charged.'
    };
  }

  /**
   * Mark the annual option as the better value when both exist. Stated rather
   * than implied by ordering, because "which of these is the good one" is the
   * question every subscriber is actually asking.
   */
  const annual = packages.find((p) => p.id === '$rc_annual');
  if (annual && packages.some((p) => p.id === '$rc_monthly')) {
    annual.highlight = 'Best value';
  }

  return { packages, emptyReason: null };
}

/** The value proposition, shown above price. */
export const PRO_VALUE_POINTS: readonly string[] = [
  'Unlimited verified achievements in your Digital Twin',
  'Connect external AI agents over MCP, with full approval control',
  'Delegate scoped work between agents with budgets and audit',
  'Full change history and receipts for everything BrandOps does'
];
