/**
 * Hosted (e.g. Vercel) preview sign-in — compile-time flags only.
 * Chrome Web Store / production extension builds must leave these unset so preview UI is omitted.
 */

export function isPreviewDeploymentSignInEnabled(): boolean {
  const v = import.meta.env.VITE_VERCEL_PREVIEW_SIGNIN;
  return v === 'true' || v === '1';
}

/** One-click preview without a token — use only for private demo URLs. */
export function isPreviewOpenSignInEnabled(): boolean {
  const v = import.meta.env.VITE_PREVIEW_OPEN_SIGNIN;
  return v === 'true' || v === '1';
}

export function getPreviewMagicTokenExpected(): string {
  return (import.meta.env.VITE_PREVIEW_MAGIC_TOKEN ?? '').trim();
}

export function isPreviewMagicConfigured(): boolean {
  return getPreviewMagicTokenExpected().length >= 8;
}

export function isPreviewMagicTokenValid(token: string): boolean {
  const expected = getPreviewMagicTokenExpected();
  if (expected.length < 8) return false;
  return token.trim() === expected;
}

/** Preview panel can show a working path: open sign-in and/or shared magic token. */
export function canUseVercelPreviewSignIn(): boolean {
  if (!isPreviewDeploymentSignInEnabled()) return false;
  return isPreviewOpenSignInEnabled() || isPreviewMagicConfigured();
}

/**
 * Load the dashboard with local seed data — no Google / GitHub / LinkedIn OAuth session.
 *
 * - **Vercel:** Automatic when the bundle is built on Vercel (`VERCEL=1` → `import.meta.env.VITE_VERCEL`).
 *   No OAuth client IDs required for a hosted demo. Opt out with `VITE_PREVIEW_COCKPIT_UNGATED=0`.
 * - **Local:** Set `VITE_PREVIEW_COCKPIT_UNGATED=1` in `.env.development` (see repo).
 * - **Extension zip / local `vite build`:** `VERCEL` is unset → gated unless you set the explicit flag.
 */
export function isPreviewCockpitUngated(): boolean {
  const raw = (import.meta.env.VITE_PREVIEW_COCKPIT_UNGATED ?? '').trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'off') {
    return false;
  }
  if (raw === '1' || raw === 'true' || raw === 'on') {
    return true;
  }
  return import.meta.env.VITE_VERCEL === '1';
}
