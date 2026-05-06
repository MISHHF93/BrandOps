# Plan surface — feature coverage audit

See also **[`PLAN_PAGE_NAVIGATION_UX.md`](./PLAN_PAGE_NAVIGATION_UX.md)** (stay-on-Plan command routing and shortcut IA).

This ties **every surfaced Plan affordance** to the real implementation so the hub is actionable, not ornamental.

## Execution contract

| Surface | Implementation |
|---------|----------------|
| Quick picks (`plan-actions`) | First 8 intents from `getIntentsForPlanHub` + **⌘K** for full `PLAN_PAGE_INTENT_IDS` list |
| Today / Pipeline cards | **Today** navigates in place; **Pipeline** runs `pipeline health` via same stay-on-Plan `runCommand` |
| Queue row Run | `runCommand(workspaceQueueCommandLine)` stay on Plan (`pulseTimeline.ts`) |
| ⌘K “All commands” | `paletteOnRunCommand` + `commandRunContext='plan'` while `activeTab === 'workspace'` (palette copy: “Run from Plan”) |

## Intent catalogue wired on Plan (`getIntentsForPlanPage` + hub slice)

Defined in [`src/pages/mobile/chatIntents.ts`](src/pages/mobile/chatIntents.ts) — **`PLAN_PAGE_INTENT_IDS`** is the canonical palette/Plan order (full list in ⌘K). The **Plan hub** shows only **`getIntentsForPlanHub(8)`** — the first eight ids in that order (see [`PlanPlanningActions.tsx`](src/pages/mobile/PlanPlanningActions.tsx)).

Group taxonomy for the **remaining** commands (palette-only after the hub slice):

Anything added to Plan must stay consistent with **`parseCommandRoute`** + [`agentWorkspaceEngine.ts`](src/services/agent/agentWorkspaceEngine.ts).

## Layout principles (flattening)

One outer **Plan sheet** (`bo-plan-flat-root`) stacks sections with **divider lines** instead of nested cards inside cards:

1. Workspace + account strip (`PlanIdentityHeader`)
2. Narrative headline + destinations + shell shortcuts + jump links
3. Pulse — then **Quick picks** (`PlanPlanningActions`), Today snapshot, Queue (anchor IDs unchanged for deep links/tests)

See also **`PLAN_AND_ASK_PARITY.md`** at repo root (Plan ⇄ Assistant wiring).

## Gaps consciously not on Plan

- **Hosted `ask:`** — remains Assistant-first; Plan links to Assistant.
- **Settings forms** — stay in Settings tab; Plan only exposes `configure:` quick action + billing entrypoint.
- **Today workstreams** — full lanes stay on Today tab (`daily`).

## Verification

- [`tests/integration/mobileTabSurfacesSsr.test.ts`](tests/integration/mobileTabSurfacesSsr.test.ts): Plan SSR landmarks (`plan-pulse`, `plan-queue`, destination grid).
- Manual: tap each Planning basics action with seed data → assistant thread shows workspace result for non-destructive lines.
