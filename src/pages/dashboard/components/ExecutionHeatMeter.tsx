import type { ExecutionHeatItem } from '../executionHeatModel';
import { getHeatBandCritical, getHeatBandWarning } from '../executionHeatModel';
import { AlertTriangle, Circle, Flame } from 'lucide-react';

interface ExecutionHeatMeterProps {
  item: ExecutionHeatItem;
  /** Inline row vs stacked */
  layout?: 'inline' | 'stack';
}

function bandLabel(heat: number) {
  if (heat >= getHeatBandCritical()) return 'Critical';
  if (heat >= getHeatBandWarning()) return 'Warning';
  return 'Watch';
}

function bandBarClass(heat: number) {
  if (heat >= getHeatBandCritical()) return 'from-danger/90 to-danger/50';
  if (heat >= getHeatBandWarning()) return 'from-warning/90 to-warning/50';
  return 'from-success/70 to-success/40';
}

function BandGlyph({ heat }: { heat: number }) {
  if (heat >= getHeatBandCritical()) {
    return <Flame size={12} strokeWidth={2} className="shrink-0 text-danger" aria-hidden />;
  }
  if (heat >= getHeatBandWarning()) {
    return <AlertTriangle size={12} strokeWidth={2} className="shrink-0 text-warning" aria-hidden />;
  }
  return <Circle size={12} strokeWidth={2} className="shrink-0 text-success" aria-hidden />;
}

export function ExecutionHeatMeter({ item, layout = 'stack' }: ExecutionHeatMeterProps) {
  const pct = Math.min(100, Math.max(0, item.heat));

  const bar = (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div
        className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-bg/80 ring-1 ring-border/40"
        role="meter"
        aria-valuenow={item.heat}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Heat ${item.heat}`}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${bandBarClass(item.heat)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 tabular-nums text-xs font-semibold text-text">{item.heat}</span>
    </div>
  );

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-textSoft">
      <span
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${
          item.heat >= getHeatBandCritical()
            ? 'bg-dangerSoft/25 text-danger'
            : item.heat >= getHeatBandWarning()
              ? 'bg-warningSoft/25 text-warning'
              : 'bg-successSoft/20 text-success'
        }`}
      >
        <BandGlyph heat={item.heat} />
        {bandLabel(item.heat)}
      </span>
      <span className="text-textMuted">{item.reason}</span>
    </div>
  );

  if (layout === 'inline') {
    return (
      <div className="space-y-2">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          {bar}
          {meta}
        </div>
        <details className="group rounded-lg border border-border/50 bg-bg/35 px-2 py-1.5 text-[11px]">
          <summary className="cursor-pointer list-none font-medium text-textMuted marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="text-primary group-open:text-text">Score factors</span>
            <span className="ml-1 text-textSoft">· {item.kind}</span>
          </summary>
          <ul className="mt-2 space-y-1 border-t border-border/40 pt-2">
            {item.heatFactors.map((f) => (
              <li key={f.label} className="text-textMuted">
                <span className="font-medium text-text">{f.label}</span> +{f.points} — {f.note}
              </li>
            ))}
          </ul>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bar}
      {meta}
      <details className="group rounded-lg border border-border/50 bg-bg/35 px-2 py-1.5 text-[11px]">
        <summary className="cursor-pointer list-none font-medium text-textMuted marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-primary group-open:text-text">How this score is built</span>
          <span className="ml-1 text-textSoft">· {item.kind}</span>
        </summary>
        <ul className="mt-2 space-y-1.5 border-t border-border/40 pt-2">
          {item.heatFactors.map((f) => (
            <li key={f.label} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              <span className="shrink-0 font-medium text-text">{f.label}</span>
              <span className="tabular-nums text-textSoft">+{f.points}</span>
              <span className="min-w-0 text-textMuted sm:flex-1">{f.note}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
