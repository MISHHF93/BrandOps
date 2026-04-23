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
import { ShellSectionCallout } from './ShellSectionCallout';
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
      ? 'border-l-primary'
      : accent === 'fix'
        ? 'border-l-warning'
        : accent === 'grow'
          ? 'border-l-success'
          : 'border-l-info';
  return clsx(
    'rounded-xl border border-border/50 bg-bgSubtle/30 pl-2.5 pr-2.5 py-2.5 border-l-4',
    border
  );
};

function LineList({ items }: { items: { id: string; line: string; detail?: string }[] }) {
  return (
    <ul className="mt-1.5 space-y-1.5" role="list">
      {items.map((item) => (
        <li key={item.id} className="text-[11px] leading-snug text-textMuted">
          <p className="font-medium text-text">{item.line}</p>
          {item.detail ? <p className="mt-0.5 text-textSoft">{item.detail}</p> : null}
        </li>
      ))}
    </ul>
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

  const jumpBtn = `rounded-lg border border-border/60 bg-surface/60 px-2 py-1.5 text-[10px] font-medium text-text hover:border-borderStrong hover:bg-surfaceActive/80 ${btnFocus}`;

  const renderBucket = (key: 'today' | 'thisWeek' | 'later', title: string) => {
    const list = grouped[key];
    if (list.length === 0) return null;
    return (
      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-textSoft">{title}</p>
        <ol className="mt-2 space-y-2" role="list">
          {list.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border/40 bg-bgSubtle/35 px-2.5 py-2 text-[11px] text-textMuted"
            >
              <div className="flex flex-wrap items-center gap-2">
                {row.badge ? (
                  <span className="rounded border border-border/50 bg-surface/60 px-1.5 py-0.5 text-[9px] font-medium uppercase text-textSoft">
                    {row.badge}
                  </span>
                ) : null}
                <span className="font-medium text-text">{row.title}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-textSoft">{row.subtitle}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => primeChat(primeLineForRow(row))}
                  className={`rounded-full border border-border/55 bg-surface/50 px-2 py-0.5 text-[10px] text-textMuted ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`}
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

  return (
    <div className="mt-2 space-y-4" aria-label="Pulse">
      <MobileTabPageHeader
        title="Pulse"
        subtitle="Orientation and signal — one timeline of what is due soonest. For your daily plan and work areas, use Today."
        icon={Activity}
        iconWrapperClassName="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/35 bg-primarySoft/12"
        iconClassName="text-primary"
      />

      <p className="text-[10px] leading-relaxed text-textSoft">
        Intelligence here uses the same local rules as the rest of the workspace (not a cloud model). It updates when
        your snapshot refreshes.
      </p>

      <div className={sectionShell('now')}>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-textSoft">
          <Lightbulb className="h-3.5 w-3.5 text-primary" strokeWidth={2} aria-hidden />
          What matters now
        </div>
        <LineList items={home.mattersNow} />
      </div>

      <div className={sectionShell('fix')}>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-textSoft">
          <TriangleAlert className="h-3.5 w-3.5 text-warning" strokeWidth={2} aria-hidden />
          What needs attention
        </div>
        <LineList items={home.needsAttention} />
      </div>

      <div className={sectionShell('grow')}>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-textSoft">
          <TrendingUp className="h-3.5 w-3.5 text-success" strokeWidth={2} aria-hidden />
          What is growing
        </div>
        <LineList items={home.momentum} />
      </div>

      <div className={sectionShell('ai')}>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-textSoft">
          <Sparkles className="h-3.5 w-3.5 text-info" strokeWidth={2} aria-hidden />
          AI-recommended next actions
        </div>
        <ul className="mt-2 space-y-2" role="list">
          {home.recommendedActions.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-border/40 bg-bgSubtle/40 px-2 py-1.5 text-[11px] text-textMuted"
            >
              <p className="font-medium text-text">{a.title}</p>
              <p className="mt-0.5 text-[10px] text-textSoft">{a.rationale}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => void runCommand(a.command)}
                  className={clsx(
                    'inline-flex items-center gap-1 rounded-full border border-success/50 bg-successSoft/25 px-2 py-0.5 text-[10px] font-medium text-text',
                    commandBusy && 'pointer-events-none opacity-50',
                    btnFocus
                  )}
                >
                  <ArrowUpRight className="h-3 w-3" strokeWidth={2} aria-hidden />
                  Run in Chat
                </button>
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => primeChat(a.command)}
                  className={clsx(
                    'rounded-full border border-border/55 bg-surface/50 px-2 py-0.5 text-[10px] text-textSoft',
                    commandBusy && 'pointer-events-none opacity-50',
                    btnFocus
                  )}
                >
                  Review first
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ShellSectionCallout tab="pulse" className="mt-1" />

      <div className="bo-glass-panel--muted rounded-xl border border-border/55 p-3 text-[11px] text-textMuted">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-textSoft">Jump</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => onNavigateTab('chat')} className={jumpBtn}>
            Chat
          </button>
          <button type="button" onClick={() => onNavigateTab('daily')} className={jumpBtn}>
            Today
          </button>
          <button type="button" onClick={() => onOpenCockpitWorkstream('pipeline')} className={jumpBtn}>
            Pipeline
          </button>
          <button type="button" onClick={() => onOpenCockpitWorkstream('brand-content')} className={jumpBtn}>
            Brand &amp; posts
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-textSoft">
          Full deal ranking: run{' '}
          <button
            type="button"
            disabled={commandBusy}
            onClick={() => void runCommand('pipeline health')}
            className={`font-medium text-success underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 ${btnFocus}`}
          >
            pipeline health
          </button>{' '}
          in Chat.
        </p>
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
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-textSoft">Up next in order</h3>
          {renderBucket('today', 'Today (by due / sort time)')}
          {renderBucket('thisWeek', 'This week')}
          {renderBucket('later', 'Later')}
        </>
      )}

      <p className="text-[9px] text-textSoft/80" title={startOfLocalDay(now).toISOString()}>
        Snapshot: {home.meta.generatedAt} · {rows.length} queue row{rows.length === 1 ? '' : 's'}
      </p>
    </div>
  );
};
