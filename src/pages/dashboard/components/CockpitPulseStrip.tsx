import type { ReactNode } from 'react';

/** Single source for cockpit “odometer” metrics (command deck + avoids duplicating MissionMapMetrics). */
export interface CockpitPulseMetrics {
  urgentFollowUps: number;
  queueDueToday: number;
  weightedPipelineUsd: number;
  publishingInPlay: number;
  activeOutreachDrafts: number;
}

export interface CockpitPulseStripProps {
  pulse: CockpitPulseMetrics;
  /** Compact: smaller values, tighter cells, optional hidden per-tile hints (density setting). */
  compact?: boolean;
}

/** One neutral chrome for every tile — hierarchy from typography, not rainbow borders. */
const pulseTile = (cellPad: string, children: ReactNode) => (
  <article
    className={`rounded-xl border border-border/45 bg-surface/35 shadow-[inset_0_1px_0_rgb(var(--color-text)_/_0.04)] ${cellPad}`}
  >
    {children}
  </article>
);

export function CockpitPulseStrip({ pulse, compact }: CockpitPulseStripProps) {
  const valueClass = compact ? 'text-2xl' : 'text-3xl';
  const cellPad = compact ? 'p-2' : 'p-3';
  const labelClass =
    'text-[11px] font-medium uppercase tracking-[0.14em] text-textSoft';
  const hint = (line: string) =>
    compact ? null : <p className="mt-1 text-[11px] leading-snug text-textMuted">{line}</p>;

  return (
    <section
      className={`grid w-full min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 ${compact ? 'gap-2' : 'gap-3'}`}
      aria-label="Cockpit pulse"
    >
      {pulseTile(
        cellPad,
        <>
          <p className={labelClass}>Urgent follow-ups</p>
          <p className={`mt-1 font-semibold tabular-nums leading-none text-text ${valueClass}`}>
            {pulse.urgentFollowUps}
          </p>
          {hint('Follow-up debt to clear today.')}
        </>
      )}
      {pulseTile(
        cellPad,
        <>
          <p className={labelClass}>Queue due today</p>
          <p className={`mt-1 font-semibold tabular-nums leading-none text-text ${valueClass}`}>
            {pulse.queueDueToday}
          </p>
          {hint('Scheduled commitments due.')}
        </>
      )}
      {pulseTile(
        cellPad,
        <>
          <p className={labelClass}>Weighted pipeline</p>
          <p className={`mt-1 font-semibold tabular-nums leading-none text-text ${valueClass}`}>
            ${Math.round(pulse.weightedPipelineUsd).toLocaleString()}
          </p>
          {hint('Forecast from active opportunities.')}
        </>
      )}
      {pulseTile(
        cellPad,
        <>
          <p className={labelClass}>Publishing in play</p>
          <p className={`mt-1 font-semibold tabular-nums leading-none text-text ${valueClass}`}>
            {pulse.publishingInPlay}
          </p>
          {hint('Items not posted or skipped.')}
        </>
      )}
      {pulseTile(
        cellPad,
        <>
          <p className={labelClass}>Active outreach</p>
          <p className={`mt-1 font-semibold tabular-nums leading-none text-text ${valueClass}`}>
            {pulse.activeOutreachDrafts}
          </p>
          {hint('Drafts excluding archived.')}
        </>
      )}
    </section>
  );
}
