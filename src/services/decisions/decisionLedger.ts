/**
 * Decision Ledger — unified, first-class decisions with supersedes, goal, and systematic prevention.
 *
 * P0-4 from BRANDOPS_NEXT_CAPABILITIES.md.
 *
 * Existing: WorkspaceDecisionMemoryEntry is derived from Twin claims, AI artifacts, operator traces.
 * Missing: explicit Decision type with supersedes/goal/timestamp, explicit decision creation on user actions,
 * systematic consultation by recommendation engines.
 */

// ---------------------------------------------------------------------------
// Decision Type (unified, first-class)
// ---------------------------------------------------------------------------

/** A first-class decision record with full provenance. */
export interface Decision {
  /** Stable id. */
  id: string;
  /** Decision type/category. */
  type: DecisionType;
  /** The decision: approved, rejected, deferred. */
  polarity: 'approved' | 'rejected' | 'deferred';
  /** Human-readable title. */
  title: string;
  /** Detailed description. */
  description: string;
  /** Why this decision was made. */
  reason: string;
  /** Source of the decision (e.g. 'user-via-proposal', 'user-via-signal', 'user-via-plan'). */
  source: string;
  /** Additional source detail (e.g. proposal id, signal id, plan id). */
  sourceDetail?: string;
  /** Timestamp of the decision (ISO). */
  timestamp: string;
  /** Which goal this decision serves or rejects (optional). */
  goal?: string;
  /** Previous decisions this supersedes (by id). */
  supersedes: string[];
  /** Decisions that supersede this one (by id). */
  supersededBy: string[];
  /** Confidence in the decision (0-1). */
  confidence: number;
  /** Workspace id. */
  workspaceId: string;
  /** Trace id for correlation (if available). */
  traceId?: string;
}

/** Decision types. */
export type DecisionType =
  | 'positioning'
  | 'target-audience'
  | 'content-direction'
  | 'project-priority'
  | 'strategy'
  | 'twin-update'
  | 'signal-acceptance'
  | 'artifact-approval'
  | 'plan-approval'
  | 'rejected-strategy'
  | 'goal-related';

/** Decision status for quick checks. */
export type DecisionPolarity = Decision['polarity'];

// ---------------------------------------------------------------------------
// Decision Store
// ---------------------------------------------------------------------------

/** Persisted decisions for a workspace. */
export interface DecisionStore {
  /** All decisions (capped). */
  decisions: Decision[];
  /** Max decisions to retain. */
  maxDecisions: number;
  /** Updated at. */
  updatedAt: string;
}

/** Default max decisions. */
const MAX_DECISIONS = 200;

/** In-memory store for decisions (would be persisted in production). */
const decisionStores: Map<string, DecisionStore> = new Map();

// ---------------------------------------------------------------------------
// Decision Creation
// ---------------------------------------------------------------------------

/**
 * Generate a decision id.
 */
function generateDecisionId(partial: Pick<Decision, 'type' | 'title' | 'workspaceId'>): string {
  const hashInput = `${partial.type}::${partial.title.slice(0, 80)}::${partial.workspaceId}`;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `dec-${Math.abs(hash).toString(36)}-${Date.now().toString(36)}`;
}

/**
 * Create a new decision and add it to the store.
 */
export function createDecision(params: {
  type: DecisionType;
  polarity: DecisionPolarity;
  title: string;
  description: string;
  reason: string;
  source: string;
  sourceDetail?: string;
  goal?: string;
  supersedes?: string[];
  confidence?: number;
  workspaceId: string;
  traceId?: string;
}): Decision {
  const now = new Date().toISOString();
  const decision: Decision = {
    id: generateDecisionId({
      type: params.type,
      title: params.title,
      workspaceId: params.workspaceId
    }),
    type: params.type,
    polarity: params.polarity,
    title: params.title,
    description: params.description,
    reason: params.reason,
    source: params.source,
    sourceDetail: params.sourceDetail,
    timestamp: now,
    goal: params.goal,
    supersedes: params.supersedes ?? [],
    supersededBy: [],
    confidence: params.confidence ?? 0.85,
    workspaceId: params.workspaceId,
    traceId: params.traceId
  };

  // Add to store
  const store = getOrCreateStore(params.workspaceId);
  decisionStores.set(params.workspaceId, {
    decisions: [decision, ...store.decisions].slice(0, MAX_DECISIONS),
    maxDecisions: MAX_DECISIONS,
    updatedAt: now
  });

  return decision;
}

/**
 * Create a decision from a Twin proposal (approve/reject).
 */
export function createDecisionFromTwinProposal(params: {
  proposalId: string;
  proposalTitle: string;
  proposalKind: 'twin_update' | 'artifact' | 'content_opportunity' | 'external_action';
  polarity: 'approved' | 'rejected';
  reason: string;
  goal?: string;
  workspaceId: string;
  traceId?: string;
}): Decision {
  const decisionType =
    params.proposalKind === 'twin_update'
      ? 'twin-update'
      : params.proposalKind === 'artifact'
        ? 'artifact-approval'
        : params.proposalKind === 'content_opportunity'
          ? 'content-direction'
          : 'strategy';

  return createDecision({
    type: decisionType,
    polarity: params.polarity,
    title: params.proposalTitle,
    description: `Decision on ${params.proposalKind}: ${params.proposalTitle}`,
    reason: params.reason,
    source: 'user-via-proposal',
    sourceDetail: params.proposalId,
    goal: params.goal,
    workspaceId: params.workspaceId,
    traceId: params.traceId
  });
}

/**
 * Create a decision from a professional signal (accept/reject).
 */
export function createDecisionFromSignal(params: {
  signalId: string;
  signalClaim: string;
  polarity: 'approved' | 'rejected';
  reason: string;
  goal?: string;
  workspaceId: string;
  traceId?: string;
}): Decision {
  return createDecision({
    type: 'signal-acceptance',
    polarity: params.polarity,
    title: params.signalClaim,
    description: `Decision on professional signal: ${params.signalClaim}`,
    reason: params.reason,
    source: 'user-via-signal',
    sourceDetail: params.signalId,
    goal: params.goal,
    workspaceId: params.workspaceId,
    traceId: params.traceId
  });
}

/**
 * Create a decision from a plan rejection.
 */
export function createDecisionFromPlanRejection(params: {
  planId: string;
  planTitle: string;
  reason: string;
  goal?: string;
  workspaceId: string;
  traceId?: string;
}): Decision {
  return createDecision({
    type: 'rejected-strategy',
    polarity: 'rejected',
    title: params.planTitle,
    description: `Plan rejected: ${params.planTitle}`,
    reason: params.reason,
    source: 'user-via-plan',
    sourceDetail: params.planId,
    goal: params.goal,
    workspaceId: params.workspaceId,
    traceId: params.traceId
  });
}

// ---------------------------------------------------------------------------
// Decision Query
// ---------------------------------------------------------------------------

/**
 * Get the decision store for a workspace.
 */
export function getDecisionStore(workspaceId: string): DecisionStore {
  return getOrCreateStore(workspaceId);
}

function getOrCreateStore(workspaceId: string): DecisionStore {
  const existing = decisionStores.get(workspaceId);
  if (existing) return existing;
  const store: DecisionStore = {
    decisions: [],
    maxDecisions: MAX_DECISIONS,
    updatedAt: new Date().toISOString()
  };
  decisionStores.set(workspaceId, store);
  return store;
}

/**
 * Get a decision by id.
 */
export function getDecision(workspaceId: string, decisionId: string): Decision | undefined {
  const store = getDecisionStore(workspaceId);
  return store.decisions.find((d) => d.id === decisionId);
}

/**
 * Get all decisions for a workspace.
 */
export function getAllDecisions(workspaceId: string): Decision[] {
  return getDecisionStore(workspaceId).decisions;
}

/**
 * Get decisions of a specific type.
 */
export function getDecisionsByType(workspaceId: string, type: DecisionType): Decision[] {
  return getDecisionStore(workspaceId).decisions.filter((d) => d.type === type);
}

/**
 * Get decisions that the user has rejected.
 */
export function getRejectedDecisions(workspaceId: string): Decision[] {
  return getDecisionStore(workspaceId).decisions.filter((d) => d.polarity === 'rejected');
}

/**
 * Get decisions that the user has approved.
 */
export function getApprovedDecisions(workspaceId: string): Decision[] {
  return getDecisionStore(workspaceId).decisions.filter((d) => d.polarity === 'approved');
}

/**
 * Check if the user has rejected a decision in a specific topic area.
 * This is the key function for preventing re-recommendation of rejected items.
 */
export function hasUserRejected(
  workspaceId: string,
  topic: string,
  options?: {
    /** Specific strategy or approach that was rejected (optional). */
    strategy?: string;
    /** If true, only match exact strategy, not just topic. */
    exactMatch?: boolean;
  }
): boolean {
  const rejected = getRejectedDecisions(workspaceId);

  for (const decision of rejected) {
    // Check type match
    if (decision.type === 'rejected-strategy' || decision.type === topic) {
      if (options?.exactMatch && options.strategy) {
        // Exact match on strategy
        if (
          decision.description.toLowerCase().includes(options.strategy.toLowerCase()) ||
          decision.title.toLowerCase().includes(options.strategy.toLowerCase())
        ) {
          return true;
        }
      } else {
        // Topic match — check if the decision title or description relates to this topic
        const topicLower = topic.toLowerCase();
        if (
          decision.title.toLowerCase().includes(topicLower) ||
          decision.description.toLowerCase().includes(topicLower)
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Get decision history for a topic (both approved and rejected).
 */
export function getDecisionHistory(workspaceId: string, topic: string): Decision[] {
  const all = getAllDecisions(workspaceId);
  const topicLower = topic.toLowerCase();

  return all
    .filter(
      (d) =>
        d.title.toLowerCase().includes(topicLower) ||
        d.description.toLowerCase().includes(topicLower) ||
        d.goal?.toLowerCase().includes(topicLower)
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ---------------------------------------------------------------------------
// Decision Supersession
// ---------------------------------------------------------------------------

/**
 * Mark a decision as superseded by another decision.
 */
export function supersedeDecision(
  workspaceId: string,
  decisionId: string,
  supersedingDecisionId: string
): boolean {
  const store = getDecisionStore(workspaceId);
  const decision = store.decisions.find((d) => d.id === decisionId);
  const superseding = store.decisions.find((d) => d.id === supersedingDecisionId);

  if (!decision || !superseding) return false;

  // Update the superseded decision
  decision.supersededBy.push(supersedingDecisionId);

  // Update the superseding decision
  superseding.supersedes.push(decisionId);

  return true;
}

// ---------------------------------------------------------------------------
// Decision Export / Import (for persistence)
// ---------------------------------------------------------------------------

/**
 * Export decisions for a workspace as a JSON-serializable object.
 */
export function exportDecisions(workspaceId: string): DecisionStore {
  return getDecisionStore(workspaceId);
}

/**
 * Import decisions into a workspace.
 */
export function importDecisions(workspaceId: string, store: DecisionStore): void {
  decisionStores.set(workspaceId, {
    decisions: store.decisions,
    maxDecisions: store.maxDecisions,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Clear all decisions for a workspace (testing only).
 */
export function clearDecisions(workspaceId: string): void {
  decisionStores.delete(workspaceId);
}
