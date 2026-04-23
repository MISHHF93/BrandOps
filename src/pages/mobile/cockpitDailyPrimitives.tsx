import type { IntelligenceSignal } from '../../services/intelligence/localIntelligence';

export const formatPeekDue = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const pulseTile = (label: string, value: string | number, sub?: string) => (
  <div className="min-w-[5.75rem] shrink-0 rounded-xl border border-border/45 bg-gradient-to-br from-bgElevated/95 to-surface/80 px-2.5 py-2 shadow-sm">
    <p className="text-meta font-semibold text-textSoft">{label}</p>
    <p className="mt-0.5 text-xl font-semibold tabular-nums leading-none text-text">{value}</p>
    {sub ? <p className="mt-0.5 text-meta text-textSoft">{sub}</p> : null}
  </div>
);

export const signalList = (title: string, items: IntelligenceSignal[], empty: string, emptyHint?: string) => (
  <div>
    <p className="text-label font-semibold text-text">{title}</p>
    {items.length === 0 ? (
      <div className="mt-1 space-y-1">
        <p className="text-label text-textMuted">{empty}</p>
        {emptyHint ? <p className="text-label text-textMuted">{emptyHint}</p> : null}
      </div>
    ) : (
      <ol className="mt-1.5 space-y-1.5">
        {items.map((row, i) => (
          <li key={row.id} className="border-b border-border/25 pb-1.5 last:border-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-label text-text">
                {i + 1}. {row.label}
              </span>
              <span className="shrink-0 font-mono text-meta text-info">{row.score}</span>
            </div>
            <p className="text-meta leading-snug text-textMuted">{row.reason}</p>
          </li>
        ))}
      </ol>
    )}
  </div>
);
