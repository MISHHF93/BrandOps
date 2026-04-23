import { describe, expect, it } from 'vitest';
import { buildAiSettingsPlan } from '../../src/services/ai/aiSettingsMode';
import { OPERATIONAL_PRESETS } from '../../src/pages/mobile/mobileSettingsPresets';

/** Matches how `configureWorkspace` passes the tail into `buildAiSettingsPlan` (substring after first `:`). */
function promptFromConfigureCommand(command: string): string {
  return command.split(':').slice(1).join(':').trim();
}

describe('OPERATIONAL_PRESETS (workflow bundles)', () => {
  it('each bundle resolves to at least two configure operations (smoke for parser coverage)', () => {
    for (const p of OPERATIONAL_PRESETS) {
      const prompt = promptFromConfigureCommand(p.command);
      const plan = buildAiSettingsPlan(prompt);
      expect(plan.operations.length, `bundle "${p.label}"`).toBeGreaterThanOrEqual(2);
    }
  });
});
