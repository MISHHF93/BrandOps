import type { WorkspaceModuleId } from '../../types/domain';

/** Canonical dashboard workstreams after IA consolidation. */
export type DashboardSectionId = 'today' | 'pipeline' | 'brand-content' | 'connections';

export const DEFAULT_DASHBOARD_SECTION: DashboardSectionId = 'today';

export const LEGACY_TO_CANONICAL_DASHBOARD_SECTIONS: Record<string, DashboardSectionId> = {
  overview: 'today',
  growth: 'pipeline',
  content: 'brand-content',
  systems: 'connections'
};

/** Optional link from workspace modules (modules.ts) to consolidated dashboard sections. */
export const workspaceModuleToDashboardSection: Partial<Record<WorkspaceModuleId, DashboardSectionId>> = {
  'brand-vault': 'brand-content',
  'content-library': 'brand-content',
  'publishing-queue': 'brand-content',
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
    description: 'Today (this tab), Pipeline, Brand & content, Connections — use chips to scroll.',
    items: [
      {
        id: 'nav-overview',
        label: 'Today',
        description: 'Mission map, execution priorities, and scheduler pulse.',
        type: 'section',
        target: 'today'
      },
      {
        id: 'nav-growth',
        label: 'Pipeline',
        description: 'Outreach execution and CRM pipeline.',
        type: 'section',
        target: 'pipeline'
      },
      {
        id: 'nav-content',
        label: 'Brand & content',
        description: 'Library, publishing queue, and brand narrative assets.',
        type: 'section',
        target: 'brand-content'
      },
      {
        id: 'nav-systems',
        label: 'Connections',
        description: 'Integrations, sync artifacts, and infrastructure controls.',
        type: 'section',
        target: 'connections'
      }
    ]
  },
  {
    title: 'Other windows',
    description: 'Same five-tab shell in another HTML entry (extension packaging): Integrations options page, Help, or primary mobile with Chat selected.',
    items: [
      {
        id: 'nav-integrations',
        label: 'Integrations page',
        description: 'Packaged page (MV3 options_ui): sources, providers, and Settings in the same shell.',
        type: 'surface',
        target: 'integrations'
      },
      {
        id: 'nav-knowledge',
        label: 'Help page',
        description: 'Full manual (opens help.html, starts on Today tab in the same shell).',
        type: 'surface',
        target: 'help'
      },
      {
        id: 'nav-dashboard',
        label: 'Primary app (Chat)',
        description: 'Canonical route is mobile.html with the Chat tab selected.',
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

export const flattenedNavigationItems = cockpitNavigationGroups.flatMap((group) => group.items);

export function isDashboardSectionId(value: string): value is DashboardSectionId {
  return (observedSectionIds as string[]).includes(value);
}

export function canonicalizeDashboardSectionId(
  value: string | null | undefined
): DashboardSectionId | null {
  if (!value) return null;
  const candidate = value.trim();
  if (!candidate) return null;
  if (isDashboardSectionId(candidate)) return candidate;
  return LEGACY_TO_CANONICAL_DASHBOARD_SECTIONS[candidate] ?? null;
}

/**
 * Resolve initial section from `?section=`, then legacy #hash (migrated on load), then default.
 */
export function resolveInitialDashboardSection(): DashboardSectionId {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_SECTION;

  const sectionParam = new URLSearchParams(window.location.search).get('section');
  const fromQuery = canonicalizeDashboardSectionId(sectionParam);
  if (fromQuery) {
    return fromQuery;
  }

  const rawHash = window.location.hash.replace(/^#/, '');
  const fromHash = canonicalizeDashboardSectionId(rawHash);
  if (fromHash) {
    return fromHash;
  }

  return DEFAULT_DASHBOARD_SECTION;
}
