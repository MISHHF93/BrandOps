import { Activity, CalendarCheck2, MessageCircle, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { MobileShellTabId } from './mobileShellQuery';

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

function HopChip({
  icon: Icon,
  label,
  onClick,
  btnFocus
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  btnFocus: string;
}) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border border-border/55 bg-surface/55 px-2.5 py-1 text-label font-medium text-text hover:border-borderStrong hover:bg-surfaceActive/70',
        btnFocus
      )}
      onClick={onClick}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      <span>{label}</span>
    </button>
  );
}

/**
 * Dismissible "first 30 seconds" guide. Symbol-first: three hop chips with icons plus one
 * primary CTA — no prose paragraph to decode.
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
            <p className="text-h3 text-text">Start in 30 seconds</p>
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Jump to a tab">
              <HopChip
                icon={Activity}
                label="Pulse"
                btnFocus={btnFocus}
                onClick={() => onSelectTab('pulse')}
              />
              <HopChip
                icon={CalendarCheck2}
                label="Today"
                btnFocus={btnFocus}
                onClick={() => onSelectTab('daily')}
              />
              <HopChip
                icon={MessageCircle}
                label="Chat"
                btnFocus={btnFocus}
                onClick={() => onSelectTab('chat')}
              />
            </div>
            <div className="mt-3">
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
