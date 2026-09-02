/**
 * The same workspace has to produce the same page.
 *
 * Building the snapshot twice from an unchanged workspace and diffing the two
 * results found "Recently done" arriving in a different order each time: **three
 * distinct orderings across forty builds**, and because the group shows three
 * rows before "Show N more", the reader saw a different three depending on when
 * they looked.
 *
 * The cause was a sort key generated during the sort's own build. ASK, PLAN and
 * OPERATE receipts are derived in one pass and each called `new Date()` for
 * itself; they land microseconds apart, so whether two of them share a
 * millisecond is a race with the clock. `buildPlanExecutionReceipts` then sorts
 * on exactly that field.
 *
 * Two changes, and both are needed. The receipts are now stamped once for the
 * whole derivation, which removes the race. The sort has a deterministic
 * tie-break, which makes equal stamps order the same way every time rather than
 * relying on insertion order — so a future producer that ties cannot bring the
 * flicker back.
 *
 * This is the third time a derived-at-build-time timestamp has caused this. The
 * unified inbox had it in cycle 39. The lesson that keeps not sticking:
 * **anything derived in one pass should be stamped in one pass.**
 */
import { describe, expect, it } from 'vitest';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { cloneDemoSampleData } from '../helpers/fixtures';
import type { BrandOpsData } from '../../src/types/domain';

/**
 * Two things legitimately differ between builds, and neither is disorder.
 *
 * Timestamps are the clock. Measured durations are the machine: an expert
 * routing pass that took 1ms and then 0ms is two honest measurements, not a
 * reshuffle.
 *
 * Worth recording while normalising it, because it is a real property of these
 * receipts rather than an artefact of the test: the expert receipts are derived
 * during the snapshot build, so their latency describes the render that produced
 * them. They are the only entries in "Recently done" that are recomputed rather
 * than recalled, which is a distinction the page does not currently draw.
 */
const withoutClock = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, '<when>')
    .replace(/\d+ms/g, '<duration>');

function buildMany(workspace: BrandOpsData, times: number) {
  return Array.from({ length: times }, () => buildWorkspaceSnapshot(workspace));
}

/**
 * A workspace whose receipts genuinely tie.
 *
 * The expert routing readouts used to supply the ties, and they are gone — they
 * were being reported as completed work, which is a different defect fixed in
 * the same cycle. With them removed the demo workspace has **no** execution
 * receipts at all, so an ordering assertion against it would pass over an empty
 * list and prove nothing.
 *
 * Traces stamped with one identical `at` are a better source anyway: the tie is
 * deliberate and controlled rather than an accident of how fast the machine ran.
 */
const SHARED_AT = '2026-08-30T12:00:00.000Z';

function withTiedReceipts(): BrandOpsData {
  const workspace = cloneDemoSampleData();
  const entries = ['zulu', 'alpha', 'mike', 'bravo'].map((name, index) => ({
    id: `trace-tie-${name}`,
    at: SHARED_AT,
    source: 'user' as const,
    verb: `workspace.${name}`,
    surface: 'plan',
    entityType: 'plan',
    entityId: `plan-${index}`,
    outcome: 'success' as const,
    labels: []
  }));
  return {
    ...workspace,
    settings: { ...workspace.settings, operatorTraceCollectionEnabled: true },
    operatorTraces: { entries: [...entries, ...(workspace.operatorTraces?.entries ?? [])] }
  } as BrandOpsData;
}

describe('building the same workspace twice', () => {
  it('orders receipts identically every time', () => {
    const workspace = withTiedReceipts();
    const orders = new Set(
      buildMany(workspace, 30).map((snapshot) =>
        snapshot.planExecutionReceipts.map((receipt) => receipt.id).join(',')
      )
    );

    // Was 3 across 40 builds. The reader sees this as the top of "Recently
    // done" changing between one glance and the next.
    expect(orders.size, `${orders.size} distinct orderings:\n${[...orders].join('\n')}`).toBe(1);
  });

  it('shows the same three items in the collapsed group', () => {
    const workspace = withTiedReceipts();
    const tops = new Set(
      buildMany(workspace, 30).map((snapshot) =>
        snapshot.planExecutionReceipts
          .slice(0, 3)
          .map((receipt) => receipt.id)
          .join(',')
      )
    );

    // The group renders three rows before "Show N more", so this is the slice
    // that actually reaches a reader.
    expect(tops.size, [...tops].join(' | ')).toBe(1);
  });

  it('stamps a readout derived in one pass with one timestamp', () => {
    const snapshot = buildWorkspaceSnapshot(cloneDemoSampleData());
    const stamps = new Set(snapshot.expertOperator.receipts.map((r) => r.generatedAt));

    // ASK, PLAN and OPERATE are produced together, so they are stamped together.
    // Each taking `new Date()` for itself is what made their order a race.
    expect(snapshot.expertOperator.receipts.length).toBeGreaterThan(1);
    expect(stamps.size, [...stamps].join(' | ')).toBe(1);
  });

  it('orders equal-stamped receipts by a stable key, not by arrival', () => {
    const snapshot = buildWorkspaceSnapshot(withTiedReceipts());
    const tied = snapshot.planExecutionReceipts.filter(
      (receipt) => receipt.startedAt === SHARED_AT
    );
    const ids = tied.map((receipt) => receipt.id);

    // Pushed in z/a/m/b order and stamped identically, so anything but a real
    // tie-break returns them in arrival order.
    expect(ids.length, 'no tied receipts reached the list').toBeGreaterThan(2);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
  });

  it('produces an identical snapshot apart from the clock', () => {
    const workspace = cloneDemoSampleData();
    const [first, second] = buildMany(workspace, 2);

    /**
     * The broad net. Receipt ordering is the defect that was found; this asks
     * the same question of every other field the page reads, so the next
     * build-time derivation that reshuffles fails here rather than being
     * noticed by someone squinting at a list.
     *
     * Nothing is exempt: timestamps and measured durations are normalised
     * above, so every remaining difference is something the page would show
     * differently for the same data.
     */
    const unstable: string[] = [];
    for (const key of Object.keys(first) as Array<keyof typeof first>) {
      const a = withoutClock(first[key]);
      const b = withoutClock(second[key]);
      if (a === b) continue;
      // Naming the field is not enough to act on. The excerpt is what turns a
      // failure into a diagnosis.
      let at = 0;
      while (at < Math.min(a.length, b.length) && a[at] === b[at]) at += 1;
      const from = Math.max(0, at - 90);
      unstable.push(
        String(key) +
          ' @' +
          at +
          '\n    A: ' +
          a.slice(from, at + 90) +
          '\n    B: ' +
          b.slice(from, at + 90)
      );
    }
    expect(unstable, 'unstable between builds:\n  ' + unstable.join('\n  ')).toEqual([]);
  });
});
