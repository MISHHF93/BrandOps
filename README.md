# BrandOps

**BrandOps** is a **Chrome Extension (Manifest V3)** and optional **Capacitor mobile shell** for a command-first operator workspace: local-first workspace JSON, the **Pulse** read-only metric strip on Plan and Today (filtered summaries on Integrations and Settings), optional Assistant requests to a user-configured OpenAI-compatible host, and LinkedIn overlay tooling. One React + TypeScript + Tailwind tree builds **`dist/`** for extension packaging and native **`webDir`**.

---

## What ships from this repo

This README is the single product, engineering, evidence, and release reference for the repository.
It records current truth as of 2026-09-02 and must be updated when executable evidence changes.

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
- Imported and stored workspace blobs are normalized before use. Workspace writes are serialized,
  normalized, and use bounded optimistic rebase/retry for concurrent local writers. They are not a
  durable storage journal; multi-device synchronization still requires a hosted service and is not
  claimed by this local-first repository.

### Assistant citations & AI I/O traces

Hosted Assistant replies may include optional structured provenance (`brandOpsAiProvenance` / answer+citations JSON — see [`hostedAskTurn.ts`](src/services/ai/hostedAskTurn.ts)). [`aiIoProvenance.ts`](src/services/ai/aiIoProvenance.ts) parses and sanitizes citations (`chunk_id` may be string or number); prose may use inline **`[cite: …]`** markers wired through [`aiInlineCitations.ts`](src/services/ai/aiInlineCitations.ts) + [`AssistantInlineCitationBody.tsx`](src/pages/mobile/AssistantInlineCitationBody.tsx) to expandable evidence cards ([`AssistantEvidenceChips.tsx`](src/pages/mobile/AssistantEvidenceChips.tsx)). Unresolved markers surface in the transcript and optional **`orphan_inline_markers`** on persisted traces. Auditable turn rows live under **`BrandOpsData.aiAssistantTraces`** ([`domain.ts`](src/types/domain.ts)), normalized in [`storage.ts`](src/services/storage/storage.ts); persistence respects **`settings.operatorTraceCollectionEnabled`** (same gate as operator traces). API keys are excluded, but enabled traces intentionally store up to 900 characters each of the user and assistant turn previews.

### AI Integration Suite (routing & pipelines)

Operator modes (**Fast / Balanced / Deep / Private / Evidence**) tune hosted **`ask:`** model scoring via [`aiAskRouting.ts`](src/services/ai/aiAskRouting.ts); Settings exposes controls in **`SettingsAiRoutingPanel.tsx`**. Declarative workflow scaffolding lives under [`aiPipelineCatalog.ts`](src/services/ai/aiPipelineCatalog.ts) + [`aiPipelineRunner.ts`](src/services/ai/aiPipelineRunner.ts) with capped audit rows in **`BrandOpsData.aiPipelineRuns`**.

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

- **Verified authentication and billing** — provider OAuth and server-side sessions are not implemented;
  the current account selector is explicitly local preview state. RevenueCat SDK/entitlement wiring is
  present, but production products, offerings, and real purchase validation remain external setup.
- **Webhook delivery integration** — the proxy validates and signs inbound provider messages, and the extension receiver requires an actor allowlist configured in Settings. A deployed receiver/browser-runtime transport, workspace binding for multi-tenant deployments, and outbound provider replies remain application work.
- **Vendor integration sync** — Integration hub rows emphasize honesty/registry UX; automated CRM/issue ingestion is a pipeline epic.
- **Bundled on-device NLP** — **`internal-on-device-nlp`** in [`nlpCapabilityManifest.ts`](src/services/ai/nlpCapabilityManifest.ts) is **planned**; no ONNX/WASM runtime shipped in-tree yet (`localModelEnabled` remains an adapter hook).

---

## Contributor note (Cursor)

Popup and quick-action layout guidance for AI-assisted edits lives in **`.cursor/skills/popup/SKILL.md`** (Cursor skill file — separate from this README).

## Product doctrine

BrandOps is an AI-native work and professional identity operating system. Its promise is **your work becomes a verified professional identity**. It owns context, identity, Digital Twin state, plans, approvals, execution, verification, receipts, outcomes, memory, and learning. Models provide intelligence; Google services provide governed capabilities; MCP provides interoperability. BrandOps remains the product.

The user-facing flow is:

```text
ASK -> UNDERSTAND CONTEXT -> PLAN -> APPROVE WHEN REQUIRED
-> EXECUTE -> VERIFY -> RECEIPT -> LEARN
```

The engineering loop is:

```text
DISCOVER -> VERIFY -> PRIORITIZE -> FIX ROOT CAUSE -> WIRE END-TO-END
-> TEST -> RUN -> INSPECT -> VERIFY -> DOCUMENT -> RESCORE -> CONTINUE
```

Truth is more valuable than a high score. A score may fall when new evidence finds a defect. Never treat documentation, file existence, an agent report, or a mock response as proof of production behavior.

## Architecture and truth boundaries

The primary experience is the **Assistant + Workspace** shell, with Plan, Today/Cockpit, Integrations, and Settings views. Assistant handles conversation, hosted routing, citations, evidence, and artifacts. Workspace handles workstreams, approvals, local execution recording, receipts, and governance. Core services cover AI, Digital Twin, memory/context, builder intelligence, planning, execution, interop, storage, tracing, analytics, and usage.

The canonical pipeline is:

```text
intent -> context/memory/Twin assembly -> model routing -> generation
-> validation/guardrails -> artifact/plan -> approval -> execution
-> verification -> receipt -> controlled learning
```

The Digital Twin distinguishes user-provided facts, verified claims, agent reports, external data, model inference, unverified claims, history, permissions, and receipts. Inference never silently becomes verified identity. Agent and model writes remain unverified until a BrandOps-side human workflow promotes them.

Workspace state is a normalized `BrandOpsData` blob under `brandops:data`. Chrome uses `chrome.storage.local`; Capacitor/WebView uses scoped `localStorage`; tests use memory storage. Workspace writes are serialized, normalized, and use bounded optimistic rebase/retry for concurrent local writers. They are not a durable storage journal, and Chrome storage has no true compare-and-swap. Import/export is supported and is the current portability path. There is no hosted persistence, tenancy, multi-device sync, or server authority yet. Device-local storage is not a security boundary against an attacker who can read the device.

Secrets such as hosted AI keys and bridge credentials stay outside workspace JSON, but remain device-local and are not native-keychain backed.

## AI and model routing

BrandOps has a deterministic local AI Core for structured artifact synthesis and an optional hosted Ask path using a user-configured OpenAI-compatible endpoint. Operator modes are Fast, Balanced, Deep, Private, and Evidence. Routing uses heuristic capability vectors for latency, reasoning, citation fidelity, modality, privacy, and context needs. It does not claim vendor telemetry, automatic model fallback, or model-quality evaluation beyond the tests and provider evidence recorded here. Provider failures return an explicit failure result.

Declarative AI pipelines and capped audit records exist. Some pipelines run deterministically offline; hosted steps require provider configuration. On-device ONNX/WASM NLP remains planned.

## MCP control plane

The executable registry currently contains **44 capabilities and 44 unique MCP tools**, each with an output schema. Tools map one-to-one to the registry and are exposed through the same dispatcher over stdio and Streamable HTTP. Resources and the Tasks projection are supported. Discovery is grant-scoped.

Risk tiers are:

```text
READ -> GENERATE -> PREPARE -> EXTERNAL_ACTION -> SENSITIVE_ACTION
```

The gateway authenticates bearer sessions, scopes them to a workspace, authorizes capabilities, enforces trust ceilings and in-process rate limits, screens prompt injection, validates intent contracts, applies Memory Firewall rules, handles idempotency, dispatches local actions or records blocked external work, and records audit/checkpoint/trace evidence. Tokens are hashed; revocation is immediate. Agent writes are capped at `AGENT_REPORTED`. Approval-gated capabilities fail closed, agents cannot approve their own requests, and handoffs can only narrow authority.

The HTTP gateway is remote-capable but not deployment-ready: there is no TLS termination, OAuth authorization server, hosted session service, or production deployment. Third-party MCP client interoperability is not verified. Capability claims must remain grounded in source files and tests that exist.

## Google and external integrations

Google and Gemini are strategic integration directions, not shipped capabilities. A future governed Workspace connector may combine minimum-necessary Calendar, Gmail, Drive, Docs, Sheets, Slides, Meet, Chat, or Contacts access to prepare a briefing, but only with explicit consent, scoped authorization, visible consequences, and receipts.

This repository does **not** ship live Google Workspace OAuth, provider sessions, sync, Gmail/Calendar/Drive actions, or a verified Google connector. Current integration surfaces describe configuration and capability boundaries only. The same limitation applies to most vendor systems. LinkedIn is local overlay/capture tooling, not a verified LinkedIn API integration. One generic outbound webhook connector exists, but live delivery is not verified.

## Mobile, installation, and monetization

The web build produces an installable PWA surface: all launch pages link the manifest, the web bundle registers a service worker, and the installability contract inspects the built `dist/` artifact. Chrome/Edge extension pages and Capacitor shells intentionally do not register that worker. An Android Capacitor build target exists; iOS configuration/scripts exist but require platform generation on macOS. Store publication, signing, physical-device, and Play Console evidence remain external.

RevenueCat SDK and entitlement wiring are present. Premium decisions use live verified entitlement state and fail closed; local membership values are display-only. Production products, offerings, dashboard configuration, real purchases, restore validation, and store credentials are not proven here. Stripe URLs are navigation links only, with no checkout callback, webhook, or server-side entitlement authority.

## Current evidence: 2026-09-02

| Check                 | Result                                                           |
| --------------------- | ---------------------------------------------------------------- |
| `npm run check`       | PASS                                                             |
| `npm test`            | PASS: 1836 tests in 241 files                                    |
| MCP inventory         | PASS: 44 capabilities, 44 unique tools, 0 missing output schemas |
| `npm run build`       | PASS                                                             |
| `npm run verify:dist` | PASS: no leaked credentials                                      |
| Test type budget      | PASS at 129 / 129                                                |
| Knip budget           | PASS at 94 unused exports, 0 unused files/imports                |
| Shipaton gate         | 6 verified, 6 missing, 9 requiring human evidence                |
| Weighted score        | Recorded 96.5 / 100; not freshly rescored for all dimensions     |
| Release verdict       | **NOT READY**                                                    |

Hard gates override scores. Any unresolved P0, cross-workspace leakage, approval or authorization bypass, duplicate irreversible execution, fabricated evidence/verification, or critical Golden Workflow failure means **NOT READY**. Production deployment, staging, real authentication, external connectors, RevenueCat production setup, signing, physical-device verification, store publication, real purchases, and third-party MCP interoperability remain unverified until external evidence exists.

Useful commands:

```bash
npm install
npm run dev:mobile
npm run check
npm run check:tests
npm run format
npm test
npm run test:integration
npm run build
npm run verify:dist
npm run knip
npm run shipaton:gate
npm run release
npm run mcp:http
```

Do not carry forward as current: old test counts such as 1122, 1770, 647, 590, 744, or 809; old 40-capability counts; old Shipaton totals; a 96.5 score described as freshly rescored; claims of deployed production, live Google/LinkedIn/vendor connectors, real OAuth, Stripe billing, automatic sync, external side effects without an injected connector, or local-model fallback.
