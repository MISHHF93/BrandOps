# BrandOps Full AI Chatbot Migration Plan

## Mission

Reform BrandOps from a multi-surface extension workspace into a unified **AI chatbot application** where chat is the primary command and execution interface for all product capabilities.

This plan tracks the remaining work to reach full migration.

## Current State Snapshot

### Completed

- Chatbot-first web routing is active (`/` and major web surfaces mount the shared chatbot shell).
- Android **native project** is present under `android/` (Capacitor add + sync). Web assets copy from `dist/` via `npx cap sync android`.
- Core command execution engine: [`src/services/agent/agentWorkspaceEngine.ts`](src/services/agent/agentWorkspaceEngine.ts).
- **Deterministic intent routing** (v1): [`src/services/agent/intent/commandIntent.ts`](src/services/agent/intent/commandIntent.ts) — single precedence-ordered route map used by the engine.
- Background runtime messages execute through the engine (channel / webhook / signed bridge).
- Channel ingestion: payload adapters, HMAC bridge verification, **chrome.storage-backed nonce replay map** (with in-memory fallback): [`src/services/agent/bridgeNonceStore.ts`](src/services/agent/bridgeNonceStore.ts).
- **Command audit log** on workspace: `BrandOpsData.agentAudit` (normalized in storage, capped entries).
- Bridge proxy: Telegram secret header, WhatsApp verify token, optional **WhatsApp `X-Hub-Signature-256`** (when `WHATSAPP_APP_SECRET` is set), WhatsApp **GET** subscription verification.
- Chatbot UI: local command history, persisted chat thread, destructive-action confirm, settings **recent activity** from audit.
- Mutation surface policy: [`src/services/agent/mutationSurfacePolicy.ts`](src/services/agent/mutationSurfacePolicy.ts).

### Remaining (follow-ups)

- **Semantic / LLM intent** with typed args + validation (beyond deterministic route strings).
- **Remote shared nonce store** (Redis/KV) for multi-instance bridge proxies.
- **Reintroduce** OAuth / identity and any non-chat settings flows via small `services/*` surfaces (the legacy Zustand store and unmounted `src/modules/*` panels are removed; `brandMemory/seed` remains for defaults).

## End-State Definition (Done Criteria)

1. **All user-facing flows available via chat** for targets you ship (achieved for engine-routed CRM, content, publishing, integrations, config).
2. **Single command path** for chat + channels + bridge into `executeAgentWorkspaceCommand`.
3. Legacy UI either removed or namespaced; active entries only mount chatbot.
4. **Structured routing** — deterministic route map + room for v2 typed args (partially done: route enum + dispatch).
5. **Production bridge** — provider checks, durable replay, **audit** (audit done in-app; proxy signature optional env).
6. **Android shell** — project generated and sync’d; device QA still recommended on hardware.

## Migration Workstreams

## 1) Backend Consolidation

Goal: move business mutations into `agentWorkspaceEngine`.

### Action families

- Contacts: add, update, **relationship stage** (first contact).
- Follow-ups: create, complete.
- Opportunities: stage, value/confidence, **labeled name/company/source/notes**, archive/restore.
- Content / publishing / integrations: as implemented + **integration artifact** + **SSH target** commands.

`channelCommandExecutor` remains adapter-only.

## 2) Structured Intent Layer

- **Done (v1):** `parseCommandRoute` + `runParsedRoute` dispatch in the engine.
- **Future:** typed `args` objects, validation errors per route, optional LLM assist.

## 3) Frontend Chatbot Productization

- Persisted chat thread + command chip history.
- Destructive command confirmation.
- Audit visibility in Settings.
- Further UX: inline action cards, richer tab workflows as needed.

## 4) Legacy Surface Retirement

- Active HTML entrypoints render chatbot only.
- Optional: move dead `src/modules/*` to `legacy/` in a dedicated cleanup PR.

## 5) Production Backend Hardening

- Proxy: Telegram / WhatsApp verification envs documented in `scripts/bridge-proxy.mjs`.
- Extension: durable nonce map in `chrome.storage.local`.
- Optional: central audit export, Meta/Telegram advanced policies.

## 6) Android Completion

- `android/` checked in; run `npm run build:mobile` then `npx cap sync android` before Android Studio builds.

## Milestone Checklist

### Milestone A – Command Engine Coverage

- [x] Expanded action families with tests (`tests/unit/channelCommandExecutor.test.ts`, `tests/unit/commandIntent.test.ts`).
- [x] Engine routes + audit persistence.
- [ ] Optional: redirect every legacy store mutation through engine adapters (if panels return).

### Milestone B – Chatbot UX

- [x] Command history + persisted thread + confirms + audit panel.
- [ ] Optional: confirmations as in-app modal (vs `window.confirm`).

### Milestone C – Production Readiness

- [x] Provider header / signature hooks on proxy; WhatsApp GET verify.
- [x] Durable replay in extension service worker path.
- [x] Audit log in workspace data.
- [x] `npm run check`, `npm run test:unit`, `npm run build`, `npm run build:mobile`.

## Verification Commands

```bash
npm run check
npm run test:unit
npm run build:mobile
npm run build
npx cap sync android
```

## Notes

- Incremental shipping: engine + tests + docs stay the source of truth for “done.”
- Do not delete large legacy modules until product confirms.
