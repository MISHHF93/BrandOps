/**
 * Every environment variable the code reads is documented and typed.
 *
 * `VITE_REVENUECAT_IOS_KEY` and `VITE_REVENUECAT_ANDROID_KEY` were added,
 * read at runtime, and appeared in neither `.env.example` nor `vite-env.d.ts`.
 * The consequence is specific rather than cosmetic: purchasing silently reports
 * `not-configured` and nobody — including the person who built it — can find
 * out which variable to set. A monetized app whose keys are undiscoverable does
 * not monetize.
 *
 * Two requirements, because they fail differently:
 *
 * - **`.env.example`** is where a human looks. Missing here means the feature is
 *   effectively unconfigurable.
 * - **`vite-env.d.ts`** is where the compiler looks. Missing here means
 *   `import.meta.env.VITE_TYPO` is `any` and a misspelling compiles cleanly.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, sep } from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (['.ts', '.tsx'].includes(extname(name))) out.push(p.split(sep).join('/'));
  }
  return out;
}

/**
 * Every `VITE_*` name mentioned in source, excluding the type declaration.
 *
 * Matches the bare identifier rather than `import.meta.env.VITE_*`. The first
 * version did the latter and found nothing for the two keys that motivated this
 * file: `configuredApiKey(env, platform)` takes the environment as a parameter
 * and reads `env.VITE_REVENUECAT_ANDROID_KEY`, which the narrower pattern never
 * saw. The guard passed while the exact defect it was written for was present —
 * caught by mutation, not by review.
 *
 * Over-matching is the safe direction here: a `VITE_` name in a comment gets
 * documented, which costs a line.
 */
function readVars(): string[] {
  const names = new Set<string>();
  for (const file of walk('src')) {
    if (file.endsWith('vite-env.d.ts')) continue;
    for (const m of readFileSync(file, 'utf8').matchAll(/\bVITE_[A-Z0-9_]+/g)) {
      names.add(m[0]);
    }
  }
  return [...names].sort();
}

const example = readFileSync('.env.example', 'utf8');
const declaration = readFileSync('src/vite-env.d.ts', 'utf8');

describe('environment variables', () => {
  it('finds the ones the code reads', () => {
    // Guards against a regex that silently matches nothing and passes.
    expect(readVars().length).toBeGreaterThan(3);
  });

  it('are all present in .env.example', () => {
    const missing = readVars().filter((name) => !example.includes(name));

    expect(
      missing,
      `read at runtime but absent from .env.example, so nobody can find them:\n${missing.join('\n')}`
    ).toEqual([]);
  });

  it('are all declared in vite-env.d.ts', () => {
    /**
     * Without a declaration `import.meta.env.VITE_ANYTHING` is `any`, so a
     * typo compiles and reads `undefined` forever — which for a key means the
     * feature reports "not configured" while the variable is set correctly.
     */
    const missing = readVars().filter((name) => !declaration.includes(name));

    expect(missing, `read but not declared:\n${missing.join('\n')}`).toEqual([]);
  });

  it('never puts a real secret in the example file', () => {
    /**
     * `.env.example` is committed. RevenueCat public keys are safe by design,
     * but a live-looking value invites someone to treat the file as a place
     * where real credentials go.
     */
    const uncommented = example
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith('#'));

    for (const line of uncommented) {
      const value = line.split('=').slice(1).join('=').trim();
      if (!value) continue;
      expect(
        /^(x{4,}|.*xxxx.*|https:\/\/your-|<.*>)/i.test(value),
        `.env.example line looks like a real value: ${line}`
      ).toBe(true);
    }
  });
});
