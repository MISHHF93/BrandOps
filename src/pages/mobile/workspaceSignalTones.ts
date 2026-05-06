import clsx from 'clsx';
import type { PulseTimelineKind } from './pulseTimeline';

/** Semantic accent for workspace counters — maps to Tailwind tokens (danger/warning/info/success/primary/muted). */
export type WorkspaceSignalTone =
  | 'danger'
  | 'warning'
  | 'info'
  | 'success'
  | 'primary'
  | 'muted';

export const FOLLOWUPS_OPEN_DANGER = 15;
export const FOLLOWUPS_OPEN_WARNING = 8;

const DUE_TODAY_WARNING = 8;
const DUE_TODAY_DANGER = 14;

export function toneFollowUpsOpen(open: number): WorkspaceSignalTone {
  if (open <= 0) return 'muted';
  if (open >= FOLLOWUPS_OPEN_DANGER) return 'danger';
  if (open >= FOLLOWUPS_OPEN_WARNING) return 'warning';
  return 'warning';
}

export function toneMissedTasks(missed: number): WorkspaceSignalTone {
  if (missed > 0) return 'danger';
  return 'muted';
}

/** Due & soon — scales from quiet → info → caution → overload (aligned with Pulse scheduler metric). */
export function toneDueTodayTasks(due: number): WorkspaceSignalTone {
  if (!Number.isFinite(due) || due <= 0) return 'muted';
  if (due >= DUE_TODAY_DANGER) return 'danger';
  if (due >= DUE_TODAY_WARNING) return 'warning';
  return 'info';
}

export function metricToneTextClass(tone: WorkspaceSignalTone): string {
  return clsx(
    tone === 'danger' && 'text-danger',
    tone === 'warning' && 'text-warning',
    tone === 'info' && 'text-info',
    tone === 'success' && 'text-success',
    tone === 'primary' && 'text-primary',
    tone === 'muted' && 'text-textSoft'
  );
}

/** Compact Plan “Today snapshot” KPI chips — border/fill tracks severity without painting whole sections. */
export function planKpiSnapshotPillClass(tone: WorkspaceSignalTone): string {
  return clsx(
    'rounded-md border px-2 py-0.5 text-[10px] tabular-nums text-textMuted',
    tone === 'danger' && 'border-danger/42 bg-dangerSoft/15',
    tone === 'warning' && 'border-warning/42 bg-warningSoft/15',
    tone === 'info' && 'border-info/42 bg-infoSoft/15',
    tone === 'success' && 'border-success/42 bg-successSoft/15',
    tone === 'primary' && 'border-primary/38 bg-primarySoft/12',
    tone === 'muted' && 'border-border/35 bg-surface/40'
  );
}

/** Queue row type column — readable hue per workload kind. */
export function pulseQueueBadgeSurfaceClass(tone: WorkspaceSignalTone): string {
  return clsx(
    'inline-flex max-w-[10rem] truncate rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight',
    metricToneTextClass(tone),
    tone === 'danger' && 'bg-dangerSoft/18',
    tone === 'warning' && 'bg-warningSoft/18',
    tone === 'info' && 'bg-infoSoft/18',
    tone === 'success' && 'bg-successSoft/18',
    tone === 'primary' && 'bg-primarySoft/14',
    tone === 'muted' && 'bg-bgSubtle/90 text-text'
  );
}

export function pulseTimelineKindTone(kind: PulseTimelineKind): WorkspaceSignalTone {
  switch (kind) {
    case 'follow-up':
      return 'warning';
    case 'publishing':
      return 'info';
    case 'scheduler':
      return 'success';
    case 'outreach':
      return 'primary';
    default:
      return 'muted';
  }
}
