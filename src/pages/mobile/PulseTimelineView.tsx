import { Activity } from 'lucide-react';
import type { DashboardSectionId } from '../../shared/config/dashboardNavigation';
import type { MobileShellTabId } from './mobileShellQuery';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import type { PulseTimelineRow } from './pulseTimeline';
import { MobileTabPageHeader } from './mobileTabPrimitives';
import { ShellSectionCallout } from './ShellSectionCallout';

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Same calendar day as now, or within +/-7 days (overdue + near horizon) → this week band; else later. */
function bucketForRow(sortKey: string, now: Date): 'today' | 'thisWeek' | 'later' {
  const t = new Date(sortKey).getTime();
  if (Number.isNaN(t)) return 'later';
  const rowDay = startOfLocalDay(new Date(t));
  const today = startOfLocalDay(now);
  const diffDays = Math.round((rowDay.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays >= -7 && diffDays <= 7) return 'thisWeek';
  return 'later';
}

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

export interface PulseTimelineViewProps {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  runCommand: (command: string) => void | Promise<void>;
  primeChat: (line: string) => void;
  onNavigateTab: (tab: MobileShellTabId) => void;
  /** Open Today (daily) and scroll to a Cockpit workstream. */
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
  const rows = snapshot.pulseTimelineRows;
  const grouped: Record<'today' | 'thisWeek' | 'later', PulseTimelineRow[]> = {
    today: [],
    thisWeek: [],
    later: []
  };
  for (const row of rows) {
    grouped[bucketForRow(row.sortKey, now)].push(row);
  }

  const jumpBtn = `rounded-lg border border-zinc-600/50 bg-zinc-900/60 px-2 py-1.5 text-[10px] font-medium text-zinc-200 hover:border-indigo-500/40 hover:bg-zinc-900/90 ${btnFocus}`;

  const renderBucket = (key: 'today' | 'thisWeek' | 'later', title: string) => {
    const list = grouped[key];
    if (list.length === 0) return null;
    return (
      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
        <ol className="mt-2 space-y-2" role="list">
          {list.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-white/5 bg-zinc-950/35 px-2.5 py-2 text-[11px] text-zinc-300"
            >
              <div className="flex flex-wrap items-center gap-2">
                {row.badge ? (
                  <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-medium uppercase text-zinc-400">
                    {row.badge}
                  </span>
                ) : null}
                <span className="font-medium text-zinc-100">{row.title}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-500">{row.subtitle}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => primeChat(primeLineForRow(row))}
                  className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-0.5 text-[10px] ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`}
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
        subtitle="Follow-ups, publishing, scheduler, and outreach — soonest first. Read-only; actions run in Chat."
        icon={Activity}
        iconWrapperClassName="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-950/30"
        iconClassName="text-rose-300"
      />

      <ShellSectionCallout tab="pulse" className="mt-1" />

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3 text-[11px] text-zinc-400">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Jump</p>
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
        <p className="mt-2 text-[10px] leading-snug text-zinc-500">
          Full deal ranking and stage changes: open{' '}
          <button
            type="button"
            disabled={commandBusy}
            onClick={() => void runCommand('pipeline health')}
            className={`font-medium text-emerald-300/90 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 ${btnFocus}`}
          >
            pipeline health
          </button>{' '}
          in Chat (same control as Today → Pipeline).
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-zinc-500">
          Nothing in the queue yet. Add follow-ups, publishing items, scheduler tasks, or outreach drafts — or open{' '}
          <button type="button" onClick={() => onNavigateTab('chat')} className={`font-medium text-indigo-300 ${btnFocus}`}>
            Chat
          </button>{' '}
          to run commands.
        </p>
      ) : (
        <>
          {renderBucket('today', 'Today (by due / sort time)')}
          {renderBucket('thisWeek', 'This week')}
          {renderBucket('later', 'Later')}
        </>
      )}
    </div>
  );
};
