import { CalendarCheck2 } from 'lucide-react';
import { cockpitNavigationGroups, type DashboardSectionId } from '../../shared/config/dashboardNavigation';
import { CockpitAtAGlanceStrip } from './CockpitAtAGlanceStrip';
import { CockpitBrandContentWorkstreamSection } from './CockpitBrandContentWorkstreamSection';
import { CockpitConnectionsWorkstreamSection } from './CockpitConnectionsWorkstreamSection';
import { CockpitPipelineWorkstreamSection } from './CockpitPipelineWorkstreamSection';
import { CockpitTodayWorkstreamSection } from './CockpitTodayWorkstreamSection';
import { CockpitWorkstreamBar } from './CockpitWorkstreamBar';
import { CockpitWorkspaceLanesDetails } from './CockpitWorkspaceLanesDetails';
import type { CockpitDailySnapshot } from './buildWorkspaceSnapshot';
import { MobileTabPageHeader } from './mobileTabPrimitives';
import { ShellSectionCallout } from './ShellSectionCallout';

const dashboardAreas = cockpitNavigationGroups[0]?.items.filter((item) => item.type === 'section') ?? [];

export interface CockpitDailyViewProps {
  snapshot: CockpitDailySnapshot;
  btnFocus: string;
  /** True while an agent command round-trip is in flight (disables command chips). */
  commandBusy?: boolean;
  runCommand: (command: string) => void | Promise<void>;
  goToChat: () => void;
  /** Puts text in the Chat composer (does not send). Use when the agent only targets “first” rows. */
  primeChat: (line: string) => void;
  onOpenInAppSettings: () => void;
  activeWorkstream: DashboardSectionId;
  onSelectWorkstream: (target: DashboardSectionId) => void;
}

/**
 * Today tab (URL `?section=today` and related workstreams): metrics strip + four work areas.
 * Layout uses **Pattern A** — one scroll + sticky workstream bar ({@link CockpitWorkstreamBar}); sections keep stable
 * `cockpit-*` heading ids for deep links and {@link getCockpitMobileSectionHeadingId}.
 */
export const CockpitDailyView = ({
  snapshot,
  btnFocus,
  commandBusy = false,
  runCommand,
  goToChat: _goToChat,
  primeChat,
  onOpenInAppSettings,
  activeWorkstream,
  onSelectWorkstream
}: CockpitDailyViewProps) => {
  const [todayMeta, pipelineMeta, brandMeta, connectionsMeta] = [
    dashboardAreas.find((x) => x.target === 'today'),
    dashboardAreas.find((x) => x.target === 'pipeline'),
    dashboardAreas.find((x) => x.target === 'brand-content'),
    dashboardAreas.find((x) => x.target === 'connections')
  ];

  const actions = { btnFocus, commandBusy, runCommand, primeChat };

  return (
    <div className="mt-2 space-y-5" aria-label="Today">
      <MobileTabPageHeader
        title="Today"
        subtitle='Cockpit — execution pulse and work areas. Same tab as bottom nav "Today"; deep edits in Chat.'
        icon={CalendarCheck2}
        iconWrapperClassName="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-950/30"
        iconClassName="text-indigo-300"
      />

      <ShellSectionCallout tab="daily" className="mt-3" />

      <CockpitWorkstreamBar
        btnFocus={btnFocus}
        activeWorkstream={activeWorkstream}
        onSelectWorkstream={onSelectWorkstream}
      />

      <CockpitAtAGlanceStrip snapshot={snapshot} />

      <CockpitTodayWorkstreamSection
        snapshot={snapshot}
        {...actions}
        onOpenInAppSettings={onOpenInAppSettings}
        meta={{
          label: todayMeta?.label ?? 'Today',
          description: todayMeta?.description ?? ''
        }}
      />

      <CockpitPipelineWorkstreamSection
        snapshot={snapshot}
        {...actions}
        meta={{
          label: pipelineMeta?.label ?? 'Pipeline',
          description: pipelineMeta?.description ?? ''
        }}
      />

      <CockpitBrandContentWorkstreamSection
        snapshot={snapshot}
        {...actions}
        meta={{
          label: brandMeta?.label ?? 'Brand & content',
          description: brandMeta?.description ?? ''
        }}
      />

      <CockpitConnectionsWorkstreamSection
        snapshot={snapshot}
        {...actions}
        meta={{
          label: connectionsMeta?.label ?? 'Connections',
          description: connectionsMeta?.description ?? ''
        }}
      />

      <CockpitWorkspaceLanesDetails {...actions} onSelectWorkstream={onSelectWorkstream} />
    </div>
  );
};
