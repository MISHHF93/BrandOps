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
