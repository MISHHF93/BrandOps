import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import type { IntelligenceSignal } from '../../services/intelligence/localIntelligence';

export const formatPeekDue = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

type MetricTileTone = 'primary' | 'info' | 'success' | 'warning' | 'muted';

/**
 * Icon-first metric tile: the icon carries the category so the label can stay a single word
 * (e.g. "Queue", "OAuth"). Keeps the same data contract callers used with the old pulseTile.
 */
export const pulseTile = (
  label: string,
  value: string | number,
  sub?: string,
  options?: { icon?: LucideIcon; tone?: MetricTileTone; title?: string }
) => {
  const Icon = options?.icon;
  const tone = options?.tone ?? 'muted';
  return (
    <div className="bo-metric-tile" title={options?.title}>
      <div className="bo-metric-tile__head">
        {Icon ? (
          <span
            className={clsx('bo-icon-chip bo-icon-chip--xs', `bo-icon-chip--${tone}`)}
            aria-hidden
          >
            <Icon className="h-3 w-3" strokeWidth={2.25} />
          </span>
        ) : null}
        <span className="bo-metric-tile__label">{label}</span>
      </div>
      <span className="bo-metric-tile__value">{value}</span>
      {sub ? <span className="bo-metric-tile__sub">{sub}</span> : null}
    </div>
  );
};

export const signalList = (
  title: string,
  items: IntelligenceSignal[],
  empty: string,
  emptyHint?: string
) => (
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
