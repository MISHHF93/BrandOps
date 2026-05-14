import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Briefcase,
  CalendarClock,
  Database,
  FileText,
  Inbox,
  KeyRound,
  MessageSquare,
  Gauge,
  Package,
  SendHorizontal,
  Zap
} from 'lucide-react';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import {
  metricToneTextClass,
  toneDueTodayTasks,
  toneFollowUpsOpen,
  toneMissedTasks,
  type WorkspaceSignalTone
} from './workspaceSignalTones';

export type WorkspaceSignalsPick = Pick<
  MobileWorkspaceSnapshot,
  | 'incompleteFollowUps'
  | 'publishingQueue'
  | 'queuedPublishing'
  | 'activeOpportunities'
  | 'dueTodayTasks'
  | 'missedTasks'
  | 'syncProvidersConnected'
  | 'integrationSources'
  | 'notes'
  | 'outreachDrafts'
  | 'integrationArtifactCount'
>;

export type VitalityMetricKey =
  | 'fu'
  | 'queue'
  | 'pubReady'
  | 'opps'
  | 'sched'
  | 'missed'
  | 'oauth'
  | 'src'
  | 'notes'
  | 'outreach'
  | 'artifacts';

type MetricCell = {
  key: VitalityMetricKey;
  label: string;
  sub?: string;
  display: string;
  icon: LucideIcon;
  tone: WorkspaceSignalTone;
  fillPct: number;
  title: string;
};

function clampPct(raw: number) {
  if (!Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

function Spark({ fillPct, tone }: { fillPct: number; tone: WorkspaceSignalTone }) {
  return (
    <div className="bo-vitality-spark-track" aria-hidden>
      <div
        className={clsx('bo-vitality-spark-fill', `bo-vitality-spark-fill--${tone}`)}
        style={{ width: `${fillPct}%` }}
      />
    </div>
  );
}

/** Compact SVG arc — fills clockwise from noon; numeric readout stacks in the same grid cell (see `.bo-vitality-dial`). */
function MiniRing({ fillPct, tone }: { fillPct: number; tone: WorkspaceSignalTone }) {
  const r = 13.5;
  const c = 2 * Math.PI * r;
  const arcLen = (fillPct / 100) * c;
  return (
    <svg
      viewBox="0 0 38 38"
      preserveAspectRatio="xMidYMid meet"
      className="bo-vitality-ring bo-vitality-dial__ring"
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
        className={metricToneTextClass(tone)}
      />
    </svg>
  );
}

function buildCells(s: WorkspaceSignalsPick): MetricCell[] {
  const fu = s.incompleteFollowUps;
  const q = s.publishingQueue;
  const qp = s.queuedPublishing;
  const op = s.activeOpportunities;
  const due = s.dueTodayTasks;
  const miss = s.missedTasks;
  const oauth = s.syncProvidersConnected;
  const src = s.integrationSources;
  const notes = s.notes;
  const outreach = s.outreachDrafts;
  const artifacts = s.integrationArtifactCount;

  const capLin = (n: number, cap: number) => clampPct(cap <= 0 ? 0 : (n / cap) * 100);

  return [
    {
      key: 'fu',
      label: 'Follow-ups',
      sub: 'open',
      display: String(fu),
      icon: MessageSquare,
      tone: toneFollowUpsOpen(fu),
      fillPct: capLin(fu, 18),
      title: 'Open follow-ups across the workspace'
    },
    {
      key: 'queue',
      label: 'Publish queue',
      sub: 'total',
      display: String(q),
      icon: Inbox,
      tone: 'info',
      fillPct: capLin(q, 14),
      title: 'Publishing queue size'
    },
    {
      key: 'pubReady',
      label: 'Publish ready',
      sub: 'queued · soon',
      display: String(qp),
      icon: Zap,
      tone: 'warning',
      fillPct: capLin(qp, 12),
      title: 'Publishing items queued or due-soon (subset of total publish queue)'
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
      tone: toneDueTodayTasks(due),
      fillPct: capLin(due, 14),
      title: 'Scheduler tasks due today or due-soon'
    },
    {
      key: 'missed',
      label: 'Missed',
      sub: 'tasks',
      display: String(miss),
      icon: Bell,
      tone: toneMissedTasks(miss),
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
    },
    {
      key: 'notes',
      label: 'Notes',
      sub: 'workspace',
      display: String(notes),
      icon: FileText,
      tone: 'info',
      fillPct: capLin(notes, 28),
      title: 'Activity notes captured in the workspace'
    },
    {
      key: 'outreach',
      label: 'Outreach',
      sub: 'drafts',
      display: String(outreach),
      icon: SendHorizontal,
      tone: 'info',
      fillPct: capLin(outreach, 14),
      title: 'Outreach drafts in the workspace'
    },
    {
      key: 'artifacts',
      label: 'Captured',
      sub: 'artifacts',
      display: String(artifacts),
      icon: Package,
      tone: 'primary',
      fillPct: capLin(artifacts, 24),
      title: 'Integration hub artifact rows (manual or agent)'
    }
  ];
}

function VitalityMetricCell({ m, valueId }: { m: MetricCell; valueId: string }) {
  const Icon = m.icon;
  const digits = m.display.length;
  return (
    <div className="bo-vitality-cell" title={m.title}>
      <div className="bo-vitality-cell__row">
        <div className="bo-vitality-cell__gauge-stack">
          <div className="bo-vitality-dial">
            <MiniRing fillPct={m.fillPct} tone={m.tone} />
            <span
              id={valueId}
              className={clsx(
                'bo-vitality-dial__value',
                digits >= 3 && 'bo-vitality-dial__value--compact',
                digits >= 4 && 'bo-vitality-dial__value--micro',
                metricToneTextClass(m.tone)
              )}
            >
              {m.display}
            </span>
          </div>
          <Spark fillPct={m.fillPct} tone={m.tone} />
        </div>
        <div className="bo-vitality-cell__meta-col">
          <div className="flex items-center gap-1">
            <span className={clsx('bo-icon-chip bo-icon-chip--xs', `bo-icon-chip--${m.tone}`)}>
              <Icon className="h-3 w-3" strokeWidth={2.25} aria-hidden />
            </span>
            <span className="bo-vitality-cell__label truncate">{m.label}</span>
          </div>
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
  /** Overrides mast headline (default: full strip → Pulse; filtered strip → Workspace vitality). */
  mastHeadline?: string;
  /** Merge labels/tooltips per metric key (e.g. Integrations tab sync-hub honesty). */
  cellOverrides?: Partial<
    Record<VitalityMetricKey, Partial<Pick<MetricCell, 'label' | 'sub' | 'title'>>>
  >;
}

function defaultMastHeadline(filtered: boolean): string {
  return filtered ? 'Workspace vitality' : 'Pulse';
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

function vitalitySubtitle(variant: WorkspaceSignalsBoardVariant, filtered: boolean): string {
  if (filtered) {
    switch (variant) {
      case 'integrations':
        return 'Connection-facing counts for this workspace — expand sections below for full lists.';
      case 'settings':
        return 'Selected counts while you configure behavior — matches Plan / Today pulse strip math.';
      case 'chat':
        return 'Counters from your live snapshot — run commands below to shift these.';
      default:
        return 'Selected counters from your workspace snapshot — read-only instruments.';
    }
  }
  if (variant === 'pulse') {
    return 'Live workspace counters — publishing pipeline, cadence, captures, and sync hub — queue below is soonest-first, not a feed.';
  }
  return 'Same pulse strip as Plan — read-only counters; scroll for Today focus lanes.';
}

/**
 * Unified read-only workspace counts with ring + spark “instrument” cues so metrics read as one
 * dashboard strip instead of a horizontal carousel of disparate boxes.
 */
export function WorkspaceSignalsBoard({
  metrics,
  variant = 'today',
  includeKeys,
  mastHeadline,
  cellOverrides
}: WorkspaceSignalsBoardProps) {
  const all = buildCells(metrics);
  const keys = includeKeys ?? [];
  const filtered = keys.length > 0;
  const cellsRaw = filtered ? all.filter((c) => keys.includes(c.key)) : all;
  const cells = cellsRaw.map((c) => ({ ...c, ...cellOverrides?.[c.key] }));

  if (cells.length === 0) {
    return null;
  }

  const srId = vitalitySrId(variant);
  const fewBand = cells.length < 11;
  const headline = mastHeadline ?? defaultMastHeadline(filtered);

  return (
    <section aria-labelledby={srId} className="bo-vitality-board">
      <div className="bo-vitality-board__mast">
        <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--muted" aria-hidden>
          <Gauge className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p id={srId} className="text-label font-semibold text-text">
            {headline}
          </p>
          <p className="text-meta text-textSoft">
            {vitalitySubtitle(variant, filtered)}
          </p>
        </div>
      </div>
      <div
        className={clsx('bo-vitality-grid', fewBand && 'bo-vitality-grid--few')}
        role="group"
        aria-label="Pulse metric instruments, read-only — not interactive controls"
      >
        {cells.map((m) => (
          <VitalityMetricCell key={m.key} m={m} valueId={`vitality-val-${variant}-${m.key}`} />
        ))}
      </div>
    </section>
  );
}
