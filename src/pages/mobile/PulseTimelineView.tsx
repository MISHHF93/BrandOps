import {
  Activity,
  ArrowUpRight,
  Lightbulb,
  Sparkles,
  TriangleAlert,
  TrendingUp
} from 'lucide-react';
import clsx from 'clsx';
import type { DashboardSectionId } from '../../shared/config/dashboardNavigation';
import type { MobileShellTabId } from './mobileShellQuery';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import type { PulseTimelineRow } from './pulseTimeline';
import { MobileTabPageHeader } from './mobileTabPrimitives';
import { bucketForRow, startOfLocalDay } from './pulseBuckets';
import { buildPulseHomeBoard } from './pulseHomeModel';
import { EmptyState } from '../../shared/ui/brandopsPolish';

function primeLineForRow(row: PulseTimelineRow): string {
  switch (row.kind) {
    case 'follow-up':
      return `add note: follow-up — ${row.title.replace(/"/g, "'")}`;
    case 'publishing':
      return `update publishing: ${row.title.replace(/"/g, "'")} checklist ready`;
    case 'scheduler':
      return `add note: scheduler task — ${row.title.replace(/"/g, "'")}`;
    case 'outreach':
      return `draft outreach: follow up with ${row.title.split('·')[0]?.trim() ?? 'contact'}`;
    default:
      return `add note: ${row.title.replace(/"/g, "'")}`;
  }
}

const sectionShell = (accent: 'now' | 'fix' | 'grow' | 'ai') => {
  const border =
    accent === 'now'
      ? 'border-l-accent'
      : accent === 'fix'
        ? 'border-l-warning'
        : accent === 'grow'
          ? 'border-l-success'
          : 'border-l-info';
  return clsx('rounded-xl border border-border/50 bg-bgSubtle/40 px-3 py-3 border-l-4', border);
};

function LineList({ items }: { items: { id: string; line: string; detail?: string }[] }) {
  return (
    <ul className="mt-2 space-y-1.5" role="list">
      {items.map((item) => (
        <li key={item.id} className="text-label leading-snug text-textMuted">
          <p className="font-medium text-text">{item.line}</p>
          {item.detail ? <p className="mt-0.5 text-meta text-textSoft">{item.detail}</p> : null}
        </li>
      ))}
    </ul>
  );
}

type StatTone = 'now' | 'fix' | 'grow' | 'ai';
function StatCard({
  label,
  value,
  sub,
  tone
}: {
  label: string;
  value: number;
  sub?: string;
  tone: StatTone;
}) {
  return (
    <div className={clsx('bo-stat-card', `bo-stat-card--${tone}`)}>
      <p className="bo-stat-card__label">{label}</p>
      <p className="bo-stat-card__value">{value}</p>
      {sub ? <p className="bo-stat-card__sub">{sub}</p> : null}
    </div>
  );
}

export interface PulseTimelineViewProps {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  runCommand: (command: string) => void | Promise<void>;
  primeChat: (line: string) => void;
  onNavigateTab: (tab: MobileShellTabId) => void;
  onOpenCockpitWorkstream: (workstream: DashboardSectionId) => void;
}

export const PulseTimelineView = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  primeChat,
  onNavigateTab,
  onOpenCockpitWorkstream
}: PulseTimelineViewProps) => {
  const now = new Date();
  const home = buildPulseHomeBoard(snapshot, now);
  const rows = snapshot.pulseTimelineRows;
  const grouped: Record<'today' | 'thisWeek' | 'later', PulseTimelineRow[]> = {
    today: [],
    thisWeek: [],
    later: []
  };
  for (const row of rows) {
    grouped[bucketForRow(row.sortKey, now)].push(row);
  }

  const jumpBtn = `rounded-lg border border-border/60 bg-surface/60 px-2.5 py-1.5 text-label font-medium text-text hover:border-borderStrong hover:bg-surfaceActive/80 ${btnFocus}`;

  const renderBucket = (key: 'today' | 'thisWeek' | 'later', title: string) => {
    const list = grouped[key];
    if (list.length === 0) return null;
    return (
      <div className="mt-4">
        <p className="text-label font-semibold text-textMuted">{title}</p>
        <ol className="mt-2 space-y-2" role="list">
          {list.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border/40 bg-bgSubtle/40 px-3 py-2.5 text-label text-textMuted"
            >
              <div className="flex flex-wrap items-center gap-2">
                {row.badge ? (
                  <span className="rounded border border-border/50 bg-surface/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-textSoft">
                    {row.badge}
                  </span>
                ) : null}
                <span className="font-semibold text-text">{row.title}</span>
              </div>
              <p className="mt-0.5 text-meta text-textSoft">{row.subtitle}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => primeChat(primeLineForRow(row))}
                  className={clsx(
                    'bo-btn-ghost',
                    btnFocus,
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  Open in Chat
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  };

  const recommendedCount = home.recommendedActions.length;
  const dueToday = grouped.today.length;

  return (
    <div className="mt-1 space-y-5" aria-label="Pulse">
      <MobileTabPageHeader
        title="Pulse"
        subtitle="What is due soonest — at a glance."
        icon={Activity}
        iconWrapperClassName="flex items-center justify-center rounded-xl border border-accent/40 bg-accentSoft/25"
        iconClassName="text-accent"
        haloTone="primary"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Due today" value={dueToday} sub="in queue" tone="now" />
        <StatCard
          label="Attention"
          value={home.needsAttention.length}
          sub="needs a look"
          tone="fix"
        />
        <StatCard label="Momentum" value={home.momentum.length} sub="signals up" tone="grow" />
        <StatCard label="Recommended" value={recommendedCount} sub="AI actions" tone="ai" />
      </div>

      <div className={sectionShell('now')}>
        <div className="bo-section-label">
          <span className="bo-visual-orb bo-visual-orb--primary" aria-hidden />
          <Lightbulb className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />
          What matters now
        </div>
        <LineList items={home.mattersNow} />
      </div>

      <div className={sectionShell('fix')}>
        <div className="bo-section-label">
          <span className="bo-visual-orb bo-visual-orb--warning" aria-hidden />
          <TriangleAlert className="h-4 w-4 text-warning" strokeWidth={2} aria-hidden />
          What needs attention
        </div>
        <LineList items={home.needsAttention} />
      </div>

      <div className={sectionShell('grow')}>
        <div className="bo-section-label">
          <span className="bo-visual-orb bo-visual-orb--success" aria-hidden />
          <TrendingUp className="h-4 w-4 text-success" strokeWidth={2} aria-hidden />
          What is growing
        </div>
        <LineList items={home.momentum} />
      </div>

      <div className={sectionShell('ai')}>
        <div className="bo-section-label">
          <span className="bo-visual-orb bo-visual-orb--info" aria-hidden />
          <Sparkles className="h-4 w-4 text-info" strokeWidth={2} aria-hidden />
          AI-recommended next actions
        </div>
        <ul className="mt-2 space-y-2" role="list">
          {home.recommendedActions.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-border/40 bg-bgSubtle/45 px-3 py-2.5 text-label text-textMuted"
            >
              <p className="font-semibold text-text">{a.title}</p>
              <p className="mt-0.5 text-meta text-textSoft">{a.rationale}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => void runCommand(a.command)}
                  className={clsx('bo-btn-primary bo-btn-primary--sm', btnFocus)}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                  Run in Chat
                </button>
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => primeChat(a.command)}
                  className={clsx('bo-btn-ghost', btnFocus)}
                >
                  Review first
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bo-glass-panel--muted rounded-xl border border-border/55 p-3">
        <p className="bo-section-label">
          <span className="bo-visual-orb" aria-hidden />
          Jump
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigateTab('chat')} className={jumpBtn}>
            Chat
          </button>
          <button type="button" onClick={() => onNavigateTab('daily')} className={jumpBtn}>
            Today
          </button>
          <button
            type="button"
            onClick={() => onOpenCockpitWorkstream('pipeline')}
            className={jumpBtn}
          >
            Pipeline
          </button>
          <button
            type="button"
            onClick={() => onOpenCockpitWorkstream('brand-content')}
            className={jumpBtn}
          >
            Brand &amp; posts
          </button>
        </div>
        <div className="mt-3">
          <button
            type="button"
            disabled={commandBusy}
            onClick={() => void runCommand('pipeline health')}
            className={clsx('bo-btn-primary', btnFocus)}
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            Run: pipeline health
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Queue is clear for now"
          body="Add follow-ups, publishing, scheduler tasks, or outreach — or open Chat to run commands. Your list fills as the workspace grows."
        >
          <button
            type="button"
            onClick={() => onNavigateTab('chat')}
            className={`rounded-lg border border-border/60 bg-surface/60 px-2.5 py-1.5 text-[10px] font-medium text-text ${btnFocus}`}
          >
            Open Chat
          </button>
        </EmptyState>
      ) : (
        <>
          <h3 className="text-label font-semibold text-text">Up next in order</h3>
          {renderBucket('today', 'Today (by due / sort time)')}
          {renderBucket('thisWeek', 'This week')}
          {renderBucket('later', 'Later')}
        </>
      )}

      <p className="text-meta text-textSoft/80" title={startOfLocalDay(now).toISOString()}>
        Snapshot: {home.meta.generatedAt} · {rows.length} queue row{rows.length === 1 ? '' : 's'}
      </p>
    </div>
  );
};
