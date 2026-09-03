/**
 * Evidence Ledger — unified, first-class evidence with verification status and strength.
 *
 * The evidence-ledger work is tracked in the README product backlog.
 *
 * Existing: EvidenceEntry on ActivityEvent, AchievementCandidate, TwinDelta, ProfessionalSignal, etc.
 * Missing: first-class evidence registry, verification status per evidence item, strength computation,
 * "Show evidence" traversal from claims.
 */

import type {
  EvidenceEntry,
  EvidenceKind,
  VerificationStatus,
  TrustTier
} from '../../types/builder';
import type { EntityRef } from '../../types/builder';

// ---------------------------------------------------------------------------
// Evidence Ledger Types
// ---------------------------------------------------------------------------

/** A first-class evidence item in the ledger. */
export interface LedgerEvidence {
  /** Stable id (generated from ref + kind + label). */
  id: string;
  /** The evidence reference (e.g. git:owner/repo@sha, release:v1.2.3). */
  ref: string;
  /** Evidence kind. */
  kind: EvidenceKind;
  /** Human-readable label. */
  label: string;
  /** Verification URL (if available for independent verification). */
  verificationUrl?: string;
  /** How this evidence was obtained. */
  source: EvidenceSource;
  /** Source label (e.g. "claude-code session abc", "github release v1.2.3"). */
  sourceLabel: string;
  /** When this evidence was added to the ledger. */
  addedAt: string;
  /** Verification status of this specific evidence item. */
  verificationStatus: VerificationStatus;
  /** Trust tier of this evidence. */
  trustTier: TrustTier;
  /** Which claims this evidence supports (claim ids). */
  supportsClaims: string[];
  /** Which entities this evidence is attached to (entity refs). */
  attachedEntities: EntityRef[];
  /** Strength score (0-1) based on verification status and source. */
  strength: number;
  /** Optional notes. */
  notes?: string;
}

/** How evidence was obtained. */
export type EvidenceSource =
  | 'user-input'
  | 'agent-event'
  | 'agent-proposal'
  | 'twin-delta'
  | 'professional-signal'
  | 'activity-event'
  | 'integration-import'
  | 'webpage'
  | 'document'
  | 'repository'
  | 'mcp-response'
  | 'verification-fetch';

/** Strength classification for evidence. */
export type EvidenceStrengthLevel = 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';

/** Combined strength for a claim. */
export interface ClaimEvidenceStrength {
  /** Whether the claim is supported by any evidence. */
  supported: boolean;
  /** Number of evidence items supporting this claim. */
  evidenceCount: number;
  /** Strongest verification status among supporting evidence. */
  strongestVerification: VerificationStatus;
  /** Strongest trust tier among supporting evidence. */
  strongestTrustTier: TrustTier;
  /** Combined strength score (0-1). */
  combinedStrength: number;
  /** Evidence ids supporting this claim. */
  evidenceIds: string[];
  /** Evidence strengths breakdown. */
  strengths: EvidenceStrengthLevel[];
}

// ---------------------------------------------------------------------------
// Evidence Ledger Store
// ---------------------------------------------------------------------------

/** The evidence ledger for a workspace. */
export interface EvidenceLedger {
  /** All evidence items. */
  items: LedgerEvidence[];
  /** Max items to retain. */
  maxItems: number;
  /** Updated at. */
  updatedAt: string;
}

/** In-memory ledger store. */
const ledgers: Map<string, EvidenceLedger> = new Map();

const MAX_EVIDENCE_ITEMS = 500;

// ---------------------------------------------------------------------------
// Evidence Ledger Operations
// ---------------------------------------------------------------------------

/**
 * Generate a stable id for an evidence item.
 */
function generateEvidenceId(ref: string, kind: EvidenceKind, label: string): string {
  const hashInput = `${ref}::${kind}::${label.slice(0, 80)}`;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `ev-${Math.abs(hash).toString(36)}-${Date.now().toString(36)}`;
}

/**
 * Create a LedgerEvidence from an EvidenceEntry.
 */
/** Derive verification status from evidence source. */
function deriveVerificationStatus(source: EvidenceSource): VerificationStatus {
  switch (source) {
    case 'verification-fetch':
      return 'SYSTEM_VERIFIED';
    case 'user-input':
      return 'USER_VERIFIED';
    case 'agent-event':
      return 'UNVERIFIED';
    case 'agent-proposal':
      return 'UNVERIFIED';
    case 'twin-delta':
      return 'UNVERIFIED';
    case 'professional-signal':
      return 'UNVERIFIED';
    case 'activity-event':
      return 'UNVERIFIED';
    case 'integration-import':
      return 'UNVERIFIED';
    case 'webpage':
      return 'UNVERIFIED';
    case 'document':
      return 'UNVERIFIED';
    case 'repository':
      return 'UNVERIFIED';
    case 'mcp-response':
      return 'UNVERIFIED';
    default:
      return 'UNVERIFIED';
  }
}

/** Derive trust tier from evidence source. */
function deriveTrustTier(source: EvidenceSource): TrustTier {
  switch (source) {
    case 'verification-fetch':
      return 'BRANDOPS_VERIFIED' as TrustTier;
    case 'user-input':
      return 'USER_VERIFIED' as TrustTier;
    case 'agent-event':
      return 'AGENT_REPORTED' as TrustTier;
    case 'agent-proposal':
      return 'AGENT_REPORTED' as TrustTier;
    case 'twin-delta':
      return 'AGENT_REPORTED' as TrustTier;
    case 'professional-signal':
      return 'AGENT_REPORTED' as TrustTier;
    case 'activity-event':
      return 'AGENT_REPORTED' as TrustTier;
    case 'integration-import':
      return 'EXTERNAL_SOURCE' as TrustTier;
    case 'webpage':
      return 'EXTERNAL_SOURCE' as TrustTier;
    case 'document':
      return 'EXTERNAL_SOURCE' as TrustTier;
    case 'repository':
      return 'EXTERNAL_SOURCE' as TrustTier;
    case 'mcp-response':
      return 'EXTERNAL_SOURCE' as TrustTier;
    default:
      return 'UNKNOWN' as TrustTier;
  }
}

const WS_ID_DEFAULT = 'ws-default';

export function createLedgerEvidence(params: {
  evidence: EvidenceEntry;
  source: EvidenceSource;
  sourceLabel: string;
  supportsClaims?: string[];
  attachedEntities?: EntityRef[];
  notes?: string;
  workspaceId?: string;
}): LedgerEvidence {
  const now = new Date().toISOString();

  const evidence: LedgerEvidence = {
    id: generateEvidenceId(params.evidence.ref, params.evidence.kind, params.evidence.label),
    ref: params.evidence.ref,
    kind: params.evidence.kind,
    label: params.evidence.label,
    verificationUrl: params.evidence.verificationUrl,
    source: params.source,
    sourceLabel: params.sourceLabel,
    addedAt: now,
    verificationStatus: deriveVerificationStatus(params.source),
    trustTier: deriveTrustTier(params.source),
    supportsClaims: params.supportsClaims ?? [],
    attachedEntities: params.attachedEntities ?? [],
    strength: computeEvidenceStrength({
      verificationStatus: deriveVerificationStatus(params.source),
      source: params.source
    }),
    notes: params.notes
  };

  const wsId = params.workspaceId ?? WS_ID_DEFAULT;
  addEvidence(wsId, evidence);
  return evidence;
}

/**
 * Get or create the evidence ledger for a workspace.
 */
export function getEvidenceLedger(workspaceId: string): EvidenceLedger {
  const existing = ledgers.get(workspaceId);
  if (existing) return existing;

  const ledger: EvidenceLedger = {
    items: [],
    maxItems: MAX_EVIDENCE_ITEMS,
    updatedAt: new Date().toISOString()
  };
  ledgers.set(workspaceId, ledger);
  return ledger;
}

/**
 * Add evidence to the ledger.
 */
export function addEvidence(workspaceId: string, evidence: LedgerEvidence): LedgerEvidence {
  const ledger = getEvidenceLedger(workspaceId);
  const existingIndex = ledger.items.findIndex((e) => e.id === evidence.id);

  if (existingIndex >= 0) {
    // Update existing
    ledger.items[existingIndex] = evidence;
  } else {
    // Add new
    ledger.items = [evidence, ...ledger.items].slice(0, ledger.maxItems);
  }

  ledger.updatedAt = new Date().toISOString();
  ledgers.set(workspaceId, ledger);
  return evidence;
}

/**
 * Get evidence by id.
 */
export function getEvidenceById(
  workspaceId: string,
  evidenceId: string
): LedgerEvidence | undefined {
  return getEvidenceLedger(workspaceId).items.find((e) => e.id === evidenceId);
}

/**
 * Get all evidence for a workspace.
 */
export function getAllEvidence(workspaceId: string): LedgerEvidence[] {
  return getEvidenceLedger(workspaceId).items;
}

/**
 * Get evidence supporting a specific claim.
 */
export function getEvidenceForClaim(workspaceId: string, claimId: string): LedgerEvidence[] {
  return getEvidenceLedger(workspaceId).items.filter((e) => e.supportsClaims.includes(claimId));
}

/**
 * Get evidence attached to a specific entity.
 */
export function getEvidenceForEntity(
  workspaceId: string,
  entityType: string,
  entityId: string
): LedgerEvidence[] {
  return getEvidenceLedger(workspaceId).items.filter((e) =>
    e.attachedEntities.some((ent) => ent.type === entityType && ent.id === entityId)
  );
}

/**
 * Update evidence verification status.
 */
export function updateEvidenceVerification(
  workspaceId: string,
  evidenceId: string,
  verificationStatus: VerificationStatus,
  trustTier?: TrustTier,
  notes?: string
): LedgerEvidence | undefined {
  const ledger = getEvidenceLedger(workspaceId);
  const evidence = ledger.items.find((e) => e.id === evidenceId);
  if (!evidence) return undefined;

  evidence.verificationStatus = verificationStatus;
  if (trustTier) evidence.trustTier = trustTier;
  if (notes) evidence.notes = notes;

  // Recompute strength
  evidence.strength = computeEvidenceStrength({
    verificationStatus,
    source: evidence.source
  });

  ledger.updatedAt = new Date().toISOString();
  ledgers.set(workspaceId, ledger);
  return evidence;
}

/**
 * Link evidence to a claim.
 */
export function linkEvidenceToClaim(
  workspaceId: string,
  evidenceId: string,
  claimId: string
): LedgerEvidence | undefined {
  const ledger = getEvidenceLedger(workspaceId);
  const evidence = ledger.items.find((e) => e.id === evidenceId);
  if (!evidence) return undefined;

  if (!evidence.supportsClaims.includes(claimId)) {
    evidence.supportsClaims.push(claimId);
  }

  ledger.updatedAt = new Date().toISOString();
  ledgers.set(workspaceId, ledger);
  return evidence;
}

/**
 * Link evidence to an entity.
 */
export function linkEvidenceToEntity(
  workspaceId: string,
  evidenceId: string,
  entity: EntityRef
): LedgerEvidence | undefined {
  const ledger = getEvidenceLedger(workspaceId);
  const evidence = ledger.items.find((e) => e.id === evidenceId);
  if (!evidence) return undefined;

  if (!evidence.attachedEntities.some((e) => e.type === entity.type && e.id === entity.id)) {
    evidence.attachedEntities.push(entity);
  }

  ledger.updatedAt = new Date().toISOString();
  ledgers.set(workspaceId, ledger);
  return evidence;
}

// ---------------------------------------------------------------------------
// Evidence Strength Computation
// ---------------------------------------------------------------------------

/**
 * Compute evidence strength from verification status, trust tier, and source.
 */
/**
 * Strength is verification status plus source reliability. Not trust tier.
 *
 * This took a `trustTier` and never read it. All five tiers produced the same
 * score, so a `MODEL_INFERRED` claim scored exactly as a `USER_VERIFIED` one —
 * and the parameter's presence said the opposite, which is worse than not
 * offering it.
 *
 * The sharper version of the problem was in `updateEvidenceVerification`, which
 * accepts a tier from its caller, **stores it on the evidence**, and passed it
 * here to be discarded. The recorded tier and the recorded strength could
 * therefore disagree, with nothing to reconcile them.
 *
 * Dropping the parameter rather than weighting it is deliberate. Both internal
 * callers derived the tier from `source` in the first place
 * (`deriveTrustTier(params.source)`), so provenance is already what `source`
 * encodes — an agent event scores 0.1, a verification fetch 0.3. Inventing a
 * second weighting for the same signal would double-count it, and picking those
 * weights would be a product decision made on no evidence.
 *
 * `trustTier` remains a recorded fact on the evidence. It is simply not an input
 * to this number, and the signature now says so.
 */
export function computeEvidenceStrength(params: {
  verificationStatus: VerificationStatus;
  source: EvidenceSource;
}): number {
  let strength = 0;

  // Verification status contributes 0-0.5
  switch (params.verificationStatus) {
    case 'USER_VERIFIED':
      strength += 0.3;
      break;
    case 'SYSTEM_VERIFIED':
      strength += 0.5;
      break;
    case 'INDEPENDENTLY_SUPPORTED':
      strength += 0.25;
      break;
    case 'UNVERIFIED':
    default:
      strength += 0.1;
      break;
  }

  // Source confidence replaces trust tier — source reliability is the primary signal
  // Source confidence contributes 0-0.3 (highest weight for source reliability)
  let sourceConfidence = 0;
  switch (params.source) {
    case 'verification-fetch':
      sourceConfidence = 0.3;
      break;
    case 'user-input':
      sourceConfidence = 0.2;
      break;
    case 'repository':
    case 'integration-import':
      sourceConfidence = 0.15;
      break;
    case 'agent-event':
    case 'agent-proposal':
    case 'twin-delta':
    case 'professional-signal':
    case 'activity-event':
      sourceConfidence = 0.1;
      break;
    case 'webpage':
    case 'document':
    case 'mcp-response':
      sourceConfidence = 0.05;
      break;
    default:
      sourceConfidence = 0.05;
      break;
  }
  strength += sourceConfidence;

  return Math.min(1, strength);
}

/**
 * Get the strength level label for a score.
 */
export function evidenceStrengthLevel(score: number): EvidenceStrengthLevel {
  if (score >= 0.7) return 'STRONG';
  if (score >= 0.4) return 'MODERATE';
  if (score > 0) return 'WEAK';
  return 'NONE';
}

/**
 * Compute combined strength for a claim's evidence.
 */
export function computeClaimEvidenceStrength(
  workspaceId: string,
  claimId: string
): ClaimEvidenceStrength {
  const evidence = getEvidenceForClaim(workspaceId, claimId);

  if (evidence.length === 0) {
    return {
      supported: false,
      evidenceCount: 0,
      strongestVerification: 'UNVERIFIED' as VerificationStatus,
      strongestTrustTier: 'UNKNOWN' as TrustTier,
      combinedStrength: 0,
      evidenceIds: [],
      strengths: []
    };
  }

  const strongestVerification: VerificationStatus = evidence.reduce((best, e) => {
    const rank: Record<VerificationStatus, number> = {
      USER_VERIFIED: 4,
      SYSTEM_VERIFIED: 3,
      INDEPENDENTLY_SUPPORTED: 2,
      UNVERIFIED: 1
    };
    return (rank[e.verificationStatus] ?? 0) > (rank[best] ?? 0) ? e.verificationStatus : best;
  }, 'UNVERIFIED' as VerificationStatus);

  const strongestTrustTier: TrustTier = evidence.reduce((best, e) => {
    const rank: Record<TrustTier, number> = {
      USER_VERIFIED: 6,
      BRANDOPS_VERIFIED: 5,
      AGENT_REPORTED: 3,
      EXTERNAL_SOURCE: 2,
      MODEL_INFERRED: 1,
      UNKNOWN: 0
    };
    return rank[e.trustTier] > rank[best] ? e.trustTier : best;
  }, 'UNKNOWN' as TrustTier);

  const combinedStrength = evidence.reduce((sum, e) => sum + e.strength, 0) / evidence.length;

  const strengths = evidence.map((e) => evidenceStrengthLevel(e.strength));

  return {
    supported: true,
    evidenceCount: evidence.length,
    strongestVerification,
    strongestTrustTier,
    combinedStrength,
    evidenceIds: evidence.map((e) => e.id),
    strengths
  };
}

/**
 * Get a human-readable summary of evidence for a claim.
 */
export function evidenceSummaryForClaim(workspaceId: string, claimId: string): string {
  const strength = computeClaimEvidenceStrength(workspaceId, claimId);

  if (!strength.supported) {
    return 'No evidence on file for this claim.';
  }

  const parts = [
    `${strength.evidenceCount} evidence item(s)`,
    `Strongest verification: ${strength.strongestVerification}`,
    `Combined strength: ${(strength.combinedStrength * 100).toFixed(0)}%`
  ];

  if (strength.strengths.includes('STRONG')) {
    parts.push('Contains strong evidence');
  }

  return parts.join('; ');
}

// ---------------------------------------------------------------------------
// Ledger Import / Export
// ---------------------------------------------------------------------------

/**
 * Export the ledger for a workspace.
 */
export function exportEvidenceLedger(workspaceId: string): EvidenceLedger {
  return getEvidenceLedger(workspaceId);
}

/**
 * Import a ledger into a workspace.
 */
export function importEvidenceLedger(workspaceId: string, ledger: EvidenceLedger): void {
  ledgers.set(workspaceId, {
    items: ledger.items,
    maxItems: ledger.maxItems,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Clear the ledger for a workspace (testing only).
 */
export function clearEvidenceLedger(workspaceId: string): void {
  ledgers.delete(workspaceId);
}
