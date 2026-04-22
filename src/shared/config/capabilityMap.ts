/** Single source of truth: where each capability primarily lives vs quick entry points. */

export type CockpitSurfaceId = 'dashboard' | 'integrations';

export interface CockpitCapability {
  id: string;
  label: string;
  summary: string;
  primarySurface: CockpitSurfaceId;
  secondarySurfaces: CockpitSurfaceId[];
}

export const cockpitCapabilities: CockpitCapability[] = [
  {
    id: 'brand-vault',
    label: 'Brand narrative',
    summary: 'Dashboard · Brand & content — positioning, offers, voice, and reusable story assets.',
    primarySurface: 'dashboard',
    secondarySurfaces: []
  },
  {
    id: 'content-publishing',
    label: 'Content library and publishing',
    summary: 'Dashboard · Brand & content — ideas, drafts, queue, and ship rhythm.',
    primarySurface: 'dashboard',
    secondarySurfaces: []
  },
  {
    id: 'growth-pipeline',
    label: 'Outreach and pipeline',
    summary: 'Dashboard · Pipeline — targets, CRM, follow-ups, and revenue motion.',
    primarySurface: 'dashboard',
    secondarySurfaces: []
  },
  {
    id: 'scheduler-cadence',
    label: 'Scheduler and cadence',
    summary: 'Due work, reminders, and day shape — deep tuning in Settings.',
    primarySurface: 'dashboard',
    secondarySurfaces: ['integrations']
  },
  {
    id: 'integrations-manual',
    label: 'Manual integrations hub',
    summary: 'External sources, artifacts, SSH nodes — register and edit here.',
    primarySurface: 'integrations',
    secondarySurfaces: ['dashboard']
  },
  {
    id: 'sync-models-archive',
    label: 'Identity, models, backups, debug',
    summary: 'Provider accounts, AI mode, export/import, and diagnostics.',
    primarySurface: 'integrations',
    secondarySurfaces: []
  }
];

export function surfaceLabel(surface: CockpitSurfaceId): string {
  switch (surface) {
    case 'dashboard':
      return 'Dashboard';
    case 'integrations':
      return 'Integrations';
    default:
      return surface;
  }
}
