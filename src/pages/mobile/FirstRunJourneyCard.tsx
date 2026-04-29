import { CheckCircle2, Sparkles, X } from 'lucide-react';

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
 * Dismissible "first 30 seconds" guide. Navigation stays in the bottom bar; this card only keeps
 * the first command CTA and a static orientation checklist.
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
      className="bo-section-halo bo-section-halo--primary mb-3 rounded-xl border border-accent/40 bg-accentSoft/20 px-3 py-3 text-label text-textMuted shadow-sm"
      aria-label="Get started in under a minute"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/50 bg-surface/70 text-accent">
            <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <p className="text-h3 text-text">Start in 30 seconds</p>
            <p className="mt-1 text-meta text-textSoft">
              Start with one workspace check, then use the bottom tabs to move around.
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
            <ul className="mt-3 space-y-1.5" aria-label="First value checklist">
              {['Pulse shows urgency', 'Today groups work areas', 'Chat executes commands'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-1.5 text-meta text-textSoft">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={2.25} />
                    <span>{item}</span>
                  </li>
                )
              )}
            </ul>
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
