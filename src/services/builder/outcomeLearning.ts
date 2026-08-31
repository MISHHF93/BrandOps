/**
 * Outcome → Learning — scores outcomes and feeds back into future context/policy.
 *
 * Learns from: successful Plans, failed Plans, user corrections, accepted
 * recommendations, dismissed recommendations, verified outcomes, explicit
 * preferences.
 *
 * Do NOT infer permanent preference from one action.
 * Do NOT silently modify verified identity.
 * Learning must be inspectable/correctable.
 */

import type { BrandOpsData } from '../../types/domain';

// ---------------------------------------------------------------------------
// Outcome scoring
// ---------------------------------------------------------------------------

export interface OutcomeScore {
  /** Which dimension was scored */
  dimension: OutcomeDimension;
  /** Score 0-1 */
  score: number;
  /** Why this score */
  reason: string;
  /** When scored */
  scoredAt: string;
}

export type OutcomeDimension =
  | 'plan-completion-rate'
  | 'plan-success-rate'
  | 'approval-ease'
  | 'tool-effectiveness'
  | 'context-relevance'
  | 'twin-accuracy'
  | 'opportunity-value'
  | 'user-correction-frequency';

// ---------------------------------------------------------------------------
// Outcome record
// ---------------------------------------------------------------------------

export interface OutcomeRecord {
  id: string;
  workspaceId: string;
  planId?: string;
  opportunityId?: string;
  dimension: OutcomeDimension;
  score: number;
  evidence: string[];
  notedBy: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Learning signal
// ---------------------------------------------------------------------------

export interface LearningSignal {
  id: string;
  workspaceId: string;
  signalType: LearningSignalType;
  source: string;
  detail: string;
  strength: number; // 0-1, how strongly to weight this signal
  createdAt: string;
  expiresAt?: string;
}

export type LearningSignalType =
  | 'plan-completed-successfully'
  | 'plan-failed'
  | 'plan-approval-easy'
  | 'plan-approval-hard'
  | 'user-corrected'
  | 'user-accepted-recommendation'
  | 'user-dismissed-recommendation'
  | 'user-corrected-twin'
  | 'user-corrected-context'
  | 'preferred-tool'
  | 'rejected-tool'
  | 'preferred-approach'
  | 'rejected-approach';

// ---------------------------------------------------------------------------
// Learning state (stored in workspace)
// ---------------------------------------------------------------------------

export interface LearningState {
  signals: LearningSignal[];
  outcomeScores: OutcomeRecord[];
  preferenceHints: PreferenceHint[];
  updatedAt: string;
}

export interface PreferenceHint {
  id: string;
  category: string;
  key: string;
  value: string;
  confidence: number;
  source: string;
  createdAt: string;
  /** Number of times confirmed by user action */
  confirmations: number;
  /** Number of times contradicted by user action */
  contradictions: number;
}

// Default empty state
export const DEFAULT_LEARNING_STATE: LearningState = {
  signals: [],
  outcomeScores: [],
  preferenceHints: [],
  updatedAt: new Date().toISOString()
};

// ---------------------------------------------------------------------------
// Record outcome
// ---------------------------------------------------------------------------

export function recordOutcome(input: {
  workspace: BrandOpsData;
  planId?: string;
  dimension: OutcomeDimension;
  score: number;
  evidence?: string[];
  notedBy: string;
}): BrandOpsData {
  const timestamp = new Date().toISOString();
  const record: OutcomeRecord = {
    id: `outcome-${timestamp.slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: input.workspace.builderActivity?.workspaceId ?? 'default',
    planId: input.planId,
    dimension: input.dimension,
    score: Math.max(0, Math.min(1, input.score)),
    evidence: input.evidence ?? [],
    notedBy: input.notedBy,
    createdAt: timestamp
  };

  const existing = input.workspace.builderActivity?.outcomeScores ?? [];
  const updated = [record, ...existing].slice(0, 200);

  return {
    ...input.workspace,
    builderActivity: {
      ...(input.workspace.builderActivity ?? { events: [], workspaceId: 'default' }),
      outcomeScores: updated,
      updatedAt: timestamp
    }
  };
}

// ---------------------------------------------------------------------------
// Record learning signal
// ---------------------------------------------------------------------------

export function recordLearningSignal(input: {
  workspace: BrandOpsData;
  signalType: LearningSignalType;
  source: string;
  detail: string;
  strength?: number;
}): BrandOpsData {
  const timestamp = new Date().toISOString();
  const signal: LearningSignal = {
    id: `signal-${timestamp.slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: input.workspace.builderActivity?.workspaceId ?? 'default',
    signalType: input.signalType,
    source: input.source,
    detail: input.detail,
    strength: input.strength ?? 0.5,
    createdAt: timestamp,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
  };

  const existing = input.workspace.builderActivity?.signals ?? [];
  const updated = [signal, ...existing].slice(0, 500);

  // Also update preference hints based on signals
  const hints = updatePreferenceHints(input.workspace, signal);

  return {
    ...input.workspace,
    builderActivity: {
      ...(input.workspace.builderActivity ?? { events: [], workspaceId: 'default' }),
      signals: updated,
      preferenceHints: hints,
      updatedAt: timestamp
    }
  };
}

// ---------------------------------------------------------------------------
// Preference hint management
// ---------------------------------------------------------------------------

function updatePreferenceHints(workspace: BrandOpsData, signal: LearningSignal): PreferenceHint[] {
  const existing = workspace.builderActivity?.preferenceHints ?? [];
  const key = `${signal.signalType}:${signal.detail.slice(0, 80)}`;
  const index = existing.findIndex((h) => h.key === key);

  if (index >= 0) {
    const updated = [...existing];
    const wasAccepted =
      signal.signalType.includes('accepted') || signal.signalType.includes('success');
    const wasRejected =
      signal.signalType.includes('rejected') ||
      signal.signalType.includes('failed') ||
      signal.signalType.includes('corrected') ||
      signal.signalType.includes('dismissed');
    // Compute the *new* counts first, then derive confidence from those new counts
    // so a confirmation actually raises confidence (previous code read the stale
    // pre-increment values for the confidence computation).
    const nextConfirmations = updated[index].confirmations + (wasAccepted ? 1 : 0);
    const nextContradictions = updated[index].contradictions + (wasRejected ? 1 : 0);
    updated[index] = {
      ...updated[index],
      confirmations: nextConfirmations,
      contradictions: nextContradictions,
      confidence: computeConfidence(nextConfirmations, nextContradictions)
    };
    return updated.slice(0, 200);
  }

  // New signal → new hint
  const hint: PreferenceHint = {
    id: `hint-${signal.createdAt.slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`,
    category: signal.signalType.split('-')[0],
    key,
    value: signal.detail.slice(0, 200),
    confidence: computeConfidence(1, 0) * signal.strength,
    source: signal.source,
    createdAt: signal.createdAt,
    confirmations: signal.signalType.includes('accepted') || signal.signalType.includes('success') ? 1 : 0,
    contradictions: signal.signalType.includes('rejected') || signal.signalType.includes('failed') || signal.signalType.includes('corrected') || signal.signalType.includes('dismissed') ? 1 : 0
  };

  return [...existing, hint].slice(0, 200);
}

function computeConfidence(confirmations: number, contradictions: number): number {
  if (confirmations === 0 && contradictions === 0) return 0.5;
  const net = confirmations - contradictions;
  return Math.max(0, Math.min(1, 0.5 + net * 0.1));
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getRecentLearningSignals(workspace: BrandOpsData, limit = 20): LearningSignal[] {
  return (workspace.builderActivity?.signals ?? []).slice(0, limit);
}

export function getOutcomeScoresByDimension(workspace: BrandOpsData, dimension: OutcomeDimension): OutcomeRecord[] {
  return (workspace.builderActivity?.outcomeScores ?? []).filter((o) => o.dimension === dimension);
}

export function getAverageOutcomeScore(workspace: BrandOpsData, dimension: OutcomeDimension): number {
  const scores = getOutcomeScoresByDimension(workspace, dimension);
  if (scores.length === 0) return 0.5;
  const sum = scores.reduce((a, b) => a + b.score, 0);
  return sum / scores.length;
}

export function getPreferenceHints(workspace: BrandOpsData, category?: string): PreferenceHint[] {
  const hints = workspace.builderActivity?.preferenceHints ?? [];
  if (!category) return hints;
  return hints.filter((h) => h.category === category);
}

// ---------------------------------------------------------------------------
// Decay expired signals
// ---------------------------------------------------------------------------

export function decayExpiredSignals(workspace: BrandOpsData): BrandOpsData {
  const now = new Date();
  const existing = workspace.builderActivity?.signals ?? [];
  const updated = existing.filter((s) => {
    if (!s.expiresAt) return true;
    return new Date(s.expiresAt) > now;
  });

  return {
    ...workspace,
    builderActivity: {
      ...(workspace.builderActivity ?? { events: [], workspaceId: 'default' }),
      signals: updated,
      updatedAt: now.toISOString()
    }
  };
}
