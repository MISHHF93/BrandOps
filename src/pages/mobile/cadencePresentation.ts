import type { CadenceFlowMode } from '../../types/domain';

/** Canonical order for segmented cadence UI and Advanced `<select>`. */
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

/** One-line hint for tooltips and dense summaries. */
export function cadenceModeSummary(mode: string): string {
  switch (mode as CadenceFlowMode) {
    case 'maker-heavy':
      return 'Bias toward build time and deep work blocks.';
    case 'client-heavy':
      return 'Bias toward meetings, follow-ups, and delivery.';
    case 'launch-day':
      return 'High-throughput push windows for ship weeks.';
    default:
      return 'Even mix of maker and client work.';
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
