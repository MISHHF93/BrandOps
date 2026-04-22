import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('MobileSettingsView routing', () => {
  it('does not deep-link to Chat, Cockpit, or other tabs; avoids new-tab help/dashboard surfaces', () => {
    const src = read('src/pages/mobile/MobileSettingsView.tsx');
    expect(src).not.toContain('onSelectTab');
    expect(src).toContain('documentSurface');
    expect(src).not.toMatch(/openExtensionSurface\(\s*['"]help['"]/);
    expect(src).not.toMatch(/openExtensionSurface\(\s*['"]dashboard['"]/);
  });

  it('retains only optional openExtensionSurface for integrations new-tab', () => {
    const src = read('src/pages/mobile/MobileSettingsView.tsx');
    expect(src).toContain("openExtensionSurface('integrations')");
  });
});
