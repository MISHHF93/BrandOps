/**
 * The built-in feature catalogue must not claim to be freshly computed.
 *
 * `getFeatureRegistryState` returns `workspace.featureRegistry` when it has
 * entries, and otherwise falls back to a hardcoded list. **Nothing writes
 * `workspace.featureRegistry`** — the only function that could,
 * `updateFeatureRegistry`, was itself unreferenced and has been removed — so the
 * fallback ran on every call.
 *
 * And the fallback stamped `updatedAt: new Date().toISOString()`. A constant
 * that has never changed, reported as though it had just been recomputed, on
 * every single call.
 *
 * The entries are identical either way, so the timestamp is the only thing that
 * could tell a caller which branch they got — and it was the one field actively
 * erasing the distinction. It now carries the constant's own identity.
 */
import { describe, expect, it } from 'vitest';
import { getFeatureRegistryState } from '../../src/services/builder/featureRegistry';
import { withDefaults } from '../../src/services/storage/storage';
import type { BrandOpsData } from '../../src/types/domain';

const emptyWorkspace = (): BrandOpsData => withDefaults({} as never);

describe('the shipped feature catalogue', () => {
  it('is what a workspace with no registry gets', () => {
    const state = getFeatureRegistryState(emptyWorkspace());
    expect(state.entries.length, 'no catalogue at all').toBeGreaterThan(0);
  });

  it('does not date itself to now', () => {
    const state = getFeatureRegistryState(emptyWorkspace());
    // Was `new Date().toISOString()` on a hardcoded list.
    expect(state.updatedAt).not.toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(state.updatedAt).toBe('built-in');
  });

  it('reports the same timestamp however often it is asked', () => {
    const workspace = emptyWorkspace();
    const first = getFeatureRegistryState(workspace).updatedAt;
    const second = getFeatureRegistryState(workspace).updatedAt;
    // The counter-case for the whole fix: a clock read here would differ across
    // two calls, which is precisely how it lied.
    expect(second).toBe(first);
  });

  it('still prefers a registry the workspace actually holds', () => {
    /**
     * Typed at the point of construction rather than cast at the end.
     *
     * A trailing `as BrandOpsData` on an object literal is what the test-type
     * ratchet exists to discourage: the compiler cannot check the shape, so a
     * fixture drifts from the type it claims and nothing says so. Naming the
     * field's own type here means a change to `FeatureRegistryEntry` fails this
     * file instead of quietly making the fixture wrong.
     */
    const stored: NonNullable<BrandOpsData['featureRegistry']> = {
      entries: [
        {
          id: 'stored-feature',
          name: 'Stored',
          description: 'A registry entry the workspace really has.',
          owningModule: 'interop',
          owningService: 'somewhere.ts',
          uiExposure: 'plan',
          backendImplementation: true,
          // Required, and absent until the fixture was typed — the cast this
          // test replaced was hiding it.
          wired: true,
          requiredPermissions: [],
          integrationDependencies: [],
          maturity: 'STABLE'
        }
      ],
      updatedAt: '2026-01-01T00:00:00.000Z'
    };
    const workspace: BrandOpsData = { ...emptyWorkspace(), featureRegistry: stored };

    // The counter-case for the fallback: pinning the timestamp must not make the
    // function ignore real stored state.
    const state = getFeatureRegistryState(workspace);
    expect(state.entries.map((entry) => entry.id)).toEqual(['stored-feature']);
    expect(state.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
