/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public HTTPS URL to hosted privacy policy (Chrome Web Store + in-app link). */
  readonly VITE_PRIVACY_POLICY_URL?: string;
  /** Publisher OAuth client IDs (Chrome Web Store build); optional override in Settings. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GITHUB_CLIENT_ID?: string;
  readonly VITE_LINKEDIN_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
