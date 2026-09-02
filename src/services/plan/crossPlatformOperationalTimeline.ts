import { quoteContextValue } from '../../services/interop/validation';
import type { BrandOpsData } from '../../types/domain';
import { buildOpportunityEngineReadout } from './opportunityEngine';
import { buildPlatformActionCards } from './platformActionCards';

export type CrossPlatformTimelineKind =
  | 'generated-draft'
  | 'approval'
  | 'sent-action'
  | 'scheduled-workflow'
  | 'connected-platform-action'
  | 'ai-recommendation'
  | 'completed-operation'
  | 'failed-operation';

export interface CrossPlatformTimelineItem {
  id: string;
  kind: CrossPlatformTimelineKind;
  whatHappened: string;
  whereItHappened: string;
  whatAiDid: string;
  at: string;
  status: string;
  command?: string;
}

export interface CrossPlatformOperationalTimelineReadout {
  items: CrossPlatformTimelineItem[];
  totalCount: number;
  countsByKind: Record<CrossPlatformTimelineKind, number>;
  headline: string;
}

const KIND_ORDER: Record<CrossPlatformTimelineKind, number> = {
  approval: 0,
  'failed-operation': 1,
  'generated-draft': 2,
  'connected-platform-action': 3,
  'ai-recommendation': 4,
  'scheduled-workflow': 5,
  'sent-action': 6,
  'completed-operation': 7
};

function nowIso(): string {
  return new Date().toISOString();
}

function sortTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function commandFor(item: Omit<CrossPlatformTimelineItem, 'command'>): string {
  return `ask: Explain this cross-platform operational timeline item. Be precise about what happened, where it happened, what the AI did, status, approval needs, and receipt expectations. Do not execute externally.\n\nWhat happened: ${quoteContextValue(item.whatHappened)}\nWhere: ${quoteContextValue(item.whereItHappened)}\nWhat AI did: ${quoteContextValue(item.whatAiDid)}\nStatus: ${item.status}`;
}

function timelineItem(input: Omit<CrossPlatformTimelineItem, 'command'> & { command?: string }) {
  return {
    ...input,
    command: input.command ?? commandFor(input)
  };
}

function countsByKind(
  items: CrossPlatformTimelineItem[]
): Record<CrossPlatformTimelineKind, number> {
  return items.reduce<Record<CrossPlatformTimelineKind, number>>(
    (acc, item) => {
      acc[item.kind] += 1;
      return acc;
    },
    {
      'generated-draft': 0,
      approval: 0,
      'sent-action': 0,
      'scheduled-workflow': 0,
      'connected-platform-action': 0,
      'ai-recommendation': 0,
      'completed-operation': 0,
      'failed-operation': 0
    }
  );
}

function uniqItems(items: CrossPlatformTimelineItem[]): CrossPlatformTimelineItem[] {
  const seen = new Set<string>();
  const out: CrossPlatformTimelineItem[] = [];
  for (const item of items) {
    const key = `${item.kind}:${item.whatHappened.toLowerCase()}:${item.whereItHappened.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function buildCrossPlatformOperationalTimeline(
  workspace: BrandOpsData
): CrossPlatformOperationalTimelineReadout {
  const items: CrossPlatformTimelineItem[] = [];

  for (const draft of workspace.outreachDrafts.filter((entry) => entry.status !== 'archived')) {
    items.push(
      timelineItem({
        id: `timeline-draft-outreach-${draft.id}`,
        kind: 'generated-draft',
        whatHappened: `Outreach draft for ${draft.targetName}`,
        whereItHappened: `BrandOps / ${draft.company}`,
        whatAiDid:
          'Prepared or tracked a draft that must be previewed and approved before external send.',
        at: draft.updatedAt,
        status: draft.status,
        command: `ask: Review this outreach draft and explain approval requirements before external sending.\n\nTarget: ${quoteContextValue(draft.targetName)}\nCompany: ${quoteContextValue(draft.company)}\nGoal: ${quoteContextValue(draft.outreachGoal)}\nDraft: ${quoteContextValue(draft.messageBody)}`
      })
    );
  }

  for (const content of workspace.contentLibrary.filter((entry) => entry.status !== 'archived')) {
    items.push(
      timelineItem({
        id: `timeline-draft-content-${content.id}`,
        kind: content.status === 'published' ? 'completed-operation' : 'generated-draft',
        whatHappened: `Content ${content.status}: ${content.title}`,
        whereItHappened: `BrandOps content library / ${content.type}`,
        whatAiDid:
          content.status === 'published'
            ? 'Tracked completed content operation from workspace state.'
            : 'Prepared content context that can be converted into a PLAN draft or schedule.',
        at: content.updatedAt,
        status: content.status,
        command: `ask: Review this content item for PLAN readiness, approval needs, and next step.\n\nTitle: ${quoteContextValue(content.title)}\nStatus: ${content.status}\nGoal: ${quoteContextValue(content.goal)}`
      })
    );
  }

  for (const trace of workspace.operatorTraces?.entries ?? []) {
    if (trace.reviewStatus === 'pending') {
      items.push(
        timelineItem({
          id: `timeline-approval-${trace.id}`,
          kind: 'approval',
          whatHappened: trace.verb,
          whereItHappened:
            [trace.surface, trace.route, trace.entityType].filter(Boolean).join(' / ') ||
            'PLAN approval queue',
          whatAiDid: 'Created or surfaced work that requires human confirmation before execution.',
          at: trace.at,
          status: 'pending approval',
          command: 'run ai pipeline workspace_audit_report --ack'
        })
      );
    } else if (trace.reviewStatus === 'approved' || trace.reviewStatus === 'rejected') {
      items.push(
        timelineItem({
          id: `timeline-reviewed-${trace.id}`,
          kind: trace.reviewStatus === 'approved' ? 'completed-operation' : 'failed-operation',
          whatHappened: `${trace.verb} ${trace.reviewStatus}`,
          whereItHappened:
            [trace.surface, trace.route, trace.entityType].filter(Boolean).join(' / ') ||
            'Human review',
          whatAiDid: 'Recorded the review outcome for auditability and receipt context.',
          at: trace.at,
          status: trace.reviewStatus
        })
      );
    }
  }

  for (const history of workspace.outreachHistory) {
    items.push(
      timelineItem({
        id: `timeline-sent-${history.id}`,
        kind: 'sent-action',
        whatHappened: `${history.status}: ${history.targetName}`,
        whereItHappened: `Outreach history / ${history.company}`,
        whatAiDid: 'Tracked the outreach outcome so follow-up planning can stay grounded.',
        at: history.loggedAt,
        status: history.status
      })
    );
  }

  for (const task of workspace.scheduler.tasks.filter((entry) => entry.status !== 'cancelled')) {
    items.push(
      timelineItem({
        id: `timeline-scheduled-${task.id}`,
        kind: task.status === 'completed' ? 'completed-operation' : 'scheduled-workflow',
        whatHappened: task.title,
        whereItHappened: `Scheduler / ${task.sourceType}`,
        whatAiDid:
          task.status === 'completed'
            ? 'Tracked completed scheduled work.'
            : 'Placed this workflow into the operating timeline for prioritization.',
        at: task.dueAt,
        status: task.status,
        command: `ask: Review this scheduled workflow and recommend the next operational step.\n\nTask: ${quoteContextValue(task.title)}\nDetail: ${quoteContextValue(task.detail)}\nDue: ${task.dueAt}\nStatus: ${task.status}`
      })
    );
  }

  for (const card of buildPlatformActionCards(workspace)) {
    items.push(
      timelineItem({
        id: `timeline-platform-action-${card.id}`,
        kind: 'connected-platform-action',
        whatHappened: card.title,
        whereItHappened: card.platform,
        whatAiDid:
          'Prepared a connected-platform action draft. External execution still requires approval.',
        at: nowIso(),
        status: 'draft ready',
        command: card.command
      })
    );
  }

  for (const recommendation of buildOpportunityEngineReadout(workspace).suggestions) {
    items.push(
      timelineItem({
        id: `timeline-ai-recommendation-${recommendation.id}`,
        kind: 'ai-recommendation',
        whatHappened: recommendation.title,
        whereItHappened: recommendation.platformContext.join(', ') || 'BrandOps workspace',
        whatAiDid: `Recommended an opportunity with ${recommendation.confidence}% confidence: ${recommendation.expectedImpact}`,
        at: nowIso(),
        status: `${recommendation.confidence}% confidence`,
        command: recommendation.previewCommand
      })
    );
  }

  for (const run of workspace.aiPipelineRuns?.entries ?? []) {
    items.push(
      timelineItem({
        id: `timeline-pipeline-${run.run_id}`,
        kind:
          run.status === 'success'
            ? 'completed-operation'
            : run.status === 'failure'
              ? 'failed-operation'
              : 'scheduled-workflow',
        whatHappened: run.pipeline_id,
        whereItHappened: 'AI pipeline runner',
        whatAiDid: `Ran ${run.steps.length} pipeline step${run.steps.length === 1 ? '' : 's'}${run.error_message ? `; error: ${run.error_message}` : ''}.`,
        at: run.ended_at ?? run.started_at,
        status: run.status,
        command: run.status === 'failure' ? `run ai pipeline ${run.pipeline_id}` : undefined
      })
    );
  }

  for (const audit of workspace.agentAudit?.entries ?? []) {
    items.push(
      timelineItem({
        id: `timeline-audit-${audit.id}`,
        kind: audit.ok ? 'completed-operation' : 'failed-operation',
        whatHappened: audit.action,
        whereItHappened: audit.source,
        whatAiDid: audit.summary || 'Recorded command execution audit.',
        at: audit.at,
        status: audit.ok ? 'success' : 'failure',
        command: audit.ok ? undefined : audit.commandPreview
      })
    );
  }

  const sorted = uniqItems(items)
    .sort(
      (a, b) =>
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        sortTime(b.at) - sortTime(a.at) ||
        a.id.localeCompare(b.id)
    )
    .slice(0, 32);
  const counts = countsByKind(sorted);

  return {
    items: sorted,
    totalCount: sorted.length,
    countsByKind: counts,
    headline: sorted.length
      ? `${sorted.length} cross-platform operational event${sorted.length === 1 ? '' : 's'} showing what happened, where, and what AI did.`
      : 'No cross-platform operational events yet.'
  };
}
