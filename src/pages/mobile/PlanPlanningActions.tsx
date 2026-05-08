import clsx from 'clsx';
import { Search } from 'lucide-react';
import { getIntentsForPlanHub } from './chatIntents';

export interface PlanPlanningActionsProps {
  btnFocus: string;
  commandBusy: boolean;
  agentEnabled: boolean;
  agentLockHint: string | null;
  runCommand: (command: string) => void;
  onOpenCommandPalette: () => void;
}

/**
 * Compact Plan hub — curated picks in canonical Plan order; full list in ⌘K only.
 */
export function PlanPlanningActions({
  btnFocus,
  commandBusy,
  agentEnabled,
  agentLockHint,
  runCommand,
  onOpenCommandPalette
}: PlanPlanningActionsProps) {
  const intents = getIntentsForPlanHub(8);
  const disabled = !agentEnabled || commandBusy;

  return (
    <section id="plan-actions" className="scroll-mt-28" aria-labelledby="plan-actions-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2
          id="plan-actions-heading"
          className="text-meta font-semibold uppercase tracking-wide text-textMuted"
        >
          Quick picks
        </h2>
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-bg px-2.5 py-1.5 text-meta font-semibold text-text',
            btnFocus
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2.25} aria-hidden />
          All commands ⌘K
        </button>
      </div>
      <p className="mt-1 text-fine leading-snug text-textSoft">
        Eight high-use lines; every other command is in the palette. Destructive phrases still
        confirm.
      </p>
      {!agentEnabled && agentLockHint ? (
        <p className="mt-2 rounded-lg border border-warning/30 bg-warningSoft/15 px-2.5 py-2 text-meta text-text">
          {agentLockHint}
        </p>
      ) : null}

      <ul
        className="mt-2.5 grid list-none grid-cols-1 gap-1.5 p-0 sm:grid-cols-2"
        role="list"
        aria-label="Curated planning commands"
      >
        {intents.map((intent) => (
          <li key={intent.id}>
            <button
              type="button"
              disabled={disabled}
              title={intent.command}
              onClick={() => runCommand(intent.command)}
              className={clsx(
                'flex min-h-[2.6rem] w-full touch-manipulation flex-col items-start rounded-lg border border-border/45 bg-bgSubtle/55 px-2.5 py-2 text-start text-text transition hover:border-borderStrong hover:bg-surfaceActive/50',
                disabled &&
                  'cursor-not-allowed opacity-45 hover:border-border/45 hover:bg-bgSubtle/55',
                btnFocus
              )}
            >
              <span className="text-meta font-semibold leading-tight">{intent.title}</span>
              <span className="mt-0.5 line-clamp-1 text-fine leading-snug text-textSoft">
                {intent.subtitle}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
