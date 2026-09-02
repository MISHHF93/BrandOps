/**
 * Agent Policy Engine — the single stage that decides whether an inbound agent
 * request may proceed.
 *
 * Before this existed the answer was assembled from checks scattered across the
 * gateway, and one of them (the agent trust registry) was built but never
 * consulted by anything. Consolidating them here means every decision is made
 * in one order, for one reason, and is reported as one auditable verdict.
 *
 * Evaluation order — earlier checks are cheaper and more fundamental, and the
 * first failure stops the rest:
 *
 *   1. session live       — active, not revoked, not expired
 *   2. workspace scope    — the session belongs to this workspace
 *   3. capability grant   — the capability was granted to this session
 *   4. trust ceiling      — the operator has not capped this session below it
 *   5. rate limit         — the session is inside its per-tier budget
 *   6. tier obligations   — approval / explicit confirmation required?
 *
 * The engine never *expands* authority. Every check can only deny, so wiring it
 * in cannot make a previously-blocked call succeed.
 */
import type {
  AgentCapabilityId,
  ExternalAgentSession,
  ExternalAgentTrustLevel,
  PermissionTier
} from '../../types/agentInterop';
import type { BrandOpsData } from '../../types/domain';
import { resolveWorkspaceId } from '../workspaceIdentity';
import {
  AGENT_CAPABILITY_REGISTRY,
  capabilityIsSensitive,
  capabilityRequiresApproval,
  getAgentCapability
} from './capabilityRegistry';

const TRUST_RANK: Record<ExternalAgentTrustLevel, number> = {
  NONE: 0,
  READ_ONLY: 1,
  CONTEXT_CONSUMER: 2,
  PROPOSER: 3,
  ACTION_REQUESTER: 4
};

/**
 * Requests per minute a session may spend at each tier. Consequential work is
 * budgeted far more tightly than reading: a compromised client should exhaust
 * its ability to *act* long before it exhausts its ability to look.
 */
export const TIER_RATE_LIMITS: Record<PermissionTier, number> = {
  READ: 120,
  GENERATE: 60,
  PREPARE: 30,
  EXTERNAL_ACTION: 10,
  SENSITIVE_ACTION: 3
};

/** Minimum trust level a tier requires, independent of what was granted. */
export function tierRequiresTrust(
  tier: PermissionTier,
  readOnly: boolean
): ExternalAgentTrustLevel {
  if (readOnly) return 'READ_ONLY';
  switch (tier) {
    case 'EXTERNAL_ACTION':
    case 'SENSITIVE_ACTION':
      return 'ACTION_REQUESTER';
    case 'PREPARE':
    case 'GENERATE':
      return 'PROPOSER';
    default:
      return 'CONTEXT_CONSUMER';
  }
}

export type PolicyErrorCode =
  | 'session_inactive'
  | 'workspace_mismatch'
  | 'capability_not_granted'
  | 'trust_level_insufficient'
  | 'rate_limited';

export interface PolicyDecision {
  allow: boolean;
  errorCode?: PolicyErrorCode;
  reason?: string;
  /** Tier obligations, reported even on a denial so audit shows what was asked for. */
  requiresApproval: boolean;
  requiresConfirmation: boolean;
  tier: PermissionTier;
  /** Effective trust level after any operator-set ceiling. */
  trustLevel: ExternalAgentTrustLevel;
  /** Checks actually run, in order — the audit trail of the decision itself. */
  evaluated: string[];
  rateLimit: { limitPerMinute: number; remaining: number };
}

/**
 * Trust implied by what a session was granted, derived from the registry rather
 * than a hardcoded capability list — a name-matching derivation silently
 * misclassifies every capability added after it was written.
 *
 * `agentIdentity.deriveTrustLevel` delegates here, so what a person is shown and
 * what the gateway enforces are the same computation rather than two that agree
 * until a capability is added.
 */
export function trustFromCapabilities(
  capabilities: readonly AgentCapabilityId[]
): ExternalAgentTrustLevel {
  let best: ExternalAgentTrustLevel = 'NONE';
  const raise = (level: ExternalAgentTrustLevel) => {
    if (TRUST_RANK[level] > TRUST_RANK[best]) best = level;
  };
  for (const id of capabilities) {
    const def = AGENT_CAPABILITY_REGISTRY[id];
    // An id outside the registry contributes nothing — an unknown capability
    // must never raise trust, and it is refused at the grant check anyway.
    if (!def) continue;
    raise(tierRequiresTrust(def.tier, def.readOnly));
  }
  return best;
}

export function derivedTrustFromGrants(session: ExternalAgentSession): ExternalAgentTrustLevel {
  if (session.status === 'revoked') return 'NONE';
  return trustFromCapabilities(session.grantedCapabilities);
}

/**
 * Effective trust level: what the grants imply, capped by any ceiling the
 * operator set. The ceiling is the part that actually restricts — it lets an
 * operator neuter a session without editing its grant list, and it can only
 * lower the result, never raise it.
 */
export function effectiveTrustLevel(session: ExternalAgentSession): ExternalAgentTrustLevel {
  const derived = derivedTrustFromGrants(session);
  const ceiling = session.trustCeiling;
  if (!ceiling) return derived;
  return TRUST_RANK[ceiling] < TRUST_RANK[derived] ? ceiling : derived;
}

// ── Rate limiting ────────────────────────────────────────────────────────
//
// Per-process, in-memory, and deliberately so: this is a local abuse brake, not
// a distributed quota. A multi-instance deployment needs shared state, and the
// capability matrix records that limitation rather than implying otherwise.

interface RateWindow {
  windowStartedAt: number;
  count: number;
}

const RATE_WINDOWS = new Map<string, RateWindow>();
const WINDOW_MS = 60_000;

function rateKey(sessionId: string, tier: PermissionTier): string {
  return `${sessionId}::${tier}`;
}

/** Read the current budget without consuming any of it. */
export function peekRateLimit(
  sessionId: string,
  tier: PermissionTier,
  now = Date.now()
): { limitPerMinute: number; remaining: number } {
  const limit = TIER_RATE_LIMITS[tier];
  const window = RATE_WINDOWS.get(rateKey(sessionId, tier));
  if (!window || now - window.windowStartedAt >= WINDOW_MS) {
    return { limitPerMinute: limit, remaining: limit };
  }
  return { limitPerMinute: limit, remaining: Math.max(0, limit - window.count) };
}

function consumeRateLimit(
  sessionId: string,
  tier: PermissionTier,
  now: number
): { allowed: boolean; limitPerMinute: number; remaining: number } {
  const limit = TIER_RATE_LIMITS[tier];
  const key = rateKey(sessionId, tier);
  const window = RATE_WINDOWS.get(key);
  if (!window || now - window.windowStartedAt >= WINDOW_MS) {
    RATE_WINDOWS.set(key, { windowStartedAt: now, count: 1 });
    return { allowed: true, limitPerMinute: limit, remaining: limit - 1 };
  }
  if (window.count >= limit) {
    return { allowed: false, limitPerMinute: limit, remaining: 0 };
  }
  window.count += 1;
  return { allowed: true, limitPerMinute: limit, remaining: limit - window.count };
}

/** Test seam. Never called by the gateway. */
export function resetRateLimits(): void {
  RATE_WINDOWS.clear();
}

/**
 * The workspace this blob represents. Used to catch a token being replayed
 * against a workspace it was never issued for.
 *
 * Resolved through `workspaceIdentity.ts` rather than read straight off
 * `builderActivity`, so the id a session is checked against is the same one
 * every writer will store. Reading the raw field made authorization depend on
 * which service happened to create `builderActivity` first — see the note in
 * that module.
 */
function workspaceIdOf(workspace: BrandOpsData): string | undefined {
  return resolveWorkspaceId(workspace);
}

export interface PolicyInput {
  workspace: BrandOpsData;
  session: ExternalAgentSession;
  capabilityId: AgentCapabilityId;
  now?: number;
  /** When false, the budget is read but not spent (used for dry-run checks). */
  consume?: boolean;
}

export function evaluateAgentPolicy(input: PolicyInput): PolicyDecision {
  const { workspace, session, capabilityId } = input;
  const now = input.now ?? Date.now();
  const def = getAgentCapability(capabilityId);
  const evaluated: string[] = [];

  /**
   * Defence in depth: callers validate the id before reaching here, but an
   * unknown capability must fail closed rather than throw — a crash in the
   * authorization stage is the worst possible failure mode.
   */
  if (!def) {
    return {
      allow: false,
      errorCode: 'capability_not_granted',
      reason: `Unknown capability: ${capabilityId}`,
      requiresApproval: true,
      requiresConfirmation: true,
      tier: 'SENSITIVE_ACTION',
      trustLevel: 'NONE',
      evaluated: ['capability_known'],
      rateLimit: { limitPerMinute: 0, remaining: 0 }
    };
  }
  const tier = def.tier;

  const requiresApproval = capabilityRequiresApproval(capabilityId);
  const requiresConfirmation = capabilityIsSensitive(capabilityId);
  const trustLevel = effectiveTrustLevel(session);

  const deny = (errorCode: PolicyErrorCode, reason: string): PolicyDecision => ({
    allow: false,
    errorCode,
    reason,
    requiresApproval,
    requiresConfirmation,
    tier,
    trustLevel,
    evaluated,
    rateLimit: peekRateLimit(session.id, tier, now)
  });

  // 1. Session live.
  evaluated.push('session_live');
  if (session.status === 'revoked') {
    return deny('session_inactive', `Session ${session.id} is revoked.`);
  }
  if (session.expiresAt && new Date(session.expiresAt).getTime() <= now) {
    return deny('session_inactive', `Session ${session.id} expired at ${session.expiresAt}.`);
  }

  // 2. Workspace scope — a session is bound to the workspace it was issued in.
  evaluated.push('workspace_scope');
  const workspaceId = workspaceIdOf(workspace);
  if (workspaceId && session.workspaceId && session.workspaceId !== workspaceId) {
    return deny(
      'workspace_mismatch',
      `Session ${session.id} is scoped to workspace ${session.workspaceId}, not ${workspaceId}.`
    );
  }

  // 3. Capability grant.
  evaluated.push('capability_grant');
  if (!session.grantedCapabilities.includes(capabilityId)) {
    return deny(
      'capability_not_granted',
      `Session ${session.id} is not granted capability ${capabilityId}.`
    );
  }

  // 4. Trust ceiling — defence in depth behind the grant list.
  evaluated.push('trust_ceiling');
  const required = tierRequiresTrust(tier, def.readOnly);
  if (TRUST_RANK[trustLevel] < TRUST_RANK[required]) {
    return deny(
      'trust_level_insufficient',
      `Capability ${capabilityId} requires trust level ${required}; this session is capped at ${trustLevel}.`
    );
  }

  // 5. Rate limit.
  evaluated.push('rate_limit');
  const budget =
    input.consume === false
      ? { allowed: true, ...peekRateLimit(session.id, tier, now) }
      : consumeRateLimit(session.id, tier, now);
  if (!budget.allowed) {
    return deny(
      'rate_limited',
      `Session ${session.id} exceeded the ${tier} budget of ${budget.limitPerMinute} requests/minute.`
    );
  }

  // 6. Tier obligations — reported, enforced downstream by the gateway.
  evaluated.push('tier_obligations');
  return {
    allow: true,
    requiresApproval,
    requiresConfirmation,
    tier,
    trustLevel,
    evaluated,
    rateLimit: { limitPerMinute: budget.limitPerMinute, remaining: budget.remaining }
  };
}

/** One-line rendering for the audit trail. */
export function formatPolicyDecision(decision: PolicyDecision): string {
  const verdict = decision.allow ? 'allow' : `deny(${decision.errorCode})`;
  return (
    `policy=${verdict} tier=${decision.tier} trust=${decision.trustLevel} ` +
    `checks=[${decision.evaluated.join('>')}] budget=${decision.rateLimit.remaining}/${decision.rateLimit.limitPerMinute}`
  );
}
