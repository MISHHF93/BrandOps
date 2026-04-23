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
      className="mb-3 rounded-xl border border-primary/35 bg-primarySoft/20 px-3 py-3 text-[12px] text-textMuted shadow-sm"
      aria-label="Get started in under a minute"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-surface/60 text-primary">
            <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-text">Start here (30 seconds)</p>
            <p className="mt-0.5 leading-snug">
              <strong className="text-text">Pulse</strong> orients you in time; <strong className="text-text">Today</strong>{' '}
              plans the day. <strong className="text-text">Chat</strong> is the only tab that executes commands.{' '}
              <strong className="text-text">Integrations</strong> wires tools; <strong className="text-text">Settings</strong>{' '}
              is you and trust. Same five tabs on the bar below.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
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
            <p className="mt-2 text-[11px] text-textSoft">Try a quick result:</p>
            <div className="mt-1">
              <button
                type="button"
                className={`${mobileChipClass(btnFocus)} border-primary/40 font-medium text-text`}
                onClick={() => onTryCommand('pipeline health')}
              >
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
