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
  /**
   * Hosted preview only: allow opening dashboard.html without OAuth (seed workspace).
   * On Vercel, cockpit is ungated automatically unless set to `0`/`false`.
   */
  readonly VITE_PREVIEW_COCKPIT_UNGATED?: string;
  /** Injected on Vercel builds (`VERCEL=1`); used for hosted demo routing only. */
  readonly VITE_VERCEL?: string;
  /**
   * Optional HTTPS URL to a JSON intelligence rules pack (partial patch over embedded defaults).
   * When unset, the client may still load `/brandops-intelligence-rules.json` from the deploy origin.
   */
  readonly VITE_INTELLIGENCE_RULES_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
