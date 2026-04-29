import { describe, expect, it } from 'vitest';

import {
  applyAiSettingsOperations,
  buildAiSettingsPlan
} from '../../src/services/ai/aiSettingsMode';
import { cloneDemoSampleData } from '../helpers/fixtures';

describe('aiSettingsMode planner', () => {
  it('builds operations from natural-language prompt', () => {
    const plan = buildAiSettingsPlan('Set cadence launch day, 70% business focus');

    expect(plan.operations.length).toBeGreaterThan(0);
    expect(plan.operations.some((operation) => operation.kind === 'set-cadence-mode')).toBe(true);
    expect(plan.operations.some((operation) => operation.kind === 'set-managerial-weight')).toBe(
      true
    );
    expect(plan.operations.some((operation) => operation.kind === 'set-motion-mode')).toBe(false);
    expect(plan.operations.some((operation) => operation.kind === 'set-debug-mode')).toBe(false);
  });

  it('warns instead of creating visual or motion operations', () => {
    const plan = buildAiSettingsPlan('retro, motion wild, enable ambient, enable debug');
    expect(plan.operations).toHaveLength(0);
    expect(plan.warnings.join(' ')).toContain('unified');
  });

  it('marks unsupported prompt when no operation can be inferred', () => {
    const plan = buildAiSettingsPlan('please transform reality with quantum dashboards');
    expect(plan.operations).toHaveLength(0);
    expect(plan.unsupportedRequests.length).toBeGreaterThan(0);
  });

  it('parses positioning and brand voice into update-brand-profile', () => {
    const plan = buildAiSettingsPlan(
      'positioning is "Helps SMBs ship faster", brand voice is "Direct, warm, no jargon"'
    );
    const brand = plan.operations.find((o) => o.kind === 'update-brand-profile');
    expect(brand?.payload.positioning).toBe('Helps SMBs ship faster');
    expect(brand?.payload.voiceGuide).toBe('Direct, warm, no jargon');
  });

  it('accepts voice guide phrasing as alias for brand voice', () => {
    const plan = buildAiSettingsPlan('voice guide is "Short sentences only"');
    const brand = plan.operations.find((o) => o.kind === 'update-brand-profile');
    expect(brand?.payload.voiceGuide).toBe('Short sentences only');
  });

  it('parses multiline quoted brand voice before next field', () => {
    const plan = buildAiSettingsPlan(
      'brand voice is "Line one\nLine two", operator name is "Alex"'
    );
    const brand = plan.operations.find((o) => o.kind === 'update-brand-profile');
    expect(brand?.payload.voiceGuide).toContain('Line one');
    expect(brand?.payload.operatorName).toBe('Alex');
  });
});

describe('aiSettingsMode operation applier', () => {
  it('applies workspace mutations and records summary', () => {
    const source = cloneDemoSampleData();
    const result = applyAiSettingsOperations(source, [
      {
        id: '1',
        kind: 'set-cadence-mode',
        payload: { mode: 'launch-day' }
      },
      {
        id: '2',
        kind: 'add-note',
        payload: { title: 'AI run', detail: 'Prioritize launch blockers.' }
      }
    ]);

    expect(result.data.settings.cadenceFlow.mode).toBe('launch-day');
    expect(result.data.notes[0]?.detail).toContain('Prioritize launch blockers');
    expect(result.applied.length).toBe(2);
    expect(result.failed).toHaveLength(0);
  });

  it('skips legacy visual and motion operations', () => {
    const source = cloneDemoSampleData();
    const result = applyAiSettingsOperations(source, [
      { id: '1', kind: 'set-visual-mode', payload: { visualMode: 'retroMagic' } },
      { id: '2', kind: 'set-motion-mode', payload: { motionMode: 'wild' } },
      { id: '3', kind: 'set-ambient-fx', payload: { ambientFxEnabled: true } },
      { id: '4', kind: 'set-debug-mode', payload: { debugMode: true } }
    ]);

    expect(result.data.settings.visualMode).toBe(source.settings.visualMode);
    expect(result.data.settings.motionMode).toBe(source.settings.motionMode);
    expect(result.data.settings.ambientFxEnabled).toBe(source.settings.ambientFxEnabled);
    expect(result.data.settings.debugMode).toBe(source.settings.debugMode);
    expect(result.applied).toHaveLength(0);
    expect(result.skipped.length).toBe(4);
  });

  it('applies positioning and voiceGuide on update-brand-profile', () => {
    const source = cloneDemoSampleData();
    const result = applyAiSettingsOperations(source, [
      {
        id: '1',
        kind: 'update-brand-profile',
        payload: {
          positioning: 'New positioning line',
          voiceGuide: 'Crisp and confident.'
        }
      }
    ]);
    expect(result.data.brand.positioning).toBe('New positioning line');
    expect(result.data.brand.voiceGuide).toBe('Crisp and confident.');
    expect(result.applied).toHaveLength(1);
  });
});
