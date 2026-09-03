/** * Goal Health — evaluates each active Goal from evidence-backed progress.
 * * The capability is tracked in the README product backlog.
 * * Existing: Goal status is binary (active/completed/paused/abandoned).
 * Missing: ON_TRACK/AT_RISK/STALLED/COMPLETED/NEEDS_REVIEW classification with evidence. */
import type { BrandOpsData } from '../../types/domain';
import type { Goal } from '../../types/builder';

// ---------------------------------------------------------------------------
// Goal Health Types
// ---------------------------------------------------------------------------

/** Health status for a goal. */
export type GoalHealthStatus = 'ON_TRACK' | 'AT_RISK' | 'STALLED' | 'COMPLETED' | 'NEEDS_REVIEW';

/** Human-readable label for each status. */
export function goalHealthStatusLabel(status: GoalHealthStatus): string {
  switch (status) {
    case 'ON_TRACK':
      return 'On Track — progress is steady and evidence-backed';
    case 'AT_RISK':
      return 'At Risk — some indicators are concerning';
    case 'STALLED':
      return 'Stalled — no recent progress detected';
    case 'COMPLETED':
      return 'Completed — goal has been achieved';
    case 'NEEDS_REVIEW':
      return 'Needs Review — requires manual assessment';
  }
}

/** Evidence behind a health assessment. */
export interface GoalHealthEvidence {
  /** Summary of the evidence. */
  summary: string;
  /** Progress evidence (achievements, artifacts, activity). */
  progressEvidence: string[];
  /** Blocked plans blocking this goal. */
  blockedPlans: string[];
  /** Recent activity in the last N days. */
  recentActivityCount: number;
  /** Outcome evidence (measurable results). */
  outcomeEvidence: string[];
  /** Confidence in the health assessment (0-1). */
  confidence: number;
  /** Factors that influenced the assessment. */
  factors: GoalHealthFactor[];
}

/** A factor that influenced the health assessment. */
export interface GoalHealthFactor {
  /** Factor name. */
  name: string;
  /** Weight (0-1). */
  weight: number;
  /** Current value (0-1). */
  value: number;
  /** Description. */
  description: string;
}

/** Full goal health assessment. */
export interface GoalHealth {
  /** Goal id. */
  goalId: string;
  /** Goal title. */
  goalTitle: string;
  /** Health status. */
  status: GoalHealthStatus;
  /** Evidence behind the status. */
  evidence: GoalHealthEvidence;
  /** When the health was computed. */
  computedAt: string;
  /** Goal status from the data (active/completed/paused/abandoned). */
  rawStatus: Goal['status'];
  /** Confidence in the health assessment (0-1). */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Goal Health Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate the health of a single goal or all goals.
 *
 * When `goal` is provided, returns a GoalHealth for that goal.
 * When `goal` is omitted, returns a Map of goalId → GoalHealth for all goals in data.
 */
/**
 * One goal in, one health out. All goals in, a map out.
 *
 * The single signature returned `GoalHealth | Map<string, GoalHealth>`, a union
 * decided entirely by whether `goal` was passed — so every caller had to narrow
 * a thing it already knew. Thirty-two type errors in `goalHealth.test.ts` were
 * that union, and the test suite was never typechecked by any pipeline, so they
 * sat unread while the tests themselves passed.
 *
 * Overloads say what the implementation always did. Nothing about the behaviour
 * changes; the callers simply stop being asked to prove what they told it.
 */
export function evaluateGoalHealth(params: {
  goal: Goal;
  data: BrandOpsData;
  recentActivityWindowDays?: number;
}): GoalHealth;
export function evaluateGoalHealth(params: {
  goal?: undefined;
  data: BrandOpsData;
  recentActivityWindowDays?: number;
}): Map<string, GoalHealth>;
export function evaluateGoalHealth(params: {
  goal?: Goal;
  data: BrandOpsData;
  /** Lookback window in days for "recent" activity. Default: 30. */
  recentActivityWindowDays?: number;
}): GoalHealth | Map<string, GoalHealth> {
  const { goal, data, recentActivityWindowDays = 30 } = params;
  const now = new Date().toISOString();

  const goals: Goal[] = goal ? [goal] : (data.builderActivity?.goals ?? []);
  const result = new Map<string, GoalHealth>();

  for (const g of goals) {
    const achievements = (data.builderActivity?.achievements ?? []) as unknown as Array<{
      id: string;
      title?: string;
      goalIds?: string[];
      outcome?: { observed: boolean; metric?: number };
    }>;
    const plans = (data.planWorkspace?.plans ?? []) as unknown as Array<{
      id: string;
      title?: string;
      goalId?: string;
      completionStatus?: string;
      status?: string;
      blocked?: boolean;
      outcomes?: string[];
    }>;
    const activities = (data.builderActivity?.events ?? []) as unknown as Array<{
      timestamp: string;
      type: string;
      goalIds?: string[];
    }>;
    const artifacts = (data.builderActivity?.artifacts ?? []) as unknown as Array<{
      id: string;
      goalId?: string;
      status?: string;
    }>;

    // Compute factors
    const progressFactor = computeProgressFactor(g, achievements, plans, artifacts);
    const activityFactor = computeRecentActivityFactor(g, activities, recentActivityWindowDays);
    const blockedFactor = computeBlockedPlansFactor(g, plans);
    const outcomeFactor = computeOutcomeFactor(g, achievements, plans);

    // Determine status based on factors
    let status: GoalHealthStatus;
    let confidence = 0.5;

    // Check raw status first
    if (g.status === 'completed') {
      status = 'COMPLETED';
      confidence = 0.95;
    } else if (g.status === 'paused') {
      status = 'NEEDS_REVIEW';
      confidence = 0.7;
    } else if (g.status === 'abandoned') {
      status = 'NEEDS_REVIEW';
      confidence = 0.6;
    } else {
      // Active goal — evaluate based on factors
      const blockedPlanIds = blockedFactor.blockedPlanIds ?? [];

      if (blockedPlanIds.length > 0) {
        status = 'AT_RISK';
        confidence = 0.6;
      } else {
        const avgFactor =
          (progressFactor.value +
            activityFactor.value +
            blockedFactor.value +
            outcomeFactor.value) /
          4;

        if (avgFactor >= 0.5) {
          status = 'ON_TRACK';
          confidence = 0.8;
        } else if (avgFactor >= 0.3) {
          status = 'AT_RISK';
          confidence = 0.7;
        } else {
          status = 'STALLED';
          confidence = 0.65;
        }
      }
    }

    // Build evidence
    const evidence: GoalHealthEvidence = {
      summary: `${statusLabelForStatus(status)} — Progress: ${(progressFactor.value * 100).toFixed(0)}%, Recent activity: ${activityFactor.count ?? 0}, Blocked plans: ${(blockedFactor.blockedPlanIds?.length ?? 0) > 0 ? 'yes' : 'no'}, Outcome evidence: ${outcomeFactor.value}`,
      progressEvidence: progressFactor.details ?? [],
      blockedPlans: blockedFactor.blockedPlanIds ?? [],
      recentActivityCount: activityFactor.count ?? 0,
      outcomeEvidence: outcomeFactor.details ?? [],
      confidence,
      factors: [
        {
          name: 'progress',
          weight: 0.35,
          value: progressFactor.value,
          description: progressFactor.description
        },
        {
          name: 'recent-activity',
          weight: 0.25,
          value: activityFactor.value,
          description: activityFactor.description
        },
        {
          name: 'blocked-plans',
          weight: 0.25,
          value: blockedFactor.value,
          description: blockedFactor.description
        },
        {
          name: 'outcome',
          weight: 0.15,
          value: outcomeFactor.value,
          description: outcomeFactor.description
        }
      ]
    };

    const health: GoalHealth = {
      goalId: g.id,
      goalTitle: g.title,
      status,
      evidence,
      computedAt: now,
      rawStatus: g.status,
      confidence
    };

    if (goal) {
      return health;
    }
    result.set(g.id, health);
  }

  return result;
}

function statusLabelForStatus(status: GoalHealthStatus): string {
  switch (status) {
    case 'ON_TRACK':
      return 'ON_TRACK';
    case 'AT_RISK':
      return 'AT_RISK';
    case 'STALLED':
      return 'STALLED';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'NEEDS_REVIEW':
      return 'NEEDS_REVIEW';
  }
}

function isPlanCompleted(p: { completionStatus?: string; status?: string }): boolean {
  return (
    p.completionStatus === 'completed' ||
    p.status === 'completed' ||
    p.status === 'executed' ||
    p.status === 'verified'
  );
}

/**
 * Compute progress factor based on achievements and artifacts supporting the goal.
 */
function computeProgressFactor(
  goal: Goal,
  achievements: Array<{ id: string; title?: string; goalIds?: string[] }>,
  plans: Array<{ id: string; goalId?: string; completionStatus?: string; status?: string }>,
  artifacts: Array<{ id: string; goalId?: string; status?: string }>
): { value: number; details?: string[]; description: string } {
  const relevantAchievements = achievements.filter(
    (a) => !a.goalIds || a.goalIds.includes(goal.id)
  );
  const relevantPlans = plans.filter((p) => !p.goalId || p.goalId === goal.id);
  const relevantArtifacts = artifacts.filter((a) => !a.goalId || a.goalId === goal.id);

  const achievementCount = relevantAchievements.length;
  const completedPlans = relevantPlans.filter(isPlanCompleted).length;
  const totalPlans = relevantPlans.length;
  const completedArtifacts = relevantArtifacts.filter(
    (a) => a.status === 'published' || a.status === 'approved'
  ).length;
  const totalArtifacts = relevantArtifacts.length;

  let value = 0;
  const details: string[] = [];

  if (achievementCount > 0) {
    value += Math.min(0.4, achievementCount * 0.3);
    for (const a of relevantAchievements) {
      details.push(a.title ?? 'Achievement');
    }
  }

  if (totalPlans > 0) {
    const planRatio = completedPlans / totalPlans;
    value += planRatio * 0.3;
    details.push(`${completedPlans}/${totalPlans} plans completed`);
  }

  if (totalArtifacts > 0) {
    const artifactRatio = completedArtifacts / totalArtifacts;
    value += artifactRatio * 0.3;
    details.push(`${completedArtifacts}/${totalArtifacts} artifacts completed`);
  }

  return {
    value: Math.min(1, value),
    details: details.length > 0 ? details : undefined,
    description: details.length > 0 ? details.join(', ') : 'No progress evidence'
  };
}

/**
 * Compute recent activity factor.
 */
function computeRecentActivityFactor(
  goal: Goal,
  activities: Array<{ timestamp: string; type: string; goalIds?: string[] }>,
  windowDays: number
): { value: number; count?: number; description: string } {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  const relevantActivities = activities.filter((a) => {
    const activityDate = new Date(a.timestamp).getTime();
    if (activityDate < cutoff) return false;
    return !a.goalIds || a.goalIds.includes(goal.id);
  });

  const count = relevantActivities.length;

  let value = 0;
  if (count >= 10) value = 1;
  else if (count >= 5) value = 0.7;
  else if (count >= 2) value = 0.4;
  else if (count >= 1) value = 0.2;
  else value = 0;

  return { value, count, description: `${count} activities in last ${windowDays} days` };
}

/**
 * Compute blocked plans factor.
 */
function computeBlockedPlansFactor(
  goal: Goal,
  plans: Array<{ id: string; goalId?: string; status?: string; blocked?: boolean }>
): { value: number; blockedPlanIds?: string[]; description: string } {
  const relevantPlans = plans.filter((p) => !p.goalId || p.goalId === goal.id);
  const blockedPlans = relevantPlans.filter((p) => p.blocked || p.status === 'blocked');

  if (blockedPlans.length === 0) {
    return { value: 1, description: 'No blocked plans' };
  }

  const blockedPlanIds = blockedPlans.map((p) => p.id);
  const value = Math.max(0, 1 - blockedPlans.length / Math.max(1, relevantPlans.length));

  return {
    value,
    blockedPlanIds,
    description: `${blockedPlans.length} blocked plan(s) out of ${relevantPlans.length}`
  };
}

/**
 * Compute outcome evidence factor.
 */
function computeOutcomeFactor(
  goal: Goal,
  achievements: Array<{
    id: string;
    goalIds?: string[];
    outcome?: { observed: boolean; metric?: number };
  }>,
  plans: Array<{ id: string; goalId?: string; completionStatus?: string; outcomes?: string[] }>
): { value: number; details?: string[]; description: string } {
  const outcomeAchievements = achievements.filter(
    (a) => (!a.goalIds || a.goalIds.includes(goal.id)) && a.outcome?.observed
  );

  const completedPlans = plans.filter(
    (p) => (!p.goalId || p.goalId === goal.id) && p.completionStatus === 'completed'
  );

  const details: string[] = [];
  let value = 0;

  if (outcomeAchievements.length > 0) {
    value = Math.min(0.6, (outcomeAchievements.length / 3) * 0.6);
    details.push(`${outcomeAchievements.length} outcome-verified achievement(s)`);
  }

  if (completedPlans.length > 0) {
    value = Math.min(1, value + Math.min(0.4, (completedPlans.length / 3) * 0.4));
    details.push(`${completedPlans.length} completed plan(s) with outcomes`);
  }

  // Also count achievements that are goal-related as outcome evidence (even without explicit outcome field)
  const goalAchievements = achievements.filter((a) => !a.goalIds || a.goalIds.includes(goal.id));
  if (goalAchievements.length > 0 && details.length === 0) {
    value = Math.min(0.6, (goalAchievements.length / 5) * 0.6);
    details.push(`${goalAchievements.length} goal-related achievement(s)`);
  }

  return {
    value: Math.min(1, value),
    details: details.length > 0 ? details : undefined,
    description: details.length === 0 ? 'No outcome evidence' : 'Outcome evidence present'
  };
}

/**
 * Evaluate health for all goals in the workspace.
 */
export function evaluateAllGoalHealth(params: {
  data: BrandOpsData;
  recentActivityWindowDays?: number;
}): Map<string, GoalHealth> {
  return evaluateGoalHealth({
    data: params.data,
    recentActivityWindowDays: params.recentActivityWindowDays
  }) as Map<string, GoalHealth>;
}

/**
 * Get goals that need attention (AT_RISK, STALLED, or NEEDS_REVIEW).
 */
export function getGoalsNeedingAttention(healthMap: Map<string, GoalHealth>): GoalHealth[] {
  const needsAttention: GoalHealth[] = [];

  for (const health of healthMap.values()) {
    if (
      health.status === 'AT_RISK' ||
      health.status === 'STALLED' ||
      health.status === 'NEEDS_REVIEW'
    ) {
      needsAttention.push(health);
    }
  }

  // Sort by confidence (lowest first — most uncertain first)
  needsAttention.sort((a, b) => a.evidence.confidence - b.evidence.confidence);

  return needsAttention;
}
