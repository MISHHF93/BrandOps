import clsx from 'clsx';
import { Loader2, ShieldAlert } from 'lucide-react';
import { EXECUTION_FOCUS_RING } from './executionStateStyles';

/**
 * Global "N operations running / N waiting for approval" summary. Renders
 * nothing when both counts are zero — this app currently hard-serializes
 * execution (one turn in flight at a time), so `activeCount` is honestly 0/1
 * today, not a fabricated queue. See plan doc §12.
 */
export function BackgroundOperationsIndicator({
  activeCount,
  pendingApprovalCount,
  onClick,
  className
}: {
  activeCount: number;
  pendingApprovalCount: number;
  onClick?: () => void;
  className?: string;
}) {
  if (activeCount === 0 && pendingApprovalCount === 0) return null;

  const content = (
    <>
      {activeCount > 0 ? (
        <span className="inline-flex items-center gap-1 text-accent">
          <Loader2 className="h-3 w-3 motion-safe:animate-spin" strokeWidth={2.25} aria-hidden />
          {activeCount} operation{activeCount === 1 ? '' : 's'} running
        </span>
      ) : null}
      {pendingApprovalCount > 0 ? (
        <span className="inline-flex items-center gap-1 text-warning">
          <ShieldAlert className="h-3 w-3" strokeWidth={2.25} aria-hidden />
          {pendingApprovalCount} waiting for approval
        </span>
      ) : null}
    </>
  );

  const sharedClass = clsx(
    'inline-flex items-center gap-2.5 rounded-full border border-border/50 bg-surface/60 px-2.5 py-1 text-fine font-semibold',
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-live="polite"
        className={clsx(
          sharedClass,
          'transition-colors hover:border-borderStrong',
          EXECUTION_FOCUS_RING
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={sharedClass} role="status" aria-live="polite">
      {content}
    </div>
  );
}
