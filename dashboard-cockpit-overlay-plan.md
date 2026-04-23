# Dashboard cockpit: quick overlays without leaving the page

> **Historical / superseded:** In-browser **cockpit overlays** on `dashboard.html` are **not** the current model; all extension web pages now mount the **same** [`renderChatbotSurface`](../src/pages/chatbotWeb/renderChatbotSurface.tsx) / **MobileApp**. See [`APPLICATION_WIRING_STATUS.md`](APPLICATION_WIRING_STATUS.md).

**Status (archived):** The implementation described below applied to a prior `dashboardApp` stack that has been removed.

**Source context:** There is no file named “system crafty” in this repository. This plan consolidates intent from:

- [`docs/ux-production-readiness-spec.md`](docs/ux-production-readiness-spec.md) — navigation hierarchy, CTA wording, primary vs secondary surfaces.
- [`docs/product-structure.md`](docs/product-structure.md) — modules and where “full” workflows live.
- [`.cursor/skills/popup/SKILL.md`](.cursor/skills/popup/SKILL.md) — compact quick surfaces vs deep dashboards (note: the skill references `src/pages/popup/popupApp.tsx`, which is **not** present in the tree today; treat as guidance for any future quick-capture surface).

---

## 1. Goal

Deliver a **single Cockpit dashboard** mental model:

- Keep the **compass toggle** (`RightPillNavDock`), **section list** (Today / Pipeline / Brand & content / Connections), and **layout modes** (unified scroll vs focused — `cockpitLayout` / `unified-scroll` in store).
- **Quick buttons** open **Help** and **Settings-related** content as **in-page overlays** so users **do not** navigate away when already on **`dashboard.html`**.
- **Minimize** duplicate chrome: one header region, one compass; overlays use a compact bar (title + close).

Non-goals (unchanged):

- Replacing Chrome’s `options_page` (`options.html`) entirely — MV3 still needs a dedicated options surface for deep configuration and OAuth redirects.
- Changing background scripts, content scripts, or manifest structure unless a follow-up task requires it.

---

## 2. Current behavior (as implemented)

| User action                                                 | Code path                                                                                                                         | Result                                                                                                                                          |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Compass → section                                           | `handleCockpitNavigation` → `navigateToSection` in [`src/pages/dashboard/dashboardApp.tsx`](src/pages/dashboard/dashboardApp.tsx) | Stays on dashboard; updates `?section=` and scroll.                                                                                             |
| Compass → Settings / Knowledge on **dashboard**             | Same handler; **no** `openExtensionSurface` for `help` / `options`                                                                | Sets `cockpitOverlay` to `'help'` \| `'settings'`; renders [`CockpitSurfaceOverlay`](src/pages/dashboard/components/CockpitSurfaceOverlay.tsx). |
| **Deep link** `dashboard.html?overlay=help` \| `settings`   | `useEffect` reads [`QUERY.cockpitOverlay`](src/shared/navigation/extensionLinks.ts), opens overlay, **strips** param from URL     | Same overlays as compass.                                                                                                                       |
| Compass → Settings / Knowledge from **options** or **help** | [`navigateCrownFromExtensionSurface`](src/shared/navigation/navigateCrownFromExtensionSurface.ts)                                 | Uses `openExtensionSurface` (options page, new tab for help per `openExtensionSurface.ts`).                                                     |
| Full Dashboard pill on dashboard host                       | [`RightPillNavDock`](src/shared/ui/components/navigation/RightPillNavDock.tsx)                                                    | Hidden when `hostSurface === 'dashboard'`.                                                                                                      |

---

## 3. Target UX (implemented)

1. **Compass** lists [`cockpitNavigationGroups`](src/shared/config/dashboardNavigation.ts).
2. **Surface pills** on dashboard: **Knowledge** → [`KnowledgeCenterBody`](src/shared/help/KnowledgeCenterBody.tsx); **Settings** → [`CockpitSettingsQuickPanel`](src/pages/dashboard/components/CockpitSettingsQuickPanel.tsx) (backed by shared [`CockpitAppearanceFields`](src/shared/ui/components/CockpitAppearanceFields.tsx) + store actions).
3. **Full Dashboard** entry hidden on dashboard.
4. **Keyboard:** `Escape` closes overlay; `Alt+M` toggles compass (`RightPillNavDock`).
5. **Copy:** “Open full Settings” → `chrome.runtime.openOptionsPage()`.

---

## 4. Technical approach (implementation map)

| Plan item                  | Location                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| Overlay state              | `cockpitOverlay` in `dashboardApp.tsx`                                                         |
| Presentation               | `CockpitSurfaceOverlay.tsx`                                                                    |
| Knowledge                  | `KnowledgeCenterBody`, `helpApp.tsx` + overlay                                                 |
| Quick settings             | `CockpitSettingsQuickPanel.tsx` + `CockpitAppearanceFields.tsx` shared with `CoreSetupSection` |
| Connections CTA            | `navigateToSection('connections')` from quick panel                                            |
| Redundant “Full Dashboard” | `RightPillNavDock` `hideRedundantFullDashboard` includes `dashboard`                           |

**Not implemented (optional):** lazy-loaded overlay chunks; focus trap; dashboard `?topic=` for Knowledge overlay scroll.

---

## 5. Files touched (canonical)

| Area              | Files                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard         | [`src/pages/dashboard/dashboardApp.tsx`](src/pages/dashboard/dashboardApp.tsx)                                                                                                 |
| Nav dock          | [`src/shared/ui/components/navigation/RightPillNavDock.tsx`](src/shared/ui/components/navigation/RightPillNavDock.tsx)                                                         |
| Overlay UI        | [`src/pages/dashboard/components/CockpitSurfaceOverlay.tsx`](src/pages/dashboard/components/CockpitSurfaceOverlay.tsx)                                                         |
| Help reuse        | [`src/shared/help/KnowledgeCenterBody.tsx`](src/shared/help/KnowledgeCenterBody.tsx), [`src/pages/help/helpApp.tsx`](src/pages/help/helpApp.tsx)                               |
| Quick settings    | [`src/pages/dashboard/components/CockpitSettingsQuickPanel.tsx`](src/pages/dashboard/components/CockpitSettingsQuickPanel.tsx)                                                 |
| Appearance shared | [`src/shared/ui/components/CockpitAppearanceFields.tsx`](src/shared/ui/components/CockpitAppearanceFields.tsx)                                                                 |
| Links / deep link | [`src/shared/navigation/extensionLinks.ts`](src/shared/navigation/extensionLinks.ts), [`src/shared/navigation/SurfaceNavLinks.tsx`](src/shared/navigation/SurfaceNavLinks.tsx) |

---

## 6. QA checklist (pre-deploy)

- [x] Compass: sections update URL and scroll; `popstate` works.
- [x] Unified scroll vs focused: `shouldRenderSection` still correct.
- [x] Knowledge / Quick settings overlays; Escape closes.
- [x] Quick settings persist via store; **Open full Settings** opens options page.
- [x] Options / help pages: crown nav still uses `navigateCrownFromExtensionSurface` (no dashboard intercept there).
- [ ] Manual: run [`docs/production-readiness-directive.md`](docs/production-readiness-directive.md) pipeline when cutting a release: `npm run check`, `npm run build`, `npm run verify:dist`.

---

## 7. Execution order (suggested) — **completed**

1. [x] Extract `KnowledgeCenterBody`; help page unchanged.
2. [x] Overlay shell + help surface + `handleCockpitNavigation` branches.
3. [x] `CockpitSettingsQuickPanel` + settings surface + Open full Settings.
4. [x] Hide redundant Full Dashboard on dashboard host.
5. [x] Quality gates in CI / local `npm run check` + `build`.

---

## 8. Open decisions (optional follow-ups)

- **Drawer width:** current `max-w-2xl` in `CockpitSurfaceOverlay`.
- **Help topic deep links on dashboard:** overlay does not yet sync `QUERY.helpTopic` from dashboard URL.
- **Integration-hub:** quick panel uses **Connections** section navigation (in-page).

---

## Related one-pager spec

Broader IA (pulse strip, footer links, `MissionMapMetrics` removal): [`docs/one-pager-ia-and-surface-map.md`](docs/one-pager-ia-and-surface-map.md).
