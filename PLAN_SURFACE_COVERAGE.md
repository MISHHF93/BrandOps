# Plan surface — feature coverage audit

This ties **every surfaced Plan affordance** to the real implementation so the hub is actionable, not ornamental.

## Execution contract

| Surface | Implementation |
|---------|----------------|
| Plan action tiles | `runCommand` → `sendQuickCommandFrom('Workspace')` in `mobileApp.tsx` → `executeAgentWorkspaceCommand` |
| Today / Pipeline cards | Navigation + same `runCommand` for Pipeline health (`PlanDestinationGrid.tsx`) |
| Queue row Chat | `primeChat(workspaceQueueCommandLine)` → Composer on Assistant tab (`pulseTimeline.ts`) |
| ⌘K “All commands” | `setCommandPaletteOpen(true)` → `WorkspaceCommandPalette` (same catalogue as `chatIntents` groups) |

## Intent catalogue wired on Plan (`getIntentsForPlanPage`)

Defined in [`src/pages/mobile/chatIntents.ts`](src/pages/mobile/chatIntents.ts) — **`PLAN_PAGE_INTENT_IDS`** order:

1. **Planning basics (`essentials`)** — pipeline health, note, create/complete follow-up, reschedule publishing, sync content embeddings, configure workspace.
2. **Pipeline & people** — outreach draft, add contact, opportunity stage/update phrasing from catalog.
3. **Content & calendar** — content idea, draft post helper, angles, tweak draft.
4. **Connections** — Notion/source connect lines from catalog.
5. **Strategy engine** — positioning / offer narrative brand functions referenced by command tokens in catalog.

Anything added to Plan must stay consistent with **`parseCommandRoute`** + [`agentWorkspaceEngine.ts`](src/services/agent/agentWorkspaceEngine.ts).

## Layout principles (flattening)

One outer **Plan sheet** (`bo-plan-flat-root`) stacks sections with **divider lines** instead of nested cards inside cards:

1. Workspace + account strip (`PlanIdentityHeader`)
2. Narrative headline + destinations + shell shortcuts + jump links (`PlanPlanningActions` here)
3. Pulse → Today snapshot → Queue (anchor IDs unchanged for deep links/tests)

See also **`PLAN_AND_ASK_PARITY.md`** at repo root (Plan ⇄ Assistant wiring).

## Gaps consciously not on Plan

- **Hosted `ask:`** — remains Assistant-first; Plan links to Assistant.
- **Settings forms** — stay in Settings tab; Plan only exposes `configure:` quick action + billing entrypoint.
- **Today workstreams** — full lanes stay on Today tab (`daily`).

## Verification

- [`tests/integration/mobileTabSurfacesSsr.test.ts`](tests/integration/mobileTabSurfacesSsr.test.ts): Plan SSR landmarks (`plan-pulse`, `plan-queue`, destination grid).
- Manual: tap each Planning basics action with seed data → assistant thread shows workspace result for non-destructive lines.
