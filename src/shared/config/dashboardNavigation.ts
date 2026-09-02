import type { WorkspaceModuleId } from '../../types/domain';

/** Canonical dashboard workstreams after IA consolidation. */
export type DashboardSectionId = 'today' | 'pipeline' | 'brand-content' | 'connections';

export const DEFAULT_DASHBOARD_SECTION: DashboardSectionId = 'today';

const LEGACY_TO_CANONICAL_DASHBOARD_SECTIONS: Record<string, DashboardSectionId> = {
  overview: 'today',
  growth: 'pipeline',
  content: 'brand-content',
  systems: 'connections'
};

/**
 * Workspace modules (`workspaceModules` in `modules.ts`) → Cockpit workstream for `?section=` deep links.
 * Tab tokens (`settings`, `integrations`, …) are handled first in `parseMobileShellFromSearchParams`.
 */
const workspaceModuleToDashboardSection: Partial<Record<WorkspaceModuleId, DashboardSectionId>> = {
  'command-center': 'today',
  'brand-vault': 'brand-content',
  'content-library': 'brand-content',
  'publishing-queue': 'brand-content',
  'linkedin-companion': 'brand-content',
  'outreach-workspace': 'pipeline',
  'pipeline-crm': 'pipeline',
  'scheduler-engine': 'today'
};

export type DashboardNavItem =
  | {
      id: string;
      label: string;
      description: string;
      type: 'section';
      target: DashboardSectionId;
    }
  | {
      id: string;
      label: string;
      description: string;
      type: 'surface';
      target: 'dashboard' | 'integrations' | 'help';
    };

export const cockpitNavigationGroups: Array<{
  title: string;
  description: string;
  items: DashboardNavItem[];
}> = [
  {
    title: 'Work areas',
    description:
      'Today (this tab), Pipeline, Brand & content, Connections — twin-grounded daily operating surface.',
    items: [
      {
        id: 'nav-overview',
        label: 'Today',
        description: 'Twin-grounded focus board, predictions, and next-best-move intelligence.',
        type: 'section',
        target: 'today'
      },
      {
        id: 'nav-growth',
        label: 'Pipeline',
        description: 'Outreach drafts, pipeline moves, contacts, and approval-gated follow-ups.',
        type: 'section',
        target: 'pipeline'
      },
      {
        id: 'nav-content',
        label: 'Brand & content',
        description: 'Content library, publishing queue, and twin-voice narrative assets.',
        type: 'section',
        target: 'brand-content'
      },
      {
        id: 'nav-systems',
        label: 'Connections',
        description: 'Connected agents, data sources, sync hubs, and workspace I/O.',
        type: 'section',
        target: 'connections'
      }
    ]
  },
  {
    title: 'Other windows',
    description:
      'The same BrandOps shell opens in separate windows: the Integrations hub, Help, or the main app with Chat selected.',
    items: [
      {
        id: 'nav-integrations',
        label: 'Integrations hub',
        description: 'Sources, providers, and Settings in the same BrandOps shell.',
        type: 'surface',
        target: 'integrations'
      },
      {
        id: 'nav-knowledge',
        label: 'Help page',
        description: 'Full product manual, opens to the Today tab.',
        type: 'surface',
        target: 'help'
      },
      {
        id: 'nav-dashboard',
        label: 'Primary app (Chat)',
        description: 'Main app with the Chat tab selected.',
        type: 'surface',
        target: 'dashboard'
      }
    ]
  }
];

export const observedSectionIds: DashboardSectionId[] = cockpitNavigationGroups.flatMap((group) =>
  group.items.flatMap((item) => (item.type === 'section' ? [item.target] : []))
);

/**
 * `id` values on Cockpit (mobile) section headings in `Cockpit*WorkstreamSection.tsx` (composed by `CockpitDailyView`).
 * Must stay in sync with `observedSectionIds` and deep links `?section=<DashboardSectionId>`.
 */
const COCKPIT_MOBILE_HEADING_IDS: Record<DashboardSectionId, string> = {
  today: 'cockpit-today',
  pipeline: 'cockpit-pipeline',
  'brand-content': 'cockpit-brand',
  connections: 'cockpit-connections'
};

export function getCockpitMobileSectionHeadingId(section: DashboardSectionId): string {
  return COCKPIT_MOBILE_HEADING_IDS[section];
}

export function isDashboardSectionId(value: string): value is DashboardSectionId {
  return (observedSectionIds as string[]).includes(value);
}

export function canonicalizeDashboardSectionId(
  value: string | null | undefined
): DashboardSectionId | null {
  if (!value) return null;
  const candidate = value.trim();
  if (!candidate) return null;
  const normalized = candidate.toLowerCase();
  if (isDashboardSectionId(normalized)) return normalized;
  const legacy = LEGACY_TO_CANONICAL_DASHBOARD_SECTIONS[normalized];
  if (legacy) return legacy;
  const fromModule = workspaceModuleToDashboardSection[normalized as WorkspaceModuleId];
  return fromModule ?? null;
}
