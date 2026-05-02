import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import type { MobileShellTabId } from './mobileShellQuery';
import { MOBILE_SHELL_NAV_TABS } from './mobileTabConfig';
import { SHELL_TAB_PURPOSE } from './shellSectionCopy';

const TAB_COLUMN_COUNT = MOBILE_SHELL_NAV_TABS.length;

const NAV_TRACK_STYLE: CSSProperties = {
  gridTemplateColumns: `repeat(${TAB_COLUMN_COUNT}, minmax(0, 1fr))`
};

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
  descriptionVisibility = 'visible',
  children
}: {
  id: string;
  title: string;
  description?: string;
  /**
   * `visible` (default) keeps the description under the title. `sr-only` keeps the sentence for
   * screen readers and SSR assertions but hides it from sighted users so the section lands with
   * just the title + content (much less noise for shell-meta captions).
   */
  descriptionVisibility?: 'visible' | 'sr-only';
  children: ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    <section
      id={id}
      className="bo-tab-section bo-mobile-sheet p-3 text-xs text-textMuted"
      aria-labelledby={titleId}
    >
      <h3 id={titleId} className="text-sm font-semibold text-text">
        {title}
      </h3>
      {description ? (
        descriptionVisibility === 'sr-only' ? (
          <span className="sr-only">{description}</span>
        ) : (
          <p className="mt-1.5 text-[11px] leading-relaxed text-textSoft">{description}</p>
        )
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
        'bo-section-halo bo-tab-page-header space-y-1.5',
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
 * Bottom tab dock: symmetric grid, spotlight cell behind the active tab, premium affordances.
 */
export function MobileShellNav({ activeTab, onSelect, btnFocus }: MobileShellNavProps) {
  const idx = MOBILE_SHELL_NAV_TABS.findIndex((t) => t.id === activeTab);
  const activeIndex = idx >= 0 ? idx : 0;

  return (
    <nav
      className="bo-mobile-nav pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center"
      aria-label="Primary navigation"
    >
      <div className="bo-mobile-nav__outer pointer-events-auto w-full max-w-md px-[max(1rem,env(safe-area-inset-left,0px))] pe-[max(1rem,env(safe-area-inset-right,0px))] pb-[max(0.45rem,env(safe-area-inset-bottom,0px))] pt-1">
        <div className="bo-mobile-nav__dock relative overflow-hidden">
          {/* Sliding spotlight aligns to the grid cell for the active tab */}
          <div
            aria-hidden
            className="bo-mobile-nav__track pointer-events-none absolute inset-x-2 inset-y-2 z-0 grid gap-1"
            style={NAV_TRACK_STYLE}
          >
            <span
              className="bo-mobile-nav__spotlight col-span-1 min-h-[2.5rem] self-stretch rounded-2xl"
              style={{ gridColumnStart: activeIndex + 1 }}
              key={`spot-${activeTab}`}
            />
          </div>

          <ul
            className="relative z-[1] grid gap-1 px-2 py-2"
            style={NAV_TRACK_STYLE}
            role="presentation"
          >
            {MOBILE_SHELL_NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const dock = tab.dockLabel ?? tab.label;
              return (
                <li key={tab.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelect(tab.id)}
                    aria-current={active ? 'page' : undefined}
                    title={`${tab.label}: ${SHELL_TAB_PURPOSE[tab.id]}`}
                    className={clsx(
                      'group bo-mobile-nav-item bo-press-ink flex min-h-[3.45rem] w-full min-w-0 touch-manipulation flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-0 py-2 text-micro outline-none ring-inset ring-transparent duration-base motion-safe:transition-colors',
                      btnFocus,
                      'focus-visible:ring-2 focus-visible:ring-focusRing/85 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                      active
                        ? 'text-text'
                        : 'text-textSoft active:text-textMuted hover:text-textMuted'
                    )}
                  >
                    <span
                      className={clsx(
                        'bo-mobile-nav-item__glyph flex size-9 shrink-0 items-center justify-center rounded-xl border bg-transparent duration-base motion-safe:transition-[border-color,background-color,color,box-shadow]',
                        active
                          ? 'border-borderStrong/65 bg-surfaceActive/65 text-text shadow-[inset_0_1px_0_rgb(var(--brand-gold)/0.18)]'
                          : 'border-transparent text-textMuted group-hover:border-borderStrong/55 group-hover:bg-surfaceActive/65 group-hover:text-text'
                      )}
                      aria-hidden
                    >
                      <Icon size={18} strokeWidth={active ? 2.45 : 2} />
                    </span>
                    <span className="block w-full min-w-0 shrink truncate px-0.5 text-center text-[9px] font-bold uppercase leading-none tracking-[0.02em] text-current">
                      {dock}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
