/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public HTTPS URL to hosted privacy policy (Chrome Web Store + in-app link). */
  readonly VITE_PRIVACY_POLICY_URL?: string;
  /** Publisher OAuth client IDs (Chrome Web Store build); optional override in Settings. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GITHUB_CLIENT_ID?: string;
  readonly VITE_LINKEDIN_CLIENT_ID?: string;
  /**
   * Hosted preview (e.g. Vercel): show magic-link / open preview sign-in on Welcome.
   * Never set for Chrome Web Store release builds.
   */
  readonly VITE_VERCEL_PREVIEW_SIGNIN?: string;
  /** Shared secret (≥8 chars). Magic link: `?preview_magic=<token>`. Omit if using open preview only. */
  readonly VITE_PREVIEW_MAGIC_TOKEN?: string;
  /** If `1`/`true`, allow one-click preview sign-in without a token (private demos only). */
  readonly VITE_PREVIEW_OPEN_SIGNIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
