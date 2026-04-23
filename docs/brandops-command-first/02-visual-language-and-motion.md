# Visual language and motion system (Phases 3–4)

BrandOps already applies **light/dark** via `data-theme` and **motion intensity** via `data-motion-mode` (`off` | `balanced` | `wild`), with `prefers-reduced-motion` forcing **off**. Visual work should **refine tokens and components**, not replace CSS variable roots in [`src/styles/index.css`](../../src/styles/index.css).

## Visual language (premium operator console)

| Area                | Direction                                                                                                                                                   | Notes                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Elevation**       | Prefer **border + soft fill** over heavy drop shadow; use `border-border/*` and `bg-bgElevated`, `bo-glass-panel` for raised panels.                        | Aligns with existing `shadow-panel` usage.                                      |
| **Translucency**    | Use **only on elevated** chrome: `backdrop-blur`, `bg-*/80` or `bg-*/95` for floating bars and dialogs.                                                     | Avoid full-viewport “glass” that competes with content.                         |
| **Spacing rhythm**  | Tighten **in-card** padding consistency; add **breathing room** around the **command band** (palette, Chat composer) so the command layer reads as primary. | Mobile max width `max-w-md` is intentional.                                     |
| **Section headers** | Keep `text-[10px] uppercase tracking` pattern; strengthen **hierarchy** with one clear title line per view + one muted subline.                             | See shell headers in `PulseTimelineView`, `MobileChatView`, etc.                |
| **Chips and tabs**  | **Tactile** = visible border on active, `bg-surfaceActive` for selection, no neon gradients.                                                                | Bottom nav: [`MobileShellNav`](../../src/pages/mobile/mobileTabPrimitives.tsx). |
| **Icons**           | `lucide-react` at **stroke 2**; one icon + label in headers for scanability.                                                                                |                                                                                 |

**Avoid:** neumorphism, large gradients, 3D chrome, or new brand colors outside existing semantic tokens.

## Motion system

**Library:** `motion` (already in [`package.json`](../../package.json)) — use for **layout**, **tab/panel** continuity, and **list reorder feedback**, not ambient loops.

| Mode (`data-motion-mode`) | Use motion for                                                                                                          | Avoid                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **off**                   | None beyond instant state change (respect user + `prefers-reduced-motion`).                                             | `layout` / `layoutId` animations; hover-only flourishes. |
| **balanced** (default)    | **Tab content** cross-fade or height collapse under 200–280ms; **command result** strip updates with a single ease-out. | Bouncy springs; &gt;300ms for frequent updates.          |
| **wild**                  | Slightly more expressive eases; still cap durations so scheduler/cockpit updates do not feel sluggish.                  | Full-screen shimmers, parallax.                          |

**Command execution feedback:** After `executeAgentWorkspaceCommand`, the thread already appends a result message; add motion only to **the new row** or **scroll position**, not the whole app chrome.

**Where to add Motion in code (incremental):**

- Tab switch: wrap the active tab’s section child in a subtle opacity or Y-offset transition, gated on `data-motion-mode !== 'off'`.
- `layout` / `layoutId` for **workstream** chips or Cockpit subsections that reorder from snapshot changes.

**Respect existing utilities:** `motion-safe:`, `motion-reduce:`, and [`styles.ts` transition helper](../../src/shared/ui/components/utils/styles.ts).

## Verification

- Toggle theme (light/dark) and `motion off / balanced / wild` in Settings; no palette or new surface may introduce hard-coded hex outside tokens.
- With **reduced motion** OS setting, `applyDocumentTheme` already forces `data-motion-mode` to `off` — new animations must no-op in that case.
