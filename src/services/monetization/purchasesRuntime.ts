/**
 * The RevenueCat bridge: the only code that talks to the SDK.
 *
 * `entitlements.ts` decides what an answer *means* and is pure, so it can be
 * tested against every shape RevenueCat returns. This file is the part that
 * cannot be — it configures the SDK, calls it, and converts every failure mode
 * into one of the states that module already knows how to refuse.
 *
 * The split is the point. Every branch that could accidentally grant premium
 * lives in a tested pure function; what remains here is a call and a `catch`,
 * and the `catch` returns `unavailable`, which `isPremium` reads as no.
 *
 * The SDK is imported lazily. It is a native Capacitor plugin, so pulling it
 * into the web bundle would cost every web visitor a plugin they can never use,
 * and on a platform with no purchase bridge the import can fail outright — a
 * failure that must read as "no purchases here", not as a crash on startup.
 *
 * Nothing in this file simulates a purchase or grants an entitlement.
 */
import { getBrandOpsHostKind } from '../../shared/platform/hostEnvironment';
import {
  PREMIUM_ENTITLEMENT_ID,
  configuredApiKey,
  entitlementFromCustomerInfo,
  type EntitlementState
} from './entitlements';

/** `ios` / `android` where a purchase can happen, `web` where it cannot. */
export function purchasePlatform(): 'ios' | 'android' | 'web' {
  const host = getBrandOpsHostKind();
  if (host === 'capacitor-ios') return 'ios';
  if (host === 'capacitor-android') return 'android';
  // A Chrome extension has no store either, and is deliberately grouped with web.
  return 'web';
}

let configured = false;

/**
 * Configure RevenueCat once, or explain why it cannot be.
 *
 * Returns the reason rather than throwing, because "no purchases available" is
 * an ordinary state for a web build and not an error condition.
 */
async function ensureConfigured(
  env: Record<string, string | undefined> = import.meta.env as unknown as Record<
    string,
    string | undefined
  >
): Promise<{ ok: true } | { ok: false; state: EntitlementState }> {
  const platform = purchasePlatform();
  if (platform === 'web') {
    return {
      ok: false,
      state: {
        status: 'unavailable',
        reason: 'no-native-purchases',
        detail: 'This build has no native purchase bridge.'
      }
    };
  }

  const apiKey = configuredApiKey(env, platform);
  if (!apiKey) {
    return {
      ok: false,
      state: {
        status: 'unavailable',
        reason: 'not-configured',
        detail: `No RevenueCat key for ${platform} in this build.`
      }
    };
  }

  if (configured) return { ok: true };

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.configure({ apiKey });
    configured = true;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      state: {
        status: 'unavailable',
        reason: 'lookup-failed',
        detail: error instanceof Error ? error.message : 'RevenueCat could not be configured.'
      }
    };
  }
}

/**
 * Ask RevenueCat what this user is entitled to.
 *
 * Every failure — unconfigured, offline, SDK error, malformed answer — resolves
 * to a state `isPremium` reads as false. There is no path through this function
 * that returns an entitlement without RevenueCat having said so.
 */
export async function refreshEntitlement(
  entitlementId: string = PREMIUM_ENTITLEMENT_ID
): Promise<EntitlementState> {
  const ready = await ensureConfigured();
  if (!ready.ok) return ready.state;

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    return entitlementFromCustomerInfo(customerInfo, entitlementId);
  } catch (error) {
    return {
      status: 'unavailable',
      reason: 'lookup-failed',
      detail: error instanceof Error ? error.message : 'Could not read your subscription.'
    };
  }
}

/** The offerings a paywall can present, or null where none can be shown. */
export async function loadOfferings(): Promise<unknown | null> {
  const ready = await ensureConfigured();
  if (!ready.ok) return null;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { current } = await Purchases.getOfferings();
    return current ?? null;
  } catch {
    return null;
  }
}

export type PurchaseOutcome =
  | { ok: true; state: EntitlementState }
  | { ok: false; cancelled: boolean; message: string };

/**
 * Buy a package, then re-read the entitlement rather than assuming the purchase
 * granted it.
 *
 * The re-read matters: a purchase can succeed at the store and still not confer
 * the entitlement — wrong product, pending payment, a deferred family-approval
 * flow. Treating "the call returned" as "they are Pro now" is the single most
 * common way a purchase path grants access it should not.
 *
 * A user cancelling is not a failure to apologise for, so it is reported
 * separately from an error.
 */
export async function purchasePackage(pkg: unknown): Promise<PurchaseOutcome> {
  const ready = await ensureConfigured();
  if (!ready.ok) {
    return { ok: false, cancelled: false, message: 'Purchasing is not available in this build.' };
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.purchasePackage({ aPackage: pkg as never });
    return { ok: true, state: await refreshEntitlement() };
  } catch (error) {
    const cancelled = Boolean(
      error && typeof error === 'object' && 'userCancelled' in error && error.userCancelled
    );
    return {
      ok: false,
      cancelled,
      message: cancelled
        ? 'Purchase cancelled.'
        : error instanceof Error
          ? error.message
          : 'The purchase could not be completed.'
    };
  }
}

/**
 * Restore a previous purchase.
 *
 * Required by both stores, and the path a paying customer hits after
 * reinstalling. It re-reads the entitlement for the same reason `purchasePackage`
 * does: restoring is a request, and what came back is the answer.
 */
export async function restorePurchases(): Promise<EntitlementState> {
  const ready = await ensureConfigured();
  if (!ready.ok) return ready.state;

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.restorePurchases();
    return entitlementFromCustomerInfo(customerInfo);
  } catch (error) {
    return {
      status: 'unavailable',
      reason: 'lookup-failed',
      detail: error instanceof Error ? error.message : 'Nothing could be restored right now.'
    };
  }
}

/** Test seam: forget that `configure` ran. */
export function resetPurchasesRuntimeForTests(): void {
  configured = false;
}
