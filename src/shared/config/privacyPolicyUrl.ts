import { buildPrivacyPolicyUrl } from '../navigation/extensionLinks';
import { resolveExtensionUrl } from '../navigation/extensionRuntime';

/**
 * Public HTTPS URL for the privacy policy, set at build time for store compliance and in-app links.
 * Align store listing answers with bundled `public/privacy-policy.html` and actual network behavior.
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
