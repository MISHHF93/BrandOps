
/**
 * Opportunity Radar — consolidates recommendation logic into explicit opportunity
 * categories with ranking from evidence strength, goal alignment, freshness,
 * urgency, expected value, and effort.
 */

import type {
  Achievement,
  OpportunityCategory,
  OpportunityRecommendation
} from '../../types/builder';
import type { BuilderActivityState } from './activityGraph';

export interface OpportunityRadarConfig {
  maxDisplayCount: number;
  minConfidence: number;
  staleDays: number;
}

export const DEFAULT_OPPORTUNITY_RADAR_CONFIG: OpportunityRadarConfig = {
  maxDisplayCount: 5,
  minConfidence: 0.4,
  staleDays: 90
};

export interface RadarRecommendation extends OpportunityRecommendation {
  rankScore?: number;
  stale?: boolean;
}

export function computeOpportunityRadar(
  state: BuilderActivityState,
  achievements: Achievement[],
  config?: Partial<OpportunityRadarConfig>
): RadarRecommendation[] {
  const cfg = { ...DEFAULT_OPPORTUNITY_RADAR_CONFIG, ...config };
  const now = Date.now();
  const staleCutoff = now - cfg.staleDays * 86400000;

  const all: RadarRecommendation[] = [];
  const seen = new Set<string>();

  // Generate from achievements
  for (const achievement of achievements) {
    if (achievement.verificationStatus !== 'USER_VERIFIED' && achievement.verificationStatus !== 'INDEPENDENTLY_SUPPORTED') {
      continue;
    }
    if (achievement.timestamp && new Date(achievement.timestamp).getTime() < staleCutoff && achievement.kind !== 'project-milestone-reached') {
      continue;
    }

    const category = achievementToCategory(achievement);
    const key = `${category}:${achievement.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (achievement.confidence < cfg.minConfidence) continue;

    const rec: RadarRecommendation = {
      id: `radar-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      workspaceId: achievement.workspaceId,
      category,
      title: `From "` + achievement.title + `"`,
      description: `Achievement "` + achievement.title + `" (${achievement.kind}) suggests a ${category.toLowerCase()} opportunity.`,
      reason: `Derived from verified achievement with confidence ${achievement.confidence.toFixed(2)}.`,
      evidence: achievement.evidence ?? [],
      confidence: achievement.confidence,
      expectedValue: categoryExpectedValue(category, achievement),
      effort: categoryEffort(category),
      goalAlignment: categoryGoalAlignment(category),
      primaryAction: categoryPrimaryAction(category, achievement),
      actions: [
        { type: 'convert-to-plan', label: 'Convert to Plan', targetId: achievement.id },
        { type: 'dismiss', label: 'Dismiss' }
      ],
      createdAt: new Date().toISOString(),
      rankScore: 0,
      stale: false
    };
    rec.rankScore = rankRadarRecommendation(rec, achievement);
    rec.stale = achievement.timestamp ? new Date(achievement.timestamp).getTime() < staleCutoff : false;
    all.push(rec);
  }

  return all.sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));
}

function achievementToCategory(achievement: Achievement): OpportunityCategory {
  switch (achievement.kind) {
    case 'feature-shipped':
    case 'documentation-published':
    case 'content-published':
      return 'CONTENT';
    case 'repository-released':
    case 'product-launched':
    case 'open-source-contribution':
      return 'PORTFOLIO';
    case 'integration-completed':
    case 'benchmark-improved':
    case 'significant-refactor':
      return 'BUILD';
    case 'project-milestone-reached':
    case 'outcome-achieved':
      return 'PUBLISH';
    case 'skill-demonstrated':
    case 'goal-advanced':
      return 'LEARN';
    default:
      return 'FOLLOW_UP';
  }
}

function categoryExpectedValue(category: OpportunityCategory, achievement: Achievement): number {
  if (category === 'PORTFOLIO') return Math.min(1, 0.6 + achievement.confidence * 0.2);
  if (category === 'CONTENT') return Math.min(1, 0.5 + achievement.confidence * 0.2);
  if (category === 'BUILD') return Math.min(1, 0.4 + achievement.confidence * 0.2);
  return 0.3 + achievement.confidence * 0.1;
}

function categoryEffort(category: OpportunityCategory): 'low' | 'medium' | 'high' {
  if (category === 'FOLLOW_UP' || category === 'LEARN') return 'low';
  if (category === 'CONTENT' || category === 'PUBLISH') return 'medium';
  return 'medium';
}

function categoryGoalAlignment(category: OpportunityCategory): string[] {
  switch (category) {
    case 'CONTENT': return ['build-public-profile', 'demonstrate-expertise'];
    case 'PORTFOLIO': return ['strengthen-portfolio', 'proof-of-work'];
    case 'BUILD': return ['deliver-value', 'technical-growth'];
    case 'PUBLISH': return ['capture-value', 'expand-reach'];
    case 'FOLLOW_UP': return ['capture-value', 'continuous-improvement'];
    case 'CONNECT': return ['expand-network', 'create-opportunities'];
    case 'DOCUMENT': return ['knowledge-sharing', 'reduce-friction'];
    case 'LEARN': return ['skill-growth', 'long-term-value'];
    case 'AUTOMATE': return ['efficiency', 'leverage'];
    case 'POSITIONING': return ['align-positioning', 'focus-messaging'];
    case 'OUTREACH': return ['expand-network', 'create-opportunities'];
    default: return ['general'];
  }
}

function categoryPrimaryAction(category: OpportunityCategory, achievement: Achievement): string {
  switch (category) {
    case 'CONTENT': return `Draft content based on "${achievement.title}"`;
    case 'PORTFOLIO': return `Add "${achievement.title}" to portfolio`;
    case 'BUILD': return `Plan next build step from "${achievement.title}"`;
    case 'PUBLISH': return `Publish "${achievement.title}" results`;
    case 'FOLLOW_UP': return `Schedule follow-up for "${achievement.title}"`;
    case 'CONNECT': return `Connect with peers interested in "${achievement.title}"`;
    case 'DOCUMENT': return `Document "${achievement.title}"`;
    case 'LEARN': return `Reflect on what "${achievement.title}" taught you`;
    case 'AUTOMATE': return `Automate repetitive work from "${achievement.title}"`;
    case 'POSITIONING': return `Review positioning in light of "${achievement.title}"`;
    case 'OUTREACH': return `Outreach around "${achievement.title}"`;
    default: return `Review "${achievement.title}"`;
  }
}

function rankRadarRecommendation(rec: RadarRecommendation, achievement: Achievement): number {
  const freshness = achievement.timestamp
    ? Math.max(0, 1 - (Date.now() - new Date(achievement.timestamp).getTime()) / (90 * 86400000))
    : 0.5;
  const effortScore = rec.effort === 'low' ? 0.15 : rec.effort === 'medium' ? 0.05 : 0;
  const goalAlignmentScore = rec.goalAlignment.length > 0 ? 0.1 : 0;
  return rec.confidence * 0.4 + rec.expectedValue * 0.25 + freshness * 0.15 + effortScore + goalAlignmentScore;
}
