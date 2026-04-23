import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, Shield } from 'lucide-react';
import {
  getLocalProductUsageSummary,
  type LocalProductUsageSummary
} from '../../services/usage/localProductUsage';

function fmtMs(n: number | null) {
  if (n === null) return '—';
  if (!Number.isFinite(n)) return '—';
  if (n < 10) return '<10 ms';
  if (n >= 60_000) return `${(n / 60_000).toFixed(1)} min`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)} s`;
  return `${Math.round(n)} ms`;
}

function fmtRate(r: number | null) {
  if (r === null) return '—';
  return `${Math.round(r * 1000) / 10}%`;
}

/**
 * On-device stats aligned with `docs/PRODUCT_EXPERIENCE_ROADMAP.md` §2 — not sent to any server.
 * Shown on **Settings → Advanced → Local product metrics** (any `MobileApp` host: `mobile.html`, welcome, etc.).
 */
export function LocalProductUsageReadout() {
  const [summary, setSummary] = useState<LocalProductUsageSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  const load = useCallback(() => {
    setErr(null);
    setPending(true);
    void getLocalProductUsageSummary()
      .then((s) => {
        setSummary(s);
        setErr(null);
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : 'Could not read local metrics.');
        setSummary(null);
      })
      .finally(() => {
        setPending(false);
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (err) {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-[11px] text-warning" role="alert">
          {err}
        </p>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface/60 px-2.5 py-1.5 text-[10px] font-medium text-text"
        >
          <RefreshCw className="h-3 w-3" strokeWidth={2} aria-hidden />
          Retry
        </button>
      </div>
    );
  }

  if (!summary && pending) {
    return <p className="mt-2 text-[11px] text-textMuted">Loading local metrics…</p>;
  }

  if (!summary) {
    return null;
  }

  const firstAt = (() => {
    try {
      return new Date(summary.firstOpenAt).toLocaleString();
    } catch {
      return summary.firstOpenAt;
    }
  })();

  return (
    <div
      className={`mt-2 space-y-4 ${pending ? 'opacity-90' : ''}`}
      aria-label="On-device product experience metrics"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex min-w-0 items-start gap-1.5 text-[10px] font-medium text-textSoft">
          <Shield className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
          <span>
            Stored on this device only. Maps to the roadmap: habit, command confidence, and
            perceived performance. NPS, support themes, and multi-user retention need separate
            processes.
          </span>
        </p>
        <button
          type="button"
          onClick={load}
          disabled={pending}
          aria-busy={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-surface/60 px-2.5 py-1.5 text-[10px] font-medium text-text hover:border-borderStrong disabled:cursor-wait"
        >
          <RefreshCw
            className={`h-3 w-3 ${pending ? 'motion-safe:animate-spin' : ''}`}
            strokeWidth={2}
            aria-hidden
          />
          Refresh
        </button>
      </div>

      <p className="text-[10px] leading-snug text-textMuted">
        <span className="font-semibold text-textSoft">Habit: </span>
        active days in rolling windows;{' '}
        <span className="font-semibold text-textSoft"> Command confidence: </span>
        outcomes & timing; <span className="font-semibold text-textSoft"> See → act: </span>{' '}
        navigations to Chat from other tabs.
      </p>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="group"
        aria-label="Navigations to Chat from each tab"
      >
        {(
          [
            ['Pulse', summary.fromPulseToChat],
            ['Today', summary.fromTodayToChat],
            ['Integrations', summary.fromIntegrationsToChat],
            ['Settings', summary.fromSettingsToChat]
          ] as const
        ).map(([label, n]) => (
          <div
            key={label}
            className="rounded-lg border border-border/40 bg-surface/40 px-2 py-2 text-center"
          >
            <p className="text-[9px] font-semibold uppercase tracking-wide text-textSoft">
              {label}
            </p>
            <p
              className="mt-0.5 text-lg font-semibold tabular-nums text-text"
              title={`→ Chat: ${n}`}
            >
              {n}
            </p>
            <p className="text-[9px] text-textSoft">→ Chat</p>
          </div>
        ))}
      </div>

      <dl className="space-y-0 text-[11px] text-textMuted">
        <div className="flex flex-col gap-0.5 border-b border-border/30 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <dt className="shrink-0 sm:max-w-[55%]">Active days in last 7 / 30 (local calendar)</dt>
          <dd className="min-w-0 text-left font-medium tabular-nums text-text sm:text-right">
            {summary.activeDaysLast7} / {summary.activeDaysLast30}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 border-b border-border/30 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <dt className="shrink-0 sm:max-w-[55%]">Unique days with a session (history, max 120)</dt>
          <dd className="min-w-0 text-left font-medium tabular-nums text-text sm:text-right">
            {summary.totalSessionsDaysStored}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 border-b border-border/30 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <dt className="shrink-0 sm:max-w-[55%]">Commands completed (ok / fail) · success rate</dt>
          <dd className="min-w-0 break-words text-left text-text sm:text-right">
            {summary.commandOk} / {summary.commandFail} · {fmtRate(summary.commandSuccessRate)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 border-b border-border/30 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <dt className="shrink-0 sm:max-w-[55%]">
            Median time between command completions (rolling)
          </dt>
          <dd className="min-w-0 text-left font-medium tabular-nums text-text sm:text-right">
            {fmtMs(summary.medianMsBetweenCommands)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 border-b border-border/30 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <dt className="shrink-0 sm:max-w-[55%]">Command round-trip (median / ~p95, rolling)</dt>
          <dd className="min-w-0 text-left font-medium tabular-nums text-text sm:text-right">
            {fmtMs(summary.medianCommandDurationMs)} / {fmtMs(summary.p95ishCommandDurationMs)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 border-b border-border/30 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <dt className="shrink-0 sm:max-w-[55%]">First shell ready after open (median / ~p95)</dt>
          <dd className="min-w-0 text-left font-medium tabular-nums text-text sm:text-right">
            {fmtMs(summary.medianInitialShellReadyMs)} / {fmtMs(summary.p95ishInitialShellReadyMs)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 pt-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <dt className="shrink-0 sm:max-w-[55%]">First recorded app open (device clock)</dt>
          <dd
            className="min-w-0 break-words text-left text-text sm:text-right"
            title={summary.firstOpenAt}
          >
            {firstAt}
          </dd>
        </div>
        <div className="mt-1 flex items-center gap-1.5 border-t border-border/30 pt-2 text-[10px] text-textSoft">
          <Activity className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
          <span>
            These numbers update as you use the shell. Use Refresh to pull the latest after commands
            elsewhere.
          </span>
        </div>
      </dl>
    </div>
  );
}
