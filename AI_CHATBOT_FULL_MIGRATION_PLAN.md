# BrandOps Full AI Chatbot Migration Plan

## Mission

Reform BrandOps from a multi-surface extension workspace into a unified **AI chatbot application** where chat is the primary command and execution interface for all product capabilities.

This plan tracks the remaining work to reach full migration.

## Current State Snapshot

### Completed

- Chatbot-first web routing is active (`/` and major web surfaces are now chatbot shell).
- Android migration foundation is in place (Capacitor config + scripts + mobile entry).
- Core command execution engine exists:
  - `src/services/agent/agentWorkspaceEngine.ts`
- Background runtime message handling now executes through agent workspace engine (channel/webhook/bridge paths consolidated).
- Channel ingestion is wired:
  - channel payload adapters
  - signed bridge envelope verification
  - replay nonce guard
- Command execution currently supports:
  - add note
  - reschedule publishing
  - add integration source
  - draft outreach
  - draft post
  - update opportunity stage

### Not Fully Migrated Yet

- Legacy business actions still live mainly in store mutations and are not fully command-driven.
- Intent parsing is keyword-based, not structured semantic intent routing.
- Old UI modules still exist in codebase and are not fully retired/isolated.
- Chatbot tabs are partially informational; some sections still need executable chat-native workflows.
- Backend proxy verification is scaffold-level and needs production-grade provider verification/compliance.

## End-State Definition (Done Criteria)

Migration is complete only when all are true:

1. **All user actions can be executed via chatbot commands** (no critical workflow blocked behind legacy UI).
2. **All core mutations route through the agent command engine** (single backend command path).
3. **Legacy UI modules are isolated under legacy namespace or removed** from active runtime.
4. **Structured intent schema is used** (intent + args + validation), not only keyword heuristics.
5. **Bridge and webhook path are production-hardened** (provider signature verification, replay guard, audit logs).
6. **Android app shell is runnable and synchronized** with the same chatbot command engine.

## Migration Workstreams

## 1) Backend Consolidation (Highest Priority)

Goal: move all business mutations into `agentWorkspaceEngine`.

### Remaining action families to migrate

- Contacts:
  - [x] add contact
  - [x] update contact
  - [ ] relationship updates
- Follow-ups:
  - [x] create follow-up
  - [x] toggle/complete follow-up
- CRM opportunities:
  - [~] update value/confidence/stage
  - [x] archive/restore
  - [ ] update name/company/source/full metadata
- Content library:
  - [x] add/archive content item
  - [x] update/duplicate content item
- Publishing:
  - [x] update status/checklist (first-item command path)
  - quick reschedule
  - checklist updates
- Integrations:
  - add artifact
  - add ssh target

### Deliverables

- `executeAgentWorkspaceCommand` supports all above command categories.
- `channelCommandExecutor` becomes adapter-only (source mapping, no business logic).
- UI calls command engine directly for all major actions.

## 2) Structured Intent Layer

Goal: replace keyword-only parsing with typed intents.

### Intent contract

- `intent`: enum (`add_note`, `create_outreach_draft`, `update_opportunity`, etc.)
- `args`: typed payload
- `confidence`: number
- `validationErrors`: string[]

### Deliverables

- Add intent parser service (v1 deterministic parser).
- Add validation pipeline before execution.
- Add clear assistant error responses for invalid args.

## 3) Frontend Chatbot Productization

Goal: make chatbot UX the full workspace, not partial shell.

### Required upgrades

- Command history with replay/edit.
- Action cards with confirmation states.
- Inline workspace snapshots after command execution.
- Dedicated flows in tabs:
  - Automations: list and execute saved command recipes
  - Integrations: channel status, bridge status, source health
  - Settings: execution policy + role controls + environment health

### Deliverables

- Replace placeholder tab text with executable views.
- Add command templates for all core workflows.

## 4) Legacy Surface Retirement

Goal: remove ambiguity and prevent fallback to old app shape.

### Steps

- Move old non-chat app components/pages into `src/legacy/`.
- Remove old routes from active entrypoints.
- Keep compatibility adapters only where unavoidable.
- Update naming across app surfaces to AI chatbot wording.

### Deliverables

- Active runtime references only chatbot app shell and engine.
- Legacy modules compile but are not active by default.

## 5) Production Backend Hardening

Goal: stabilize multi-channel ingress for real users.

### Hardening tasks

- Telegram webhook verification (official token/secret validation).
- WhatsApp/Meta signature verification.
- Replace in-memory replay store with Redis/KV nonce store.
- Add audit log stream:
  - source
  - command
  - normalized intent
  - result
  - timestamp
  - trace ID

### Deliverables

- Proxy service security parity for production.
- Deterministic failure handling and retriable error categories.

## 6) Android Completion

Goal: operational Android chatbot app using same engine.

### Steps

- Add Android project (`npm run android:add` if not already added locally).
- Sync build output into Android webview (`npm run android:sync`).
- Validate keyboard, back-nav, notification handling.
- Add mobile-specific UX polish and offline command behavior.

## Execution Sequence (Recommended)

1. Backend consolidation (all action families)
2. Structured intents
3. Chatbot productization (all tabs executable)
4. Legacy retirement
5. Backend hardening
6. Android completion + release prep

## Milestone Checklist

### Milestone A - Command Engine Coverage

- [ ] 100% of core mutations callable via command engine
- [~] Unit tests for expanded action families (notes, publishing, outreach, integrations, follow-ups, CRM, contacts, content, config)
- [~] No duplicated mutation logic outside engine (channel execution path consolidated; store actions still to migrate)

### Milestone B - Chatbot UX Coverage

- [ ] All primary user workflows executable from chat
- [ ] Tab content is functional, not placeholder
- [ ] Command history and actionable confirmations added

### Milestone C - Production Readiness

- [ ] Provider signature verification complete
- [ ] Replay protection uses shared store
- [ ] Audit log enabled
- [ ] Full verification passes (`check`, `test`, `build`)

## Verification Commands (Every Phase)

```bash
npm run typecheck
npm run test:unit
npm run build:mobile
```

Optional full sweep:

```bash
npm run check
npm run test
npm run build
```

## Notes

- Migration should remain incremental and continuously shippable.
- Do not remove legacy modules until command-engine parity is validated by tests.
- Keep one source of truth: all mutation logic should converge into agent workspace engine.
