# Routing audit — extension surfaces & Settings (2026-04-20)

## Scan (automated)

**HTML entry surfaces (repo root / `public/`):**

- `index.html`, `dashboard.html`, `welcome.html`, `options.html`, `help.html`
- `public/privacy-policy.html`
- `public/oauth/*-brandops.html` (OAuth callbacks)

**Call sites for `openExtensionSurface(` (grep):**

| File | Usage |
|------|--------|
| `src/shared/navigation/openExtensionSurface.ts` | Implementation |
| `src/pages/dashboard/dashboardApp.tsx` | `'options'` (full settings + compass), `item.target`, toolbar |
| `src/shared/ui/components/layout/ExtensionSurfaceLayout.tsx` | `'options'`, `'dashboard'` |
| `src/pages/dashboard/components/DashboardSystemsLean.tsx` | `'options'` |
| `src/pages/options/sections/GettingStartedSection.tsx` | `'help'` |
| `src/pages/welcome/WelcomeTermsConsent.tsx` | `'help'` |
| `src/shared/navigation/navigateCrownFromExtensionSurface.ts` | `'dashboard'` with section, or `item.target` |

**Commands (exit 0):**

```text
npm run typecheck
npm run test:unit
```

Result: `tsc -b` OK; Vitest `tests/unit` — 10 files, 38 tests passed.

## Problems found

1. **`openExtensionSurface('options')` short-circuited to `chrome.runtime.openOptionsPage()`** with no registered `options_ui` / `options_page` in the manifest. In MV3 that often does nothing, so “full Settings” felt broken.
2. **Unreachable fallback:** After the early return, `PAGE.options` was never used for same-document navigation; behavior depended entirely on `openOptionsPage`.
3. **UX confusion:** Cockpit **Quick settings** overlay listed **“Open Connections area”** above **“Open full Settings”**, so the primary tap target for “go somewhere else” was Connections first.
4. **Compass “Settings”** opened only the **overlay** (`?overlay=settings` flow), not the full `options.html` tab — misaligned with “full settings” expectation.

## Fixes applied

| Area | Change |
|------|--------|
| `public/manifest.template.json` | Added `options_ui.page` = `options.html`, `open_in_tab`: true (so `openOptionsPage` is valid if used elsewhere). |
| `src/shared/navigation/openExtensionSurface.ts` | Open **options** (and **help**) via `chrome.tabs.create` + `resolveExtensionUrl` (same pattern as Help), with `window.open` fallback. |
| `src/pages/dashboard/dashboardApp.tsx` | `openFullSettingsWindow` → `openExtensionSurface('options')`. Compass target `options` → same (no overlay-only path). |
| `src/pages/dashboard/components/CockpitSettingsQuickPanel.tsx` | **Open full Settings** button first; Connections link second. |
| `src/shared/navigation/extensionLinks.ts` | Comment updated to describe `options_ui` + `openExtensionSurface`. |

## Deep links unchanged

- `dashboard.html?overlay=help|settings` still opens the Knowledge / Quick settings overlay once, then strips the query (see `QUERY.cockpitOverlay`).

## Manual verification (extension build)

1. Load unpacked extension; open **dashboard**.
2. Cockpit → **Settings**: should open **`options.html`** in a **new tab**.
3. Quick settings overlay → **Open full Settings**: same.
4. **Open Connections area** should navigate dashboard to **Connections** only when that control is used.

---

## Compass (`RightPillNavDock`) coverage (2026-04-20)

**Vite MPA inputs:** `index.html` (redirect), `dashboard.html`, `welcome.html`, `options.html`, `help.html`.

| Surface | React app | Compass on loading / error / auth | Notes |
|---------|-----------|-----------------------------------|--------|
| Dashboard | `dashboardApp.tsx` | Yes | Replaces blank loading with “Loading cockpit…” + dock; error and `DashboardAuthGate` include dock |
| Settings | `optionsApp.tsx` | Yes | Error and loading branches mount dock |
| Help | `helpApp.tsx` | Yes | Same |
| Welcome | `welcomeApp.tsx` | Yes | `hostSurface="welcome"`; all branches |
| Static | `public/privacy-policy.html` | N/A | Footer links to sibling HTML pages only (no React bundle) |
| OAuth callbacks | `public/oauth/*.html` | N/A | Minimal redirect UIs |

**Toolbar:** Manifest has no `action.default_popup`; background opens `dashboard.html` in a new tab. Knowledge Center copy matches this behavior.

**Host type:** `RightPillNavDockHostSurface` includes `welcome`; `cockpitGroupsForHost` still hides redundant same-surface entries only for `dashboard` / `options` / `help`.
