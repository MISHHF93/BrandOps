/**
 * What it costs to rebuild the view model, measured.
 *
 * D14 has read "no runtime measurement" since this scorecard was written, on the
 * grounds that interaction latency needs a renderer. Some of it does. But
 * `buildWorkspaceSnapshot` is a synchronous transform over the entire workspace
 * that produces everything the interface renders, and it runs on every workspace
 * mutation — every command, every approval, every capture. Its cost is the floor
 * under every interaction in the product, and measuring it needs no browser.
 *
 * **The strongest property here is deterministic, not timed.** The snapshot is
 * ~320 kB for a ten-contact workspace and ~320 kB for a three-thousand-contact
 * one — it summarises rather than copying. That is the design decision that
 * keeps the interface usable as someone's network grows, and it is worth pinning
 * precisely because it would be so easy to break: one `...contacts` spread into
 * the render model and the cost becomes unbounded, with nothing failing.
 *
 * **The timed assertions are deliberately loose, and that is honest rather than
 * lazy.** Repeated measurement on one idle machine varied by 2×; a shared CI
 * runner will be worse. Bounds tight enough to be interesting would fail for
 * reasons that have nothing to do with this code, and a flaky test is one people
 * learn to re-run rather than read. What these catch is a change of *order* —
 * an accidental nested loop over contacts — which at thirty times the data would
 * show as hundreds of times the work, not two.
 */
import { describe, expect, it } from 'vitest';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';

const base = withDefaults(populatedWorkspace());

function withContacts(count: number): BrandOpsData {
  const template = base.contacts[0];
  return withDefaults({
    ...base,
    contacts: Array.from({ length: count }, (_, index) => ({
      ...template,
      id: `contact-${index}`,
      name: `Contact ${index}`
    }))
  } as BrandOpsData);
}

/**
 * Best-of-N rather than a mean.
 *
 * The fastest run is the one least contaminated by garbage collection and
 * scheduling, which makes it the most stable estimator of the work itself.
 */
function bestMs(workspace: BrandOpsData, reps = 9): number {
  buildWorkspaceSnapshot(workspace); // warm the JIT
  let best = Infinity;
  for (let index = 0; index < reps; index += 1) {
    const started = performance.now();
    buildWorkspaceSnapshot(workspace);
    best = Math.min(best, performance.now() - started);
  }
  return best;
}

const sizeOf = (workspace: BrandOpsData): number =>
  JSON.stringify(buildWorkspaceSnapshot(workspace)).length;

describe('the view model does not grow with the workspace', () => {
  it('is the same size for ten contacts and three thousand', () => {
    const small = sizeOf(withContacts(10));
    const large = sizeOf(withContacts(3000));

    // 300× the records, and the render model is unchanged: it summarises rather
    // than copying. One `...contacts` spread would break this silently.
    expect(large).toBeLessThan(small * 1.05);
  });

  it('stays within a fixed budget', () => {
    const bytes = sizeOf(withContacts(3000));
    // ~320 kB today. Held in React state and rebuilt on every mutation, so it is
    // a real cost even though it is not a per-frame one.
    expect(bytes).toBeLessThan(400_000);
  });

  it('is not empty', () => {
    // A snapshot that returned almost nothing would satisfy every bound above
    // while breaking the entire interface.
    expect(sizeOf(withContacts(10))).toBeGreaterThan(50_000);
  });
});

describe('rebuild cost does not change order', () => {
  it('scales sub-quadratically with contacts', () => {
    const small = bestMs(withContacts(100));
    const large = bestMs(withContacts(3000));

    /**
     * Thirty times the data. Linear-ish work lands near 2× here because fixed
     * cost dominates; quadratic work would land near 900×. A bound of six is far
     * outside the measurement noise and far inside the failure it exists to
     * catch.
     */
    expect(
      large / small,
      `100→3000 contacts cost ratio ${(large / small).toFixed(2)}×`
    ).toBeLessThan(6);
  });

  it('stays under a catastrophic-regression ceiling', () => {
    const ms = bestMs(withContacts(3000));
    // ~30 ms on a developer machine. This catches a tenfold regression, not a
    // twenty-percent one — the latter cannot be distinguished from a noisy
    // runner, and pretending otherwise buys a test nobody trusts.
    expect(ms, `${ms.toFixed(1)}ms to rebuild the view model`).toBeLessThan(400);
  });

  it('orders the operational inbox the same way every rebuild', () => {
    const workspace = withContacts(50);
    const first = buildWorkspaceSnapshot(workspace);
    const second = buildWorkspaceSnapshot(workspace);

    /**
     * Order, not byte equality. Derived items carry the instant they were
     * derived, so two rebuilds legitimately differ in `at` — asserting
     * byte-identity would be asserting that a clock does not move.
     *
     * What must not vary is the sequence. This list tells someone what needs
     * their attention; it reshuffled between rebuilds because each derived item
     * was stamped with its own `new Date()` and the list sorts by recency, so
     * the order depended on how long the code took to reach each one.
     */
    const ids = (snapshot: ReturnType<typeof buildWorkspaceSnapshot>) =>
      (snapshot.unifiedOperationalInbox?.items ?? []).map((item) => item.id);

    expect(ids(first).length).toBeGreaterThan(1);
    expect(ids(second)).toEqual(ids(first));
  });

  it('rebuilds the inbox with identical content, not just identical order', () => {
    const workspace = withContacts(50);
    const items = (snapshot: ReturnType<typeof buildWorkspaceSnapshot>) =>
      (snapshot.unifiedOperationalInbox?.items ?? []).map(({ at, ...rest }) => {
        void at;
        return rest;
      });

    /**
     * Scoped to the inbox, and with `at` removed.
     *
     * A first version compared the whole snapshot with timestamps stripped and
     * failed on `latencyLabel: "2ms expert execution"` versus `"0ms"` — a
     * measured duration, which is supposed to vary. Asserting that a measurement
     * never changes is asserting the machine has no clock. This checks the part
     * that carried the defect: same items, same content, same order.
     */
    expect(items(buildWorkspaceSnapshot(workspace))).toEqual(
      items(buildWorkspaceSnapshot(workspace))
    );
  });
});
