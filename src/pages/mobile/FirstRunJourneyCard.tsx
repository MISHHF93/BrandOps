import clsx from 'clsx';
import { Bot, Sparkles, X } from 'lucide-react';
import { BrandOpsMarkBadge } from '../../shared/ui/brandopsPolish';

/** Current dismissal flag — bump suffix when checklist content/placement changes materially. */
const GETTING_STARTED_STORAGE_KEY = 'brandops:gettingStartedDismissed:v9';

/**
 * Persisted on workspace `seed.onboardingVersion` when the user dismisses Getting started.
 * Keep in sync with the suffix on {@link GETTING_STARTED_STORAGE_KEY}.
 */
export const GETTING_STARTED_CONTENT_VERSION = '9';

/** Reads dismissal under current storage key; migrates prior checklist versions once per browser. */
export function readFirstRunJourneyDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  if (localStorage.getItem(GETTING_STARTED_STORAGE_KEY) === '1') return true;
  const legacyKeys = [
    'brandops:gettingStartedDismissed:v7',
    'brandops:gettingStartedDismissed:v8',
    'brandops:gettingStartedDismissed:v5',
    'brandops:gettingStartedDismissed:v4'
  ];
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

/**
 * First-session checklist on **Plan** — Ask My Twin for thought, Plan for operations.
 */
export function FirstRunJourneyCard({
  btnFocus,
  onDismiss,
  onTryCommand,
  onOpenAsk,
  onOpenSettings
}: {
  btnFocus: string;
  onDismiss: () => void;
  onTryCommand: (line: string) => void;
  onOpenAsk: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}) {
  return (
    <section
      className="bo-ops-panel mb-2 px-3 py-2.5 text-label text-textMuted"
      aria-label="Start here — first session"
    >
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandOpsMarkBadge className="bo-brand-mark--sm mt-0.5" />
          <div className="min-w-0">
            <p className="text-label font-semibold text-text">Ask My Twin. Plan.</p>
            <p className="mt-0.5 line-clamp-2 text-fine leading-snug text-textSoft">
              Ask is for thinking. Plan is the flat operating surface for twin setup,
              recommendations, approvals, sources, activity, and receipts.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className={clsx('bo-btn-primary bo-btn-primary--sm justify-center', btnFocus)}
            onClick={onOpenSettings}
            title="Create digital twin in Setup"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            Create twin
          </button>
          <button
            type="button"
            className={clsx(
              'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/45 bg-bgSubtle/60 px-2.5 py-1.5 text-fine font-semibold text-text',
              btnFocus
            )}
            onClick={() => {
              onOpenAsk();
              onTryCommand('ask: Help me identify my strongest positioning and next best move.');
            }}
            title="Open Ask My Twin with a starter prompt"
          >
            <Bot className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            Ask twin
          </button>
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
