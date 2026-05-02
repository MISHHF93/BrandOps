import { useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, Network, Palette, Sun, Workflow } from 'lucide-react';
import clsx from 'clsx';
import {
  cockpitNavigationGroups,
  getCockpitMobileSectionHeadingId,
  type DashboardSectionId
} from '../../shared/config/dashboardNavigation';

const SECTION_ITEMS =
  cockpitNavigationGroups[0]?.items.filter(
    (
      item
    ): item is {
      id: string;
      label: string;
      description: string;
      type: 'section';
      target: DashboardSectionId;
    } => item.type === 'section'
  ) ?? [];

const WORKSTREAM_ICON: Record<DashboardSectionId, LucideIcon> = {
  today: Sun,
  pipeline: Workflow,
  'brand-content': Palette,
  connections: Network
};

export interface CockpitWorkstreamBarProps {
  btnFocus: string;
  activeWorkstream: DashboardSectionId;
  onSelectWorkstream: (target: DashboardSectionId) => void;
}

/**
 * Second-level nav for the Cockpit tab — icon + short label pills. Each workstream carries its
 * own glyph so users scan by symbol rather than reading four pills of text.
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
    <div className="bo-workstream-dock mb-3">
      <p className="bo-section-label">
        <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--info" aria-hidden>
          <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        <span>Work areas</span>
      </p>
      <nav
        className="bo-workstream-pill-strip mt-3 max-w-full scroll-smooth overflow-x-auto overflow-y-hidden pb-1 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]"
        aria-label="Cockpit workstreams"
      >
        <ul className="flex min-w-0 flex-nowrap items-stretch justify-start gap-1.5 px-0">
          {SECTION_ITEMS.map((item) => {
            const isCurrent = activeWorkstream === item.target;
            const Icon = WORKSTREAM_ICON[item.target];
            return (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => scrollToSection(item.target)}
                  aria-current={isCurrent ? 'true' : undefined}
                  title={item.description}
                  className={clsx('bo-pill-nav max-w-[10.5rem] snap-start', btnFocus)}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  <span className="bo-pill-nav__label">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
