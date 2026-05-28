import clsx from 'clsx';
import {
  CheckCircle2,
  Eye,
  GitCompareArrows,
  Pencil,
  RefreshCw,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import type {
  MobileWorkspaceSnapshot,
  PlanPendingOperatorReviewPeek
} from './buildWorkspaceSnapshot';

function approvalPrompt(action: string, item: PlanPendingOperatorReviewPeek): string {
  return `ask: ${action} for this pending BrandOps approval item. Do not execute externally. Require human confirmation before sending, posting, publishing, scheduling, or syncing.\n\nTrace: ${item.verb}\nSource: ${item.source}\nSurface: ${item.surface ?? 'unknown'}\nRoute: ${item.route ?? 'none'}\nEntity: ${item.entityType ?? 'unknown'} ${item.entityId ?? ''}\nPreview: ${item.preview || 'No preview available.'}`;
}

function approvalSourceLabel(item: PlanPendingOperatorReviewPeek): string {
  return (
    [item.source, item.surface, item.entityType].filter(Boolean).join(' / ') || 'operator trace'
  );
}

export function PlanHumanApprovalQueue({
  snapshot,
  btnFocus,
  commandBusy,
  canRunWorkspaceCommands,
  runCommand,
  onApproveOperatorTrace,
  onRejectOperatorTrace
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  canRunWorkspaceCommands: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onApproveOperatorTrace: (traceId: string) => void | Promise<void>;
  onRejectOperatorTrace: (traceId: string) => void | Promise<void>;
}) {
  const queue = snapshot.planPendingReviewPeek;
  const disabled = commandBusy || !canRunWorkspaceCommands;

  return (
    <section
      id="plan-human-approval-queue"
      className="scroll-mt-28 rounded-2xl border border-warning/35 bg-warningSoft/10 p-3.5"
      aria-labelledby="plan-human-approval-queue-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-warning">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Human Approval Queue
          </p>
          <h2 id="plan-human-approval-queue-heading" className="mt-1 text-h3 text-text">
            Trust gate before execution
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            Nothing external executes automatically. Review, preview, compare, edit, regenerate,
            approve, or reject AI-generated work before it leaves BrandOps.
          </p>
        </div>
        <span className="rounded-full border border-warning/35 bg-bgElevated px-2 py-1 text-fine font-semibold text-warning">
          {snapshot.planPendingReviewCount} pending
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-2.5 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Approval rule
          </p>
          <p className="mt-1 text-meta text-text">
            Human approval is required before external action.
          </p>
        </div>
        <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-2.5 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Preview outputs
          </p>
          <p className="mt-1 text-meta text-text">Inspect generated work before changing state.</p>
        </div>
        <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-2.5 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Version control
          </p>
          <p className="mt-1 text-meta text-text">
            Compare versions or regenerate without auto-send.
          </p>
        </div>
      </div>

      {queue.length === 0 ? (
        <p className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta text-textMuted">
          No pending approvals. New generated outputs that require trust review will land here
          before any external execution.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {queue.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-border/40 bg-bgElevated/65 p-3"
              aria-labelledby={`${item.id}-approval-heading`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3
                    id={`${item.id}-approval-heading`}
                    className="text-label font-semibold text-text"
                  >
                    {item.verb}
                  </h3>
                  <p className="mt-0.5 text-fine text-textSoft">
                    {approvalSourceLabel(item)} · {item.at}
                  </p>
                </div>
                <span className="rounded-full border border-warning/35 bg-warningSoft/20 px-2 py-0.5 text-overline font-bold uppercase text-warning">
                  Pending approval
                </span>
              </div>

              <div className="mt-2 rounded-lg border border-border/35 bg-bgSubtle/55 px-2.5 py-2">
                <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Output preview
                </p>
                <p className="mt-1 text-meta leading-snug text-textMuted">
                  {item.preview || 'No output preview captured for this trace yet.'}
                </p>
                {item.labels.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.labels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-border/35 bg-bg px-2 py-0.5 text-fine text-textSoft"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5 text-meta sm:grid-cols-3">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void runCommand(approvalPrompt('Preview the output', item))}
                  className={clsx(
                    'rounded-lg border border-border/45 bg-surface/60 px-2 py-1.5 text-text disabled:opacity-45',
                    btnFocus
                  )}
                >
                  <Eye className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  Preview
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void runCommand(approvalPrompt('Edit the output safely', item))}
                  className={clsx(
                    'rounded-lg border border-border/45 bg-bgSubtle/60 px-2 py-1.5 text-text disabled:opacity-45',
                    btnFocus
                  )}
                >
                  <Pencil className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  Edit
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    void runCommand(
                      approvalPrompt('Compare this output with the prior version', item)
                    )
                  }
                  className={clsx(
                    'rounded-lg border border-info/40 bg-infoSoft/15 px-2 py-1.5 text-info disabled:opacity-45',
                    btnFocus
                  )}
                >
                  <GitCompareArrows className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  Compare versions
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    void runCommand(approvalPrompt('Regenerate an improved version', item))
                  }
                  className={clsx(
                    'rounded-lg border border-warning/40 bg-warningSoft/15 px-2 py-1.5 text-warning disabled:opacity-45',
                    btnFocus
                  )}
                >
                  <RefreshCw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  Regenerate
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void onRejectOperatorTrace(item.id)}
                  className={clsx(
                    'rounded-lg border border-danger/40 bg-dangerSoft/15 px-2 py-1.5 text-danger disabled:opacity-45',
                    btnFocus
                  )}
                >
                  <XCircle className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  Reject
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void onApproveOperatorTrace(item.id)}
                  className={clsx(
                    'rounded-lg border border-success/45 bg-successSoft/20 px-2 py-1.5 text-success disabled:opacity-45',
                    btnFocus
                  )}
                >
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  Approve
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
