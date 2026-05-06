# Plan page (`workspace` tab) — rebuild plan

## Problem

Plan was technically wired (destinations → Pulse → Today snapshot → queue) but felt **nested, anonymous, and non-directional**: no **operator / identity** context, no **account** surface, and **Integrations / Settings / Assistant** were only implied (⌘K copy) instead of obvious next steps. That breaks the mental model of “Plan = command center for the week.”

## Goals

1. **Identity** — Show **workspace operator** (`brand.operatorName`) + one-line **positioning** from the live snapshot.
2. **Account** — Show **sign-in state** (provider + email when authenticated) and a **direct path to Settings** for account and billing (same data `Settings` already uses).
3. **Flat layout** — Replace a single deep “flagship” stack with **separate, labeled panels** (identity → actions → jump links → pulse → today snapshot → queue) so scrolling reads top-to-bottom without hidden structure.
4. **Wiring** — Plan receives `launchAccess` + tab callbacks from `MobileApp` (`commitTab` for chat, integrations, settings).
5. **Compatibility** — Keep stable anchors and copy required by tests: `id="plan-pulse|plan-today|plan-queue"`, Pulse headline, “Integrations & Setup live in ⌘K”, destination grid class, `bo-icon-chip` in queue actions.

## Information architecture (top → bottom)

| Block | Role |
|--------|------|
| **Plan identity** | Operator + positioning + account pill + “Account & billing” → Settings |
| **Primary destinations** | Today (tab), Pipeline health (agent command) — existing grid |
| **Secondary shortcuts** | Assistant, Integrations, Settings (tab switches) |
| **Jump links** | In-page anchors to Pulse / Today snapshot / Queue |
| **Pulse** | `WorkspaceSignalsBoard` workspace variant |
| **Today snapshot** | Cadence headline, counts, peeks |
| **Soonest queue** | Table + Chat prime actions |

## Out of scope (later)

- New agent routes or persistence.
- Replacing ⌘K; still promoted as global command surface.
- Today workstream internals (remain on `daily` tab).

## Acceptance criteria

- Plan renders **without** requiring Settings visit to understand **who** the workspace is for and **whether** the user is signed in.
- From Plan, **one tap** reaches Assistant, Integrations, or Settings.
- SSR integration test **Plan hub** case still passes.

## Files

- Root: **this document** (IA summary from the first rebuild pass)
- Companion audit: **`PLAN_SURFACE_COVERAGE.md`** — maps every Plan control to code paths and catalog order
- [`src/pages/mobile/MobileWorkspaceHubView.tsx`](src/pages/mobile/MobileWorkspaceHubView.tsx) — flat Plan shell + wiring
- [`src/pages/mobile/PlanPlanningActions.tsx`](src/pages/mobile/PlanPlanningActions.tsx) — actionable command grid
- [`src/pages/mobile/PlanIdentityHeader.tsx`](src/pages/mobile/PlanIdentityHeader.tsx)
- [`src/pages/mobile/chatIntents.ts`](src/pages/mobile/chatIntents.ts) — `getIntentsForPlanPage()`, sync intent, palette group
- [`src/pages/mobile/mobileApp.tsx`](src/pages/mobile/mobileApp.tsx) — palette + agent lock props
