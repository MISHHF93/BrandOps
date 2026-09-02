/**
 * "Recently done" has to contain only things that were done.
 *
 * Two ways it did not, found by asking the simplest possible question: what does
 * a brand-new workspace claim has happened?
 *
 * **Manufactured work.** A workspace with zero plans, zero receipts, zero traces
 * and zero audit entries showed the reader three completed actions marked
 * `recorded` — "ASK expert execution", "PLAN expert execution", "OPERATE expert
 * execution", each with an output reading "2ms expert execution". Those are
 * expert routing readouts, computed *during that very render* by running the
 * composition engine against a synthetic intent and timing it. The page was
 * reporting the cost of drawing itself as work done on the reader's behalf.
 *
 * The readout is real and still shown, as `snapshot.expertOperator`, framed as
 * routing rather than as history. What it is not is a receipt.
 *
 * **Work that had not happened yet.** Every operator trace became a receipt,
 * including traces still awaiting review — so one pending approval appeared
 * twice: in "Waiting on you", correctly, and in "Recently done", which says it
 * is finished. It was not finished; being asked to decide is the opposite of
 * finished.
 *
 * Both are the same mistake in different clothes: the completed list was built
 * from whatever was nearby rather than from what had actually completed.
 */
import { describe, expect, it } from 'vitest';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { withDefaults } from '../../src/services/storage/storage';
import { cloneDemoSampleData } from '../helpers/fixtures';
import type { BrandOpsData, OperatorTraceEntry } from '../../src/types/domain';

const emptyWorkspace = (): BrandOpsData => withDefaults({} as never);

function workspaceWithTraces(...entries: Array<Partial<OperatorTraceEntry>>): BrandOpsData {
  const base = cloneDemoSampleData();
  const full = entries.map((entry, index) => ({
    id: `trace-${index}`,
    at: `2026-01-0${index + 1}T10:00:00.000Z`,
    source: 'assistant' as const,
    verb: `verb-${index}`,
    surface: 'plan',
    entityType: 'plan',
    entityId: `plan-${index}`,
    ...entry
  })) as OperatorTraceEntry[];
  return {
    ...base,
    settings: { ...base.settings, operatorTraceCollectionEnabled: true },
    operatorTraces: { entries: full }
  } as BrandOpsData;
}

describe('a workspace where nothing has happened', () => {
  it('claims nothing has happened', () => {
    const snapshot = buildWorkspaceSnapshot(emptyWorkspace());

    // Was 3. Every one of them invented by the act of rendering.
    expect(
      snapshot.planExecutionReceipts.map((receipt) => receipt.action),
      'work reported for a workspace that has none'
    ).toEqual([]);
  });

  it('still routes experts, and still says so separately', () => {
    const snapshot = buildWorkspaceSnapshot(emptyWorkspace());

    // The counter-case. Deleting the readout would also empty the list above,
    // and would throw away something real to fix something false.
    expect(snapshot.expertOperator.receipts.length).toBeGreaterThan(0);
    expect(snapshot.expertOperator.ask).toBeDefined();
  });

  it('never files a routing readout as completed work', () => {
    for (const workspace of [emptyWorkspace(), cloneDemoSampleData()]) {
      const snapshot = buildWorkspaceSnapshot(workspace);
      const routing = snapshot.planExecutionReceipts.filter(
        (receipt) => receipt.sourceLabel === 'Expert operator'
      );
      expect(routing.map((receipt) => receipt.action)).toEqual([]);
    }
  });
});

describe('a request still awaiting review', () => {
  it('is not listed as something that happened', () => {
    const snapshot = buildWorkspaceSnapshot(
      workspaceWithTraces({ verb: 'send outreach', reviewStatus: 'pending' })
    );

    expect(snapshot.planPendingReviewCount, 'not surfaced as an approval at all').toBe(1);
    // The same trace was also a receipt, so the reader saw one request twice —
    // once to decide, once as already decided.
    expect(snapshot.planExecutionReceipts.map((receipt) => receipt.action)).toEqual([]);
  });

  it('becomes one the moment it is resolved', () => {
    const approved = buildWorkspaceSnapshot(
      workspaceWithTraces({ verb: 'send outreach', reviewStatus: 'approved', outcome: 'success' })
    );
    const rejected = buildWorkspaceSnapshot(
      workspaceWithTraces({ verb: 'send outreach', reviewStatus: 'rejected' })
    );

    // The counter-case for the exclusion above: dropping every trace would also
    // satisfy it, and would lose the record the product exists to keep.
    expect(approved.planExecutionReceipts.map((receipt) => receipt.action)).toContain(
      'send outreach'
    );
    expect(rejected.planExecutionReceipts.map((receipt) => receipt.action)).toContain(
      'send outreach'
    );
  });

  it('keeps the pending one out while letting the resolved one through', () => {
    const snapshot = buildWorkspaceSnapshot(
      workspaceWithTraces(
        { verb: 'waiting on you', reviewStatus: 'pending' },
        { verb: 'already done', reviewStatus: 'approved', outcome: 'success' }
      )
    );

    const actions = snapshot.planExecutionReceipts.map((receipt) => receipt.action);
    expect(actions).toContain('already done');
    expect(actions).not.toContain('waiting on you');
  });

  it('never carries a pending approval on a receipt', () => {
    const snapshot = buildWorkspaceSnapshot(
      workspaceWithTraces({ verb: 'send outreach', reviewStatus: 'pending' })
    );
    const approvals = snapshot.planExecutionReceipts.flatMap((receipt) => receipt.approvals);

    // The string that used to prove the bug: a receipt whose own approval line
    // said the approval had not happened yet.
    expect(approvals.filter((line) => /pending/i.test(line))).toEqual([]);
  });
});
