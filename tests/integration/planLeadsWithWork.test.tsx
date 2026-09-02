/**
 * @vitest-environment jsdom
 *
 * The plan page opens on work, not on suggestions.
 *
 * Several cycles cut the page's word count, its duplicate labels, its fabricated
 * receipts and its identifier leaks, and it was still reported as too
 * complicated. Measuring what the groups actually held said why:
 *
 * ```
 *    4 items are work    — waiting on you, in progress, recently done
 *   12 items are offers  — ready to start, suggested, set up
 *   -> 75% of the page was things nobody had started
 * ```
 *
 * Every earlier repair made the page shorter without changing that proportion. A
 * reader still walked past twelve suggestions to find four things happening,
 * which is the shape of the complaint rather than the length.
 *
 * The offers now sit behind a single disclosure carrying its own count, and the
 * page leads with work: **214 visible words to 116**.
 *
 * The exception is a workspace with **nothing moving**, where the offers are the
 * most useful thing on the page and the disclosure opens.
 *
 * That condition was originally "no work groups at all", and it could never
 * run: the twin-status row is built unconditionally and always lands in
 * "Waiting on you", so the work column is never empty. Writing this test is what
 * caught it — the branch would otherwise have shipped unreachable, with a test
 * above it claiming it worked.
 */
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { MobileWorkspaceHubView } from '../../src/pages/mobile/MobileWorkspaceHubView';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { cloneDemoSampleData } from '../helpers/fixtures';
import { withDefaults } from '../../src/services/storage/storage';
import type { BrandOpsData } from '../../src/types/domain';

const noop = () => {};

function planPage(workspace: BrandOpsData): Document {
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

/** What survives when closed disclosures are folded away — i.e. the first paint. */
function visible(doc: Document): Document {
  const copy = new JSDOM(`<body>${doc.body.innerHTML}</body>`).window.document;
  for (const element of Array.from(copy.querySelectorAll('[hidden]'))) element.remove();
  for (const details of Array.from(copy.querySelectorAll('details:not([open])'))) {
    const summary = details.querySelector('summary');
    details.replaceChildren(...(summary ? [summary] : []));
  }
  return copy;
}

const OFFER_GROUPS = ['Ready to start', 'Suggested', 'Set up'];
const WORK_GROUPS = ['Waiting on you', 'In progress', 'Recently done'];

const headingsIn = (doc: Document): string[] =>
  Array.from(doc.querySelectorAll('h3')).map((h) =>
    (h.textContent ?? '').replace(/\s+/g, ' ').trim()
  );

describe('a workspace with work in it', () => {
  const doc = planPage(cloneDemoSampleData());

  it('shows the work groups on the first paint', () => {
    const shown = headingsIn(visible(doc));
    expect(
      WORK_GROUPS.some((group) => shown.some((heading) => heading.startsWith(group))),
      shown.join(' | ')
    ).toBe(true);
  });

  it('does not show a single offer group on the first paint', () => {
    const shown = headingsIn(visible(doc));
    // They are one tap away, and they are not what the page opens on.
    for (const group of OFFER_GROUPS) {
      expect(
        shown.some((heading) => heading.startsWith(group)),
        group
      ).toBe(false);
    }
  });

  it('says how many offers it is holding back', () => {
    const summaryText = Array.from(visible(doc).querySelectorAll('summary'))
      .map((element) => (element.textContent ?? '').replace(/\s+/g, ' '))
      .find((text) => text.includes('could start'));

    // A door with no number on it is just a hidden pile.
    expect(summaryText, 'no offers disclosure rendered').toBeDefined();
    expect(summaryText).toMatch(/could start\s*\d+/);
  });

  it('still renders the offers, folded rather than dropped', () => {
    // The counter-case: hiding them by deleting them would satisfy the test
    // above and lose the product's suggestions entirely.
    const all = headingsIn(doc);
    for (const group of ['Ready to start', 'Suggested']) {
      expect(
        all.some((heading) => heading.startsWith(group)),
        group
      ).toBe(true);
    }
  });

  it('reads shorter than it did', () => {
    const words = (visible(doc).body.textContent ?? '').trim().split(/\s+/).filter(Boolean);
    // Was 214 with the offers in the column, 262 before the earlier reshapes.
    expect(words.length, `${words.length} visible words`).toBeLessThan(160);
  });
});

describe('a workspace with nothing under way', () => {
  /**
   * A brand-new workspace: no plans in progress, no receipts. The twin prompt
   * still occupies "Waiting on you", which is exactly why the condition is about
   * movement rather than about the work column being empty.
   */
  const noWork = (): BrandOpsData => withDefaults({} as never);

  it('opens the offers, because they are all there is', () => {
    const doc = planPage(noWork());
    const disclosure = Array.from(doc.querySelectorAll('details')).find((element) =>
      (element.querySelector('summary')?.textContent ?? '').includes('could start')
    );

    // Folding everything away would leave a new reader looking at a header and
    // nothing else.
    expect(disclosure, 'no offers disclosure rendered').toBeDefined();
    expect(disclosure?.hasAttribute('open'), 'offers stayed folded on an empty page').toBe(true);
  });

  it('shows the offers on the first paint in that case', () => {
    const shown = headingsIn(visible(planPage(noWork())));
    expect(shown.some((heading) => OFFER_GROUPS.some((group) => heading.startsWith(group)))).toBe(
      true
    );
  });
});
