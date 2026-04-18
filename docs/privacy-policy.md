# BrandOps Privacy Policy

**Effective date:** April 16, 2026

This policy describes how the **BrandOps** browser extension (“BrandOps”, “we”, “us”) handles information when you use the product. It is written to match the **current local-first** implementation: there is **no BrandOps-operated account server** unless you separately deploy one; sign-in uses **Google**, **GitHub**, and **LinkedIn** only for authentication and profile display as described below.

---

## 1. Who this applies to

Anyone who installs and uses BrandOps from the Chrome Web Store (or an equivalent distribution of this extension package).

---

## 2. What BrandOps stores on your device

BrandOps keeps your **workspace** (for example tasks, pipeline, content drafts, settings, and exports you create) in **Chrome’s extension storage** (`chrome.storage`) on your device. That data **stays on your device** unless you **export** it or a future version explicitly syncs to a server you configure.

**Cockpit access:** Opening the main dashboard requires a **connected** federated sign-in (Google, GitHub, or LinkedIn). There is no separate “guest” path to the cockpit in the current product.

---

## 3. Federated sign-in (Google, GitHub, LinkedIn)

BrandOps can use **OAuth 2.0 with PKCE** so you can sign in or sign up through:

| Provider | What we call | Typical purposes in BrandOps |
|----------|--------------|------------------------------|
| Google | Authorization, token, OpenID userinfo endpoints | Sign-in; display name, email, avatar where granted by scopes |
| GitHub | Authorization, token, user and email APIs | Sign-in; display name, email, avatar where granted by scopes |
| LinkedIn | Authorization, token, userinfo API | Sign-in; display name, email, avatar where granted by scopes |

**Tokens** (access token, and refresh token if the provider returns one) and **minimal profile fields** used for “Signed in as …” are stored **locally** in extension storage. We do **not** send those tokens to a BrandOps backend in the default build.

**Client IDs** for OAuth apps are entered in **Settings** and stored locally; **client secrets are not** embedded in the extension (PKCE public client flows).

---

## 4. Network requests

Besides Chrome’s own services and the extension package host (if any), BrandOps may contact:

- **Google** (`accounts.google.com`, `oauth2.googleapis.com`, `openidconnect.googleapis.com`) for Google sign-in.
- **GitHub** (`github.com`, `api.github.com`) for GitHub sign-in.
- **LinkedIn** (`linkedin.com`, `api.linkedin.com`) for LinkedIn sign-in and, where enabled, **LinkedIn page features** implemented via a **content script** that runs only on LinkedIn sites you visit.

We do **not** sell your personal information.

---

## 5. Sign out and disconnect

- **Sign out** (from the Dashboard) clears federated tokens and related session state as implemented in the product.
- **Disconnect** per provider (in Settings) removes that provider’s tokens and profile cache without necessarily clearing everything else.

You can also remove the extension to delete locally stored data (subject to browser behavior).

---

## 6. Changes and contact

We may update this policy when the product changes (for example if a cloud sync or backend is added). The **effective date** at the top will be revised.

**Contact:** Use the **support contact** or **privacy contact** shown on the **Chrome Web Store listing** for BrandOps (publisher-maintained). If none is listed yet, use the publisher’s support channel linked from the same listing after publication.

---

## 7. Hosting this policy

For Chrome Web Store submission, this document should be available at a **public HTTPS URL** (for example the same HTML under `public/privacy-policy.html` deployed to static hosting). Set `VITE_PRIVACY_POLICY_URL` at build time to that URL so in-product links resolve correctly. See [`chrome-web-store-listing.md`](./chrome-web-store-listing.md).
