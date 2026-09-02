/**
 * Project Intelligence — creates canonical Project objects linking verified
 * achievements, artifacts, goals, plans, and outcomes. Calculates projectStatus,
 * recentMilestones, professionalValue, missingDocumentation, and contentPotential.
 */

import type {
  AchievementCandidate,
  AchievementKind,
  Artifact,
  Goal,
  Outcome,
  Plan,
  ProjectIntelligence,
  ProjectMilestone,
  ProjectStatus
} from '../../types/builder';
import type { BuilderActivityState } from './activityGraph';

export interface ProjectIntelligenceInput {
  state: BuilderActivityState;
  projectId: string;
  externalPlans?: Plan[];
  externalArtifacts?: Artifact[];
  externalGoals?: Goal[];
  externalOutcomes?: Outcome[];
}

export function computeProjectIntelligence(input: ProjectIntelligenceInput): ProjectIntelligence {
  const stored = (input.state.projects ?? []).find((p) => p.id === input.projectId);
  if (!stored) throw new Error(`Project not found: ${input.projectId}`);

  /**
   * `Project` types its id arrays and `tags` as required, and nothing enforces
   * that: `withDefaults` does not normalize `builderActivity.projects` at all.
   * So a record from a partial write, an older schema, an import or a
   * hand-edited workspace JSON arrives without them, and `project.tags.length`
   * threw straight out of the handler — the gateway now converts that into a
   * fail-closed refusal, but a read that crashes on ordinary data is still a
   * read that does not work.
   *
   * Defaulting here keeps the promise the type already makes.
   */
  const project = {
    ...stored,
    achievementIds: stored.achievementIds ?? [],
    artifactIds: stored.artifactIds ?? [],
    goalIds: stored.goalIds ?? [],
    planIds: stored.planIds ?? [],
    outcomeIds: stored.outcomeIds ?? [],
    recentMilestones: stored.recentMilestones ?? [],
    tags: stored.tags ?? []
  };

  // Recent milestones from verified achievements
  // Use event-based filtering since AchievementCandidate doesn't have verificationStatus
  const eventIds = project.achievementIds;
  const stateEvents = input.state.events ?? [];

  const relevantEvents = stateEvents.filter((e) => eventIds.includes(e.id));
  const verifiedEvents = relevantEvents.filter(
    (e) =>
      e.verificationStatus === 'USER_VERIFIED' || e.verificationStatus === 'INDEPENDENTLY_SUPPORTED'
  );

  const recentMilestones: ProjectMilestone[] = verifiedEvents
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)
    .map((e) => ({
      achievementId: e.id,
      title: e.title,
      kind: e.kind as AchievementKind,
      achievedAt: e.timestamp,
      confidence: e.confidence
    }));

  // Professional value: weighted sum of achievement confidence and evidence
  const totalEvidence = verifiedEvents.reduce((sum, e) => sum + (e.evidence?.length ?? 0), 0);
  const avgConfidence =
    verifiedEvents.length > 0
      ? verifiedEvents.reduce((sum, e) => sum + e.confidence, 0) / verifiedEvents.length
      : 0;
  const professionalValue = Math.min(
    1,
    avgConfidence * 0.7 + Math.min(1, totalEvidence / 10) * 0.3
  );

  // Missing documentation
  const missingDocumentation: string[] = [];
  if (
    verifiedEvents.length > 0 &&
    !project.artifactIds.some((id) =>
      input.externalArtifacts?.some((a) => a.id === id && a.artifactType === 'documentation')
    )
  ) {
    missingDocumentation.push('No documentation artifacts linked to key achievements');
  }
  if (project.tags.length === 0) {
    missingDocumentation.push('Project tags not yet derived');
  }
  if (recentMilestones.length === 0) {
    missingDocumentation.push('No verified milestones recorded');
  }

  // Content potential
  const hasContentOpportunity = verifiedEvents.some((e) =>
    [
      'feature-shipped',
      'repository-released',
      'product-launched',
      'documentation-published',
      'open-source-contribution'
    ].includes(e.kind)
  );
  const contentPotential = hasContentOpportunity
    ? Math.min(1, 0.5 + avgConfidence * 0.3 + Math.min(1, totalEvidence / 15) * 0.2)
    : 0.1;

  // Suggested questions for Ask My Twin
  const suggestedQuestions: string[] = [];
  if (missingDocumentation.length > 0) {
    suggestedQuestions.push('What documentation is missing for this project?');
  }
  if (hasContentOpportunity) {
    suggestedQuestions.push('What content could I create from this project?');
  }
  if (verifiedEvents.length > 0) {
    suggestedQuestions.push('What have I actually accomplished on this project?');
  }
  suggestedQuestions.push('How does this project support my positioning?');

  // Evidence summary
  const evidenceSummary =
    `Project "${project.name}" has ${verifiedEvents.length} verified achievement(s)` +
    (totalEvidence > 0 ? ` with ${totalEvidence} evidence item(s)` : '') +
    `. Content potential: ${contentPotential.toFixed(2)}.` +
    (missingDocumentation.length > 0 ? ` Missing: ${missingDocumentation.join(', ')}.` : '');

  // Project status
  let projectStatus: ProjectStatus = 'unknown';
  if (
    verifiedEvents.some(
      (e) => e.kind === 'project-milestone-reached' && e.verificationStatus === 'USER_VERIFIED'
    )
  ) {
    projectStatus = 'completed';
  } else if (verifiedEvents.length > 0) {
    projectStatus = 'active';
  } else if (project.planIds.length > 0) {
    projectStatus = 'active';
  }

  return {
    projectId: input.projectId,
    projectStatus,
    recentMilestones,
    professionalValue,
    missingDocumentation,
    contentPotential,
    suggestedQuestions,
    evidenceSummary,
    computedAt: new Date().toISOString()
  };
}

export function deriveProjectStatus(
  achievements: AchievementCandidate[],
  plans: Plan[]
): ProjectStatus {
  // Use event-based checking since AchievementCandidate doesn't have verificationStatus
  const verifiedMilestones = achievements.some((a) => a.kind === 'project-milestone-reached');
  const hasActivePlans = plans.some(
    (p) => p.status === 'in-progress' || p.status === 'approved' || p.status === 'pending-approval'
  );

  if (verifiedMilestones) {
    return 'completed';
  }
  if (achievements.length > 0 || hasActivePlans) {
    return 'active';
  }
  return 'unknown';
}
