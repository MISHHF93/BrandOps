/**
 * Whether this user is entitled to premium, decided by RevenueCat and nothing
 * else.
 *
 * **What was here before:** nothing. There was no RevenueCat integration at all,
 * and premium was a `membership.status` string in `localStorage` that a button
 * in the settings surface set to `'active'`. Meanwhile the gate that consumed it
 * compiled to a constant in production —
 *
 * ```js
 *   function Rn(){return!1}                                                // isMembershipGateEnforced
 *   function Dn(t){return Rn()?!je(t)&&t.membership.status!=="active":!1}  // always false
 * ```
 *
 * — so a shipped build enforced no entitlement anywhere, and the only way to
 * become "premium" was to set a flag on your own device. Both halves are wrong
 * in opposite directions, and this module exists to be the one place that
 * answers the question.
 *
 * ## Rules
 *
 * **Fail closed.** Every path that is not an active, verified entitlement
 * returns *not entitled*. Not configured, no native purchases, a lookup that
 * threw, a malformed response — all of them mean no premium. A monetization
 * check that defaults to "yes" when it cannot tell is not a check.
 *
 * **Local state is never authority.** Nothing in the workspace, and no value a
 * user can write on their own device, can produce an entitlement. The old
 * `membership.status` remains as a *cache of the last verified answer* for
 * display, and is never read to make the decision.
 *
 * **`FAILED` verification is not entitled.** RevenueCat's trusted entitlements
 * returns a verification result, and a `FAILED` one indicates a possible
 * machine-in-the-middle. Treating a failed verification as entitled would make
 * the verification pointless.
 *
 * **Unavailable is stated, not disguised.** On the web build there is no native
 * purchase path, and with no API key there is no RevenueCat. Both are reported
 * as `unavailable` with a reason, so the interface can say which — rather than
 * showing a paywall that cannot complete, or silently behaving as free.
 *
 * Nothing here grants, simulates or fabricates a purchase.
 */
import type { CustomerInfo, PurchasesEntitlementInfo } from '@revenuecat/purchases-capacitor';

/** The entitlement identifier configured in the RevenueCat dashboard. */
export const PREMIUM_ENTITLEMENT_ID = 'pro';

export type EntitlementUnavailableReason =
  /** Web build, or any platform without the native purchase bridge. */
  | 'no-native-purchases'
  /** No RevenueCat API key is configured for this build. */
  | 'not-configured'
  /** RevenueCat was reachable but the lookup failed. */
  | 'lookup-failed';

export type EntitlementState =
  | {
      status: 'entitled';
      entitlementId: string;
      productIdentifier: string;
      willRenew: boolean;
      expiresAt: string | null;
      verification: string;
    }
  | { status: 'not-entitled' }
  | { status: 'unavailable'; reason: EntitlementUnavailableReason; detail: string };

/**
 * The single question the rest of the product asks.
 *
 * Deliberately not `state.status !== 'not-entitled'`. Written that way,
 * `unavailable` would grant premium — which is exactly the failure this module
 * exists to prevent, and exactly the shape a refactor would produce by accident.
 */
export function isPremium(state: EntitlementState): boolean {
  return state.status === 'entitled';
}

/**
 * Whether a purchase could even be attempted here.
 *
 * A paywall that cannot complete is worse than no paywall: it takes a user's
 * intent and drops it.
 */
export function canPurchase(state: EntitlementState): boolean {
  return state.status !== 'unavailable';
}

/** What to tell a person, in their words rather than the SDK's. */
export function describeEntitlement(state: EntitlementState): string {
  if (state.status === 'entitled') {
    return state.expiresAt
      ? `Pro is active${state.willRenew ? ' and renews' : ' and ends'} on ${state.expiresAt.slice(0, 10)}.`
      : 'Pro is active.';
  }
  if (state.status === 'not-entitled') return 'You are on the free plan.';
  if (state.reason === 'no-native-purchases') {
    return 'Purchases are available in the BrandOps mobile app. This build cannot complete one.';
  }
  if (state.reason === 'not-configured') {
    return 'Purchasing is not configured in this build, so Pro cannot be bought or verified here.';
  }
  return 'Could not check your subscription just now. You have free access until this succeeds.';
}

/**
 * Map a verified RevenueCat answer onto our own state.
 *
 * Split out from the SDK call so it can be tested against the shapes RevenueCat
 * actually returns, including the ones that must *not* produce an entitlement.
 */
export function entitlementFromCustomerInfo(
  info: Pick<CustomerInfo, 'entitlements'> | null | undefined,
  entitlementId: string = PREMIUM_ENTITLEMENT_ID
): EntitlementState {
  const active = info?.entitlements?.active;
  if (!active || typeof active !== 'object') return { status: 'not-entitled' };

  const entitlement = (active as Record<string, PurchasesEntitlementInfo | undefined>)[
    entitlementId
  ];
  if (!entitlement) return { status: 'not-entitled' };

  /**
   * `active` is supposed to contain only active entitlements, so this is
   * belt-and-braces — but the whole module is the belt, and a map keyed by
   * identifier is exactly the kind of thing that gets populated defensively
   * upstream one day.
   */
  if (entitlement.isActive !== true) return { status: 'not-entitled' };

  // A failed verification means the answer cannot be trusted, so it is not one.
  if (entitlement.verification === 'FAILED') return { status: 'not-entitled' };

  return {
    status: 'entitled',
    entitlementId,
    productIdentifier: entitlement.productIdentifier,
    willRenew: entitlement.willRenew,
    expiresAt: entitlement.expirationDate ?? null,
    verification: String(entitlement.verification ?? 'NOT_REQUESTED')
  };
}

/** The RevenueCat public key for this platform, or null when the build has none. */
export function configuredApiKey(
  env: Record<string, string | undefined>,
  platform: 'ios' | 'android' | 'web'
): string | null {
  const key =
    platform === 'ios'
      ? env.VITE_REVENUECAT_IOS_KEY
      : platform === 'android'
        ? env.VITE_REVENUECAT_ANDROID_KEY
        : undefined;
  const trimmed = key?.trim();
  return trimmed ? trimmed : null;
}

/**
 * The last verified answer, cached for display only.
 *
 * Written solely from a RevenueCat result so that a stale cache can never
 * become an entitlement: `isPremium` is computed from live state, and this
 * exists so the settings screen can say something on a cold start rather than
 * flashing "free" at a paying customer.
 */
export function cacheableStatus(state: EntitlementState): 'active' | 'none' {
  return state.status === 'entitled' ? 'active' : 'none';
}
