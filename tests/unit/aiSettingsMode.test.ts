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
    expect(plan.operations.some((operation) => operation.kind === 'set-managerial-weight')).toBe(
      true
    );
    expect(plan.operations.some((operation) => operation.kind === 'set-debug-mode')).toBe(true);
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
