import { describe, expect, it } from 'vitest';

import {
  applyAiSettingsOperations,
  buildAiSettingsPlan
} from '../../src/services/ai/aiSettingsMode';
import { cloneDemoSampleData } from '../helpers/fixtures';

describe('aiSettingsMode planner', () => {
  it('builds operations from natural-language prompt', () => {
    const plan = buildAiSettingsPlan(
      'Set cadence launch day, motion off, 70% business focus, enable debug'
    );

    expect(plan.operations.length).toBeGreaterThan(0);
    expect(plan.operations.some((operation) => operation.kind === 'set-cadence-mode')).toBe(true);
    expect(plan.operations.some((operation) => operation.kind === 'set-motion-mode')).toBe(true);
    expect(
      plan.operations.some((operation) => operation.kind === 'set-managerial-weight')
    ).toBe(true);
    expect(
      plan.operations.some((operation) => operation.kind === 'set-debug-mode')
    ).toBe(true);
  });

  it('marks unsupported prompt when no operation can be inferred', () => {
    const plan = buildAiSettingsPlan('please transform reality with quantum dashboards');
    expect(plan.operations).toHaveLength(0);
    expect(plan.unsupportedRequests.length).toBeGreaterThan(0);
  });
});

describe('aiSettingsMode operation applier', () => {
  it('applies workspace mutations and records summary', () => {
    const source = cloneDemoSampleData();
    const result = applyAiSettingsOperations(source, [
      {
        id: '1',
        kind: 'set-motion-mode',
        payload: { motionMode: 'off' }
      },
      {
        id: '2',
        kind: 'set-cadence-mode',
        payload: { mode: 'launch-day' }
      },
      {
        id: '3',
        kind: 'add-note',
        payload: { title: 'AI run', detail: 'Prioritize launch blockers.' }
      }
    ]);

    expect(result.data.settings.motionMode).toBe('off');
    expect(result.data.settings.cadenceFlow.mode).toBe('launch-day');
    expect(result.data.notes[0]?.detail).toContain('Prioritize launch blockers');
    expect(result.applied.length).toBe(3);
    expect(result.failed).toHaveLength(0);
  });
});
