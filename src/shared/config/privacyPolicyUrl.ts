import { buildPrivacyPolicyUrl } from '../navigation/extensionLinks';
import { resolveExtensionUrl } from '../navigation/extensionRuntime';

/**
 * Public HTTPS URL for the privacy policy, set at build time for store compliance and in-app links.
 * Listing/privacy alignment: see repo root `FRONTEND_MARKET_READINESS_PLAN.md` (Chrome Web Store section).
 */
function getResolvedPrivacyPolicyUrl(): string | undefined {
  const raw = import.meta.env.VITE_PRIVACY_POLICY_URL;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('https://')) return undefined;
  return trimmed;
}

/** Hosted policy when configured; otherwise the bundled `privacy-policy.html` in the extension. */
export function getPrivacyPolicyHref(): string {
  const hosted = getResolvedPrivacyPolicyUrl();
  if (hosted) return hosted;
  return resolveExtensionUrl(buildPrivacyPolicyUrl());
}
