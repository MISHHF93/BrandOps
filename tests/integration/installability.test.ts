/**
 * BrandOps can be installed on a device.
 *
 * An earlier build could not be installed. `public/site.webmanifest` was
 * complete and correct — start_url, `display: standalone`, 192 and 512 icons
 * including a maskable one — but no page linked it and no service worker was
 * registered. These tests inspect the built artifact so that installability is
 * verified as shipped behavior.
 *
 * Two files existed, one line was missing, and the feature was invisible. That
 * is the same shape as the four wiring cycles before it, arriving this time in
 * the build output rather than the services layer.
 *
 * These tests read `dist/`, because installability is a property of what is
 * served. Asserting it against source would prove the intent and not the result.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { shouldRegisterServiceWorker } from '../../src/shared/platform/installability';

const dist = (p: string) => join('dist', p);
const read = (p: string) => readFileSync(dist(p), 'utf8');

/** Every page a person could land on and then install from. */
const LAUNCH_PAGES = [
  'index.html',
  'welcome.html',
  'mobile.html',
  'integrations.html',
  'dashboard.html',
  'help.html'
];

describe('what a browser needs before it will offer an install', () => {
  it('has a build to inspect', () => {
    // Fails rather than skips: an unverified artifact must not read as verified.
    expect(existsSync(dist('mobile.html')), 'run `npm run build` first').toBe(true);
  });

  it('links the manifest from every launch page', () => {
    /**
     * The defect exactly. The manifest existed for as long as the icons did and
     * was referenced by nothing, so this is the assertion that would have caught
     * it at any point.
     */
    const missing = LAUNCH_PAGES.filter((page) => !read(page).includes('rel="manifest"'));
    expect(missing, `pages that do not link the manifest: ${missing.join(', ')}`).toEqual([]);
  });

  it('serves a manifest that describes an installable app', () => {
    const manifest = JSON.parse(read('site.webmanifest')) as {
      name?: string;
      start_url?: string;
      display?: string;
      icons?: Array<{ sizes?: string; purpose?: string }>;
    };

    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    // `browser` display would install something indistinguishable from a tab.
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);

    const sizes = (manifest.icons ?? []).map((i) => i.sizes);
    expect(sizes, 'a 192px icon is required for the install prompt').toContain('192x192');
    expect(sizes, 'a 512px icon is required for the splash screen').toContain('512x512');
    // Without a maskable icon, Android crops the launcher icon into a circle
    // and clips the artwork.
    expect((manifest.icons ?? []).some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('ships every icon the manifest promises', () => {
    // A manifest naming a missing icon fails the install silently.
    const manifest = JSON.parse(read('site.webmanifest')) as {
      icons?: Array<{ src?: string }>;
    };
    const absent = (manifest.icons ?? [])
      .map((i) => i.src ?? '')
      .filter((src) => src && !existsSync(dist(src.replace(/^\//, ''))));

    expect(absent, `manifest names icons that are not shipped: ${absent.join(', ')}`).toEqual([]);
  });

  it('ships a service worker that handles fetch', () => {
    expect(existsSync(dist('sw.js')), 'no service worker in the build').toBe(true);
    // Chrome requires a fetch handler specifically; a worker that only caches on
    // install does not make the app installable.
    expect(read('sw.js')).toMatch(/addEventListener\(\s*['"]fetch['"]/);
  });

  it('registers that worker from the shipped bundle', () => {
    /**
     * The half that source review misses. The worker and the manifest can both
     * be perfect while nothing calls `register`, which is the state this
     * repository was in.
     */
    const chunks = readdirSync(dist('chunks')).filter((f) => f.endsWith('.js'));
    const registers = chunks.some((f) => read(join('chunks', f)).includes('serviceWorker'));
    expect(registers, 'nothing in the bundle registers a service worker').toBe(true);
  });
});

describe('where a service worker should run', () => {
  it('runs on the web build', () => {
    expect(shouldRegisterServiceWorker('web', false)).toBe(true);
  });

  it('never runs in development', () => {
    // A stale worker serving yesterday's bundle mid-edit costs more than it saves.
    expect(shouldRegisterServiceWorker('web', true)).toBe(false);
  });

  it('never runs inside the extension or the native shell', () => {
    /**
     * An MV3 page already has a background worker to collide with, and a
     * Capacitor shell is an app that is installed by definition — a second cache
     * layer under the WebView buys nothing and can serve stale state.
     */
    expect(shouldRegisterServiceWorker('chrome-extension', false)).toBe(false);
    expect(shouldRegisterServiceWorker('capacitor-android', false)).toBe(false);
    expect(shouldRegisterServiceWorker('capacitor-ios', false)).toBe(false);
  });
});

describe('the service worker itself', () => {
  const sw = () => read('sw.js');

  it('goes to the network first for navigations', () => {
    // Cache-first navigation is how an app shows a person yesterday's workspace
    // and calls it current.
    expect(sw()).toMatch(/mode === 'navigate'|request\.mode === "navigate"/);
    expect(sw()).toMatch(/fetch\(request\)/);
  });

  it('never caches a non-GET request', () => {
    // Serving a cached answer for a mutation is the "success shown when
    // persistence failed" case, which is worse than being offline.
    expect(sw()).toMatch(/method !== ['"]GET['"]/);
  });

  it('survives an icon that fails to cache during install', () => {
    // `addAll` rejects the whole install if a single entry 404s, which would
    // leave the app permanently uninstallable over one missing file.
    expect(sw()).toContain('allSettled');
  });
});
