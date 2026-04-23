import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { MobileShellTabId } from './mobileShellQuery';
import { MOBILE_SHELL_NAV_TABS } from './mobileTabConfig';
import { SHELL_TAB_PURPOSE } from './shellSectionCopy';

/** Shared focus ring for mobile shell (matches design tokens in `src/styles/index.css`). */
export const MOBILE_BTN_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focusRing/80 focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

export function mobileChipClass(btnFocus: string) {
  return clsx(
    'rounded-full border border-border/55 bg-surface/55 px-2.5 py-1.5 text-left text-xs text-text',
    btnFocus
  );
}

export function MobileTabSection({
  id,
  title,
  description,
  children
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    <section
      id={id}
      className="rounded-xl border border-border/50 bg-bgSubtle/50 p-3 text-xs text-textMuted"
      aria-labelledby={titleId}
    >
      <h3 id={titleId} className="text-sm font-semibold text-text">
        {title}
      </h3>
      {description ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-textSoft">{description}</p>
      ) : null}
      {children}
    </section>
  );
}

export function MobileTabPageHeader({
  title,
  subtitle,
  icon: Icon,
  iconWrapperClassName,
  iconClassName,
  haloTone = 'primary'
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconWrapperClassName: string;
  iconClassName: string;
  haloTone?: 'primary' | 'info' | 'success';
}) {
  return (
    <header
      className={clsx(
        'bo-section-halo space-y-1.5 pb-1',
        haloTone === 'info' && 'bo-section-halo--info',
        haloTone === 'success' && 'bo-section-halo--success',
        haloTone === 'primary' && 'bo-section-halo--primary'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={clsx('h-10 w-10 shrink-0', iconWrapperClassName)}>
          <Icon className={clsx('h-5 w-5', iconClassName)} aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-h1 text-text">{title}</h2>
          <p className="mt-0.5 text-label text-textMuted">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}

export interface MobileShellNavProps {
  activeTab: MobileShellTabId;
  onSelect: (tab: MobileShellTabId) => void;
  btnFocus: string;
}

/**
 * Bottom tab bar for {@link MobileApp}: safe-area aware, `aria-current` on active tab.
 */
export function MobileShellNav({ activeTab, onSelect, btnFocus }: MobileShellNavProps) {
  return (
    <nav className="bo-mobile-nav fixed inset-x-0 bottom-0 z-30" aria-label="Primary navigation">
      <ul className="mx-auto flex w-full max-w-md items-stretch justify-between gap-0.5 px-1 pt-1.5">
        {MOBILE_SHELL_NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <li key={tab.id} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onSelect(tab.id)}
                aria-current={active ? 'page' : undefined}
                title={SHELL_TAB_PURPOSE[tab.id]}
                className={clsx(
                  'bo-press-ink flex w-full flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-micro transition-colors duration-fast',
                  btnFocus,
                  active
                    ? 'bg-surfaceActive/90 text-text shadow-[inset_0_1px_0_rgb(var(--color-text)/0.05)]'
                    : 'text-textSoft hover:bg-surface/50 hover:text-textMuted'
                )}
              >
                <span
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-fast',
                    active
                      ? 'border-borderStrong/80 bg-surface/90 text-text'
                      : 'border-transparent bg-transparent text-textSoft'
                  )}
                  aria-hidden
                >
                  <Icon size={18} strokeWidth={active ? 2.25 : 2} />
                </span>
                <span className="max-w-full truncate px-0.5 text-[11px] font-semibold leading-none">
                  {tab.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
