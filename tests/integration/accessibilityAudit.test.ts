/**
 * Accessibility, audited on rendered HTML rather than guessed at from source.
 *
 * An earlier cycle "audited" accessibility by running regular expressions over
 * `.tsx` files. It reported 133 violations, then 9, and the true count was zero
 * both times — the matches were artifacts of bodies rendering `{label}` and
 * attribute blocks containing `>` inside expressions. Two rounds of confident,
 * wrong numbers, retracted rather than acted on.
 *
 * That was the wrong instrument, and the right one was already here:
 * `react-dom/server` renders these surfaces in existing tests, and `jsdom` is a
 * dependency. Parsing real output makes the question answerable instead of
 * approximable. It also corrects a claim this scorecard carried for several
 * cycles — that accessibility work was blocked "pending a renderer". Structural
 * accessibility needs a DOM, not a browser, and a DOM was available all along.
 *
 * What still genuinely needs a browser: colour contrast, focus visibility,
 * reflow at viewport widths, and anything else decided by layout or paint. Those
 * are not asserted here and are not claimed.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { CockpitDailyView } from '../../src/pages/mobile/CockpitDailyView';
import { MobileChatView } from '../../src/pages/mobile/MobileChatView';
import { MobileIntegrationsView } from '../../src/pages/mobile/MobileIntegrationsView';
import { MobileSettingsView } from '../../src/pages/mobile/MobileSettingsView';
import { MobileWorkspaceHubView } from '../../src/pages/mobile/MobileWorkspaceHubView';
import { HelpKnowledgeRoot } from '../../src/pages/help/HelpKnowledgeRoot';
import { SiteApp } from '../../src/pages/site/SiteApp';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { cloneDemoSampleData, cloneSeedData } from '../helpers/fixtures';
import type { LaunchAccessState } from '../../src/shared/account/launchAccess';

const noop = () => {};
const asyncNoop = async () => {};

const launchAccess: LaunchAccessState = {
  auth: { isAuthenticated: true, provider: 'google', email: 'operator@fixture.test' },
  membership: { status: 'active' }
};

/** The accessible name a screen reader would announce, by the usual precedence. */
function accessibleName(el: Element, doc: Document): string {
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy
      .split(/\s+/)
      .map((id) => doc.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  return (
    el.getAttribute('aria-label')?.trim() ||
    (el.textContent ?? '').trim() ||
    el.getAttribute('title')?.trim() ||
    // An icon-only control often names itself through its image.
    el.querySelector('img[alt]')?.getAttribute('alt')?.trim() ||
    ''
  );
}

function auditHtml(html: string): string[] {
  const doc = new JSDOM(`<body>${html}</body>`).window.document;
  const findings: string[] = [];
  const at = (el: Element) => el.outerHTML.replace(/\s+/g, ' ').slice(0, 120);

  // A control nobody can name is a control nobody can operate by voice or
  // screen reader.
  for (const el of doc.querySelectorAll('button, [role="button"], a[href]')) {
    if (!accessibleName(el, doc)) findings.push(`unnamed control — ${at(el)}`);
  }

  for (const el of doc.querySelectorAll('img')) {
    // Decorative images must say so; an omitted alt makes a reader announce the
    // file name instead.
    if (!el.hasAttribute('alt')) findings.push(`img without alt — ${at(el)}`);
  }

  // Collected once and compared by value: `CSS.escape` is not available in this
  // environment, and building a selector from an arbitrary id would break on the
  // first id containing a colon or a bracket.
  const labelTargets = new Set(
    Array.from(doc.querySelectorAll('label[for]')).map((label) => label.getAttribute('for'))
  );
  for (const el of doc.querySelectorAll('input, select, textarea')) {
    if (el.getAttribute('type') === 'hidden') continue;
    // Explicitly outside the accessibility tree — a file input opened by a
    // visible button that carries the name. Demanding a label for something no
    // reader will announce would push the codebase toward decorative fixes.
    if (el.closest('[aria-hidden="true"]')) continue;
    const id = el.getAttribute('id');
    const labelled =
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      (id && labelTargets.has(id)) ||
      el.closest('label');
    if (!labelled) findings.push(`unlabelled field — ${at(el)}`);
  }

  for (const el of doc.querySelectorAll('[tabindex]')) {
    // A positive tabindex reorders the whole document's tab sequence, not just
    // this element's place in it.
    if (Number(el.getAttribute('tabindex')) > 0) findings.push(`positive tabindex — ${at(el)}`);
  }

  for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns']) {
    for (const el of doc.querySelectorAll(`[${attribute}]`)) {
      for (const ref of (el.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean)) {
        // A dangling reference is worse than none: the name silently disappears.
        if (!doc.getElementById(ref)) findings.push(`${attribute} → missing #${ref} — ${at(el)}`);
      }
    }
  }

  const seen = new Map<string, number>();
  for (const el of doc.querySelectorAll('[id]')) {
    const id = el.getAttribute('id')!;
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  for (const [id, count] of seen) {
    // Duplicate ids break every `aria-*` reference that points at them.
    if (count > 1) findings.push(`duplicate id #${id} (${count}×)`);
  }

  // An interactive element inside another one has no unambiguous activation
  // target, and assistive technology cannot present it.
  for (const el of doc.querySelectorAll('button, a[href], [role="button"]')) {
    if (el.parentElement?.closest('button, a[href], [role="button"]')) {
      findings.push(`nested interactive — ${at(el)}`);
    }
  }

  // Content hidden from assistive technology while still reachable by keyboard
  // strands a sighted keyboard user on an element a reader will not announce.
  for (const el of doc.querySelectorAll('[aria-hidden="true"]')) {
    const focusable = el.querySelector('button, a[href], input, select, textarea, [tabindex]');
    if (focusable) findings.push(`focusable inside aria-hidden — ${at(focusable)}`);
  }

  for (const el of doc.querySelectorAll('ul, ol')) {
    for (const child of Array.from(el.children)) {
      if (!['LI', 'SCRIPT', 'TEMPLATE'].includes(child.tagName)) {
        // A non-`li` child breaks the list semantics, so the count a reader
        // announces is wrong.
        findings.push(
          `<${child.tagName.toLowerCase()}> directly inside <${el.tagName.toLowerCase()}>`
        );
      }
    }
  }

  const levels = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) =>
    Number(h.tagName[1])
  );
  for (let i = 1; i < levels.length; i += 1) {
    // Skipping a level makes the document outline unreliable for navigation.
    if (levels[i] - levels[i - 1] > 1)
      findings.push(`heading jump h${levels[i - 1]} → h${levels[i]}`);
  }

  return findings;
}

const SURFACES: Array<{ name: string; render: () => string }> = [
  {
    name: 'Plan hub',
    render: () =>
      renderToString(
        React.createElement(MobileWorkspaceHubView, {
          snapshot: buildWorkspaceSnapshot(cloneDemoSampleData()),
          btnFocus: '',
          commandBusy: false,
          runCommand: noop,
          onOpenToday: noop,
          launchAccess,
          onOpenSettings: noop,
          onOpenIntegrations: noop,
          onOpenCommandPalette: noop,
          firstRunJourneyVisible: true,
          canRunWorkspaceCommands: true,
          workspaceCommandLockReason: null,
          onDownloadPipelineRun: noop,
          onApproveOperatorTrace: asyncNoop
        } as never)
      )
  },
  {
    name: 'Ask My Twin',
    render: () =>
      renderToString(
        React.createElement(MobileChatView, {
          messages: [
            { id: 'user-1', role: 'user', text: 'Draft a plan for this.' },
            { id: 'ask-1', role: 'assistant', text: 'Here is a draft.' }
          ],
          loading: false,
          onQuickCommand: noop,
          btnFocus: '',
          onConvertAskToPlan: noop
        } as never)
      )
  },
  {
    name: 'Today',
    render: () =>
      renderToString(
        React.createElement(CockpitDailyView, {
          snapshot: buildWorkspaceSnapshot(cloneSeedData()),
          btnFocus: '',
          runCommand: noop
        } as never)
      )
  },
  {
    name: 'Integrations',
    render: () =>
      renderToString(
        React.createElement(MobileIntegrationsView, {
          snapshot: buildWorkspaceSnapshot(cloneDemoSampleData()),
          btnFocus: '',
          runCommand: noop
        } as never)
      )
  },
  {
    /**
     * Two surfaces the first version of this file missed, because it audited
     * the mobile shell and stopped there. Both render real HTML with no props,
     * and both are the *first* thing someone sees — the public site before they
     * sign up, and help when something has gone wrong. A structural
     * accessibility failure matters most exactly there.
     */
    name: 'Help',
    render: () => renderToString(React.createElement(HelpKnowledgeRoot))
  },
  {
    name: 'Public site',
    render: () => renderToString(React.createElement(SiteApp))
  },
  {
    name: 'Settings',
    render: () =>
      renderToString(
        React.createElement(MobileSettingsView, {
          snapshot: buildWorkspaceSnapshot(cloneSeedData()),
          btnFocus: '',
          runCommand: noop,
          launchAccess
        } as never)
      )
  }
];

describe('accessibility of rendered surfaces', () => {
  for (const surface of SURFACES) {
    it(`${surface.name}: renders and passes the structural audit`, () => {
      const html = surface.render();
      // A surface that renders almost nothing would pass every rule below
      // vacuously — the regex audit's failure mode, in a new costume.
      expect(html.length, `${surface.name} rendered almost nothing`).toBeGreaterThan(2000);

      const findings = auditHtml(html);
      expect(findings, `${surface.name}:\n  ${findings.join('\n  ')}`).toEqual([]);
    });
  }

  it('audits every surface the app actually presents', () => {
    // Sampling one view is how the first three cycles of this kind missed things.
    expect(SURFACES.length).toBeGreaterThanOrEqual(7);
  });

  it('the audit detects the faults it claims to', () => {
    // The rules are proven against a page built to fail every one of them, so a
    // clean result on the real surfaces means the rules ran — not that they are
    // written wrong. A guard nobody has seen fail is a guard nobody has tested.
    const broken = `
      <button></button>
      <img src="x.png">
      <input type="text">
      <div tabindex="3">reorders the tab sequence</div>
      <span aria-labelledby="nope">dangling</span>
      <p id="dup">one</p><p id="dup">two</p>
      <button>outer <a href="#x">inner</a></button>
      <div aria-hidden="true"><button>unreachable by reader</button></div>
      <ul><div>not an li</div></ul>
      <h1>one</h1><h3>skipped two</h3>
    `;
    const findings = auditHtml(broken);
    for (const expected of [
      'unnamed control',
      'img without alt',
      'unlabelled field',
      'positive tabindex',
      'missing #nope',
      'duplicate id #dup',
      'nested interactive',
      'focusable inside aria-hidden',
      'directly inside <ul>',
      'heading jump h1 → h3'
    ]) {
      expect(findings.join('\n'), expected).toContain(expected);
    }
  });
});
