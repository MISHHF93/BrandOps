/**
 * A ratchet on unserialized workspace writes.
 *
 * The mobile shell mutates the workspace by reading it, deriving the next one,
 * and writing it back. Alone that is correct; two at once lose one of the
 * changes, and the interface reports success for the write that was discarded.
 * `concurrentWorkspaceWrites.test.ts` demonstrates the loss against the real
 * store.
 *
 * There were 32 such sites. The four whose loss is a lost *decision* —
 * approving a checkpoint, rejecting one, verifying a Twin fact, and recording a
 * product event — now go through `storageService.updateWorkspace`, which
 * serializes read and write together.
 *
 * The rest are real and not yet migrated. A single mechanical transform across
 * all of them was attempted and reverted: the call sites are not uniform, and
 * the first rewrite broke a variable used after the block. Migrating them
 * blindly to make a number go down would risk exactly the correctness this is
 * meant to protect.
 *
 * So this is a ratchet rather than a pass/fail. The count may fall and never
 * rise, which stops the problem growing while the backlog is worked through —
 * the same instrument used for unused exports and test type errors, applied to
 * a concurrency hazard.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * How many bare `getData()` → `setData()` pairs remain.
 *
 * **Lower this in the same commit that migrates a site.** It may never rise.
 */
const UNSERIALIZED_WRITE_BUDGET = 28;

const SHELL = 'src/pages/mobile/mobileApp.tsx';

/** Source with comments removed, so prose about the hazard is not counted as it. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

/**
 * A read that is followed by a write before the next read.
 *
 * Counted on the shipped shell rather than inferred from a list, so a new call
 * site is caught the day it is written rather than the day it corrupts
 * something.
 */
function unserializedWrites(source: string): number {
  const body = code(source);
  const reads = [...body.matchAll(/await storageService\.getData\(\)/g)];
  let count = 0;
  for (const read of reads) {
    const after = body.slice(read.index ?? 0);
    const nextRead = after.slice(1).search(/await storageService\.getData\(\)/);
    const window = nextRead === -1 ? after : after.slice(0, nextRead + 1);
    if (/await storageService\.setData\(/.test(window)) count += 1;
  }
  return count;
}

describe('workspace write safety', () => {
  it('has the shell to inspect', () => {
    expect(readFileSync(SHELL, 'utf8').length).toBeGreaterThan(1000);
  });

  it('never adds an unserialized read-modify-write', () => {
    const count = unserializedWrites(readFileSync(SHELL, 'utf8'));

    expect(
      count,
      count > UNSERIALIZED_WRITE_BUDGET
        ? `${count} unserialized workspace writes, budget ${UNSERIALIZED_WRITE_BUDGET}. ` +
            'Route the new one through storageService.updateWorkspace.'
        : `${count} unserialized writes — lower UNSERIALIZED_WRITE_BUDGET to ${count} in this commit.`
    ).toBe(UNSERIALIZED_WRITE_BUDGET);
  });

  it('routes the decisions through the serialized path', () => {
    /**
     * Named explicitly, because these are the four where a dropped write costs
     * a person a decision rather than a metric. A future refactor that quietly
     * moves one back to a bare read has to fail here.
     */
    const body = code(readFileSync(SHELL, 'utf8'));
    for (const marker of [
      'approveCheckpointForPlan',
      'rejectCheckpointForPlan',
      'updateTwinFactVerificationStatus',
      'recordProductEvent'
    ]) {
      /**
       * Every occurrence, not the first. The first is the import at the top of
       * the file, which sits nowhere near an `updateWorkspace` call — checking
       * it would have failed for the wrong reason.
       */
      const positions = [...body.matchAll(new RegExp(marker, 'g'))].map((m) => m.index ?? 0);
      expect(positions.length, `${marker} not found in the shell`).toBeGreaterThan(0);

      const serialized = positions.some((at) =>
        body.slice(Math.max(0, at - 400), at + 200).includes('updateWorkspace')
      );
      expect(serialized, `${marker} is never used inside an updateWorkspace call`).toBe(true);
    }
  });

  it('counts a bare pair and ignores a serialized one', () => {
    // The detector, checked against both shapes so the budget above is
    // measuring what it claims to.
    const bare = 'const d = await storageService.getData();\nawait storageService.setData(d);';
    const serialized = 'await storageService.updateWorkspace((d) => d);';

    expect(unserializedWrites(bare)).toBe(1);
    expect(unserializedWrites(serialized)).toBe(0);
  });
});
