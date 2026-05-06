import type {
  CadenceFlowMode,
  CockpitDensityMode,
  CockpitLayoutMode,
  OperatingPresetId
} from '../../types/domain';

export type OperatingPresetDefinition = {
  id: OperatingPresetId;
  title: string;
  shortDescription: string;
  cadence: CadenceFlowMode;
  cockpitLayout: CockpitLayoutMode;
  cockpitDensity: CockpitDensityMode;
  setAiAdapterMode?: 'disabled' | 'local-only' | 'external-opt-in';
  setAiGuidanceMode?: 'rule-based' | 'prompt-ready' | 'hybrid';
  matchRequiresAiFields: boolean;
};

function cadenceConfigureFragment(mode: CadenceFlowMode): string {
  switch (mode) {
    case 'launch-day':
      return 'cadence launch-day';
    case 'maker-heavy':
      return 'cadence maker-heavy';
    case 'client-heavy':
      return 'cadence client-heavy';
    default:
      return 'cadence balanced';
  }
}

/** More specific presets first (used by Assistant inference). */
export const OPERATING_PRESETS: readonly OperatingPresetDefinition[] = [
  {
    id: 'offline-local-first',
    title: 'Offline / local-first',
    shortDescription:
      'Balanced cadence, compact sections; AI adapter local-only and rule-based guidance.',
    cadence: 'balanced',
    cockpitLayout: 'sections',
    cockpitDensity: 'compact',
    setAiAdapterMode: 'local-only',
    setAiGuidanceMode: 'rule-based',
    matchRequiresAiFields: true
  },
  {
    id: 'launch-sprint',
    title: 'Launch sprint',
    shortDescription: 'Launch-day cadence, unified scroll, compact density; prompt-ready guidance.',
    cadence: 'launch-day',
    cockpitLayout: 'unified-scroll',
    cockpitDensity: 'compact',
    setAiGuidanceMode: 'prompt-ready',
    matchRequiresAiFields: true
  },
  {
    id: 'focused-builder',
    title: 'Focused builder',
    shortDescription: 'Maker-heavy cadence with compact sections — deep work bias.',
    cadence: 'maker-heavy',
    cockpitLayout: 'sections',
    cockpitDensity: 'compact',
    matchRequiresAiFields: false
  },
  {
    id: 'client-heavy-ops',
    title: 'Client-heavy ops',
    shortDescription: 'Client-heavy cadence, comfortable density for pipeline-facing days.',
    cadence: 'client-heavy',
    cockpitLayout: 'sections',
    cockpitDensity: 'comfortable',
    matchRequiresAiFields: false
  },
  {
    id: 'balanced-ops',
    title: 'Balanced',
    shortDescription: 'Default-friendly balance across lanes and density.',
    cadence: 'balanced',
    cockpitLayout: 'sections',
    cockpitDensity: 'compact',
    matchRequiresAiFields: false
  }
] as const;

const PRESET_BY_ID = Object.fromEntries(OPERATING_PRESETS.map((p) => [p.id, p])) as Record<
  OperatingPresetId,
  OperatingPresetDefinition
>;

const LEGACY_SLUGS: Record<string, OperatingPresetId> = {
  offline: 'offline-local-first',
  'offline-local': 'offline-local-first',
  local: 'offline-local-first',
  launch: 'launch-sprint',
  sprint: 'launch-sprint',
  builder: 'focused-builder',
  maker: 'focused-builder',
  client: 'client-heavy-ops',
  balanced: 'balanced-ops'
};

export function resolveOperatingPresetSlug(raw: string): OperatingPresetId | null {
  const t = raw.trim().toLowerCase().replace(/_/g, '-');
  if (!t) return null;
  if (OPERATING_PRESETS.some((p) => p.id === t)) return t as OperatingPresetId;
  return LEGACY_SLUGS[t] ?? null;
}

export function getOperatingPresetDefinition(id: OperatingPresetId): OperatingPresetDefinition {
  return PRESET_BY_ID[id];
}

export function buildOperatingPresetConfigureLine(id: OperatingPresetId): string {
  const p = PRESET_BY_ID[id];
  const parts: string[] = [
    cadenceConfigureFragment(p.cadence),
    `cockpit layout ${p.cockpitLayout}`,
    `cockpit density ${p.cockpitDensity}`
  ];
  if (p.setAiAdapterMode) {
    parts.push(`ai adapter ${p.setAiAdapterMode}`);
  }
  if (p.setAiGuidanceMode) {
    parts.push(`ai guidance ${p.setAiGuidanceMode}`);
  }
  return parts.join(', ');
}
