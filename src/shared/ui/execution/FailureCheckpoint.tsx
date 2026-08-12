import clsx from 'clsx';
import type { Checkpoint } from '../../../types/executionState';
import { ExecutionStatus } from './ExecutionStatus';
import { EXECUTION_FOCUS_RING } from './executionStateStyles';

const ACTION_BTN = clsx(
  'rounded-md border border-border/55 bg-bgElevated px-2.5 py-1 text-fine font-semibold text-textMuted transition-colors hover:border-borderStrong hover:text-text disabled:cursor-not-allowed disabled:opacity-50',
  EXECUTION_FOCUS_RING
);

/**
 * A FAILED checkpoint — specific reason + concrete recovery actions, never a
 * generic "Something went wrong." Actions render only when both the
 * checkpoint's `errorState.recoveryActions` allows them AND a handler was
 * passed in (no dead buttons).
 */
export function FailureCheckpoint({
  checkpoint,
  onRetry,
  onInspect,
  twinName,
  className
}: {
  checkpoint: Checkpoint;
  onRetry?: () => void;
  onInspect?: () => void;
  /** Display name of the twin this failed turn ran against, if resolvable — see `CheckpointHandlers.resolveTwinName`. */
  twinName?: string | null;
  className?: string;
}) {
  if (!checkpoint.errorState) return null;
  const { recoveryActions } = checkpoint.errorState;

  return (
    <div
      className={clsx(
        'flex flex-col gap-2 rounded-lg border border-danger/40 bg-dangerSoft/10 px-3 py-2.5',
        className
      )}
    >
      <ExecutionStatus state={checkpoint.state} />
      <p className="text-meta font-semibold leading-snug text-text">{checkpoint.summary}</p>
      {twinName ? <p className="text-fine leading-snug text-textSoft">Twin: {twinName}</p> : null}
      <p className="text-fine leading-snug text-danger">Reason: {checkpoint.errorState.message}</p>
      {(recoveryActions.includes('retry') && onRetry) ||
      (recoveryActions.includes('inspect') && onInspect) ? (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {recoveryActions.includes('retry') && onRetry ? (
            <button type="button" onClick={onRetry} className={ACTION_BTN}>
              Retry
            </button>
          ) : null}
          {recoveryActions.includes('inspect') && onInspect ? (
            <button type="button" onClick={onInspect} className={ACTION_BTN}>
              Inspect
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
