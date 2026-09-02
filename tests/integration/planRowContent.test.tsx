/**
 * @vitest-environment jsdom
 *
 * What a plan row actually says, once you read the page rather than the code.
 *
 * Rendering the whole surface and reading it top to bottom found four things
 * that no budget or structural test was looking at.
 *
 * **Every row led with a feature description.** `promise` is marketing copy for
 * what a template does — *"Convert positioning and proof into draft outreach,
 * follow-ups, and approvals — with execution receipts that strengthen the
 * twin."* Right for something on offer; wrong for work already moving, where
 * the reader wants to know where it stands.
 *
 * **A percentage of nothing.** The expanded detail read `Progress: 40%`, and
 * that number is an activity tally times an arbitrary multiplier, capped at
 * 100 — there is no endpoint for it to be a percentage of. The Outreach Plan's
 * formula is `outreachDrafts * 20 + incompleteFollowUps * 10`, so **ten
 * unfinished follow-ups reported 100% progress**: debt read as completion.
 *
 * **A total the page already gave.** "16 items." sat above five group headings
 * that each carry their own count, broken down usefully.
 *
 * **"9 opportunitys predicted."** Three call sites appended a bare `s`.
 */
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { MobileWorkspaceHubView } from '../../src/pages/mobile/MobileWorkspaceHubView';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { cloneDemoSampleData } from '../helpers/fixtures';

const noop = () => {};

function planPage(): Document {
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
  return new JSDOM(`<body>${html}</body>`).window.document;
}

/** The summary line under each row title, per group. */
function summaries(doc: Document, groupPrefix: string): string[] {
  const section = Array.from(doc.querySelectorAll('section[aria-label]')).find((element) =>
    (element.getAttribute('aria-label') ?? '').startsWith(groupPrefix)
  );
  return Array.from(section?.querySelectorAll('summary h4') ?? []).map((heading) =>
    (heading.nextElementSibling?.textContent ?? '').replace(/\s+/g, ' ').trim()
  );
}

describe('a row for work already underway', () => {
  it('says where it stands, not what the feature is', () => {
    const lines = summaries(planPage(), 'In progress');
    expect(lines.length, 'nothing underway to check').toBeGreaterThan(0);

    // The figures, which differ per card. Was the template's promise paragraph.
    for (const line of lines) {
      expect(line, line).toMatch(/\w+: \d+/);
    }
  });

  it('says something different on each row', () => {
    const lines = summaries(planPage(), 'In progress');

    /**
     * The counter-case, and it caught a first attempt. Using the card's
     * `nextStep` here read *"Check progress, then run the next approved step."*
     * on all three rows — that field is keyed only on status, so it is the
     * redundant-kind-label defect wearing a different hat.
     */
    expect(new Set(lines).size, lines.join(' | ')).toBe(lines.length);
  });

  it('never states a figure of zero', () => {
    const lines = summaries(planPage(), 'In progress');
    // "missed tasks: 0" is a statement that nothing is there, crowding out the
    // figures that are — the same reason cycle 47 stopped counting absence.
    for (const line of lines) expect(line, line).not.toMatch(/: 0(\D|$)/);
  });
});

describe('a row for work on offer', () => {
  it('still explains what it is', () => {
    const lines = summaries(planPage(), 'Ready to start');
    expect(lines.length, 'nothing on offer to check').toBeGreaterThan(0);

    // A reader deciding whether to begin needs the explanation. Replacing it
    // with figures everywhere would have been the same mistake reversed.
    for (const line of lines) expect(line.length, line).toBeGreaterThan(40);
  });
});

describe('what the page no longer claims', () => {
  it('quotes no progress percentage', () => {
    const text = (planPage().body.textContent ?? '').replace(/\s+/g, ' ');
    expect(text, 'a percentage of an undefined whole').not.toMatch(/Progress: \d+%/);
  });

  it('does not total what the groups already count', () => {
    const text = (planPage().body.textContent ?? '').replace(/\s+/g, ' ');
    // Kept for the filtered case, where it is the only thing explaining a short
    // feed; dropped when it merely restates five headings.
    expect(text).not.toMatch(/\b\d+ items\./);
  });
});

describe('counting things in words', () => {
  it('pluralises the nouns on this surface', async () => {
    const text = (planPage().body.textContent ?? '').replace(/\s+/g, ' ');
    expect(text, 'naive plural').not.toMatch(/opportunitys/);
  });

  it('handles the shapes these nouns actually take', async () => {
    const { pluralise } = await import('../../src/pages/mobile/MobileWorkspaceHubView');
    expect(pluralise(1, 'opportunity')).toBe('1 opportunity');
    expect(pluralise(9, 'opportunity')).toBe('9 opportunities');
    expect(pluralise(1, 'expert')).toBe('1 expert');
    expect(pluralise(3, 'expert')).toBe('3 experts');
    expect(pluralise(0, 'content idea')).toBe('0 content ideas');
    // A y after a vowel is not a consonant-y: "day" pluralises as "days".
    expect(pluralise(2, 'day')).toBe('2 days');
    expect(pluralise(2, 'match')).toBe('2 matches');
  });
});
