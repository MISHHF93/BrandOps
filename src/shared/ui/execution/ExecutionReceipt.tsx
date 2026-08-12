import clsx from 'clsx';

/** Raw status enums (e.g. Plan.status) are hyphenated internally — same display normalization already used for plan status elsewhere (MobileWorkspaceHubView.tsx's operationalCardToFeedItem). */
function formatReceiptStatus(status: string): string {
  return status.replace(/-/g, ' ');
}

export interface ExecutionReceiptData {
  id: string;
  summary: string;
  timestamp: string;
  planTitle?: string;
  integration?: string;
  approvedInputs?: string[];
  result: string;
  status: string;
}

/** Completed-execution receipt — what happened, when, which plan/integration, result, status. */
export function ExecutionReceipt({
  receipt,
  className
}: {
  receipt: ExecutionReceiptData;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'space-y-1.5 rounded-lg border border-border/45 bg-surface/40 px-3 py-2.5 text-fine leading-snug text-textMuted',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-wide text-textSoft">Receipt</span>
        <span className="text-textSoft">{new Date(receipt.timestamp).toLocaleString()}</span>
      </div>
      <p className="text-text">{receipt.summary}</p>
      {receipt.planTitle ? (
        <p>
          <span className="font-semibold text-text">Plan:</span> {receipt.planTitle}
        </p>
      ) : null}
      {receipt.integration ? (
        <p>
          <span className="font-semibold text-text">Integration:</span> {receipt.integration}
        </p>
      ) : null}
      {receipt.approvedInputs?.length ? (
        <p>
          <span className="font-semibold text-text">Approved inputs:</span>{' '}
          {receipt.approvedInputs.join(', ')}
        </p>
      ) : null}
      <p>
        <span className="font-semibold text-text">Result:</span> {receipt.result}
      </p>
      <p>
        <span className="font-semibold text-text">Status:</span>{' '}
        {formatReceiptStatus(receipt.status)}
      </p>
    </div>
  );
}
