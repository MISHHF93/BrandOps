/**
 * Extension runtime helpers: one place for chrome.runtime URL resolution so pages
 * and navigation do not each re-implement the same guards and dev fallbacks.
 *
 * App routing uses **query strings** on `.html` pages (see `extensionLinks.ts`), not `#` fragments.
 * `chrome.runtime.getURL()` must receive the **packaged path only** (`file.html`); anything after
 * `?` or `#` is appended after so `dashboard.html?section=today` resolves correctly.
 */
export function resolveExtensionUrl(spec: string): string {
  const match = spec.match(/^([^?#]+)([\s\S]*)$/);
  const pathOnly = match ? match[1] : spec;
  const rest = match && match[2] !== undefined ? match[2] : '';

  if (typeof chrome !== 'undefined' && typeof chrome.runtime?.getURL === 'function') {
    return chrome.runtime.getURL(pathOnly) + rest;
  }
  if (typeof window !== 'undefined' && window.location?.href) {
    return new URL(spec, window.location.href).toString();
  }
  const base = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  return `${base}${rest}`;
}

/** Extension semver from manifest, or empty string when unavailable (e.g. plain Vite dev). */
export function getExtensionManifestVersion(): string {
  try {
    const v = typeof chrome !== 'undefined' ? chrome.runtime?.getManifest?.()?.version : undefined;
    return typeof v === 'string' ? v : '';
  } catch {
    return '';
  }
}
