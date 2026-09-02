/**
 * @vitest-environment jsdom
 *
 * No identifier reaches the reader as though it were English.
 *
 * Opening a plan row — the one state nothing had ever measured, since every
 * budget so far reads the collapsed page — showed a section headed **Receipts**
 * containing:
 *
 * ```
 *   type   outreachDrafts   followUps   activeOpportunities
 * ```
 *
 * Property names of an internal object, listed to a reader as records of things
 * that happened. Thirteen such tokens reached the page across the five
 * operational plan cards, all from one line: `Object.keys(plan.exportPayload)`.
 *
 * Two things were wrong at once, which is why it survived. The *content* was
 * developer internals, and the *heading* claimed they were receipts — for a
 * template nobody has run, where the honest answer is the "None recorded." the
 * empty case already prints.
 *
 * The check is written against the rendered page rather than that one line,
 * because the defect is a category: anything that reaches a user as
 * `camelCase` or `snake_case` was almost certainly not written for them.
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

/**
 * Tokens that look like code rather than prose.
 *
 * Split on whitespace and the separators the page uses between figures. An
 * email address is exempt because `operator@fixture.test` is a real value a
 * reader is meant to see, not an identifier.
 */
function identifierTokens(doc: Document): Array<{ token: string; context: string }> {
  const found = new Map<string, string>();
  for (const element of Array.from(doc.querySelectorAll('*'))) {
    if (element.children.length) continue;
    const text = (element.textContent ?? '').trim();
    if (!text || text.includes('@')) continue;
    for (const token of text.split(/[\s,·|]+/)) {
      const camel = /^[a-z]+[A-Z][A-Za-z]*$/.test(token);
      const snake = /^[a-z]+_[a-z_]+$/.test(token);
      if ((camel || snake) && !found.has(token)) found.set(token, text.slice(0, 90));
    }
  }
  return [...found].map(([token, context]) => ({ token, context }));
}

describe('the words on the plan page', () => {
  it('contain no identifiers, collapsed or expanded', () => {
    // `renderToString` emits every `<details>` body regardless of open state, so
    // this reads the expanded content too — which is where they were.
    const leaked = identifierTokens(planPage(cloneDemoSampleData()));
    expect(
      leaked.map((entry) => `${entry.token} (in "${entry.context}")`),
      'internals rendered as prose'
    ).toEqual([]);
  });

  it('contain none on an empty workspace either', () => {
    const leaked = identifierTokens(planPage(withDefaults({} as never)));
    expect(leaked.map((entry) => entry.token)).toEqual([]);
  });

  it('would notice one if it appeared', () => {
    /**
     * The counter-case. A check that finds nothing is worth exactly as much as
     * its ability to find something, and this one is a regex over rendered text
     * — easy to write so that it never matches.
     */
    const doc = new JSDOM(
      '<body><p>outreach drafts: 2</p><p>activeOpportunities</p><p>due_today_tasks</p></body>'
    ).window.document;
    expect(
      identifierTokens(doc)
        .map((entry) => entry.token)
        .sort()
    ).toEqual(['activeOpportunities', 'due_today_tasks']);
  });
});

describe('a section that has nothing to show', () => {
  it('says so rather than filling itself', () => {
    const doc = planPage(cloneDemoSampleData());
    const rows = Array.from(doc.querySelectorAll('details'));
    const outreach = rows.find((row) => row.querySelector('h4')?.textContent?.includes('Outreach'));
    const text = (outreach?.textContent ?? '').replace(/\s+/g, ' ');

    // A template nobody has run has produced no receipts. It used to list the
    // keys of an internal object instead.
    expect(text).toContain('Receipts');
    expect(text).toContain('None recorded.');
  });

  it('still shows receipts where there are some', () => {
    const base = cloneDemoSampleData();
    const workspace = {
      ...base,
      settings: { ...base.settings, operatorTraceCollectionEnabled: true },
      operatorTraces: {
        entries: [
          {
            id: 'trace-real',
            at: '2026-01-01T10:00:00.000Z',
            source: 'assistant',
            verb: 'published the weekly digest',
            surface: 'plan',
            entityType: 'content',
            entityId: 'digest-1',
            outcome: 'success',
            reviewStatus: 'approved',
            labels: []
          }
        ]
      }
    } as BrandOpsData;

    // The counter-case for emptying the field: a row that really has receipts
    // must still carry them.
    const doc = planPage(workspace);
    const done = Array.from(doc.querySelectorAll('details')).find((row) =>
      row.querySelector('h4')?.textContent?.includes('published the weekly digest')
    );
    expect(done, 'the completed row did not render').toBeDefined();
    const text = (done?.textContent ?? '').replace(/\s+/g, ' ');
    /**
     * A real receipt carries what the action produced — `generatedOutputs`, or
     * the source that recorded it — not "None recorded.". Asserted that way
     * rather than on a specific string, because the wording belongs to the
     * receipt builder and this test is about the section not being empty.
     */
    expect(text).toContain('Receipts');
    expect(text, text.slice(0, 200)).not.toContain('None recorded.');
  });
});
