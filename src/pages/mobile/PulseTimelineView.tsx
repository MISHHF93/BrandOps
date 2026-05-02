import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  CalendarCheck2,
  CalendarClock,
  Inbox,
  MessageCircle,
  Rocket,
  Send,
  Sparkles,
  Sun
} from 'lucide-react';
import clsx from 'clsx';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import { type PulseTimelineRow, workspaceQueueCommandLine } from './pulseTimeline';
import { bucketForRow, startOfLocalDay } from './pulseBuckets';
import { WorkspaceSignalsBoard } from './WorkspaceSignalsBoard';
import { EmptyState } from '../../shared/ui/brandopsPolish';

type RowTone = 'info' | 'warning' | 'success' | 'primary' | 'muted';

function rowKindGlyph(kind: PulseTimelineRow['kind']): { Icon: LucideIcon; tone: RowTone } {
  switch (kind) {
    case 'follow-up':
      return { Icon: MessageCircle, tone: 'warning' };
    case 'publishing':
      return { Icon: CalendarClock, tone: 'info' };
    case 'scheduler':
      return { Icon: Bell, tone: 'info' };
    case 'outreach':
      return { Icon: Send, tone: 'primary' };
    default:
      return { Icon: Inbox, tone: 'muted' };
  }
}

export interface PulseTimelineViewProps {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  runCommand: (command: string) => void | Promise<void>;
  primeChat: (line: string) => void;
  /** Focus lanes / workstreams — Pulse stays chronological-only. */
  onOpenToday?: () => void;
}

export const PulseTimelineView = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  primeChat,
  onOpenToday
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

  const counts = `${grouped.today.length} · ${grouped.thisWeek.length} · ${grouped.later.length}`;

  const renderBucket = (key: 'today' | 'thisWeek' | 'later', title: string, Icon: LucideIcon) => {
    const list = grouped[key];
    if (list.length === 0) return null;
    return (
      <div className="mt-3">
        <p className="bo-section-label">
          <span className="bo-icon-chip bo-icon-chip--xs bo-icon-chip--muted" aria-hidden>
            <Icon className="h-3 w-3" strokeWidth={2.25} />
          </span>
          <span>{title}</span>
          <span className="bo-count-pill" aria-hidden>
            {list.length}
          </span>
        </p>
        <ol className="mt-2 space-y-2" role="list">
          {list.map((row) => {
            const { Icon: RowIcon, tone } = rowKindGlyph(row.kind);
            return (
              <li
                key={row.id}
                className="rounded-lg border border-border/40 bg-bgSubtle/40 px-3 py-2 text-label text-textMuted"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={clsx(
                      'bo-icon-chip bo-icon-chip--sm mt-0.5',
                      `bo-icon-chip--${tone}`
                    )}
                    aria-hidden
                  >
                    <RowIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-semibold leading-snug text-text"
                      title={row.subtitle || undefined}
                    >
                      {row.title}
                    </p>
                    {row.subtitle ? <span className="sr-only">{row.subtitle}</span> : null}
                    <div className="mt-1.5">
                      <button
                        type="button"
                        disabled={commandBusy}
                        onClick={() => primeChat(workspaceQueueCommandLine(row))}
                        title="Open in Chat"
                        className={clsx(
                          'bo-btn-ghost',
                          btnFocus,
                          'disabled:cursor-not-allowed disabled:opacity-50'
                        )}
                      >
                        <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                        Open in Chat
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  };

  return (
    <div className="space-y-4" aria-label="Pulse">
      <span className="sr-only">
        Pulse — chronological mixed queue due soonest. Use Today for workstream lanes.
      </span>

      <article className="bo-flagship-surface overflow-hidden" aria-label="Pulse queue">
        <WorkspaceSignalsBoard metrics={snapshot} variant="pulse" />
        <div className="bo-vitality-frame-body space-y-3 px-3 pb-4 pt-2 sm:px-3.5">
          <p className="text-meta leading-snug text-textSoft">
            <span className="font-medium text-text/90">Parameters</span> · Today • This week • Later:{' '}
            <span className="tabular-nums text-text">{counts}</span>
          </p>

          <div className="flex flex-wrap items-center gap-2 border-b border-border/28 pb-3">
            {onOpenToday ? (
              <button
                type="button"
                onClick={onOpenToday}
                className={clsx(
                  'bo-btn-ghost inline-flex items-center gap-1.5',
                  btnFocus
                )}
                title="Jump to Today workstreams"
              >
                <CalendarCheck2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                Today lanes
              </button>
            ) : null}
            <button
              type="button"
              disabled={commandBusy}
              onClick={() => void runCommand('pipeline health')}
              className={clsx('bo-btn-primary bo-btn-primary--sm', btnFocus)}
              title="Run: pipeline health"
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              Pipeline health
            </button>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title="Queue clear"
              body="Add queue items via Chat — follow-ups, publish slots, scheduler, outreach."
            />
          ) : (
            <>
              {renderBucket('today', 'Today', Sun)}
              {renderBucket('thisWeek', 'This week', CalendarClock)}
              {renderBucket('later', 'Later', Rocket)}
            </>
          )}
        </div>
      </article>

      <p className="text-meta text-textSoft/80" title={startOfLocalDay(now).toISOString()}>
        {rows.length} queue row{rows.length === 1 ? '' : 's'} · local view
      </p>
    </div>
  );
};
