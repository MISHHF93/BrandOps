# BrandOps user onboarding

Engineering and product reference for the first-session experience (`mobile.html`, `welcome.html`, same shell via `renderChatbotSurface`).

## Personas

| Persona | Entry | Notes |
|------------|-------|--------|
| **New install** | Chrome may open [`welcome.html`](welcome.html) when there is no federated session (see extension background `onInstalled`). | Same `MobileApp` as mobile; `surfaceLabel: 'welcome'`. |
| **Returning user** | `mobile.html` or bookmarked `?section=` URLs. | Dismissed getting-started card stays hidden via localStorage. |
| **Launch-gated** | Auth (`LaunchAuthGate`) or membership (`MembershipGate`) when enforcement is on. | In-app checklist appears only after the user reaches the normal shell (post-gate). |

## Happy path (numbered)

1. **Sign in** (if required) — provider buttons on the auth gate.
2. **Assistant (default tab)** — run a workspace command or hosted Ask; use **Getting started** checklist when visible. The default assistant bubble mentions “checklist above” only while that card is shown; after dismiss it points at dock + ⌘K instead.
3. **Plan** — dock or checklist **Open Plan**; pulse metrics, Today snapshot, soonest queue; **Today** / **Pipeline** tiles; **⌘K** for Integrations and Setup.
4. **Today** — checklist **Open Today** or Plan tile; workstream bar and cockpit lanes.
5. **Integrations & Settings** — **⌘K / Ctrl+K** palette (or deep links).
6. **Stuck?** — Header **Help** → Knowledge Center (`help.html`).

## Where each step surfaces (code map)

| Step | Tab / surface | Primary files |
|------|----------------|---------------|
| Auth / membership | Full-width gate | [`mobileApp.tsx`](src/pages/mobile/mobileApp.tsx) (`LaunchAuthGate`, `MembershipGate`) |
| Getting started checklist | **Assistant** (`chat`) | [`FirstRunJourneyCard.tsx`](src/pages/mobile/FirstRunJourneyCard.tsx), rendered in `mobileApp.tsx` above `MobileChatView` |
| Plan hub | `workspace` | [`MobileWorkspaceHubView.tsx`](src/pages/mobile/MobileWorkspaceHubView.tsx) — identity + **read-only workspace profile** ([`PlanProfileSummary.tsx`](src/pages/mobile/PlanProfileSummary.tsx)), Plan destinations (**Today** / **Pipeline**), Pulse/queue; **⌘K** / dock for Integrations, Settings, Assistant (no duplicate shortcut chips). |
| Today cockpit | `daily` | [`CockpitDailyView.tsx`](src/pages/mobile/CockpitDailyView.tsx) |
| Palette | Any (when unlocked) | [`WorkspaceCommandPalette.tsx`](src/pages/mobile/WorkspaceCommandPalette.tsx), [`mobileTabConfig.ts`](src/pages/mobile/mobileTabConfig.ts) |
| Help | New tab / window | `openExtensionSurface('help')` in `mobileApp.tsx` |
| Install → welcome | Extension | [`background/index.ts`](src/background/index.ts) |

## Dismissal and storage keys

| Key | Purpose |
|-----|---------|
| `brandops:gettingStartedDismissed:v3` | Current: user dismissed the **Assistant** getting-started card. Value `1` = dismissed. |
| `brandops:firstRunJourneyDismissed` | **Legacy** (Today-only card). No longer read; documented so migrations know why some users already saw an older hint. |

**When to bump version:** Change the suffix (`v4`, …) if the checklist content or placement changes materially so returning users see the update once. Bump **`GETTING_STARTED_CONTENT_VERSION`** in [`FirstRunJourneyCard.tsx`](src/pages/mobile/FirstRunJourneyCard.tsx) to match that suffix.

**Workspace seed:** On dismiss, `mobileApp` writes **`seed.welcomeCompletedAt`** (ISO timestamp, first completion only) and **`seed.onboardingVersion`** (matches checklist generation). Visible under Settings → Diagnostics and included in workspace export.

## Out of scope (this design)

- Dedicated `onboarding.html` route.
- Server-driven onboarding without localStorage.
