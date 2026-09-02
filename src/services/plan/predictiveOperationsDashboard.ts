import { quoteContextValue } from '../../services/interop/validation';
import type { BrandOpsData } from '../../types/domain';
import { buildPlatformAwareAskReadout } from '../ai/platformAwareAskContext';
import { buildBehavioralIntelligenceEngineReadout } from '../intelligence/behavioralIntelligenceEngine';
import { localIntelligence } from '../intelligence/localIntelligence';
import { buildMemoryContextEngineReadout } from '../memory/memoryContextEngine';
import { buildOpportunityEngineReadout } from './opportunityEngine';
import { buildPlatformActionCards } from './platformActionCards';
import { buildPredictiveOpportunityLayerReadout } from './predictiveOpportunityLayer';
import { buildWorkflowPredictionLayerReadout } from './workflowPredictionLayer';

export type PredictiveOperationsKind =
  | 'opportunity'
  | 'predicted-need'
  | 'suggested-workflow'
  | 'pending-approval'
  | 'operational-bottleneck'
  | 'growth-recommendation'
  | 'platform-insight'
  | 'next-best-action';

export type PredictiveOperationsUrgency = 'critical' | 'high' | 'medium' | 'low';

export interface PredictiveOperationsItem {
  id: string;
  kind: PredictiveOperationsKind;
  title: string;
  detail: string;
  urgency: PredictiveOperationsUrgency;
  confidence: number;
  sourceLabel: string;
  signals: string[];
  command: string;
  /**
   * When the underlying signal was observed. Feeds recency decay in ranking, so
   * a stale recommendation stops outranking a live one on a confidence tie.
   * Optional: an undated item scores as middling, never as fresh.
   */
  observedAt?: string;
}

export interface PredictiveOperationsDashboardReadout {
  opportunities: PredictiveOperationsItem[];
  predictedNeeds: PredictiveOperationsItem[];
  suggestedWorkflows: PredictiveOperationsItem[];
  pendingApprovals: PredictiveOperationsItem[];
  operationalBottlenecks: PredictiveOperationsItem[];
  growthRecommendations: PredictiveOperationsItem[];
  platformInsights: PredictiveOperationsItem[];
  nextBestActions: PredictiveOperationsItem[];
  allItems: PredictiveOperationsItem[];
  liveScore: number;
  urgentCount: number;
  approvalCount: number;
  platformInsightCount: number;
  headline: string;
  stateLine: string;
  generatedAt: string;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function compact(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniq(values: unknown[], cap = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const t = compact(value);
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t.slice(0, 240));
    if (out.length >= cap) break;
  }
  return out;
}

function urgency(confidence: number, pressure = 0): PredictiveOperationsUrgency {
  const score = confidence + pressure;
  if (score >= 92) return 'critical';
  if (score >= 78) return 'high';
  if (score >= 58) return 'medium';
  return 'low';
}

function item(input: PredictiveOperationsItem): PredictiveOperationsItem {
  return {
    ...input,
    title: compact(input.title).slice(0, 120),
    detail: compact(input.detail).slice(0, 360),
    confidence: clamp(input.confidence),
    signals: input.signals.length
      ? uniq(input.signals, 6)
      : [
          'Workspace state is available; connect more sources or approve more memory for stronger signal.'
        ]
  };
}

function commandFor(input: {
  title: string;
  kind: PredictiveOperationsKind;
  detail: string;
  signals: string[];
}) {
  return `ask: Review this Predictive Operations Dashboard item and turn it into a PLAN-ready next action. Do not execute externally or mutate workspace records. Include why now, evidence, risks, approval gate, owner handoff, expected impact, and receipt expectations.\n\nType: ${input.kind}\nTitle: ${quoteContextValue(input.title)}\nDetail: ${quoteContextValue(input.detail)}\nSignals: ${quoteContextValue(input.signals.join(' | '))}`;
}

/**
 * Recency decay, so a stale recommendation stops competing with a live one.
 *
 * Ranking used to be urgency → confidence → **alphabetical by title**. A signal
 * from six months ago outranked one from this morning whenever confidence tied,
 * and the tiebreak was the first letter of the title. For a surface that answers
 * "what should I do today?", that is the wrong answer arriving with confidence.
 *
 * Same half-life as context retrieval (60 days) and the same shape, because two
 * different decay curves in one product is how they drift apart.
 */
const FRESHNESS_HALF_LIFE_DAYS = 60;

function freshness(observedAt: string | undefined, now: Date): number {
  if (!observedAt) return 0.4; // Undated is treated as middling, never as fresh.
  const ts = new Date(observedAt).getTime();
  if (!Number.isFinite(ts)) return 0.4;
  const ageDays = Math.max(0, (now.getTime() - ts) / 86_400_000);
  return Math.max(0.05, Math.exp(-ageDays / FRESHNESS_HALF_LIFE_DAYS));
}

/**
 * Effective score: confidence weighted by how recent the underlying signal is.
 * Urgency still dominates — a critical item does not fall behind a fresher
 * medium one, because urgency is a statement about consequence, not about age.
 */
function effectiveScore(item: PredictiveOperationsItem, now: Date): number {
  return 0.7 * item.confidence + 0.3 * freshness(item.observedAt, now);
}

function sortItems(
  items: PredictiveOperationsItem[],
  now: Date = new Date()
): PredictiveOperationsItem[] {
  const priority: Record<PredictiveOperationsUrgency, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  };
  return [...items].sort(
    (a, b) =>
      priority[a.urgency] - priority[b.urgency] ||
      effectiveScore(b, now) - effectiveScore(a, now) ||
      a.title.localeCompare(b.title)
  );
}

/**
 * Test seam for the ranking itself. Exported so ordering can be asserted with
 * controlled timestamps rather than inferred from a whole readout, where a
 * fixture change could silently stop exercising the decay path.
 */
export function sortPredictiveItemsForTest(
  items: PredictiveOperationsItem[],
  now: Date
): PredictiveOperationsItem[] {
  return sortItems(items, now);
}

export function buildPredictiveOperationsDashboardReadout(
  workspace: BrandOpsData
): PredictiveOperationsDashboardReadout {
  const now = new Date().toISOString();
  const opportunityEngine = buildOpportunityEngineReadout(workspace);
  const predictive = buildPredictiveOpportunityLayerReadout(workspace);
  const workflows = buildWorkflowPredictionLayerReadout(workspace);
  const behavioral = buildBehavioralIntelligenceEngineReadout(workspace);
  const platform = buildPlatformAwareAskReadout(workspace);
  const platformCards = buildPlatformActionCards(workspace);
  const memory = buildMemoryContextEngineReadout(workspace);
  const followUpRisk = localIntelligence.overdueRisk(workspace).slice(0, 5);
  const contentSignals = localIntelligence.contentPriority(workspace.contentLibrary).slice(0, 4);
  const closeSignals = localIntelligence.opportunitiesToClose(workspace.opportunities, 4);
  const pendingTraces = (workspace.operatorTraces?.entries ?? []).filter(
    (trace) => trace.reviewStatus === 'pending'
  );
  const openTasks = workspace.scheduler.tasks.filter((task) => task.status !== 'completed');
  const missedTasks = workspace.scheduler.tasks.filter((task) => task.status === 'missed');

  const opportunities = opportunityEngine.suggestions.slice(0, 4).map((suggestion) =>
    item({
      id: `ops-opportunity-${suggestion.id}`,
      kind: 'opportunity',
      title: suggestion.title,
      detail: suggestion.recommendation,
      urgency: urgency(suggestion.confidence, closeSignals.length * 3),
      confidence: suggestion.confidence,
      sourceLabel: 'Opportunity Engine',
      signals: [...suggestion.sourceContext, ...suggestion.platformContext],
      command: suggestion.previewCommand
    })
  );

  const predictedNeeds = predictive.suggestions.slice(0, 5).map((suggestion) =>
    item({
      id: `ops-need-${suggestion.id}`,
      kind: 'predicted-need',
      title: suggestion.title,
      detail: `${suggestion.whyThisAppeared} Expected impact: ${suggestion.expectedImpact}`,
      urgency: urgency(suggestion.confidence, suggestion.kind === 'follow-up-suggestion' ? 8 : 0),
      confidence: suggestion.confidence,
      sourceLabel: 'Predictive Opportunity Layer',
      signals: suggestion.supportingSignals,
      command: suggestion.previewCommand
    })
  );

  const suggestedWorkflows = workflows.predictions.slice(0, 4).map((workflow) =>
    item({
      id: `ops-workflow-${workflow.id}`,
      kind: 'suggested-workflow',
      title: workflow.title,
      detail: `${workflow.repeatedPattern} ${workflow.suggestion}`,
      urgency: urgency(workflow.confidence, 4),
      confidence: workflow.confidence,
      sourceLabel: 'Workflow Prediction Layer',
      signals: workflow.evidence,
      command: workflow.controls.reuseCommand
    })
  );

  const pendingApprovals = [
    ...pendingTraces.slice(0, 5).map((trace) =>
      item({
        id: `ops-approval-trace-${trace.id}`,
        kind: 'pending-approval' as const,
        title: `${trace.verb}${trace.surface ? ` on ${trace.surface}` : ''}`,
        detail: 'Operator trace is waiting for review before BrandOps trusts or reuses it.',
        urgency: 'high' as const,
        confidence: 82,
        sourceLabel: 'Human approval queue',
        signals: [
          trace.outcome ?? 'pending review',
          trace.entityType ?? '',
          trace.annotatorNote ?? ''
        ],
        command: `ask: Review this pending operator trace. Do not execute externally. Explain what happened, whether to approve/reject, memory implications, and receipt expectations.\n\nTrace: ${trace.verb}\nSurface: ${trace.surface ?? 'unknown'}\nOutcome: ${trace.outcome ?? 'unknown'}`
      })
    ),
    ...memory.entriesByCategory['rejected-outputs'].slice(0, 2).map((entry) =>
      item({
        id: `ops-approval-rejected-${entry.id}`,
        kind: 'pending-approval' as const,
        title: `Avoid rejected output: ${entry.value}`,
        detail: 'Rejected memory should shape future suggestions and prevent repeated bad output.',
        urgency: 'medium' as const,
        confidence: entry.confidence,
        sourceLabel: 'Memory & Context Engine',
        signals: [entry.source, entry.label],
        command: memory.controls.viewCommand
      })
    )
  ];

  const operationalBottlenecks = [
    ...followUpRisk.map((risk) =>
      item({
        id: `ops-bottleneck-risk-${risk.id}`,
        kind: 'operational-bottleneck' as const,
        title: risk.label,
        detail: risk.reason,
        urgency: urgency(risk.score, 12),
        confidence: risk.score,
        sourceLabel: 'Local Intelligence',
        signals: [risk.reason],
        command: commandFor({
          title: risk.label,
          kind: 'operational-bottleneck',
          detail: risk.reason,
          signals: [risk.reason]
        })
      })
    ),
    ...missedTasks.slice(0, 3).map((task) =>
      item({
        id: `ops-bottleneck-task-${task.id}`,
        kind: 'operational-bottleneck' as const,
        title: task.title,
        detail: `Missed scheduler task: ${task.detail || task.status}`,
        urgency: 'critical' as const,
        confidence: 88,
        sourceLabel: 'Scheduler',
        signals: [task.status, task.dueAt, task.detail],
        command: `ask: Resolve this operational bottleneck with a PLAN-ready recovery sequence. Do not reschedule or mutate records automatically.\n\nTask: ${quoteContextValue(task.title)}\nDue: ${task.dueAt}\nDetail: ${quoteContextValue(task.detail)}`
      })
    ),
    ...(openTasks.length > workspace.settings.notificationCenter.maxDailyTasks
      ? [
          item({
            id: 'ops-bottleneck-task-load',
            kind: 'operational-bottleneck',
            title: 'Task load exceeds daily operating capacity',
            detail: `${openTasks.length} open tasks exceed max daily task setting of ${workspace.settings.notificationCenter.maxDailyTasks}.`,
            urgency: 'high',
            confidence: 84,
            sourceLabel: 'Notification Center',
            signals: [
              `${openTasks.length} open tasks`,
              `${workspace.settings.notificationCenter.maxDailyTasks} max daily tasks`
            ],
            command: commandFor({
              title: 'Task load exceeds daily operating capacity',
              kind: 'operational-bottleneck',
              detail: `${openTasks.length} open tasks exceed daily capacity.`,
              signals: openTasks.slice(0, 5).map((task) => task.title)
            })
          })
        ]
      : [])
  ];

  const growthRecommendations = predictive.suggestions
    .filter((suggestion) =>
      [
        'growth-opportunity',
        'content-ideation',
        'positioning-analysis',
        'buyer-persona-generation'
      ].includes(suggestion.kind)
    )
    .slice(0, 4)
    .map((suggestion) =>
      item({
        id: `ops-growth-${suggestion.id}`,
        kind: 'growth-recommendation',
        title: suggestion.title,
        detail: suggestion.suggestion,
        urgency: urgency(suggestion.confidence),
        confidence: suggestion.confidence,
        sourceLabel: 'Predictive Opportunity Layer',
        signals: suggestion.supportingSignals,
        command: suggestion.previewCommand
      })
    );

  const platformInsights = [
    ...platformCards.slice(0, 5).map((card) =>
      item({
        id: `ops-platform-${card.id}`,
        kind: 'platform-insight' as const,
        title: `${card.platform}: ${card.title}`,
        detail: card.description,
        urgency: card.sourceContext.length ? 'medium' : 'low',
        confidence: card.sourceContext.length ? 74 : 54,
        sourceLabel: 'Platform Action Cards',
        signals: card.sourceContext,
        command: card.command
      })
    ),
    ...platform.recentActivity.slice(0, 3).map((activity, index) =>
      item({
        id: `ops-platform-activity-${index}`,
        kind: 'platform-insight' as const,
        title: 'Recent platform activity',
        detail: activity,
        urgency: 'medium' as const,
        confidence: 66,
        sourceLabel: 'Platform-aware ASK',
        signals: [activity, ...platform.connectedApps],
        command: commandFor({
          title: 'Recent platform activity',
          kind: 'platform-insight',
          detail: activity,
          signals: [activity]
        })
      })
    )
  ];

  const nextBestActions = sortItems([
    ...behavioral.predictions.slice(0, 3).map((prediction) =>
      item({
        id: `ops-next-${prediction.id}`,
        kind: 'next-best-action' as const,
        title: prediction.title,
        detail: prediction.rationale,
        urgency: urgency(prediction.confidence, 6),
        confidence: prediction.confidence,
        sourceLabel: 'Behavioral Intelligence Engine',
        signals: prediction.sourcePatternIds,
        command: prediction.suggestedCommand
      })
    ),
    ...suggestedWorkflows
      .slice(0, 2)
      .map((workflow) => ({ ...workflow, kind: 'next-best-action' as const })),
    ...opportunities
      .slice(0, 2)
      .map((opportunity) => ({ ...opportunity, kind: 'next-best-action' as const })),
    ...contentSignals.slice(0, 2).map((signal) =>
      item({
        id: `ops-next-content-${signal.id}`,
        kind: 'next-best-action' as const,
        title: signal.label,
        detail: signal.reason,
        urgency: urgency(signal.score),
        confidence: signal.score,
        sourceLabel: 'Content Intelligence',
        signals: [signal.reason],
        command: commandFor({
          title: signal.label,
          kind: 'next-best-action',
          detail: signal.reason,
          signals: [signal.reason]
        })
      })
    )
  ]).slice(0, 6);

  const allItems = sortItems([
    ...opportunities,
    ...predictedNeeds,
    ...suggestedWorkflows,
    ...pendingApprovals,
    ...operationalBottlenecks,
    ...growthRecommendations,
    ...platformInsights,
    ...nextBestActions
  ]).slice(0, 36);
  const urgentCount = allItems.filter(
    (row) => row.urgency === 'critical' || row.urgency === 'high'
  ).length;
  const approvalCount = pendingApprovals.length;
  const platformInsightCount = platformInsights.length;
  const liveScore = clamp(
    42 +
      Math.min(allItems.length * 2, 24) +
      Math.min(platform.connectedApps.length * 4, 14) +
      Math.min(memory.entries.length, 12) -
      Math.min(operationalBottlenecks.length * 3, 18)
  );

  return {
    opportunities: sortItems(opportunities),
    predictedNeeds: sortItems(predictedNeeds),
    suggestedWorkflows: sortItems(suggestedWorkflows),
    pendingApprovals: sortItems(pendingApprovals),
    operationalBottlenecks: sortItems(operationalBottlenecks),
    growthRecommendations: sortItems(growthRecommendations),
    platformInsights: sortItems(platformInsights),
    nextBestActions,
    allItems,
    liveScore,
    urgentCount,
    approvalCount,
    platformInsightCount,
    headline: `${allItems.length} predictive operations signal${allItems.length === 1 ? '' : 's'} active across opportunities, needs, workflows, approvals, bottlenecks, growth, platforms, and next best actions.`,
    stateLine: urgentCount
      ? `${urgentCount} urgent item${urgentCount === 1 ? '' : 's'} need review; ${approvalCount} approval${approvalCount === 1 ? '' : 's'} pending.`
      : `Operations are stable; ${nextBestActions.length} next best action${nextBestActions.length === 1 ? '' : 's'} ready for review.`,
    generatedAt: now
  };
}
