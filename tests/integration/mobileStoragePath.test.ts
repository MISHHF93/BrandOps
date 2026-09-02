/**
 * @vitest-environment jsdom
 *
 * The storage layer the mobile app actually runs on.
 *
 * BrandOps ships two ways: a Chrome extension, and an Android app built from the
 * same `dist/` through Capacitor. The extension gets `chrome.storage.local`. The
 * Android WebView has no `chrome` namespace at all, so every read and write in
 * the app goes through the `localStorage` fallback instead.
 *
 * **Nothing tested that path.** Every existing suite that touches storage shims
 * a `chrome` global first, which means the adapter the shipped mobile app
 * depends on had never been exercised — the same shape as cycle 23's CI problem
 * and cycle 20's build-time flag: a thing that only works in the environment
 * where it was checked.
 *
 * The two platforms differ in a way that matters. `chrome.storage.local` is
 * large and quota-managed by the browser; `localStorage` is a few megabytes and
 * throws when it fills. A workspace that grows past it fails to save, and a save
 * that fails without saying so is the defect this codebase keeps producing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Import fresh each time: the adapter is chosen once, at module load. */
async function loadStorage() {
  vi.resetModules();
  return import('../../src/shared/storage/browserStorage');
}

beforeEach(() => {
  // The mobile reality: no extension APIs whatsoever.
  delete (globalThis as never as { chrome?: unknown }).chrome;
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('with no chrome namespace, as on Android', () => {
  it('persists to localStorage rather than falling silently to memory', async () => {
    const { getBrowserStorage } = await loadStorage();
    await getBrowserStorage('local').set('workspace', { brand: 'BrandOps' });

    // A memory adapter would pass a round-trip test and lose everything on
    // restart, which is the failure this asserts against.
    expect(window.localStorage.length).toBeGreaterThan(0);
  });

  it('round-trips a workspace', async () => {
    const { getBrowserStorage } = await loadStorage();
    const storage = getBrowserStorage('local');
    const workspace = { contacts: [{ id: 'c1', name: 'Ada' }], updatedAt: '2026-09-01' };

    await storage.set('workspace', workspace);
    expect(await storage.get('workspace')).toEqual(workspace);
  });

  it('survives a restart', async () => {
    const first = await loadStorage();
    await first.getBrowserStorage('local').set('workspace', { kept: true });

    // A fresh module graph against the same localStorage — what relaunching the
    // app does.
    const second = await loadStorage();
    expect(await second.getBrowserStorage('local').get('workspace')).toEqual({ kept: true });
  });

  it('scopes its keys so it cannot collide with the page', async () => {
    const { getBrowserStorage } = await loadStorage();
    await getBrowserStorage('local').set('workspace', { a: 1 });

    const keys = Object.keys(window.localStorage);
    // The WebView origin is shared with whatever else the app stores.
    expect(keys.every((key) => key.startsWith('brandops:'))).toBe(true);
    expect(window.localStorage.getItem('workspace')).toBeNull();
  });

  it('returns only its own keys from getAll', async () => {
    const { getBrowserStorage } = await loadStorage();
    const storage = getBrowserStorage('local');
    window.localStorage.setItem('someone-elses-key', 'not ours');
    await storage.set('workspace', { a: 1 });

    expect(Object.keys(await storage.getAll())).toEqual(['workspace']);
  });

  it('uses sessionStorage for the session area', async () => {
    const { getBrowserStorage } = await loadStorage();
    await getBrowserStorage('session').set('draft', { text: 'unsent' });

    expect(window.sessionStorage.length).toBeGreaterThan(0);
    expect(window.localStorage.length).toBe(0);
  });
});

describe('when the store cannot take the write', () => {
  it('says the workspace is full, and what to do about it', async () => {
    const { getBrowserStorage } = await loadStorage();
    const storage = getBrowserStorage('local');

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const error = new Error('The quota has been exceeded.');
      error.name = 'QuotaExceededError';
      throw error;
    });

    await expect(storage.set('workspace', { big: true })).rejects.toThrow(/full/i);
    await expect(storage.set('workspace', { big: true })).rejects.toThrow(/Export the workspace/i);
  });

  it('does not swallow the failure', async () => {
    const { getBrowserStorage } = await loadStorage();
    const storage = getBrowserStorage('local');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage is disabled');
    });

    // A write that fails quietly leaves the user believing their work is saved.
    // That is worse than an error, because they find out later.
    await expect(storage.set('workspace', { a: 1 })).rejects.toThrow(/Failed to persist/);
  });

  it('drops a corrupt entry instead of bricking the boot path', async () => {
    const { getBrowserStorage } = await loadStorage();
    const storage = getBrowserStorage('local');
    window.localStorage.setItem('brandops:local:workspace', '{ not json');

    // Refusing to start is a worse failure than losing one unreadable record.
    expect(await storage.get('workspace')).toBeUndefined();
    expect(window.localStorage.getItem('brandops:local:workspace')).toBeNull();
  });
});

describe('when even localStorage is unavailable', () => {
  it('still functions, in memory', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    // Private browsing, or a WebView with site data disabled.
    Object.defineProperty(window, 'localStorage', { value: null, configurable: true });

    try {
      const { getBrowserStorage } = await loadStorage();
      const storage = getBrowserStorage('local');
      await storage.set('workspace', { a: 1 });
      // Nothing persists, but the app runs rather than crashing on boot.
      expect(await storage.get('workspace')).toEqual({ a: 1 });
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });
});
