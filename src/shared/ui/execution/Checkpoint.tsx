import clsx from 'clsx';
import type { Checkpoint as CheckpointModel } from '../../../types/executionState';
import { checkpointTypeLabel } from '../../../services/execution/checkpointStore';
import { getOperationalExpert } from '../../../services/ai/expertRegistry';
import { ExecutionStatus } from './ExecutionStatus';
import { ApprovalCheckpoint } from './ApprovalCheckpoint';
import { FailureCheckpoint } from './FailureCheckpoint';
import { ExecutionReceipt, type ExecutionReceiptData } from './ExecutionReceipt';
import { EXECUTION_FOCUS_RING } from './executionStateStyles';

const OPEN_PLAN_BTN = clsx(
  'self-start rounded-md border border-border/55 bg-bgElevated px-2.5 py-1 text-fine font-semibold text-textMuted transition-colors hover:border-borderStrong hover:text-text',
  EXECUTION_FOCUS_RING
);

export interface CheckpointHandlers {
  /** Present only when the checkpoint's plan can actually be approved/rejected from here. */
  onApprove?: (checkpoint: CheckpointModel) => void;
  onReject?: (checkpoint: CheckpointModel) => void;
  onRetry?: (checkpoint: CheckpointModel) => void;
  onInspect?: (checkpoint: CheckpointModel) => void;
  busy?: boolean;
  /** Resolves a checkpoint's `receiptRef` to renderable data — see `resolveExecutionReceipt.ts`. */
  resolveReceipt?: (checkpoint: CheckpointModel) => ExecutionReceiptData | null;
  /** Resolves a checkpoint's `associatedTwinId` to the twin's display name — a workspace can hold several named twins, and this checkpoint's turn ran against one specific one. */
  resolveTwinName?: (checkpoint: CheckpointModel) => string | null;
  /** Navigates to and highlights the checkpoint's `associatedPlanRef` in the Plan tab. Present only on plain (non-approval, non-failure) rows — the approval card already previews the plan via its receipt. */
  onOpenPlan?: (checkpoint: CheckpointModel) => void;
}

function formatCheckpointTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

/**
 * One checkpoint row — shared by Ask's CheckpointTimeline and Plan's
 * checkpoint sequence. Delegates to the specialized `ApprovalCheckpoint` /
 * `FailureCheckpoint` cards when the checkpoint's state calls for it and
 * real handlers were supplied; otherwise renders a plain read-only row so a
 * checkpoint with no wired action never shows a dead button.
 */
export function Checkpoint({
  checkpoint,
  handlers,
  className
}: {
  checkpoint: CheckpointModel;
  handlers?: CheckpointHandlers;
  className?: string;
}) {
  const receipt = checkpoint.receiptRef ? (handlers?.resolveReceipt?.(checkpoint) ?? null) : null;
  /** `toolRef.expertId` only names which single expert was consulted (checkpointStore.ts, buildCheckpoint) — the summary text already lists names, so surface the expert's actual specialty here rather than repeating the name. */
  const expertPurpose = checkpoint.toolRef?.expertId
    ? getOperationalExpert(checkpoint.toolRef.expertId)?.purpose
    : undefined;
  const twinName = checkpoint.associatedTwinId
    ? (handlers?.resolveTwinName?.(checkpoint) ?? null)
    : null;

  if (checkpoint.state === 'NEEDS_APPROVAL' && handlers?.onApprove && handlers?.onReject) {
    return (
      <ApprovalCheckpoint
        checkpoint={checkpoint}
        onApprove={() => handlers.onApprove!(checkpoint)}
        onReject={() => handlers.onReject!(checkpoint)}
        busy={handlers.busy}
        receipt={receipt}
        className={className}
      />
    );
  }

  if (checkpoint.errorState && (handlers?.onRetry || handlers?.onInspect)) {
    return (
      <FailureCheckpoint
        checkpoint={checkpoint}
        onRetry={handlers.onRetry ? () => handlers.onRetry!(checkpoint) : undefined}
        onInspect={handlers.onInspect ? () => handlers.onInspect!(checkpoint) : undefined}
        twinName={twinName}
        className={className}
      />
    );
  }

  return (
    <div
      className={clsx(
        'flex flex-col gap-1.5 rounded-lg border border-border/45 bg-surface/40 px-3 py-2',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ExecutionStatus state={checkpoint.state} />
        <span className="text-fine text-textSoft">{formatCheckpointTime(checkpoint.at)}</span>
      </div>
      <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
        {checkpointTypeLabel(checkpoint.type)}
        {twinName ? ` · Twin: ${twinName}` : ''}
      </p>
      <p className="text-meta leading-snug text-text">{checkpoint.summary}</p>
      {expertPurpose ? (
        <p className="text-fine leading-snug text-textSoft">{expertPurpose}</p>
      ) : null}
      {checkpoint.errorState ? (
        <p className="text-fine leading-snug text-danger">{checkpoint.errorState.message}</p>
      ) : null}
      {receipt ? <ExecutionReceipt receipt={receipt} className="mt-0.5" /> : null}
      {checkpoint.associatedPlanRef && handlers?.onOpenPlan ? (
        <button
          type="button"
          onClick={() => handlers.onOpenPlan!(checkpoint)}
          className={clsx(OPEN_PLAN_BTN, 'mt-0.5')}
        >
          Open Plan
        </button>
      ) : null}
    </div>
  );
}
