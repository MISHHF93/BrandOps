---
name: popup
description: Optimize the Quick actions popup page for small-screen fit, tighter information density, and non-redundant scope versus Dashboard/Settings/Help. Use when editing popup layout, reducing overflow/scroll depth, trimming duplicate actions, or auditing popup feature overlap.
---

# Popup Optimization Skill

## Purpose
Keep `popup` fast, compact, and distinct from full surfaces.

## Target Surface
- `src/pages/popup/popupApp.tsx`

## Supporting Surfaces For Redundancy Checks
- `src/pages/dashboard/dashboardApp.tsx`
- `src/pages/options/optionsApp.tsx`
- `src/pages/help/helpApp.tsx`
- `src/pages/welcome/welcomeApp.tsx`

## Core Rules
1. Popup is a **quick-capture surface**, not a full dashboard.
2. Default popup viewport should avoid unnecessary vertical scroll on common laptop sizes.
3. If a block duplicates deep workflows already present in Dashboard/Settings, keep only a compact shortcut/action in popup.
4. Favor 1-click actions and short summaries over verbose cards.
5. Keep language product-facing and concise.

## Workflow Checklist

Use this checklist for every popup optimization task:

```text
Popup Optimization Progress
- [ ] Identify popup sections and vertical space usage
- [ ] Mark blocks as Keep / Compress / Remove
- [ ] Audit redundancy against Dashboard/Settings/Help/Welcome
- [ ] Apply compact spacing and typography updates
- [ ] Preserve primary quick actions
- [ ] Verify typecheck and lint state
```

## Keep / Compress / Remove Criteria

### Keep (high value in popup)
- Snapshot KPIs (small)
- Fast action buttons (add draft, outreach, note, follow-up)
- Short timeline (limited items)
- Route shortcuts to larger surfaces

### Compress
- Card paddings, gaps, heading sizes, badge footprint
- Timeline/note list lengths
- Explanatory copy

### Remove or move behind shortcut
- Deep diagnostics
- Long narrative descriptions
- Full editing workflows already better handled in Dashboard/Settings

## Redundancy Audit Method
1. List each popup block and action.
2. Map each to owner surface:
   - Dashboard: execution and operational lanes
   - Settings: configuration/integration controls
   - Help: documentation and guidance
   - Welcome: onboarding/sign-in
3. If popup includes a deep version of owner-surface functionality, replace with:
   - a compact summary, or
   - a one-click navigation action.

## UI Density Defaults
- Main stack gap: `gap-3` (or tighter if needed)
- Card spacing: `space-y-2`
- Metric value text: `text-lg` max in popup
- List sizes:
  - timeline: max 4–5
  - recent notes: max 2–3
- Buttons:
  - short labels
  - avoid multi-line controls where possible

## Validation
After edits:
1. Run typecheck.
2. Confirm no lints in changed files.
3. Ensure popup still supports quick-capture actions without opening heavy panels.

