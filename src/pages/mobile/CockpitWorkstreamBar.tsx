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
    <div className="sticky top-20 z-[12] -mx-1 mb-2 rounded-xl border border-border/40 bg-bgElevated/95 p-2.5 backdrop-blur-sm">
      <p className="bo-section-label">
        <span className="bo-visual-orb bo-visual-orb--info" aria-hidden />
        Work areas
      </p>
      <nav
        className="mt-2 max-w-full overflow-x-auto border-t border-border/25 pt-2 [scrollbar-width:thin]"
        aria-label="Cockpit workstreams"
      >
        <ul className="flex min-w-0 flex-nowrap items-stretch justify-start gap-1.5 px-0.5">
          {SECTION_ITEMS.map((item) => {
            const isCurrent = activeWorkstream === item.target;
            return (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => scrollToSection(item.target)}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-label font-medium transition ${
                    isCurrent
                      ? 'border-accent/60 bg-accentSoft/35 text-text shadow-sm'
                      : 'border-border/60 bg-surface/70 text-textMuted hover:border-borderStrong hover:text-text'
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
