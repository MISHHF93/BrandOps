/**
 * A document may not claim a module is absent while the module exists.
 *
 * `BRANDOPS_GOLDEN_WORKFLOWS.md` was written to remove phantom citations — the
 * previous version cited an `authorityIntelligence.ts` that had never existed.
 * It then drifted in the opposite direction and stayed there for weeks: Workflow
 * H read **"ABSENT. Not implemented."** after `authorityGraph.ts` had been added,
 * wired into the agent gateway and covered by a test. Workflow B's gap column
 * still said *"no memoryFirewall/activityGraph as cited"* with both modules
 * present and wired.
 *
 * Both directions are the same failure. A document that overclaims sends someone
 * to a feature that is not there; a document that underclaims hides one that is,
 * and this scorecard has been making planning decisions from those rows.
 *
 * This is the cheap half of keeping them honest — the half a machine can do.
 * Whether a wired module is *good* is a judgement; whether a file exists is not,
 * and asserting the second stops the first from being argued about a phantom.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DOCS = readdirSync('.').filter((entry) => /^BRANDOPS_.*\.md$/.test(entry));

/** Every source path referenced in backticks anywhere in the docs. */
function citedPaths(markdown: string): string[] {
  return Array.from(markdown.matchAll(/`(src\/[A-Za-z0-9_\-/.]+\.tsx?)`/g)).map(
    (match) => match[1]
  );
}

function sourceFiles(): Set<string> {
  const out = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else out.add(path.replace(/\\/g, '/'));
    }
  };
  walk('src');
  return out;
}

/**
 * Phrases that assert something does not exist. Matched near a module name, so
 * "no live connector" — which is about the world, not the codebase — does not
 * trip it.
 */
const ABSENCE_CLAIM =
  /(does NOT exist|never existed|module never existed|\bABSENT\b|not implemented)/i;

describe('documents cite files that exist', () => {
  it('finds documents to check', () => {
    // A sweep that matched nothing would read as coverage while asserting
    // nothing — the failure mode this repository has hit three times.
    expect(DOCS.length).toBeGreaterThan(5);
  });

  /**
   * Citations that name something not in `src`, on purpose.
   *
   * The first version of this guard flagged all five it found, and acting on it
   * would have meant "fixing" a design document by deleting its proposals. Two
   * were genuinely wrong paths for modules that exist — `builder/` for files
   * living in `plan/` — and that document's own SOURCE-NOTE already said so
   * while its body kept using the old path; those are corrected. The three
   * below are not errors, and each records why.
   *
   * The list may shrink. It growing means someone cited a file that does not
   * exist and labelled it an exception instead of fixing it.
   */
  const DELIBERATE: Record<string, string> = {
    'src/services/builder/weeklyProfessionalReview.ts':
      'evaluated as a proposal; the document states plainly it was never built',
    'src/services/timeline/proofOfWorkTimeline.ts':
      'appears under "Create ..." — a proposed path, not a claim that it exists',
    'src/services/storage/normalizers/ai.ts':
      'historical record of issues fixed in a past audit, not a current claim'
  };

  /**
   * A line that names a wrong path *in order to correct it* is the opposite of
   * a phantom citation — it is the repair. `BRANDOPS_NEXT_CAPABILITIES.md` opens
   * with exactly that: "`…/builder/opportunityEngine.ts` actually lives at
   * `…/plan/opportunityEngine.ts`". Flagging it would push someone to delete the
   * correction to satisfy the guard.
   */
  const CORRECTION_LINE = /actually lives at|does not exist|never built|corrected|phantom/i;

  it('references no phantom source file', () => {
    const files = sourceFiles();
    const phantom: string[] = [];

    for (const doc of DOCS) {
      for (const line of readFileSync(doc, 'utf8').split('\n')) {
        /**
         * Tested against the prose with the citations stripped out.
         *
         * Checking the whole line let a *path* satisfy the exemption: a mutation
         * citing `phantomModule.ts` was skipped because the filename matched the
         * word "phantom" in this pattern. A guard a filename can switch off is
         * not a guard.
         */
        if (CORRECTION_LINE.test(line.replace(/`[^`]*`/g, ''))) continue;
        for (const cited of new Set(citedPaths(line))) {
          if (files.has(cited) || cited in DELIBERATE) continue;
          // The original sin this document was written to correct.
          phantom.push(`${doc}: ${cited}`);
        }
      }
    }

    expect(phantom, `cited but absent:\n  ${phantom.join('\n  ')}`).toEqual([]);
  });

  it('gives every deliberate exception a reason, and keeps the list short', () => {
    for (const [path, reason] of Object.entries(DELIBERATE)) {
      expect(reason.length, path).toBeGreaterThan(20);
    }
    // A guard worked around is not a guard satisfied.
    expect(Object.keys(DELIBERATE).length).toBeLessThanOrEqual(3);
  });
});

describe('documents do not deny what is present', () => {
  /**
   * Modules a document has previously described as missing. Each is checked
   * against the filesystem, and the claim must have been corrected.
   */
  const PREVIOUSLY_DENIED = [
    'src/services/builder/authorityGraph.ts',
    'src/services/interop/memoryScreen.ts',
    'src/services/builder/activityGraph.ts'
  ];

  it('the modules in question do exist', () => {
    for (const path of PREVIOUSLY_DENIED) {
      expect(existsSync(path), path).toBe(true);
    }
  });

  it('no document still calls them absent', () => {
    const stale: string[] = [];

    for (const doc of DOCS) {
      const lines = readFileSync(doc, 'utf8').split('\n');
      lines.forEach((line, index) => {
        /**
         * Quoted text is a quotation, not an assertion.
         *
         * This guard caught the scorecard entry that introduced it — a line
         * reporting what a document *used to* say: `said Workflow H was
         * "ABSENT. Not implemented."`. Recording a corrected claim is how the
         * correction stays legible, and a rule that forbids quoting the old
         * wording forces the history to be deleted to satisfy it.
         */
        const asserted = line.replace(/"[^"]*"/g, '').replace(/`[^`]*`/g, '');
        if (!ABSENCE_CLAIM.test(asserted)) return;
        for (const path of PREVIOUSLY_DENIED) {
          const name = path
            .split('/')
            .pop()!
            .replace(/\.tsx?$/, '');
          // Same line, so a historical note that *explains* the correction
          // elsewhere in the paragraph does not trip this.
          if (asserted.includes(name) && !/never existed|phantom|corrected/i.test(asserted)) {
            stale.push(`${doc}:${index + 1} — ${line.trim().slice(0, 100)}`);
          }
        }
      });
    }

    expect(stale, `denies a module that exists:\n  ${stale.join('\n  ')}`).toEqual([]);
  });
});
