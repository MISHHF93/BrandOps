import clsx from 'clsx';
import { CalendarCheck2, MessageCircle, TableProperties } from 'lucide-react';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import { workspaceQueueCommandLine } from './pulseTimeline';
import type { PulseTimelineRow } from './pulseTimeline';
import { PlanDestinationGrid } from './PlanDestinationGrid';
import { PlanJumpNav } from './PlanJumpNav';
import { WorkspaceSignalsBoard } from './WorkspaceSignalsBoard';
import { EmptyState } from '../../shared/ui/brandopsPolish';
import { mobileChipClass } from './mobileTabPrimitives';

function sortRowsSoonestFirst(rows: PulseTimelineRow[]): PulseTimelineRow[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.sortKey).getTime();
    const tb = new Date(b.sortKey).getTime();
    const na = Number.isNaN(ta) ? Number.MAX_SAFE_INTEGER : ta;
    const nb = Number.isNaN(tb) ? Number.MAX_SAFE_INTEGER : tb;
    return na - nb;
  });
}

export interface MobileWorkspaceHubViewProps {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  runCommand: (command: string) => void | Promise<void>;
  primeChat: (line: string) => void;
  onOpenToday: () => void;
}

/**
 * Plan hub (`workspace` tab): **Today + Pipeline** shortcuts, jump links, **Pulse**, **Today snapshot**,
 * then soonest-first queue. Integrations and Setup open via ⌘K palette (dock stays Ask / Plan).
 */
export const MobileWorkspaceHubView = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  primeChat,
  onOpenToday
}: MobileWorkspaceHubViewProps) => {
  const sorted = sortRowsSoonestFirst(snapshot.pulseTimelineRows);
  const todayPreviewTasks = snapshot.cockpitSchedulerTaskPeek.slice(0, 4);
  const todayPreviewDeals = snapshot.cockpitOpportunityPeek.slice(0, 2);
  const hasTodayPeekLists = todayPreviewTasks.length > 0 || todayPreviewDeals.length > 0;

  return (
    <div className="space-y-4" aria-label="Plan">
      <span className="sr-only">
        Plan — Today and Pipeline shortcuts below; Integrations and Setup via ⌘K; jump links for Pulse,
        Today snapshot, and queue; Assistant runs chat.
      </span>

      <article className="bo-flagship-surface overflow-hidden">
        <div className="bo-vitality-frame-body space-y-3 px-3 pb-4 pt-3 sm:px-3.5">
          <header className="-mx-0.5 border-b border-border/28 pb-3">
            <h1 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">Plan</h1>
            <p className="mt-1 text-[10px] leading-snug text-textSoft">
              Open Today or run pipeline health here — Integrations & Setup live in ⌘K — then skim Pulse
              and the queue.
            </p>
          </header>

          <PlanDestinationGrid
            btnFocus={btnFocus}
            commandBusy={commandBusy}
            runCommand={runCommand}
            onOpenToday={onOpenToday}
          />

          <PlanJumpNav btnFocus={btnFocus} />

          <section id="plan-pulse" className="bo-plan-anchor-scroll -mx-3 sm:-mx-3.5">
            <WorkspaceSignalsBoard
              metrics={snapshot}
              variant="workspace"
              mastHeadline="Pulse"
            />
          </section>

          <section
            id="plan-today"
            className="bo-plan-anchor-scroll rounded-xl border border-border/35 bg-bgSubtle/20 px-2.5 py-2.5"
            aria-labelledby="plan-today-heading"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2
                  id="plan-today-heading"
                  className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-textMuted"
                >
                  <CalendarCheck2 className="h-3.5 w-3.5 shrink-0 text-textSoft" aria-hidden />
                  Today snapshot
                </h2>
                <p className="mt-1 text-[11px] leading-snug text-textSoft line-clamp-2">
                  {snapshot.cadenceHeadline.trim()
                    ? snapshot.cadenceHeadline
                    : 'Cadence and peek rows — full cockpit lives on Today.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenToday}
                className={clsx(
                  'shrink-0 rounded-lg border border-border/45 bg-bg px-2.5 py-1 text-[11px] font-semibold text-text',
                  btnFocus
                )}
              >
                Open full Today
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Today snapshot counts">
              <span className="rounded-md border border-border/35 bg-surface/40 px-2 py-0.5 text-[10px] tabular-nums text-textMuted">
                Due & soon{' '}
                <span className="font-semibold text-text">{snapshot.dueTodayTasks}</span>
              </span>
              <span className="rounded-md border border-border/35 bg-surface/40 px-2 py-0.5 text-[10px] tabular-nums text-textMuted">
                Missed{' '}
                <span className="font-semibold text-text">{snapshot.missedTasks}</span>
              </span>
              <span className="rounded-md border border-border/35 bg-surface/40 px-2 py-0.5 text-[10px] tabular-nums text-textMuted">
                Follow-ups open{' '}
                <span className="font-semibold text-text">{snapshot.incompleteFollowUps}</span>
              </span>
            </div>
            {hasTodayPeekLists ? (
              <div className="mt-2 space-y-2 border-t border-border/25 pt-2">
                {todayPreviewTasks.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-textSoft">
                      Scheduler
                    </p>
                    <ul className="mt-1 space-y-1 text-[11px] text-textMuted">
                      {todayPreviewTasks.map((t) => (
                        <li key={t.id} className="flex items-start justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate font-medium text-text">
                            {t.title}
                          </span>
                          <span className="max-w-[45%] shrink-0 text-end text-[10px] text-textSoft">
                            {t.dueAt ? `${t.dueAt} · ` : ''}
                            {t.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {todayPreviewDeals.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-textSoft">
                      Pipeline
                    </p>
                    <ul className="mt-1 space-y-1 text-[11px] text-textMuted">
                      {todayPreviewDeals.map((d) => (
                        <li key={d.id} className="flex flex-col gap-0.5">
                          <span className="truncate font-medium text-text">{d.name}</span>
                          <span className="truncate text-[10px] text-textSoft">{d.company}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 border-t border-border/25 pt-2 text-[10px] text-textSoft">
                Nothing peeking yet — open Today for scheduler lanes and pipeline detail.
              </p>
            )}
          </section>

          <section
            id="plan-queue"
            className="bo-plan-anchor-scroll rounded-xl border border-border/35 bg-bgSubtle/25 px-2 py-2"
            aria-labelledby="plan-queue-heading"
          >
            <h2
              id="plan-queue-heading"
              className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-textMuted"
            >
              <TableProperties className="h-3.5 w-3.5 shrink-0 text-textSoft" aria-hidden />
              Soonest queue
              <span className="tabular-nums text-[10px] font-medium normal-case text-textSoft">
                {sorted.length} row{sorted.length === 1 ? '' : 's'}
              </span>
            </h2>
            {sorted.length === 0 ? (
              <div className="mt-2">
                <EmptyState
                  title="Nothing queued"
                  body="Use Assistant to add follow-ups, publishing slots, or outreach — they land here as structured rows."
                />
              </div>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[280px] border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-border/35 text-[10px] uppercase tracking-wide text-textSoft">
                      <th className="py-1.5 pe-2 font-medium">Type</th>
                      <th className="py-1.5 pe-2 font-medium">Item</th>
                      <th className="py-1.5 font-medium">When / status</th>
                      <th className="w-[1%] py-1.5 ps-2 font-medium whitespace-nowrap">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.slice(0, 14).map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border/25 align-top text-textMuted last:border-b-0"
                      >
                        <td className="py-2 pe-2 font-medium text-text">{row.badge ?? row.kind}</td>
                        <td className="max-w-[10rem] py-2 pe-2">
                          <span className="line-clamp-2 font-medium text-text" title={row.title}>
                            {row.title}
                          </span>
                        </td>
                        <td className="py-2 pe-2 text-[10px] leading-snug text-textSoft">
                          {row.subtitle}
                        </td>
                        <td className="py-2 ps-2 text-end whitespace-nowrap">
                          <button
                            type="button"
                            disabled={commandBusy}
                            onClick={() => primeChat(workspaceQueueCommandLine(row))}
                            className={clsx(mobileChipClass(btnFocus), 'text-[10px]')}
                          >
                            <MessageCircle className="me-1 inline h-3 w-3 align-text-bottom" />
                            Chat
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sorted.length > 14 ? (
                  <p className="mt-2 text-[10px] text-textSoft">
                    Showing 14 of {sorted.length}. Run narrower commands in Assistant to trim the
                    queue.
                  </p>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </article>
    </div>
  );
};
