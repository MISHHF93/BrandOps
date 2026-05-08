import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Fingerprint } from 'lucide-react';
import type { AssistantAskTraceSummaryUI } from '../../types/aiTraceGraph';
import { deriveTrustScore } from '../../services/ai/trustScore';

function badgeClass(level: string): string {
  switch (level) {
    case 'low':
      return 'bg-successSoft text-success';
    case 'medium':
      return 'bg-warningSoft text-warning';
    case 'high':
      return 'bg-dangerSoft text-danger';
    default:
      return 'bg-bgElevated text-textSoft';
  }
}

export function AssistantTraceSummary({
  summary,
  btnFocus,
  orphanMarkerCount = 0
}: {
  summary: AssistantAskTraceSummaryUI;
  btnFocus: string;
  /** Inline citation markers without matching citation rows — lowers trust score. */
  orphanMarkerCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const trust = deriveTrustScore(summary, { orphanMarkerCount });
  const shortId =
    summary.trace_id.length > 36
      ? `${summary.trace_id.slice(0, 18)}…${summary.trace_id.slice(-10)}`
      : summary.trace_id;

  return (
    <div className="rounded-lg border border-borderSubtle bg-bgSubtle/35 text-meta leading-snug">
      <button
        type="button"
        className={clsx(
          'flex w-full items-center gap-2 px-2 py-1.5 text-left font-medium text-textSoft hover:bg-bgElevated/55',
          btnFocus
        )}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <Fingerprint className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          Provenance{' '}
          <span className="font-mono text-fine font-normal text-textMuted">{shortId}</span>
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
      </button>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-borderSubtle/70 px-2 py-1.5">
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 text-overline font-bold uppercase',
            trust.band === 'high' && 'bg-successSoft text-success',
            trust.band === 'moderate' && 'bg-warningSoft text-warning',
            trust.band === 'low' && 'bg-dangerSoft text-danger'
          )}
        >
          Trust · {trust.score_0_100} ({trust.band})
        </span>
        <span className="text-fine text-textMuted">Heuristic — verify critical facts.</span>
      </div>
      {open ? (
        <div className="space-y-2 border-t border-borderSubtle px-2 pb-2 pt-2 text-textMuted">
          <ul className="list-disc space-y-0.5 pl-4 text-fine text-textSoft">
            {trust.rationale_lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
            <dt className="text-fine font-semibold uppercase tracking-wide text-textSoft">Trace</dt>
            <dd className="break-all font-mono text-fine text-text">{summary.trace_id}</dd>
            {summary.model ? (
              <>
                <dt className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Model
                </dt>
                <dd className="break-all font-mono text-fine text-text">{summary.model}</dd>
              </>
            ) : null}
            {summary.provider ? (
              <>
                <dt className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Provider
                </dt>
                <dd className="break-all font-mono text-fine text-text">{summary.provider}</dd>
              </>
            ) : null}
            {summary.prompt_hash ? (
              <>
                <dt className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Prompt hash
                </dt>
                <dd className="break-all font-mono text-fine text-text">{summary.prompt_hash}</dd>
              </>
            ) : null}
            {summary.output_hash ? (
              <>
                <dt className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Output hash
                </dt>
                <dd className="break-all font-mono text-fine text-text">{summary.output_hash}</dd>
              </>
            ) : null}
          </dl>
          {(summary.hallucination_risk || summary.evidence_completeness) && (
            <div className="flex flex-wrap gap-1">
              {summary.hallucination_risk ? (
                <span
                  className={clsx(
                    'rounded-full px-1.5 py-0.5 text-overline font-bold uppercase',
                    badgeClass(summary.hallucination_risk)
                  )}
                >
                  Risk · {summary.hallucination_risk}
                </span>
              ) : null}
              {summary.evidence_completeness ? (
                <span className="rounded-full bg-infoSoft px-1.5 py-0.5 text-overline font-bold uppercase text-info">
                  Evidence · {summary.evidence_completeness}
                </span>
              ) : null}
            </div>
          )}
          {summary.governance_tags?.length ? (
            <div className="flex flex-wrap gap-1">
              {summary.governance_tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-bgElevated px-1.5 py-0.5 font-mono text-overline text-textSoft"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          {summary.missing_evidence_notes?.length ? (
            <div
              role="status"
              className="rounded-md bg-warningSoft/25 px-2 py-1 text-fine text-warning"
            >
              <span className="font-semibold">Missing evidence: </span>
              {summary.missing_evidence_notes.join(' · ')}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
