# Application Wiring Status

## Purpose

Track what is fully connected between the chatbot frontend and backend command/runtime layers after migration.

## Active Frontend Entry Surfaces

- `index.html` -> redirects to `mobile.html`
- `mobile.html` -> `src/pages/mobile/main.tsx` -> `MobileApp`
- `dashboard.html` -> `src/pages/dashboard/main.tsx` -> `renderChatbotSurface(...)`
- `options.html` -> `src/pages/options/main.tsx` -> `renderChatbotSurface(...)`
- `help.html` -> `src/pages/help/main.tsx` -> `renderChatbotSurface(...)`
- `welcome.html` -> `src/pages/welcome/main.tsx` -> `renderChatbotSurface(...)`

Status: **Connected**

## Chatbot -> Backend Command Engine

- UI command execution: `src/pages/mobile/mobileApp.tsx`
- Backend command executor: `src/services/agent/agentWorkspaceEngine.ts`
- Command actions include:
  - notes, follow-ups, outreach drafts
  - publishing create/update/reschedule
  - contacts add/update
  - opportunities update/archive/restore
  - integrations source creation
  - content add/update/duplicate/archive
  - workspace configuration presets

Status: **Connected**

## Runtime Channel Ingress -> Backend Engine

- Runtime handler: `src/background/index.ts`
- Message types:
  - `SYNC_SCHEDULER`
  - `AGENT_CHANNEL_EVENT`
  - `AGENT_CHANNEL_WEBHOOK`
  - `AGENT_BRIDGE_ENVELOPE`
- Webhook normalization:
  - `src/services/agent/channelPayloadAdapters.ts`
- Signed envelope verification + replay guard:
  - `src/services/agent/webhookBridge.ts`
  - `src/services/agent/bridgeReplayGuard.ts`

Status: **Connected**

## Legacy Frontend Removal

- Removed old dashboard/options/welcome/help UI stacks and references.
- Active web entries now mount chatbot surface only.

Status: **Connected**

## Intent routing and audit

- Deterministic route map: [`src/services/agent/intent/commandIntent.ts`](src/services/agent/intent/commandIntent.ts)
- Execution audit: `BrandOpsData.agentAudit` (see [`src/services/agent/agentWorkspaceEngine.ts`](src/services/agent/agentWorkspaceEngine.ts))
- Mutation policy note: [`src/services/agent/mutationSurfacePolicy.ts`](src/services/agent/mutationSurfacePolicy.ts)

Status: **Connected**

## Remaining Gaps (Non-blocking)

- Optional LLM-assisted intent with typed args and validation (v2).
- Legacy Zustand mutations for unmounted module panels (not used by chatbot entrypoints).
- Some non-chat extension capabilities (e.g., LinkedIn overlay) remain by design.

Status: **Partial**

## Regression Guards

- `tests/unit/chatbotSurfaceWiring.test.ts` verifies all web entrypoints mount chatbot routing.
- Unit suite validates command engine behaviors and bridge/runtime logic.

Status: **Connected**
