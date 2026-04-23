/** Shared Pulse time buckets: timeline and homepage metrics keep the same "today" definition. */
export function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function bucketForRow(sortKey: string, now: Date): 'today' | 'thisWeek' | 'later' {
  const t = new Date(sortKey).getTime();
  if (Number.isNaN(t)) return 'later';
  const rowDay = startOfLocalDay(new Date(t));
  const today = startOfLocalDay(now);
  const diffDays = Math.round((rowDay.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays >= -7 && diffDays <= 7) return 'thisWeek';
  return 'later';
}
