import type { BrandOpsData } from '../../types/domain';
import { isDashboardSectionId } from './dashboardNavigation';

/**
 * Pre-merge dashboard section IDs → current `DashboardSectionId` values.
 * Keep in sync with product navigation; used for externalSync links and legacy payloads.
 */
export const LEGACY_SECTION_ID_MAP: Record<string, string> = {
  'command-center': 'today',
  'mission-map': 'today',
  'scheduler-engine': 'today',
  'outreach-workspace': 'pipeline',
  'pipeline-crm': 'pipeline',
  'brand-vault': 'brand-content',
  'content-library': 'brand-content',
  'publishing-queue': 'brand-content',
  'integration-hub': 'connections',
  settings: 'connections',
  'linkedin-companion': 'connections',
  overview: 'today',
  growth: 'pipeline',
  content: 'brand-content',
  systems: 'connections'
};

export function normalizeMergedSectionId(value: string): string {
  const candidate = value.trim();
  if (!candidate) return candidate;
  if (isDashboardSectionId(candidate)) return candidate;
  return LEGACY_SECTION_ID_MAP[candidate] ?? candidate;
}

export function normalizeExternalSyncSectionReferences(data: BrandOpsData): BrandOpsData {
  return {
    ...data,
    externalSync: {
      ...data.externalSync,
      links: data.externalSync.links.map((link) => ({
        ...link,
        sourceId: normalizeMergedSectionId(link.sourceId),
        targetId: normalizeMergedSectionId(link.targetId)
      }))
    }
  };
}
