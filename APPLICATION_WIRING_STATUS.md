# Application Wiring Status

## Purpose

Track what is fully connected between the chatbot frontend and backend command/runtime layers after migration.

## Active Frontend Entry Surfaces

- `index.html` -> redirects to `mobile.html` (preserves query/hash; default shell tab is set by `MobileApp` when `?section` is absent)
- `mobile.html` -> `src/pages/mobile/main.tsx` -> `MobileApp` with **`initialTab: 'pulse'`** (document: `data-app-surface="mobile"`, `surfaceLabel="mobile"`)
- `dashboard.html` -> `src/pages/dashboard/main.tsx` -> `renderChatbotSurface` -> `MobileApp` (`data-app-surface="dashboard"`)
- `options.html` -> `src/pages/options/main.tsx` -> `renderChatbotSurface` -> `MobileApp` (`data-app-surface="options"`) — required for Chrome MV3 `options_ui`
- `help.html` -> `src/pages/help/main.tsx` -> `HelpKnowledgeRoot` (Knowledge Center; not the `MobileApp` shell) (`data-app-surface="help"`)
- `welcome.html` -> `src/pages/welcome/main.tsx` -> `renderChatbotSurface` -> `MobileApp` (`data-app-surface="welcome"`)
- Peripheral (not the main shell): `public/oauth/*-brandops.html` (OAuth callback UIs), `public/privacy-policy.html` (legal)

**Agent source mapping:** `mapDocumentSurfaceToAgentSource` in [`src/shared/navigation/appDocumentSurface.ts`](src/shared/navigation/appDocumentSurface.ts) maps `mobile` to `executeAgentWorkspaceCommand` source `chatbot-mobile`; `welcome` | `dashboard` | `options` | `help` map to `chatbot-web`. This aligns `data-app-surface` with the command pipeline.

**Knowledge / help IA:** in-dashboard Knowledge is opened via `dashboard.html?overlay=help` (Chat tab + overlay). A separate `help.html` is the dedicated Help / daily-brief document (initial Cockpit tab). See the “Knowledge Center” and **Settings** dual-entry notes in [`src/shared/navigation/extensionLinks.ts`](src/shared/navigation/extensionLinks.ts).

The **Pulse** tab (id `pulse`) is a read-only mixed timeline (follow-ups, publishing, scheduler, outreach drafts) from `buildPulseTimeline` / `MobileWorkspaceSnapshot.pulseTimelineRows`; actions are primed or run from **Chat** as elsewhere in the shell.

The **Cockpit** tab in `MobileApp` (tab id `daily`) is the platform **overview**: pulse-style KPIs and four workstream sections (Today, Pipeline, Brand & content, Connections) read from the workspace snapshot and `localIntelligence` helpers. Deep creation and configuration still happen via chat and commands, not in that tab alone.

**Deep links:** `mobile.html?section=pulse` (alias `timeline`) opens the Pulse tab. `mobile.html?section=today|pipeline|brand-content|connections` opens the Cockpit tab and scrolls to the block (`extensionLinks` + `getCockpitMobileSectionHeadingId`). A bare `?section=` on `dashboard.html` (without `?overlay=`) is redirected to the same `?section` on `mobile.html` (see `shouldRedirectDashboardSectionToMobile`). Workstream links from `openExtensionSurface` / `buildMobileCockpitUrl` target `mobile.html`.

**Settings:** the same Settings tab is reachable as `options.html` (required for extension options) and `mobile.html?section=settings`.

**Deferred UI:** `ExtensionSurfaceLayout` in `src/shared/ui/components/layout/ExtensionSurfaceLayout.tsx` is not mounted by a page entry; reserved for a future compact popup / options shell.

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

## Legacy module UI and Zustand removal

- The old `src/modules/*` workspace panels (content library, CRM, vault, etc.) and the former `src/state/useBrandOpsStore.ts` (Zustand) are **removed**. They were not imported by any active page after the chatbot migration.
- Only [`src/modules/brandMemory/`](src/modules/brandMemory/) remains (defaults: [`seed.ts`](src/modules/brandMemory/seed.ts), demo data for tests: [`demoSeed.ts`](src/modules/brandMemory/demoSeed.ts)), consumed from [`src/services/storage/storage.ts`](src/services/storage/storage.ts) and test fixtures.

Status: **Connected**

## Mutation surfaces (authoritative)

| Surface | Path | Role |
|--------|------|------|
| Command engine (chat, quick actions) | `src/services/agent/agentWorkspaceEngine.ts` | Parses commands, mutates `BrandOpsData` via `storageService`, appends `agentAudit` |
| Background / channels / bridge | `src/background/index.ts` + agent helpers | Channel events, webhooks, sync; writes through `storageService` |
| LinkedIn content script | `src/content/linkedinOverlay.ts` | Optional capture / companion flows; may write storage directly |
| Normalization + seed | `src/services/storage/storage.ts` | Load, merge, schema defaults; uses `brandMemory/seed` |

There is no global React state store; product UI is `MobileApp` + `storageService` reads.

## Product note — dedicated pipeline / publishing pages

Dedicated full-page **pipeline grid** or **WYSIWYG post** editors are **deferred**. The v1 contract is **Today (digest) + Chat (commands)** on `mobile.html`; adding separate HTML surfaces would duplicate the cockpit unless they ship distinct non-chat affordances (e.g. calendar, drag-drop stages, rich text). Revisit only after wayfinding and starters prove insufficient for growth/sales workflows.

## Remaining Gaps (Non-blocking)

- Optional LLM-assisted intent with typed args and validation (v2).
- Identity / OAuth and other flows that previously lived only in the removed store are **not** exposed in the current chatbot UI; reintroduce via `src/services/sync/*` (or new Settings UI) when needed.
- Some non-chat extension capabilities (e.g., LinkedIn overlay) remain by design.

Status: **Partial**

## Regression Guards

- `tests/unit/chatbotSurfaceWiring.test.ts` verifies all web entrypoints mount chatbot routing and that `renderChatbotSurface` threads `data-app-surface` / `MobileApp` `surfaceLabel`.
- `tests/unit/appDocumentSurface.test.ts`, `tests/unit/mobileShellQuery.test.ts`, `tests/unit/dashboardRedirect.test.ts`, and `tests/unit/navigateCrownFromExtensionSurface.test.ts` cover shell URL and crown navigation.
- `tests/unit/uiCommandEntrypoints.test.ts` guards that cockpit / settings / chat views do not call `executeCommandFlow` directly (shell uses Chat-visible quick commands).
- Unit suite validates command engine behaviors and bridge/runtime logic.
- **`npm run knip`:** runs [knip](https://github.com/webpro-nl/knip) with `--no-exit-code` (non-blocking). The report still lists many `src/shared/ui/**` files not imported by MobileApp after the chatbot migration—use the output as a **backlog** for orphan pruning, not a clean bill of health. Optional: add `globals` to `devDependencies` for ESLint if you want to clear the “unlisted” line.

Status: **Connected**
