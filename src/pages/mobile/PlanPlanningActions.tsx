import clsx from 'clsx';
import { Search } from 'lucide-react';
import type { BrandOpsChatIntent } from './chatIntents';
import { getIntentsForPlanPage } from './chatIntents';

const GROUP_ORDER: BrandOpsChatIntent['groupId'][] = [
  'essentials',
  'pipeline',
  'content',
  'connect',
  'strategy'
];

const GROUP_LABEL: Record<BrandOpsChatIntent['groupId'], string> = {
  essentials: 'Planning basics',
  pipeline: 'Pipeline & people',
  content: 'Content & calendar',
  connect: 'Connections',
  strategy: 'Strategy engine'
};

export interface PlanPlanningActionsProps {
  btnFocus: string;
  commandBusy: boolean;
  agentEnabled: boolean;
  agentLockHint: string | null;
  runCommand: (command: string) => void;
  onOpenCommandPalette: () => void;
}

/**
 * One-tap planning — same command lines as ⌘K palette and Assistant (via {@link runCommand}).
 */
export function PlanPlanningActions({
  btnFocus,
  commandBusy,
  agentEnabled,
  agentLockHint,
  runCommand,
  onOpenCommandPalette
}: PlanPlanningActionsProps) {
  const intents = getIntentsForPlanPage();
  const byGroup = new Map<BrandOpsChatIntent['groupId'], BrandOpsChatIntent[]>();
  for (const g of GROUP_ORDER) byGroup.set(g, []);
  for (const intent of intents) {
    const bucket = byGroup.get(intent.groupId) ?? [];
    bucket.push(intent);
    byGroup.set(intent.groupId, bucket);
  }

  const disabled = !agentEnabled || commandBusy;

  return (
    <section
      id="plan-actions"
      className="scroll-mt-28"
      aria-labelledby="plan-actions-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2
          id="plan-actions-heading"
          className="text-[11px] font-semibold uppercase tracking-wide text-textMuted"
        >
          Plan actions
        </h2>
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-bg px-2.5 py-1.5 text-[11px] font-semibold text-text',
            btnFocus
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2.25} aria-hidden />
          All commands ⌘K
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-textSoft">
        Run any action here without leaving Plan — same lines as ⌘K or Assistant. Destructive phrases
        still use the normal confirmation sheet. Open Ask when you want the full transcript view.
      </p>
      {!agentEnabled && agentLockHint ? (
        <p className="mt-2 rounded-lg border border-warning/30 bg-warningSoft/15 px-2.5 py-2 text-[11px] text-text">
          {agentLockHint}
        </p>
      ) : null}

      <div className="mt-3 space-y-4">
        {GROUP_ORDER.map((gid) => {
          const items = byGroup.get(gid) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={gid}>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-textSoft">
                {GROUP_LABEL[gid]}
              </h3>
              <ul className="mt-2 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2" role="list">
                {items.map((intent) => (
                  <li key={intent.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      title={intent.command}
                      onClick={() => runCommand(intent.command)}
                      className={clsx(
                        'flex min-h-[3.25rem] w-full touch-manipulation flex-col items-start rounded-xl border border-border/45 bg-bgSubtle/55 px-3 py-2.5 text-start text-text transition hover:border-borderStrong hover:bg-surfaceActive/50',
                        disabled && 'cursor-not-allowed opacity-45 hover:border-border/45 hover:bg-bgSubtle/55',
                        btnFocus
                      )}
                    >
                      <span className="text-[12px] font-semibold leading-tight">{intent.title}</span>
                      <span className="mt-0.5 text-[10px] leading-snug text-textSoft line-clamp-2">
                        {intent.subtitle}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
