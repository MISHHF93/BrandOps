import { quoteContextValue } from '../../services/interop/validation';
import { localIntelligence } from '../intelligence/localIntelligence';
import type { BrandOpsData } from '../../types/domain';
import { buildCrossPlatformOperationalPlans } from './crossPlatformPlanner';
import { buildBehavioralIntelligenceEngineReadout } from '../intelligence/behavioralIntelligenceEngine';
import { buildPredictiveOpportunityLayerReadout } from './predictiveOpportunityLayer';
import { buildBuyerPersonaIntelligenceReadout } from './buyerPersonaIntelligence';
import { buildPositioningIntelligenceReadout } from './positioningIntelligence';
import { buildPredictiveContentIdeationReadout } from './predictiveContentIdeationEngine';
import { buildWorkflowPredictionLayerReadout } from './workflowPredictionLayer';
import { buildMemoryContextEngineReadout } from '../memory/memoryContextEngine';

export type UnifiedInboxKind =
  | 'notification'
  | 'approval'
  | 'suggested-action'
  | 'workflow-alert'
  | 'ai-opportunity'
  | 'pending-draft';

export type UnifiedInboxPriority = 'critical' | 'high' | 'medium' | 'low';

export interface UnifiedOperationalInboxItem {
  id: string;
  kind: UnifiedInboxKind;
  title: string;
  detail: string;
  sourceLabel: string;
  priority: UnifiedInboxPriority;
  status: string;
  at: string;
  command: string;
}

export interface UnifiedOperationalInboxReadout {
  items: UnifiedOperationalInboxItem[];
  totalCount: number;
  countsByKind: Record<UnifiedInboxKind, number>;
  highPriorityCount: number;
  headline: string;
}

const KIND_ORDER: Record<UnifiedInboxKind, number> = {
  approval: 0,
  'workflow-alert': 1,
  'ai-opportunity': 2,
  'pending-draft': 3,
  'suggested-action': 4,
  notification: 5
};

const PRIORITY_ORDER: Record<UnifiedInboxPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

function nowish(value?: string): string {
  return value && value.trim() ? value : new Date().toISOString();
}

function sortTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function uniqItems(items: UnifiedOperationalInboxItem[]): UnifiedOperationalInboxItem[] {
  const seen = new Set<string>();
  const out: UnifiedOperationalInboxItem[] = [];
  for (const item of items) {
    const key = `${item.kind}:${item.title.toLowerCase()}:${item.sourceLabel.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function countsByKind(items: UnifiedOperationalInboxItem[]): Record<UnifiedInboxKind, number> {
  return items.reduce<Record<UnifiedInboxKind, number>>(
    (acc, item) => {
      acc[item.kind] += 1;
      return acc;
    },
    {
      notification: 0,
      approval: 0,
      'suggested-action': 0,
      'workflow-alert': 0,
      'ai-opportunity': 0,
      'pending-draft': 0
    }
  );
}

function itemCommand(item: {
  title: string;
  detail: string;
  kind: UnifiedInboxKind;
  sourceLabel: string;
}): string {
  return `ask: Triage this Unified Operational Inbox item. Explain the next best action, approval needs, risks, and receipt expectations. Do not execute externally.\n\nKind: ${item.kind}\nSource: ${quoteContextValue(item.sourceLabel)}\nTitle: ${quoteContextValue(item.title)}\nDetail: ${quoteContextValue(item.detail)}`;
}

export function buildUnifiedOperationalInbox(
  workspace: BrandOpsData
): UnifiedOperationalInboxReadout {
  /**
   * One timestamp for every item this function derives, not one per item.
   *
   * These entries are computed from the workspace rather than recorded from an
   * event, so they have no time of their own. Stamping each with `new Date()`
   * as it was built gave them times a few milliseconds apart, and the list is
   * sorted by recency — so which derived item came first depended on how long
   * the code took to reach it. Two rebuilds of an unchanged workspace returned
   * the inbox in different orders, and the list that tells someone what needs
   * their attention reshuffled itself while they were looking at it.
   *
   * A single instant for the whole derivation removes the race: derived items
   * tie with each other by construction and fall through to the stable
   * tie-break below, while real events keep the times they actually happened.
   */
  const derivedAt = new Date().toISOString();
  const items: UnifiedOperationalInboxItem[] = [];

  for (const trace of (workspace.operatorTraces?.entries ?? []).filter(
    (entry) => entry.reviewStatus === 'pending'
  )) {
    const title = trace.verb;
    const detail = [
      trace.surface ? `surface ${trace.surface}` : '',
      trace.route ? `route ${trace.route}` : '',
      trace.entityType ? `entity ${trace.entityType}` : '',
      trace.annotatorNote ?? ''
    ]
      .filter(Boolean)
      .join(' · ');
    items.push({
      id: `inbox-approval-${trace.id}`,
      kind: 'approval',
      title,
      detail: detail || 'Human approval required before execution.',
      sourceLabel: 'Human Approval Queue',
      priority: 'critical',
      status: 'pending approval',
      at: trace.at,
      command: itemCommand({
        title,
        detail: detail || 'Human approval required before execution.',
        kind: 'approval',
        sourceLabel: 'Human Approval Queue'
      })
    });
  }

  for (const feed of workspace.integrationHub.liveFeed.slice(0, 8)) {
    const priority: UnifiedInboxPriority =
      feed.level === 'warning' ? 'high' : feed.level === 'success' ? 'low' : 'medium';
    items.push({
      id: `inbox-notification-${feed.id}`,
      kind: 'notification',
      title: feed.title,
      detail: feed.detail,
      sourceLabel: feed.source,
      priority,
      status: feed.level,
      at: feed.happenedAt,
      command: itemCommand({
        title: feed.title,
        detail: feed.detail,
        kind: 'notification',
        sourceLabel: feed.source
      })
    });
  }

  for (const task of workspace.scheduler.tasks.filter(
    (entry) => entry.status === 'missed' || entry.status === 'due' || entry.status === 'due-soon'
  )) {
    const priority: UnifiedInboxPriority = task.status === 'missed' ? 'critical' : 'high';
    items.push({
      id: `inbox-alert-${task.id}`,
      kind: 'workflow-alert',
      title: task.title,
      detail: task.detail || `Task is ${task.status}.`,
      sourceLabel: `Scheduler / ${task.sourceType}`,
      priority,
      status: task.status,
      at: task.dueAt,
      command: itemCommand({
        title: task.title,
        detail: task.detail || `Task is ${task.status}.`,
        kind: 'workflow-alert',
        sourceLabel: `Scheduler / ${task.sourceType}`
      })
    });
  }

  for (const risk of localIntelligence.overdueRisk(workspace).slice(0, 5)) {
    items.push({
      id: `inbox-risk-${risk.id}`,
      kind: 'workflow-alert',
      title: risk.label,
      detail: risk.reason,
      sourceLabel: 'Follow-up risk',
      priority: risk.score >= 80 ? 'critical' : 'high',
      status: `${risk.score} risk`,
      at: derivedAt,
      command: itemCommand({
        title: risk.label,
        detail: risk.reason,
        kind: 'workflow-alert',
        sourceLabel: 'Follow-up risk'
      })
    });
  }

  for (const signal of localIntelligence.opportunitiesToClose(workspace.opportunities, 5)) {
    items.push({
      id: `inbox-ai-opportunity-${signal.id}`,
      kind: 'ai-opportunity',
      title: signal.label,
      detail: signal.reason,
      sourceLabel: 'AI opportunity',
      priority: signal.score >= 80 ? 'high' : 'medium',
      status: `${signal.score} fit`,
      at: derivedAt,
      command: itemCommand({
        title: signal.label,
        detail: signal.reason,
        kind: 'ai-opportunity',
        sourceLabel: 'AI opportunity'
      })
    });
  }

  for (const prediction of buildBehavioralIntelligenceEngineReadout(workspace).predictions.slice(
    0,
    5
  )) {
    items.push({
      id: `inbox-behavioral-prediction-${prediction.id}`,
      kind: 'ai-opportunity',
      title: prediction.title,
      detail: `${prediction.rationale} ${prediction.approvalGate}`,
      sourceLabel: 'Behavioral Intelligence Engine',
      priority: prediction.confidence >= 80 ? 'high' : 'medium',
      status: `${prediction.confidence}% prediction`,
      at: derivedAt,
      command: prediction.suggestedCommand
    });
  }

  for (const suggestion of buildPredictiveOpportunityLayerReadout(workspace).suggestions.slice(
    0,
    5
  )) {
    items.push({
      id: `inbox-predictive-opportunity-${suggestion.id}`,
      kind: 'ai-opportunity',
      title: suggestion.title,
      detail: `${suggestion.whyThisAppeared} Expected impact: ${suggestion.expectedImpact}`,
      sourceLabel: 'Predictive Opportunity Layer',
      priority: suggestion.confidence >= 80 ? 'high' : 'medium',
      status: `${suggestion.confidence}% confidence`,
      at: derivedAt,
      command: suggestion.previewCommand
    });
  }

  const buyerPersona = buildBuyerPersonaIntelligenceReadout(workspace);
  items.push({
    id: 'inbox-buyer-persona-intelligence',
    kind: 'ai-opportunity',
    title: buyerPersona.idealCustomerProfile.title,
    detail: `${buyerPersona.headline} Review, edit, approve, regenerate, or compare versions before use.`,
    sourceLabel: 'Buyer Persona Intelligence',
    priority: buyerPersona.averageConfidence >= 80 ? 'high' : 'medium',
    status: `${buyerPersona.averageConfidence}% confidence`,
    at: derivedAt,
    command: buyerPersona.compareVersionsCommand
  });

  const positioning = buildPositioningIntelligenceReadout(workspace);
  items.push({
    id: 'inbox-positioning-intelligence',
    kind: 'ai-opportunity',
    title: 'Positioning Intelligence',
    detail: `${positioning.headline} Strengths: ${positioning.strengths.slice(0, 2).join(' ')} Gaps: ${positioning.gaps.slice(0, 2).join(' ')}`,
    sourceLabel: 'Positioning Intelligence',
    priority: positioning.averageConfidence >= 80 ? 'high' : 'medium',
    status: `${positioning.averageConfidence}% confidence`,
    at: derivedAt,
    command: positioning.reviewCommand
  });

  const memory = buildMemoryContextEngineReadout(workspace);
  items.push({
    id: 'inbox-memory-context-engine',
    kind: 'ai-opportunity',
    title: 'Memory & Context Engine',
    detail: `${memory.headline} Users can view, edit, delete, or disable memory.`,
    sourceLabel: 'Memory & Context Engine',
    priority: memory.enabled ? 'medium' : 'low',
    status: memory.enabled ? `${memory.averageConfidence}% memory confidence` : 'memory disabled',
    at: derivedAt,
    command: memory.controls.viewCommand
  });

  for (const idea of buildPredictiveContentIdeationReadout(workspace).allIdeas.slice(0, 4)) {
    items.push({
      id: `inbox-predictive-content-ideation-${idea.id}`,
      kind: 'ai-opportunity',
      title: idea.title,
      detail: `${idea.whyNow} Expected impact: ${idea.expectedImpact}`,
      sourceLabel: 'Predictive Content Ideation',
      priority: idea.confidence >= 80 ? 'high' : 'medium',
      status: `${idea.confidence}% confidence`,
      at: derivedAt,
      command: idea.askToPlanCommand
    });
  }

  for (const workflow of buildWorkflowPredictionLayerReadout(workspace).predictions.slice(0, 4)) {
    items.push({
      id: `inbox-workflow-prediction-${workflow.id}`,
      kind: 'ai-opportunity',
      title: workflow.title,
      detail: `${workflow.repeatedPattern} ${workflow.suggestion}`,
      sourceLabel: 'Workflow Prediction Layer',
      priority: workflow.confidence >= 80 ? 'high' : 'medium',
      status: `${workflow.confidence}% confidence`,
      at: derivedAt,
      command: workflow.controls.reuseCommand
    });
  }

  for (const draft of workspace.outreachDrafts.filter((entry) => entry.status !== 'archived')) {
    const title = `${draft.targetName} (${draft.company})`;
    const detail = `${draft.status}: ${draft.outreachGoal}`;
    items.push({
      id: `inbox-draft-outreach-${draft.id}`,
      kind: 'pending-draft',
      title,
      detail,
      sourceLabel: 'Outreach draft',
      priority: draft.status === 'ready' ? 'high' : 'medium',
      status: draft.status,
      at: draft.updatedAt,
      command: itemCommand({
        title,
        detail,
        kind: 'pending-draft',
        sourceLabel: 'Outreach draft'
      })
    });
  }

  for (const draft of workspace.contentLibrary.filter(
    (entry) => entry.status === 'drafting' || entry.status === 'ready' || entry.status === 'idea'
  )) {
    const detail = `${draft.status}: ${draft.goal || draft.type}`;
    items.push({
      id: `inbox-draft-content-${draft.id}`,
      kind: 'pending-draft',
      title: draft.title,
      detail,
      sourceLabel: 'Content draft',
      priority: draft.status === 'ready' ? 'high' : 'medium',
      status: draft.status,
      at: draft.updatedAt,
      command: itemCommand({
        title: draft.title,
        detail,
        kind: 'pending-draft',
        sourceLabel: 'Content draft'
      })
    });
  }

  for (const plan of buildCrossPlatformOperationalPlans(workspace).filter(
    (entry) => entry.executionStatus === 'needs-context' || entry.executionStatus === 'ready'
  )) {
    items.push({
      id: `inbox-suggested-${plan.id}`,
      kind: 'suggested-action',
      title: plan.title,
      detail: plan.purpose,
      sourceLabel: 'Cross-platform planner',
      priority: plan.executionStatus === 'needs-context' ? 'low' : 'medium',
      status: plan.executionStatus,
      at: derivedAt,
      command: plan.previewCommand
    });
  }

  const sorted = uniqItems(items)
    .sort(
      (a, b) =>
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        sortTime(b.at) - sortTime(a.at) ||
        /**
         * A stable last resort, because `at` ties.
         *
         * Several of these items are stamped `new Date()` while this list is
         * being assembled, so two of them routinely land in the same instant —
         * and then their order depended on which comparison the sort happened to
         * make. Two rebuilds of an unchanged workspace returned the inbox in
         * different orders, which means the list telling someone what needs
         * their attention reshuffles itself while they are reading it.
         *
         * Cycle 6 fixed exactly this for checkpoints and used list position as
         * the tie-break. Here the items come from several sources, so position
         * carries no meaning; `id` does, and it is stable across rebuilds.
         */
        a.id.localeCompare(b.id)
    )
    .slice(0, 24)
    .map((item) => ({ ...item, at: nowish(item.at) }));

  const counts = countsByKind(sorted);
  const highPriorityCount = sorted.filter(
    (item) => item.priority === 'critical' || item.priority === 'high'
  ).length;
  const headline =
    sorted.length === 0
      ? 'Inbox clear. No approvals, alerts, drafts, opportunities, or suggested actions are waiting.'
      : `${sorted.length} operational item${sorted.length === 1 ? '' : 's'} across approvals, alerts, opportunities, drafts, and suggested actions.`;

  return {
    items: sorted,
    totalCount: sorted.length,
    countsByKind: counts,
    highPriorityCount,
    headline
  };
}
