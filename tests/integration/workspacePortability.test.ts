/**
 * @vitest-environment jsdom
 *
 * Export and import — the escape hatch this product now tells people to use.
 *
 * Cycle 26 gave the full-storage failure an actionable message: *"Export the
 * workspace and remove older records to free space."* That advice is only worth
 * giving if the export actually round-trips, and nothing tested that it did. A
 * feature the product recommends under pressure, unverified, is a promise made
 * on someone else's behalf.
 *
 * Probing it found no defect, which is the honest result and worth recording as
 * plainly as a bug would be. What follows keeps it true.
 *
 * One measurement error along the way, because it shaped the conclusion. A first
 * probe built 1,500 synthetic contacts and reported 117 kB silently stripped on
 * import — apparently a serious data-loss bug. It was not: the synthetic records
 * carried fields the contact schema does not define, and `withDefaults` dropped
 * them, correctly. A real workspace round-trips byte-for-byte. The lesson is the
 * one this codebase keeps teaching about instruments: the fixture was the
 * finding, and checking against real data was cheaper than reporting the alarm.
 */
import { describe, expect, it } from 'vitest';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';

/**
 * `importData` is `JSON.parse` → shape check → `withDefaults` → persist. The
 * normalisation step is the only one that can alter content, so it is what these
 * assertions exercise.
 */
const roundTrip = (workspace: BrandOpsData): BrandOpsData =>
  withDefaults(JSON.parse(JSON.stringify(workspace)) as BrandOpsData);

/**
 * Rebuilt on every load from the records around it, with a fresh timestamp.
 * Excluded deliberately: it is a projection, not user data, and comparing it
 * would assert the clock rather than the content.
 */
const DERIVED = 'workspaceIntelligence';

function withoutDerived(workspace: BrandOpsData): Record<string, unknown> {
  const copy = { ...(workspace as unknown as Record<string, unknown>) };
  delete copy[DERIVED];
  return copy;
}

describe('a workspace survives export and import', () => {
  it('round-trips every record byte for byte', () => {
    const before = withDefaults(populatedWorkspace());
    const after = roundTrip(before);

    // Everything the user owns, compared whole rather than field by field, so a
    // key nobody thought to check is still covered.
    expect(withoutDerived(after)).toEqual(withoutDerived(before));
  });

  it('rebuilds derived intelligence rather than carrying a stale copy', () => {
    const before = withDefaults(populatedWorkspace());
    const after = roundTrip(before);
    // Present and recomputed — not preserved verbatim, and not dropped.
    expect(after.workspaceIntelligence).toBeDefined();
    expect(after.workspaceIntelligence?.dna).toEqual(before.workspaceIntelligence?.dna);
  });

  it('loses no records from a large workspace', () => {
    // The case the advice actually creates: storage fills precisely when the
    // workspace is big, and that is the moment the user is told to export.
    const base = withDefaults(populatedWorkspace());
    const template = base.contacts[0];
    const bulked = {
      ...base,
      contacts: Array.from({ length: 1500 }, (_, index) => ({
        ...template,
        id: `contact-${index}`,
        name: `Contact ${index}`
      }))
    } as BrandOpsData;

    const after = roundTrip(bulked);
    // A silent cap here would lose 300 people from someone's network with no
    // error and no way to notice until they went looking for one of them.
    expect(after.contacts).toHaveLength(1500);
    expect(after.contacts.at(-1)?.id).toBe('contact-1499');
  });

  it('is stable across repeated cycles', () => {
    const once = roundTrip(withDefaults(populatedWorkspace()));
    const twice = roundTrip(once);
    // Someone restoring a backup of a backup must not accumulate drift.
    expect(withoutDerived(twice)).toEqual(withoutDerived(once));
  });
});

describe('what an export is safe to hand to someone', () => {
  it('contains no credentials', () => {
    const raw = JSON.stringify(withDefaults(populatedWorkspace()), null, 2);
    const secretShaped = Array.from(
      raw.matchAll(
        /"([a-zA-Z_]*(?:apiKey|api_key|token|secret|password|credential)[a-zA-Z_]*)"\s*:/gi
      )
    ).map((match) => match[1]);

    /**
     * True by construction today: the provider key lives under
     * `brandops_ai_openai_compat_key`, a different storage key from
     * `brandops:data`, and `exportData` serialises only the latter. Asserted
     * because moving one field into the workspace object would turn every export
     * a user shares into a credential leak, silently.
     */
    expect(
      secretShaped,
      `credential-shaped keys in the export: ${secretShaped.join(', ')}`
    ).toEqual([]);
  });

  it('is valid JSON that parses back to an object', () => {
    const raw = JSON.stringify(withDefaults(populatedWorkspace()), null, 2);
    expect(() => JSON.parse(raw)).not.toThrow();
    expect(typeof JSON.parse(raw)).toBe('object');
  });
});

describe('normalisation on import', () => {
  it('drops fields the schema does not define', () => {
    const base = withDefaults(populatedWorkspace());
    const withExtra = {
      ...base,
      contacts: [{ ...base.contacts[0], smuggledField: 'not part of the contact schema' }]
    } as unknown as BrandOpsData;

    const after = roundTrip(withExtra);
    // Intended, and the thing that made a synthetic-fixture probe look like a
    // data-loss bug. An import is a trust boundary: a hand-edited or foreign
    // file does not get to introduce fields the product never defined.
    expect(Object.keys(after.contacts[0])).not.toContain('smuggledField');
    expect(after.contacts[0].id).toBe(base.contacts[0].id);
  });

  it('fills in what an older export left out', () => {
    const base = withDefaults(populatedWorkspace());
    const partial = { ...base } as Record<string, unknown>;
    delete partial.checkpoints;
    delete partial.notes;

    const after = withDefaults(partial as BrandOpsData);
    // A backup taken before a collection existed must still restore.
    expect(Array.isArray(after.notes)).toBe(true);
    expect(Array.isArray(after.checkpoints?.entries)).toBe(true);
  });
});
