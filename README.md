# BrandOps

Chrome extension (MV3): command-first operator workspace with **local-first** workspace storage, a five-tab shell (`mobile.html`), on-device agent commands, and optional OpenAI-compatible endpoints for hosted **`ask:`** lines.

## Quick start

```bash
npm install
npm run dev:mobile
```

After **`npm run build`**, load **`dist/`** as an unpacked extension in Chrome or Edge (Developer mode).

## Quality gates

```bash
npm run check              # TypeScript + ESLint
npm run format             # Prettier check (runs in CI)
npm run test               # Vitest unit + performance
npm run test:integration
npm run build              # tsc + Vite + manifest copy
npm run verify:dist        # Dist artifact contract
npm run release            # check + format + tests + integration + build + verify + tarball
```

GitHub Actions mirrors **`check` → `format` → tests → `build` → `verify:dist`** (no local tarball).

## Where users learn the product

- **Help** (`help.html`) — Knowledge Center copy lives in source (`src/shared/help/`).
- **Privacy** — Bundled `public/privacy-policy.html`; optional hosted HTTPS URL via **`VITE_PRIVACY_POLICY_URL`** at build time.

## Secrets and OAuth

Copy **`.env.example`** to **`.env.local`** (gitignored) for Vite env vars and OAuth client IDs. Register provider redirect URIs to match how you ship (local dev, hosted preview, or extension `chrome.identity`).

## Responsive shell

The primary **`mobile.html`** shell uses **`100dvh`**, safe-area insets (`env(safe-area-inset-*)`), and a shared responsive column width token (**[`shellLayoutTokens.ts`](src/pages/mobile/shellLayoutTokens.ts)** — scales from phone through desktop/extension tabs). HTML entry points that mount app surfaces use **`viewport-fit=cover`** alongside `width=device-width` so notched phones and Capacitor WebViews behave consistently.

### Responsive layout roadmap status

**Shipped:** shared responsive column width (**Phase A**), **`viewport-fit=cover`** parity on shell HTML (**Phase B**), and store/responsive documentation (**Phase D**).

**Deferred — Phase C (two-pane desktop):** A ChatGPT-style **two-pane** layout at **`lg`/`xl`** (primary thread + narrow read-only glance column) is **not** implemented until product explicitly approves it. Sketch when ready: `lg` grid with sticky aside + keep composer and bottom nav aligned to the **primary** column only (`mobileApp.tsx` / [`shellLayoutTokens.ts`](src/pages/mobile/shellLayoutTokens.ts)).

### Product backlog (separate epics)

These are **not** part of the responsive-shell roadmap:

- **Extension OAuth runtime** — `chrome.identity` / `launchWebAuthFlow` for live token exchange is not wired in application TS yet (README and **`.env.example`** describe setup intent).
- **Integration vendor sync** — Hub rows are local registry + honesty UX; automated pulls from CRM/issue tools are a separate pipeline epic.
- **Bundled on-device NLP** — See **`internal-on-device-nlp`** in [`nlpCapabilityManifest.ts`](src/services/ai/nlpCapabilityManifest.ts) (**planned**): no WASM/ONNX runtime shipped; `localModelEnabled` remains a future adapter hook.

## One codebase, multiple stores

The **same Vite build output (`dist/`)** backs:

| Surface                   | Artifact                                                                                    | Notes                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Chrome Web Store**      | MV3 extension bundle from **`dist/`**                                                       | Load unpacked for dev; zip **`dist/`** + manifest for submission.                    |
| **Google Play (Android)** | Capacitor Android app (**[`capacitor.config.ts`](capacitor.config.ts)** → `webDir: 'dist'`) | Run **`npm run build`** then **`npm run android:sync`**; sign AAB in Play Console.   |
| **Apple App Store (iOS)** | Capacitor iOS app (same `webDir`)                                                           | Requires **Apple Developer Program** and typically **macOS + Xcode** to archive/IPA. |

Users install **different packages** per platform; you maintain **one** React/Tailwind source tree.
