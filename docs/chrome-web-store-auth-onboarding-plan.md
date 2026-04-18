# Chrome Web Store: third-party login, onboarding, and identity

**Version 2.3** — This document corrects an earlier framing. BrandOps is intended to use **Sign in with Google**, **Sign in with LinkedIn**, and **Sign in with GitHub** as **third-party federated authentication**: users **log in and sign up** to the application through those providers, not merely “link a profile” as an optional integration.

It complements [`product-structure.md`](./product-structure.md) and [`data-model.md`](./data-model.md).

---

## 1. Product intent (non-negotiable wording)

### What “login” means here

- **Third-party login** = the user proves who they are using an identity provider (IdP): **Google**, **LinkedIn**, or **GitHub**.
- **Sign up** = first-time use of the product **through one of those providers** (create/bind the operator identity and workspace access).
- **Sign in** = returning user **authenticates again** with the same or another linked provider, per product rules.

This is the same mental model as “Log in with Google” on a typical web app. The extension must communicate that clearly: these buttons are **authentication**, not a secondary “integration” or “nice-to-have name on the dashboard.”

### What this is not

- **Not** “optional profile linking” that users can skip while still being “fully in” the product—unless you explicitly define a **guest / offline** mode and accept support and privacy implications.
- **Not** only “sync hub” or “CRM connector” semantics; OAuth here is **identity for app access**, first.

---

## 2. Goals and constraints

### Product goals

- **Auth-first onboarding**: After install, the user sees **Sign in with Google / LinkedIn / GitHub** as the primary path to **use** BrandOps.
- **Consistent federated UX**: Same button patterns, error handling, and “signed in as …” confirmation across Welcome, popup (if applicable), and recovery flows.
- **Clear privacy story**: What touches Google/GitHub/LinkedIn (OAuth, token exchange, profile APIs), what stays in `chrome.storage`, and whether any **BrandOps server** exists (see §7).

### Chrome Web Store and Manifest V3

- Use **`chrome.identity`** (`launchWebAuthFlow`, `getRedirectURL`) for OAuth redirects.
- **`host_permissions`** only for endpoints you call (authorization, token, userinfo); justify each in the listing.
- No login **iframes**; authorization code + **PKCE** where required.

---

## 3. Information architecture

| Surface | Purpose |
|--------|---------|
| **Welcome / Auth** (`welcome.html` or dedicated `auth.html`) | **Sign in** and **Sign up** via third-party buttons; privacy; recovery links. |
| **Dashboard** | Requires **`canAccessApp`**: a **connected** Google, GitHub, or LinkedIn session only (`hasFederatedSession`). |
| **Settings** | OAuth: optional **override** client IDs (dev); publisher IDs via **`VITE_*_CLIENT_ID`** at build; disconnect; **primary IdP** if multiple linked. |
| **Extension popup** | Optional: compact “Sign in” / “Signed in as …” consistent with full pages. |

**Copy rule:** Prefer **“Sign in with Google”** / **“Continue with Google”** (and equivalents) over **“Link your profile”** as the primary headline when the goal is app login.

---

## 4. User journeys

### 4.1 First-time user (sign up)

1. Install extension → land on **Welcome**.
2. See value prop + **Sign in with Google / LinkedIn / GitHub** as the main CTA block.
3. Complete OAuth with chosen provider.
4. BrandOps **creates or binds** the workspace to that identity (local and/or server—see §7).
5. Optional: theme/cadence checklist, then Dashboard.

### 4.2 Returning user (sign in)

1. Open Welcome or popup → **Sign in** with a linked provider (or add another provider if product allows multiple).
2. On token expiry: **re-auth** flow with clear errors (no silent failure).

### 4.3 Sign out

- Clear local tokens and session state; return user to auth screen.
- If a backend session exists, invalidate server-side session too.

---

## 5. Data model (conceptual)

### 5.1 Provider record (per IdP)

- Stable subject id (`sub` / GitHub id / LinkedIn id), display name, email (if granted), avatar URL (optional).
- Tokens: access (and refresh if applicable), expiry, scopes.
- **Primary IdP** when multiple providers are linked: which identity drives “Signed in as …” and authorization.

### 5.2 Session concept

- **Minimum**: “User is signed in” = valid OAuth connection + refresh path or re-login.
- **Stronger**: Backend-issued **BrandOps session** after IdP token validation (recommended if you need multi-device, recovery, or org features).

---

## 6. Gap analysis: vision vs extension-only reality

| Aspect | Target product (your intent) | Typical extension-only implementation |
|--------|------------------------------|--------------------------------------|
| **Login meaning** | User **uses the app** by signing in with Google/LinkedIn/GitHub | OAuth succeeds; tokens stored locally; **no** central “BrandOps account” DB |
| **Sign up** | Distinct first-time path | Often same OAuth flow + “workspace initialized” flag |
| **Recovery** | Email / support / device transfer | Limited without a server |
| **Enforcement** | Dashboard locked until signed in | Implemented: `DashboardAuthGate` + `canAccessApp` (= `hasFederatedSession` only) |

**Implementation note:** Publisher OAuth client IDs: `VITE_GOOGLE_CLIENT_ID`, `VITE_GITHUB_CLIENT_ID`, `VITE_LINKEDIN_CLIENT_ID` (see [`src/shared/config/oauthPublisherIds.ts`](../src/shared/config/oauthPublisherIds.ts)). Effective client ID = env **or** Settings override. A **backend** is still optional for multi-device accounts.

---

## 7. Architecture fork: local-only vs backend

### Option A — Local-first (no BrandOps server)

- OAuth with Google / GitHub / LinkedIn; tokens and profile in **encrypted or plain `chrome.storage`** (threat-model accordingly).
- **Sign in / sign up** = same flows; “account” is **local workspace + IdP subject**.
- Listing must say: authentication data stays on device except calls to Google/GitHub/LinkedIn.

### Option B — Backend session (recommended for “real” SaaS login)

- Extension sends IdP **ID token** or auth code to **your API**; API creates **BrandOps user**, session JWT, optional refresh.
- Enables true **sign out**, device list, and future sync.

The UI (third-party buttons) can stay the same; only the **post-OAuth** step changes.

---

## 8. Implementation checklist (product-complete third-party login)

Codebase alignment (ongoing; listing/policy items remain your responsibility):

- [x] **Copy**: Welcome and Integrations use **sign in / third-party login** language; “link profile” hero framing removed.
- [x] **Policy**: Dashboard requires a **federated** session only (`canAccessApp` → `hasFederatedSession` in `sessionAccess.ts`).
- [x] **Sign out** vs **disconnect**: Dashboard **Sign out** clears all IdP tokens and legacy `guestSessionAt` / `welcomeCompletedAt` if present; Integrations **Disconnect** is per provider only.
- [x] **Privacy policy** — Text: [`docs/privacy-policy.md`](./privacy-policy.md). Hostable HTML: [`public/privacy-policy.html`](../public/privacy-policy.html). Set **`VITE_PRIVACY_POLICY_URL`** at build time; Welcome and Settings → Integrations link when set. Store listing uses the same HTTPS URL.
- [x] **Chrome Web Store** listing — Paste-ready **`identity`** and **`host_permissions`** justifications: [`docs/chrome-web-store-listing.md`](./chrome-web-store-listing.md).
- [x] **OAuth consoles** — Redirect / callback URIs per IdP (`chrome.identity.getRedirectURL` suffixes): documented in **§5** of [`chrome-web-store-listing.md`](./chrome-web-store-listing.md).

---

## 9. Compliance (Web Store + OAuth)

- [x] Public privacy policy URL — host `privacy-policy.html`, enter URL in the listing, set `VITE_PRIVACY_POLICY_URL` for in-app links (see [`chrome-web-store-listing.md`](./chrome-web-store-listing.md) §1).
- [x] No client secrets in the extension bundle (PKCE / public clients) — verified; no `client_secret` in source; GitHub uses PKCE without a secret.
- [x] User can revoke: **Sign out** + **disconnect** from Settings (Dashboard sign-out clears all IdP sessions).

---

## 10. Source of truth

- **v2** supersedes any v1-era notes elsewhere: auth is **third-party login**, not optional “integration linking” as the primary story.
- Implementation details live in code (`src/shared/identity/sessionAccess.ts`, `useBrandOpsStore.signOutSession`, Welcome/Dashboard copy). Do not duplicate conflicting phased “P0/P1” roadmaps in other markdown files.

---

## Document history

| Version | Summary |
|---------|---------|
| 1.0 | Superseded — do not use for product wording. |
| 2.0 | **Third-party federated login**; guest mode; local vs backend; checklist. |
| 2.1 | Checklist aligned with implemented session gate + sign-out + copy updates. |
| 2.2 | Privacy policy + listing justifications + OAuth redirect doc; `VITE_PRIVACY_POLICY_URL` wiring. |
| 2.3 | Publisher `VITE_*_CLIENT_ID`; `canAccessApp` federated-only; removed guest cockpit path. |
