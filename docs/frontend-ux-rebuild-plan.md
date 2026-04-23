# Frontend UX/UI rebuild — investigation and plan

This document captures what the current BrandOps client **is**, which layers are **stable backend contracts** (keep), and how to **re-plan the front end** from scratch while preserving those contracts. It doubles as a **fixture catalog**: discrete product surfaces, user jobs, and UI states to design and validate against (and later, optional test fixtures derived from the same list).

---

## 1. Purpose and scope

**Goal:** Replace or heavily recompose the presentation layer so the product meets proper UX/UI criteria (clarity, hierarchy, consistency, accessibility, performance, and task fit), without re‑implementing proven domain logic, storage normalization, or agent routing unless required for API shape.

**In scope:** Shell navigation, page layouts, component library, motion, copy architecture, empty/loading/error states, Cockpit workstreams, Chat presentation, Settings/Integrations layouts, welcome and help surfaces, Android/Capacitor shell concerns.

**Explicitly out of scope (initially):** Rewriting `BrandOpsData` normalization in `storage.ts`, command parsing in `commandIntent.ts`, or handler implementations in `agentWorkspaceEngine.ts` unless the new UI needs richer selection (e.g. row‑scoped actions instead of “first matching item”).

---

## 2. Investigation summary — how the app is built today

### 2.1 Stack and delivery

| Area | Choice |
|------|--------|
| UI | React 18, TypeScript |
| Styling | Tailwind CSS 3, `clsx`, shared primitives under `src/shared/ui/components` |
| Icons / motion | `lucide-react`, `motion` |
| Build | Vite 7, **multi‑page** bundle (separate HTML entries) |
| Native | Capacitor 8 (Android) |

### 2.2 HTML surfaces (each is its own document)

Configured in `vite.config.ts` and documented in `src/shared/navigation/extensionLinks.ts`:

- **`mobile.html`** — Primary shell (`MobileApp`, `data-app-surface="mobile"`).
- **`integrations.html`** — Same shell; Chrome MV3 `options_ui` default tab Integrations.
- **`dashboard.html`**, **`welcome.html`** — Chatbot-class surfaces via `renderChatbotSurface`.
- **`help.html`** — Knowledge Center.
- **`index.html`** — Redirect toward mobile preview entry.
- Extension **background** and **LinkedIn content** scripts are separate Rollup inputs (not React).

### 2.3 Primary shell: `MobileApp`

Entry: `src/pages/mobile/mobileApp.tsx`.

**Bottom tabs** (`src/pages/mobile/mobileTabConfig.ts` + `mobileShellQuery.ts`): Pulse, Chat, Today, Integrations, Settings.

**URL state:** `?section=` encodes either a tab token (`pulse`, `chat`, …) or a Cockpit **workstream** (`today`, `pipeline`, `brand-content`, `connections`), with legacy aliases mapped in `dashboardNavigation.ts`.

**Workspace data:** Loaded via `storageService` / `createInMemorySeededWorkspace` from `src/services/storage/storage.ts`; canonical types in `src/types/domain.ts`.

**Read models for UI:** `buildWorkspaceSnapshot` (`src/pages/mobile/buildWorkspaceSnapshot.ts`) aggregates intelligence, scheduler, settings readouts, pulse timeline rows, and Cockpit “peek” rows for cards.

**Mutations:** User text and quick actions funnel to `executeAgentWorkspaceCommand` (`src/services/agent/agentWorkspaceEngine.ts`) with `AgentWorkspaceCommand.source` discriminating surface (`chatbot-web` | `chatbot-mobile` | …).

**Chat persistence:** Local thread and command chips in `localStorage` (keys in `mobileApp.tsx`).

### 2.4 Cockpit (Today tab)

`CockpitDailyView` composes workstream sections (Today, Pipeline, Brand & content, Connections). Navigation groups and heading ids are defined in `src/shared/config/dashboardNavigation.ts`. Command affordances are partially mapped in `docs/cockpit-command-surface-map.md` (strips, chips, Chat starters).

Capability placement for IA is summarized in `src/shared/config/capabilityMap.ts`.

### 2.5 Logical modules vs UI

`src/shared/config/modules.ts` lists **workspace modules** (Brand Vault, Content Library, Pipeline CRM, etc.). Several map onto the four consolidated **workstreams** via `workspaceModuleToDashboardSection` in `dashboardNavigation.ts`. A front-end rebuild should **either** align marketing/module language with the four workstreams **or** re-expand nav — that is a product IA decision, not only a visual one.

### 2.6 Network and “backend” boundaries on the client

Most workspace behavior is **local-first** (extension storage / `browserLocalStorage`). Network usage today includes:

- OAuth identity flows (`googleIdentity`, `githubIdentity`, `linkedinIdentity`).
- Optional remote intelligence rules (`VITE_INTELLIGENCE_RULES_URL`, `intelligenceRulesRuntime.ts`).
- Optional OAuth public overrides fetch (`/brandops-oauth-public.json`).
- Preview / privacy env-driven URLs (`previewDeployment.ts`, `privacyPolicyUrl.ts`).

**Implication:** A new UI should treat **`BrandOpsData` + `executeAgentWorkspaceCommand`** as the primary application API, with OAuth and rules as satellite services.

---

## 3. Fixture catalog — surfaces, jobs, and states

Use this table as the checklist for UX specs, visual design, and acceptance tests. “Fixture” here means a **bounded UI scenario** (surface + user intent + data state), not only automated test data.

| ID | Surface | Primary user job | Critical states to design |
|----|---------|------------------|---------------------------|
| F‑SHELL‑01 | Bottom nav + header | Orient and switch modes | 5 tabs, active tab, badge/hint if any |
| F‑SHELL‑02 | Deep link / URL | Resume at workstream | `?section=` tab vs workstream parsing |
| F‑PULSE‑01 | Pulse timeline | Scan cadence and upcoming work | empty, dense, overdue |
| F‑CHAT‑01 | Chat thread | Natural language operations | welcome, user/assistant, command-result, loading, error |
| F‑CHAT‑02 | Composer + starters | Discover commands | starters expanded/collapsed, chips history |
| F‑CHAT‑03 | Destructive flows | Confirm archive/reset | confirm dialogs (see `needsDestructiveConfirm` pattern) |
| F‑COCKPIT‑01 | Today workstream | Mission / priorities | zero vs populated snapshot |
| F‑COCKPIT‑02 | Pipeline workstream | CRM + outreach | opportunities, outreach drafts, pipeline health |
| F‑COCKPIT‑03 | Brand & content | Library + publishing | content items, queue, brand vault refs |
| F‑COCKPIT‑04 | Connections | Integrations mental model inside Today | sources, artifacts, SSH (peek rows + navigation to Integrations) |
| F‑COCKPIT‑05 | Workstream command strip | Act without opening Chat | per-workstream commands (map to `cockpit-command-surface-map`) |
| F‑INT‑01 | Integrations tab | Register sources | connected / planned / monitoring |
| F‑SET‑01 | Settings | Workspace prefs, AI mode, export/import | apply loading, success/error |
| F‑WEL‑01 | Welcome | Sign in / sign up | `?flow=signup`, OAuth buttons |
| F‑HELP‑01 | Knowledge Center | Learn surfaces | topic deep link `?topic=` |
| F‑A11Y‑01 | Global | Keyboard and screen reader | focus order, landmarks, live regions for chat |
| F‑AND‑01 | Android WebView | Same shell in Capacitor | safe areas, back behavior, storage parity |

**Engine constraint fixture (product + UX):** Several agent actions target the **first matching entity** in engine order, not a user-selected row. Rebuild should either **document clearly** or **add selection** — tracked as a cross-cutting decision (see section 6).

---

## 4. UX principles for the rebuild (draft)

1. **One mental model:** Chat = command console; Today = operational picture; Pulse = time rhythm; Integrations = connections; Settings = identity and workspace policy.
2. **Progressive disclosure:** Show summary first; drill into lists; reserve Chat for ambiguity or bulk natural language.
3. **Consistent density:** Align card spacing, typography scale, and section headers across Pulse, Cockpit sections, and Integrations.
4. **Honest affordances:** If an action applies to “first item,” the UI should say so or offer explicit pickers.
5. **Accessible by default:** Visible focus, heading hierarchy tied to `cockpit` section ids for skip links, reduced motion option.
6. **Performance:** Large lists (content, opportunities) virtualized or paginated; avoid recomputing snapshots on every keystroke.

---

## 5. Proposed information architecture (options)

**Option A — Keep current five-tab shell** and redesign visuals/interaction only (lowest migration risk).

**Option B — Merge Pulse into Today** as a sub-panel (four tabs: Chat, Home, Integrations, Settings) to reduce parallel “timeline” vs “digest” confusion.

**Option C — Workstream-first shell** (Today/Pipeline/Brand/Connections as top-level) with Chat as FAB or drawer; Integrations and Settings as secondary. Higher build cost; clearest CRM/content split.

Recommendation: decide in a short **IA workshop** using fixture IDs F‑SHELL‑01, F‑PULSE‑01, F‑COCKPIT‑* with three lo-fi flows (new user, daily operator, integrations admin).

---

## 6. Cross-cutting decisions (log before high-fidelity design)

| # | Question | Options |
|---|----------|---------|
| D1 | Row-scoped vs engine-default mutations | Keep engine contract; add pickers; or hybrid |
| D2 | Module vocabulary (`modules.ts`) vs four workstreams | Consolidate copy only vs change nav |
| D3 | Design system | Extend `src/shared/ui/components` vs new tokens + primitives |
| D4 | State management | Keep React local state in shell vs introduce lightweight store for snapshots |
| D5 | Theming | Continue `applyDocumentThemeFromAppSettings` contract vs CSS variables overhaul |

---

## 7. Phased delivery (suggested)

| Phase | Outcome | Touches |
|-------|---------|--------|
| P0 | Foundations: type scale, spacing, color roles, button/input variants | `shared/ui`, Tailwind config |
| P1 | Shell + navigation redesign | `mobileApp.tsx`, `mobileTabPrimitives`, URL sync |
| P2 | Chat experience | `MobileChatView`, message bubbles, loading/error |
| P3 | Cockpit workstreams | `CockpitDailyView`, `Cockpit*WorkstreamSection`, command strip |
| P4 | Integrations + Settings | `MobileIntegrationsView`, `MobileSettingsView` |
| P5 | Welcome, Help, error boundary polish | `welcome`, `help`, `AppErrorBoundary` |
| P6 | Android pass | Capacitor config, safe areas, QA against F‑AND‑01 |

Each phase should exit with **fixture acceptance** for the relevant rows in section 3.

---

## 8. Key file map (for implementers)

| Concern | Location |
|---------|----------|
| Shell / tabs | `src/pages/mobile/mobileApp.tsx`, `mobileTabConfig.ts`, `mobileShellQuery.ts` |
| Workstreams | `src/pages/mobile/CockpitDailyView.tsx`, `Cockpit*WorkstreamSection.tsx` |
| Snapshot | `src/pages/mobile/buildWorkspaceSnapshot.ts` |
| Domain types | `src/types/domain.ts` |
| Persistence | `src/services/storage/storage.ts` |
| Agent API | `src/services/agent/agentWorkspaceEngine.ts`, `intent/commandIntent.ts` |
| Routes / pages | `src/shared/navigation/extensionLinks.ts`, `vite.config.ts` |
| Command ↔ UI map | `docs/cockpit-command-surface-map.md` |

---

## 9. Open questions for stakeholders

1. Primary persona for v1 polish: solo operator, team lead, or admin-heavy?
2. Hosted web vs Chrome extension vs Android: single design system or per-surface density?
3. Must the rebuild preserve every current HTML entry and query param for bookmarks and MV3 options?
4. Is “fixtures” in your vocabulary meant to include **automated UI fixtures** (Playwright/Vitest component harness)? If yes, P1 should add a minimal storybook or test app mounting each surface with seeded `BrandOpsData`.

---

## 10. Next step

Use section **3 (fixture catalog)** as the backlog for UX specs and visual design. Pick **section 5 (IA option)** and resolve **section 6 (decisions)**; then sequence work by **section 7 (phases)**. When you are ready, we can translate each fixture into wireframes and implementation tickets without touching storage or agent contracts until D1 is decided.
