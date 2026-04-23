import clsx from 'clsx';
import { ArrowUpRight, Crosshair, Flame, Sparkles, TrendingUp } from 'lucide-react';
import { pulseTile } from './cockpitDailyPrimitives';
import type { CockpitDailySnapshot } from './buildWorkspaceSnapshot';
import { buildTodayFocusBoard } from './todayFocusModel';

function LineList({ items }: { items: { id: string; line: string; detail?: string }[] }) {
  return (
    <ul className="mt-1.5 space-y-1.5" role="list">
      {items.map((item) => (
        <li key={item.id} className="text-[11px] leading-snug text-textMuted">
          <p className="font-medium text-text">{item.line}</p>
          {item.detail ? <p className="mt-0.5 text-[10px] text-textSoft">{item.detail}</p> : null}
        </li>
      ))}
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
 * Replaces the plain “at a glance” strip with a three-lane focus engine and keeps the read-only count row.
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
            <span className="bo-visual-orb bo-visual-orb--info" aria-hidden />
            <Crosshair className="h-4 w-4 text-info" strokeWidth={2} aria-hidden />
            What to do today
          </div>
          <LineList items={focus.doToday} />
        </div>

        <div className={card('urgent')}>
          <div className="bo-section-label">
            <span className="bo-visual-orb bo-visual-orb--warning" aria-hidden />
            <Flame className="h-4 w-4 text-warning" strokeWidth={2} aria-hidden />
            Urgent &amp; at risk
          </div>
          <LineList items={focus.urgent} />
        </div>

        <div className={card('grow')}>
          <div className="bo-section-label">
            <span className="bo-visual-orb bo-visual-orb--success" aria-hidden />
            <TrendingUp className="h-4 w-4 text-success" strokeWidth={2} aria-hidden />
            Momentum
          </div>
          <LineList items={focus.momentum} />
        </div>
      </div>

      {focus.quickActions.length > 0 ? (
        <div className="rounded-xl border border-border/45 bg-surface/40 p-3">
          <p className="bo-section-label">
            <Sparkles className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />
            Fast actions (Chat)
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
          <span className="bo-visual-orb" aria-hidden />
          At a glance
        </p>
        <div
          role="group"
          aria-label="Workspace metric counts, read-only — not buttons"
          className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin]"
        >
          {pulseTile('Follow-ups', snapshot.incompleteFollowUps, 'open')}
          {pulseTile('Queue', snapshot.publishingQueue, 'items')}
          {pulseTile('Opps', snapshot.activeOpportunities, 'active')}
          {pulseTile('Sched', snapshot.dueTodayTasks, 'due / due-soon')}
          {pulseTile('Missed', snapshot.missedTasks, 'tasks')}
          {pulseTile('OAuth', snapshot.syncProvidersConnected, 'connected')}
          {pulseTile('Sources', snapshot.integrationSources, 'integrations')}
        </div>
      </div>
    </div>
  );
};
