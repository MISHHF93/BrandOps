/**
 * The free/pro boundary, and the one place it deliberately fails open.
 *
 * `isPremium` became trustworthy and nothing consulted it, so the paywall sold
 * something that was never withheld. This is the boundary that makes it mean
 * something.
 *
 * The tests split along the line that matters:
 *
 * **Pro features fail closed.** Unavailable, unconfigured, offline, not
 * entitled — all of them mean no delegation and no second agent. Same direction
 * as every other monetization decision here.
 *
 * **The free tier fails open.** An unreachable RevenueCat must not lock someone
 * out of what they are entitled to use for nothing, so `unavailable` means free
 * rather than blocked. That inversion is the subtle part and it is what most of
 * these tests are about: the core loop keeps working on the web build, offline,
 * and in a build with no API key, while Pro stays shut in exactly that state.
 *
 * Getting this backwards in either direction is a product failure. Fail closed
 * on the free tier and a paying-nothing user is locked out of a working app;
 * fail open on Pro and the paywall is decoration.
 */
import { describe, expect, it } from 'vitest';
import {
  FREE_AGENT_SESSION_LIMIT,
  canConnectAgent,
  canDelegateBetweenAgents,
  canUseCoreWorkflow,
  describePlan
} from '../../src/services/monetization/featureGates';
import type { EntitlementState } from '../../src/services/monetization/entitlements';

const PRO: EntitlementState = {
  status: 'entitled',
  entitlementId: 'pro',
  productIdentifier: 'brandops_pro_monthly',
  willRenew: true,
  expiresAt: null,
  verification: 'VERIFIED'
};
const FREE: EntitlementState = { status: 'not-entitled' };
const UNAVAILABLE = (
  reason: 'no-native-purchases' | 'not-configured' | 'lookup-failed'
): EntitlementState => ({ status: 'unavailable', reason, detail: '' });

const EVERY_NON_PRO: EntitlementState[] = [
  FREE,
  UNAVAILABLE('no-native-purchases'),
  UNAVAILABLE('not-configured'),
  UNAVAILABLE('lookup-failed')
];

describe('the core workflow', () => {
  it('is free, always', () => {
    /**
     * The promise of the product: work becomes a verified professional
     * identity. Gating it would gate the reason to open the app, and would also
     * make it impossible for anyone to evaluate.
     */
    expect(canUseCoreWorkflow().allowed).toBe(true);
  });
});

describe('connecting an agent', () => {
  it('lets a free workspace connect its first', () => {
    // A personal brand system that cannot be driven by the agent you already
    // use is demonstrating a screenshot, not its value.
    for (const state of EVERY_NON_PRO) {
      expect(canConnectAgent(state, 0).allowed, `blocked the first agent: ${state.status}`).toBe(
        true
      );
    }
  });

  it('stops a free workspace at the limit', () => {
    const decision = canConnectAgent(FREE, FREE_AGENT_SESSION_LIMIT);

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.upgradeUnlocks).toBe(true);
      // The message has to say what to do, not merely that something is off.
      expect(decision.reason).toContain('Pro');
      expect(decision.reason).toContain('revoke');
    }
  });

  it('lets Pro connect well past the free limit', () => {
    expect(canConnectAgent(PRO, FREE_AGENT_SESSION_LIMIT).allowed).toBe(true);
    expect(canConnectAgent(PRO, 25).allowed).toBe(true);
  });

  it('keeps the limit closed when the entitlement cannot be read', () => {
    /**
     * The half that pays for the other half. Free failing open must not mean
     * *everything* opens: an unreadable entitlement is not a Pro entitlement,
     * so the second agent stays gated in exactly the state where the first one
     * is allowed.
     */
    for (const state of EVERY_NON_PRO) {
      expect(
        canConnectAgent(state, FREE_AGENT_SESSION_LIMIT).allowed,
        `${state.status} was treated as Pro`
      ).toBe(false);
    }
  });
});

describe('delegating between agents', () => {
  it('is allowed for Pro', () => {
    expect(canDelegateBetweenAgents(PRO).allowed).toBe(true);
  });

  it('is closed for every state that is not Pro', () => {
    // Including the three unavailable reasons, which is where a
    // `!== 'not-entitled'` style check would leak the feature.
    for (const state of EVERY_NON_PRO) {
      const decision = canDelegateBetweenAgents(state);
      expect(decision.allowed, `${state.status} could delegate`).toBe(false);
      if (!decision.allowed) expect(decision.upgradeUnlocks).toBe(true);
    }
  });

  it('says what it is rather than only that it is blocked', () => {
    const decision = canDelegateBetweenAgents(FREE);
    if (!decision.allowed) expect(decision.reason).toContain('Pro');
  });
});

describe('describing the plan', () => {
  it('distinguishes free from Pro', () => {
    expect(describePlan(PRO)).toContain('Pro');
    expect(describePlan(FREE)).toContain('Free');
    expect(describePlan(PRO)).not.toBe(describePlan(FREE));
  });

  it('reads as free when the entitlement is unreadable', () => {
    // Consistent with the gate: unavailable behaves as free, so telling someone
    // otherwise would contradict what they can actually do.
    for (const state of EVERY_NON_PRO) {
      expect(describePlan(state)).toContain('Free');
    }
  });
});
