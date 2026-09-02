/**
 * CandidateMemory — staging area for untrusted inputs before they enter durable Twin memory.
 *
 * Every piece of content that comes from an external source (agent events, webpages,
 * documents, MCP responses, model outputs, proposal claims) must pass through this
 * pipeline before it can modify durable memory:
 *
 *   submit → sanitize → classify trust → assess instruction risk → optional user verification
 *     → promote to durable memory
 *
 * This is the core of the Memory Firewall (#3). It prevents poisoned memory from
 * entering the Twin and influencing future sessions.
 */

import type { TrustTier } from '../../types/agentInterop';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Sources that can submit content to candidate memory. */
/**
 * Four functions were removed from this module, and one stopped being exported.
 *
 * `memoryFirewall.ts` imports nine functions from here and then **re-declares
 * five of them under the same names** — `getCandidateEntry`, `queryCandidates`,
 * `rejectCandidateEntry`, `candidateSummary`, `promoteToDurableMemory`. Its
 * versions are thin wrappers; all of the actual safety logic (a rejected
 * candidate cannot be promoted, one requiring verification needs a verifier)
 * lives here.
 *
 * So four of the copies in *this* file were dead: nothing imported them, and
 * each appeared exactly once in the file — its own declaration. What they left
 * behind was worse than dead weight, because a reader searching for
 * `rejectCandidateEntry` in a security boundary found two implementations and
 * had to work out which one runs.
 *
 * `assessInstructionRisk` is used here and imported nowhere, so it is no longer
 * exported. `promoteToDurableMemory` stays exported: the firewall imports it as
 * `promoteCandidate` and wraps it.
 */
export type CandidateSource =
  | 'agent-event'
  | 'agent-proposal'
  | 'webpage'
  | 'document'
  | 'repository'
  | 'mcp-response'
  | 'external-agent-message'
  | 'model-output'
  | 'user-input'
  | 'twin-delta'
  | 'skill-pack'
  | 'integration-import';

/** Trust classification for candidate memory — extends TrustTier with memory-specific granularity. */
export type MemoryTrustClassification =
  | 'USER_VERIFIED' // User explicitly confirmed this content
  | 'BRANDOPS_VERIFIED' // Deterministic rule confirmed (e.g. checksum match, source verification)
  | 'AGENT_REPORTED' // Reported by an agent, not yet user-verified
  | 'EXTERNAL_SOURCE' // Imported from external source, not yet verified
  | 'MODEL_INFERRED' // Inferred by a model, low trust
  | 'INSTRUCTION_RISK' // Contains instruction-like content — requires special handling
  | 'REJECTED' // Rejected by firewall, never enters durable memory
  | 'UNKNOWN';

/** Instruction-like risk assessment. */
export type InstructionRisk = 'none' | 'low' | 'high';

/** A candidate memory entry — content that has been submitted but not yet promoted to durable memory. */
export interface CandidateMemoryEntry {
  /** Stable id for this candidate. */
  id: string;
  /** The content text (sanitized, length-capped). */
  content: string;
  /** Where this content came from. */
  source: CandidateSource;
  /** Human-readable label for the source (e.g. "claude-code session s1", "github repo acme/app"). */
  sourceLabel: string;
  /** When this candidate was submitted (ISO timestamp). */
  submittedAt: string;
  /** Trust classification after firewall processing. */
  trustClassification: MemoryTrustClassification;
  /** Whether this content looks like it could influence AI behavior (instructions, imperatives, role assignments). */
  instructionRisk: InstructionRisk;
  /** Whether this candidate requires explicit user verification before promotion. */
  requiresVerification: boolean;
  /** If verified, who verified it and when. */
  verifiedBy?: string;
  verifiedAt?: string;
  /** If promoted to durable memory, when and to which memory type. */
  promotedToDurableAt?: string;
  promotedToMemoryType?:
    | 'approvedClaims'
    | 'rejectedClaims'
    | 'twin-fact'
    | 'professional-signal'
    | 'evidence';
  /** Optional reference to the durable memory id after promotion. */
  durableMemoryId?: string;
  /** Firewall decision reason (for rejected entries or entries requiring verification). */
  firewallReason?: string;
  /** Trace id for correlation (if available). */
  traceId?: string;
}

/** Result of processing content through the memory firewall. */
export interface FirewallResult {
  /** The candidate entry after sanitization and classification. */
  candidate: CandidateMemoryEntry;
  /** Whether this content is allowed to proceed toward durable memory. */
  allowed: boolean;
  /** Whether user verification is required before promotion. */
  requiresVerification: boolean;
  /** Reason for rejection or verification requirement (if applicable). */
  reason?: string;
  /** Suggested action: 'promote' (auto-promote), 'verify' (require user verification), 'reject' (do not store). */
  action: 'promote' | 'verify' | 'reject';
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

/** Maximum length for candidate content stored in memory. */
const MAX_CANDIDATE_CONTENT_LENGTH = 2000;

/** Maximum length for source label. */
const MAX_SOURCE_LABEL_LENGTH = 120;

/**
 * Sanitize candidate content: strip control characters, collapse whitespace,
 * length-cap. This is the first line of defense — malicious content must pass
 * through this sanitizer before it can be stored.
 */
function sanitizeContent(raw: unknown, _source: CandidateSource): string {
  if (typeof raw !== 'string') return '';
  // Strip control characters (include null bytes, DEL, etc.) but keep whitespace chars: space, tab, newline, carriage return
  let cleaned = '';
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) continue; // strip control chars except tab(9), newline(10), carriage return(13)
    if (code === 127) continue; // strip DEL
    cleaned += raw[i];
  }
  // Collapse whitespace: any run of whitespace becomes a single space
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  // Length cap — leave room for the truncation suffix
  if (cleaned.length > MAX_CANDIDATE_CONTENT_LENGTH) {
    const suffix = '…[truncated]';
    cleaned = cleaned.slice(0, MAX_CANDIDATE_CONTENT_LENGTH - suffix.length) + suffix;
  }
  return cleaned;
}

function sanitizeSourceLabel(raw: string): string {
  if (typeof raw !== 'string') return 'unknown';
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'unknown';
  return cleaned.length > MAX_SOURCE_LABEL_LENGTH
    ? cleaned.slice(0, MAX_SOURCE_LABEL_LENGTH)
    : cleaned;
}

// ---------------------------------------------------------------------------
// Trust Classification
// ---------------------------------------------------------------------------

/**
 * Classify the trust level of candidate content based on its source.
 * This extends the existing TrustTier with memory-specific granularity.
 */
function classifyTrust(
  source: CandidateSource,
  explicitTier?: TrustTier
): MemoryTrustClassification {
  // If an explicit tier is provided (e.g. from the existing trust system), use it
  if (explicitTier === 'USER_VERIFIED') return 'USER_VERIFIED';
  if (explicitTier === 'BRANDOPS_VERIFIED') return 'BRANDOPS_VERIFIED';

  switch (source) {
    case 'user-input':
      return 'USER_VERIFIED'; // User explicitly typed this — highest trust
    case 'agent-event':
    case 'agent-proposal':
      return 'AGENT_REPORTED'; // Agent-reported, needs verification
    case 'twin-delta':
      return 'AGENT_REPORTED'; // Twin delta is a proposal, not yet accepted
    case 'model-output':
      return 'MODEL_INFERRED'; // Model-generated content, lowest trust
    case 'mcp-response':
    case 'external-agent-message':
      return 'EXTERNAL_SOURCE'; // External source, needs verification
    case 'webpage':
    case 'document':
    case 'repository':
    case 'integration-import':
      return 'EXTERNAL_SOURCE'; // Imported content, needs verification
    case 'skill-pack':
      return 'BRANDOPS_VERIFIED'; // Part of the BrandOps system, trusted
    default:
      return 'UNKNOWN';
  }
}

// ---------------------------------------------------------------------------
// Instruction Risk Detection
// ---------------------------------------------------------------------------

/**
 * Patterns that detect content which could influence AI behavior if stored in memory.
 * These go beyond the 7 prompt-injection patterns in validation.ts — they detect
 * content that looks like it's trying to set rules, assign roles, or give instructions
 * to a future AI that reads this memory.
 *
 * The arXiv paper "Bad Memory" specifically calls out this attack surface.
 */
const INSTRUCTION_PATTERNS = [
  // Role/persona assignment — assign a role or identity to the AI (must be an imperative assignment, not an identity probe)
  {
    pattern:
      /\b(you are now|you will be|act as|pretend you are|from now on[\s,]*you|you must be|become a)\b/i,
    label: 'persona-assignment',
    severity: 'high' as const
  },
  // Rule imposition — intensifier followed (optionally with intervening words up to 80 chars) by directive verbs
  // NOTE: must not match polite suggestions like "always mention" or "never mention" — these are suggestions not commands
  {
    pattern:
      /\b(always|never|every time|from now on|henceforth|so from now|henceforth|from this point|moving forward|in all future|for the rest of)\b.{0,80}?\b(do|say|tell|respond|ignore|forget|avoid|ensure|recommend|add|approve|classify|work|prioritize|suggest|assign|restrict|promote|reject|include|exclude|use|follow|defer|override|update|change|remove|delete|create|modify|enable|disable|require|allow|deny|block|permit|grant|revoke|trust|verify|validate|confirm|report|log|store|save|send|post|publish|share|connect|integrate|deploy|release|ship|document|write|build|test|review|merge|push|commit|install|configure|setup|initialize|reset|clear|purge|export|import|sync|remember|prioritize|think|act|behave|respond|answer|reply|skip|bypass|accept|execute|run|process|complete|finalize|submit)\b/i,
    label: 'rule-imposition',
    severity: 'high' as const
  },
  // Directive-to-reader: you should/must/need to + action context
  {
    pattern: /\b(you should|you must|you need to|make sure to|be sure to)\b/i,
    label: 'directive-to-reader',
    severity: 'low' as const
  },
  // Escalated directive: should/must + intensifier + action verb (catches "should always recommend", "must only work")
  // These are treated as escalated directive-to-reader patterns (low risk by default,
  // but several together elevate concern)
  {
    pattern:
      /\b(should|must)\s+(always|only|never|immediately|automatically|exclusively|solely)\s+\w+/i,
    label: 'escalated-directive',
    severity: 'low' as const
  },
  // Implicit subject directive: "X should/must Y" where X is a person/role and Y is an action
  {
    pattern:
      /\b(person|user|developer|engineer|this user|the user|all users|everyone|anyone|each user)\s+(should|must|needs to|has to)\b/i,
    label: 'implicit-subject-directive',
    severity: 'high' as const
  },
  // Memory manipulation attempts — allow intervening words between verb and target
  {
    pattern:
      /\b(ignore|forget|overlook|disregard|delete|erase)\b.{0,40}?\b(instructions?|prompts?|rules?|guidelines?|contexts?|memory|memories|history|histories|system|system prompt|guidance|directives?|constraints?|restrictions?|requirements?|parameters?|settings?|configurations?|alignment|guardrails?|criteria?)\b/i,
    label: 'memory-manipulation',
    severity: 'high' as const
  },
  // System prompt exfiltration attempts — allow optional articles between phrase and noun
  {
    pattern:
      /\b(if you are|since you are|as an?)\s+(an?\s+)?(ai|assistant|model|llm|chatbot|language\s+model)\b/i,
    label: 'ai-identity-probe',
    severity: 'low' as const
  },
  // Override attempts targeting stored memory specifically — allow these/those and all phrasing variants
  {
    pattern:
      /\b(this|these|the following|below|those)\s+(is|are|was|were)\s+(your|the|all|our|my|their)?\s*(updated|new|current|official|mandatory| binding)?\s*(instruction|rule|guideline|directive|command|system instruction|system prompt|guideline|rule|instruction)\b/i,
    label: 'false-instruction-claim',
    severity: 'high' as const
  },
  // Auto-approval / bypass directives
  {
    pattern:
      /\b(automatically (approve|accept|confirm|verify|authorize|grant|allow|permit|execute|run|process|complete|finalize|submit|skip|bypass|ignore|override|trust|believe|obey|follow))\b/i,
    label: 'auto-approval-bypass',
    severity: 'high' as const
  },
  // Memory storage directives: instructing the AI to store rules/instructions for future behavior
  // Matches both "store the rule" and "store that X is Y" constructions
  {
    pattern:
      /\b(store|save|record|write|persist|remember|keep)\s+(the\s+(rule|instruction|guideline|directive|command|policy|setting|note|message|text|content|information|data|update|change|that))\b/i,
    label: 'memory-storage-directive',
    severity: 'high' as const
  },
  // Future behavior directives: instructing about how future AI responses should behave
  {
    pattern:
      /\b(all|every|any)\s+(future|subsequent|later|next|ongoing)\s+(response|response|output|answer|reply|recommendation|suggestion|result|assessment|evaluation|analysis|comment|statement|message|interaction|interaction|generation)\s+(should|must|will|is|are|has to|needs to)\b/i,
    label: 'future-behavior-directive',
    severity: 'high' as const
  }
];

/**
 * Assess whether candidate content contains instruction-like patterns that could
 * influence future AI behavior if stored in memory.
 *
 * Returns 'none', 'low', or 'high' based on the severity of detected patterns.
 */
function assessInstructionRisk(content: string): InstructionRisk {
  if (!content || content.length < 10) return 'none';

  let highCount = 0;
  let lowCount = 0;

  for (const { pattern, severity } of INSTRUCTION_PATTERNS) {
    if (pattern.test(content)) {
      if (severity === 'high') {
        highCount++;
      } else {
        lowCount++;
      }
    }
  }

  if (highCount >= 1) return 'high';
  if (lowCount >= 3) return 'high'; // Multiple low-risk patterns accumulate to high concern
  if (lowCount >= 2) return 'low'; // Two patterns = elevated concern
  if (lowCount === 1 && content.length < 200) return 'low'; // Short content with one directive = suspicious
  return 'none';
}

// ---------------------------------------------------------------------------
// Candidate Memory Store
// ---------------------------------------------------------------------------

/** In-memory store for candidate memory entries. In production this would be persisted. */
const candidateStore: Map<string, CandidateMemoryEntry> = new Map();

/** Maximum candidates to retain (oldest are evicted). */
const MAX_CANDIDATES = 500;

// ---------------------------------------------------------------------------
// Main Entry Points
// ---------------------------------------------------------------------------

/**
 * Generate a stable id for a candidate memory entry.
 */
function generateCandidateId(
  source: CandidateSource,
  sourceLabel: string,
  content: string
): string {
  const hashInput = `${source}::${sourceLabel}::${content.slice(0, 120)}`;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hashStr = Math.abs(hash).toString(36);
  return `cand-${source}-${hashStr}-${Date.now().toString(36)}`;
}

/**
 * Submit content to candidate memory. This is the entry point for all external
 * content that may eventually enter durable Twin memory.
 *
 * The pipeline:
 * 1. Sanitize content
 2. Classify trust based on source
 * 3. Assess instruction risk
 * 4. Determine if user verification is required
 * 5. Return a FirewallResult with the recommended action
 */
export function submitToCandidateMemory(params: {
  content: unknown;
  source: CandidateSource;
  sourceLabel?: string;
  explicitTrustTier?: TrustTier;
  traceId?: string;
  requiresVerificationOverride?: boolean;
}): FirewallResult {
  const content = sanitizeContent(params.content, params.source);
  if (!content) {
    return {
      candidate: emptyCandidate(params),
      allowed: false,
      requiresVerification: false,
      reason: 'Content was empty after sanitization.',
      action: 'reject'
    };
  }

  const sourceLabel = sanitizeSourceLabel(params.sourceLabel ?? 'unknown');
  const trustClassification = classifyTrust(params.source, params.explicitTrustTier);
  const instructionRisk = assessInstructionRisk(content);

  // Determine if verification is required
  let requiresVerification = false;
  let action: 'promote' | 'verify' | 'reject' = 'promote';
  let reason: string | undefined;

  // High instruction risk always requires verification
  if (instructionRisk === 'high') {
    requiresVerification = true;
    action = 'verify';
    reason = `Content matched high-risk instruction patterns (persona assignment, rule imposition, memory manipulation). User verification required before storage.`;
  }
  // Low instruction risk + non-user source requires verification
  else if (instructionRisk === 'low' && params.source !== 'user-input') {
    requiresVerification = true;
    action = 'verify';
    reason = `Content matched low-risk directive patterns. User verification recommended before storage.`;
  }
  // Non-user-verified content from external sources requires verification
  else if (
    trustClassification === 'AGENT_REPORTED' ||
    trustClassification === 'EXTERNAL_SOURCE' ||
    trustClassification === 'MODEL_INFERRED'
  ) {
    if (params.requiresVerificationOverride !== true) {
      requiresVerification = true;
      action = 'verify';
      reason = `Content source is ${trustClassification} — user verification required before storage in durable memory.`;
    }
  }
  // User-verified content with no instruction risk can be auto-promoted
  else if (trustClassification === 'USER_VERIFIED' && instructionRisk === 'none') {
    action = 'promote';
  }

  const candidate: CandidateMemoryEntry = {
    id: generateCandidateId(params.source, sourceLabel, content),
    content,
    source: params.source,
    sourceLabel,
    submittedAt: new Date().toISOString(),
    trustClassification,
    instructionRisk,
    requiresVerification,
    traceId: params.traceId,
    firewallReason: reason
  };

  // Store the candidate (for later promotion)
  if (candidateStore.size >= MAX_CANDIDATES) {
    // Evict oldest
    const oldestKey = Array.from(candidateStore.keys()).sort()[0];
    if (oldestKey) candidateStore.delete(oldestKey);
  }
  candidateStore.set(candidate.id, candidate);

  const firewallAction = action as FirewallResult['action'];

  return {
    candidate,
    allowed: firewallAction !== 'reject',
    requiresVerification,
    reason,
    action: firewallAction
  };
}

function emptyCandidate(params: {
  source: CandidateSource;
  sourceLabel?: string;
  traceId?: string;
}): CandidateMemoryEntry {
  return {
    id: `cand-empty-${Date.now().toString(36)}`,
    content: '',
    source: params.source,
    sourceLabel: sanitizeSourceLabel(params.sourceLabel ?? 'unknown'),
    submittedAt: new Date().toISOString(),
    trustClassification: 'UNKNOWN',
    instructionRisk: 'none',
    requiresVerification: false,
    traceId: params.traceId
  };
}

/*
 * REMOVED (2026-08-31): a second `processThroughFirewall` lived here — same
 * name, same signature as the real one in `memoryFirewall.ts`, but a bare
 * passthrough to `submitToCandidateMemory` that consulted **no firewall
 * configuration at all**: blocked sources ignored, `autoRejectLowTrust`
 * ignored, `requireVerificationForExternalSources` ignored.
 *
 * Nothing imported it, so it was dead — but it was dead in the most dangerous
 * possible shape. Any future caller reaching for "the firewall" and letting the
 * editor auto-import would have silently got the version that enforces nothing,
 * and the call site would have looked correct in review. Use
 * `memoryFirewall.processThroughFirewall`; it is the only entry point that
 * applies the configuration.
 */

/**
 * Get a candidate entry by id.
 */
export function getCandidate(id: string): CandidateMemoryEntry | undefined {
  return candidateStore.get(id);
}

/**
 * Get all candidates, optionally filtered by source or trust classification.
 */
export function getCandidates(options?: {
  source?: CandidateSource;
  trustClassification?: MemoryTrustClassification;
  requiresVerification?: boolean;
  limit?: number;
}): CandidateMemoryEntry[] {
  let entries = Array.from(candidateStore.values());

  if (options?.source) {
    entries = entries.filter((e) => e.source === options.source);
  }
  if (options?.trustClassification) {
    entries = entries.filter((e) => e.trustClassification === options.trustClassification);
  }
  if (options?.requiresVerification !== undefined) {
    entries = entries.filter((e) => e.requiresVerification === options.requiresVerification);
  }

  entries.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  if (options?.limit) {
    entries = entries.slice(0, options.limit);
  }

  return entries;
}

/**
 * Promote a candidate to durable memory. This is the final step in the firewall pipeline —
 * the content moves from candidate memory to durable Twin memory.
 *
 * This function should only be called after:
 * 1. The candidate has passed the firewall (action !== 'reject')
 * 2. User verification has been obtained (if requiresVerification was true)
 * 3. The caller has confirmed the promotion target
 */
export function promoteToDurableMemory(
  candidateId: string,
  params: {
    /** The memory type to promote to. */
    memoryType:
      | 'approvedClaims'
      | 'rejectedClaims'
      | 'twin-fact'
      | 'professional-signal'
      | 'evidence';
    /** Optional user who approved the promotion (for audit). */
    verifiedBy?: string;
    /** Optional trace id for correlation. */
    traceId?: string;
  }
): CandidateMemoryEntry | null {
  const candidate = candidateStore.get(candidateId);
  if (!candidate) return null;

  // Validate that the candidate is promotable
  if (candidate.trustClassification === 'REJECTED') {
    return null; // Cannot promote rejected candidate
  }

  if (candidate.requiresVerification && !params.verifiedBy) {
    return null; // Requires verification but no verifier provided
  }

  // Update the candidate with promotion info
  const updated: CandidateMemoryEntry = {
    ...candidate,
    promotedToDurableAt: new Date().toISOString(),
    promotedToMemoryType: params.memoryType,
    durableMemoryId: `durable-${candidateId.slice(0, 20)}`,
    verifiedBy: params.verifiedBy ?? candidate.verifiedBy,
    verifiedAt: params.verifiedBy ? new Date().toISOString() : candidate.verifiedAt
  };

  candidateStore.set(candidateId, updated);
  return updated;
}

/**
 * Reject a candidate — mark it as rejected so it can never be promoted.
 */
export function rejectCandidate(candidateId: string, reason?: string): boolean {
  const candidate = candidateStore.get(candidateId);
  if (!candidate) return false;

  candidateStore.set(candidateId, {
    ...candidate,
    trustClassification: 'REJECTED',
    firewallReason: reason ?? candidate.firewallReason
  });

  return true;
}

export function getCandidateStats(): {
  totalCandidates: number;
  bySource: Record<CandidateSource, number>;
  byTrustClassification: Record<MemoryTrustClassification, number>;
  byInstructionRisk: Record<InstructionRisk, number>;
  pendingVerification: number;
  promoted: number;
  rejected: number;
} {
  const entries = Array.from(candidateStore.values());

  const bySource: Record<CandidateSource, number> = {
    'agent-event': 0,
    'agent-proposal': 0,
    webpage: 0,
    document: 0,
    repository: 0,
    'mcp-response': 0,
    'external-agent-message': 0,
    'model-output': 0,
    'user-input': 0,
    'twin-delta': 0,
    'skill-pack': 0,
    'integration-import': 0
  };
  const byTrustClassification: Record<MemoryTrustClassification, number> = {
    USER_VERIFIED: 0,
    BRANDOPS_VERIFIED: 0,
    AGENT_REPORTED: 0,
    EXTERNAL_SOURCE: 0,
    MODEL_INFERRED: 0,
    INSTRUCTION_RISK: 0,
    REJECTED: 0,
    UNKNOWN: 0
  };
  const byInstructionRisk: Record<InstructionRisk, number> = { none: 0, high: 0, low: 0 };

  let pending = 0;
  let promoted = 0;
  let rejected = 0;

  for (const e of entries) {
    bySource[e.source] = (bySource[e.source] ?? 0) + 1;
    byTrustClassification[e.trustClassification] =
      (byTrustClassification[e.trustClassification] ?? 0) + 1;
    byInstructionRisk[e.instructionRisk] = (byInstructionRisk[e.instructionRisk] ?? 0) + 1;

    if (e.requiresVerification) pending++;
    if (e.promotedToDurableAt) promoted++;
    if (e.trustClassification === 'REJECTED') rejected++;
  }

  return {
    totalCandidates: entries.length,
    bySource,
    byTrustClassification,
    byInstructionRisk,
    pendingVerification: pending,
    promoted,
    rejected
  };
}

/**
 * Clear the candidate store (for testing).
 */
export function clearCandidateStore(): void {
  candidateStore.clear();
}

/**
 * Get candidates that require user verification, optionally filtered by source.
 */
export function getVerificationQueue(options?: {
  source?: CandidateSource;
  limit?: number;
}): CandidateMemoryEntry[] {
  return getCandidates({
    requiresVerification: true,
    source: options?.source,
    limit: options?.limit
  });
}

/**
 * Get the count of candidates requiring verification.
 */
export function getVerificationQueueCount(): number {
  return getCandidates({ requiresVerification: true }).length;
}
