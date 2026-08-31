import { useState } from 'react';
import clsx from 'clsx';
import type { FocusKpiSelfCheck } from '../../types/domain';

type Score = FocusKpiSelfCheck['score'];

/**
 * Lightweight “full marks” loop: self-rate progress vs the stated focus metric (operator twin).
 */
export function KpiSelfCheckStrip({
  focusMetric,
  checks,
  btnFocus,
  commandBusy,
  onSave
}: {
  focusMetric: string;
  checks: readonly FocusKpiSelfCheck[];
  btnFocus: string;
  commandBusy: boolean;
  onSave: (score: Score, note: string) => void | Promise<void>;
}) {
  const [score, setScore] = useState<Score>(5);
  const [note, setNote] = useState('');

  return (
    <section
      className="rounded-xl border border-border/40 bg-bgElevated/40 px-3 py-3 text-meta text-textMuted"
      aria-label="Focus metric check-in"
    >
      <div className="flex items-center justify-between">
        <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
          Execution check-in
        </p>
        <span className="text-overline text-textSoft">{checks.length} logged</span>
      </div>
      <p className="mt-1 line-clamp-3 text-meta leading-snug text-textSoft" title={focusMetric}>
        Rate yourself vs{' '}
        <span className="font-medium text-text">{focusMetric.trim() || 'focus metric'}</span>.
      </p>
      {checks.length > 0 ? (
        <ul className="mt-2 space-y-1 text-fine text-textMuted" aria-label="Recent check-ins">
          {checks.slice(0, 3).map((c, i) => (
            <li key={`${c.recordedAt}-${i}`} className="flex items-center gap-2">
              <span className="font-semibold text-text">{c.score}/5</span>
              <span className="text-textSoft"> · </span>
              <span className="text-textSoft">{new Date(c.recordedAt).toLocaleDateString()}</span>
              {c.note.trim() ? (
                <span className="text-textSoft line-clamp-1"> — {c.note.trim().slice(0, 80)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-fine text-textSoft">
          No check-ins yet — log one to track momentum.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-fine text-textSoft">Score</span>
          <select
            value={score}
            disabled={commandBusy}
            onChange={(e) => setScore(Number(e.target.value) as Score)}
            className={clsx(
              'rounded-lg border border-border/55 bg-surface/55 px-2 py-1.5 text-sm text-text',
              btnFocus
            )}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[12rem] flex-1">
          <span className="sr-only">Note</span>
          <input
            type="text"
            value={note}
            disabled={commandBusy}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (what moved the needle?)"
            className="w-full rounded-lg border border-border/55 bg-surface/55 px-2 py-1.5 text-sm text-text outline-none placeholder:text-textMuted"
          />
        </label>
        <button
          type="button"
          disabled={commandBusy}
          onClick={() => {
            void onSave(score, note.trim());
            setNote('');
          }}
          className={clsx(
            'rounded-lg bg-accentSoft/35 px-3 py-1.5 text-sm font-semibold text-text',
            btnFocus
          )}
        >
          Save check-in
        </button>
      </div>
    </section>
  );
}
