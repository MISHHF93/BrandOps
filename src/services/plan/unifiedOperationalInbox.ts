import { localIntelligence } from '../intelligence/localIntelligence';
import type { BrandOpsData } from '../../types/domain';
import { buildCrossPlatformOperationalPlans } from './crossPlatformPlanner';

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
  return `ask: Triage this Unified Operational Inbox item. Explain the next best action, approval needs, risks, and receipt expectations. Do not execute externally.\n\nKind: ${item.kind}\nSource: ${item.sourceLabel}\nTitle: ${item.title}\nDetail: ${item.detail}`;
}

export function buildUnifiedOperationalInbox(
  workspace: BrandOpsData
): UnifiedOperationalInboxReadout {
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
      at: new Date().toISOString(),
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
      at: new Date().toISOString(),
      command: itemCommand({
        title: signal.label,
        detail: signal.reason,
        kind: 'ai-opportunity',
        sourceLabel: 'AI opportunity'
      })
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
      at: new Date().toISOString(),
      command: plan.previewCommand
    });
  }

  const sorted = uniqItems(items)
    .sort(
      (a, b) =>
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        sortTime(b.at) - sortTime(a.at)
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
