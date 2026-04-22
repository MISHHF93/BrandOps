import { getIntelligenceRules } from '../../rules/intelligenceRulesRuntime';
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
  const r = getIntelligenceRules().contentPriority;
  let score = r.baseScore;
  if (item.status === 'ready') score += r.readyBonus;
  if (item.status === 'drafting') score += r.draftingBonus;
  if (item.status === 'idea') score += r.ideaBonus;
  score += Math.min(item.tags.length * r.tagWeight, r.tagCap);
  if (item.goal.toLowerCase().includes('discovery') || item.goal.toLowerCase().includes('lead')) {
    score += r.discoveryGoalBonus;
  }
  return clamp(score);
};

const outreachUrgencyScore = (draft: OutreachDraft) => {
  const r = getIntelligenceRules().outreachUrgency;
  let score = r.baseScore;
  if (draft.status === 'ready') score += r.readyBonus;
  if (draft.status === 'scheduled follow-up') score += r.scheduledFollowUpBonus;
  if (draft.status === 'replied') score += r.repliedBonus;
  const ageHours = (Date.now() - new Date(draft.updatedAt).getTime()) / (1000 * 60 * 60);
  if (ageHours > r.staleAfterHours) score += r.staleBonus;
  if (draft.outreachGoal.toLowerCase().includes('call')) score += r.callIntentBonus;
  return clamp(score);
};

const overdueRiskScore = (dueAt?: string) => {
  const b = getIntelligenceRules().overdueRisk;
  const dueHours = hoursUntil(dueAt);
  if (!Number.isFinite(dueHours)) return 0;
  if (dueHours <= -24) return b.pastDue24hScore;
  if (dueHours <= 0) return b.pastDueScore;
  if (dueHours <= 24) return b.within24hScore;
  if (dueHours <= 48) return b.within48hScore;
  return b.beyond48hScore;
};

const opportunityHealth = (opportunity: Opportunity) => {
  const h = getIntelligenceRules().opportunityHealth;
  const followUpRisk = overdueRiskScore(opportunity.followUpDate);
  const confidenceBonus = opportunity.confidence * h.confidenceMultiplier;
  const valueBonus = Math.min(opportunity.valueUsd / h.valueDivisor, h.valueBonusCap);
  const stagePenalty =
    opportunity.status === 'lost'
      ? h.lostPenalty
      : opportunity.status === 'won'
        ? -h.wonAdjustment
        : 0;
  return clamp(100 - followUpRisk + confidenceBonus + valueBonus - stagePenalty);
};

/** Open pipeline totals: raw sum of valueUsd vs confidence-weighted (same weighting intuition as health rules). */
export interface PipelineProjectionReadout {
  /** Sum of valueUsd × (confidence/100) over active, non-terminal deals. */
  weightedOpenValueUsd: number;
  /** Sum of valueUsd over the same set. */
  rawOpenValueUsd: number;
  /** Count of deals included in the sums. */
  activeDealCount: number;
}

const isTerminalOpportunity = (o: Opportunity) =>
  o.archivedAt != null || o.status === 'won' || o.status === 'lost';

const publishingRecommendation = (item: PublishingItem): Recommendation => {
  const p = getIntelligenceRules().publishing;
  const dueInHours = hoursUntil(item.scheduledFor);
  if (!item.scheduledFor) {
    return {
      title: 'No schedule set',
      rationale: 'This draft has no target date. Add a publish window to avoid silent backlog growth.'
    };
  }

  if (dueInHours < p.urgentWithinHours) {
    return {
      title: 'Publish-ready check',
      rationale: `This item is due within ${p.urgentWithinHours} hour(s). Verify hook clarity and CTA before posting.`
    };
  }

  if (dueInHours < p.prepWithinHours) {
    return {
      title: 'Prep supporting assets',
      rationale: `This item is due in under ${p.prepWithinHours} hours. Queue links, visuals, and first-comment copy now.`
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

  /**
   * Ranks opportunities by deterministic heuristics (follow-up risk, confidence, value, stage).
   * This is not an LLM or financial forecast; for narrative “why” copy from a model, add a separate adapter.
   */
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

  /**
   * Confidence-weighted open pipeline (not a forecast). Excludes won/lost/archived.
   * Weighted = Σ valueUsd × (confidence/100).
   */
  pipelineProjection(opportunities: Opportunity[]): PipelineProjectionReadout {
    const open = opportunities.filter((o) => !isTerminalOpportunity(o));
    const rawOpenValueUsd = Math.round(
      open.reduce((sum, o) => sum + Math.max(0, o.valueUsd), 0)
    );
    const weightedOpenValueUsd = Math.round(
      open.reduce(
        (sum, o) => sum + Math.max(0, o.valueUsd) * (clamp(o.confidence, 0, 100) / 100),
        0
      )
    );
    return {
      weightedOpenValueUsd,
      rawOpenValueUsd,
      activeDealCount: open.length
    };
  },

  /**
   * Deals in proposal or negotiation — ranked by the same health heuristic as pipeline health.
   */
  opportunitiesToClose(opportunities: Opportunity[], limit = 8): IntelligenceSignal[] {
    const closingStages = new Set<Opportunity['status']>(['proposal', 'negotiation']);
    const candidates = opportunities.filter(
      (o) => !isTerminalOpportunity(o) && closingStages.has(o.status)
    );
    return this.rankSignals(
      candidates.map((item) => ({
        id: item.id,
        label: `${item.name} • ${item.company}`,
        score: opportunityHealth(item),
        reason: `Stage ${item.status}; $${item.valueUsd.toLocaleString()} @ ${item.confidence}% · ${item.nextAction || 'set next action in Chat'}.`
      }))
    ).slice(0, limit);
  },

  publishingRecommendations(queue: PublishingItem[]): Recommendation[] {
    const slice = getIntelligenceRules().publishing.previewQueueSlice;
    return queue
      .filter((item) => item.status !== 'posted' && item.status !== 'skipped')
      .slice(0, slice)
      .map((item) => ({
        title: `${item.title}: ${publishingRecommendation(item).title}`,
        rationale: publishingRecommendation(item).rationale
      }));
  },

  templateSuggestionsFromVault(snippets: string[], draftText: string): string[] {
    const t = getIntelligenceRules().templateSuggestions;
    const normalizedDraft = draftText.toLowerCase();
    return snippets
      .map((snippet) => ({
        snippet,
        overlap: snippet
          .toLowerCase()
          .split(/\s+/)
          .filter((token) => token.length > t.minTokenLength && normalizedDraft.includes(token)).length
      }))
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, t.maxResults)
      .map((item) => item.snippet);
  }
};
