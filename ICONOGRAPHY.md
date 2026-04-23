# BrandOps iconography and visual symbols

This document explains **why** we use symbols alongside text, **how** we choose and draw them in this codebase, and **where** they should appear so the cockpit stays scannable without forcing people to read long paragraphs to understand the map.

## 1. Goals: less reading, clearer mental model

| Problem                                    | Role of symbols                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Dense dashboards feel like “walls of text” | Repeated **glyph anchors** (same icon for the same concept everywhere) let the eye jump to the right band before reading. |
| Navigation lists blend together            | **Distinct silhouettes** per area (Today vs Pipeline vs Brand & content) speed recognition.                               |
| Collapsible panels hide structure          | A **small icon in the summary row** signals what kind of content lives inside before expand.                              |
| Accessibility still matters                | Icons are **decorative complements** to labels and headings, not replacements—see §5.                                     |

## 2. Stack: Lucide React (stroke icons)

- **Library:** [`lucide-react`](https://lucide.dev/) (already a project dependency).
- **Style:** Default **outline / stroke** icons match the cockpit’s light borders and retro panels; avoid filled blobs unless we intentionally shift a whole surface to “solid” UI.
- **Stroke weight:** Prefer `strokeWidth={2}` (or `2.2` on the compass toggle only where we already do) for consistency at small sizes.
- **Sizes (px):**
  - **14–16** — inline in pills, table rows, dense lists.
  - **18–20** — section bar / collapsible summaries.
  - **24–28** — primary chrome affordances (e.g. compass toggle).

## 3. How we pick an icon (semantic mapping)

1. **Name the job, not the widget** — “Today / mission / time horizon” → calendar or radar metaphors; “Pipeline / deals” → funnel or kanban; “Brand & content” → layers or sparkles; “Connections / infra” → plug or network.
2. **One icon per domain** — Reuse the same icon in the **nav dock**, **current section bar**, and any **deep link** copy so the mental map stays stable.
3. **Avoid clever metaphors** — Prefer icons users already know from email, calendars, and settings apps over abstract shapes.
4. **Don’t overload color** — Tint with `text-primary/90` or `text-textSoft`; reserve strong color for severity (warnings) via existing `InlineAlert` / tokens.

### 3.1 Canonical cockpit destinations (reference)

| Destination      | Nav id          | Icon rationale                               |
| ---------------- | --------------- | -------------------------------------------- |
| Today            | `nav-overview`  | Time horizon + priorities (`CalendarRange`). |
| Pipeline         | `nav-growth`    | Stages and motion (`KanbanSquare`).          |
| Brand & content  | `nav-content`   | Narrative + assets stack (`Layers2`).        |
| Connections      | `nav-systems`   | Integrations / wiring (`Plug2`).             |
| Settings         | `nav-options`   | Configuration (`Settings2`).                 |
| Knowledge Center | `nav-knowledge` | Manual (`BookOpen`).                         |
| Full Dashboard   | `nav-dashboard` | Whole surface (`LayoutDashboard`).           |

The implementation lives in **`src/shared/ui/icons/cockpitNavIcons.tsx`** so labels in `dashboardNavigation.ts` stay the single source of truth for **copy**, while icons stay centralized for **visual identity**.

## 4. Where to apply symbols (layers)

| Layer                                     | Treatment                                                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Primary navigation** (right pill dock)  | Icon **left of label**, always with visible text (no icon-only primary nav).                                                   |
| **“You are here”** (current section bar)  | Same icon as dock for the active section—reinforces location.                                                                  |
| **Collapsible section summaries**         | Optional **leading icon** on `CollapsibleSection` for heavy/advanced blocks.                                                   |
| **Destructive / irreversible actions**    | Keep text explicit; pair with a caution icon only where we already use `InlineAlert` patterns.                                 |
| **Module panels** (Brand Vault, Queue, …) | Many actions already use Lucide on buttons—extend gradually; prefer **toolbar icon + short label** or icon + tooltip on hover. |

## 5. Accessibility and internationalization

- Mark decorative icons with **`aria-hidden="true"`** when adjacent text already names the control (buttons in the nav dock, section bar).
- **Do not** remove visible labels from primary navigation in favor of icons alone.
- If we ever ship **icon-only** buttons, add **`aria-label`** (and ideally `title` for hover hint).
- RTL: Lucide icons are symmetric enough for v1; if we add directional icons (e.g. chevrons), mirror in RTL via CSS when needed.

## 6. “Drawing” icons the best way possible (for contributors)

1. **Prefer Lucide defaults** — Custom SVGs belong in `/public` only for brand marks (e.g. crown), not for generic actions.
2. **Pixel alignment** — At 16px, use even dimensions; avoid 1px hairlines outside Lucide’s path design.
3. **Hit targets** — Touch-friendly: keep button padding ≥ ~36px effective height where possible (nav dock pills already use padding).
4. **Motion** — Do not animate icons on every render; micro-motion only on hover/focus if product motion mode allows.

## 7. Implementation status (living)

| Item                                                           | Status                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Central map `cockpitNavIcons.tsx`                              | Implemented                                                             |
| Icons in `RightPillNavDock`                                    | Implemented                                                             |
| Optional `leading` on `CurrentSectionBar`                      | Implemented                                                             |
| Optional `summaryIcon` on `CollapsibleSection`                 | Implemented                                                             |
| Key Today-page collapsibles wired with icons                   | Implemented                                                             |
| Major scroll sections (Pipeline, Brand & content, Connections) | Section `h2` + icons aligned with nav dock                              |
| Command deck + Today Queue headings                            | Icons for primary “Today” band                                          |
| Optional `icon` on `SectionHeader`                             | Implemented (options showcase demos)                                    |
| **Settings** jump nav (`OptionsSettingsJumpNav`)               | Icon + label anchors to each settings `<section id>`                    |
| **Settings** section `h2` titles                               | Same icons as jump nav (Getting started → Advanced) for scanability     |
| **Help** topic list + article titles                           | `KnowledgeTopicIcon` in `KnowledgeCenterBody`                           |
| **Execution heat meter** band row                              | `Flame` / `AlertTriangle` / `Circle` next to Critical / Warning / Watch |

## 7.1 Where this guide is “deployed”

- **Repository:** Linked from the root **README** under _Documentation (this repository)_.
- **In-app:** Help → Knowledge Center → **Visual wayfinding (icons)** gives operators the same guidance in short form; this file remains the full reference for contributors.

## 8. Extensions shipped from this guide

- **Heat / severity** — `ExecutionHeatMeter` shows **Flame / warning / watch** glyphs next to the band pill; heat bands also follow tunable rules (see intelligence rules doc).
- **Options page** — `OptionsSettingsJumpNav`: icon + label jump links to each settings `<section id="options-…">`.
- **Help / Knowledge Center** — Topic nav links and article titles include **`KnowledgeTopicIcon`** per topic id.

## 9. Future ideas

- **Theming** — If we add high-contrast mode, bump stroke or swap to higher-contrast Lucide variants.

---

**Summary:** Use **Lucide**, **reuse** the same symbol per domain, keep **labels**, and place icons at **navigation** and **section entry** points so operators grasp the map visually before they read the details.
