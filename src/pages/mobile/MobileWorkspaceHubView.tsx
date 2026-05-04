import clsx from 'clsx';
import {
  CalendarCheck2,
  MessageCircle,
  PlugZap,
  Search,
  Settings,
  Sparkles,
  TableProperties
} from 'lucide-react';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import { workspaceQueueCommandLine } from './pulseTimeline';
import type { PulseTimelineRow } from './pulseTimeline';
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
  onOpenIntegrations: () => void;
  onOpenSettings: () => void;
  /** Opens the global workspace command palette (same as ⌘K / header search). */
  onOpenCommandPalette: () => void;
}

/**
 * Single overview for operators: **instruments first**, then a compact soonest-first queue table —
 * not a feed-shaped tab competing with Chat.
 */
export const MobileWorkspaceHubView = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  primeChat,
  onOpenToday,
  onOpenIntegrations,
  onOpenSettings,
  onOpenCommandPalette
}: MobileWorkspaceHubViewProps) => {
  const sorted = sortRowsSoonestFirst(snapshot.pulseTimelineRows);

  return (
    <div className="space-y-4" aria-label="Workspace overview">
      <span className="sr-only">
        Workspace overview — live counts and a soonest-first task queue. Use Commands for search,
        navigation jumps, and recent commands; Assistant runs chat commands; open Today for full
        lanes.
      </span>

      <article className="bo-flagship-surface overflow-hidden">
        <WorkspaceSignalsBoard metrics={snapshot} variant="workspace" />
        <div className="bo-vitality-frame-body space-y-3 px-3 pb-4 pt-2 sm:px-3.5">
          <nav
            className="bo-workspace-nav-rail -mx-0.5 flex snap-x snap-mandatory gap-2 overflow-x-auto border-b border-border/28 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Workspace shortcuts"
          >
            <button
              type="button"
              onClick={onOpenToday}
              title="Today lanes"
              className={clsx('bo-workspace-quick-btn', btnFocus)}
            >
              <CalendarCheck2 className="h-5 w-5 shrink-0 text-textSoft" strokeWidth={2.25} aria-hidden />
              <span className="bo-workspace-quick-btn__label">Today</span>
            </button>
            <button
              type="button"
              onClick={onOpenIntegrations}
              title="Integrations"
              className={clsx('bo-workspace-quick-btn', btnFocus)}
            >
              <PlugZap className="h-5 w-5 shrink-0 text-textSoft" strokeWidth={2.25} aria-hidden />
              <span className="bo-workspace-quick-btn__label">Connect</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              title="Settings"
              className={clsx('bo-workspace-quick-btn', btnFocus)}
            >
              <Settings className="h-5 w-5 shrink-0 text-textSoft" strokeWidth={2.25} aria-hidden />
              <span className="bo-workspace-quick-btn__label">Setup</span>
            </button>
            <button
              type="button"
              disabled={commandBusy}
              onClick={() => void runCommand('pipeline health')}
              title="Pipeline health"
              className={clsx('bo-workspace-quick-btn bo-workspace-quick-btn--primary', btnFocus)}
            >
              <Sparkles className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
              <span className="bo-workspace-quick-btn__label">Pipeline</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCommandPalette()}
              title="Commands & search (⌘K / Ctrl+K)"
              aria-label="Open workspace command palette"
              className={clsx('bo-workspace-quick-btn', btnFocus)}
            >
              <Search className="h-5 w-5 shrink-0 text-textSoft" strokeWidth={2.25} aria-hidden />
              <span className="bo-workspace-quick-btn__label">Commands</span>
            </button>
          </nav>

          <div className="rounded-xl border border-border/35 bg-bgSubtle/25 px-2 py-2">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-textMuted">
              <TableProperties className="h-3.5 w-3.5 shrink-0 text-textSoft" aria-hidden />
              Soonest queue
              <span className="tabular-nums text-[10px] font-medium normal-case text-textSoft">
                {sorted.length} row{sorted.length === 1 ? '' : 's'}
              </span>
            </p>
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
          </div>
        </div>
      </article>
    </div>
  );
};
