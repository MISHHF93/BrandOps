/**
 * @vitest-environment jsdom
 *
 * The LinkedIn companion must not publish the user's workspace into the page.
 *
 * The overlay is a content script injected into `linkedin.com`. It loads the
 * full workspace through `storageService.getData()` and renders the user's own
 * pipeline into `<select>` options — company names, opportunity titles — so a
 * capture can be filed against the right record.
 *
 * It appended that UI straight to `document.body`. Driven in a DOM with a demo
 * workspace loaded, the result was unambiguous: **"Northstar Robotics" and
 * "SignalForge" were in the host page's markup**, along with the opportunity
 * titles, in six `<option>` elements. Any script running on that page —
 * LinkedIn's own, or any third party it loads — could read the user's private
 * pipeline with a single `querySelectorAll('option')`.
 *
 * A content script's *variables* are isolated from the page. The DOM it creates
 * is not, and that distinction is the whole defect. This product exists to hold
 * professional identity data; a slice of it was being published into a
 * third-party page as a side effect of drawing a dropdown.
 *
 * The companion now mounts in a **closed** shadow root, so page scripts cannot
 * reach it through `host.shadowRoot` either.
 *
 * Both halves are asserted here, and the second is the one that matters: a fix
 * that stopped rendering the panel would also empty the page, and would pass a
 * leak test while destroying the feature.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';

const HOST_ID = 'brandops-linkedin-companion-host';

/** Captured on the way past, because a closed root is unreachable afterwards. */
let capturedShadow: ShadowRoot | null = null;
let companyNames: string[] = [];
let opportunityTitles: string[] = [];

beforeAll(async () => {
  (globalThis as never as { chrome: unknown }).chrome = {
    storage: { local: { get: async () => ({}), set: async () => {} } },
    runtime: {
      id: 'test',
      getURL: (path: string) => `chrome-extension://test/${path}`,
      onMessage: { addListener: () => {} },
      sendMessage: async () => {}
    }
  };

  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false
  })) as never;

  // `closed` means the tree is unreachable from outside by design. The test
  // takes its handle at creation rather than weakening the mode to observe it.
  const realAttachShadow = Element.prototype.attachShadow;
  vi.spyOn(Element.prototype, 'attachShadow').mockImplementation(function attach(
    this: Element,
    init: Parameters<Element['attachShadow']>[0]
  ) {
    const root = realAttachShadow.call(this, init);
    capturedShadow = root;
    return root;
  });

  const { storageService } = await import('../../src/services/storage/storage');
  const { cloneDemoSampleData } = await import('../helpers/fixtures');
  const data = cloneDemoSampleData();
  companyNames = (data.companies ?? []).slice(0, 5).map((c: { name: string }) => c.name);
  opportunityTitles = (data.opportunities ?? [])
    .slice(0, 5)
    .map((o: { title?: string; name?: string }) => o.title ?? o.name ?? '')
    .filter(Boolean);
  vi.spyOn(storageService, 'getData').mockResolvedValue(data);

  window.history.replaceState({}, '', 'http://localhost/in/someone/');
  await import('../../src/content/linkedinOverlay');
  await new Promise((resolve) => setTimeout(resolve, 200));
});

describe('the companion still works', () => {
  it('mounts a host element in the page', () => {
    expect(document.getElementById(HOST_ID)).not.toBeNull();
  });

  it('builds the panel inside the shadow root', () => {
    // Without this, emptying the page would look like a successful fix.
    expect(capturedShadow, 'no shadow root was created').not.toBeNull();
    expect(capturedShadow!.querySelectorAll('button').length).toBeGreaterThan(0);
    expect(capturedShadow!.querySelector('style'), 'styles must travel with it').not.toBeNull();
  });

  it('still offers the workspace records the capture files against', () => {
    const options = Array.from(capturedShadow!.querySelectorAll('option')).map(
      (option) => option.textContent ?? ''
    );
    // The feature is intact: the data is present where the user needs it.
    expect(options.length).toBeGreaterThan(2);
    expect(companyNames.some((name) => options.some((option) => option.includes(name)))).toBe(true);
  });
});

describe('and the page cannot read any of it', () => {
  it('puts no workspace data in the host page', () => {
    const pageHtml = document.body.innerHTML;
    const leaked = [...companyNames, ...opportunityTitles].filter(
      (value) => value && pageHtml.includes(value)
    );
    expect(leaked, `readable by scripts on linkedin.com: ${leaked.join(', ')}`).toEqual([]);
  });

  it('exposes no text at all through the page DOM', () => {
    // The host is an empty div. Everything visible lives behind the shadow
    // boundary, so `document.body.textContent` has nothing of the user's in it.
    expect((document.body.textContent ?? '').trim()).toBe('');
  });

  it('keeps the shadow root closed to page scripts', () => {
    const host = document.getElementById(HOST_ID)!;
    // `open` would let any script on the page walk in through `host.shadowRoot`,
    // which would undo the isolation while looking like it was in place.
    expect(host.shadowRoot).toBeNull();
  });

  it('leaks nothing through the document stylesheet either', () => {
    // The styles used to go into `document.head`; they now travel with the
    // panel. Nothing about the user should be inferable from the page's head.
    const headHtml = document.head.innerHTML;
    const leaked = companyNames.filter((name) => name && headHtml.includes(name));
    expect(leaked).toEqual([]);
  });
});
