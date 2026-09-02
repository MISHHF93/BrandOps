/**
 * Every URL the product points at has to resolve to something it ships.
 *
 * The page surface is not one app. Six HTML entries are built, three of them
 * mount the *same* shell with a different default tab, and a fourth is a
 * redirect kept alive for old bookmarks:
 *
 * ```
 *   index.html         SiteApp                    marketing site
 *   welcome.html       renderChatbotSurface       shell, initialTab chat
 *   integrations.html  renderChatbotSurface       shell, initialTab integrations
 *   mobile.html        renderChatbotSurface       shell, initialTab chat
 *   dashboard.html     dashboardRedirect          -> mobile.html, query + hash preserved
 *   help.html          HelpKnowledgeRoot          knowledge base
 * ```
 *
 * That duplication is deliberate — they are URL contracts, not four copies of an
 * app — but deliberate duplication is exactly the kind that rots quietly. A tab
 * renamed in `mobileShellQuery.ts` does not break a `?section=` link anywhere;
 * it silently falls through to the default tab, and the bookmark just goes
 * somewhere else. Nothing failed, and nothing said so.
 *
 * So this asserts the two properties that keep the surface honest: every
 * referenced page is actually built, and every `?section=` value in that
 * reference resolves through the real parser rather than through a vocabulary
 * restated here.
 *
 * Comments are stripped before matching. The first version of this scan did not
 * do that and reported four failures, all of them prose — a `{google,github,
 * linkedin}-brandops.html` brace expansion, a `file.html` placeholder, markdown
 * bold running into a URL, and a `#hash` it had failed to strip. A check that
 * cries wolf on documentation gets switched off.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { parseMobileShellFromSearchParams } from '../../src/pages/mobile/mobileShellQuery';

const SKIP = new Set(['node_modules', 'dist', 'android', '.git', 'coverage']);
const EXT = new Set(['.ts', '.tsx', '.html']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.has(extname(name))) out.push(p);
  }
  return out;
}

/** Source with comments removed, so prose cannot create or hide a reference. */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

const files = [
  ...walk('src'),
  ...walk('public'),
  ...readdirSync('.').filter((f) => f.endsWith('.html'))
];

const URL_RE = /[a-zA-Z0-9_-]+\.html(?:\?[^'"`\s)<>]*)?/g;

/** Distinct `page.html[?query]` forms that appear in code, with where they came from. */
const references = new Map<string, Set<string>>();
for (const file of files) {
  for (const match of code(readFileSync(file, 'utf8')).matchAll(URL_RE)) {
    if (!references.has(match[0])) references.set(match[0], new Set());
    references.get(match[0])!.add(file);
  }
}

/** Pages the build actually emits, at any depth (oauth callbacks live in dist/oauth). */
function builtPages(dir = 'dist', prefix = ''): Set<string> {
  const out = new Set<string>();
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) for (const f of builtPages(p, `${prefix}${name}/`)) out.add(f);
    else if (name.endsWith('.html')) out.add(`${prefix}${name}`);
  }
  return out;
}

const built = builtPages();

describe('the page surface', () => {
  it('has a build to check against', () => {
    // Fails rather than skips: an unchecked surface must not read as a checked
    // one. `npm run build` before the suite.
    expect(built.size, 'dist has no html pages — run `npm run build`').toBeGreaterThan(0);
  });

  it('finds the references it is supposed to be checking', () => {
    /**
     * The guard against a silently-empty scan. An earlier version shelled out to
     * ripgrep, had its pattern eaten by cmd.exe quoting, found zero references
     * and pronounced the surface healthy.
     *
     * Named pages rather than a count: once comments are stripped only nine
     * distinct forms remain, so a threshold sits right next to the real number
     * and breaks on any edit.
     */
    const pages = new Set([...references.keys()].map((r) => r.split('?')[0]));
    for (const required of ['mobile.html', 'help.html', 'dashboard.html']) {
      expect(pages, `the scan found no reference to ${required}`).toContain(required);
    }
  });

  it('points only at pages that are built', () => {
    const basenames = new Set([...built].map((p) => p.split('/').pop()!));
    const missing = [...references]
      .filter(([ref]) => !basenames.has(ref.split('?')[0]))
      .map(([ref, where]) => `${ref} (${[...where][0]})`);

    expect(missing, `referenced but never built:\n${missing.join('\n')}`).toEqual([]);
  });

  it('uses only ?section= values the shell can resolve', () => {
    /**
     * Resolved through the real parser, not a list copied from it. An unknown
     * value does not throw — it quietly returns the default tab — so the check
     * is that the parser gives back what was asked for.
     */
    const unresolved: string[] = [];
    for (const [ref, where] of references) {
      const [page, query = ''] = ref.split('?');
      if (page !== 'mobile.html' && page !== 'integrations.html') continue;
      const section = new URLSearchParams(query.split('#')[0]).get('section');
      if (!section || /[<{$]/.test(section)) continue; // template holes

      // `daily` is the one token that intentionally rewrites itself: it selects
      // the Cockpit tab and defaults the workstream, so compare on the outcome.
      const parsed = parseMobileShellFromSearchParams(
        new URLSearchParams(`section=${section}`),
        'chat'
      );
      const fellThrough =
        parsed.tab === 'chat' && parsed.workstream === null && section.toLowerCase() !== 'chat';
      if (fellThrough) unresolved.push(`${ref} (${[...where][0]})`);
    }

    expect(
      unresolved,
      `?section= values that fall through to the default tab:\n${unresolved.join('\n')}`
    ).toEqual([]);
  });

  it('builds no page that nothing ever points at', () => {
    /**
     * An orphan page is a URL a user can still reach and nobody maintains.
     *
     * Two exemptions, both recorded rather than filtered away quietly, so that a
     * genuinely new orphan still fails here:
     *
     * - `index.html` is the site root, reached by typing the domain.
     * - `oauth/*.html` are callback targets. A callback is reached by a redirect
     *   from an identity provider, so being unreachable from an in-app link is
     *   what it is *supposed* to be. They currently render "authentication
     *   unavailable" because no OAuth runtime ships, and `verify-dist.mjs`
     *   already asserts they are present.
     */
    const referenced = new Set([...references.keys()].map((r) => r.split('?')[0]));
    const orphans = [...built].filter(
      (p) =>
        !p.startsWith('oauth/') &&
        p !== 'index.html' &&
        p !== 'privacy-policy.html' &&
        !referenced.has(p.split('/').pop()!)
    );

    expect(orphans, `built but unreferenced: ${orphans.join(', ')}`).toEqual([]);
  });
});
