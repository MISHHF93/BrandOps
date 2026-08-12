import clsx from 'clsx';
import type { ActiveExecution } from '../../../types/executionState';
import { ExecutionStatus } from './ExecutionStatus';

/**
 * "Is BrandOps idle / thinking / working / needs you / done / broken" signal
 * for the turn in flight — recedes to a dim dot when idle, becomes the
 * shared state chip while active. Lives in Ask's own header, since
 * `activeExecution` is scoped to the current Ask turn; the cross-surface
 * summary (visible from any tab) is `BackgroundOperationsIndicator` in the
 * global shell header — the two are intentionally distinct, not duplicates.
 */
export function ActivityIndicator({
  execution,
  className
}: {
  execution: ActiveExecution | null;
  className?: string;
}) {
  return (
    <span role="status" aria-live="polite" className={clsx('inline-flex items-center', className)}>
      {execution ? (
        <ExecutionStatus state={execution.state} label={execution.label} />
      ) : (
        <span className="inline-flex items-center gap-1.5 text-fine text-textSoft/70">
          <span className="h-1.5 w-1.5 rounded-full bg-textSoft/40" aria-hidden />
          <span>Idle</span>
        </span>
      )}
    </span>
  );
}
