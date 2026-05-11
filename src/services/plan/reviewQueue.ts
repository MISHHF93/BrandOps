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
