# Cockpit compact UX: minimum signal, minimum effort

> **Historical / superseded:** This spec targeted the **legacy dashboard cockpit** (`CockpitPulseStrip`, unified scroll, density). The product **UI** is now **MobileApp** (chat + Daily). Heuristic and storage ideas here may still inform behavior, but there is no cockpit layout to implement. See [`APPLICATION_WIRING_STATUS.md`](../APPLICATION_WIRING_STATUS.md).

**Implementation status (archived):** Phases A/B referred to `dashboardApp`-era components that are no longer in the active build.

**Audience:** Operators using BrandOps for **growth and portfolio work** who want **fast orientation** (odometers / KPIs) without wading through narrative UI, duplicate metrics, or deep diagnostics on every visit.

**Problem statement:** Even after the **single pulse row** (`CockpitPulseStrip` + `cockpitPulse`) and collapsibles, the dashboard can still feel like **too much information and too much cognitive load** — multiple cards, long subtitles, five parallel “odometers,” and large vertical stacks in **unified scroll** mode.

**Goal:** Make the **default path** as **compact** as possible: **one glance** at health, **one obvious next action**, everything else **behind disclosure** or **optional density**.

**Related specs:** [one-pager-ia-and-surface-map.md](./one-pager-ia-and-surface-map.md) (IA), [dashboard-cockpit-overlay-plan.md](../dashboard-cockpit-overlay-plan.md) (overlays).

---

## 1. Scan: where density comes from today

| Source | What adds vertical / cognitive weight | Notes |
|--------|----------------------------------------|--------|
| **Pulse strip** | **Five** tiles; **compact** hides helper lines and tightens cells | **Comfortable** still shows full hints. Wired via `cockpitDensity === 'compact'`. |
| **Command deck** | Title + **long objective sentence** + pulse + **three jump links** | Duplicates wayfinding the compass already provides. |
| **`BrandHeader` + `CurrentSectionBar`** | Eyebrow, badge, **subtitle**, section label + description | Multiple lines of meta before content. |
| **Unified scroll** | All sections in one page | Maximum content visible; correct for power users, heavy for “minimal” mode. |
| **Today Queue + execution** | Lists, pills, **CollapsibleSection** “More execution context,” advanced diagnostics | Collapsibles help; still many blocks when expanded. |
| **Defaults** (`seed.ts`) | `cockpitLayout: 'sections'`, `cockpitDensity: 'compact'` | New seeded workspaces start **compact**; existing storage unchanged. |

**Conclusion:** Compression is not one component — it is **defaults**, **pulse cardinality**, **copy length**, **spacing tokens**, and **what stays above the fold**.

---

## 2. Design principles (compact mode)

1. **One band, one story** — At the top: either **three** KPIs max for “glance mode,” or five with **no** per-tile subtitle (numbers + labels only).
2. **Compass over inline jumps** — Prefer **one** navigation surface (compass) vs **duplicate** “Jump to …” link rows in the command deck when space is tight.
3. **Progressive disclosure** — Everything beyond pulse + **one** primary lane (e.g. Today Queue summary) defaults **collapsed** or **skipped in a new “minimal” density**.
4. **Shorter copy** — Replace paragraph subtitles with **one line** or remove where the UI is self-explanatory.
5. **Tighter rhythm** — `compact` density should reduce **`space-y-*`**, card padding, and header margin **globally** on the dashboard shell, not only inside `MissionMapOverview`.

---

## 3. Target states (product + engineering)

### 3.1 Density modes (evolution)

| Mode | Intent |
|------|--------|
| **Comfortable** | Current default; full helper text under pulse tiles. |
| **Compact** | Today: collapsibles + some modules respect `isCompact`; **next:** wire `compact` → `CockpitPulseStrip`, reduce shell `space-y`, shorter command deck. |
| **Minimal** (new, optional) | **3 KPIs** only (e.g. follow-ups, queue due, weighted pipeline); hide publishing + outreach in a “More metrics” disclosure **or** single line of text. Ultra-short header; section-focused layout recommended. |

Implement **Minimal** only if product confirms; otherwise ship improvements under **Compact** first.

### 3.2 Defaults (recommended direction)

- **Portfolio / growth glance:** consider defaulting new workspaces to **`cockpitDensity: 'compact'`** and/or **`cockpitLayout: 'sections'`** (one section at a time reduces scroll depth).
- **Unified scroll:** keep opt-in for users who want the full “one pager” after they understand the compass.

*(Changing defaults touches `seed.ts` + migration story — decide in release notes.)*

---

## 4. Concrete backlog (prioritized)

### Phase A — Low risk, high visibility

- [x] **`CockpitPulseStrip` `compact`** wired to `cockpitDensity === 'compact'` in `dashboardApp.tsx`.
- [x] **Dense pulse:** when compact, **per-tile helper lines** under the numbers are **hidden**; tighter cell padding and gaps.
- [x] **Command deck:** compact uses a **short headline**, **no** long paragraph, **three jump links** replaced by a **one-line compass hint** (comfortable keeps full copy + links).

### Phase B — Shell spacing

- [x] **`bo-dashboard-shell--compact`** in `index.css` (tighter shell padding); main uses **`space-y-2`**, inner grid **`gap-3`**, content column **`space-y-2`** when compact.
- [x] **`BrandHeader`:** `compact` prop — smaller title step, tighter card padding, shorter/clamped subtitle. **`CurrentSectionBar`:** **no** description line when compact (breadcrumb label only).

### Phase C — Unified scroll discipline

- [x] **Verified:** Workspace map, Cockpit metrics, execution context, advanced diagnostics use **`defaultOpen={false}`** on `CollapsibleSection` (no code change).

### Phase D — Optional “Minimal” preset

- [ ] New setting or derived **preset** “Portfolio glance” that sets compact + sections + **3-metric** pulse (feature flag or settings enum).

---

## 5. What we are *not* doing in this doc

- Removing modules (CRM, vault, etc.) — scope is **presentation density**, not product cut.
- Replacing the compass — it stays the primary navigation for growth/portfolio users who refuse to read long pages.

---

## 6. Success criteria

- A growth/portfolio user can open the cockpit and answer **“am I okay / what’s on fire?”** in **&lt; 10 seconds** without scrolling (or with one short scroll).
- **Compact** mode is visibly **tighter** than comfortable: fewer lines of copy, smaller vertical gaps, smaller or fewer pulse helpers.
- Power users can still expand **unified scroll** and **comfortable** density.

---

## 7. Files touched (implementation)

- [`src/pages/dashboard/dashboardApp.tsx`](../src/pages/dashboard/dashboardApp.tsx) — compact shell classes, pulse `compact`, command deck, header/section/sign-out copy.
- [`src/pages/dashboard/components/CockpitPulseStrip.tsx`](../src/pages/dashboard/components/CockpitPulseStrip.tsx) — hide hints, tighter cells when `compact`.
- [`src/shared/ui/BrandHeader.tsx`](../src/shared/ui/BrandHeader.tsx) — optional `compact` prop.
- [`src/modules/brandMemory/seed.ts`](../src/modules/brandMemory/seed.ts) — default **`cockpitDensity: 'compact'`** for new seeded workspaces.
- [`src/styles/index.css`](../src/styles/index.css) — `.bo-dashboard-shell--compact` padding.

---

**Status:** Phases A–C done; Phase D remains optional.
