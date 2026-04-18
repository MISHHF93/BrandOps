/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public HTTPS URL to hosted privacy policy (Chrome Web Store + in-app link). */
  readonly VITE_PRIVACY_POLICY_URL?: string;
  /** Publisher OAuth client IDs (Chrome Web Store build); optional override in Settings. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GITHUB_CLIENT_ID?: string;
  readonly VITE_LINKEDIN_CLIENT_ID?: string;
  /**
   * Set to `1` or `true` only for **demo/preview** builds (e.g. Vercel) so "Enter demo mode"
   * works without `chrome.identity`. **Never** enable for Chrome Web Store releases.
   */
  readonly VITE_DEMO_BYPASS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
