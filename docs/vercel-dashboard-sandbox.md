# Vercel: open straight to the dashboard (hosted “sandbox”)

This flow is **separate from the Chrome Web Store / extension** identity model: it is only for **hosted previews** (e.g. Vercel) where you want visitors to land on the cockpit with **no OAuth step**, using the bundled **seed workspace**.

## What lives in the repo vs outside

| Piece                                           | In repository                                      | Outside repository                                                |
| ----------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| Redirect `/` → `/dashboard.html`                | `vercel.json`                                      | —                                                                 |
| Bypass OAuth + skip onboarding when flag is set | App code + `docs/samples/vercel-preview-build.env` | Actual **values** in **Vercel → Project → Environment Variables** |
| OAuth client IDs / secrets                      | `.env.example` only (commented)                    | Vercel env or `.env.local` (gitignored)                           |

Do **not** commit real OAuth secrets or production tokens. Preview “sandbox” behavior is controlled by **build-time** `VITE_*` flags (Vite inlines them at `npm run build`).

## Steps on Vercel

1. **Environment variables** (Preview and/or Production — match where you deploy):
   - `VITE_PREVIEW_COCKPIT_UNGATED` = `1`  
     Required so the dashboard loads **without** Google/GitHub/LinkedIn connected.

2. **Redeploy** after changing env vars so the client bundle is rebuilt with the new values.

3. Open the deployment root URL. You should be **redirected** to `/dashboard.html` (see `vercel.json`), same idea as opening `http://localhost:5173/dashboard.html` in dev.

## Local dev parity

- `.env.development` can set `VITE_PREVIEW_COCKPIT_UNGATED=1` for local testing (already documented in `.env.example`).
- `index.html` still client-redirects to `/dashboard.html` for non-Vercel static hosts that do not use `vercel.json`.

## Chrome extension builds

Store / production extension packages should **omit** `VITE_PREVIEW_COCKPIT_UNGATED` so the real product still requires federated sign-in where applicable.
