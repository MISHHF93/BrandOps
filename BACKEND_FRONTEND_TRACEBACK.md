# Backend/Frontend Traceback

## Goal

Trace each active frontend control path to its backend handler and identify misconnected configurations.

## Entry Surface Routing

- `index.html` redirects to `mobile.html`
- `mobile.html` mounts `src/pages/mobile/main.tsx` -> `MobileApp` with `surfaceLabel="mobile"` (primary in-app `chatbot-mobile` source)
- `dashboard.html`, `integrations.html`, `help.html`, `welcome.html` mount `renderChatbotSurface({ surfaceLabel, initialTab })` -> `MobileApp` with the same `surfaceLabel` on the component and on `<html data-app-surface>` (hosted documents use the `chatbot-web` source mapping)
- `dashboard.html?section=...` redirects to `mobile.html?section=...`; retired `dashboard.html?overlay=*` deterministically falls back to canonical pages (`help.html` or `mobile.html?section=settings`)
- workstream and crown navigation use `openExtensionSurface` / `buildMobileCockpitUrl` which target `mobile.html`

**Mapping:** [`src/shared/navigation/appDocumentSurface.ts`](src/shared/navigation/appDocumentSurface.ts) — command `source` is still `chatbot-web` | `chatbot-mobile` as enforced by `executeAgentWorkspaceCommand`.

Result: **Connected**

## Frontend Command Paths

Primary execution call:

- `src/pages/mobile/mobileApp.tsx` -> `runCommand(...)` -> `executeAgentWorkspaceCommand(...)`

Connected controls:

- Chat input submit
- Daily quick actions
- Integrations quick actions
- Settings config actions
- Settings legacy presets
- Settings operational presets
- Settings profile presets (fixed in this pass)

Note:

- Chat quick chips intentionally prefill input (`sendQuickCommand`) so users can edit before sending.

## Backend Command Router

Router:

- `src/services/agent/agentWorkspaceEngine.ts` (`executeAgentWorkspaceCommand`)

Mapped command domains:

- Notes: `add note`
- Publishing: `reschedule`, `draft post`, `update publishing`
- Outreach: `draft outreach`
- Integrations: `add source`, `connect`
- Opportunities: `update opportunity`, `archive opportunity`, `restore opportunity`
- Follow-ups: `create/add follow up`, `complete follow up`
- Contacts: `add contact`, `update contact`
- Content: `add/create content`, `update content`, `duplicate content`, `archive content`
- Configuration: `configure: ...` / `configure workspace ...`

Result: **Connected**

## Runtime/External Ingress

- `src/background/index.ts` handles:
  - `AGENT_CHANNEL_EVENT`
  - `AGENT_CHANNEL_WEBHOOK`
  - `AGENT_BRIDGE_ENVELOPE`
- All paths normalize/verify payloads and call `executeAgentWorkspaceCommand(...)`

Result: **Connected**

## Misconnections Found and Fixed

1. Settings profile preset buttons were staging text instead of executing backend configuration.
2. Updated those buttons to call `runCommand(...)` directly.

## Current Residual Risk

- Command parser is phrase-based. New UI labels/phrases must continue matching backend parser rules.
- Recommended safeguard: keep a unit test matrix for all user-facing preset command strings.
