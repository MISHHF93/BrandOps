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
  it('keeps the secondary CTA hidden below sm: so it cannot collide with the wordmark', () => {
    const headerMatch = siteApp.match(/function SiteHeader\(\)[\s\S]*?\n}\n/)?.[0] ?? '';
    expect(headerMatch).toContain('New local workspace');
    const ctaJsx = headerMatch.match(/<a\s+href=\{hrefSignUp\(\)\}[\s\S]*?<\/a>/)?.[0] ?? '';
    expect(ctaJsx).toContain('hidden');
    expect(ctaJsx).toContain('sm:inline-flex');
  });

  it('clips the wordmark defensively so overflow can never paint into a sibling again', () => {
    const headerMatch = siteApp.match(/function SiteHeader\(\)[\s\S]*?\n}\n/)?.[0] ?? '';
    const wordmarkAnchor = headerMatch.match(/<a\s+href="\/"[\s\S]*?<\/a>/)?.[0] ?? '';
    expect(wordmarkAnchor).toContain('overflow-hidden');
    expect(wordmarkAnchor).toContain('truncate');
  });
});
