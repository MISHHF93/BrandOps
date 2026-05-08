import { describe, expect, it, vi } from 'vitest';

describe('hostEnvironment', () => {
  it('detects chrome-extension vs web (fresh module after chrome shim)', async () => {
    const originalChrome = globalThis.chrome;

    vi.resetModules();
    Reflect.set(globalThis, 'chrome', { runtime: { id: 'fixture-extension-id' } });
    const ext = await import('../../src/shared/platform/hostEnvironment');
    expect(ext.getBrandOpsHostKind()).toBe('chrome-extension');

    vi.resetModules();
    Reflect.deleteProperty(globalThis, 'chrome');
    const web = await import('../../src/shared/platform/hostEnvironment');
    expect(web.getBrandOpsHostKind()).toBe('web');

    if (originalChrome !== undefined) {
      Reflect.set(globalThis, 'chrome', originalChrome);
    }
  });
});
