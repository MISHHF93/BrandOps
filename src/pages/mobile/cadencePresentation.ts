import type { CadenceFlowMode } from '../../types/domain';

/** Canonical order for Advanced Operating mode `<select>`. */
export const CADENCE_FLOW_ORDER: readonly CadenceFlowMode[] = [
  'balanced',
  'maker-heavy',
  'client-heavy',
  'launch-day'
] as const;

export function cadenceModeTitle(mode: string): string {
  switch (mode as CadenceFlowMode) {
    case 'maker-heavy':
      return 'Maker-heavy';
    case 'client-heavy':
      return 'Client-heavy';
    case 'launch-day':
      return 'Launch day';
    default:
      return 'Balanced';
  }
}

/** Natural-language fragment for `applySettingsConfigure` / `configure:` (no prefix). */
export function cadenceConfigureFragment(mode: CadenceFlowMode): string {
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

export function isCadenceFlowMode(value: string): value is CadenceFlowMode {
  return (
    value === 'balanced' ||
    value === 'maker-heavy' ||
    value === 'client-heavy' ||
    value === 'launch-day'
  );
}
