import clsx from 'clsx';

/** Semantic accent for workspace counters — maps to Tailwind tokens (danger/warning/info/success/primary/muted). */
export type WorkspaceSignalTone = 'danger' | 'warning' | 'info' | 'success' | 'primary' | 'muted';

const FOLLOWUPS_OPEN_DANGER = 15;
const FOLLOWUPS_OPEN_WARNING = 8;

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
