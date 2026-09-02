/**
 * The feature-registry query API, exercised before it has a caller.
 *
 * Nine of these functions are unwired: `updateFeatureRegistry`,
 * `getFeatureById`, `getFeaturesByMaturity`, `getWiredFeatures`,
 * `getUnwiredFeatures`, `getBackendOnlyFeatures`, `getDeadUiFeatures`,
 * `detectDuplicates`, and the storage key they share. A previous cycle deleted
 * them on exactly that evidence, and deleting was the wrong default — an
 * unlinked function is work that has not been connected yet, not work nobody
 * wanted.
 *
 * **Unwired code that nothing exercises is the actual hazard.** It rots in
 * silence and then fails on the day somebody finally calls it, which is the
 * worst possible moment to discover that a filter had its condition inverted.
 * So these tests do what wiring would eventually do, and prove the answers are
 * right now rather than later.
 *
 * `updateFeatureRegistry` is the one that unlocks the others. Nothing writes
 * `workspace.featureRegistry`, so every read falls through to the built-in
 * catalogue — the queries below are only interesting once a workspace holds a
 * registry of its own, and this file is the first thing that gives one.
 */
import { describe, expect, it } from 'vitest';
import {
  FEATURE_REGISTRY_KEY,
  DEFAULT_FEATURE_REGISTRY,
  getFeatureRegistryState,
  updateFeatureRegistry,
  getFeatureById,
  getFeaturesByMaturity,
  getWiredFeatures,
  getUnwiredFeatures,
  getBackendOnlyFeatures,
  getDeadUiFeatures,
  detectDuplicates
} from '../../src/services/builder/featureRegistry';
import { withDefaults } from '../../src/services/storage/storage';
import type { BrandOpsData } from '../../src/types/domain';
import type { FeatureRegistryEntry } from '../../src/types/builder';

const entry = (over: Partial<FeatureRegistryEntry> & { id: string }): FeatureRegistryEntry => ({
  name: over.id,
  description: `Fixture for ${over.id}.`,
  owningModule: 'interop',
  owningService: 'somewhere.ts',
  uiExposure: 'plan',
  backendImplementation: true,
  wired: true,
  requiredPermissions: [],
  integrationDependencies: [],
  maturity: 'STABLE',
  ...over
});

/** A workspace carrying its own registry, which only `updateFeatureRegistry` can make. */
function withRegistry(entries: FeatureRegistryEntry[]): BrandOpsData {
  return updateFeatureRegistry(withDefaults({} as never), entries, '2026-01-01T00:00:00.000Z');
}

describe('writing a registry into a workspace', () => {
  it('is what makes a stored registry readable at all', () => {
    const workspace = withRegistry([entry({ id: 'a' })]);
    const state = getFeatureRegistryState(workspace);

    // Without this write, every read falls through to the built-in catalogue —
    // which is why the queries below have never had real data to answer about.
    expect(state.entries.map((e) => e.id)).toEqual(['a']);
    expect(state.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('does not mutate the workspace it was handed', () => {
    const before = withDefaults({} as never);
    const snapshot = JSON.stringify(before);
    updateFeatureRegistry(before, [entry({ id: 'a' })]);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('stamps now when no time is given', () => {
    const workspace = updateFeatureRegistry(withDefaults({} as never), [entry({ id: 'a' })]);
    // Here a clock read is correct: something really did just change.
    expect(workspace.featureRegistry?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('names the field it writes', () => {
    expect(FEATURE_REGISTRY_KEY).toBe('featureRegistry');
    const workspace = withRegistry([entry({ id: 'a' })]);
    expect(Object.keys(workspace)).toContain(FEATURE_REGISTRY_KEY);
  });
});

describe('asking the registry questions', () => {
  const registry = getFeatureRegistryState(
    withRegistry([
      entry({ id: 'wired-ui', wired: true, uiExposure: 'plan', backendImplementation: true }),
      entry({ id: 'unwired', wired: false, uiExposure: 'plan', backendImplementation: true }),
      entry({ id: 'backend-only', wired: true, uiExposure: 'none', backendImplementation: true }),
      entry({
        id: 'backend-hidden',
        wired: true,
        uiExposure: 'hidden',
        backendImplementation: true
      }),
      /**
       * `wired: false` is what makes this dead UI — a surface the reader can
       * reach that is not connected end to end. The first version of this
       * fixture said `wired: true, backendImplementation: false`, which is not a
       * state that can exist, and the test failed for that reason rather than
       * finding anything.
       */
      entry({ id: 'dead-ui', wired: false, uiExposure: 'plan', backendImplementation: false }),
      entry({ id: 'beta-thing', maturity: 'BETA' })
    ])
  );

  it('finds one by id, and says so when there is none', () => {
    expect(getFeatureById(registry, 'unwired')?.id).toBe('unwired');
    expect(getFeatureById(registry, 'no-such-feature')).toBeNull();
  });

  it('filters by maturity', () => {
    expect(getFeaturesByMaturity(registry, 'BETA').map((e) => e.id)).toEqual(['beta-thing']);
  });

  it('separates wired from unwired', () => {
    const wired = getWiredFeatures(registry).map((e) => e.id);
    const unwired = getUnwiredFeatures(registry).map((e) => e.id);

    // Complementary by construction. An inverted condition in either filter
    // would still return plausible-looking lists on its own.
    expect(unwired.sort()).toEqual(['dead-ui', 'unwired']);
    expect(wired).not.toContain('unwired');
    expect(wired.length + unwired.length).toBe(registry.entries.length);
  });

  it('finds what exists only in the backend', () => {
    const ids = getBackendOnlyFeatures(registry).map((e) => e.id);
    // Both spellings of "no user surface". `none` was missed until this test
    // asked for it.
    expect(ids).toContain('backend-only');
    expect(ids).toContain('backend-hidden');
    expect(ids).not.toContain('wired-ui');
  });

  it('finds surfaces with nothing behind them', () => {
    // The opposite failure, and the more embarrassing one: a control the user
    // can press with no implementation under it.
    expect(getDeadUiFeatures(registry).map((e) => e.id)).toContain('dead-ui');
    expect(getDeadUiFeatures(registry).map((e) => e.id)).not.toContain('wired-ui');
  });

  it('finds two features that are the same feature', () => {
    const duplicated = getFeatureRegistryState(
      withRegistry([
        entry({ id: 'first', name: 'Context Bundles', owningModule: 'interop' }),
        entry({ id: 'second', name: 'context bundles', owningModule: 'interop' }),
        entry({ id: 'other', name: 'Context Bundles', owningModule: 'builder' })
      ])
    );

    // Matched on module plus case-folded name, so the same name in a different
    // module is not a duplicate — which is the distinction that makes the
    // answer useful rather than noisy.
    expect(
      detectDuplicates(duplicated)
        .map((e) => e.id)
        .sort()
    ).toEqual(['first', 'second']);
  });

  it('reports no duplicates in the catalogue this build ships', () => {
    const shipped = { entries: DEFAULT_FEATURE_REGISTRY, updatedAt: 'built-in' };
    expect(
      detectDuplicates(shipped).map((e) => `${e.owningModule}:${e.name}`),
      'the shipped catalogue lists the same feature twice'
    ).toEqual([]);
  });
});
