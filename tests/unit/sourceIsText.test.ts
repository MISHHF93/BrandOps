/**
 * No tracked text file contains a control character it did not mean.
 *
 * Five files in this repository have carried a literal NUL or backspace byte,
 * every one of them written by a tool that turned `\0` or `\b` into the
 * character instead of the two-character escape:
 *
 * ```
 *   src/services/interop/approvalBinding.ts   NUL, in a fingerprint delimiter
 *   src/services/interop/validation.ts        NUL, in a comment about NUL
 *   tests/unit/agentInputValidation.test.ts   NUL, in the matching comment
 *   tests/unit/envVarDocumentation.test.ts    backspace, inside a regex
 *   README.md                                  backspace, in the entry describing this trap
 * ```
 *
 * The damage is not cosmetic and it is not the same each time:
 *
 * - **A file becomes binary.** `grep` and `rg` skip binary files *silently*, so
 *   a search for a defect reports clean because the tool declined to look. That
 *   is how `validation.ts` hid.
 * - **A regex stops matching.** `/\bVITE_/` written with a real backspace is
 *   `/\x08VITE_/`, which matches nothing. The env-var guard passed while the
 *   exact defect it was written to catch was present, and only mutation testing
 *   found it.
 * - **The source lies to the reader.** `approvalBinding.ts` read as
 *   `.join('')` — an empty delimiter — while actually joining on NUL. One
 *   careless cleanup away from a fingerprint collision.
 *
 * Tabs, newlines and carriage returns are ordinary text and allowed. Everything
 * else below 0x20 is a mistake.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, sep } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'android', 'coverage', '.vite']);
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.md', '.json', '.css', '.html']);

/** Tab, line feed, carriage return. Everything else under 0x20 is not text. */
const ALLOWED = new Set([9, 10, 13]);

function textFiles(dir = '.', out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let s;
    try {
      s = statSync(p);
    } catch {
      continue;
    }
    if (s.isDirectory()) textFiles(p, out);
    else if (TEXT_EXT.has(extname(name))) out.push(p.split(sep).join('/'));
  }
  return out;
}

describe('tracked text files', () => {
  const files = textFiles();

  it('finds files to check', () => {
    // A scan that silently matches nothing would pass forever.
    expect(files.length).toBeGreaterThan(100);
  });

  it('contain no stray control characters', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const bytes = readFileSync(file);
      for (let i = 0; i < bytes.length; i += 1) {
        const b = bytes[i];
        if (b < 0x20 && !ALLOWED.has(b)) {
          const context = bytes
            .subarray(Math.max(0, i - 30), i)
            .toString('utf8')
            .replace(/\s+/g, ' ');
          offenders.push(`${file}: byte 0x${b.toString(16)} after "…${context}"`);
          break;
        }
      }
    }

    expect(
      offenders,
      `control characters found — a '\\0' or '\\b' was written as the character ` +
        `rather than the escape:\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  it('detects a control character when one is present', () => {
    /**
     * The detector, checked against a known-bad buffer. Without this the test
     * above passes identically whether it is working or scanning nothing —
     * which is the failure the env-var guard actually had.
     */
    const withBackspace = Buffer.from([0x61, 0x08, 0x62]);
    const clean = Buffer.from('a\tb\r\nc', 'utf8');

    const hasControl = (buf: Buffer) => [...buf].some((b) => b < 0x20 && !ALLOWED.has(b));

    expect(hasControl(withBackspace)).toBe(true);
    expect(hasControl(clean)).toBe(false);
  });
});
