/**
 * Semantic tones, and the guard that keeps them in one place.
 *
 * `toneClass` existed inside `MobileWorkspaceHubView.tsx` while three inline
 * ternary ladders in the same file spelled out the identical mapping — one of
 * them twenty lines below the helper. Two other surfaces wrote the same token
 * strings by hand. Changing how `danger` reads meant finding five places, and
 * whoever changed four of them would have been right to think they were done.
 *
 * Consolidating exposed the drift: `bg-successSoft/20` in one place and
 * `bg-successSoft/15` in another, for the same meaning on the same kind of chip.
 * Not a wrong colour — an *almost* right one, which is what colour drift looks
 * like before anyone notices.
 *
 * The last test is the one that matters over time. Extracting a primitive fixes
 * today; a guard is what stops the ladders growing back.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  SURFACE_TONES,
  toneClass,
  toneInteractiveClass,
  toneSubtleClass
} from '../../src/shared/ui/tone';

function tsxFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) out.push(...tsxFiles(path));
    else if (entry.endsWith('.tsx')) out.push(path.replace(/\\/g, '/'));
  }
  return out;
}

describe('surface tones', () => {
  it('answers for every tone, including one it does not know', () => {
    for (const tone of SURFACE_TONES) {
      const cls = toneClass(tone);
      expect(cls, tone).toMatch(/border-/);
      expect(cls, tone).toMatch(/bg-/);
      expect(cls, tone).toMatch(/text-/);
    }
    // An unstyled chip in a status row reads as a bug to the user, so an unknown
    // tone falls to neutral rather than rendering bare.
    expect(toneClass('not-a-tone')).toBe(toneClass('neutral'));
    expect(toneClass(undefined)).toBe(toneClass('neutral'));
  });

  it('gives each tone exactly one definition', () => {
    const classes = SURFACE_TONES.map((tone) => toneClass(tone));
    // Two tones resolving to the same classes would make them indistinguishable
    // to a user reading status at a glance.
    expect(new Set(classes).size).toBe(SURFACE_TONES.length);
  });

  it('adds a hover state for interactive surfaces without changing the meaning', () => {
    for (const tone of SURFACE_TONES) {
      const base = toneClass(tone);
      const interactive = toneInteractiveClass(tone);
      // The affordance changes; the hue does not.
      expect(interactive.startsWith(base), tone).toBe(true);
      expect(interactive.includes('hover:'), tone).toBe(true);
    }
  });

  it('offers a subtle weight for full-width status rather than one size for everything', () => {
    for (const tone of SURFACE_TONES) {
      const subtle = toneSubtleClass(tone);
      expect(subtle, tone).toMatch(/border-/);
      expect(subtle, tone).toMatch(/text-/);
      // Same meaning, quieter. A full-width tinted paragraph at chip strength
      // reads as an alert.
      expect(subtle, tone).not.toBe(toneClass(tone));
    }
  });

  /**
   * The guard that keeps the ladders from growing back.
   *
   * It caught four files a targeted grep had missed, because it matches the
   * *shape* of the duplication rather than one literal string. `KNOWN_VARIANTS`
   * is the honest part: those two surfaces still write their own tone strings
   * and are recorded rather than silently restyled — changing how a screen looks
   * without being able to render it is how a "cleanup" ships a regression. The
   * list should only ever shrink.
   */
  const KNOWN_VARIANTS = [
    'src/pages/mobile/MobileIntegrationsView.tsx',
    'src/shared/ui/brandopsPolish.tsx'
  ];

  it('keeps the known-variant list from growing', () => {
    // A cleanup that adds to this list is not a cleanup.
    expect(KNOWN_VARIANTS.length).toBeLessThanOrEqual(2);
  });

  it('is the only place the canonical tone mapping is written', () => {
    const ladders: string[] = [];
    for (const file of [...tsxFiles('src/pages'), ...tsxFiles('src/shared')]) {
      if (KNOWN_VARIANTS.includes(file)) continue;
      const source = readFileSync(file, 'utf8');
      // The shape of the duplication: a ternary chain testing a tone value
      // against the literal token strings this module owns.
      const matches = source.match(
        /tone === '(success|warning|danger|info|primary)'\s*\?\s*'border-/g
      );
      if (matches) ladders.push(`${file} (${matches.length})`);
    }
    expect(
      ladders,
      `Inline tone ladders re-implementing shared/ui/tone.ts:\n  ${ladders.join('\n  ')}`
    ).toEqual([]);
  });
});
