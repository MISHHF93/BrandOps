import { describe, expect, it } from 'vitest';
import { seedData } from '../../src/modules/brandMemory/seed';
import { buildMobileSettingsFullReadout } from '../../src/pages/mobile/mobileSettingsReadout';
import { buildUnifiedOperationalModeSummary } from '../../src/pages/mobile/unifiedOperationalMode';

describe('buildUnifiedOperationalModeSummary', () => {
  const baseReadout = buildMobileSettingsFullReadout(seedData);

  it('uses preset headline and facets for balanced-ops match', () => {
    const s = buildUnifiedOperationalModeSummary({
      readout: baseReadout,
      inferredPresetId: 'balanced-ops'
    });
    expect(s.headline).toBe('Balanced');
    expect(s.subhead).toContain('Default-friendly');
    expect(s.facets.some((l) => l.includes('BrandOps daily cadence'))).toBe(true);
    expect(s.facets.some((l) => l.includes('Preset on record'))).toBe(true);
  });

  it('explains custom mix when inferred preset is custom', () => {
    const s = buildUnifiedOperationalModeSummary({
      readout: baseReadout,
      inferredPresetId: 'custom'
    });
    expect(s.headline).toBe('Custom mix');
    expect(s.subhead).toContain('mixed manually');
  });

  it('surfaces drift when saved label disagrees with live headline', () => {
    const readout = {
      ...baseReadout,
      operatingProfileLastApplied: 'Launch sprint'
    };
    const s = buildUnifiedOperationalModeSummary({
      readout,
      inferredPresetId: 'balanced-ops'
    });
    expect(s.driftNote).toMatch(/Launch sprint/);
    expect(s.driftNote).toMatch(/Balanced/);
  });

  it('mentions Phase R when preview present', () => {
    const readout = {
      ...baseReadout,
      resumeNeuralPhasePreview: 'Senior engineer…'
    };
    const s = buildUnifiedOperationalModeSummary({
      readout,
      inferredPresetId: 'balanced-ops'
    });
    expect(s.facets.some((l) => l.includes('Phase R'))).toBe(true);
  });
});
