import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  Bell,
  Briefcase,
  CalendarClock,
  Compass,
  Crosshair,
  Database,
  FileText,
  Flame,
  Gauge,
  Inbox,
  KeyRound,
  MessageSquare,
  PlugZap,
  Rocket,
  Send,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { pulseTile } from './cockpitDailyPrimitives';
import type { CockpitDailySnapshot } from './buildWorkspaceSnapshot';
import { buildTodayFocusBoard } from './todayFocusModel';
import type { TodayFocusLine } from './todayFocusModel';

type LineTone = 'info' | 'warning' | 'success' | 'primary' | 'muted';

function iconForLineId(id: string): { Icon: LucideIcon; tone: LineTone } {
  if (
    id.startsWith('sched') ||
    id === 'pub-hint' ||
    id === 'pub-q' ||
    id === 'horizon' ||
    id === 'queue'
  )
    return { Icon: CalendarClock, tone: 'info' };
  if (id.startsWith('fu') || id === 'missed') return { Icon: MessageSquare, tone: 'warning' };
  if (id.startsWith('out')) return { Icon: Send, tone: 'primary' };
  if (
    id.startsWith('opp') ||
    id === 'closing' ||
    id === 'close-1' ||
    id.startsWith('deal') ||
    id === 'pipe-weight' ||
    id === 'pipe-sum' ||
    id === 'weighted' ||
    id === 'fu-open'
  )
    return { Icon: Briefcase, tone: 'success' };
  if (id.startsWith('content')) return { Icon: FileText, tone: 'primary' };
  if (id === 'sync') return { Icon: PlugZap, tone: 'warning' };
  if (id === 'sources' || id === 'vault' || id === 'ops')
    return { Icon: Database, tone: 'primary' };
  if (id === 'cadence') return { Icon: Compass, tone: 'info' };
  if (id === 'due') return { Icon: Bell, tone: 'warning' };
  if (id === 'next-pub' || id === 'empty-do' || id === 'start' || id === 'seed')
    return { Icon: Rocket, tone: 'primary' };
  if (id === 'clear' || id === 'no-fire') return { Icon: Sparkles, tone: 'success' };
  return { Icon: Inbox, tone: 'muted' };
}

function LineList({ items }: { items: TodayFocusLine[] }) {
  return (
    <ul className="mt-1.5 space-y-1.5" role="list">
      {items.map((item) => {
        const { Icon, tone } = iconForLineId(item.id);
        return (
          <li key={item.id} className="bo-line-row">
            <span
              className={clsx('bo-icon-chip bo-icon-chip--xs mt-0.5', `bo-icon-chip--${tone}`)}
              aria-hidden
            >
              <Icon className="h-3 w-3" strokeWidth={2.25} />
            </span>
            <div className="bo-line-row__body">
              <p className="bo-line-row__title">{item.line}</p>
              {item.detail ? <p className="bo-line-row__detail">{item.detail}</p> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const card = (role: 'do' | 'urgent' | 'grow') =>
  clsx(
    'rounded-xl border border-border/50 bg-bgSubtle/30 p-2.5 border-l-4',
    role === 'do' && 'border-l-info',
    role === 'urgent' && 'border-l-warning',
    role === 'grow' && 'border-l-success'
  );

type CockpitFocusEngineProps = {
  snapshot: CockpitDailySnapshot;
  btnFocus: string;
  commandBusy: boolean;
  runCommand: (command: string) => void | Promise<void>;
  primeChat: (line: string) => void;
};

/**
 * Icon-first focus board. Section titles shrink to a single noun; the icon + tonal border
 * carry the meaning so users scan visually instead of reading long headlines.
 */
export const CockpitFocusEngine = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  primeChat
}: CockpitFocusEngineProps) => {
  const focus = buildTodayFocusBoard(snapshot);

  return (
    <div className="space-y-3" aria-label="Today focus engine">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-1">
        <div className={card('do')}>
          <div className="bo-section-label">
            <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--info" aria-hidden>
              <Crosshair className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
            <span>Do today</span>
            <span className="bo-count-pill" aria-hidden>
              {focus.doToday.length}
            </span>
          </div>
          <LineList items={focus.doToday} />
        </div>

        <div className={card('urgent')}>
          <div className="bo-section-label">
            <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--warning" aria-hidden>
              <Flame className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
            <span>Urgent</span>
            <span className="bo-count-pill" aria-hidden>
              {focus.urgent.length}
            </span>
          </div>
          <LineList items={focus.urgent} />
        </div>

        <div className={card('grow')}>
          <div className="bo-section-label">
            <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--success" aria-hidden>
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
            <span>Momentum</span>
            <span className="bo-count-pill" aria-hidden>
              {focus.momentum.length}
            </span>
          </div>
          <LineList items={focus.momentum} />
        </div>
      </div>

      {focus.quickActions.length > 0 ? (
        <div className="rounded-xl border border-border/45 bg-surface/40 p-3">
          <p className="bo-section-label">
            <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--primary" aria-hidden>
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
            <span>Fast actions</span>
          </p>
          <ul className="mt-2 flex flex-wrap gap-2" role="list">
            {focus.quickActions.map((a) => (
              <li key={a.id}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-1.5">
                  <button
                    type="button"
                    disabled={commandBusy}
                    onClick={() => void runCommand(a.command)}
                    className={clsx('bo-btn-primary bo-btn-primary--sm', btnFocus)}
                    title={a.rationale}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                    {a.label}
                  </button>
                  <button
                    type="button"
                    disabled={commandBusy}
                    onClick={() => primeChat(a.command)}
                    className={clsx(
                      'text-meta text-textSoft underline-offset-2 hover:underline',
                      commandBusy && 'pointer-events-none opacity-50',
                      btnFocus
                    )}
                    title="Put in Chat composer without sending"
                  >
                    Prime
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div aria-labelledby="cockpit-at-a-glance-heading">
        <p id="cockpit-at-a-glance-heading" className="bo-section-label mb-2">
          <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--muted" aria-hidden>
            <Gauge className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          <span>At a glance</span>
        </p>
        <div
          role="group"
          aria-label="Workspace metric counts, read-only — not buttons"
          className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin]"
        >
          {pulseTile('Follow-ups', snapshot.incompleteFollowUps, 'open', {
            icon: MessageSquare,
            tone: 'warning',
            title: 'Open follow-ups'
          })}
          {pulseTile('Queue', snapshot.publishingQueue, 'items', {
            icon: Inbox,
            tone: 'info',
            title: 'Publishing queue items'
          })}
          {pulseTile('Opps', snapshot.activeOpportunities, 'active', {
            icon: Briefcase,
            tone: 'success',
            title: 'Active opportunities'
          })}
          {pulseTile('Sched', snapshot.dueTodayTasks, 'due / due-soon', {
            icon: CalendarClock,
            tone: 'info',
            title: 'Scheduler tasks due today or due-soon'
          })}
          {pulseTile('Missed', snapshot.missedTasks, 'tasks', {
            icon: Bell,
            tone: 'warning',
            title: 'Missed scheduler tasks'
          })}
          {pulseTile('OAuth', snapshot.syncProvidersConnected, 'connected', {
            icon: KeyRound,
            tone: 'success',
            title: 'OAuth providers connected'
          })}
          {pulseTile('Sources', snapshot.integrationSources, 'integrations', {
            icon: Database,
            tone: 'primary',
            title: 'Registered integration sources'
          })}
        </div>
      </div>
    </div>
  );
};
