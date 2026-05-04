import clsx from 'clsx';
import { Moon, Sun } from 'lucide-react';
import type { UiTheme } from '../../types/domain';

export interface AppearanceToggleProps {
  activeTheme: UiTheme;
  onChange: (next: UiTheme) => void;
  btnFocus: string;
  className?: string;
}

/** Sun/Moon segment — persists via workspace `settings.theme` (global document theme). */
export function AppearanceToggle({
  activeTheme,
  onChange,
  btnFocus,
  className
}: AppearanceToggleProps) {
  return (
    <div
      className={clsx('bo-theme-seg', className)}
      role="group"
      aria-label="Light or dark appearance for the app"
    >
      <button
        type="button"
        className={clsx(
          'bo-theme-seg__btn',
          activeTheme === 'light' && 'bo-theme-seg__btn--active',
          btnFocus
        )}
        title="Light"
        aria-pressed={activeTheme === 'light'}
        aria-label="Use light appearance"
        onClick={() => {
          if (activeTheme !== 'light') onChange('light');
        }}
      >
        <Sun className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      </button>
      <button
        type="button"
        className={clsx(
          'bo-theme-seg__btn',
          activeTheme === 'dark' && 'bo-theme-seg__btn--active',
          btnFocus
        )}
        title="Dark"
        aria-pressed={activeTheme === 'dark'}
        aria-label="Use dark appearance"
        onClick={() => {
          if (activeTheme !== 'dark') onChange('dark');
        }}
      >
        <Moon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}
