import type { ReactNode } from 'react';
import { HEAT_SCORE_GUIDE } from '../executionHeatModel';

interface CockpitOperatingBoardProps {
  children: ReactNode;
  compact?: boolean;
}

/**
 * Single visual “board” wrapping Today’s command deck, pulse, and queue so the cockpit reads as one surface.
 */
export function CockpitOperatingBoard({ children, compact }: CockpitOperatingBoardProps) {
  return (
    <section
      className="bo-cockpit-board w-full rounded-2xl border border-border/55 bg-gradient-to-b from-surface/40 via-bg/30 to-bg/25 p-4 shadow-sm ring-1 ring-border/25 sm:p-5"
      aria-label="Operating board"
    >
      <header className={`mb-4 border-b border-border/45 pb-3 ${compact ? 'space-y-1' : 'space-y-1.5'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:gap-6">
          <div className="min-w-0 flex-1">
            <p className="bo-crown-kicker">Today</p>
            <h2 className={`font-semibold text-text ${compact ? 'text-sm' : 'text-base'}`}>
              Operating board
            </h2>
            <p className={`mt-1 text-textMuted ${compact ? 'text-[11px]' : 'text-xs'}`}>
              One surface for pulse, queue, and ranked work — scroll the rest of the cockpit from the compass.
            </p>
          </div>
          <details className="w-full shrink-0 rounded-lg border border-border/45 bg-bg/30 px-3 py-2.5 text-textMuted sm:w-auto sm:min-w-[min(100%,18rem)] lg:max-w-[22rem]">
            <summary className={`cursor-pointer list-none font-medium text-text marker:content-none [&::-webkit-details-marker]:hidden ${compact ? 'text-[11px]' : 'text-xs'}`}>
              How heat scores work (0–100)
            </summary>
            <p className={`mt-2 border-t border-border/35 pt-2 ${compact ? 'text-[11px]' : 'text-xs'}`}>
              {HEAT_SCORE_GUIDE}
            </p>
          </details>
        </div>
      </header>
      <div className={`${compact ? 'space-y-2' : 'space-y-4'}`}>{children}</div>
    </section>
  );
}
