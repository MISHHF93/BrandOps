/**
 * @vitest-environment jsdom
 *
 * The plan page has to stay readable.
 *
 * The user's report was that it was too complicated to read, and measuring it
 * made that concrete rather than a matter of taste:
 *
 * ```
 *   936 words        46 buttons        19 headings        1 section
 * ```
 *
 * One `h2` — *"What needs your attention?"* — followed by **eighteen sibling
 * `h3`s**, drawn from seven different sources: a setup prompt, a Twin proposal,
 * eight suggestions, a contact, five plan templates and two execution records.
 * Every one styled identically. The page asked a question and answered it
 * eighteen times with equal weight, which is the same as not answering it.
 *
 * The header was worse per square inch: **eleven controls, of which eight were
 * four duplicated pairs.** "Pending Approvals" the tile and "Approvals" the chip
 * set the same state. So did three other pairs.
 *
 * After: four named groups with counts, three items shown per group and the rest
 * behind "Show N more" — **262 words a reader actually sees, 27 controls in the
 * DOM and 8 of them visible**.
 *
 * These assertions are budgets, not exact numbers. They exist so the page cannot
 * quietly return to a wall of text one well-meaning addition at a time — which is
 * how it got there, since nobody adds eighteen items at once.
 */
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { MobileWorkspaceHubView } from '../../src/pages/mobile/MobileWorkspaceHubView';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { cloneDemoSampleData } from '../helpers/fixtures';

const noop = () => {};

/**
 * The feed groups, and not the page root.
 *
 * The whole surface is itself a `<section aria-label="Plan">`, so selecting on
 * the attribute alone caught it too. A group is identifiable by carrying its
 * count, which is also the thing that makes it useful to read.
 */
const groupSections = (doc: Document): Element[] =>
  Array.from(doc.querySelectorAll('section[aria-label]')).filter((section) =>
    /\(\d+\)$/.test(section.getAttribute('aria-label') ?? '')
  );

function planPage() {
  const html = renderToString(
    React.createElement(MobileWorkspaceHubView, {
      snapshot: buildWorkspaceSnapshot(cloneDemoSampleData()),
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
  const doc = new JSDOM(`<body>${html}</body>`).window.document;

  /**
   * Counted on what a reader can actually see.
   *
   * The first version of this budget counted the whole DOM, which includes the
   * body of every collapsed item — each feed row is a closed `<details>`. That
   * made the page look twice as heavy as it reads, and it would have scored a
   * genuine improvement (moving content behind a disclosure) as no change at
   * all. A sweep of the other surfaces made the same mistake and reported the
   * Today page at 1,033 words when three of its four panels were `hidden`.
   */
  const visible = new JSDOM(`<body>${html}</body>`).window.document;
  for (const el of Array.from(visible.querySelectorAll('[hidden]'))) el.remove();
  for (const details of Array.from(visible.querySelectorAll('details:not([open])'))) {
    const summary = details.querySelector('summary');
    details.replaceChildren(...(summary ? [summary] : []));
  }
  const words = (visible.body.textContent ?? '').trim().split(/\s+/).filter(Boolean);
  return { html, doc, words };
}

describe('how much the page asks you to read', () => {
  it('stays under a word budget', () => {
    const { words } = planPage();
    // 262 visible today, against 936 in the whole DOM before the reshape. The
    // budget leaves room to grow without leaving room to double.
    expect(words.length, `${words.length} visible words`).toBeLessThan(360);
  });

  it('stays under a control budget', () => {
    const { doc } = planPage();
    const buttons = doc.querySelectorAll('button').length;
    // Was 46 in the DOM. Every control competes with every other.
    expect(buttons, `${buttons} controls in the DOM`).toBeLessThan(32);
  });

  it('shows only a handful of them at once', () => {
    const { doc } = planPage();
    const visible = Array.from(doc.querySelectorAll('button')).filter((button) => {
      const details = button.closest('details');
      return !details || details.hasAttribute('open');
    });
    // The number that actually competes for a decision, as opposed to the number
    // that exists. Eight today.
    expect(visible.length, `${visible.length} visible controls`).toBeLessThanOrEqual(12);
  });

  it('keeps the header to a handful of controls', () => {
    const { doc } = planPage();
    const header = doc.querySelector('header');
    const controls = header?.querySelectorAll('button').length ?? 0;
    // Was 11, eight of them duplicates. This is the first thing anyone reads.
    expect(controls, `${controls} controls before any content`).toBeLessThanOrEqual(6);
  });

  it('renders no two controls that do the same thing', () => {
    const { doc } = planPage();
    const header = doc.querySelector('header');
    const labels = Array.from(header?.querySelectorAll('button') ?? []).map((button) =>
      (button.textContent ?? '').replace(/\d+/g, '').trim().toLowerCase()
    );
    // The tile/chip pairs were literally the same word twice. A duplicate label
    // in one header is the shape that bug took.
    expect(new Set(labels).size, labels.join(' | ')).toBe(labels.length);
  });
});

describe('how the page is organised', () => {
  it('groups the feed instead of listing everything flat', () => {
    const { doc } = planPage();
    const groups = groupSections(doc).map((section) => section.getAttribute('aria-label') ?? '');

    // Named groups, each carrying its own count.
    expect(groups.length).toBeGreaterThanOrEqual(3);
    expect(
      groups.every((label) => /\(\d+\)$/.test(label)),
      groups.join(' | ')
    ).toBe(true);
  });

  it('puts what is waiting on the reader first', () => {
    const { doc } = planPage();
    const first = groupSections(doc)[0]?.getAttribute('aria-label') ?? '';
    // Reading order is the priority order: a decision someone owes is not
    // comparable to an idea a recommendation engine had overnight.
    expect(first).toContain('Waiting on you');
  });

  it('uses a real heading hierarchy', () => {
    const { doc } = planPage();
    const levels = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((heading) =>
      Number(heading.tagName[1])
    );

    // Eighteen sibling `h3`s was the flat structure made visible. Items now sit
    // under the group heading that explains them.
    const h3 = levels.filter((level) => level === 3).length;
    const h4 = levels.filter((level) => level === 4).length;
    expect(h3, 'group headings').toBeLessThanOrEqual(6);
    expect(h4, 'item headings').toBeGreaterThan(0);
  });

  it('shows a few items per group and offers the rest', () => {
    const { doc, html } = planPage();
    const oversized = groupSections(doc).filter(
      (section) => section.querySelectorAll('h4').length > 3
    );

    // Nothing renders more than three at once.
    expect(oversized.map((section) => section.getAttribute('aria-label'))).toEqual([]);
    // And nothing is unreachable. React SSR splits adjacent text and expression
    // nodes with `<!-- -->`, so the raw markup reads `Show <!-- -->7<!-- --> more`.
    expect(html).toMatch(/Show (<!-- -->)?\d+(<!-- -->)? more/);
  });
});

/**
 * Things the page should not say twice, or say to a machine.
 *
 * Found by rendering the page and reading its visible text in order, which is
 * the one thing none of the budgets above do. A word count cannot tell you that
 * two of the words are the same item.
 */
describe('what the page actually says', () => {
  it('does not render the same item twice at the top', () => {
    const { doc } = planPage();
    const headings = Array.from(doc.querySelectorAll('h4')).map((heading) =>
      (heading.textContent ?? '').trim()
    );

    /**
     * A "Start here" card sat above the feed rendering `attention`, which is
     * `feedItems.find(...) ?? feedItems[0]` — the same object the first group
     * renders as its first row. Same title, same status chip, same summary, same
     * button, one directly above the other, as the first thing on the page.
     */
    const repeated = headings.filter((title, index) => title && headings.indexOf(title) !== index);
    expect(repeated, `repeated: ${repeated.join(' | ')}`).toEqual([]);
  });

  it('does not promote an item it is about to list anyway', () => {
    const { doc } = planPage();
    const firstRow = doc.querySelector('section[aria-label^="Waiting on you"] h4');
    const beforeTheGroups = Array.from(doc.querySelectorAll('p, h3'))
      .filter((element) => {
        const position = element.compareDocumentPosition(firstRow as Node);
        return (position & 4) !== 0; // element comes before the first grouped row
      })
      .map((element) => (element.textContent ?? '').trim());

    // Whatever the header says, it must not be the first row's own title.
    const title = (firstRow?.textContent ?? '').trim();
    expect(title.length).toBeGreaterThan(0);
    expect(beforeTheGroups).not.toContain(title);
  });

  it('shows no machine timestamps', () => {
    const { words } = planPage();
    const text = words.join(' ');

    // `due 2026-09-02T06:35:12.511Z` reached the reader in the one line meant to
    // say when something was due. The view had a formatter; this path never
    // called it.
    const iso = text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/g) ?? [];
    expect(iso, `machine timestamps on screen: ${iso.join(', ')}`).toEqual([]);
  });

  it('counts items only when the count means something', () => {
    const { words } = planPage();
    const text = words.join(' ');

    // "Showing 18 of 18" is a sentence that only says anything when the two
    // numbers differ.
    const redundant = text.match(/Showing (\d+) of \1\b/);
    expect(redundant?.[0] ?? null).toBeNull();
  });
});

/**
 * What the collapsed row asks the reader to hold in their head.
 *
 * Measured before this pass, on the demo workspace:
 *
 * ```
 *   kind labels rendered      9   of which 6 restated their own group heading
 *   distinct "status" values  6   ["setup needed","ready","in progress",
 *                                  "Scheduler","100% confidence","recorded"]
 * ```
 *
 * Three of those six are not states. `Scheduler` is the queue an item arrived
 * from. `100% confidence` is a score. `recorded` is a receipt's execution status
 * sitting under a heading that already says "Recently done". All six were drawn
 * as the same chip, so the one element that should answer "what state is this
 * in?" answered a different question depending on the row.
 *
 * After: 3 kind labels, 0 redundant, and the chip carries a state or nothing.
 */
describe('what a collapsed row makes the reader read', () => {
  const groups = (doc: Document) =>
    Array.from(doc.querySelectorAll('section[aria-label]')).filter((section) =>
      /\(\d+\)$/.test(section.getAttribute('aria-label') ?? '')
    );

  it('never labels a row with what its group heading already said', () => {
    const { doc } = planPage();
    const offenders: string[] = [];

    for (const group of groups(doc)) {
      const labels = Array.from(group.querySelectorAll('summary .bo-system-label')).map((element) =>
        (element.textContent ?? '').trim()
      );
      // One distinct label across a whole group is a label that distinguishes
      // nothing in it.
      if (labels.length > 0 && new Set(labels).size <= 1) {
        offenders.push(`${group.getAttribute('aria-label')}: every row says "${labels[0]}"`);
      }
    }

    expect(offenders, offenders.join(' | ')).toEqual([]);
  });

  it('keeps the label where it still tells two kinds apart', () => {
    const { doc } = planPage();
    const mixed = groups(doc).filter(
      (group) =>
        new Set(
          Array.from(group.querySelectorAll('summary .bo-system-label')).map((element) =>
            (element.textContent ?? '').trim()
          )
        ).size > 1
    );

    // The counter-case. Suppressing every label would also satisfy the test
    // above, and would lose the one place the label earns its space.
    expect(mixed.length, 'no group distinguishes its kinds').toBeGreaterThan(0);
  });

  it('chips a state, never a source or a score', () => {
    const { doc } = planPage();
    const chips = Array.from(doc.querySelectorAll('summary span.rounded-full')).map((element) =>
      (element.textContent ?? '').trim()
    );

    // A closed vocabulary. Anything outside it reached the chip by accident,
    // which is exactly how "Scheduler" and "100% confidence" got there.
    const ALLOWED = new Set([
      'Needs you',
      'Ready',
      'Working',
      'Blocked',
      'Verifying',
      'Done',
      'Failed'
    ]);
    const strays = chips.filter((chip) => !ALLOWED.has(chip));
    expect(strays, `not states: ${strays.join(', ')}`).toEqual([]);
  });

  it('never chips the same state on every row of a group', () => {
    const { doc } = planPage();
    const uniform = groups(doc)
      .map((group) => ({
        label: group.getAttribute('aria-label'),
        chips: Array.from(group.querySelectorAll('summary span.rounded-full')).map((element) =>
          (element.textContent ?? '').trim()
        )
      }))
      .filter((group) => group.chips.length > 0 && new Set(group.chips).size <= 1);

    // "Recently done" chipping `Done` on every row is the heading again in a
    // smaller font.
    expect(uniform.map((group) => group.label)).toEqual([]);
  });
});
