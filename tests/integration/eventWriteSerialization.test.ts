/**
 * Two events recorded at once must both survive.
 *
 * Recording is a read-modify-write: read the workspace, prepend a trace, write
 * it back. Two of those interleaved lose one of the events —
 *
 * ```
 *   A: read  -> w0
 *   B: read  -> w0          (A has not written yet)
 *   A: write -> w0 + eventA
 *   B: write -> w0 + eventB  <- A's event is gone
 * ```
 *
 * — and the product does exactly this. `install_offered` / `install_accepted`
 * and `restore_started` / `restore_completed` are each emitted back to back in
 * the same tick, and `app_open` fires alongside the entitlement lookup on
 * start. The loss is silent: nothing errors, the funnel is simply short, and a
 * conversion rate computed from it is quietly wrong in the direction that
 * flatters.
 *
 * This is the failure mode that makes analytics untrustworthy rather than
 * broken, which is worse, because nothing ever asks you to look at it.
 *
 * The test drives the real serializer against a store with an awaited read, so
 * the interleaving is genuine rather than simulated by calling things in an
 * unusual order.
 */
import { describe, expect, it } from 'vitest';
import {
  serializeWorkspaceWrite,
  whenWorkspaceWritesSettle
} from '../../src/services/analytics/writeQueue';
import { recordProductEvent, productEvents } from '../../src/services/analytics/productEvents';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';

/** A store whose read yields to the event loop, as a real async store does. */
function asyncStore(initial: BrandOpsData) {
  let current = initial;
  return {
    reads: 0,
    async getData(): Promise<BrandOpsData> {
      this.reads += 1;
      await Promise.resolve();
      return current;
    },
    async setData(next: BrandOpsData): Promise<void> {
      await Promise.resolve();
      current = next;
    },
    get value() {
      return current;
    }
  };
}

function consenting(): BrandOpsData {
  const base = withDefaults(populatedWorkspace());
  return {
    ...base,
    settings: { ...base.settings, operatorTraceCollectionEnabled: true },
    operatorTraces: { entries: [] }
  } as BrandOpsData;
}

describe('recording two events at once', () => {
  it('loses one without serialization — the defect this exists to prevent', async () => {
    /**
     * The counter-case, kept deliberately. It demonstrates that the hazard is
     * real in this codebase rather than theoretical, so the serializer below is
     * not solving an imaginary problem.
     */
    const store = asyncStore(consenting());

    const unserialized = async (event: 'app_open' | 'paywall_viewed') => {
      const data = await store.getData();
      await store.setData(recordProductEvent(data, event));
    };

    await Promise.all([unserialized('app_open'), unserialized('paywall_viewed')]);

    expect(productEvents(store.value), 'the race did not reproduce').toHaveLength(1);
  });

  it('keeps both when writes are serialized', async () => {
    const store = asyncStore(consenting());

    const record = (event: 'app_open' | 'paywall_viewed') =>
      serializeWorkspaceWrite(async () => {
        const data = await store.getData();
        await store.setData(recordProductEvent(data, event));
      });

    await Promise.all([record('app_open'), record('paywall_viewed')]);

    const events = productEvents(store.value).map((e) => e.event);
    expect(events).toHaveLength(2);
    expect(events).toContain('app_open');
    expect(events).toContain('paywall_viewed');
  });

  it('keeps all of a burst, not merely the last two', async () => {
    // `install_offered` then `install_accepted`, `restore_started` then
    // `restore_completed`, and `app_open` on the same tick — five is realistic.
    const store = asyncStore(consenting());
    const events = [
      'app_open',
      'paywall_viewed',
      'purchase_started',
      'purchase_completed',
      'result_saved'
    ] as const;

    await Promise.all(
      events.map((event) =>
        serializeWorkspaceWrite(async () => {
          const data = await store.getData();
          await store.setData(recordProductEvent(data, event));
        })
      )
    );

    expect(productEvents(store.value)).toHaveLength(events.length);
  });

  it('runs them in the order they were requested', async () => {
    // Order matters for a funnel: `purchase_started` after `purchase_completed`
    // is not a sequence anyone can reason about.
    const order: string[] = [];
    await Promise.all([
      serializeWorkspaceWrite(async () => {
        await Promise.resolve();
        order.push('first');
      }),
      serializeWorkspaceWrite(async () => order.push('second')),
      serializeWorkspaceWrite(async () => order.push('third'))
    ]);

    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('does not let one failure stop the queue', async () => {
    /**
     * A rejected write must not wedge everything queued behind it. Analytics
     * failing is acceptable; analytics failing and then silently blocking every
     * later workspace write is not.
     */
    const done: string[] = [];

    const failing = serializeWorkspaceWrite(async () => {
      throw new Error('storage unavailable');
    });
    const after = serializeWorkspaceWrite(async () => {
      done.push('ran anyway');
    });

    await expect(failing).rejects.toThrow('storage unavailable');
    await after;
    expect(done).toEqual(['ran anyway']);
  });

  it('reports its own failure rather than swallowing it', async () => {
    // The caller decides what to do about it. A queue that hides errors makes
    // every write look successful.
    await expect(
      serializeWorkspaceWrite(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
  });
});

describe('waiting for the queue to drain', () => {
  it('resolves only after everything queued has run', async () => {
    /**
     * A fire-and-forget emitter means the caller does not await its own write.
     * Anything that needs the workspace settled — a test asserting on it, a
     * shutdown flushing before exit — needs a way to wait, or it reads a
     * workspace that is still being written.
     */
    const done: string[] = [];
    void serializeWorkspaceWrite(async () => {
      await Promise.resolve();
      done.push('first');
    });
    void serializeWorkspaceWrite(async () => {
      done.push('second');
    });

    expect(done, 'work ran synchronously — the test proves nothing').toEqual([]);
    await whenWorkspaceWritesSettle();
    expect(done).toEqual(['first', 'second']);
  });

  it('resolves even when a queued write failed', async () => {
    // A rejection on the chain must not leave callers waiting forever.
    void serializeWorkspaceWrite(async () => {
      throw new Error('failed');
    }).catch(() => undefined);

    await expect(whenWorkspaceWritesSettle()).resolves.toBeUndefined();
  });
});
