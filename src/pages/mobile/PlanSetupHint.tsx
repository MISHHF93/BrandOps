import clsx from 'clsx';
import { Keyboard, PlugZap, Settings } from 'lucide-react';

export interface PlanSetupHintProps {
  btnFocus: string;
  onOpenSettings: () => void;
  onOpenIntegrations: () => void;
  onOpenCommandPalette: () => void;
}

/** Contextual strip linking Plan’s read-only profile to Settings, presets, and Integrations. */
export function PlanSetupHint({
  btnFocus,
  onOpenSettings,
  onOpenIntegrations,
  onOpenCommandPalette
}: PlanSetupHintProps) {
  return (
    <section
      className="rounded-xl border border-info/28 bg-info/6 px-3 py-2.5 sm:px-3.5"
      aria-label="Workspace setup hint"
    >
      <p className="text-meta font-semibold leading-snug text-text">
        Finish setup — profile here is read-only
      </p>
      <p className="mt-1 text-fine leading-snug text-textSoft">
        Use <span className="font-medium text-text">Edit profile</span> below for{' '}
        <span className="font-medium text-text">Settings → Preferences</span> (operator, offer,
        voice, focus). Pick an <span className="font-medium text-text">operating profile</span>{' '}
        preset there. Connect sources under{' '}
        <span className="font-medium text-text">Integrations</span> or press{' '}
        <span className="whitespace-nowrap font-medium text-text">⌘K</span> /{' '}
        <span className="whitespace-nowrap font-medium text-text">Ctrl+K</span>.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onOpenSettings}
          title="Open Settings — Preferences and operating profile"
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-border/45 bg-bg px-2 py-1.5 text-fine font-semibold text-text',
            btnFocus
          )}
        >
          <Settings className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2.25} aria-hidden />
          Open Settings
        </button>
        <button
          type="button"
          onClick={onOpenIntegrations}
          title="Open Integrations — sources and sync hub"
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-border/45 bg-bg px-2 py-1.5 text-fine font-semibold text-text',
            btnFocus
          )}
        >
          <PlugZap className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2.25} aria-hidden />
          Integrations
        </button>
        <button
          type="button"
          onClick={onOpenCommandPalette}
          title="Open command palette"
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-border/45 bg-bg px-2 py-1.5 text-fine font-semibold text-text',
            btnFocus
          )}
        >
          <Keyboard className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2.25} aria-hidden />
          ⌘K palette
        </button>
      </div>
    </section>
  );
}
