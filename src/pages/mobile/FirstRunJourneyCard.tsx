import { Sparkles, X } from 'lucide-react';
import { BrandOpsMarkBadge } from '../../shared/ui/brandopsPolish';

const STORAGE_KEY = 'brandops:firstRunJourneyDismissed';

export function readFirstRunJourneyDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === '1';
}

function writeFirstRunJourneyDismissed() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

/**
 * Compact first-session hint on **Today** — users often arrive via Plan → Today or ⌘K.
 */
export function FirstRunJourneyCard({
  btnFocus,
  onDismiss,
  onTryCommand
}: {
  btnFocus: string;
  onDismiss: () => void;
  onTryCommand: (line: string) => void;
}) {
  return (
    <section
      className="bo-brand-command-surface bo-section-halo mb-3 rounded-xl px-3 py-3 text-label text-textMuted shadow-sm"
      aria-label="Start here — first session"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <BrandOpsMarkBadge className="bo-brand-mark--sm mt-0.5" />
          <div>
            <p className="text-h3 text-text">Start here</p>
            <p className="mt-1 text-meta text-textSoft">
              Assistant runs commands and Ask (home when you open the app). Plan shows counts + queue;
              Today is for lanes. Try pipeline health or press ⌘K to jump anywhere.
            </p>
            <div className="mt-2">
              <button
                type="button"
                className={`bo-btn-primary ${btnFocus}`}
                onClick={() => onTryCommand('pipeline health')}
                title="Run: pipeline health"
              >
                <Sparkles className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Pipeline health
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            writeFirstRunJourneyDismissed();
            onDismiss();
          }}
          className={`-m-1 shrink-0 rounded-lg p-1.5 text-textSoft hover:text-text ${btnFocus}`}
          aria-label="Dismiss get started"
          title="Dismiss"
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </section>
  );
}
