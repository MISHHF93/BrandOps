import clsx from 'clsx';
import { CheckCircle2 } from 'lucide-react';
import type { ActiveExecution } from '../../../types/executionState';
import {
  EXECUTION_STATE_STYLES,
  executionMotionClass,
  executionToneTextClass
} from './executionStateStyles';

/**
 * Progressive status lines for a turn in flight — driven only by the real
 * sequence of `activeExecution` values the turn has actually passed through
 * (see `askExecutionCheckpoints.ts` / `executeCommandFlow`). Earlier lines
 * render as settled (checkmark) once superseded; only the latest animates.
 * Never fabricates steps that weren't actually emitted.
 */
export function StreamingStatus({
  history,
  className
}: {
  history: ActiveExecution[];
  className?: string;
}) {
  if (history.length === 0) return null;

  return (
    <div className={clsx('space-y-1', className)} role="status" aria-live="polite">
      {history.map((step, index) => {
        const isLatest = index === history.length - 1;
        const style = EXECUTION_STATE_STYLES[step.state];
        const Icon = isLatest ? style.icon : CheckCircle2;
        return (
          <p
            key={`${step.checkpointId ?? 'pending'}-${index}`}
            className={clsx(
              'flex items-center gap-1.5 text-fine',
              isLatest ? executionToneTextClass(style.tone) : 'text-textSoft'
            )}
          >
            <Icon
              className={clsx('h-3 w-3 shrink-0', isLatest && executionMotionClass(style.motion))}
              strokeWidth={2.25}
              aria-hidden
            />
            <span>{step.label}</span>
          </p>
        );
      })}
    </div>
  );
}
