import { Sparkles, X } from 'lucide-react';
import type { MobileShellTabId } from './mobileShellQuery';
import { mobileChipClass } from './mobileTabPrimitives';

const STORAGE_KEY = 'brandops:firstRunJourneyDismissed';

export function readFirstRunJourneyDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export function writeFirstRunJourneyDismissed() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

/**
 * Dismissible “first 30 seconds” guide: one sentence + three tab hops + one safe sample command.
 */
export function FirstRunJourneyCard({
  btnFocus,
  onDismiss,
  onSelectTab,
  onTryCommand
}: {
  btnFocus: string;
  onDismiss: () => void;
  onSelectTab: (tab: MobileShellTabId) => void;
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
            <p className="text-h3 text-text">Start here (30 seconds)</p>
            <p className="mt-1 leading-snug text-textMuted">
              Read in <strong className="text-text">Pulse</strong> or{' '}
              <strong className="text-text">Today</strong>. Execute in{' '}
              <strong className="text-text">Chat</strong>.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                className={mobileChipClass(btnFocus)}
                onClick={() => onSelectTab('chat')}
              >
                Open Chat
              </button>
              <button
                type="button"
                className={mobileChipClass(btnFocus)}
                onClick={() => onSelectTab('pulse')}
              >
                Open Pulse
              </button>
              <button
                type="button"
                className={mobileChipClass(btnFocus)}
                onClick={() => onSelectTab('daily')}
              >
                Open Today
              </button>
            </div>
            <div className="mt-3">
              <button
                type="button"
                className={`bo-btn-primary ${btnFocus}`}
                onClick={() => onTryCommand('pipeline health')}
              >
                <Sparkles className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Run: pipeline health
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
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </section>
  );
}
