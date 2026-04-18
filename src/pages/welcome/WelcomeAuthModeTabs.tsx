import type { WelcomeAuthMode } from './welcomeUtils';

interface WelcomeAuthModeTabsProps {
  authMode: WelcomeAuthMode;
  onModeChange: (mode: WelcomeAuthMode) => void;
}

const tabButtonClass = (active: boolean) =>
  `flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focusRing ${
    active ? 'bg-bgElevated text-text shadow-sm' : 'text-textMuted hover:text-text'
  }`;

export function WelcomeAuthModeTabs({ authMode, onModeChange }: WelcomeAuthModeTabsProps) {
  return (
    <div
      className="mt-6 flex w-full rounded-xl border border-border bg-bg/55 p-1 shadow-inner"
      role="tablist"
      aria-label="Sign in or create an account"
    >
      <button
        type="button"
        role="tab"
        aria-selected={authMode === 'signIn'}
        className={tabButtonClass(authMode === 'signIn')}
        onClick={() => onModeChange('signIn')}
      >
        Sign in
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={authMode === 'signUp'}
        className={tabButtonClass(authMode === 'signUp')}
        onClick={() => onModeChange('signUp')}
      >
        Create account
      </button>
    </div>
  );
}
