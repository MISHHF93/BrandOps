/**
 * @vitest-environment jsdom
 *
 * A count beside a lane has to count work.
 *
 * Today's focus board falls back to a message when a lane has nothing in it —
 * "No red flags in tracked signals", "Set today's move", "Build momentum". Those
 * messages are honest and worth keeping. They are also *items in the list*, so
 * the tab beside each one counted them.
 *
 * A brand-new workspace showed **"Do today 1  Urgent 1  Momentum 1"**, and
 * Momentum's one item was the message saying there was no momentum yet. The
 * badge contradicted the only thing underneath it, and the badge is what a
 * reader scans first.
 *
 * **The other two counts turned out to be real, which is worth recording
 * because I assumed otherwise.** "Do today" holds the default BrandOps cadence
 * and "Urgent" holds "Providers not connected: google, github, linkedin" —
 * both genuine things to tell a new user. Dumping the lanes before writing the
 * assertion is what caught that; a test written to the assumption would have
 * demanded all three read zero and pushed two honest lines off the board.
 *
 * So the invariant is not "an empty workspace counts zero". It is **a lane never
 * counts its own empty-state message**, which holds whichever lane falls back.
 */
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { CockpitFocusEngine } from '../../src/pages/mobile/CockpitFocusEngine';
import { buildTodayFocusBoard, focusWorkCount } from '../../src/pages/mobile/todayFocusModel';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { withDefaults } from '../../src/services/storage/storage';
import { cloneDemoSampleData } from '../helpers/fixtures';
import type { BrandOpsData } from '../../src/types/domain';

const noop = () => {};
const emptyWorkspace = (): BrandOpsData => withDefaults({} as never);

function lanes(workspace: BrandOpsData) {
  return buildTodayFocusBoard(buildWorkspaceSnapshot(workspace));
}

function renderCounts(workspace: BrandOpsData): Record<string, number> {
  const html = renderToString(
    React.createElement(CockpitFocusEngine, {
      snapshot: buildWorkspaceSnapshot(workspace),
      btnFocus: '',
      commandBusy: false,
      runCommand: noop,
      primeChat: noop,
      onRecordKpiSelfCheck: noop
    } as never)
  );
  const doc = new JSDOM(`<body>${html}</body>`).window.document;
  const counts: Record<string, number> = {};
  for (const button of Array.from(doc.querySelectorAll('button'))) {
    const text = (button.textContent ?? '').replace(/\s+/g, ' ').trim();
    const match = text.match(/^(Do today|Urgent|Momentum)\s*(\d+)$/);
    if (match) counts[match[1]] = Number(match[2]);
  }
  return counts;
}

describe('a lane with nothing in it', () => {
  it('never counts its own empty-state message', () => {
    const board = lanes(emptyWorkspace());
    for (const [name, lane] of Object.entries({
      'Do today': board.doToday,
      Urgent: board.urgent,
      Momentum: board.momentum
    })) {
      const placeholders = lane.filter((line) => line.placeholder).length;
      // The count must equal the lines that are not placeholders, in every lane,
      // however many of each it happens to have.
      expect(focusWorkCount(lane), name).toBe(lane.length - placeholders);
    }
  });

  it('counts zero for the lane that has only a message', () => {
    const board = lanes(emptyWorkspace());
    // Momentum is the lane that falls back on a brand-new workspace, and it read
    // 1 above a line saying there was no momentum yet.
    expect(board.momentum.every((line) => line.placeholder)).toBe(true);
    expect(focusWorkCount(board.momentum)).toBe(0);
  });

  it('still says something useful there', () => {
    const board = lanes(emptyWorkspace());
    // The counter-case. Emptying the lane would also make the count zero, and
    // would leave a new user staring at a blank panel.
    expect(board.momentum).toHaveLength(1);
    expect(board.momentum[0].line.length).toBeGreaterThan(0);
  });

  it('shows no badge above it', () => {
    const counts = renderCounts(emptyWorkspace());
    expect(counts.Momentum ?? 0).toBe(0);
  });

  it('leaves the lanes that do have something alone', () => {
    const counts = renderCounts(emptyWorkspace());
    /**
     * Recorded deliberately. "Do today" carries the default BrandOps cadence and
     * "Urgent" carries the three unconnected providers — real things to say to
     * someone who has just arrived. Had this test been written to the assumption
     * that an empty workspace counts zero everywhere, the fix would have
     * suppressed both.
     */
    expect(counts['Do today']).toBeGreaterThan(0);
    expect(counts.Urgent).toBeGreaterThan(0);
  });
});

describe('a workspace with real work in it', () => {
  it('counts it', () => {
    const board = lanes(cloneDemoSampleData());
    const total =
      focusWorkCount(board.doToday) + focusWorkCount(board.urgent) + focusWorkCount(board.momentum);

    // The counter-case for the whole change: excluding placeholders must not
    // stop the board counting anything at all.
    expect(total, 'no work counted on a populated workspace').toBeGreaterThan(0);
  });

  it('never marks real work as a placeholder', () => {
    const board = lanes(cloneDemoSampleData());
    const marked = [...board.doToday, ...board.urgent, ...board.momentum].filter(
      (line) => line.placeholder
    );
    // A placeholder only ever appears alone; a lane with work has none.
    for (const lane of [board.doToday, board.urgent, board.momentum]) {
      if (lane.some((line) => line.placeholder)) expect(lane).toHaveLength(1);
    }
    expect(marked.every((line) => /move|red flags|momentum/i.test(line.line))).toBe(true);
  });
});
