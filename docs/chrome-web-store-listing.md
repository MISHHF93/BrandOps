# Chrome Web Store: listing copy and technical justification

Use this when you fill in the **Chrome Web Store Developer Dashboard** for BrandOps. It aligns with `public/manifest.template.json`, federated auth in `src/services/sync/*Identity.ts`, and [`privacy-policy.md`](./privacy-policy.md) / [`public/privacy-policy.html`](../public/privacy-policy.html).

---

## 1. Privacy policy URL (required)

1. Host **`public/privacy-policy.html`** at a **public HTTPS** URL (GitHub Pages, your site, or object storage with a stable path).
2. Put that exact URL in the store listing **Privacy policy** field.
3. For in-extension links, set at build time:

   ```bash
   set VITE_PRIVACY_POLICY_URL=https://your-domain.example/privacy-policy.html
   npm run build
   ```

   (PowerShell: `$env:VITE_PRIVACY_POLICY_URL='https://...'; npm run build`)

Canonical policy text (longer): [`docs/privacy-policy.md`](./privacy-policy.md).

### Publisher OAuth client IDs (release build)

Set these so Welcome shows **Sign in** without users pasting IDs in Settings (optional override remains in Settings for development):

```bash
set VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
set VITE_GITHUB_CLIENT_ID=Iv1...
set VITE_LINKEDIN_CLIENT_ID=...
npm run build
```

See [`src/shared/config/oauthPublisherIds.ts`](../src/shared/config/oauthPublisherIds.ts) and **§5** below for redirect URIs.

---

## 2. Single purpose / justification summary (short)

**Single purpose:** BrandOps is a personal brand and execution cockpit (tasks, pipeline, content, publishing workflow) for technical builders. **Identity** and **narrow host permissions** exist so users can **sign in with Google, GitHub, or LinkedIn** (OAuth + PKCE) and, for LinkedIn, run optional on-page helpers while browsing LinkedIn.

---

## 3. `identity` permission

**Justification (paste/adapt):**  
BrandOps uses `chrome.identity.launchWebAuthFlow` and `chrome.identity.getRedirectURL` to complete **OAuth 2.0 authorization code + PKCE** flows with Google, GitHub, and LinkedIn. This is the supported Manifest V3 pattern for third-party sign-in without embedding login in an iframe. Tokens and profile snippets are stored **locally** in `chrome.storage`; there is no BrandOps server in the default build.

---

## 4. `host_permissions` (justify each pattern)

| Manifest entry | Why BrandOps needs it |
|----------------|------------------------|
| `https://*.linkedin.com/*` | **Content script** (`linkedinOverlay`) runs on LinkedIn pages the user visits for in-product LinkedIn features; OAuth flows also use LinkedIn domains. |
| `https://www.linkedin.com/oauth/v2/*` | LinkedIn OAuth **authorization** and **token** endpoints (`/authorization`, `/accessToken`). |
| `https://api.linkedin.com/*` | LinkedIn **OpenID userinfo** (`/v2/userinfo`) after sign-in. |
| `https://accounts.google.com/*` | Google OAuth **authorization** (`/o/oauth2/v2/auth`). |
| `https://oauth2.googleapis.com/*` | Google **token** endpoint. |
| `https://openidconnect.googleapis.com/*` | Google **userinfo** for display profile. |
| `https://github.com/*` | GitHub OAuth **authorize** and **access_token** under `github.com/login/oauth/`. |
| `https://api.github.com/*` | GitHub **user** and **user/emails** APIs for sign-in display. |

If you **remove** LinkedIn from the product later, you can drop the LinkedIn-related patterns (and the LinkedIn content script) together.

---

## 5. OAuth app configuration (redirect / callback URIs)

BrandOps uses **fixed path suffixes** with `chrome.identity.getRedirectURL`:

| Provider | Suffix (path segment) | Register as redirect URI |
|----------|----------------------|----------------------------|
| Google | `google-brandops` | `https://<YOUR_EXTENSION_ID>.chromiumapp.org/google-brandops` |
| GitHub | `github-brandops` | `https://<YOUR_EXTENSION_ID>.chromiumapp.org/github-brandops` |
| LinkedIn | `linkedin-brandops` | `https://<YOUR_EXTENSION_ID>.chromiumapp.org/linkedin-brandops` |

**How to get `<YOUR_EXTENSION_ID>`:** After the first upload (or for unpacked: the key in `chrome://extensions`), the id is stable. The redirect origin is always `https://<extension-id>.chromiumapp.org/`.

**Google Cloud Console:** OAuth client type **Chrome extension** or **Web application** (per your setup); add the redirect URI above. Use **PKCE**; do not put a client secret in the extension.

**GitHub:** OAuth App → Authorization callback URL = the GitHub row above. PKCE is supported; no client secret required for the extension flow.

**LinkedIn:** Developer app → redirect URLs = the LinkedIn row above. If LinkedIn requires a public client / PKCE-only app, follow LinkedIn’s native-app PKCE documentation linked from their portal.

The in-app **Settings → Integrations** UI exposes **Copy** helpers for each redirect URI when running inside the packaged extension.

---

## 6. Data safety (store “justification” / user trust)

- No **client secrets** ship in the extension bundle; flows use **PKCE** where applicable.
- Users can **Sign out** (Dashboard) and **Disconnect** per provider (Settings).
- Workspace data defaults to **local** storage; see the privacy policy for exceptions (export, future sync).

---

## 7. Optional: remote code

BrandOps should **not** use remote code; keep all executable logic in the submitted package per Web Store policy.
