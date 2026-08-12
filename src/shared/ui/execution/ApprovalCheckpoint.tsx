import clsx from 'clsx';
import type { Checkpoint } from '../../../types/executionState';
import { ExecutionStatus } from './ExecutionStatus';
import { ExecutionReceipt, type ExecutionReceiptData } from './ExecutionReceipt';
import { EXECUTION_FOCUS_RING } from './executionStateStyles';

const ACTION_BTN = clsx(
  'rounded-md border px-2.5 py-1 text-fine font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  EXECUTION_FOCUS_RING
);

/** A NEEDS_APPROVAL checkpoint, actionable — shared by Ask's Convert-to-Plan and Plan's review queue. */
export function ApprovalCheckpoint({
  checkpoint,
  onApprove,
  onReject,
  busy,
  receipt,
  className
}: {
  checkpoint: Checkpoint;
  onApprove: () => void;
  onReject: () => void;
  busy?: boolean;
  /** Set when this checkpoint carries a `receiptRef` — e.g. a plan save that also requires approval — so the approver can see what was generated before deciding. */
  receipt?: ExecutionReceiptData | null;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-2 rounded-lg border border-warning/40 bg-warningSoft/10 px-3 py-2.5',
        className
      )}
    >
      <ExecutionStatus state="NEEDS_APPROVAL" />
      <p className="text-meta leading-snug text-text">{checkpoint.summary}</p>
      {receipt ? <ExecutionReceipt receipt={receipt} className="mt-0.5" /> : null}
      <div className="flex flex-wrap gap-2 pt-0.5">
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          className={clsx(
            ACTION_BTN,
            'border-success/45 bg-successSoft/15 text-success hover:bg-successSoft/25'
          )}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className={clsx(
            ACTION_BTN,
            'border-danger/45 bg-dangerSoft/15 text-danger hover:bg-dangerSoft/25'
          )}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
