import clsx from 'clsx';
import type { ExecutionState } from '../../../types/executionState';
import {
  EXECUTION_STATE_STYLES,
  executionMotionClass,
  executionToneBorderClass,
  executionToneSoftBgClass,
  executionToneTextClass
} from './executionStateStyles';

/** Inline state chip — color + icon + label together, never color alone. Shared by Ask and Plan. */
export function ExecutionStatus({
  state,
  label,
  className
}: {
  state: ExecutionState;
  /** Overrides the default state label (e.g. a more specific in-context phrase) while keeping the shared color/icon. */
  label?: string;
  className?: string;
}) {
  const style = EXECUTION_STATE_STYLES[state];
  const Icon = style.icon;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-fine font-semibold leading-none',
        executionToneBorderClass(style.tone),
        executionToneSoftBgClass(style.tone),
        executionToneTextClass(style.tone),
        className
      )}
    >
      <Icon
        className={clsx('h-3 w-3 shrink-0', executionMotionClass(style.motion))}
        strokeWidth={2.25}
        aria-hidden
      />
      <span>{label ?? style.label}</span>
    </span>
  );
}
