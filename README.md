# BrandOps

Command-first operator workspace — Chrome extension (MV3) with a five-tab shell (Pulse, Chat, Today, Integrations, Settings), optional LinkedIn companion content script, and local-first workspace storage.

## Quick start

```bash
npm install
npm run dev
```

Primary surface in dev: **`mobile.html`** (see `npm run dev:mobile`).

## Market readiness & architecture

All evaluation, gaps, phased checklist, and submission notes live in **`FRONTEND_MARKET_READINESS_PLAN.md`**.

## Quality gates

```bash
npm run check      # typecheck + ESLint
npm run format     # Prettier check (also runs inside release & CI)
npm run test
npm run build
npm run release    # check + Prettier + unit tests + integration tests + build + verify dist + tarball
```

GitHub Actions runs **check → format → tests → integration → build → verify-dist** on push/PR (see `.github/workflows/ci.yml`; tarball packaging is local-only via `npm run package:release`).

Optional static preview after build: **`npm run preview`** (port 4173; no real `chrome.*` APIs).

Load unpacked after build: **`dist/`** in Chrome/Edge Extensions.
