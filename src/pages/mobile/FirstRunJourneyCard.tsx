import clsx from 'clsx';
import { CalendarRange, LayoutDashboard, Sparkles, X } from 'lucide-react';
import { BrandOpsMarkBadge } from '../../shared/ui/brandopsPolish';

/** Current dismissal flag — bump suffix when checklist content/placement changes materially. */
export const GETTING_STARTED_STORAGE_KEY = 'brandops:gettingStartedDismissed:v3';

/**
 * Persisted on workspace `seed.onboardingVersion` when the user dismisses Getting started.
 * Keep in sync with the suffix on {@link GETTING_STARTED_STORAGE_KEY}.
 */
export const GETTING_STARTED_CONTENT_VERSION = '3';

/** Legacy key (Today-tab only card). No longer read; see ONBOARDING.md. */
export const LEGACY_FIRST_RUN_STORAGE_KEY = 'brandops:firstRunJourneyDismissed';

export function readFirstRunJourneyDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(GETTING_STARTED_STORAGE_KEY) === '1';
}

function writeGettingStartedDismissed() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(GETTING_STARTED_STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

const stepClass = 'mt-2 rounded-lg border border-border/35 bg-bgSubtle/30 px-2.5 py-2';
const stepTitleClass = 'text-[11px] font-semibold text-text';
const stepBodyClass = 'mt-0.5 text-[10px] leading-snug text-textSoft';

/**
 * First-session checklist on **Assistant** — numbered steps + CTAs for Plan, Today, command, and ⌘K.
 */
export function FirstRunJourneyCard({
  btnFocus,
  onDismiss,
  onTryCommand,
  onOpenPlan,
  onOpenToday
}: {
  btnFocus: string;
  onDismiss: () => void;
  onTryCommand: (line: string) => void;
  onOpenPlan: () => void;
  onOpenToday: () => void;
}) {
  return (
    <section
      className="bo-brand-command-surface bo-section-halo mb-3 rounded-xl px-3 py-3 text-label text-textMuted shadow-sm"
      aria-label="Start here — first session"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <BrandOpsMarkBadge className="bo-brand-mark--sm mt-0.5" />
          <div className="min-w-0">
            <p className="text-h3 text-text">Getting started</p>
            <p className="mt-1 text-meta text-textSoft">
              Four quick steps. You can dismiss this anytime — Help in the header always has the manual.
            </p>

            <ol className="mt-2 list-none space-y-2 p-0 text-left" role="list">
              <li className={stepClass}>
                <p className={stepTitleClass}>
                  <span className="text-textSoft">1.</span> Run a command
                </p>
                <p className={stepBodyClass}>
                  BrandOps runs typed workspace commands and Ask from here. Try a health check.
                </p>
                <button
                  type="button"
                  className={clsx('bo-btn-primary mt-2', btnFocus)}
                  onClick={() => onTryCommand('pipeline health')}
                  title="Run: pipeline health"
                >
                  <Sparkles className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  Pipeline health
                </button>
              </li>
              <li className={stepClass}>
                <p className={stepTitleClass}>
                  <span className="text-textSoft">2.</span> Open Plan
                </p>
                <p className={stepBodyClass}>
                  Pulse counts, Today snapshot, and the soonest-first queue — plus Today / Pipeline shortcuts.
                </p>
                <button
                  type="button"
                  className={clsx(
                    'mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/45 bg-bg px-2.5 py-1.5 text-[11px] font-semibold text-text',
                    btnFocus
                  )}
                  onClick={onOpenPlan}
                >
                  <LayoutDashboard className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  Open Plan
                </button>
              </li>
              <li className={stepClass}>
                <p className={stepTitleClass}>
                  <span className="text-textSoft">3.</span> Open Today
                </p>
                <p className={stepBodyClass}>Lanes, digests, and workstreams when you need the full cockpit.</p>
                <button
                  type="button"
                  className={clsx(
                    'mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/45 bg-bg px-2.5 py-1.5 text-[11px] font-semibold text-text',
                    btnFocus
                  )}
                  onClick={onOpenToday}
                >
                  <CalendarRange className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  Open Today
                </button>
              </li>
              <li className={stepClass}>
                <p className={stepTitleClass}>
                  <span className="text-textSoft">4.</span> Integrations & Setup
                </p>
                <p className={stepBodyClass}>
                  Press <span className="whitespace-nowrap font-medium text-text">⌘K</span> /{' '}
                  <span className="whitespace-nowrap font-medium text-text">Ctrl+K</span> to open the palette —
                  jump to Integrations, Settings, or search commands.
                </p>
              </li>
            </ol>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            writeGettingStartedDismissed();
            onDismiss();
          }}
          className={`-m-1 shrink-0 rounded-lg p-1.5 text-textSoft hover:text-text ${btnFocus}`}
          aria-label="Dismiss getting started"
          title="Dismiss"
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </section>
  );
}
