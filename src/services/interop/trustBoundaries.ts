/**
 * Trust boundaries — every piece of information carries an explicit trust tier.
 * Downstream AI behavior (prompts, context bundles) must respect the distinction
 * between USER_VERIFIED facts and AGENT_REPORTED / MODEL_INFERRED content.
 */
import type { AgentContextPayloadItem, TrustTier } from '../../types/agentInterop';
import { TRUST_TIER_RANK } from '../../types/agentInterop';

export function isVerifiedTier(tier: TrustTier): boolean {
  return tier === 'USER_VERIFIED' || tier === 'BRANDOPS_VERIFIED';
}

/** Most-trusted tier of a list (used to label a bundle, never to upgrade individual items). */
export function strongestTier(tiers: readonly TrustTier[]): TrustTier {
  let best: TrustTier = 'UNKNOWN';
  for (const tier of tiers) {
    if (TRUST_TIER_RANK[tier] > TRUST_TIER_RANK[best]) best = tier;
  }
  return best;
}

/** `false` when an item is AGENT_REPORTED / MODEL_INFERRED / UNKNOWN — callers must not present it as fact. */
export function isUsableAsFact(tier: TrustTier): boolean {
  return isVerifiedTier(tier);
}

/**
 * Label rendered next to provenance so a coding agent can see *why* it can rely
 * on (or must distrust) a piece of context.
 */
export function trustTierLabel(tier: TrustTier): string {
  switch (tier) {
    case 'USER_VERIFIED':
      return 'Verified by the user';
    case 'BRANDOPS_VERIFIED':
      return 'Verified by BrandOps process';
    case 'AGENT_REPORTED':
      return 'Reported by an agent — unverified';
    case 'EXTERNAL_SOURCE':
      return 'Imported from an external source';
    case 'MODEL_INFERRED':
      return 'Inferred by a model — unverified';
    default:
      return 'Unknown provenance';
  }
}

export function provenanceSummary(items: readonly AgentContextPayloadItem[]): string {
  if (!items.length) return '';
  const strongest = strongestTier(items.map((item) => item.trustTier));
  const verifiedCount = items.filter((item) => isVerifiedTier(item.trustTier)).length;
  const reportedCount = items.filter((item) => item.trustTier === 'AGENT_REPORTED').length;
  return `${verifiedCount} verified item(s), ${reportedCount} agent-reported (unverified). Strongest tier: ${trustTierLabel(
    strongest
  )}.`;
}
