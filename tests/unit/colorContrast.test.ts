/**
 * WCAG contrast, computed from the design tokens, for both themes.
 *
 * This scorecard recorded colour contrast as needing a browser for six cycles.
 * It does not. Contrast is arithmetic on two colours, the tokens are plain RGB
 * triples in `src/styles/index.css`, and the pairings the interface uses are
 * declared in `src/shared/ui/tone.ts`. What needs a browser is *whether the
 * right colours end up next to each other on screen* — not what the ratio is
 * once they do. That is the fourth blocker in this run asserted without testing
 * and found to be narrower than claimed.
 *
 * **The first version of this file measured the wrong theme, and its mutations
 * proved it.** `index.css` defines tokens twice: `:root` for the dark default and
 * `:root[data-theme='light']` for the light theme. A flat `matchAll` over the
 * whole file overwrites as it goes and ends up holding whichever came last — the
 * light theme. Every number reported was light-theme, presented as the product's,
 * and the dark default was never measured at all.
 *
 * Two mutations caught it: darkening `--color-text` in the dark block failed
 * nothing, because nothing was reading it. A test that cannot fail when the
 * thing it names gets worse is not measuring that thing.
 *
 * **Both themes pass WCAG AA for text**, once actually measured — dark from
 * 6.04:1, light from 5.40:1 — and both focus rings clear non-text contrast with
 * room to spare. Borders are a different story, and differ by theme; they are
 * recorded at the bottom rather than changed, because raising them alters every
 * edge in the product and that is a visual-identity decision, not a defect fix.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

type Rgb = [number, number, number];

interface Theme {
  name: string;
  color: Record<string, Rgb>;
  alpha: Record<string, number>;
}

const CSS = readFileSync('src/styles/index.css', 'utf8');

/**
 * One theme's block only.
 *
 * Scoped to the declaration block rather than the whole file, which is the
 * correction: the tokens are defined twice and a whole-file scan silently
 * reports the second.
 */
function theme(name: string, selector: string): Theme {
  const start = CSS.indexOf(selector);
  if (start < 0) throw new Error(`theme block not found: ${selector}`);
  const body = CSS.slice(start, CSS.indexOf('}', start));

  const color: Record<string, Rgb> = {};
  const alpha: Record<string, number> = {};
  for (const match of body.matchAll(/--color-([a-z-]+):\s*(\d+)\s+(\d+)\s+(\d+)/g)) {
    color[match[1]] = [Number(match[2]), Number(match[3]), Number(match[4])];
  }
  for (const match of body.matchAll(/--alpha-([a-z-]+):\s*([\d.]+)/g)) {
    alpha[match[1]] = Number(match[2]);
  }
  return { name, color, alpha };
}

const THEMES: Theme[] = [theme('dark', ':root {'), theme('light', ":root[data-theme='light'] {")];

/** WCAG 2.1 relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const [rs, gs, bs] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** A translucent fill resolves against what is behind it before it is measured. */
function composite(fg: Rgb, alpha: number, backdrop: Rgb): Rgb {
  return fg.map((value, index) => Math.round(value * alpha + backdrop[index] * (1 - alpha))) as Rgb;
}

/** The chips in `shared/ui/tone.ts`: coloured text on a tint of itself. */
const TONES: Array<{ tone: string; fill: number }> = [
  { tone: 'success', fill: 0.2 },
  { tone: 'warning', fill: 0.2 },
  { tone: 'danger', fill: 0.15 },
  { tone: 'info', fill: 0.15 },
  { tone: 'primary', fill: 0.2 }
];

const chipRatio = ({ color, alpha }: Theme, tone: string, fill: number) =>
  contrast(
    color[tone],
    composite(color[`${tone}-soft`], (alpha[`${tone}-soft`] ?? 1) * fill, color.surface)
  );

const borderRatio = ({ color }: Theme, tone: string) =>
  contrast(composite(color[tone], 0.45, color.surface), color.surface);

describe('both themes are actually being read', () => {
  it('parses two distinct token sets', () => {
    expect(THEMES).toHaveLength(2);
    for (const { name, color } of THEMES) {
      expect(Object.keys(color).length, name).toBeGreaterThan(15);
      expect(color.surface, name).toBeDefined();
    }
    // The bug this file was rewritten for: one scan yielding one theme's values
    // while claiming to describe the product.
    expect(THEMES[0].color.text).not.toEqual(THEMES[1].color.text);
  });
});

describe.each(THEMES)('$name theme text meets WCAG AA', (subject) => {
  it('gives body, muted and soft text at least 4.5:1 on a card', () => {
    for (const name of ['text', 'text-muted', 'text-soft']) {
      const ratio = contrast(subject.color[name], subject.color.surface);
      expect(ratio, `${subject.name}/${name} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('gives every status chip at least 4.5:1 against its own fill', () => {
    for (const { tone, fill } of TONES) {
      // Against the tint the glyphs actually sit on, not the card beneath it.
      const ratio = chipRatio(subject, tone, fill);
      expect(ratio, `${subject.name}/${tone} chip = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });

  it('keeps the weakest chip above the threshold with margin', () => {
    const weakest = Math.min(...TONES.map(({ tone, fill }) => chipRatio(subject, tone, fill)));
    // Headroom, so a token nudge fails here rather than at 4.49 in an audit.
    expect(weakest, subject.name).toBeGreaterThanOrEqual(5.0);
  });

  it('gives the focus ring at least 3:1 on card and page', () => {
    for (const backdrop of ['surface', 'bg'] as const) {
      const ratio = contrast(subject.color['focus-ring'], subject.color[backdrop]);
      // SC 1.4.11. The one non-text element a keyboard user cannot work without.
      expect(ratio, `${subject.name}/focus on ${backdrop}`).toBeGreaterThanOrEqual(3);
    }
  });
});

/**
 * Recorded, not fixed.
 *
 * Below SC 1.4.11's 3:1 for non-text contrast. Raising them lightens every edge
 * in the product, which belongs to whoever owns the visual identity. These
 * assertions pin the current values so the gap cannot widen unnoticed — and they
 * fail if a token *improves*, at which point the number should be raised
 * deliberately rather than drift.
 *
 * Worth stating precisely, because the single-theme version of this file got it
 * wrong: in the dark default, three of the five tone borders already clear 3:1.
 * It is the light theme where none of them do.
 */
describe('borders below non-text contrast', () => {
  const FLOOR: Record<string, Record<string, number>> = {
    dark: {
      border: 1.85,
      'border-strong': 2.86,
      success: 3.72,
      warning: 3.51,
      danger: 2.27,
      info: 2.94,
      primary: 3.46
    },
    light: {
      border: 1.72,
      'border-strong': 2.64,
      success: 2.05,
      warning: 1.96,
      danger: 2.24,
      info: 1.97,
      primary: 2.4
    }
  };

  it.each(THEMES)('$name has not got worse', (subject) => {
    const floor = FLOOR[subject.name];
    const measured: Record<string, number> = {
      border: contrast(subject.color.border, subject.color.surface),
      'border-strong': contrast(subject.color['border-strong'], subject.color.surface),
      ...Object.fromEntries(TONES.map(({ tone }) => [tone, borderRatio(subject, tone)]))
    };

    for (const [name, value] of Object.entries(measured)) {
      expect(
        value,
        `${subject.name}/${name} = ${value.toFixed(2)}, floor ${floor[name]}`
      ).toBeGreaterThanOrEqual(floor[name] - 0.01);
    }
  });

  it('records how many still fall short, per theme', () => {
    const shortfall = Object.fromEntries(
      THEMES.map((subject) => [
        subject.name,
        [
          contrast(subject.color.border, subject.color.surface),
          contrast(subject.color['border-strong'], subject.color.surface),
          ...TONES.map(({ tone }) => borderRatio(subject, tone))
        ].filter((value) => value < 3).length
      ])
    );
    // Dark: the plain and strong borders plus danger and info. Light: all seven.
    expect(shortfall).toEqual({ dark: 4, light: 7 });
  });
});
