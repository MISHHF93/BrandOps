import type { IntelligenceSignal } from '../../services/intelligence/localIntelligence';

export const formatPeekDue = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const pulseTile = (label: string, value: string | number, sub?: string) => (
  <div className="min-w-[5.5rem] shrink-0 rounded-lg border border-white/10 bg-zinc-900/50 px-2 py-1.5">
    <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
    <p className="text-lg font-semibold tabular-nums text-zinc-100">{value}</p>
    {sub ? <p className="text-[9px] text-zinc-500">{sub}</p> : null}
  </div>
);

export const signalList = (title: string, items: IntelligenceSignal[], empty: string, emptyHint?: string) => (
  <div>
    <p className="text-[11px] font-medium text-zinc-400">{title}</p>
    {items.length === 0 ? (
      <div className="mt-1 space-y-1">
        <p className="text-[11px] text-zinc-500">{empty}</p>
        {emptyHint ? <p className="text-[11px] text-zinc-500">{emptyHint}</p> : null}
      </div>
    ) : (
      <ol className="mt-1 space-y-1.5">
        {items.map((row, i) => (
          <li key={row.id} className="border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] text-zinc-200">
                {i + 1}. {row.label}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-indigo-300/90">{row.score}</span>
            </div>
            <p className="text-[10px] leading-snug text-zinc-500">{row.reason}</p>
          </li>
        ))}
      </ol>
    )}
  </div>
);
