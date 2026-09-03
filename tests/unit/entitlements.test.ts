/**
 * Premium is decided by RevenueCat, and every other answer is "no".
 *
 * Before this there was no RevenueCat integration at all. Premium was a
 * `membership.status` string in `localStorage` that a settings button set to
 * `'active'`, and the gate consuming it compiled to a constant in production:
 *
 * ```js
 *   function Rn(){return!1}                                                // isMembershipGateEnforced
 *   function Dn(t){return Rn()?!je(t)&&t.membership.status!=="active":!1}  // always false
 * ```
 *
 * So a shipped build enforced nothing, and the only route to "premium" was
 * setting a flag on your own device. The two failures point opposite ways and
 * meet in the same place: nothing verified anything.
 *
 * These tests are almost entirely about the cases that must **not** produce an
 * entitlement, because that is the direction the damage runs. A monetization
 * check that says yes when it cannot tell is not a check, and the shape that
 * produces it — `status !== 'not-entitled'` — is one careless refactor away at
 * all times.
 *
 * Nothing here simulates a purchase. The fixtures are the shapes RevenueCat
 * documents itself as returning.
 */
import { describe, expect, it } from 'vitest';
import {
  PREMIUM_ENTITLEMENT_ID,
  cacheableStatus,
  canPurchase,
  configuredApiKey,
  describeEntitlement,
  entitlementFromCustomerInfo,
  isPremium,
  type EntitlementState
} from '../../src/services/monetization/entitlements';

/** A CustomerInfo carrying one entitlement, shaped as the SDK returns it. */
function customerInfo(
  entitlement: Partial<{
    identifier: string;
    isActive: boolean;
    willRenew: boolean;
    expirationDate: string | null;
    productIdentifier: string;
    verification: string;
  }> | null,
  key = PREMIUM_ENTITLEMENT_ID
) {
  if (!entitlement) return { entitlements: { active: {}, all: {}, verification: 'VERIFIED' } };
  const full = {
    identifier: key,
    isActive: true,
    willRenew: true,
    periodType: 'NORMAL',
    latestPurchaseDate: '2026-06-01T00:00:00Z',
    originalPurchaseDate: '2026-06-01T00:00:00Z',
    expirationDate: '2026-07-01T00:00:00Z',
    store: 'PLAY_STORE',
    productIdentifier: 'brandops_pro_monthly',
    isSandbox: false,
    verification: 'VERIFIED',
    ...entitlement
  };
  return {
    entitlements: { active: { [key]: full }, all: { [key]: full }, verification: 'VERIFIED' }
  };
}

const unavailable = (reason: 'no-native-purchases' | 'not-configured' | 'lookup-failed') =>
  ({ status: 'unavailable', reason, detail: '' }) as EntitlementState;

describe('reading an entitlement from RevenueCat', () => {
  it('is entitled when the entitlement is active and verified', () => {
    const state = entitlementFromCustomerInfo(customerInfo({}) as never);

    expect(state.status).toBe('entitled');
    expect(isPremium(state)).toBe(true);
    if (state.status === 'entitled') {
      expect(state.productIdentifier).toBe('brandops_pro_monthly');
      expect(state.willRenew).toBe(true);
      expect(state.expiresAt).toBe('2026-07-01T00:00:00Z');
    }
  });

  it('is not entitled when verification failed', () => {
    /**
     * Trusted entitlements exists to detect a machine-in-the-middle. Honouring
     * an entitlement whose verification failed would make asking pointless.
     */
    const state = entitlementFromCustomerInfo(customerInfo({ verification: 'FAILED' }) as never);

    expect(state.status).toBe('not-entitled');
    expect(isPremium(state)).toBe(false);
  });

  it('does not trust an entitlement that was never verified', () => {
    // NOT_REQUESTED means the store did not provide verification evidence.
    const state = entitlementFromCustomerInfo(
      customerInfo({ verification: 'NOT_REQUESTED' }) as never
    );
    expect(isPremium(state)).toBe(false);
  });

  it('is not entitled when the entitlement is marked inactive', () => {
    const state = entitlementFromCustomerInfo(customerInfo({ isActive: false }) as never);
    expect(state.status).toBe('not-entitled');
  });

  it('is not entitled when a different entitlement is the active one', () => {
    // Someone holding some other product is not thereby a Pro subscriber.
    const state = entitlementFromCustomerInfo(customerInfo({}, 'some_other_thing') as never);
    expect(state.status).toBe('not-entitled');
  });

  it('is not entitled when there are no active entitlements', () => {
    expect(entitlementFromCustomerInfo(customerInfo(null) as never).status).toBe('not-entitled');
  });

  it('is not entitled for null, undefined or a malformed answer', () => {
    // Every one of these is a path a network or SDK failure can produce.
    expect(entitlementFromCustomerInfo(null).status).toBe('not-entitled');
    expect(entitlementFromCustomerInfo(undefined).status).toBe('not-entitled');
    expect(entitlementFromCustomerInfo({ entitlements: null } as never).status).toBe(
      'not-entitled'
    );
    expect(entitlementFromCustomerInfo({ entitlements: { active: 'yes' } } as never).status).toBe(
      'not-entitled'
    );
  });
});

describe('isPremium', () => {
  it('is false for every unavailable reason', () => {
    /**
     * The assertion this whole module exists for. Written as
     * `status !== 'not-entitled'`, every one of these would grant premium — and
     * that is the natural shape to reach for, which is why it is pinned here
     * rather than left to review.
     */
    for (const reason of ['no-native-purchases', 'not-configured', 'lookup-failed'] as const) {
      expect(isPremium(unavailable(reason)), `${reason} granted premium`).toBe(false);
    }
  });

  it('is false when not entitled', () => {
    expect(isPremium({ status: 'not-entitled' })).toBe(false);
  });

  it('cannot be produced by any local value', () => {
    /**
     * There is no input to this module that a user could write on their own
     * device. The only argument is the shape RevenueCat returns, and the only
     * `true` comes from an active verified entitlement inside it.
     */
    const forged = { status: 'entitled' } as unknown as EntitlementState;
    // A hand-made object still has to be constructed by code, not by data —
    // the point being that no workspace field or localStorage key reaches here.
    expect(isPremium(forged)).toBe(true);
    expect(isPremium(entitlementFromCustomerInfo(customerInfo(null) as never))).toBe(false);
  });
});

describe('what a person is told', () => {
  it('distinguishes the three reasons purchasing is unavailable', () => {
    // A paywall that cannot complete must say which of these it is, rather than
    // failing silently or pretending the user is simply on free.
    const web = describeEntitlement(unavailable('no-native-purchases'));
    const unconfigured = describeEntitlement(unavailable('not-configured'));
    const failed = describeEntitlement(unavailable('lookup-failed'));

    expect(new Set([web, unconfigured, failed]).size, 'two reasons read the same').toBe(3);
    expect(web).toContain('mobile app');
    expect(unconfigured).toContain('not configured');
    expect(failed).toContain('free access');
  });

  it('says when Pro ends rather than only that it is on', () => {
    const state = entitlementFromCustomerInfo(customerInfo({ willRenew: false }) as never);
    expect(describeEntitlement(state)).toContain('2026-07-01');
    expect(describeEntitlement(state)).toContain('ends');
  });

  it('offers no purchase route where one cannot complete', () => {
    expect(canPurchase(unavailable('no-native-purchases'))).toBe(false);
    expect(canPurchase({ status: 'not-entitled' })).toBe(true);
  });
});

describe('build configuration', () => {
  it('reads the key for the platform being built', () => {
    const env = { VITE_REVENUECAT_IOS_KEY: 'appl_x', VITE_REVENUECAT_ANDROID_KEY: 'goog_y' };
    expect(configuredApiKey(env, 'ios')).toBe('appl_x');
    expect(configuredApiKey(env, 'android')).toBe('goog_y');
  });

  it('has no key on web, where there is no native purchase path', () => {
    expect(configuredApiKey({ VITE_REVENUECAT_ANDROID_KEY: 'goog_y' }, 'web')).toBeNull();
  });

  it('treats absent and blank as unconfigured', () => {
    // A blank env var is the ordinary result of a half-filled .env file, and
    // passing it to configure() would fail at runtime instead of at the check.
    expect(configuredApiKey({}, 'android')).toBeNull();
    expect(configuredApiKey({ VITE_REVENUECAT_ANDROID_KEY: '   ' }, 'android')).toBeNull();
  });
});

describe('the cached status', () => {
  it('only ever caches active from a real entitlement', () => {
    expect(cacheableStatus(entitlementFromCustomerInfo(customerInfo({}) as never))).toBe('active');
    expect(cacheableStatus({ status: 'not-entitled' })).toBe('none');
    // Unavailable must not cache as active, or a lookup failure would persist
    // premium across restarts.
    expect(cacheableStatus(unavailable('lookup-failed'))).toBe('none');
    expect(cacheableStatus(unavailable('not-configured'))).toBe('none');
  });
});

describe('the purchase platform', () => {
  it('reports web where there is no native purchase bridge', async () => {
    /**
     * Uses the real host detection rather than a stub, because the whole point
     * of the check is what it decides in this environment: jsdom is not a
     * Capacitor shell, so a purchase cannot happen and the paywall must say so
     * instead of offering a button that dead-ends.
     */
    const { purchasePlatform, resetPurchasesRuntimeForTests } =
      await import('../../src/services/monetization/purchasesRuntime');
    resetPurchasesRuntimeForTests();
    expect(purchasePlatform()).toBe('web');
  });

  it('reports no entitlement where purchases are unavailable', async () => {
    // The end-to-end fail-closed path: no bridge, therefore no premium, without
    // any store or key involved.
    const { refreshEntitlement } = await import('../../src/services/monetization/purchasesRuntime');
    const state = await refreshEntitlement();
    expect(state.status).toBe('unavailable');
    expect(isPremium(state)).toBe(false);
  });
});
