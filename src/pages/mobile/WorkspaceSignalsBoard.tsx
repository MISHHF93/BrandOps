import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Briefcase,
  CalendarClock,
  Database,
  Inbox,
  KeyRound,
  MessageSquare,
  Gauge
} from 'lucide-react';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

export type WorkspaceSignalsPick = Pick<
  MobileWorkspaceSnapshot,
  | 'incompleteFollowUps'
  | 'publishingQueue'
  | 'activeOpportunities'
  | 'dueTodayTasks'
  | 'missedTasks'
  | 'syncProvidersConnected'
  | 'integrationSources'
>;

export type VitalityMetricKey =
  | 'fu'
  | 'queue'
  | 'opps'
  | 'sched'
  | 'missed'
  | 'oauth'
  | 'src';

type Tone = 'warning' | 'info' | 'success' | 'primary' | 'muted';

type MetricCell = {
  key: VitalityMetricKey;
  label: string;
  sub?: string;
  display: string;
  icon: LucideIcon;
  tone: Tone;
  fillPct: number;
  title: string;
};

function clampPct(raw: number) {
  if (!Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

function toneText(tone: Tone) {
  return clsx(
    tone === 'warning' && 'text-warning',
    tone === 'info' && 'text-info',
    tone === 'success' && 'text-success',
    tone === 'primary' && 'text-text',
    tone === 'muted' && 'text-textSoft'
  );
}

function Spark({ fillPct, tone }: { fillPct: number; tone: Tone }) {
  return (
    <div className="bo-vitality-spark-track" aria-hidden>
      <div
        className={clsx('bo-vitality-spark-fill', `bo-vitality-spark-fill--${tone}`)}
        style={{ width: `${fillPct}%` }}
      />
    </div>
  );
}

/** Compact SVG arc — fills clockwise from noon; behaves like an odometer bezel. */
function MiniRing({ fillPct, tone }: { fillPct: number; tone: Tone }) {
  const r = 13.5;
  const c = 2 * Math.PI * r;
  const arcLen = (fillPct / 100) * c;
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 38 38"
      className="bo-vitality-ring shrink-0"
      aria-hidden
    >
      <circle
        cx="19"
        cy="19"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.75}
        className="text-borderStrong/38"
      />
      <circle
        cx="19"
        cy="19"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.85}
        strokeLinecap="round"
        strokeDasharray={`${arcLen} ${c}`}
        transform="rotate(-90 19 19)"
        className={toneText(tone)}
      />
    </svg>
  );
}

function buildCells(s: WorkspaceSignalsPick): MetricCell[] {
  const fu = s.incompleteFollowUps;
  const q = s.publishingQueue;
  const op = s.activeOpportunities;
  const due = s.dueTodayTasks;
  const miss = s.missedTasks;
  const oauth = s.syncProvidersConnected;
  const src = s.integrationSources;

  const capLin = (n: number, cap: number) => clampPct(cap <= 0 ? 0 : (n / cap) * 100);

  return [
    {
      key: 'fu',
      label: 'Follow-ups',
      sub: 'open',
      display: String(fu),
      icon: MessageSquare,
      tone: 'warning',
      fillPct: capLin(fu, 18),
      title: 'Open follow-ups across the workspace'
    },
    {
      key: 'queue',
      label: 'Publish',
      sub: 'queue items',
      display: String(q),
      icon: Inbox,
      tone: 'info',
      fillPct: capLin(q, 14),
      title: 'Publishing queue size'
    },
    {
      key: 'opps',
      label: 'Opps',
      sub: 'active',
      display: String(op),
      icon: Briefcase,
      tone: 'success',
      fillPct: capLin(op, 14),
      title: 'Active opportunities (non-archived)'
    },
    {
      key: 'sched',
      label: 'Due',
      sub: 'soon',
      display: String(due),
      icon: CalendarClock,
      tone: 'info',
      fillPct: capLin(due, 14),
      title: 'Scheduler tasks due today or due-soon'
    },
    {
      key: 'missed',
      label: 'Missed',
      sub: 'tasks',
      display: String(miss),
      icon: Bell,
      tone: 'warning',
      fillPct: capLin(miss, 10),
      title: 'Missed scheduler tasks'
    },
    {
      key: 'oauth',
      label: 'OAuth',
      sub: 'connected',
      display: String(oauth),
      icon: KeyRound,
      tone: 'success',
      fillPct: capLin(oauth, 6),
      title: 'OAuth providers connected'
    },
    {
      key: 'src',
      label: 'Sources',
      sub: 'integrations',
      display: String(src),
      icon: Database,
      tone: 'primary',
      fillPct: capLin(src, 14),
      title: 'Registered integration sources'
    }
  ];
}

function VitalityMetricCell({ m, valueId }: { m: MetricCell; valueId: string }) {
  const Icon = m.icon;
  return (
    <div className="bo-vitality-cell" title={m.title}>
      <div className="bo-vitality-cell__row">
        <MiniRing fillPct={m.fillPct} tone={m.tone} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className={clsx('bo-icon-chip bo-icon-chip--xs', `bo-icon-chip--${m.tone}`)}>
              <Icon className="h-3 w-3" strokeWidth={2.25} aria-hidden />
            </span>
            <span className="bo-vitality-cell__label truncate">{m.label}</span>
          </div>
          <p id={valueId} className="bo-vitality-cell__value">
            {m.display}
          </p>
          <Spark fillPct={m.fillPct} tone={m.tone} />
          {m.sub ? <p className="bo-vitality-cell__sub">{m.sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

export type WorkspaceSignalsBoardVariant =
  | 'today'
  | 'pulse'
  | 'integrations'
  | 'settings'
  | 'chat';

export interface WorkspaceSignalsBoardProps {
  metrics: WorkspaceSignalsPick;
  variant?: WorkspaceSignalsBoardVariant;
  /** Omit for the full seven-metric cockpit. */
  includeKeys?: readonly VitalityMetricKey[];
}

function vitalitySrId(variant: WorkspaceSignalsBoardVariant) {
  switch (variant) {
    case 'pulse':
      return 'pulse-vitality-sr-title';
    case 'integrations':
      return 'integrations-vitality-sr-title';
    case 'settings':
      return 'settings-vitality-sr-title';
    case 'chat':
      return 'chat-vitality-sr-title';
    default:
      return 'today-vitality-sr-title';
  }
}

function vitalitySubtitle(
  variant: WorkspaceSignalsBoardVariant,
  filtered: boolean
): string {
  if (filtered) {
    switch (variant) {
      case 'integrations':
        return 'Connection-facing counts for this workspace — expand sections below for full lists.';
      case 'settings':
        return 'Selected counts while you configure behavior — matches Pulse / Today vitality math.';
      case 'chat':
        return 'Counters from your live snapshot — run commands below to shift these.';
      default:
        return 'Selected counters from your workspace snapshot — read-only instruments.';
    }
  }
  if (variant === 'pulse') {
    return 'Due-next counts only — open Today for focus lanes.';
  }
  return 'Read-only counters from your workspace snapshot — shared lane across Pulse and Today.';
}

/**
 * Unified read-only workspace counts with ring + spark “instrument” cues so metrics read as one
 * dashboard strip instead of a horizontal carousel of disparate boxes.
 */
export function WorkspaceSignalsBoard({
  metrics,
  variant = 'today',
  includeKeys
}: WorkspaceSignalsBoardProps) {
  const all = buildCells(metrics);
  const cells =
    includeKeys?.length ?
      all.filter((c) => includeKeys.includes(c.key))
    : all;

  if (cells.length === 0) {
    return null;
  }

  const srId = vitalitySrId(variant);
  const fewBand = cells.length < 7;

  return (
    <section aria-labelledby={srId} className="bo-vitality-board">
      <div className="bo-vitality-board__mast">
        <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--muted" aria-hidden>
          <Gauge className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p id={srId} className="text-label font-semibold text-text">
            Workspace vitality
          </p>
          <p className="text-meta text-textSoft">{vitalitySubtitle(variant, Boolean(includeKeys?.length))}</p>
        </div>
      </div>
      <div
        className={clsx('bo-vitality-grid', fewBand && 'bo-vitality-grid--few')}
        role="group"
        aria-label="Workspace metric instruments, read-only — not interactive controls"
      >
        {cells.map((m) => (
          <VitalityMetricCell key={m.key} m={m} valueId={`vitality-val-${variant}-${m.key}`} />
        ))}
      </div>
    </section>
  );
}
