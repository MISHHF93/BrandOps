# BrandOps Styling Implementation Plan

This plan turns the styling direction into immediate execution tasks for design + frontend + QA.

## Objective

Ship a premium, readable, accessible cockpit style system that improves visual hierarchy and speed of scanning without destabilizing current flows.

## Delivery modes

- **Mode A (same-day sprint):** Token foundation + command palette polish + contrast fixes.
- **Mode B (3-day sprint):** Mode A + dashboard bento layout + motion refinement + broader surface harmonization.

## Phase 0 - Baseline and guardrails (30-45 min)

- [ ] Capture before screenshots for `dashboard`, `options`, `help`, `welcome`.
- [ ] Freeze visual scope for this pass (no feature changes).
- [ ] Keep existing lints/tests/build gates as release baseline.
- [ ] Add visual QA checklist for keyboard/focus states and reduced-motion mode.

## Phase 1 - Theme token system (2-3 hours)

### Goal

Create a 3-layer token model to eliminate style drift and speed up future theme updates.

### Tasks

- [ ] Define **primitive tokens** in shared theme styles:
  - neutral scale (surface levels)
  - brand accent scale
  - success/warning/danger scales
- [ ] Define **semantic tokens**:
  - `--bg`, `--surface-1`, `--surface-2`, `--text`, `--text-muted`, `--border`, `--focus`
- [ ] Define **component tokens** for common UI:
  - card, pill, button, overlay sheet, input, focus ring
- [ ] Replace hardcoded color usages in top shared shell components with tokens.

### Acceptance criteria

- No visual regressions in core pages.
- Theme changes are possible by editing token values only.
- Focus ring token is globally reusable and visible in dark mode.

## Phase 2 - Contrast and readability hardening (1.5-2.5 hours)

### Goal

Improve dark-mode comfort and WCAG alignment for text and non-text UI elements.

### Tasks

- [ ] Adjust dark surfaces to layered values (page, card, elevated, modal).
- [ ] Replace harsh white text with softened high-contrast text token.
- [ ] Ensure non-text contrast for borders, icons, and selection indicators.
- [ ] Standardize card/body text sizing rhythm for scanability.

### Acceptance criteria

- Body text meets AA contrast target in primary surfaces.
- Focus states and active states are identifiable without relying on color alone.
- Cards and overlays feel visually distinct by elevation layer.

## Phase 3 - Command palette and overlay polish (2-3 hours)

### Goal

Make the command system feel premium, keyboard-first, and visually obvious.

### Tasks

- [ ] Apply glass-style styling only to palette/overlay surfaces (not globally).
- [ ] Strengthen selected-option style:
  - shape/border/background + icon marker (not color-only)
- [ ] Improve keyboard hint chips and command grouping spacing.
- [ ] Harmonize overlay radius/shadow/backdrop blur with tokenized values.
- [ ] Verify focus order and ring visibility in all actionable controls.

### Acceptance criteria

- Palette feels visually dominant and easy to scan.
- Keyboard users can track focus and selection at all times.
- Overlay style is consistent with dashboard/settings sheets.

## Phase 4 - Dashboard bento hierarchy (2-4 hours)

### Goal

Increase information density while improving clarity of priority zones.

### Tasks

- [ ] Introduce bento rhythm to major dashboard sections:
  - Today Queue (hero)
  - Execute Now
  - Next Up
  - Unblockers
  - Connections pulse cards
- [ ] Add explicit spacing scale for card groups and nested cards.
- [ ] Create one “attention lane” style for urgent cards.
- [ ] Keep compact mode intact; no overflow regressions.

### Acceptance criteria

- Primary actions are identifiable within 3 seconds.
- Section hierarchy is clearer than current linear block flow.
- No broken layout at common widths (small, medium, large desktop).

## Phase 5 - Motion and interaction tuning (1-2 hours)

### Goal

Use lightweight motion to improve feedback without distraction.

### Tasks

- [ ] Limit animations to `transform` and `opacity`.
- [ ] Standardize durations:
  - 100-150ms for control feedback
  - 160-240ms for panel transitions
- [ ] Add/verify `prefers-reduced-motion` fallback behavior.
- [ ] Remove overly decorative transitions from high-frequency actions.

### Acceptance criteria

- Perceived responsiveness improves.
- Motion is subtle and informative.
- Reduced-motion mode is fully usable and calm.

## QA matrix (must pass)

- [ ] Dashboard keyboard-only navigation
- [ ] Command palette open/select/close loop
- [ ] Overlay focus trap and escape behavior
- [ ] Dark mode readability checks
- [ ] Compact mode visual checks
- [ ] Build + lint + unit tests pass

## Fast execution sequence (today)

1. Token scaffold + global focus ring token
2. Command palette visual pass
3. Contrast layer pass on dashboard and overlays
4. Quick bento adjustment on top 2 dashboard lanes
5. QA smoke + push

## Suggested commit slices

- `feat(style): add semantic and component token foundation`
- `feat(style): polish command palette and overlay visual hierarchy`
- `fix(style): improve dark-mode contrast and focus visibility`
- `feat(layout): introduce bento hierarchy for dashboard priority lanes`
- `chore(style): tune motion timings and reduced-motion behavior`

## Definition of done

- Styling is token-driven, not ad-hoc.
- Command and dashboard surfaces feel cohesive and premium.
- Accessibility and readability improve measurably.
- All release gates continue to pass.
