/**
 * Alt+M compass: renders `cockpitNavigationGroups` as a right-hand dock. Not imported by
 * current HTML entry points after the mobile shell migration. To wire it, mount on a page and
 * pass `onSelectItem` → e.g. `navigateCrownFromExtensionSurface` from
 * `src/shared/navigation/navigateCrownFromExtensionSurface.ts` (or same-origin navigation
 * in a future dashboard host).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Compass } from 'lucide-react';
import {
  cockpitNavigationGroups,
  type DashboardNavItem,
  type DashboardSectionId
} from '../../../config/dashboardNavigation';
import { CockpitNavItemIcon } from '../../icons/cockpitNavIcons';

/** Extension HTML surface hosting the dock; hides same-surface destinations from the Other windows group. */
export type RightPillNavDockHostSurface = 'dashboard' | 'integrations' | 'help' | 'welcome';

function cockpitGroupsForHost(hostSurface: RightPillNavDockHostSurface | undefined) {
  if (!hostSurface) return cockpitNavigationGroups;
  /** Hide "Full Dashboard" when already on that HTML surface (dashboard or integrations). */
  const hideRedundantFullDashboard = hostSurface === 'integrations' || hostSurface === 'dashboard';
  return cockpitNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.type === 'surface' && item.target === hostSurface) return false;
        if (hideRedundantFullDashboard && item.id === 'nav-dashboard') return false;
        return true;
      })
    }))
    .filter((group) => group.items.length > 0);
}

export interface RightPillNavDockProps {
  activeSectionId?: DashboardSectionId | null;
  onSelectItem: (item: DashboardNavItem) => void;
  closedFocusLabel?: string;
  hostSurface?: RightPillNavDockHostSurface;
}

export function RightPillNavDock({
  activeSectionId,
  onSelectItem,
  closedFocusLabel,
  hostSurface
}: RightPillNavDockProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const groupedItems = useMemo(() => cockpitGroupsForHost(hostSurface), [hostSurface]);
  const flatItems = useMemo(
    () =>
      groupedItems.flatMap((group) =>
        group.items.map((item) => ({ groupTitle: group.title, item }))
      ),
    [groupedItems]
  );

  const activeItemIndex = useMemo(
    () =>
      flatItems.findIndex(
        ({ item }) =>
          item.type === 'section' && activeSectionId != null && item.target === activeSectionId
      ),
    [activeSectionId, flatItems]
  );

  const flatCount = flatItems.length;
  useEffect(() => {
    setFocusIndex((prev) => (flatCount === 0 ? 0 : Math.min(prev, flatCount - 1)));
  }, [flatCount]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;

      if (event.key.toLowerCase() === 'm' && event.altKey) {
        event.preventDefault();
        setMenuOpen((prev) => !prev);
        return;
      }

      if (event.key === 'Escape' && menuOpen) {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }

      if (!menuOpen || isTyping || flatItems.length === 0) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        setFocusIndex((prev) => (prev + 1) % flatItems.length);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        setFocusIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const targetItem = flatItems[focusIndex]?.item;
        if (!targetItem) return;
        onSelectItem(targetItem);
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flatItems, focusIndex, menuOpen, onSelectItem]);

  useEffect(() => {
    if (!menuOpen) return;
    if (activeItemIndex >= 0) {
      setFocusIndex(activeItemIndex);
      return;
    }
    setFocusIndex(0);
  }, [activeItemIndex, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    itemRefs.current[focusIndex]?.focus();
  }, [focusIndex, menuOpen]);

  const handleItemClick = useCallback(
    (item: DashboardNavItem) => {
      onSelectItem(item);
      setMenuOpen(false);
    },
    [onSelectItem]
  );

  const closedLabel =
    closedFocusLabel ??
    flatItems.find((entry) => entry.item.type === 'section' && entry.item.target === 'today')
      ?.item.label ??
    'Navigation';

  let visualIndex = -1;

  return (
    <>
      {menuOpen ? (
        <div
          className="bo-navdock-backdrop"
          aria-hidden
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <aside
        className={`bo-navdock-anchor ${menuOpen ? 'bo-navdock-anchor--open' : ''}`}
        aria-label="Quick navigation"
      >
        <button
          type="button"
          className={`bo-navdock-toggle ${menuOpen ? 'bo-navdock-toggle--open' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="bo-navdock-panel"
          aria-label={
            menuOpen
              ? 'Close navigation panel'
              : `Open navigation panel. Current focus: ${closedLabel}`
          }
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span className="bo-navdock-toggle__glyph" aria-hidden="true">
            <Compass size={28} strokeWidth={2.2} />
          </span>
        </button>
        <div
          id="bo-navdock-panel"
          className={`bo-navdock-panel ${menuOpen ? 'bo-navdock-panel--open' : ''}`}
          role="navigation"
          aria-label="Navigation destinations"
        >
          {groupedItems.map((group) => (
            <section key={group.title} className="bo-navdock-group">
              <p className="bo-navdock-group__title">{group.title}</p>
              <div className="bo-navdock-group__items">
                {group.items.map((item) => {
                  visualIndex += 1;
                  const isActive =
                    item.type === 'section' &&
                    activeSectionId != null &&
                    item.target === activeSectionId;
                  return (
                    <button
                      key={item.id}
                      ref={(node) => {
                        itemRefs.current[visualIndex] = node;
                      }}
                      type="button"
                      className={`bo-navdock-pill ${isActive ? 'bo-navdock-pill--active' : ''}`}
                      onClick={() => handleItemClick(item)}
                      aria-current={isActive ? 'page' : undefined}
                      tabIndex={menuOpen ? (visualIndex === focusIndex ? 0 : -1) : -1}
                      title={item.description}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <CockpitNavItemIcon
                          item={item}
                          size={15}
                          className={`shrink-0 ${isActive ? 'text-primary' : 'text-textSoft'}`}
                        />
                        <span className="bo-navdock-pill__label">{item.label}</span>
                      </span>
                      <span className="bo-pill !px-1.5 !py-0.5 text-[9px] uppercase tracking-[0.08em]">
                        {item.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}
