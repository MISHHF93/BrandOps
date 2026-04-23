import { describe, expect, it } from 'vitest';
import {
  CADENCE_FLOW_ORDER,
  cadenceConfigureFragment,
  cadenceModeTitle,
  isCadenceFlowMode
} from '../../src/pages/mobile/cadencePresentation';

describe('cadencePresentation', () => {
  it('orders all four modes', () => {
    expect(CADENCE_FLOW_ORDER).toEqual(['balanced', 'maker-heavy', 'client-heavy', 'launch-day']);
  });

  it('titles are title case and stable', () => {
    expect(cadenceModeTitle('balanced')).toBe('Balanced');
    expect(cadenceModeTitle('maker-heavy')).toBe('Maker-heavy');
    expect(cadenceModeTitle('client-heavy')).toBe('Client-heavy');
    expect(cadenceModeTitle('launch-day')).toBe('Launch day');
  });

  it('configure fragments match agent planner tokens', () => {
    expect(cadenceConfigureFragment('balanced')).toBe('cadence balanced');
    expect(cadenceConfigureFragment('launch-day')).toBe('cadence launch-day');
  });

  it('guards unknown strings', () => {
    expect(isCadenceFlowMode('nope')).toBe(false);
    expect(isCadenceFlowMode('balanced')).toBe(true);
  });
});
