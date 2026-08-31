/**
 * Memory Firewall — orchestrates the CandidateMemory → validation → trust classification
 * → optional user verification → durable memory pipeline.
 *
 * This is the central entry point for all content that wants to enter durable Twin memory.
 * It coordinates the candidate memory pipeline (candidateMemory.ts) with trust assessment
 * and the promotion gate.
 *
 * Usage:
 *   const result = await processThroughFirewall({
 *     content: "I specialize in auth systems",
 *     source: "agent-proposal",
 *     sourceLabel: "claude-code session abc123",
 *     traceId: "trace-abc123"
 *   });
 *
 *   if (result.action === "verify") {
 *     // Show the candidate to the user for verification
 *     // On user approval: promoteToDurableMemory(result.candidate.id, { memoryType: "approvedClaims", verifiedBy: "user" })
 *   } else if (result.action === "promote") {
 *     // Auto-promote (only for USER_VERIFIED content with no instruction risk)
 *     promoteToDurableMemory(result.candidate.id, { memoryType: "approvedClaims" });
 *   } else {
 *     // Reject — do not store
 *   }
 */

import type { TrustTier } from '../../types/agentInterop';
import {
  submitToCandidateMemory,
  getCandidate,
  getCandidates,
  promoteToDurableMemory as promoteCandidate,
  rejectCandidate,
  getCandidateStats,
  clearCandidateStore,
  getVerificationQueue,
  getVerificationQueueCount,
  type CandidateMemoryEntry,
  type FirewallResult,
  type CandidateSource,
  type MemoryTrustClassification,
  type InstructionRisk,
} from './candidateMemory';

// Re-export for test convenience
export { getVerificationQueue, getVerificationQueueCount };

// ---------------------------------------------------------------------------
// Firewall Configuration
// ---------------------------------------------------------------------------

export interface MemoryFirewallConfig {
  /** Whether the firewall is enabled. When disabled, content bypasses the pipeline (NOT recommended for production). */
  enabled: boolean;
  /** Whether to require user verification for content with ANY instruction risk (not just high). */
  requireVerificationForAnyInstructionRisk: boolean;
  /** Whether to require user verification for content from non-user sources regardless of instruction risk. */
  requireVerificationForExternalSources: boolean;
  /** Content sources that are blocked entirely (their content is rejected without review). */
  blockedSources: CandidateSource[];
  /** If true, content classified as MODEL_INFERRED or EXTERNAL_SOURCE is auto-rejected rather than queued for verification. */
  autoRejectLowTrust: boolean;
  /** Maximum age (in ms) of a candidate before it's considered stale and automatically rejected. Default: 7 days. */
  maxCandidateAgeMs: number;
}

/** Default firewall configuration — security-focused. */
export const DEFAULT_FIREWALL_CONFIG: MemoryFirewallConfig = {
  enabled: true,
  requireVerificationForAnyInstructionRisk: false, // Only high risk requires verification by default
  requireVerificationForExternalSources: true,     // External sources always require verification
  blockedSources: ['webpage', 'document', 'repository'], // These require explicit import flow, not direct memory entry
  autoRejectLowTrust: false,                        // Queue for verification instead of auto-reject
  maxCandidateAgeMs: 7 * 24 * 60 * 60 * 1000,      // 7 days
};

// ---------------------------------------------------------------------------
// Firewall State
// ---------------------------------------------------------------------------

/** Current firewall configuration. */
let currentConfig: MemoryFirewallConfig = { ...DEFAULT_FIREWALL_CONFIG };

/** Whether the firewall has been initialized. */
let initialized = false;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the memory firewall with a configuration.
 * Should be called once at app startup.
 */
export function initializeFirewall(config: Partial<MemoryFirewallConfig> = {}): void {
  currentConfig = { ...currentConfig, ...config };
  initialized = true;
}

/**
 * Get the current firewall configuration.
 */
export function getFirewallConfig(): MemoryFirewallConfig {
  return { ...currentConfig };
}

/**
 * Update the firewall configuration.
 */
export function updateFirewallConfig(config: Partial<MemoryFirewallConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Check whether the firewall is initialized.
 */
export function isFirewallInitialized(): boolean {
  return initialized;
}

/**
 * Process content through the memory firewall.
 *
 * This is the main entry point. It:
 * 1. Checks if the firewall is enabled
 * 2. Checks if the source is blocked
 * 3. Submits content to candidate memory (sanitize → classify → assess instruction risk)
 * 4. Applies config-based rules to determine the action
 * 5. Returns a FirewallResult with the recommended action
 */
export function processThroughFirewall(params: {
  content: unknown;
  source: CandidateSource;
  sourceLabel?: string;
  explicitTrustTier?: TrustTier;
  traceId?: string;
}): FirewallResult {
  if (!initialized) {
    initializeFirewall();
  }

  if (!currentConfig.enabled) {
    // Firewall disabled — still sanitize and classify, but allow everything
    const result = submitToCandidateMemory({
      content: params.content,
      source: params.source,
      sourceLabel: params.sourceLabel,
      explicitTrustTier: params.explicitTrustTier,
      traceId: params.traceId,
    });
    return {
      ...result,
      action: result.action === 'reject' ? 'reject' : 'promote', // Disable verification requirement
      requiresVerification: false,
    };
  }

  // Check if source is blocked
  if (currentConfig.blockedSources.includes(params.source)) {
    const candidate = submitToCandidateMemory({
      content: params.content,
      source: params.source,
      sourceLabel: params.sourceLabel,
      explicitTrustTier: params.explicitTrustTier,
      traceId: params.traceId,
    });
    return {
      ...candidate,
      allowed: false,
      requiresVerification: false,
      reason: `Source "${params.source}" is blocked by firewall configuration. Content was not stored.`,
      action: 'reject',
    };
  }

  // Submit to candidate memory (runs the full pipeline: sanitize → classify → assess risk)
  const result = submitToCandidateMemory({
    content: params.content,
    source: params.source,
    sourceLabel: params.sourceLabel,
    explicitTrustTier: params.explicitTrustTier,
    traceId: params.traceId,
  });

  // Apply config-based overrides
  if (result.action === 'promote') {
    // Check if we should upgrade to verification
    if (currentConfig.requireVerificationForExternalSources &&
        (result.candidate.trustClassification === 'AGENT_REPORTED' ||
         result.candidate.trustClassification === 'EXTERNAL_SOURCE' ||
         result.candidate.trustClassification === 'MODEL_INFERRED')) {
      result.requiresVerification = true;
      result.action = 'verify';
      result.reason = `Firewall configuration requires verification for ${result.candidate.trustClassification} content.`;
    } else if (currentConfig.requireVerificationForAnyInstructionRisk &&
               result.candidate.instructionRisk !== 'none') {
      result.requiresVerification = true;
      result.action = 'verify';
      result.reason = `Firewall configuration requires verification for content with ${result.candidate.instructionRisk} instruction risk.`;
    }
  }

  // Check for stale candidates (older than maxCandidateAgeMs)
  const candidateAge = Date.now() - new Date(result.candidate.submittedAt).getTime();
  if (candidateAge > currentConfig.maxCandidateAgeMs && result.action !== 'reject') {
    rejectCandidate(result.candidate.id, `Candidate expired after ${currentConfig.maxCandidateAgeMs}ms`);
    return {
      ...result,
      allowed: false,
      requiresVerification: false,
      reason: `Candidate expired after ${currentConfig.maxCandidateAgeMs}ms (maxCandidateAgeMs).`,
      action: 'reject',
    };
  }

  // Auto-reject low trust if configured
  if (currentConfig.autoRejectLowTrust &&
      (result.candidate.trustClassification === 'MODEL_INFERRED' ||
       result.candidate.trustClassification === 'EXTERNAL_SOURCE')) {
    rejectCandidate(result.candidate.id, 'Auto-rejected by firewall: low trust classification');
    return {
      ...result,
      allowed: false,
      requiresVerification: false,
      reason: 'Firewall auto-rejected low-trust content (autoRejectLowTrust is enabled).',
      action: 'reject',
    };
  }

  return result;
}

/**
 * Promote a candidate to durable memory after verification.
 *
 * This should be called after the user has verified the content (if required).
 * The `verifiedBy` parameter should be the user's identifier.
 */
export function promoteToDurableMemory(
  candidateId: string,
  params: {
    memoryType: 'approvedClaims' | 'rejectedClaims' | 'twin-fact' | 'professional-signal' | 'evidence';
    verifiedBy?: string;
    traceId?: string;
  }
): CandidateMemoryEntry | null {
  return promoteCandidate(candidateId, params);
}

/**
 * Reject a candidate (e.g., after user review).
 */
export function rejectCandidateEntry(candidateId: string, reason?: string): boolean {
  return rejectCandidate(candidateId, reason);
}

/**
 * Get a candidate entry by id.
 */
export function getCandidateEntry(id: string): CandidateMemoryEntry | undefined {
  return getCandidate(id);
}

/**
 * Get candidates matching the given filters.
 */
export function queryCandidates(options?: {
  source?: CandidateSource;
  trustClassification?: MemoryTrustClassification;
  requiresVerification?: boolean;
  instructionRisk?: InstructionRisk;
  limit?: number;
}): CandidateMemoryEntry[] {
  return getCandidates({
    source: options?.source,
    trustClassification: options?.trustClassification,
    requiresVerification: options?.requiresVerification,
    limit: options?.limit,
  }).filter((e) => {
    if (options?.instructionRisk && e.instructionRisk !== options.instructionRisk) return false;
    return true;
  });
}

/**
 * Get firewall statistics.
 */
export function getFirewallStats(): {
  totalCandidates: number;
  pendingVerification: number;
  promoted: number;
  rejected: number;
  bySource: Record<CandidateSource, number>;
  byTrustClassification: Record<MemoryTrustClassification, number>;
  byInstructionRisk: Record<InstructionRisk, number>;
} {
  return getCandidateStats();
}

/**
 * Clear the candidate store (testing only).
 */
export function resetFirewall(): void {
  clearCandidateStore();
  currentConfig = { ...DEFAULT_FIREWALL_CONFIG };
  initialized = false;
}

// ---------------------------------------------------------------------------
// Convenience: Generate a human-readable summary of a candidate
// ---------------------------------------------------------------------------

/**
 * Generate a human-readable summary of a candidate for display in the verification UI.
 */
export function candidateSummary(candidate: CandidateMemoryEntry): string {
  const trustLabel = trustClassificationLabel(candidate.trustClassification);
  const riskLabel = instructionRiskLabel(candidate.instructionRisk);
  const sourceInfo = `[${candidate.source}] ${candidate.sourceLabel}`;

  let summary = `${sourceInfo}\n`;
  summary += `Trust: ${trustLabel}\n`;
  summary += `Instruction risk: ${riskLabel}\n`;
  summary += `Submitted: ${new Date(candidate.submittedAt).toLocaleString()}\n`;

  if (candidate.requiresVerification) {
    summary += `⚠️ Requires user verification before storage\n`;
  }

  if (candidate.firewallReason) {
    summary += `Firewall note: ${candidate.firewallReason}\n`;
  }

  summary += `\nContent:\n${candidate.content}`;

  return summary;
}

function trustClassificationLabel(tier: MemoryTrustClassification): string {
  switch (tier) {
    case 'USER_VERIFIED': return 'Verified by user';
    case 'BRANDOPS_VERIFIED': return 'Verified by BrandOps';
    case 'AGENT_REPORTED': return 'Reported by agent (unverified)';
    case 'EXTERNAL_SOURCE': return 'Imported from external source';
    case 'MODEL_INFERRED': return 'Inferred by model (low trust)';
    case 'INSTRUCTION_RISK': return 'Contains instruction-like content — high risk';
    case 'REJECTED': return 'Rejected by firewall';
    case 'UNKNOWN': return 'Unknown provenance';
  }
}

function instructionRiskLabel(risk: InstructionRisk): string {
  switch (risk) {
    case 'none': return 'None detected';
    case 'low': return 'Low — some directive patterns detected';
    case 'high': return 'High — persona assignment, rule imposition, or memory manipulation detected';
  }
}


