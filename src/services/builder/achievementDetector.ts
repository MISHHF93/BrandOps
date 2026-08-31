/**
 * Achievement Detector — consumes eligible Builder Activity events and detects
 * meaningful milestones. Surfaces candidates as "BrandOps noticed something worth
 * remembering" with Verify / Edit / Dismiss actions.
 */

import type { ActivityEvent, AchievementCandidate, AchievementKind, EvidenceEntry } from '../../types/builder';
import { isAchievementEligible } from './activityGraph';

/** Detection rules — each rule maps an activity kind to achievement candidates. */
interface DetectionRule {
  kind: ActivityEvent['kind'];
  candidateKind: AchievementKind;
  title: (event: ActivityEvent) => string;
  description: (event: ActivityEvent) => string;
  evidence: (event: ActivityEvent) => EvidenceEntry[];
  professionalRelevance: (event: ActivityEvent) => string[];
  confidenceModifier: (event: ActivityEvent) => number;
}

/** Detection rules keyed by activity kind. */
const DETECTION_RULES: DetectionRule[] = [
  {
    kind: 'feature-built',
    candidateKind: 'feature-shipped',
    title: (e) => `Shipped ${e.title}`,
    description: (e) => `You built and shipped: ${e.title}. ${e.detail.slice(0, 300)}`,
    evidence: (e) => e.evidence ?? [],
    professionalRelevance: () => ['software-delivery', 'feature-development'],
    confidenceModifier: (e) => Math.min(1, 0.5 + e.confidence * 0.3)
  },
  {
    kind: 'repository-released',
    candidateKind: 'repository-released',
    title: (e) => `Released ${e.title}`,
    description: (e) => `You released: ${e.title}. ${e.detail.slice(0, 300)}`,
    evidence: (e) => e.evidence ?? [],
    professionalRelevance: () => ['open-source', 'shipping'],
    confidenceModifier: (e) => Math.min(1, 0.6 + e.confidence * 0.25)
  },
  {
    kind: 'product-launched',
    candidateKind: 'product-launched',
    title: (e) => `Launched ${e.title}`,
    description: (e) => `You launched: ${e.title}. ${e.detail.slice(0, 300)}`,
    evidence: (e) => e.evidence ?? [],
    professionalRelevance: () => ['product-launch', 'go-to-market'],
    confidenceModifier: (e) => Math.min(1, 0.65 + e.confidence * 0.2)
  },
  {
    kind: 'documentation-published',
    candidateKind: 'documentation-published',
    title: (e) => `Published ${e.title}`,
    description: (e) => `You published documentation: ${e.title}. ${e.detail.slice(0, 300)}`,
    evidence: (e) => e.evidence ?? [],
    professionalRelevance: () => ['technical-writing', 'knowledge-sharing'],
    confidenceModifier: (e) => e.confidence * 0.8
  },
  {
    kind: 'benchmark-improved',
    candidateKind: 'benchmark-improved',
    title: (e) => `Improved benchmark: ${e.title}`,
    description: (e) => `You improved a benchmark: ${e.title}. ${e.detail.slice(0, 300)}`,
    evidence: (e) => e.evidence ?? [],
    professionalRelevance: () => ['performance', 'optimization'],
    confidenceModifier: (e) => Math.min(1, 0.55 + e.confidence * 0.3)
  },
  {
    kind: 'open-source-contribution',
    candidateKind: 'open-source-contribution',
    title: (e) => `Contributed to open source: ${e.title}`,
    description: (e) => `Open-source contribution: ${e.title}. ${e.detail.slice(0, 300)}`,
    evidence: (e) => e.evidence ?? [],
    professionalRelevance: () => ['open-source', 'community'],
    confidenceModifier: (e) => Math.min(1, 0.6 + e.confidence * 0.25)
  },
  {
    kind: 'hackathon-submission',
    candidateKind: 'hackathon-submission',
    title: (e) => `Hackathon submission: ${e.title}`,
    description: (e) => `You submitted: ${e.title} to a hackathon. ${e.detail.slice(0, 300)}`,
    evidence: (e) => e.evidence ?? [],
    professionalRelevance: () => ['innovation', 'rapid-prototyping'],
    confidenceModifier: (e) => e.confidence * 0.75
  },
  {
    kind: 'project-milestone',
    candidateKind: 'project-milestone-reached',
    title: (e) => `Reached milestone: ${e.title}`,
    description: (e) => `Project milestone reached: ${e.title}. ${e.detail.slice(0, 300)}`,
    evidence: (e) => e.evidence ?? [],
    professionalRelevance: () => ['project-management', 'delivery'],
    confidenceModifier: (e) => Math.min(1, 0.5 + e.confidence * 0.35)
  },
  {
    kind: 'integration-completed',
    candidateKind: 'integration-completed',
    title: (e) => `Completed integration: ${e.title}`,
    description: (e) => `You completed an integration: ${e.title}. ${e.detail.slice(0, 300)}`,
    evidence: (e) => e.evidence ?? [],
    professionalRelevance: () => ['integration-engineering', 'systems'],
    confidenceModifier: (e) => Math.min(1, 0.5 + e.confidence * 0.3)
  },
  {
    kind: 'significant-refactor',
    candidateKind: 'significant-refactor-completed',
    title: (e) => `Completed significant refactor: ${e.title}`,
    description: (e) => `You completed a significant refactor: ${e.title}. ${e.detail.slice(0, 300)}`,
    evidence: (e) => e.evidence ?? [],
    professionalRelevance: () => ['software-engineering', 'architecture'],
    confidenceModifier: (e) => Math.min(1, 0.55 + e.confidence * 0.3)
  }
];

/** Min confidence for a candidate to be surfaced. */
const MIN_CANDIDATE_CONFIDENCE = 0.4;

/**
 * Detect achievement candidates from eligible activity events.
 * Returns candidates with Verify / Edit / Dismiss actions.
 */
export function detectAchievements(
  events: ActivityEvent[]
): AchievementCandidate[] {
  const candidates: AchievementCandidate[] = [];

  for (const event of events) {
    if (!isAchievementEligible(event.kind)) continue;
    if (event.verificationStatus !== 'UNVERIFIED') continue;

    const rule = DETECTION_RULES.find((r) => r.kind === event.kind);
    if (!rule) continue;

    const confidence = rule.confidenceModifier(event);
    if (confidence < MIN_CANDIDATE_CONFIDENCE) continue;

    const candidate: AchievementCandidate = {
      id: `candidate-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      workspaceId: event.workspaceId,
      eventId: event.id,
      title: rule.title(event).slice(0, 300),
      description: rule.description(event).slice(0, 2000),
      kind: rule.candidateKind,
      evidence: rule.evidence(event),
      sourceEvents: [event.id],
      confidence,
      professionalRelevance: rule.professionalRelevance(event),
      verificationRequired: true,
      suggestedActions: [
        { action: 'verify', label: 'Verify achievement', requiresConfirmation: true },
        { action: 'edit', label: 'Edit details' },
        { action: 'dismiss', label: 'Dismiss' }
      ],
      suggestedConversion: {
        enabled: confidence >= 0.7,
        planPreset: confidence >= 0.7 ? 'CONTENT_PLAN' : undefined,
        note: confidence >= 0.7 ? 'High-confidence achievement — suggest converting to a content plan.' : undefined
      },
      reason: rule.description(event),
      detectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    candidates.push(candidate);
  }

  // Sort by confidence descending
  return candidates.sort((a, b) => b.confidence - a.confidence);
}

/** Surface text for notification. */
export function candidateSurfaceText(candidate: AchievementCandidate): string {
  return `BrandOps noticed something worth remembering: "${candidate.title}" (${candidate.kind}).`;
}

/**
 * Edit an achievement candidate's details.
 */
export function editCandidate(
  candidate: AchievementCandidate,
  edits: { title?: string; description?: string; confidence?: number }
): AchievementCandidate {
  return {
    ...candidate,
    title: edits.title?.slice(0, 300) ?? candidate.title,
    description: edits.description?.slice(0, 2000) ?? candidate.description,
    confidence: edits.confidence ?? candidate.confidence,
    updatedAt: new Date().toISOString()
  };
}
