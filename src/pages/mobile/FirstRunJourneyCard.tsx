import clsx from 'clsx';
import { BookOpen, CalendarRange, LayoutDashboard, Settings, Sparkles, X } from 'lucide-react';
import { BrandOpsMarkBadge } from '../../shared/ui/brandopsPolish';

/** Current dismissal flag — bump suffix when checklist content/placement changes materially. */
export const GETTING_STARTED_STORAGE_KEY = 'brandops:gettingStartedDismissed:v5';

/**
 * Persisted on workspace `seed.onboardingVersion` when the user dismisses Getting started.
 * Keep in sync with the suffix on {@link GETTING_STARTED_STORAGE_KEY}.
 */
export const GETTING_STARTED_CONTENT_VERSION = '5';

/** Legacy key (Today-tab only card). No longer read. */
export const LEGACY_FIRST_RUN_STORAGE_KEY = 'brandops:firstRunJourneyDismissed';

/** Reads dismissal under current storage key; migrates prior checklist versions once per browser. */
export function readFirstRunJourneyDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  if (localStorage.getItem(GETTING_STARTED_STORAGE_KEY) === '1') return true;
  const legacyKeys = ['brandops:gettingStartedDismissed:v4'];
  for (const legacy of legacyKeys) {
    if (localStorage.getItem(legacy) !== '1') continue;
    try {
      localStorage.setItem(GETTING_STARTED_STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    return true;
  }
  return false;
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
const stepTitleClass = 'text-meta font-semibold text-text';
const stepBodyClass = 'mt-0.5 text-fine leading-snug text-textSoft';

/**
 * First-session checklist on **Plan** — numbered steps + CTAs for Today, palette, Settings, and Help.
 */
export function FirstRunJourneyCard({
  btnFocus,
  onDismiss,
  onTryCommand,
  onOpenToday,
  onOpenSettings,
  onOpenHelp
}: {
  btnFocus: string;
  onDismiss: () => void;
  onTryCommand: (line: string) => void;
  onOpenToday: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}) {
  return (
    <section
      className="bo-brand-command-surface mb-3 rounded-xl px-3 py-3 text-label text-textMuted shadow-sm"
      aria-label="Start here — first session"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <BrandOpsMarkBadge className="bo-brand-mark--sm mt-0.5" />
          <div className="min-w-0">
            <p className="text-h3 text-text">Getting started</p>
            <p className="mt-1 text-meta text-textSoft">
              Five quick steps. Dismiss anytime — the header Help button opens the Knowledge Center
              (topic <span className="font-medium text-text">First run and profile</span>).
            </p>

            <ol className="mt-2 list-none space-y-2 p-0 text-left" role="list">
              <li className={stepClass}>
                <p className={stepTitleClass}>
                  <span className="text-textSoft">1.</span> Run a command
                </p>
                <p className={stepBodyClass}>
                  Runs from Assistant on the dock for transcripts — try a health check here first
                  (stays on Plan).
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
                  <span className="text-textSoft">2.</span> Pulse & quick picks
                </p>
                <p className={stepBodyClass}>
                  Scroll this tab for Pulse counts, Quick picks, Today snapshot, and the queue —
                  your workspace hub.
                </p>
                <a
                  href="#plan-actions"
                  className={clsx(
                    'mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/45 bg-bg px-2.5 py-1.5 text-meta font-semibold text-text',
                    btnFocus
                  )}
                >
                  <LayoutDashboard
                    className="h-3.5 w-3.5 shrink-0"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                  Jump to Quick picks
                </a>
              </li>
              <li className={stepClass}>
                <p className={stepTitleClass}>
                  <span className="text-textSoft">3.</span> Open Today
                </p>
                <p className={stepBodyClass}>
                  Lanes, digests, and workstreams when you need the full cockpit.
                </p>
                <button
                  type="button"
                  className={clsx(
                    'mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/45 bg-bg px-2.5 py-1.5 text-meta font-semibold text-text',
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
                  <span className="text-textSoft">4.</span> Palette & Integrations
                </p>
                <p className={stepBodyClass}>
                  Press <span className="whitespace-nowrap font-medium text-text">⌘K</span> /{' '}
                  <span className="whitespace-nowrap font-medium text-text">Ctrl+K</span> for the
                  command centre — jump to Integrations, Settings, Help, or run a typed command.
                </p>
              </li>
              <li className={stepClass}>
                <p className={stepTitleClass}>
                  <span className="text-textSoft">5.</span> Tune your workspace
                </p>
                <p className={stepBodyClass}>
                  In <span className="font-medium text-text">Settings → Unified workspace</span>,
                  replace placeholder profile fields, then apply an{' '}
                  <span className="font-medium text-text">operating profile</span> preset (layout,
                  AI defaults, cadence). Pick a{' '}
                  <span className="font-medium text-text">Hosted Ask routing</span> mode (Fast /
                  Evidence / …) for hosted <span className="font-medium text-text">ask:</span>{' '}
                  turns. Use <span className="font-medium text-text">Integrations</span> for sources
                  and sync hub rows.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-lg border border-border/45 bg-bg px-2.5 py-1.5 text-meta font-semibold text-text',
                      btnFocus
                    )}
                    onClick={onOpenSettings}
                    title="Open Settings"
                  >
                    <Settings className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                    Open Settings
                  </button>
                  <button
                    type="button"
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-lg border border-border/45 bg-bg px-2.5 py-1.5 text-meta font-semibold text-text',
                      btnFocus
                    )}
                    onClick={onOpenHelp}
                    title="Open Help — Knowledge Center"
                  >
                    <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                    Help — First run
                  </button>
                </div>
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
