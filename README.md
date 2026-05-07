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
