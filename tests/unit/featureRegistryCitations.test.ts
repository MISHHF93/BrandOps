/**
 * The feature registry may not cite a file that does not exist.
 *
 * This repository has already been burned by exactly this. The README
 * carries a standing correction note: a prior revision marked Agent Handoffs,
 * Universal Command Layer, Authority Intelligence and others as VERIFIED_WORKING
 * *"by citing test files that do not exist in this repository"*. Those claims
 * were removed from the document — and the same class of claim was left sitting
 * in `DEFAULT_FEATURE_REGISTRY`, unchecked.
 *
 * It matters more here than in a document, because the registry is **served to
 * external agents**: `builder.features.list` reads it through
 * `getFeatureRegistryState`. An agent asking BrandOps what it can do and how it
 * is verified was being handed citations to files that were never written. The
 * standing directive names fabricated evidence as a release-blocking gate, and a
 * fabricated citation is the cheapest possible kind to produce and the hardest
 * to notice.
 *
 * What was found when this check was first run over 33 entries:
 *
 * ```
 *   9 owningService values naming a file that does not exist
 *   6 tests[] entries naming a test file that does not exist
 *   3 entries claiming wired: true with no implementing service at all
 * ```
 *
 * Two rules, both mechanical:
 *
 * 1. Every file named in `owningService` or `tests` must exist on disk.
 * 2. A feature cannot claim a backend implementation, or claim to be wired,
 *    while the service implementing it is absent.
 *
 * `tests: []` is accepted and means "no test is claimed". That is deliberately
 * weaker than the truth for some entries, and it is the right direction to be
 * wrong in: an absent claim misleads nobody, a false citation misleads everyone.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, extname, sep } from 'node:path';
import { DEFAULT_FEATURE_REGISTRY } from '../../src/services/builder/featureRegistry';

/** Every source and test file, as forward-slash paths. */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', 'android', 'coverage'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (['.ts', '.tsx'].includes(extname(name))) out.push(p.split(sep).join('/'));
  }
  return out;
}

const files = [...walk('src'), ...walk('tests')];
const exists = (name: string) => files.some((f) => f.endsWith(`/${name}`));

/**
 * File names inside an `owningService` value.
 *
 * The field is free text and some entries carry prose — `"ConnectedAgentsPanel.tsx
 * (UI) + sessions.ts (backend)"` names two real files and one non-file. Pulling
 * out the filenames checks the claims that can be checked rather than rejecting
 * the formatting.
 */
function citedFiles(value: string): string[] {
  return [...value.matchAll(/[A-Za-z0-9_/-]+\.tsx?/g)].map((m) => m[0]);
}

describe('every file the registry names', () => {
  it('has entries to check', () => {
    // Guards against a regex or import that silently yields nothing.
    expect(DEFAULT_FEATURE_REGISTRY.length).toBeGreaterThan(20);
  });

  it('exists, for owningService', () => {
    const missing: string[] = [];
    for (const entry of DEFAULT_FEATURE_REGISTRY) {
      for (const file of citedFiles(entry.owningService ?? '')) {
        if (!exists(file)) missing.push(`${entry.id} -> ${file}`);
      }
    }

    expect(missing, `owningService names files that do not exist:\n${missing.join('\n')}`).toEqual(
      []
    );
  });

  it('exists, for every test cited', () => {
    const missing: string[] = [];
    for (const entry of DEFAULT_FEATURE_REGISTRY) {
      for (const test of entry.tests ?? []) {
        if (!exists(test)) missing.push(`${entry.id} -> ${test}`);
      }
    }

    expect(missing, `tests[] names files that do not exist:\n${missing.join('\n')}`).toEqual([]);
  });
});

describe('what the registry claims about itself', () => {
  it('does not call a feature wired when nothing implements it', () => {
    /**
     * The compound case, and the worst of the three. Three entries claimed
     * `wired: true` *and* `backendImplementation: true` while naming a service
     * file that was never written — a feature reported to an agent as built and
     * connected, with nothing behind it.
     */
    const lying = DEFAULT_FEATURE_REGISTRY.filter((entry) => {
      const cited = citedFiles(entry.owningService ?? '');
      const anyExists = cited.length > 0 && cited.some((f) => exists(f));
      return (entry.wired || entry.backendImplementation) && !anyExists;
    }).map((entry) => `${entry.id} (wired=${entry.wired}, backend=${entry.backendImplementation})`);

    expect(lying, `claims an implementation that does not exist:\n${lying.join('\n')}`).toEqual([]);
  });

  it('leaves the owning service empty only when the feature admits it is unbuilt', () => {
    /**
     * An empty `owningService` would otherwise pass the existence checks above
     * by naming nothing at all — so it is allowed exactly once: as the honest
     * encoding of "nothing implements this yet".
     *
     * `FeatureMaturity` has no `PLANNED` value, so an unbuilt feature has to say
     * so through the two booleans. Six entries needed it, and their named
     * services were never written: `planDependencyEngine.ts`,
     * `dailyBuilderBrief.ts`, `weeklyProfessionalReview.ts`,
     * `sourceHealthHooks.ts`, and the two `evaluation/` files.
     */
    const claiming = DEFAULT_FEATURE_REGISTRY.filter(
      (entry) =>
        citedFiles(entry.owningService ?? '').length === 0 &&
        (entry.wired || entry.backendImplementation)
    ).map((entry) => entry.id);

    expect(claiming, `no owning service, yet claims to be built:\n${claiming.join('\n')}`).toEqual(
      []
    );
  });
});
