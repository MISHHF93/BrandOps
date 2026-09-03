/**
 * What free gets, and what Pro adds.
 *
 * `isPremium` became trustworthy last cycle and nothing consulted it, so the
 * paywall sold something that was never withheld. This is the boundary.
 *
 * ## Where the line is, and why
 *
 * BrandOps' promise is that your work becomes a verified professional identity:
 * ask, plan, execute, approve, verify, keep receipts. **All of that is free.**
 * Locking it would be locking the reason to open the app, which the directive
 * rules out and which would also make the product impossible to evaluate.
 *
 * Free also connects **one** external agent, because a personal brand system
 * that cannot be driven by the AI agent you already use is not demonstrating
 * its actual value — it is demonstrating a screenshot.
 *
 * Pro is multi-agent orchestration: several agents connected at once, and
 * delegation between them with scoped capabilities and budgets. That is genuine
 * additional capability rather than an artificial restriction, and it is the
 * part a solo user can live without while a heavy user cannot.
 *
 * ## Failing open, deliberately
 *
 * Every other monetization decision in this codebase fails *closed*: when the
 * entitlement cannot be determined, the answer is "not premium". This module
 * inverts that for the free tier only, and the distinction matters.
 *
 * An unreachable RevenueCat must not lock someone out of the product they are
 * entitled to use for nothing. So `unavailable` means **free**, not **blocked**:
 * the core loop keeps working offline, on the web build, and in a build with no
 * API key. Pro features stay gated in exactly that state, because `isPremium`
 * is false for all of them — the free tier opens, the paid one does not.
 *
 * ## What this is not
 *
 * It is not a security boundary. There is no server, so a determined user can
 * edit their own workspace. Gating here is a product boundary enforced in the
 * service layer rather than only the interface, which is the strongest thing
 * available without a backend — and the backend is the open release gate.
 */
import { isPremium, type EntitlementState } from './entitlements';

/** How many agent sessions a free workspace may have connected at once. */
export const FREE_AGENT_SESSION_LIMIT = 1;

export type GateDecision =
  | { allowed: true }
  | {
      allowed: false;
      /** Shown to the person, in their words. */
      reason: string;
      /** Whether Pro would lift this, as opposed to it being a hard limit. */
      upgradeUnlocks: boolean;
    };

const ALLOWED: GateDecision = { allowed: true };

/**
 * Connect another external agent.
 *
 * Counts sessions that can currently act. A revoked session holds no capability
 * and counting it would charge someone for cleaning up after themselves.
 */
export function canConnectAgent(
  entitlement: EntitlementState,
  activeSessionCount: number
): GateDecision {
  if (isPremium(entitlement)) return ALLOWED;
  if (activeSessionCount < FREE_AGENT_SESSION_LIMIT) return ALLOWED;
  return {
    allowed: false,
    reason:
      `Free connects ${FREE_AGENT_SESSION_LIMIT} agent at a time. ` +
      'Pro connects as many as you like — or revoke the current one to swap.',
    upgradeUnlocks: true
  };
}

/**
 * Delegate work from one agent to another.
 *
 * Pro only, and it is the clearest example of the boundary: a single agent is
 * fully useful without it, and handing work between several is the thing that
 * needs several in the first place.
 */
export function canDelegateBetweenAgents(entitlement: EntitlementState): GateDecision {
  if (isPremium(entitlement)) return ALLOWED;
  return {
    allowed: false,
    reason: 'Handing work between agents is a Pro feature.',
    upgradeUnlocks: true
  };
}

/**
 * The core loop: ask, plan, execute, approve, verify, receipts.
 *
 * Always allowed, and a function rather than a constant so the intent is
 * legible at every call site and a future change has one place to happen. If
 * this ever returns anything else, the product has stopped being usable for
 * free, which should be a deliberate and visible edit.
 */
export function canUseCoreWorkflow(): GateDecision {
  return ALLOWED;
}

/** A one-line summary of the current plan, for a settings row. */
export function describePlan(entitlement: EntitlementState): string {
  return isPremium(entitlement)
    ? 'Pro — unlimited connected agents and delegation between them.'
    : `Free — the full workspace, plus ${FREE_AGENT_SESSION_LIMIT} connected agent.`;
}
