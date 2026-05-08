import type { OperatorTraceEntry } from '../../types/domain';

export function countPendingOperatorReviews(entries: OperatorTraceEntry[] | undefined): number {
  return (entries ?? []).filter((e) => e.reviewStatus === 'pending').length;
}
