/**
 * @vitest-environment jsdom
 *
 * What the plan page claims when there is a lot of data.
 *
 * Three cycles asked what a surface claims for someone who has done nothing.
 * This asks the other end, and found two things.
 *
 * **A cap that starved the history.** Cycle 46 stopped pending traces becoming
 * receipts, but did it with a `continue` inside a loop over the first twelve
 * entries. Traces are newest-first, so twelve pending approvals consumed the
 * whole budget: a workspace with 25 pending and 35 resolved traces showed
 * **nothing at all** under "Recently done". The busier the workspace, the
 * emptier its history — the opposite of what a cap is for, and a regression
 * introduced by a fix two cycles earlier.
 *
 * **A group presenting a subset as the whole.** The approval rows come from a
 * peek capped at eight, while the tile above reports the true count. With 25
 * pending, the tile read "Pending Approvals 25" and the group directly beneath
 * it read "Waiting on you (5)" with a button offering "Show 2 more" — which
 * tells a reader that five is all there is. Twenty were invisible and nothing
 * said so.
 *
 * "Show N more" is honest about rows the group is holding back. It cannot speak
 * for rows the group never received, so the count does.
 */
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { MobileWorkspaceHubView } from '../../src/pages/mobile/MobileWorkspaceHubView';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { cloneDemoSampleData } from '../helpers/fixtures';
import type { BrandOpsData, OperatorTraceEntry } from '../../src/types/domain';

const noop = () => {};

/** `pending` newest-first, then `resolved` — the order that exposed the cap. */
function busyWorkspace(pending: number, resolved: number): BrandOpsData {
  const base = cloneDemoSampleData();
  const entries: OperatorTraceEntry[] = Array.from({ length: pending + resolved }, (_, index) => ({
    id: `trace-${index}`,
    at: new Date(Date.now() - index * 60_000).toISOString(),
    source: 'assistant',
    verb: `did thing ${index}`,
    surface: 'plan',
    entityType: 'plan',
    entityId: `plan-${index}`,
    /**
     * A pending request has no outcome yet, which is both realistic and
     * load-bearing: the fixture originally marked every entry `success`, so a
     * pending trace that leaked into the completed list still read as having
     * succeeded and the assertion below could not see it.
     */
    ...(index < pending ? {} : { outcome: 'success' as const }),
    reviewStatus: index < pending ? 'pending' : 'approved',
    labels: []
  })) as OperatorTraceEntry[];
  return {
    ...base,
    settings: { ...base.settings, operatorTraceCollectionEnabled: true },
    operatorTraces: { entries }
  } as BrandOpsData;
}

function render(workspace: BrandOpsData): Document {
  const html = renderToString(
    React.createElement(MobileWorkspaceHubView, {
      snapshot: buildWorkspaceSnapshot(workspace),
      btnFocus: '',
      commandBusy: false,
      runCommand: noop,
      onOpenToday: noop,
      launchAccess: {
        auth: { isAuthenticated: true, provider: 'google', email: 'operator@fixture.test' },
        membership: { status: 'active' }
      },
      onOpenSettings: noop,
      onOpenIntegrations: noop,
      onOpenCommandPalette: noop,
      firstRunJourneyVisible: true,
      canRunWorkspaceCommands: true,
      workspaceCommandLockReason: null,
      onDownloadPipelineRun: noop,
      onApproveOperatorTrace: async () => {}
    } as never)
  );
  return new JSDOM(`<body>${html}</body>`).window.document;
}

const groupLabels = (doc: Document): string[] =>
  Array.from(doc.querySelectorAll('section[aria-label]'))
    .map((section) => section.getAttribute('aria-label') ?? '')
    .filter((label) => /\((\d+ of )?\d+\)$/.test(label));

describe('a workspace with more pending work than the cap', () => {
  it('still shows what has been completed', () => {
    const snapshot = buildWorkspaceSnapshot(busyWorkspace(25, 35));

    // Was 0. Twelve pending traces exhausted a budget of twelve before a single
    // resolved one was reached.
    expect(
      snapshot.planExecutionReceipts.length,
      'completed work starved by pending work'
    ).toBeGreaterThan(0);
  });

  it('shows completed work no matter how much is pending', () => {
    // The cap is twelve, so this only passes if the filter runs first.
    for (const pending of [0, 12, 25, 60]) {
      const snapshot = buildWorkspaceSnapshot(busyWorkspace(pending, 20));
      expect(snapshot.planExecutionReceipts.length, `${pending} pending`).toBeGreaterThan(0);
    }
  });

  it('still keeps pending work out of the completed list', () => {
    const snapshot = buildWorkspaceSnapshot(busyWorkspace(25, 35));
    const states = snapshot.planExecutionReceipts.map((receipt) => receipt.executionStatus);

    /**
     * The counter-case: reordering the filter must not undo cycle 46.
     *
     * A first version searched the approval lines for the word "pending", which
     * proved nothing — cycle 46 had already removed that wording, so deleting
     * the filter left the test green. `executionStatus` carries the trace's own
     * review state and cannot be satisfied by a phrasing change.
     */
    expect(
      states.filter((state) => state === 'pending'),
      states.join(', ')
    ).toEqual([]);
  });
});

describe('a group that was handed only part of the truth', () => {
  it('says how many it is not listing', () => {
    const doc = render(busyWorkspace(25, 5));
    const waiting = groupLabels(doc).find((label) => label.startsWith('Waiting on you'));

    // Was "Waiting on you (5)" beside a tile reading "Pending Approvals 25".
    expect(waiting, groupLabels(doc).join(' | ')).toMatch(/\(\d+ of \d+\)$/);
  });

  it('tells a screen reader what it tells everyone else', () => {
    const doc = render(busyWorkspace(25, 5));
    const section = Array.from(doc.querySelectorAll('section[aria-label]')).find((element) =>
      (element.getAttribute('aria-label') ?? '').startsWith('Waiting on you')
    );
    const heading = section?.querySelector('h3')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const label = section?.getAttribute('aria-label') ?? '';

    // The label carries the count for anyone who cannot see the heading, so the
    // two must not diverge.
    const shape = label.match(/\((\d+ of \d+)\)$/)?.[1];
    expect(shape, label).toBeDefined();
    expect(heading).toContain(shape as string);
  });

  it('says where the rest are, in words', () => {
    const doc = render(busyWorkspace(25, 5));
    const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toMatch(/\d+ more not listed here/);
  });

  it('says nothing of the sort when it holds everything', () => {
    const doc = render(busyWorkspace(2, 5));
    const labels = groupLabels(doc);

    // The counter-case. A group that received every item must not imply that
    // something is missing — that would be the same defect pointed the other way.
    expect(
      labels.every((label) => /\(\d+\)$/.test(label)),
      labels.join(' | ')
    ).toBe(true);
    expect(doc.body.textContent ?? '').not.toMatch(/more not listed here/);
  });
});
