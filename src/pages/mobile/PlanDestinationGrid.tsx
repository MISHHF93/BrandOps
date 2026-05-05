import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarCheck2,
  ChevronRight,
  PlugZap,
  Search,
  Settings,
  Sparkles
} from 'lucide-react';

export interface PlanDestinationGridProps {
  btnFocus: string;
  commandBusy: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onOpenToday: () => void;
  onOpenIntegrations: () => void;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
}

type DestinationRow = {
  key: string;
  title: string;
  hint: string;
  Icon: LucideIcon;
  primary?: boolean;
  disabled?: boolean;
  onActivate: () => void;
  paletteAria?: string;
};

export function PlanDestinationGrid({
  btnFocus,
  commandBusy,
  runCommand,
  onOpenToday,
  onOpenIntegrations,
  onOpenSettings,
  onOpenCommandPalette
}: PlanDestinationGridProps) {
  const rows: DestinationRow[] = [
    {
      key: 'today',
      title: 'Today',
      hint: 'Lanes & digests',
      Icon: CalendarCheck2,
      onActivate: onOpenToday
    },
    {
      key: 'connect',
      title: 'Connect',
      hint: 'Sources & sync',
      Icon: PlugZap,
      onActivate: onOpenIntegrations
    },
    {
      key: 'setup',
      title: 'Setup',
      hint: 'Account & prefs',
      Icon: Settings,
      onActivate: onOpenSettings
    },
    {
      key: 'pipeline',
      title: 'Pipeline',
      hint: 'Run health check',
      Icon: Sparkles,
      primary: true,
      disabled: commandBusy,
      onActivate: () => void runCommand('pipeline health')
    },
    {
      key: 'commands',
      title: 'Commands',
      hint: 'Search & run (⌘K)',
      Icon: Search,
      onActivate: () => onOpenCommandPalette(),
      paletteAria: 'Open workspace command palette'
    }
  ];

  return (
    <nav className="bo-plan-destination-grid" aria-label="Plan destinations">
      {rows.map((row) => {
        const Icon = row.Icon;
        return (
          <button
            key={row.key}
            type="button"
            disabled={row.disabled}
            title={row.hint}
            aria-label={row.paletteAria}
            onClick={row.onActivate}
            className={clsx(
              'bo-plan-destination-card',
              row.primary && 'bo-plan-destination-card--accent',
              btnFocus
            )}
          >
            <Icon className="bo-plan-destination-card__icon shrink-0 text-textSoft" strokeWidth={2.25} aria-hidden />
            <span className="bo-plan-destination-card__body min-w-0 flex-1">
              <span className="bo-plan-destination-card__title">{row.title}</span>
              <span className="bo-plan-destination-card__hint">{row.hint}</span>
            </span>
            <ChevronRight className="bo-plan-destination-card__chevron shrink-0 text-textSoft/70" aria-hidden />
          </button>
        );
      })}
    </nav>
  );
}
