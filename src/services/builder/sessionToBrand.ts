/**
 * Session-to-Brand — implements "Summarize Work for BrandOps": receives explicitly
 * authorized development-session evidence and returns structured analysis. Saves
 * nothing automatically; shows a review screen for user selection.
 */

import type {
  ActivityEvent,
  EvidenceEntry
} from '../../types/builder';
import type { BrandOpsData } from '../../types/domain';
import type { BuilderActivityState } from './activityGraph';

export interface SessionToBrandInput {
  /** Explicitly authorized session evidence from the development environment. */
  sessionEvidence: DevelopmentSessionEvidence;
  /** The workspace context for the session. */
  workspace: BrandOpsData;
  /** The builder activity state. */
  state: BuilderActivityState;
  /** User identity for the session. */
  userId: string;
  /** Workspace identifier. */
  workspaceId: string;
}

export interface DevelopmentSessionEvidence {
  /** The session or task identifier from the development environment. */
  sessionId: string;
  /** What was worked on. */
  workDescription: string;
  /** Problems that were solved. */
  problemsSolved: string[];
  /** Technologies used during the session. */
  technologiesUsed: string[];
  /** Code changes, file paths, or other evidence (only if explicitly authorized). */
  evidence?: SessionEvidenceItem[];
  /** The source of this evidence (e.g. 'vscode-extension', 'cli', 'agent'). */
  source: string;
  /** When the session occurred. */
  occurredAt: string;
}

export interface SessionEvidenceItem {
  type: 'file' | 'commit' | 'test' | 'build' | 'artifact' | 'link';
  ref: string;
  label: string;
  /** Only include if the user explicitly authorized this content. */
  content?: string;
}

export interface SessionToBrandResult {
  workCompleted: string;
  problemsSolved: string[];
  technologiesUsed: string[];
  potentialAchievement: AchievementCandidateSummary;
  contentAngles: string[];
  portfolioValue: PortfolioValueAssessment;
  recommendedNextAction: string;
  /** Proposed activity event (not saved until user confirms). */
  proposedEvent: ActivityEvent;
  /** Proposed achievement (not saved until user confirms). */
  proposedAchievement: AchievementCandidateSummary;
}

export interface AchievementCandidateSummary {
  title: string;
  description: string;
  kind: string;
  confidence: number;
  professionalRelevance: string[];
  evidence: EvidenceEntry[];
  reason: string;
}

export interface PortfolioValueAssessment {
  score: number; // 0-1
  reasons: string[];
  suggestedPortfolioEntry: string;
}

export function summarizeWorkForBrandOps(input: SessionToBrandInput): SessionToBrandResult {
  const workCompleted = input.sessionEvidence.workDescription;

  // Problems solved
  const problemsSolved = input.sessionEvidence.problemsSolved;

  // Technologies used
  const technologiesUsed = input.sessionEvidence.technologiesUsed;

  // Detect potential achievement
  const potentialAchievement = detectPotentialAchievement(input.sessionEvidence);

  // Content angles
  const contentAngles = generateContentAngles(input.sessionEvidence, potentialAchievement);

  // Portfolio value
  const portfolioValue = assessPortfolioValue(input.sessionEvidence, potentialAchievement);

  // Recommended next action
  const recommendedNextAction = recommendNextAction(potentialAchievement, contentAngles, portfolioValue);

  // Proposed event (not saved)
  const proposedEvent = createProposedEvent(input);

  // Proposed achievement (not saved)
  const proposedAchievement = potentialAchievement;

  return {
    workCompleted,
    problemsSolved,
    technologiesUsed,
    potentialAchievement,
    contentAngles,
    portfolioValue,
    recommendedNextAction,
    proposedEvent,
    proposedAchievement
  };
}

function detectPotentialAchievement(evidence: DevelopmentSessionEvidence): AchievementCandidateSummary {
  const title = evidence.workDescription.slice(0, 300);
  const kind = detectAchievementKind(evidence);

  const description = [
    `Work session: ${evidence.workDescription}`,
    evidence.problemsSolved.length > 0 ? `Problems solved: ${evidence.problemsSolved.join('; ')}` : '',
    evidence.technologiesUsed.length > 0 ? `Technologies: ${evidence.technologiesUsed.join(', ')}` : ''
  ].filter(Boolean).join(' ');

  const relevance = extractProfessionalRelevance(evidence, kind);

  const evEntries: EvidenceEntry[] = evidence.evidence?.map((e) => ({
    ref: e.ref,
    kind: mapEvidenceType(e.type),
    label: e.label,
    verificationUrl: e.content ? undefined : undefined
  })) ?? [];

  return {
    title,
    description: description.slice(0, 4000),
    kind,
    confidence: calculateConfidence(evidence, kind),
    professionalRelevance: relevance,
    evidence: evEntries,
    reason: `Detected potential achievement from development session: ${evidence.workDescription.slice(0, 100)}.`
  };
}

function detectAchievementKind(evidence: DevelopmentSessionEvidence): string {
  const work = evidence.workDescription.toLowerCase();
  const problems = evidence.problemsSolved.map((p) => p.toLowerCase());

  if (work.includes('release') || work.includes('deploy') || problems.some((p) => p.includes('release') || p.includes('deploy'))) {
    return 'repository-released';
  }
  if (work.includes('feature') || work.includes('build') || work.includes('implement') || problems.some((p) => p.includes('feature') || p.includes('build'))) {
    return 'feature-shipped';
  }
  if (work.includes('refactor') || work.includes('restructure') || problems.some((p) => p.includes('refactor') || p.includes('restructure'))) {
    return 'significant-refactor';
  }
  if (work.includes('document') || work.includes('docs') || problems.some((p) => p.includes('document') || p.includes('docs'))) {
    return 'documentation-published';
  }
  if (work.includes('test') || problems.some((p) => p.includes('test') && p.includes('improve'))) {
    return 'benchmark-improved';
  }
  if (work.includes('integrate') || problems.some((p) => p.includes('integrate'))) {
    return 'integration-completed';
  }
  if (problems.some((p) => p.includes('complete') || p.includes('finish'))) {
    return 'project-milestone-reached';
  }
  return 'feature-shipped';
}

function extractProfessionalRelevance(evidence: DevelopmentSessionEvidence, kind: string): string[] {
  const relevance: string[] = [];
  const techs = evidence.technologiesUsed.map((t) => t.toLowerCase());

  if (techs.some((t) => t.includes('react') || t.includes('frontend') || t.includes('vue') || t.includes('angular'))) {
    relevance.push('frontend-development');
  }
  if (techs.some((t) => t.includes('node') || t.includes('backend') || t.includes('api') || t.includes('server'))) {
    relevance.push('backend-development');
  }
  if (techs.some((t) => t.includes('ai') || t.includes('ml') || t.includes('llm') || t.includes('agent'))) {
    relevance.push('ai-machine-learning');
  }
  if (techs.some((t) => t.includes('devops') || t.includes('ci') || t.includes('cd') || t.includes('infrastructure'))) {
    relevance.push('devops-infrastructure');
  }
  if (techs.some((t) => t.includes('mobile') || t.includes('ios') || t.includes('android'))) {
    relevance.push('mobile-development');
  }
  if (kind === 'feature-shipped') relevance.push('software-delivery');
  if (kind === 'significant-refactor') relevance.push('system-architecture');
  if (kind === 'documentation-published') relevance.push('technical-writing');
  if (kind === 'integration-completed') relevance.push('integration-engineering');

  return relevance.slice(0, 6);
}

function calculateConfidence(evidence: DevelopmentSessionEvidence, _kind: string): number {
  let base = 0.5;

  // More problems solved = higher confidence
  if (evidence.problemsSolved.length >= 1) base += 0.1;
  if (evidence.problemsSolved.length >= 3) base += 0.1;

  // Evidence items increase confidence
  if (evidence.evidence && evidence.evidence.length > 0) base += 0.1;
  if (evidence.evidence && evidence.evidence.length >= 3) base += 0.1;

  // Technologies listed increase confidence
  if (evidence.technologiesUsed.length > 0) base += 0.05;

  return Math.min(0.95, base);
}

function generateContentAngles(evidence: DevelopmentSessionEvidence, achievement: AchievementCandidateSummary): string[] {
  const angles: string[] = [];

  angles.push(`How I solved "${evidence.problemsSolved[0] || 'a challenging problem'}" using ${evidence.technologiesUsed.join(' and ')}`);

  if (evidence.problemsSolved.length > 1) {
    angles.push(`Multiple solutions: ${evidence.problemsSolved.slice(0, 3).join('; ')}`);
  }

  if (evidence.technologiesUsed.length > 0) {
    angles.push(`Deep dive into ${evidence.technologiesUsed.slice(0, 3).join(', ')} for this feature`);
  }

  if (achievement.kind === 'feature-shipped') {
    angles.push(`From idea to shipped: building ${evidence.workDescription.slice(0, 100)}`);
  }
  if (achievement.kind === 'significant-refactor') {
    angles.push(`Why I refactored ${evidence.workDescription.slice(0, 100)} and what I learned`);
  }
  if (evidence.problemsSolved.some((p) => p.includes('performance') || p.includes('speed') || p.includes('optimize'))) {
    angles.push(`Performance improvements: ${evidence.problemsSolved.filter((p) => p.includes('performance') || p.includes('speed')).join('; ')}`);
  }

  return angles.slice(0, 5);
}

function assessPortfolioValue(evidence: DevelopmentSessionEvidence, achievement: AchievementCandidateSummary): PortfolioValueAssessment {
  let score = 0.3;
  const reasons: string[] = [];

  if (evidence.problemsSolved.length > 0) {
    score += 0.1;
    reasons.push('Real problems were solved');
  }

  if (evidence.technologiesUsed.length >= 2) {
    score += 0.1;
    reasons.push('Multiple technologies demonstrated');
  }

  if (evidence.evidence && evidence.evidence.length > 0) {
    score += 0.1;
    reasons.push('Evidence is available for review');
  }

  if (achievement.kind === 'feature-shipped' || achievement.kind === 'repository-released') {
    score += 0.2;
    reasons.push('This is a shippable achievement');
  }

  if (evidence.workDescription.length > 50) {
    score += 0.05;
    reasons.push('Work description is detailed');
  }

  const suggestedEntry = `Portfolio entry: "${evidence.workDescription.slice(0, 100)}" — solved ${evidence.problemsSolved.slice(0, 3).join('; ')} using ${evidence.technologiesUsed.join(', ')}.`;

  return {
    score: Math.min(1, score),
    reasons,
    suggestedPortfolioEntry: suggestedEntry
  };
}

function recommendNextAction(achievement: AchievementCandidateSummary, contentAngles: string[], portfolioValue: PortfolioValueAssessment): string {
  if (portfolioValue.score >= 0.7) {
    return 'Create a portfolio entry and consider writing about this work.';
  }
  if (contentAngles.length > 0) {
    return 'Consider creating content from this work session.';
  }
  return 'Record this as an achievement for future reference.';
}

function createProposedEvent(input: SessionToBrandInput): ActivityEvent {
  const evidence = input.sessionEvidence;
  const now = evidence.occurredAt ?? new Date().toISOString();

  return {
    id: `proposed-event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: input.workspaceId,
    source: 'session-to-brand',
    sourceId: evidence.sessionId,
    kind: 'developer-session',
    title: evidence.workDescription.slice(0, 300),
    detail: [
      `Session: ${evidence.workDescription}`,
      evidence.problemsSolved.length > 0 ? `Problems solved: ${evidence.problemsSolved.join('; ')}` : '',
      evidence.technologiesUsed.length > 0 ? `Technologies: ${evidence.technologiesUsed.join(', ')}` : ''
    ].filter(Boolean).join(' ').slice(0, 4000),
    timestamp: now,
    confidence: 0.8,
    verificationStatus: 'UNVERIFIED',
    trustTier: 'AGENT_REPORTED',
    entityRefs: [],
    evidence: evidence.evidence?.map((e) => ({
      ref: e.ref,
      kind: mapEvidenceType(e.type),
      label: e.label
    })) ?? [],
    recordedBy: 'session-to-brand',
    recordedReason: 'Captured from authorized development session evidence.',
    createdAt: now,
    updatedAt: now
  };
}

function mapEvidenceType(type: SessionEvidenceItem['type']): 'git' | 'document' | 'code' | 'test' | 'milestone' | 'link' | 'other' {
  switch (type) {
    case 'commit': return 'git';
    case 'file': return 'document';
    case 'test': return 'test';
    case 'build': return 'milestone';
    case 'artifact': return 'code';
    case 'link': return 'link';
    default: return 'other';
  }
}
