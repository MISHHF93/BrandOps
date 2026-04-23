# Component stack and tab-by-tab plan (Phases 5–6)

## Library ranking (highest first)

| Library                   | Role                                                                | Bundle / fit                                                                   | When to add                                                                                                 |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **cmdk**                  | Global command menu (Search + list + groups)                        | Small; brings **@radix-ui/react-dialog** transitively.                         | **Shipped** in [`WorkspaceCommandPalette.tsx`](../../src/pages/mobile/WorkspaceCommandPalette.tsx).         |
| **@tanstack/react-table** | Sortable, filterable **data grids** in Pulse / Today / Integrations | Moderate; headless — cells stay Tailwind.                                      | When a tab exposes **enough row density** to justify column headers and sorting; not for 3–5 row summaries. |
| **motion**                | Layout and shared-element transitions                               | Already a dependency.                                                          | After motion spec in `02-visual-language-and-motion.md`; always gate on `data-motion-mode`.                 |
| **react-aria** (optional) | Menus, overlays, listbox a11y primitives                            | Heavier; use if custom keyboard in complex filters exceeds maintenance budget. | Prefer native + cmdk for palette first.                                                                     |
| **visx** (optional)       | Custom charts (Pulse / Today)                                       | D3 + React; add only for **concrete** metrics.                                 | Defer until metrics and data contracts are defined.                                                         |

**Not adopted here:** a full **shadcn/ui** install — patterns can be copied, but the repo stays Tailwind + app tokens.

**Guardrails:** MV3 and mobile shell favor **one overlay stack**; avoid piling multiple modal libraries.

## Tab-by-tab upgrade plan

### Pulse

- **Layout:** Timeline / queue remains primary; add optional **table** view for “soonest first” with TanStack if row count and columns grow.
- **Components:** `PulseTimelineView`; future filter chips; keep **Jump** actions; align copy with the palette “Go + run.”
- **Metrics:** Counts in snapshot strip; optional visx only if a **trend** is product-critical.

### Chat

- **Layout:** Thread + **composer**; composer stays the richest command affordance; palette is **global** duplicate entry.
- **Components:** `MobileChatView`; `CHAT_QUICK_STARTER_GROUPS` shared with the palette; persist chips unchanged.
- **Interactions:** Enter to send; destructive confirm path unchanged; optional **“prime only”** from palette later.

### Today (Cockpit / `daily`)

- **Layout:** Workstream list + per-workstream content from [`CockpitDailyView`](../../src/pages/mobile/CockpitDailyView.tsx); [`CockpitWorkstreamCommandStrip`](../../src/pages/mobile/CockpitWorkstreamCommandStrip.tsx) stays the tab-local command aid.
- **Components:** When digest tables grow, introduce TanStack for **one** primary grid (e.g. pipeline) first.
- **Metrics:** Per-workstream summaries; visx only if a chart replaces a list.

### Integrations

- **Layout:** Sources, artifacts, SSH nodes — good TanStack candidate **when** sort/filter is needed.
- **Components:** `MobileIntegrationsView`; connect flows stay Chat/settings-driven.

### Settings

- **Layout:** Grouped forms and session actions; no palette bypass for `applySettingsConfigure` (configure commands stay on their path).
- **Components:** `MobileSettingsView`, appearance fields, export/import, reset; overlays follow existing `bo-system-sheet` pattern.

## Help (out of five-tab scope)

- **Knowledge Center** in `help.html` — keep navigation via `openExtensionSurface('help')` and the palette; do not merge into `MobileApp` routing.

## Bundle budget (rule of thumb)

- Each new runtime dependency should justify a **user-visible** improvement in the **next** milestone.
- **visx** only after a written metric spec; **@tanstack/react-table** one tab at a time.
