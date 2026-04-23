# BrandOps

BrandOps is a command-first workspace for operators who manage pipeline, publishing, outreach, and integrations from one shell.

The active product is a single shell with five tabs:
- Pulse
- Chat
- Today
- Integrations
- Settings

---

## What Is Live Today

- Primary app document: `mobile.html` (mounts `MobileApp`)
- Same shell in other documents: `dashboard.html`, `welcome.html`, `integrations.html`
- Help: `help.html` (Knowledge Center manual — not the five-tab `MobileApp` shell)
- Background service worker handles scheduler, reminders, and runtime ingress
- Command execution is deterministic and persists to local workspace storage

See `APPLICATION_WIRING_STATUS.md` for detailed wiring and guardrails.

**Wayfinding:** use bottom nav for the five tabs. `integrations.html` (Chrome **options**) is the same shell with a different default tab—distinct from the in-shell **Integrations** tab. Help lives on `help.html`.

---

## Architecture At A Glance

```text
src/
  background/          MV3 service worker
  content/             content scripts (LinkedIn companion)
  pages/
    mobile/            main shell (Pulse/Chat/Today/Integrations/Settings)
    chatbotWeb/        renderer used by web entry documents
    dashboard/
    welcome/
    integrations/
    help/
  services/
    agent/             command intent + execution engine
    storage/           workspace persistence + normalization
    scheduling/        reminders + alarm lifecycle
    messaging/         runtime message contracts
    sync/              legacy OAuth sync modules (guarded/non-launch)
  shared/              navigation, config, account lifecycle gates, UI primitives
  rules/               intelligence rule defaults + runtime loading
  types/               domain model
```

---

## Runtime Surfaces

- `index.html` -> redirects to `mobile.html` (preserves query/hash)
- `mobile.html` -> primary shell, default tab is Pulse
- `dashboard.html` -> same shell; `?section=*` compatibility redirects to `mobile.html`
- `integrations.html` -> same shell, used as MV3 `options_ui` page
- `welcome.html` -> same shell with welcome-first entry behavior
- `help.html` -> `HelpKnowledgeRoot` / Knowledge Center
- Peripheral pages:
  - `public/oauth/*-brandops.html` (OAuth callback pages)
  - `public/privacy-policy.html`

Routing and link helpers live in:
- `src/shared/navigation/extensionLinks.ts`
- `src/shared/navigation/navigationIntents.ts`
- `src/shared/navigation/openExtensionSurface.ts`

---

## Command And Data Flow

1. User action in shell (Chat, quick action, settings command shortcut)
2. `MobileApp` calls `executeAgentWorkspaceCommand(...)`
3. Intent parser maps text to deterministic route
4. Engine mutates `BrandOpsData` via `storageService`
5. Audit trail and scheduler reconciliation update
6. UI refreshes from normalized workspace snapshot

Primary files:
- `src/pages/mobile/mobileApp.tsx`
- `src/services/agent/intent/commandIntent.ts`
- `src/services/agent/agentWorkspaceEngine.ts`
- `src/services/storage/storage.ts`

---

## Background Responsibilities

`src/background/index.ts` handles:
- install/startup initialization
- scheduler alarm wiring
- reminder notifications
- runtime message ingress:
  - `SYNC_SCHEDULER`
  - `AGENT_CHANNEL_EVENT`
  - `AGENT_CHANNEL_WEBHOOK`
  - `AGENT_BRIDGE_ENVELOPE`

On first install, welcome routing is gated by launch/session state:
- `src/shared/account/launchLifecycleGate.ts`
- `src/shared/account/launchAccess.ts`
- `src/shared/identity/sessionAccess.ts`

---

## Storage Model

- Canonical workspace key: `brandops:data`
- Reads/writes are normalized to protect against malformed persisted state
- Storage adapter prefers `chrome.storage`; falls back to web storage
- Chat thread and quick command chips are separate UI-local keys

Primary files:
- `src/services/storage/storage.ts`
- `src/shared/storage/browserStorage.ts`
- `src/pages/mobile/mobileApp.tsx`

---

## Launch UX Gates

The shell enforces:
- Auth gate (when not using preview ungated flows)
- Membership gate **only if** `VITE_ENFORCE_MEMBERSHIP_GATE=1` (or `true`) at build time — omit for local dev / building without Stripe

Shared gate contract:
- `shouldRequireLaunchAuth(...)`
- `shouldRequireLaunchMembership(...)`
- `canOpenLaunchWorkspace(...)`

Files:
- `src/shared/account/launchLifecycleGate.ts`
- `src/pages/mobile/mobileApp.tsx`
- `src/background/index.ts`

---

## Legacy And Guarded Areas

- `dashboard.html?overlay=*` is retired; fallback routes are deterministic.
- Legacy sync OAuth modules are quarantined behind `VITE_ENABLE_LEGACY_OAUTH_SYNC`.
- Older multi-panel cockpit/module stacks are removed from active page entrypoints.

References:
- `src/pages/dashboard/dashboardRedirect.ts`
- `src/services/sync/nonLaunchOauthGuard.ts`
- `APPLICATION_WIRING_STATUS.md`

---

## Development

Install:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Notes:
- Dev is fixed to `http://localhost:5173`.
- `scripts/dev.mjs` handles Windows port cleanup behavior.

---

## Build And Quality

Typecheck:

```bash
npm run typecheck
```

Tests:

```bash
npm run test
```

Build:

```bash
npm run build
```

Full quality gate:

```bash
npm run check
```

Release pipeline:

```bash
npm run release
```

This runs check + build + dist verification + release packaging.

---

## Load Unpacked Extension (Chrome/Edge)

1. `npm run build`
2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable Developer mode
4. Click Load unpacked
5. Select `dist/`

---

## Key Docs

- Wiring and current state: `APPLICATION_WIRING_STATUS.md`
- Frontend/backend path tracing: `BACKEND_FRONTEND_TRACEBACK.md`
- AI model fundamentals: `docs/AI_CHATBOT_FUNDAMENTALS.md`
- Cockpit command surface map: `docs/cockpit-command-surface-map.md`
- Data model: `docs/data-model.md`

