import type { BrandOpsData, QueueStatus, SchedulerTaskStatus } from '../../types/domain';

const PULSE_MAX_ROWS = 40;

const SCHEDULER_ACTIVE: SchedulerTaskStatus[] = ['scheduled', 'due-soon', 'due', 'snoozed'];

const PUBLISHING_ATTENTION: QueueStatus[] = ['queued', 'due-soon', 'ready-to-post'];

export type PulseTimelineKind = 'follow-up' | 'publishing' | 'scheduler' | 'outreach';

export type PulseTimelineRow = {
  id: string;
  kind: PulseTimelineKind;
  title: string;
  subtitle: string;
  /** ISO-ish timestamp for ascending sort (soonest first). */
  sortKey: string;
  badge?: string;
};

/** Chat primer line for a queue row — shared by Workspace hub and legacy Pulse views. */
export function workspaceQueueCommandLine(row: PulseTimelineRow): string {
  switch (row.kind) {
    case 'follow-up':
      return `add note: follow-up — ${row.title.replace(/"/g, "'")}`;
    case 'publishing':
      return `update publishing: ${row.title.replace(/"/g, "'")} checklist ready`;
    case 'scheduler':
      return `add note: scheduler task — ${row.title.replace(/"/g, "'")}`;
    case 'outreach':
      return `draft outreach: follow up with ${row.title.split('·')[0]?.trim() ?? 'contact'}`;
    default:
      return `add note: ${row.title.replace(/"/g, "'")}`;
  }
}

function sortTime(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

/**
 * Mixed chronological queue (Plan hub + Today context): open follow-ups,
 * attention publishing, active scheduler tasks, and draft/ready outreach — capped for mobile performance.
 */
export function buildPulseTimeline(workspace: BrandOpsData): PulseTimelineRow[] {
  const rows: PulseTimelineRow[] = [];

  for (const f of workspace.followUps) {
    if (f.completed) continue;
    rows.push({
      id: `fu-${f.id}`,
      kind: 'follow-up',
      title: f.reason.trim() || 'Follow-up',
      subtitle: `Due ${f.dueAt}`,
      sortKey: f.dueAt,
      badge: 'Follow-up'
    });
  }

  for (const p of workspace.publishingQueue) {
    if (!PUBLISHING_ATTENTION.includes(p.status)) continue;
    const sortKey = p.scheduledFor || p.reminderAt || p.updatedAt;
    rows.push({
      id: `pub-${p.id}`,
      kind: 'publishing',
      title: p.title,
      subtitle: p.status,
      sortKey,
      badge: 'Publishing'
    });
  }

  for (const t of workspace.scheduler.tasks) {
    if (!SCHEDULER_ACTIVE.includes(t.status)) continue;
    rows.push({
      id: `sch-${t.id}`,
      kind: 'scheduler',
      title: t.title,
      subtitle: `${t.status} · due ${t.dueAt}`,
      sortKey: t.dueAt,
      badge: 'Scheduler'
    });
  }

  for (const o of workspace.outreachDrafts) {
    if (o.status !== 'draft' && o.status !== 'ready') continue;
    rows.push({
      id: `out-${o.id}`,
      kind: 'outreach',
      title: `${o.targetName} · ${o.company}`,
      subtitle: o.outreachGoal || o.category,
      sortKey: o.updatedAt,
      badge: o.status
    });
  }

  rows.sort((a, b) => sortTime(a.sortKey) - sortTime(b.sortKey) || a.id.localeCompare(b.id));
  return rows.slice(0, PULSE_MAX_ROWS);
}
