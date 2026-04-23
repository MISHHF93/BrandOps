import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

/**
 * Shell-originated commands should go through sendQuickCommand (visible Chat thread), not executeCommandFlow
 * directly. executeCommandFlow stays inside mobileApp for submitMessage / destructive confirm only.
 */
describe('UI command entrypoints (growth / sales shell)', () => {
  const mobileApp = read('src/pages/mobile/mobileApp.tsx');

  it('keeps executeCommandFlow scoped to mobileApp orchestration', () => {
    expect(mobileApp).toContain('const executeCommandFlow');
    expect(mobileApp).toMatch(/const runCommand = sendQuickCommand/);
  });

  it('does not reference executeCommandFlow from cockpit or integrations views', () => {
    const paths = [
      'src/pages/mobile/CockpitDailyView.tsx',
      'src/pages/mobile/CockpitTodayWorkstreamSection.tsx',
      'src/pages/mobile/CockpitPipelineWorkstreamSection.tsx',
      'src/pages/mobile/CockpitBrandContentWorkstreamSection.tsx',
      'src/pages/mobile/CockpitConnectionsWorkstreamSection.tsx',
      'src/pages/mobile/MobileIntegrationsView.tsx',
      'src/pages/mobile/MobileSettingsView.tsx',
      'src/pages/mobile/MobileChatView.tsx'
    ];
    for (const p of paths) {
      expect(read(p)).not.toContain('executeCommandFlow');
    }
  });
});
