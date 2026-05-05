import {
  cockpitNavigationGroups,
  type DashboardSectionId
} from '../../shared/config/dashboardNavigation';
import { CockpitBrandContentWorkstreamSection } from './CockpitBrandContentWorkstreamSection';
import { CockpitFocusEngine } from './CockpitFocusEngine';
import { CockpitConnectionsWorkstreamSection } from './CockpitConnectionsWorkstreamSection';
import { CockpitPipelineWorkstreamSection } from './CockpitPipelineWorkstreamSection';
import { CockpitTodayWorkstreamSection } from './CockpitTodayWorkstreamSection';
import { CockpitWorkstreamBar } from './CockpitWorkstreamBar';
import type { CockpitDailySnapshot } from './buildWorkspaceSnapshot';

const dashboardAreas =
  cockpitNavigationGroups[0]?.items.filter((item) => item.type === 'section') ?? [];

export interface CockpitDailyViewProps {
  snapshot: CockpitDailySnapshot;
  btnFocus: string;
  /** True while an agent command round-trip is in flight (disables command chips). */
  commandBusy?: boolean;
  runCommand: (command: string) => void | Promise<void>;
  /** Puts text in the Chat composer (does not send). Use when the agent only targets “first” rows. */
  primeChat: (line: string) => void;
  onOpenInAppSettings: () => void;
  activeWorkstream: DashboardSectionId;
  onSelectWorkstream: (target: DashboardSectionId) => void;
}

/**
 * Today tab: focus engine (do / urgent / momentum) + four work areas.
 *
 * Work areas are rendered as a single-active tab group: {@link CockpitWorkstreamBar} picks one, and
 * the others are DOM-present but visually hidden (so anchor deep-links and SSR assertions still
 * resolve every `cockpit-*` id). Previously all four sections scrolled in one giant column — that
 * was the main source of "too much to read" on Today.
 */
export const CockpitDailyView = ({
  snapshot,
  btnFocus,
  commandBusy = false,
  runCommand,
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
    <div className="space-y-4" aria-label="Today">
      <span className="sr-only">Today — plan and work</span>

      <CockpitWorkstreamBar
        btnFocus={btnFocus}
        activeWorkstream={activeWorkstream}
        onSelectWorkstream={onSelectWorkstream}
      />

      <CockpitFocusEngine
        snapshot={snapshot}
        btnFocus={btnFocus}
        commandBusy={commandBusy}
        runCommand={runCommand}
        primeChat={primeChat}
      />

      <div role="tabpanel" aria-labelledby="cockpit-today" hidden={activeWorkstream !== 'today'}>
        <CockpitTodayWorkstreamSection
          snapshot={snapshot}
          {...actions}
          onOpenInAppSettings={onOpenInAppSettings}
          meta={{
            label: todayMeta?.label ?? 'Today',
            description: todayMeta?.description ?? ''
          }}
        />
      </div>

      <div
        role="tabpanel"
        aria-labelledby="cockpit-pipeline"
        hidden={activeWorkstream !== 'pipeline'}
      >
        <CockpitPipelineWorkstreamSection
          snapshot={snapshot}
          {...actions}
          meta={{
            label: pipelineMeta?.label ?? 'Pipeline',
            description: pipelineMeta?.description ?? ''
          }}
        />
      </div>

      <div
        role="tabpanel"
        aria-labelledby="cockpit-brand"
        hidden={activeWorkstream !== 'brand-content'}
      >
        <CockpitBrandContentWorkstreamSection
          snapshot={snapshot}
          {...actions}
          meta={{
            label: brandMeta?.label ?? 'Brand & content',
            description: brandMeta?.description ?? ''
          }}
        />
      </div>

      <div
        role="tabpanel"
        aria-labelledby="cockpit-connections"
        hidden={activeWorkstream !== 'connections'}
      >
        <CockpitConnectionsWorkstreamSection
          snapshot={snapshot}
          {...actions}
          meta={{
            label: connectionsMeta?.label ?? 'Connections',
            description: connectionsMeta?.description ?? ''
          }}
        />
      </div>
    </div>
  );
};
