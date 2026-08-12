import type { OperatingPresetId } from '../../types/domain';
import type { OperatingPresetDefinition } from '../../shared/workspace/operatingProfileCatalog';
import {
  OPERATING_PRESETS,
  buildOperatingPresetConfigureLine
} from '../../shared/workspace/operatingProfileCatalog';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

export type { OperatingPresetDefinition };
export { OPERATING_PRESETS, buildOperatingPresetConfigureLine };

export function inferOperatingPresetId(
  snapshot: MobileWorkspaceSnapshot
): OperatingPresetId | 'custom' {
  for (const p of OPERATING_PRESETS) {
    if (matchesPreset(p, snapshot)) return p.id;
  }
  return 'custom';
}

function matchesPreset(p: OperatingPresetDefinition, snapshot: MobileWorkspaceSnapshot): boolean {
  const r = snapshot.settingsFullReadout;
  if (r.cockpitLayout !== p.cockpitLayout) return false;
  if (r.cockpitDensity !== p.cockpitDensity) return false;
  if (p.matchRequiresAiFields) {
    if (p.setAiAdapterMode !== undefined && r.aiAdapterMode !== p.setAiAdapterMode) return false;
    if (p.setAiGuidanceMode !== undefined && r.aiGuidanceMode !== p.setAiGuidanceMode) return false;
  }
  return true;
}
