# BrandOps Tailwind Design System

BrandOps uses a semantic-token Tailwind foundation so all modules share one operator-grade visual language.

## Token Source

- Tailwind semantic token mapping: `tailwind.config.cjs`
- Runtime token values and component contracts: `src/styles/index.css`

## Token Layers

BrandOps uses a 3-layer token model:

1. **Primitive tokens**: raw color/motion values (`--color-*`, `--duration-*`).
2. **Semantic aliases**: meaning-based mappings (`--bg-page`, `--fg-primary`, `--focus-default`).
3. **Component contracts**: reusable surface/link/overlay/field tokens (`--card-*`, `--panel-*`, `--sheet-*`, `--field-*`).

## Semantic Token Rules

1. Use semantic classes only (`bg-surface`, `text-textMuted`, `border-borderStrong`, `ring-focusRing`).
2. Do not use ad hoc hex values, raw `slate/*` palettes, or one-off custom gradients in feature components.
3. Use the shared typography tokens (`text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-bodyStrong`, `text-meta`, `text-micro`) instead of hardcoded font sizes.
4. Use shared radius (`rounded-sm` through `rounded-2xl`) and shadows (`shadow-panel`, `shadow-hover`, `shadow-glow`) for consistency.
5. Keep motion subtle with the shared duration tokens (`duration-fast`, `duration-base`, `duration-slow`).
6. Use `bg-signal-grid` only for dashboard/background surfaces, never for dense content containers.

## Shared Surface Classes

Prefer these reusable classes before composing long utility strings:

- `bo-card`: primary high-elevation card shell
- `bo-panel`: standard section panel
- `bo-panel-muted`: quieter nested panel
- `bo-control-row`: interactive settings row
- `bo-link` and `bo-link--sm`: action buttons (standard + compact)
- `bo-auth-sheet`: welcome auth container
- `bo-overlay-drawer`: dashboard side overlay shell

## Accessibility Baseline

- Interactive components must expose visible keyboard focus with `ring-focusRing`.
- Overlay surfaces (modal/drawer) must support `Escape`, focus trapping, and focus restoration.
- Inputs should expose invalid state via `aria-invalid` when validation fails.

## Future Usage Guidance

- Build new feature screens from `src/shared/ui/components` first.
- If a new visual pattern appears more than once, extract it into a reusable primitive/layout/workflow component.
- Keep presentation concerns inside the component library and keep domain logic in modules/state/services.

