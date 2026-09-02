/**
 * Explain Why Now — generates concise "why now" narratives for proactive recommendations.
 *
 * P0-8 from BRANDOPS_NEXT_CAPABILITIES.md.
 *
 * Every proactive card/row should answer: why is BrandOps surfacing this now?
 * Evidence includes: recent activity, goal priority, missing artifacts, etc.
 * If the system can't explain why now, the recommendation shouldn't interrupt.
 */

import type { BrandOpsData } from '../../types/domain';
import type {
  Goal,
  OpportunityRecommendation,
  AchievementCandidate,
  ProfessionalSignal
} from '../../types/builder';

// ---------------------------------------------------------------------------
// Why Now Types
// ---------------------------------------------------------------------------

/** A "why now" explanation for a recommendation. */
export interface WhyNowExplanation {
  /** The recommendation id this explains. */
  recommendationId: string;
  /** The recommendation type. */
  recommendationType: string;
  /** Concise narrative answering "why now?" (1-3 sentences). */
  narrative: string;
  /** Evidence items supporting the narrative. */
  evidence: WhyNowEvidenceItem[];
  /** Confidence that this explanation is accurate (0-1). */
  confidence: number;
  /** Whether this recommendation should interrupt the user (based on whyNow strength). */
  shouldInterrupt: boolean;
  /** Whether the recommendation is fragile (depends on weak assumptions). */
  isFragile: boolean;
  /** If fragile, what assumption is critical. */
  criticalAssumption?: string;
}

/** A piece of evidence supporting the "why now". */
export interface WhyNowEvidenceItem {
  /** Evidence type. */
  type:
    | 'recent-activity'
    | 'goal-priority'
    | 'missing-artifact'
    | 'new-achievement'
    | 'signal-change'
    | 'plan-completion'
    | 'opportune-moment'
    | 'user-action';
  /** Description. */
  description: string;
  /** Timestamp (if applicable). */
  timestamp?: string;
  /** Weight (0-1) in the explanation. */
  weight: number;
}

// ---------------------------------------------------------------------------
// Why Now Generation
// ---------------------------------------------------------------------------

/**
 * Generate a "why now" explanation for a recommendation.
 * Uses the recommendation data plus workspace context to construct the narrative.
 */
export function buildWhyNow(params: {
  recommendation: OpportunityRecommendation | AchievementCandidate | ProfessionalSignal;
  data: BrandOpsData;
  /** Which goal(s) the recommendation relates to. */
  relatedGoals?: string[];
  /** Optional trace id for correlation. */
  traceId?: string;
}): WhyNowExplanation {
  const rec = params.recommendation;
  const data = params.data;

  // Extract context
  const achievements = (data.builderActivity?.achievements ?? []) as unknown as Array<{
    timestamp: string;
    twinSummary?: string;
  }>;
  const goals =
    params.relatedGoals
      ?.map((id) => data.builderActivity?.goals?.find((g) => g.id === id))
      .filter((g): g is Goal => Boolean(g)) ?? [];
  const plans = (data.planWorkspace?.plans ?? []) as unknown as Array<{
    id: string;
    completionStatus: string;
    status?: string;
    completedAt?: string;
    updatedAt?: string;
    title?: string;
  }>;
  const artifacts = (data.builderActivity?.artifacts ?? []) as unknown as Array<{
    id: string;
    title: string;
    status: string;
    type: string;
  }>;
  const recentActivity = (data.builderActivity?.events ?? []) as unknown as Array<{
    timestamp: string;
    type: string;
  }>;

  const evidence: WhyNowEvidenceItem[] = [];
  let shouldInterrupt = false;
  let confidence = 0.5;
  let isFragile = false;
  let criticalAssumption: string | undefined;

  const recType = getRecommendationTypeLabel(rec);
  const recTitle = getRecommendationTitle(rec);

  // Evidence 1: Recent activity (what happened lately?)
  const recentActivityEvidence = findRecentActivityEvidence(recentActivity, recType);
  if (recentActivityEvidence) {
    evidence.push(recentActivityEvidence);
    confidence += 0.1;
    shouldInterrupt = true;
  }

  // Evidence 2: Goal priority (is there a relevant goal?)
  const goalPriorityEvidence = findGoalPriorityEvidence(goals, rec);
  if (goalPriorityEvidence) {
    evidence.push(goalPriorityEvidence);
    confidence += 0.1;
    shouldInterrupt = true;
  }

  // Evidence 3: Missing artifact (is there a gap?)
  const missingArtifactEvidence = findMissingArtifactEvidence(artifacts, rec, goals);
  if (missingArtifactEvidence) {
    evidence.push(missingArtifactEvidence);
    confidence += 0.1;
    shouldInterrupt = true;
  }

  // Evidence 4: New achievement (just shipped something?)
  const newAchievementEvidence = findNewAchievementEvidence(achievements, rec);
  if (newAchievementEvidence) {
    evidence.push(newAchievementEvidence);
    confidence += 0.15;
    shouldInterrupt = true;
  }

  // Evidence 5: Signal change (has something changed recently?)
  const signalChangeEvidence = findSignalChangeEvidence(rec);
  if (signalChangeEvidence) {
    evidence.push(signalChangeEvidence);
    confidence += 0.1;
  }

  // Evidence 6: Plan completion (just finished a plan?)
  const planCompletionEvidence = findPlanCompletionEvidence(plans, rec);
  if (planCompletionEvidence) {
    evidence.push(planCompletionEvidence);
    confidence += 0.15;
    shouldInterrupt = true;
  }

  // Evidence 7: Opportune moment (timing-based)
  const opportuneMomentEvidence = findOpportuneMomentEvidence(rec, goals);
  if (opportuneMomentEvidence) {
    evidence.push(opportuneMomentEvidence);
    confidence += 0.05;
  }

  // Adjust confidence for fragility
  if (evidence.length === 0) {
    isFragile = true;
    criticalAssumption =
      'No recent activity or goal context found — recommendation is based purely on static profile data.';
    confidence = 0.1;
    shouldInterrupt = false;
  } else if (evidence.length <= 1) {
    isFragile = true;
    criticalAssumption =
      'Only one weak signal supports this recommendation — the "why now" is tenuous.';
    confidence = Math.min(confidence, 0.3);
  }

  // Build narrative
  const narrative = buildNarrative(evidence, recType, recTitle, confidence);

  return {
    recommendationId: rec.id,
    recommendationType: recType,
    narrative,
    evidence,
    confidence: Math.min(1, confidence),
    shouldInterrupt,
    isFragile,
    criticalAssumption
  };
}

/**
 * Get the type label for a recommendation.
 */
function getRecommendationTypeLabel(
  rec: OpportunityRecommendation | AchievementCandidate | ProfessionalSignal
): string {
  if ('category' in rec) return rec.category;
  if ('kind' in rec) return rec.kind;
  return 'professional-signal';
}

/**
 * Get the title for a recommendation.
 */
function getRecommendationTitle(
  rec: OpportunityRecommendation | AchievementCandidate | ProfessionalSignal
): string {
  if ('title' in rec) return rec.title;
  if ('claim' in rec) return rec.claim;
  return 'Unknown recommendation';
}

/**
 * Find recent activity evidence.
 */
function findRecentActivityEvidence(
  activities: Array<{ timestamp: string; type: string }>,
  _recType: string
): WhyNowEvidenceItem | undefined {
  // Find activities in the last 24-48 hours
  const now = Date.now();
  const recentThreshold = now - 48 * 60 * 60 * 1000;

  const recent = activities.filter((a) => new Date(a.timestamp).getTime() > recentThreshold);

  if (recent.length === 0) return undefined;

  const types = [...new Set(recent.map((a) => a.type))];

  return {
    type: 'recent-activity',
    description: `You had ${recent.length} activity event(s) in the last 48 hours${types.length > 0 ? ` (${types.join(', ')})` : ''}.`,
    timestamp: recent[0].timestamp,
    weight: 0.25
  };
}

/**
 * Find goal priority evidence.
 */
function findGoalPriorityEvidence(
  goals: Array<{ id: string; title: string; status: string; priority?: number }>,
  _rec: OpportunityRecommendation | AchievementCandidate | ProfessionalSignal
): WhyNowEvidenceItem | undefined {
  if (goals.length === 0) return undefined;

  // Check if any goal is active and high priority
  const activeHighPriority = goals.filter(
    (g) => g.status === 'active' && (!g.priority || g.priority >= 0.7)
  );

  if (activeHighPriority.length === 0) return undefined;

  const goal = activeHighPriority[0];
  return {
    type: 'goal-priority',
    description: `Your active goal "${goal.title}" is prioritized. This recommendation aligns with that goal.`,
    weight: 0.2
  };
}

/**
 * Find missing artifact evidence.
 */
function findMissingArtifactEvidence(
  artifacts: Array<{ id: string; title: string; status: string; type: string }>,
  rec: OpportunityRecommendation | AchievementCandidate | ProfessionalSignal,
  _goals: Array<{ id: string }>
): WhyNowEvidenceItem | undefined {
  // Check if there's a recommendation to create content but no corresponding artifact
  if (!('category' in rec) || rec.category !== 'content-piece-opportunity') return undefined;

  const relevantArtifacts = artifacts.filter(
    (a) => a.status !== 'published' && a.status !== 'approved'
  );

  if (relevantArtifacts.length === 0) return undefined;

  return {
    type: 'missing-artifact',
    description: `You have ${relevantArtifacts.length} draft/ideas that could be developed into published content.`,
    weight: 0.2
  };
}

/**
 * Find new achievement evidence.
 */
function findNewAchievementEvidence(
  achievements: Array<{ timestamp: string; twinSummary?: string }>,
  _rec: OpportunityRecommendation | AchievementCandidate | ProfessionalSignal
): WhyNowEvidenceItem | undefined {
  const now = Date.now();
  const recentThreshold = now - 7 * 24 * 60 * 60 * 1000;

  const recent = achievements.filter((a) => new Date(a.timestamp).getTime() > recentThreshold);

  if (recent.length === 0) return undefined;

  const count = recent.length;
  const latest = recent[0];

  return {
    type: 'new-achievement',
    description: `You accepted ${count} achievement(s) in the last 7 days. Most recent: ${latest.twinSummary ?? 'Unsummarized'}.`,
    timestamp: latest.timestamp,
    weight: 0.25
  };
}

/**
 * Find signal change evidence.
 */
function findSignalChangeEvidence(
  rec: OpportunityRecommendation | AchievementCandidate | ProfessionalSignal
): WhyNowEvidenceItem | undefined {
  // If the recommendation has a high confidence and is recent, that's a signal change
  if (rec.confidence >= 0.7) {
    return {
      type: 'signal-change',
      description: `This signal was detected with ${Math.round(rec.confidence * 100)}% confidence based on recent patterns.`,
      weight: 0.15
    };
  }

  return undefined;
}

/**
 * Find plan completion evidence.
 */
function findPlanCompletionEvidence(
  plans: Array<{
    id: string;
    completionStatus: string;
    status?: string;
    completedAt?: string;
    updatedAt?: string;
    title?: string;
  }>,
  _rec: OpportunityRecommendation | AchievementCandidate | ProfessionalSignal
): WhyNowEvidenceItem | undefined {
  const completedPlans = plans.filter(
    (p) =>
      p.completionStatus === 'completed' ||
      p.status === 'completed' ||
      p.status === 'executed' ||
      p.status === 'verified'
  );

  if (completedPlans.length === 0) return undefined;

  const latest = completedPlans[completedPlans.length - 1];

  return {
    type: 'plan-completion',
    description: `You recently completed a plan${latest.title ? ` ("${latest.title}")` : ''}. This creates momentum for the next step.`,
    timestamp: latest.completedAt ?? latest.updatedAt,
    weight: 0.2
  };
}

/**
 * Find opportune moment evidence.
 */
function findOpportuneMomentEvidence(
  rec: OpportunityRecommendation | AchievementCandidate | ProfessionalSignal,
  goals: Array<{ id: string; status: string }>
): WhyNowEvidenceItem | undefined {
  if (!('expectedValue' in rec)) return undefined;
  // Check if the recommendation is high-value and there's an active goal
  const activeGoals = goals.filter((g) => g.status === 'active');

  if (activeGoals.length === 0) return undefined;
  if (rec.expectedValue < 0.6) return undefined;

  return {
    type: 'opportune-moment',
    description: `This is a high-value opportunity (${Math.round(rec.expectedValue * 100)}% expected value) and you have active goals.`,
    weight: 0.1
  };
}

/**
 * Build the narrative from evidence items.
 */
function buildNarrative(
  evidence: WhyNowEvidenceItem[],
  recType: string,
  recTitle: string,
  confidence: number
): string {
  if (evidence.length === 0) {
    return `BrandOps is surfacing this ${recType} recommendation (${recTitle}) based on static profile data. No recent activity or goal context was found to explain why now — this recommendation may not warrant interruption.`;
  }

  // Sort evidence by weight
  const sorted = [...evidence].sort((a, b) => b.weight - a.weight);

  // Take the top 2-3 pieces
  const topEvidence = sorted.slice(0, 3);

  const parts = topEvidence.map((e) => {
    const weightIndicator = e.weight >= 0.2 ? 'Key insight:' : 'Also:';
    return `${weightIndicator} ${e.description}`;
  });

  let narrative = `Why now: ${parts.join(' ')}`;

  // Add the recommendation context
  narrative += ` This is why BrandOps is surfacing the "${recTitle}" ${recType} recommendation.`;

  // Add confidence signal
  if (confidence < 0.4) {
    narrative += ` Note: The "why now" is weak — this may not need immediate attention.`;
  } else if (confidence >= 0.7) {
    narrative += ` Strong signal: multiple recent factors support this recommendation.`;
  }

  return narrative;
}

/**
 * Determine if a recommendation should be surfaced as a proactive interruption.
 */
export function shouldInterruptUser(explanation: WhyNowExplanation): boolean {
  // Interrupt only if:
  // 1. The explanation has strong evidence (confidence >= 0.5)
  // 2. At least one evidence item has high weight (>= 0.2)
  // 3. The recommendation is not fragile

  if (explanation.isFragile) return false;
  if (explanation.confidence < 0.5) return false;

  const hasStrongEvidence = explanation.evidence.some((e) => e.weight >= 0.2);
  return hasStrongEvidence;
}

/**
 * Generate a summary list of "why now" explanations for multiple recommendations.
 */
export function buildWhyNowSummaries(
  recommendations: Array<OpportunityRecommendation | AchievementCandidate | ProfessionalSignal>,
  data: BrandOpsData,
  relatedGoals?: string[]
): WhyNowExplanation[] {
  return recommendations.map((rec) => buildWhyNow({ recommendation: rec, data, relatedGoals }));
}
