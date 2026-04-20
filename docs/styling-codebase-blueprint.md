# BrandOps Styling Codebase Blueprint

This blueprint is based on the current codebase structure and styling reality. It is meant to be implemented directly, phase by phase.

## What was analyzed

- Global style entrypoints and theme runtime flow
- Shared UI primitives and utility composition
- Dashboard, overlays, palette, and welcome surfaces
- Focus/contrast/motion consistency points

## Current styling architecture

### Global style and theme entrypoints

- All app surfaces import `src/styles/index.css` from page `main.tsx` files.
- Theme runtime flags are applied in `src/shared/ui/theme.ts` using:
  - `data-theme`
  - `data-visual-mode`
  - `data-motion-mode`

### Token and utility foundation

- Semantic color tokens are mapped in `tailwind.config.cjs`.
- Runtime CSS variables and major visual classes are centralized in `src/styles/index.css`.
- Shared utility class snippets live in `src/shared/ui/components/utils/styles.ts`.

### Reusable primitives vs local styling

- Good primitive coverage exists under `src/shared/ui/components/*`.
- The dashboard (`src/pages/dashboard/dashboardApp.tsx`) still carries heavy local class composition and repeated panel markup.

## Top styling debt to fix first

1. **Overloaded global stylesheet**
   - `src/styles/index.css` currently mixes tokens, components, migrations, and effects.

2. **Migration shims still active**
   - Compatibility selectors in `src/styles/index.css` suggest unresolved class migration.

3. **Repeated card/panel class strings**
   - Duplicated patterns across dashboard/modules/options (same border/bg/padding blocks).

4. **Button sizing via ad-hoc overrides**
   - Frequent `bo-link !px-2 !py-1` indicates missing size variants in the design system.

5. **Dashboard as styling hotspot**
   - `src/pages/dashboard/dashboardApp.tsx` contains too many one-off visual decisions.

6. **Overlay styling not fully tokenized**
   - One-off shadow/background values in:
     - `src/pages/dashboard/components/CockpitSurfaceOverlay.tsx`
     - `src/pages/welcome/WelcomeAuthPanel.tsx`

7. **Custom focus states inconsistent**
   - `bo-link`, nav dock elements need explicit, consistent `:focus-visible`.

8. **Motion definitions split across systems**
   - CSS motion mode + component-level motion usage are not fully aligned.

9. **Muted text on translucent cards risks readability**
   - `text-textMuted`/`text-textSoft` on low-opacity backgrounds needs validation/tuning.

10. **Design-system intent vs implementation drift**
   - Current docs discourage ad-hoc values, but one-off shadows/visual values remain.

## Token strategy (aligned to current naming)

Keep current tokens, add a lightweight semantic/component layer:

### Base tokens (existing)

- `--color-bg`
- `--color-bg-elevated`
- `--color-surface`
- `--color-border`
- `--color-text`
- `--color-text-muted`
- `--color-focus-ring`

### Semantic aliases (new)

- `--bg-page -> --color-bg`
- `--bg-surface-1 -> --color-bg-elevated`
- `--bg-surface-2 -> --color-surface`
- `--fg-primary -> --color-text`
- `--fg-secondary -> --color-text-muted`
- `--stroke-default -> --color-border`
- `--focus-default -> --color-focus-ring`

### Component tokens (new)

- Card: `--card-bg`, `--card-border`, `--card-shadow`
- Panel: `--panel-bg`, `--panel-border`, `--panel-shadow`
- Link/button: `--link-bg`, `--link-border`, `--link-fg`, `--link-focus-ring`
- Overlay/sheet: `--overlay-backdrop`, `--sheet-bg`, `--sheet-shadow`
- Field/input: `--field-bg`, `--field-border`, `--field-focus-ring`

## Implementation order (safest to riskiest)

### Phase 1 - Foundation and guardrails

**Files**
- `src/styles/index.css`
- `docs/design-system.md`

**Actions**
- Split stylesheet sections clearly (tokens vs component contracts).
- Add token comments and naming rules.
- No visual behavior changes in this phase.

**Done when**
- Token intent is documented and discoverable.
- No regressions.

### Phase 2 - Low-risk shared class extraction

**Files**
- `src/styles/index.css`
- `src/shared/ui/components/utils/styles.ts`
- `src/pages/options/sections/GettingStartedSection.tsx`
- `src/pages/options/sections/AdvancedToolsSection.tsx`
- `src/pages/options/sections/CoreSetupSection.tsx`

**Actions**
- Introduce reusable class contracts for common panel/card blocks.
- Replace duplicated utility strings in options sections first.

**Done when**
- Repeated panel strings are reduced in options pages.
- Visual parity holds.

### Phase 3 - Focus and accessibility normalization

**Files**
- `src/styles/index.css`
- `src/shared/ui/components/navigation/RightPillNavDock.tsx`
- `src/pages/dashboard/dashboardApp.tsx`

**Actions**
- Add explicit `:focus-visible` styles for:
  - `.bo-link`
  - nav dock controls
  - palette action rows
- Ensure focus indicators are shape + ring, not color-only.

**Done when**
- Keyboard navigation has obvious, consistent focus across major controls.

### Phase 4 - Overlay and palette harmonization

**Files**
- `src/pages/dashboard/components/CockpitSurfaceOverlay.tsx`
- `src/pages/dashboard/dashboardApp.tsx`

**Actions**
- Replace one-off overlay shadows/backgrounds with token-driven classes.
- Align palette/sheet spacing, border, and visual hierarchy.

**Done when**
- Overlay/palette look and behavior are consistent with the system.

### Phase 5 - Welcome surface alignment

**Files**
- `src/pages/welcome/WelcomeAuthPanel.tsx`
- `src/pages/welcome/WelcomeBackdrop.tsx`

**Actions**
- Remove hardcoded light/dark shadow values.
- Align welcome visual treatment to shared token contracts.

**Done when**
- Welcome no longer visually diverges from dashboard/settings style language.

### Phase 6 - Dashboard consolidation (last)

**Files**
- `src/pages/dashboard/dashboardApp.tsx`

**Actions**
- Extract repeated wrappers into shared classes/components after previous phases stabilize.
- Keep behavior unchanged; style-only cleanup.

**Done when**
- Dashboard has reduced class duplication and clearer style composition.

## Quality gates for each phase

- `npm run check`
- `npm run test:unit`
- `npm run build`
- `npm run verify:dist`
- Manual keyboard focus pass on dashboard/palette/overlays

## First implementation batch (recommended now)

If you want to start immediately, do this first batch:

1. Token section cleanup in `src/styles/index.css`
2. Add explicit focus-visible rules for `bo-link` + nav dock
3. Replace one-off overlay shadow in `CockpitSurfaceOverlay.tsx`
4. Run full quality gate

This gives fast visual quality gain with low product risk.
