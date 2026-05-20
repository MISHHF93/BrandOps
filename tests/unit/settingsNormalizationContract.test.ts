import { describe, expect, it } from 'vitest';

import { defaultAppSettings } from '../../src/config/workspaceDefaults';
import { normalizeWorkspaceSettings } from '../../src/services/storage/storage';

const sortedKeys = (o: object) => Object.keys(o).sort();

describe('normalizeWorkspaceSettings contract', () => {
  it('returns the same top-level keys as defaultAppSettings for empty partial input', () => {
    const out = normalizeWorkspaceSettings({});
    expect(sortedKeys(out)).toEqual(sortedKeys(defaultAppSettings));
  });

  it('returns defaults when settings is null or not an object', () => {
    expect(normalizeWorkspaceSettings(null)).toEqual(defaultAppSettings);
    expect(normalizeWorkspaceSettings(undefined)).toEqual(defaultAppSettings);
    expect(normalizeWorkspaceSettings('legacy')).toEqual(defaultAppSettings);
  });

  it('ignores legacy appearance keys and still produces valid AppSettings', () => {
    const raw = {
      theme: 'light',
      visualMode: 'retroMagic',
      motionMode: 'wild',
      ambientFxEnabled: true
    };
    const out = normalizeWorkspaceSettings(raw);
    expect(out.theme).toBe('light');
    expect('visualMode' in out).toBe(false);
    expect('motionMode' in out).toBe(false);
    expect('ambientFxEnabled' in out).toBe(false);
  });

  it('preserves explicit theme and scalars when valid', () => {
    const out = normalizeWorkspaceSettings({
      theme: 'light',
      timezone: 'America/New_York'
    });
    expect(out.theme).toBe('light');
    expect(out.timezone).toBe('America/New_York');
    expect(out.copilotWorkers).toEqual(defaultAppSettings.copilotWorkers);
  });

  it('normalizes operatingProfile.lastAppliedPresetId', () => {
    expect(
      normalizeWorkspaceSettings({
        operatingProfile: { lastAppliedPresetId: 'launch-sprint' }
      }).operatingProfile
    ).toEqual({ lastAppliedPresetId: 'launch-sprint' });

    expect(
      normalizeWorkspaceSettings({
        operatingProfile: { lastAppliedPresetId: 'custom' }
      }).operatingProfile
    ).toEqual({ lastAppliedPresetId: 'custom' });

    expect(
      normalizeWorkspaceSettings({
        operatingProfile: { lastAppliedPresetId: null }
      }).operatingProfile
    ).toEqual({ lastAppliedPresetId: null });

    expect(
      normalizeWorkspaceSettings({
        operatingProfile: { lastAppliedPresetId: 'not-a-real-preset' }
      }).operatingProfile
    ).toEqual(defaultAppSettings.operatingProfile);
  });

  it('migrates legacy notificationCenter.resumeNeuralPhaseContext into operatorTwin.resumeArtifact', () => {
    const raw: unknown = {
      ...defaultAppSettings,
      operatorTwin: { ...defaultAppSettings.operatorTwin, resumeArtifact: '' },
      notificationCenter: {
        ...defaultAppSettings.notificationCenter,
        resumeNeuralPhaseContext: 'sections:legacy-ingest | skills:ts'
      }
    };
    const out = normalizeWorkspaceSettings(raw);
    expect(out.operatorTwin.resumeArtifact).toContain('legacy-ingest');
    expect(out.operatorTwin.resumeArtifact).toContain('ts');
  });
});
