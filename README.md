# BrandOps

**BrandOps** is a **Chrome Extension (Manifest V3)** and optional **Capacitor mobile shell** for a command-first operator workspace: local-first workspace JSON, the **Pulse** read-only metric strip on Plan and Today (filtered summaries on Integrations and Settings), optional Assistant requests to a user-configured OpenAI-compatible host, and LinkedIn overlay tooling. One React + TypeScript + Tailwind tree builds **`dist/`** for extension packaging and native **`webDir`**.

---

## What ships from this repo

| Surface                   | Output                        | How                                                                                                     |
| ------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Chrome Web Store**      | Unpacked / zipped **`dist/`** | `npm run build` → load unpacked or ship manifest + bundle (`scripts/copy-manifest.mjs`)                 |
| **Android (Google Play)** | Capacitor app                 | [`capacitor.config.ts`](capacitor.config.ts) (`webDir: 'dist'`) → `npm run android:sync` / Play signing |
| **iOS (App Store)**       | Same web bundle               | `npm run ios:*` on macOS with Xcode when the platform is added                                          |

Platform installs **different store listings**; the codebase stays single-source.

---

## Tech stack

- **UI:** React 18, Vite 7, Tailwind CSS 3, Lucide icons, `clsx`, `cmdk` command palette patterns
- **Extension:** MV3 service worker (`background.js` build), LinkedIn content script, alarms/notifications, and `chrome.storage` permissions declared in [`public/manifest.template.json`](public/manifest.template.json)
- **Native wrapper:** `@capacitor/core` + Android/iOS
- **Tests:** Vitest (unit + integration + performance scripts)

---

## Repository map

| Area                                                                           | Role                                                                                                                                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`src/pages/mobile/`](src/pages/mobile/)                                       | Primary shell: [`mobileApp.tsx`](src/pages/mobile/mobileApp.tsx), workspace hub, chat, settings, integrations, cockpit routing via [`mobileShellQuery.ts`](src/pages/mobile/mobileShellQuery.ts) |
| [`src/services/storage/storage.ts`](src/services/storage/storage.ts)           | Workspace persistence (`brandops:data`), normalization, import/export                                                                                                                            |
| [`src/shared/storage/browserStorage.ts`](src/shared/storage/browserStorage.ts) | Adapter: extension → `chrome.storage.local`; WebView → `localStorage`; tests → memory                                                                                                            |
| [`src/services/ai/`](src/services/ai/)                                         | Bridge secrets ([`aiSecretsAccess.ts`](src/services/ai/aiSecretsAccess.ts)), NLP manifests, hosted inference wiring                                                                              |
| [`src/shared/help/`](src/shared/help/)                                         | Knowledge Center source consumed by **`help.html`**                                                                                                                                              |
| [`public/`](public/)                                                           | Static assets, legacy inactive OAuth callback placeholders under **`public/oauth/`**, privacy policy template                                                                                    |

HTML entry points at repo root include **`mobile.html`** (main shell), **`help.html`**, **`welcome.html`**, **`dashboard.html`**, **`integrations.html`** (also MV3 options UI target).

---

## Quick start

```bash
npm install
npm run dev:mobile    # opens /mobile.html (Vite strict port — default localhost:5173)
```

Production-ish bundle:

```bash
npm run build
```

`npm run build` regenerates deterministic icons and social preview assets from the committed
`public/brandops-crown.svg` fallback or `public/branding/brandops-logo.png` when you add a higher
fidelity source logo.

Load **`dist/`** as an unpacked extension in Chrome or Edge (Developer mode).

For Capacitor, `npm run android:sync` / `npm run ios:sync` first runs `cap:prepare`, which copies
the built `mobile.html` entry over the staging `dist/index.html`. This keeps the hosted root URL as
the marketing site while ensuring the native WebView boots the actual app shell.

---

## Shell routing (`mobile.html`)

- Bottom dock exposes **Assistant** (`chat`) and **Workspace** (`workspace`) — see [`mobileTabConfig.ts`](src/pages/mobile/mobileTabConfig.ts).
- **`?section=`** selects tabs and cockpit workstreams: reserved tokens include `pulse`, `timeline`, `home`, `hub` → **Workspace hub**; `daily` / `cockpit` → Cockpit with Today highlighted by default. Details in [`mobileShellQuery.ts`](src/pages/mobile/mobileShellQuery.ts).
- Deep links can include fragment anchors for Settings sections (e.g. résumé grounding phases).

---

## Local-first data

- Workspace blob **`BrandOpsData`** is keyed **`brandops:data`** and persisted via the browser adapter above — extension installs use **`chrome.storage.local`**.
- Hosted AI keys and similar secrets stay **outside** workspace JSON (see **`brandops_ai_openai_compat_key`** and Settings AI surfaces). They are device-local browser/WebView credentials, not a native mobile keychain.
- Imported and stored workspace blobs are normalized before use. Persistence is still whole-workspace storage, so a future transactional/CAS layer is needed for robust simultaneous multi-tab writes.

### Assistant citations & AI I/O traces

Hosted Assistant replies may include optional structured provenance (`brandOpsAiProvenance` / answer+citations JSON — see [`hostedAskTurn.ts`](src/services/ai/hostedAskTurn.ts)). [`aiIoProvenance.ts`](src/services/ai/aiIoProvenance.ts) parses and sanitizes citations (`chunk_id` may be string or number); prose may use inline **`[cite: …]`** markers wired through [`aiInlineCitations.ts`](src/services/ai/aiInlineCitations.ts) + [`AssistantInlineCitationBody.tsx`](src/pages/mobile/AssistantInlineCitationBody.tsx) to expandable evidence cards ([`AssistantEvidenceChips.tsx`](src/pages/mobile/AssistantEvidenceChips.tsx)). Unresolved markers surface in the transcript and optional **`orphan_inline_markers`** on persisted traces. Auditable turn rows live under **`BrandOpsData.aiAssistantTraces`** ([`domain.ts`](src/types/domain.ts)), normalized in [`storage.ts`](src/services/storage/storage.ts); persistence respects **`settings.operatorTraceCollectionEnabled`** (same gate as operator traces). API keys are excluded, but enabled traces intentionally store up to 900 characters each of the user and assistant turn previews.

### AI Integration Suite (routing & pipelines)

Operator modes (**Fast / Balanced / Deep / Private / Evidence**) tune hosted **`ask:`** model scoring via [`aiAskRouting.ts`](src/services/ai/aiAskRouting.ts); Settings exposes controls in **`SettingsAiRoutingPanel.tsx`**. Declarative workflow scaffolding lives under [`aiPipelineCatalog.ts`](src/services/ai/aiPipelineCatalog.ts) + [`aiPipelineRunner.ts`](src/services/ai/aiPipelineRunner.ts) with capped audit rows in **`BrandOpsData.aiPipelineRuns`**. Concise architecture + backlog notes: [`docs/AI_INTEGRATION_SUITE_IMPLEMENTATION_REPORT.md`](docs/AI_INTEGRATION_SUITE_IMPLEMENTATION_REPORT.md).

---

## Secrets, account access, and environment

Copy **[`.env.example`](.env.example)** → **`.env.local`** (gitignored).

- Optional **`VITE_PRIVACY_POLICY_URL`**, **`VITE_PUBLIC_ORIGIN`**, intelligence-rules URL, and local-preview flags are documented inline in `.env.example`.
- Provider-labelled account buttons currently create only an on-device preview identity. There is no OAuth exchange, verified provider session, or auth backend in this repo.
- Optional Stripe URLs are navigation links only. There is no checkout callback, webhook, or verified entitlement service; do not enable a production membership gate from this tree alone.

The current repo is a local-first extension/Capacitor app, not a hosted SaaS backend. Webhook bridge
scripts are optional server-side helpers and require a real `BRIDGE_TARGET_URL` receiver to dispatch
signed envelopes into your own backend or extension messaging bridge.

`npm run dev:fullstack` starts the UI and a self-contained bridge receiver for local protocol smoke
testing. It does not connect HTTP webhooks to the browser extension runtime or persisted workspace.

Privacy copy ships as **`public/privacy-policy.html`**; listings should align with that artifact unless you override with a hosted HTTPS URL.

---

## Responsive shell

The **`mobile.html`** shell targets **`100dvh`**, safe-area insets (`env(safe-area-inset-*)`), and shared tokens in **[`shellLayoutTokens.ts`](src/pages/mobile/shellLayoutTokens.ts)** so one column scales from narrow phones through desktop extension tabs and Capacitor WebViews. **`viewport-fit=cover`** accompanies **`width=device-width`** on shell HTML where relevant.

**Not implemented without product approval:** a ChatGPT-style **two-pane** layout at large breakpoints (sticky glance column + primary column); sketch remains combining **`mobileApp.tsx`** + **`shellLayoutTokens.ts`** when prioritized.

---

## Quality gates

```bash
npm run check              # TypeScript project references + ESLint
npm run format             # Prettier check
npm run test               # Vitest (unit + performance bundles via npm scripts)
npm run test:integration
npm run build              # tsc -b + Vite + manifest copy
npm run verify:dist        # dist contract verification
npm run release            # full local ship checklist incl. tarball (see package.json)
```

CI mirrors **`check` → `format` → tests → `build` → `verify:dist`** (without packaging).

Other **`npm run`** scripts cover resonance reports, AI stack monitoring, optional local/native models, artifact lock verification — see [`package.json`](package.json).

---

## Product backlog (not implicit “done” work)

These items are **tracked separately** from layout milestones:

- **Verified authentication and billing** — provider OAuth, server-side sessions, Stripe webhook/session verification, and entitlement refresh are not implemented. The current account selector is explicitly local preview state.
- **Webhook delivery integration** — the proxy validates and signs inbound provider messages, and the extension receiver requires an actor allowlist configured in Settings. A deployed receiver/browser-runtime transport, workspace binding for multi-tenant deployments, and outbound provider replies remain application work.
- **Vendor integration sync** — Integration hub rows emphasize honesty/registry UX; automated CRM/issue ingestion is a pipeline epic.
- **Bundled on-device NLP** — **`internal-on-device-nlp`** in [`nlpCapabilityManifest.ts`](src/services/ai/nlpCapabilityManifest.ts) is **planned**; no ONNX/WASM runtime shipped in-tree yet (`localModelEnabled` remains an adapter hook).

---

## Contributor note (Cursor)

Popup and quick-action layout guidance for AI-assisted edits lives in **`.cursor/skills/popup/SKILL.md`** (Cursor skill file — separate from this README).
