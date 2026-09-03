/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public HTTPS URL to hosted privacy policy (Chrome Web Store + in-app link). */
  readonly VITE_PRIVACY_POLICY_URL?: string;
  /**
   * Optional absolute site origin (no trailing slash), e.g. `https://your-app.vercel.app`.
   * Build-time: makes `og:image` / `twitter:image` absolute for link previews. Omit for path-only `/branding/og-image.png`.
   */
  readonly VITE_PUBLIC_ORIGIN?: string;
  /**
   * Development-only membership gate. This repo has no verified production entitlement service.
   */
  readonly VITE_ENFORCE_MEMBERSHIP_GATE?: string;
  /** Optional HTTPS Stripe Checkout navigation URL; opening it does not activate membership. */
  readonly VITE_STRIPE_CHECKOUT_URL?: string;
  /** Optional HTTPS Stripe Billing Portal navigation URL. */
  readonly VITE_STRIPE_BILLING_PORTAL_URL?: string;
  /**
   * If `1` or `true`, skip the on-device preview-identity gate so users land directly in the app.
   */
  /**
   * RevenueCat public SDK key for this platform. Public by design — RevenueCat
   * keys are safe in a client and are scoped to reads plus purchase initiation;
   * the entitlement itself is verified with the store.
   *
   * Absent means purchasing is unavailable rather than free: `entitlements.ts`
   * reports `not-configured` and `isPremium` stays false.
   */
  readonly VITE_REVENUECAT_IOS_KEY?: string;
  readonly VITE_REVENUECAT_ANDROID_KEY?: string;
  readonly VITE_SKIP_LAUNCH_AUTH?: string;
  /**
   * Optional HTTPS URL to a JSON intelligence rules pack (partial patch over embedded defaults).
   * When unset, the client may still load `/brandops-intelligence-rules.json` from the deploy origin.
   */
  readonly VITE_INTELLIGENCE_RULES_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
