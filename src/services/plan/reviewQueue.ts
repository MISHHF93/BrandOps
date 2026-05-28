import type { BrandOpsData, OperatorTraceEntry } from '../../types/domain';

export function countPendingOperatorReviews(entries: OperatorTraceEntry[] | undefined): number {
  return (entries ?? []).filter((e) => e.reviewStatus === 'pending').length;
}

/** Approve one pending trace by id; returns null if id missing. Returns same ref if nothing changed. */
export function approveOperatorTraceEntry(
  data: BrandOpsData,
  traceId: string
): BrandOpsData | null {
  const entries = data.operatorTraces?.entries ?? [];
  const ix = entries.findIndex((e) => e.id === traceId);
  if (ix === -1) return null;
  const ent = entries[ix];
  if (ent.reviewStatus !== 'pending') return data;
  const nextEntries = entries.map((e, i) =>
    i === ix ? { ...e, reviewStatus: 'approved' as const } : e
  );
  return {
    ...data,
    operatorTraces: { entries: nextEntries }
  };
}

/** Reject one pending trace by id; keeps the audit row but prevents it from executing as approved work. */
export function rejectOperatorTraceEntry(
  data: BrandOpsData,
  traceId: string,
  note = 'Rejected from PLAN Human Approval Queue.'
): BrandOpsData | null {
  const entries = data.operatorTraces?.entries ?? [];
  const ix = entries.findIndex((e) => e.id === traceId);
  if (ix === -1) return null;
  const ent = entries[ix];
  if (ent.reviewStatus !== 'pending') return data;
  const nextEntries = entries.map((e, i) =>
    i === ix ? { ...e, reviewStatus: 'rejected' as const, annotatorNote: note } : e
  );
  return {
    ...data,
    operatorTraces: { entries: nextEntries }
  };
}
