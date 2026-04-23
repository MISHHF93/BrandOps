import { useCallback } from 'react';
import {
  cockpitNavigationGroups,
  getCockpitMobileSectionHeadingId,
  type DashboardSectionId
} from '../../shared/config/dashboardNavigation';

const SECTION_ITEMS =
  cockpitNavigationGroups[0]?.items.filter(
    (item): item is { id: string; label: string; description: string; type: 'section'; target: DashboardSectionId } =>
      item.type === 'section'
  ) ?? [];

export interface CockpitWorkstreamBarProps {
  btnFocus: string;
  activeWorkstream: DashboardSectionId;
  onSelectWorkstream: (target: DashboardSectionId) => void;
}

/**
 * Second-level nav for the Cockpit tab only: one control per `cockpitNavigationGroups[0]`
 * dashboard workstream. URL `?section=` and active state are owned by `MobileApp`.
 * Sticky bar = Today **Pattern A** (single long scroll + subnav); see `docs/mobile-shell-interaction-audit.md`.
 */
export const CockpitWorkstreamBar = ({
  btnFocus,
  activeWorkstream,
  onSelectWorkstream
}: CockpitWorkstreamBarProps) => {
  const scrollToSection = useCallback(
    (target: DashboardSectionId) => {
      onSelectWorkstream(target);
      const id = getCockpitMobileSectionHeadingId(target);
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [onSelectWorkstream]
  );

  return (
    <div className="sticky top-20 z-[12] -mx-1 mb-2 rounded-lg border border-border/30 bg-bgElevated/95 p-2 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-textMuted">Work areas</p>
      <p className="mt-0.5 text-[11px] leading-snug text-textMuted">
        Today · Pipeline · Brand & content · Connections — tap to scroll. Matches <code className="text-textSoft">?section=</code> deep links.
      </p>
      <nav
        className="mt-2 max-w-full overflow-x-auto border-t border-border/25 pt-2 [scrollbar-width:thin]"
        aria-label="Cockpit workstreams"
      >
        <ul className="flex min-w-0 flex-nowrap items-stretch justify-start gap-1 px-0.5">
          {SECTION_ITEMS.map((item) => {
            const isCurrent = activeWorkstream === item.target;
            return (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => scrollToSection(item.target)}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                    isCurrent
                      ? 'border-primary/50 bg-primary/10 text-text'
                      : 'border-border/50 bg-surface/70 text-textMuted hover:border-border/70'
                  } ${btnFocus}`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
