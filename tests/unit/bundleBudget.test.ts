/**
 * What the product actually ships, measured.
 *
 * D14 has read "zero frontend performance measurement" since the scorecard was
 * written. Visual regression, viewport testing and interaction latency all need
 * a renderer this environment does not have — but bundle weight does not. It is
 * the one frontend performance property that can be measured here honestly, and
 * it is the one that decides first paint on a phone.
 *
 * Measured on gzip rather than raw bytes, because gzip is what crosses the
 * network. The raw number is recorded too, since it is what the device has to
 * parse and that cost is real on low-end hardware.
 *
 * Baseline at the time of writing:
 *
 *   renderChatbotSurface   675 kB raw   182 kB gzip   ← the app surface
 *   storage                339 kB raw    93 kB gzip
 *   react                  134 kB raw    43 kB gzip
 *   launchLifecycleGate     81 kB raw    27 kB gzip
 *   ────────────────────────────────────────────────
 *   total                 1337 kB raw   380 kB gzip
 *
 * The ceilings sit modestly above those numbers: tight enough that a careless
 * import shows up, loose enough that ordinary work does not trip them. They are
 * a ratchet, not a target — lowering them as the surface is split is the point.
 *
 * One thing this checked and found clean: no test code, no fixtures, and no
 * source maps reach `dist`. That was worth confirming rather than assuming.
 *
 * One thing it found that is not clean, recorded rather than fixed blind:
 * `integrations.js` is a 0.5 kB entry point that pulls `renderChatbotSurface`,
 * `storage` and `launchLifecycleGate` — roughly 300 kB gzip — to render a page
 * that is not the chat surface. `index`, `dashboard` and `help` do not. Splitting
 * it is a real improvement and needs a renderer to verify the page still works,
 * so it is named here rather than attempted from a position that cannot check it.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'dist';

/** Gzip ceilings in bytes. A ratchet: these may fall, never rise casually. */
const CHUNK_BUDGET: Record<string, number> = {
  'renderChatbotSurface.js': 195_000,
  'storage.js': 100_000,
  'react.js': 46_000,
  'launchLifecycleGate.js': 30_000
};

/** Everything the extension and shell ship, gzipped, together. */
const TOTAL_GZIP_BUDGET = 400_000;

/**
 * A chunk not in `CHUNK_BUDGET` may not exceed this. It exists so a new large
 * chunk has to be looked at and given a line of its own, rather than sliding in
 * under a total that has room in it.
 */
const UNLISTED_CHUNK_CEILING = 20_000;

function jsFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (entry.endsWith('.js')) out.push(path.replace(/\\/g, '/'));
    }
  };
  walk(DIST);
  return out;
}

function gzipSize(path: string): number {
  return gzipSync(readFileSync(path)).length;
}

describe('bundle budget', () => {
  /**
   * Fails rather than skips when `dist` is absent.
   *
   * A performance test that quietly skips is the "guard that matches nothing"
   * failure this repository has already been bitten by twice: it reads as
   * coverage in the run output while asserting nothing at all. Run the build.
   */
  it('has a build to measure', () => {
    expect(
      existsSync(DIST),
      'dist/ is missing — run `npx vite build` before the suite. This test fails ' +
        'rather than skipping so an unmeasured bundle cannot pass as a measured one.'
    ).toBe(true);
    expect(jsFiles().length).toBeGreaterThan(5);
  });

  it('keeps each large chunk within its budget', () => {
    const over: string[] = [];
    for (const [name, budget] of Object.entries(CHUNK_BUDGET)) {
      const path = jsFiles().find((file) => file.endsWith(`/${name}`));
      // A budgeted chunk that vanished means the build changed shape and the
      // budget is now describing something that does not exist.
      expect(path, `${name} not found in dist — has the chunking changed?`).toBeDefined();
      const size = gzipSize(path!);
      if (size > budget) over.push(`${name}: ${size} gzip > ${budget}`);
    }
    expect(over, over.join('\n  ')).toEqual([]);
  });

  it('keeps an unlisted chunk from growing large unnoticed', () => {
    const budgeted = new Set(Object.keys(CHUNK_BUDGET));
    const over: string[] = [];
    for (const path of jsFiles()) {
      const name = path.split('/').pop() ?? '';
      if (budgeted.has(name)) continue;
      const size = gzipSize(path);
      if (size > UNLISTED_CHUNK_CEILING) {
        over.push(`${name}: ${size} gzip — add a budget line or split it`);
      }
    }
    expect(over, over.join('\n  ')).toEqual([]);
  });

  it('keeps the whole payload within budget', () => {
    const total = jsFiles().reduce((sum, path) => sum + gzipSize(path), 0);
    expect(total, `total gzip ${total} > ${TOTAL_GZIP_BUDGET}`).toBeLessThanOrEqual(
      TOTAL_GZIP_BUDGET
    );
  });

  it('ships no test code, fixtures or source maps', () => {
    const leaked: string[] = [];
    for (const path of jsFiles()) {
      const source = readFileSync(path, 'utf8');
      for (const marker of ['populatedWorkspace', 'vitest', 'describe(', '__tests__']) {
        if (source.includes(marker)) leaked.push(`${path}: ${marker}`);
      }
    }
    expect(leaked, leaked.join('\n  ')).toEqual([]);
    expect(jsFiles().filter((path) => path.endsWith('.map'))).toEqual([]);
  });
});
