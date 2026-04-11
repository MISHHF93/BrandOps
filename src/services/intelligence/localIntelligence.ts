import { BrandOpsData, ContentLibraryItem, Opportunity, OutreachDraft, PublishingItem } from '../../types/domain';

export interface IntelligenceSignal {
  id: string;
  label: string;
  score: number;
  reason: string;
}

export interface Recommendation {
  title: string;
  rationale: string;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const hoursUntil = (iso?: string) => {
  if (!iso) return Number.POSITIVE_INFINITY;
  return (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60);
};

const contentPriorityScore = (item: ContentLibraryItem) => {
  let score = 20;
  if (item.status === 'ready') score += 40;
  if (item.status === 'drafting') score += 20;
  if (item.status === 'idea') score += 10;
  score += Math.min(item.tags.length * 4, 16);
  if (item.goal.toLowerCase().includes('discovery') || item.goal.toLowerCase().includes('lead')) score += 14;
  return clamp(score);
};

const outreachUrgencyScore = (draft: OutreachDraft) => {
  let score = 10;
  if (draft.status === 'ready') score += 35;
  if (draft.status === 'scheduled follow-up') score += 30;
  if (draft.status === 'replied') score += 5;
  const ageHours = (Date.now() - new Date(draft.updatedAt).getTime()) / (1000 * 60 * 60);
  if (ageHours > 72) score += 20;
  if (draft.outreachGoal.toLowerCase().includes('call')) score += 10;
  return clamp(score);
};

const overdueRiskScore = (dueAt?: string) => {
  const dueHours = hoursUntil(dueAt);
  if (!Number.isFinite(dueHours)) return 0;
  if (dueHours <= -24) return 95;
  if (dueHours <= 0) return 80;
  if (dueHours <= 24) return 60;
  if (dueHours <= 48) return 35;
  return 10;
};

const opportunityHealth = (opportunity: Opportunity) => {
  const followUpRisk = overdueRiskScore(opportunity.followUpDate);
  const confidenceBonus = opportunity.confidence * 0.45;
  const valueBonus = Math.min(opportunity.valueUsd / 2000, 25);
  const stagePenalty = opportunity.status === 'lost' ? 80 : opportunity.status === 'won' ? -20 : 0;
  return clamp(100 - followUpRisk + confidenceBonus + valueBonus - stagePenalty);
};

const publishingRecommendation = (item: PublishingItem): Recommendation => {
  const dueInHours = hoursUntil(item.scheduledFor);
  if (!item.scheduledFor) {
    return {
      title: 'No schedule set',
      rationale: 'This draft has no target date. Add a publish window to avoid silent backlog growth.'
    };
  }

  if (dueInHours < 2) {
    return {
      title: 'Publish-ready check',
      rationale: 'This item is due within 2 hours. Verify hook clarity and CTA before posting.'
    };
  }

  if (dueInHours < 24) {
    return {
      title: 'Prep supporting assets',
      rationale: 'This item is due in under 24 hours. Queue links, visuals, and first-comment copy now.'
    };
  }

  return {
    title: 'Keep queued',
    rationale: 'Timing is healthy. Keep this in queue and focus on near-term items first.'
  };
};

export const localIntelligence = {
  rankSignals(signals: IntelligenceSignal[]): IntelligenceSignal[] {
    return [...signals].sort((a, b) => b.score - a.score);
  },

  contentPriority(items: ContentLibraryItem[]): IntelligenceSignal[] {
    return this.rankSignals(
      items.map((item) => ({
        id: item.id,
        label: item.title,
        score: contentPriorityScore(item),
        reason: `Status=${item.status}, tags=${item.tags.length}, goal="${item.goal || 'n/a'}".`
      }))
    );
  },

  outreachUrgency(items: OutreachDraft[]): IntelligenceSignal[] {
    return this.rankSignals(
      items
        .filter((item) => item.status !== 'archived')
        .map((item) => ({
          id: item.id,
          label: `${item.targetName} (${item.company})`,
          score: outreachUrgencyScore(item),
          reason: `Status=${item.status}, goal="${item.outreachGoal}", last update ${new Date(item.updatedAt).toLocaleString()}.`
        }))
    );
  },

  overdueRisk(data: BrandOpsData): IntelligenceSignal[] {
    return this.rankSignals(
      [
        ...data.followUps.filter((item) => !item.completed).map((item) => ({
          id: item.id,
          label: `Follow-up: ${item.reason}`,
          score: overdueRiskScore(item.dueAt),
          reason: `Due ${new Date(item.dueAt).toLocaleString()}.`
        })),
        ...data.opportunities.map((item) => ({
          id: item.id,
          label: `Opportunity: ${item.name}`,
          score: overdueRiskScore(item.followUpDate),
          reason: `Next follow-up ${new Date(item.followUpDate).toLocaleString()}.`
        }))
      ].filter((item) => item.score > 0)
    );
  },

  pipelineHealth(opportunities: Opportunity[]): IntelligenceSignal[] {
    return this.rankSignals(
      opportunities.map((item) => ({
        id: item.id,
        label: `${item.name} • ${item.company}`,
        score: opportunityHealth(item),
        reason: `Confidence ${item.confidence}%, value $${item.valueUsd.toLocaleString()}, status ${item.status}.`
      }))
    );
  },

  publishingRecommendations(queue: PublishingItem[]): Recommendation[] {
    return queue
      .filter((item) => item.status !== 'posted' && item.status !== 'skipped')
      .slice(0, 5)
      .map((item) => ({
        title: `${item.title}: ${publishingRecommendation(item).title}`,
        rationale: publishingRecommendation(item).rationale
      }));
  },

  templateSuggestionsFromVault(snippets: string[], draftText: string): string[] {
    const normalizedDraft = draftText.toLowerCase();
    return snippets
      .map((snippet) => ({
        snippet,
        overlap: snippet
          .toLowerCase()
          .split(/\s+/)
          .filter((token) => token.length > 4 && normalizedDraft.includes(token)).length
      }))
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 3)
      .map((item) => item.snippet);
  }
};
