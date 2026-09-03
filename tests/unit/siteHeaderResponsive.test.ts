import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('SiteApp header (contract)', () => {
  const siteApp = read('src/pages/site/SiteApp.tsx');

  /**
   * Regression guard: the header row's CTA group used to be `shrink-0` (never
   * compresses) while the wordmark link was `min-w-0` (forced to compress),
   * so on narrow viewports the flex algorithm shrank the wordmark's *layout*
   * box to near zero while its text still rendered at full width — painting
   * "BrandOps" visually underneath the "Open app" button. Confirmed with a
   * real headless-browser measurement (wordmark span's own bounding rect
   * extended ~60px past its parent anchor's box). Fixed by hiding the
   * secondary CTA below `sm:` and clipping the wordmark defensively instead
   * of letting it overflow into the next flex item.
   */
  it('carries exactly one call to action, so nothing can crowd the wordmark', () => {
    /**
     * The collision above was fixed by hiding the second CTA below `sm:`. It is
     * now fixed more directly: there is no second CTA.
     *
     * "Open app" and "New local workspace" pointed at `welcome.html` and
     * `welcome.html?flow=signup`, and **nothing reads `flow`** — `QUERY.welcomeFlow`
     * is written when the URL is built and never consulted anywhere. Two primary
     * actions that resolve to the identical screen is the competing-CTA problem,
     * and it was also what squeezed the wordmark in the first place.
     *
     * This asserts the count rather than the responsive class, because the class
     * was a workaround for the button that is now gone.
     */
    const headerMatch = siteApp.match(/function SiteHeader\(\)[\s\S]*?\n}\n/)?.[0] ?? '';
    expect(headerMatch, 'no SiteHeader found').not.toBe('');

    /**
     * Comments stripped first. The doc comment above the CTA explains that
     * "New local workspace" was removed, and matching raw source made that
     * explanation fail the assertion it was explaining — the same trap the
     * page-surface scan hit.
     */
    const headerCode = headerMatch
      .replace(/\{?\s*\/\*[\s\S]*?\*\/\s*\}?/g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ');

    const ctas = headerCode.match(/<a\s+href=\{href(SignIn|SignUp)\(\)\}/g) ?? [];
    expect(ctas.length, `header has ${ctas.length} calls to action`).toBe(1);
    expect(headerCode).not.toContain('New local workspace');
  });

  it('clips the wordmark defensively so overflow can never paint into a sibling again', () => {
    const headerMatch = siteApp.match(/function SiteHeader\(\)[\s\S]*?\n}\n/)?.[0] ?? '';
    const wordmarkAnchor = headerMatch.match(/<a\s+href="\/"[\s\S]*?<\/a>/)?.[0] ?? '';
    expect(wordmarkAnchor).toContain('overflow-hidden');
    expect(wordmarkAnchor).toContain('truncate');
  });
});
