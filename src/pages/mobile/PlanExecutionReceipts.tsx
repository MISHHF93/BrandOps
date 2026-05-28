import clsx from 'clsx';
import { Download, FileText, ShieldCheck } from 'lucide-react';
import type { MobileWorkspaceSnapshot, PlanExecutionReceipt } from './buildWorkspaceSnapshot';

function receiptPreviewCommand(receipt: PlanExecutionReceipt): string {
  return `ask: Explain this PLAN execution receipt to the user. Be precise about what happened, why it happened, what data was used, approvals, status, and warnings/errors. Do not claim anything external executed unless the receipt says so.\n\n${JSON.stringify(receipt, null, 2)}`;
}

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('fail') || s.includes('rejected')) {
    return 'border-danger/45 bg-dangerSoft/15 text-danger';
  }
  if (s.includes('pending') || s.includes('partial') || s.includes('running')) {
    return 'border-warning/45 bg-warningSoft/20 text-warning';
  }
  if (s.includes('success') || s.includes('approved')) {
    return 'border-success/45 bg-successSoft/20 text-success';
  }
  return 'border-border/45 bg-bgSubtle/70 text-textMuted';
}

function ReceiptList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2">
      <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">{label}</p>
      {items.length ? (
        <ul className="mt-1 space-y-1 text-fine leading-snug text-textMuted">
          {items.slice(0, 4).map((item) => (
            <li key={item} className="line-clamp-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-fine text-textMuted">None recorded.</p>
      )}
    </div>
  );
}

export function PlanExecutionReceipts({
  snapshot,
  btnFocus,
  commandBusy,
  canRunWorkspaceCommands,
  runCommand,
  onExportExecutionReceipt
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  canRunWorkspaceCommands: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onExportExecutionReceipt: (receipt: PlanExecutionReceipt) => void;
}) {
  const receipts = snapshot.planExecutionReceipts;
  const disabled = commandBusy || !canRunWorkspaceCommands;

  return (
    <section
      id="plan-execution-receipts"
      className="scroll-mt-28 rounded-2xl border border-primary/25 bg-primarySoft/10 p-3.5"
      aria-labelledby="plan-execution-receipts-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
            <FileText className="h-4 w-4" aria-hidden />
            Execution receipts
          </p>
          <h2 id="plan-execution-receipts-heading" className="mt-1 text-h3 text-text">
            What happened, why, and what data was used
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            Every PLAN execution gets a readable receipt with action, reasoning, source facts,
            generated outputs, approvals, timestamps, status, and warnings or errors.
          </p>
        </div>
        <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
          {receipts.length} receipt{receipts.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2">
        <p className="flex items-start gap-2 text-meta leading-snug text-textMuted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          Receipts are local trust artifacts. They explain execution evidence and approval state;
          they do not imply external sending, posting, scheduling, or syncing happened
          automatically.
        </p>
      </div>

      {receipts.length === 0 ? (
        <p className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta text-textMuted">
          No execution receipts yet. Run a PLAN command, approve an item, or execute a pipeline to
          create the first receipt.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {receipts.map((receipt) => (
            <article
              key={receipt.id}
              className="rounded-xl border border-border/40 bg-bgElevated/65 p-3"
              aria-labelledby={`${receipt.id}-heading`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 id={`${receipt.id}-heading`} className="text-label font-semibold text-text">
                    {receipt.action}
                  </h3>
                  <p className="mt-0.5 text-fine text-textSoft">
                    {receipt.sourceLabel} · {receipt.startedAt}
                    {receipt.endedAt ? ` → ${receipt.endedAt}` : ''}
                  </p>
                </div>
                <span
                  className={clsx(
                    'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
                    statusTone(receipt.executionStatus)
                  )}
                >
                  {receipt.executionStatus}
                </span>
              </div>

              <p className="mt-2 text-meta leading-snug text-textMuted">
                {receipt.reasoningSummary}
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <ReceiptList label="Source facts used" items={receipt.sourceFactsUsed} />
                <ReceiptList label="Generated outputs" items={receipt.generatedOutputs} />
                <ReceiptList label="Approvals" items={receipt.approvals} />
                <ReceiptList label="Warnings / errors" items={receipt.warningsErrors} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-meta">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void runCommand(receiptPreviewCommand(receipt))}
                  className={clsx(
                    'rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 text-text disabled:opacity-45',
                    btnFocus
                  )}
                >
                  Preview receipt
                </button>
                <button
                  type="button"
                  onClick={() => onExportExecutionReceipt(receipt)}
                  className={clsx(
                    'rounded-lg border border-border/45 bg-bgSubtle/60 px-2.5 py-1.5 text-text',
                    btnFocus
                  )}
                >
                  <Download className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  Export receipt JSON
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
