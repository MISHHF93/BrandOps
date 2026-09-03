/**
 * Two workspace changes at once must both survive.
 *
 * Every mutation in the mobile shell was written the same way — read the
 * workspace, derive the next one, write it back — and there are 32 of them.
 * Alone each is correct. Two at once lose one:
 *
 * ```
 *   A: read  -> w0
 *   B: read  -> w0          (A has not written yet)
 *   A: write -> w0 + changeA
 *   B: write -> w0 + changeB  <- A's change is gone
 * ```
 *
 * For an analytics event that costs a number. These are not analytics. They are
 * `approvePlanFromCheckpoint`, `executeApprovedPlan`, `updateTwinFactStatus`,
 * `deleteMemoryContext` — and the interface reports success for the write that
 * was discarded. "Checkpoint approved" is shown either way.
 *
 * A workspace that holds a person's decisions may fail to record one. What it
 * must never do is fail to record one and say that it did.
 *
 * These tests drive the real `storageService.updateWorkspace` against the real
 * persistence path, because the hazard is in the interleaving and a fake store
 * would only prove that a queue queues.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { storageService } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';

/** Yield, so a concurrent caller can slip between the read and the write. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  await storageService.setData(populatedWorkspace());
});

describe('two changes arriving together', () => {
  it('both land through updateWorkspace', async () => {
    await Promise.all([
      storageService.updateWorkspace(async (current) => {
        await tick();
        return { ...current, notes: [...(current.notes ?? []), { ...NOTE, id: 'note-a' }] };
      }),
      storageService.updateWorkspace(async (current) => {
        await tick();
        return { ...current, notes: [...(current.notes ?? []), { ...NOTE, id: 'note-b' }] };
      })
    ]);

    const ids = (await storageService.getData()).notes?.map((n) => n.id) ?? [];
    expect(ids, 'one of the two changes was discarded').toContain('note-a');
    expect(ids).toContain('note-b');
  });

  it('loses one when the read and write are not serialized', async () => {
    /**
     * The counter-case, kept so the fix is demonstrably solving something that
     * happens rather than something imagined. This is the exact shape all 32
     * call sites were written in.
     */
    const unserialized = async (id: string) => {
      const current = await storageService.getData();
      await tick();
      await storageService.setData({
        ...current,
        notes: [...(current.notes ?? []), { ...NOTE, id }]
      });
    };

    await Promise.all([unserialized('race-a'), unserialized('race-b')]);

    const ids = (await storageService.getData()).notes?.map((n) => n.id) ?? [];
    const survived = ['race-a', 'race-b'].filter((id) => ids.includes(id));
    expect(survived, 'the race did not reproduce — has the store changed?').toHaveLength(1);
  });

  it('applies them in the order they were requested', async () => {
    // A sequence a person will later read as one — approve, then execute —
    // must not be reordered.
    const order: string[] = [];
    await Promise.all([
      storageService.updateWorkspace(async (current) => {
        await tick();
        order.push('first');
        return current === null ? current : { ...current };
      }),
      storageService.updateWorkspace((current) => {
        order.push('second');
        return { ...current };
      })
    ]);

    expect(order).toEqual(['first', 'second']);
  });
});

describe('a mutation that decides not to write', () => {
  it('writes nothing when it returns null', async () => {
    /**
     * `approvePlanFromCheckpoint` returns nothing when there is no pending
     * review. Forcing it to invent an unchanged workspace to signal "no-op"
     * would make every no-op a write.
     */
    const before = await storageService.getData();
    const result = await storageService.updateWorkspace(() => null);

    expect(result).toBeNull();
    expect((await storageService.getData()).notes?.length ?? 0).toBe(before.notes?.length ?? 0);
  });

  it('writes nothing when it returns the workspace it was given', async () => {
    const result = await storageService.updateWorkspace((current) => current);
    expect(result).toBeNull();
  });
});

describe('a mutation that fails', () => {
  it('reports the failure to its caller', async () => {
    // A caller that cannot tell its write failed will report success to a user.
    await expect(
      storageService.updateWorkspace(() => {
        throw new Error('derivation failed');
      })
    ).rejects.toThrow('derivation failed');
  });

  it('does not block the writes queued behind it', async () => {
    /**
     * The property that keeps a transient error from becoming a permanently
     * stuck app: one failed mutation must not wedge the queue.
     */
    const failing = storageService.updateWorkspace(() => {
      throw new Error('boom');
    });
    const after = storageService.updateWorkspace((current) => ({
      ...current,
      notes: [...(current.notes ?? []), { ...NOTE, id: 'after-failure' }]
    }));

    await expect(failing).rejects.toThrow('boom');
    await after;

    const ids = (await storageService.getData()).notes?.map((n) => n.id) ?? [];
    expect(ids).toContain('after-failure');
  });
});

/** A minimal note, shaped as the workspace stores them. */
const NOTE = {
  id: 'note',
  title: 'Concurrency fixture',
  body: '',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z'
} as unknown as NonNullable<BrandOpsData['notes']>[number];
