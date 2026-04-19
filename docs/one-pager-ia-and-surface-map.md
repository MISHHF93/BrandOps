# One-pager IA: surface map, compass navigation, and KPI consolidation

**Implementation status:** **Synced with the repo** — Phases B–D are implemented in code (pulse strip, `SurfaceNavLinks` anchors + `?overlay=`, shared `CockpitAppearanceFields`). Phase A onboarding copy (“default unified scroll”) remains a **product copy** choice, not enforced in code.

**Purpose:** Distinguish what each extension **HTML page** does today, call out **duplication and redundant navigation**, and define a **target single-shell experience** where the **dashboard is the one pager** (KPIs + work), and the **compass** moves between **areas and lightweight panels** (settings preview, knowledge, connections) without opening extra documents when possible.

**Related code:** [`extensionLinks.ts`](../src/shared/navigation/extensionLinks.ts) (`QUERY.cockpitOverlay`, `buildDashboardUrl`), [`dashboardNavigation.ts`](../src/shared/config/dashboardNavigation.ts) (compass items), [`dashboardApp.tsx`](../src/pages/dashboard/dashboardApp.tsx) (`cockpitPulse`, overlays), [`CockpitPulseStrip.tsx`](../src/pages/dashboard/components/CockpitPulseStrip.tsx), [`SurfaceNavLinks.tsx`](../src/shared/navigation/SurfaceNavLinks.tsx).

**Deployment note:** This file lives in `docs/` and ships with the repository. The Chrome release tarball (`npm run package:release`) contains only `dist/`; clone or archive the repo to distribute this spec with the team.

---

## 1. Current HTML surfaces (who owns what)

| Surface | File | Primary job | Must stay separate? |
|--------|------|-------------|---------------------|
| **Index** | `index.html` | Dev redirect → welcome | Yes (thin redirect only) |
| **Welcome** | `welcome.html` | Auth gateway, legal entry, “continue to app” | **Yes** — OAuth and first-run contract |
| **Dashboard / Cockpit** | `dashboard.html` | Execution: pipeline, content, CRM modules, mission map, scheduler context | **Target: canonical “one pager” shell** |
| **Settings** | `options.html` | Manifest `options_page`: OAuth, import/export, integrations, diagnostics, AI tools | **Yes for Chrome** — deep config + `chrome.identity` flows |
| **Knowledge Center** | `help.html` | Full-page manual, deep links `?topic=` | **Optional long-term** — overlaps dashboard overlay |
| **Privacy** | `privacy-policy.html` | Static legal (and optional hosted URL) | **Yes** |
| **OAuth callbacks** | `public/oauth/*.html` | Provider redirect handling | **Yes** |

**Conclusion:** You cannot literally merge *everything* into one browser document (Welcome and Options have different platform contracts). The realistic “one pager” is: **one primary work document (`dashboard.html`)** with **unified scroll**, **one KPI strip**, and **compass-driven panels** for help/settings previews; **Welcome** and **full Options** remain specialized entry points with **fewer duplicate paths** into the same content.

---

## 2. Function map by page (what users do there)

### Welcome (`welcomeApp.tsx`)

- Sign in / sign up flows, OAuth, session gating (`canAccessApp`).
- Continue → `dashboard.html` (with session marker).
- Link out to **Settings** URL for users who need config before cockpit.

**Keep:** Auth and identity. **Reduce:** Repeated marketing chrome if any; keep CTAs single-purpose.

### Dashboard (`dashboardApp.tsx`)

- **Cockpit sections:** Today, Pipeline, Brand & content, Connections (`?section=`).
- **KPIs / “odometers”:** **`CockpitPulseStrip`** (single `cockpitPulse` memo: urgent follow-ups, queue due today, weighted pipeline, publishing in play, active outreach) in the command deck; **`StatCard`** clusters in deeper sections; **`MissionMapOverview`**, **`DashboardSystemsLean`** stats. (`MissionMapMetrics` was removed to avoid duplicating the pulse row.)
- **Layout modes:** Unified scroll vs section focus (`cockpitLayout` in store).
- **Overlays:** Knowledge Center body (embedded), Quick settings (subset of Options).
- **Compass:** `RightPillNavDock` — sections + surfaces.

**Target:** This is the **single scroll of record** for *work + health at a glance*.

### Settings (`optionsApp.tsx`)

- **Core setup:** theme, visual/motion, cockpit layout/density, notification center, cadence (via `CoreSetupSection`, `GettingStartedSection`).
- **Integrations:** OAuth client IDs, connect/disconnect, redirect URI copy (`IntegrationsSection`).
- **Workspace data:** import/export, reset, demo, debug (`WorkspaceDataSection`, `AdvancedToolsSection`).

**Keep:** Anything that needs **full page**, **file pickers**, **long forms**, **confirm()** destructive actions, **OAuth**. **Dedupe vs dashboard:** Do not maintain two divergent “core setup” UIs — **one implementation**, surfaced as **full page** here and **compact overlay** on dashboard (already started with `CockpitSettingsQuickPanel`).

### Knowledge Center (`helpApp.tsx` + `KnowledgeCenterBody`)

- Daily playbook + topic reference; `?topic=` scroll on **help.html**; embedded **hash** jumps in dashboard overlay.

**Dedupe:** Same `KnowledgeCenterBody` — **no second copy of copy**. Dashboard opens Knowledge in an **overlay**; **`help.html`** remains for direct URLs and `?topic=` bookmarks.

### Footer / cross-links (`SurfaceNavLinks`, `ExtensionPagesFooter`)

- Sign in/up, **`<a href>`** to `dashboard.html` (and `?overlay=help`, `?section=connections`), **Settings** → `options.html`, Privacy — implemented in [`SurfaceNavLinks.tsx`](../src/shared/navigation/SurfaceNavLinks.tsx) via `buildDashboardUrl()` / `resolveExtensionUrl()` (no `openExtensionSurface` for those entries).

**Footers** still support signed-out navigation; Knowledge Center link lands on **cockpit + overlay** (`?overlay=help`) instead of forcing a separate `help.html` tab for that path.

---

## 3. Where duplication and “too many pages” come from

### 3.1 Intentional (two documents, same component)

- `KnowledgeCenterBody` in **overlay** and **help.html**: same content — **good** if kept one component (already done).

### 3.2 Risky duplication (two UIs drifting)

- **Cockpit quick settings** vs **Options → Core setup** (theme, layout, density, motion): must share **one source of truth** (store is shared; **forms should call the same store methods** and stay label-consistent).

### 3.3 Repeated metrics (KPI / odometer feel)

- **Addressed in code:** **`CockpitPulseStrip`** is the single odometer row in the command deck; the old duplicate **`MissionMapMetrics`** block was removed. Detail remains in collapsible **Cockpit metrics** (health severity strip), **mission map**, **systems lean**.

**Direction (ongoing):** Keep naming aligned (“Urgent follow-ups” in pulse vs elsewhere); optional future trim of overlapping **StatCard** rows in execution context.

### 3.4 Multiple entry points to the same destination

- Compass / palette / footer “Knowledge Center” → **dashboard + overlay** (or `?overlay=help` on load). **`help.html`** is still valid for bookmarks and full-page manual.

### 3.5 React “double render” in development

- Strict Mode and dev-only double invocation can look like duplicated renders — **not** the same as duplicate UI. Validate in **production build** when tuning.

---

## 4. Target one-pager UX (dashboard as shell)

### 4.1 Principles

1. **One scroll** default: `cockpitLayout = unified-scroll` for new installs or as recommended in onboarding copy.
2. **Compass = primary navigation** between **sections** (Today, Pipeline, Brand & content, Connections) and **light surfaces** (Knowledge overlay, Quick settings); **Connections** can remain a **section** rather than a seventh HTML page for daily use.
3. **KPI strip:** One horizontal or grid **pulse row** at top (odometer-style numbers + short labels) — **the** place for “how am I doing right now.”
4. **Full Options** = **secondary**: “Open full Settings” only when OAuth, import/export, or advanced tools are needed.

### 4.2 Information architecture (single document)

```
[ BrandOps Cockpit header ]
[ KPI pulse strip — five metrics, shared `cockpitPulse` derivation ]
[ Section: Today — command deck + scheduler / execution ]
[ Section: Pipeline — outreach + CRM ]
[ Section: Brand & content — vault, library, queue ]
[ Section: Connections — lean systems + integrations summary ]
[ Optional: sticky compass — already global ]
```

### 4.3 Compass responsibilities (justice / clarity)

| Compass target | Behavior on one-pager |
|----------------|----------------------|
| Today / Pipeline / Brand & content / Connections | Scroll + `?section=` (already) |
| Knowledge Center | Overlay (dashboard); optional “Open full manual” → `help.html` only if needed |
| Settings | Quick overlay → full `options.html` for deep work |
| Full Dashboard | Hidden on dashboard (already) |

---

## 5. Clickability and optimization checklist (audit list)

Use this when reviewing each surface:

- [ ] **Hit targets:** Buttons/links ≥ 44px where possible; `bo-link` not used for sole control on dense mobile.
- [x] **Focus:** Escape closes cockpit overlays; compass Alt+M still works; focus trap inside overlay not implemented (optional a11y follow-up).
- [x] **Dead ends:** Dashboard compass opens Quick settings overlay or full Options via **Open full Settings**; profile setup can still jump straight to Options for integrations.
- [x] **Reduced tabs:** Knowledge from dashboard uses overlay; footer uses `dashboard.html?overlay=help` instead of a new tab for that link.
- [x] **Single KPI source:** Pulse metrics come from **`cockpitPulse`** (`derived` + live counts on `data`).
- [x] **Collapsibles:** Advanced blocks default **closed** where using `CollapsibleSection` with `defaultOpen={false}`; compact density still partially applied elsewhere.

---

## 6. Phased implementation (squeeze toward one pager)

**Phase A — IA clarity (low risk)**  
- [x] Document alignment: this file + README pointer.  
- [ ] Product copy: recommend **unified scroll** in welcome/dashboard onboarding (optional copy change).

**Phase B — Dedupe metrics**  
- [x] **`CockpitPulseStrip`** + **`cockpitPulse`** memo; removed **`MissionMapMetrics`**; cockpit metrics collapsible keeps health strip + note pointing at pulse as single odometer source.

**Phase C — Navigation cleanup**  
- [x] **`SurfaceNavLinks`:** `buildDashboardUrl()` / `buildDashboardUrl({ overlay: 'help' })` / `section: 'connections'` as `<a href>`.  
- [x] **`QUERY.cockpitOverlay`** + dashboard `useEffect` opens overlay once, then strips param.  
- [x] Compass/palette Knowledge → overlay (unchanged).

**Phase D — Options slimming**  
- [x] Shared **[`CockpitAppearanceFields.tsx`](../src/shared/ui/components/CockpitAppearanceFields.tsx)** used by **`CockpitSettingsQuickPanel`** and **`CoreSetupSection`** (theme / visual-motion-ambient / layout-density). Options page still contains integrations, cadence, notifications, etc.

---

## 7. Success criteria

- User can operate **daily work** from **dashboard.html** with **unified scroll** and **compass** without opening Options or Help tabs.
- **KPIs** appear **once** prominently; detailed metrics remain in sections or collapsibles.
- **No duplicate copy** for Knowledge Center; **no divergent** theme/layout controls between overlay and Options.
- **Welcome** and **Options** remain valid for **auth** and **manifest** reasons, but **feel like satellites**, not parallel cockpits.

---

## 8. Open decisions (product / eng)

- Default **cockpitLayout** for new installs: unified vs section focus (still store default; no code change required unless product picks one).
- **`help.html`:** Kept; footer now prefers **`?overlay=help`** on dashboard; full manual page still available via URL.
- **Pulse strip:** Five KPIs locked in code — urgent follow-ups, queue due today, weighted pipeline ($), publishing in play, active outreach drafts.

This spec stays the **contract** for one-pager UX; Phases B–D are **done in code**. Remaining work is optional polish (onboarding copy, hit-target audit, overlay focus trap, `React.lazy` for overlay bodies).
