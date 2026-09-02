/**
 * Achievement Service — verify, edit, and dismiss achievement candidates.
 * After verification, creates Achievement artifacts and updates Twin's verified
 * professional history.
 */

import type {
  ActivityEvent,
  Achievement,
  AchievementCandidate,
  AchievementKind
} from '../../types/builder';
import { editCandidate } from './achievementDetector';

/** Factory for creating verified Achievement artifacts. */
export interface VerifiedAchievementFactory {
  /** Create a canonical Achievement from a verified candidate. */
  fromVerifiedCandidate: (candidate: AchievementCandidate, event: ActivityEvent) => Achievement;
}

const factory: VerifiedAchievementFactory = {
  fromVerifiedCandidate: (candidate, event): Achievement => {
    const base: Achievement = {
      ...event,
      id: candidate.id,
      workspaceId: candidate.workspaceId,
      eventId: candidate.eventId,
      title: candidate.title,
      kind: candidate.kind,
      evidence: candidate.evidence,
      sourceEventIds: candidate.sourceEvents,
      confidence: candidate.confidence,
      professionalRelevance: candidate.professionalRelevance,
      verificationStatus: 'USER_VERIFIED',
      trustTier: 'USER_VERIFIED',
      verifiedAt: new Date().toISOString(),
      projectIds: [],
      goalIds: [],
      artifactIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return base;
  }
};

/** Map achievement kind to artifact type. */
function _getArtifactTypeForAchievement(kind: AchievementKind): string {
  switch (kind) {
    case 'feature-shipped':
      return 'achievement';
    case 'repository-released':
      return 'release';
    case 'product-launched':
      return 'product-launch';
    case 'documentation-published':
      return 'documentation';
    case 'benchmark-improved':
      return 'benchmark';
    case 'open-source-contribution':
      return 'open-source';
    case 'hackathon-submission':
      return 'hackathon';
    case 'project-milestone-reached':
      return 'milestone';
    case 'integration-completed':
      return 'integration';
    case 'significant-refactor-completed':
      return 'refactor';
    default:
      return 'achievement';
  }
}

/**
 * Verify an achievement candidate.
 * Creates a verified Achievement and returns it for Twin update.
 */
export function verifyAchievement(
  candidate: AchievementCandidate,
  event: ActivityEvent,
  verificationNote?: string
): { achievement: Achievement; surfaceText: string } {
  if (!candidate.verificationRequired) {
    throw new Error('This candidate does not require verification.');
  }

  const achievement = factory.fromVerifiedCandidate(candidate, event);

  const surfaceText = `Verified achievement: "${achievement.title}" (${achievement.kind}). ${verificationNote ? 'Note: ' + verificationNote : ''}`;

  return { achievement, surfaceText };
}

/**
 * Edit an achievement candidate before verification.
 */
export function editAchievementCandidate(
  candidate: AchievementCandidate,
  edits: { title?: string; description?: string; confidence?: number }
): AchievementCandidate {
  return editCandidate(candidate, edits);
}

/**
 * Dismiss an achievement candidate.
 */
export function dismissAchievement(
  candidate: AchievementCandidate,
  reason?: string
): { dismissed: AchievementCandidate; dismissalNote: string } {
  const dismissed: AchievementCandidate = {
    ...candidate,
    dismissed: true,
    dismissalReason: reason?.slice(0, 500),
    dismissedAt: new Date().toISOString(),
    verificationRequired: false
  };

  const dismissalNote = reason
    ? `Dismissed "${candidate.title}": ${reason}`
    : `Dismissed "${candidate.title}" without note.`;

  return { dismissed, dismissalNote };
}

/**
 * After verifying an achievement, update the Twin's verified professional history.
 * Returns the Twin update operations needed.
 */
export interface TwinUpdateOperations {
  professionalHistoryUpdates: Array<{ type: 'add-achievement'; achievement: Achievement }>;
  professionalSignals: Array<{ type: 'update-signal'; signal: string; confidence: number }>;
}

export function updateTwinFromVerifiedAchievement(achievement: Achievement): TwinUpdateOperations {
  const professionalHistoryUpdates: TwinUpdateOperations['professionalHistoryUpdates'] = [
    {
      type: 'add-achievement',
      achievement
    }
  ];

  // Derive professional signals from the achievement
  const signals: TwinUpdateOperations['professionalSignals'] = [];
  const relevance = achievement.professionalRelevance;

  if (relevance.includes('software-delivery') || relevance.includes('feature-development')) {
    signals.push({
      type: 'update-signal',
      signal: 'frequently-builds-software',
      confidence: achievement.confidence * 0.8
    });
  }

  if (relevance.includes('open-source') || relevance.includes('community')) {
    signals.push({
      type: 'update-signal',
      signal: 'contributes-to-open-source',
      confidence: achievement.confidence * 0.75
    });
  }

  if (relevance.includes('technical-writing') || relevance.includes('knowledge-sharing')) {
    signals.push({
      type: 'update-signal',
      signal: 'publishes-technical-content',
      confidence: achievement.confidence * 0.8
    });
  }

  if (relevance.includes('product-launch') || relevance.includes('go-to-market')) {
    signals.push({
      type: 'update-signal',
      signal: 'launches-products',
      confidence: achievement.confidence * 0.7
    });
  }

  return { professionalHistoryUpdates, professionalSignals: signals };
}
