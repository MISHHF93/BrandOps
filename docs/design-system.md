# BrandOps Tailwind Design System

BrandOps uses a semantic-token Tailwind foundation so all modules share one operator-grade visual language.

## Token Source

- Tailwind semantic token mapping: `tailwind.config.cjs`
- Runtime token values (dark mode only): `src/styles/index.css`

## Semantic Token Rules

1. Use semantic classes only (`bg-surface`, `text-textMuted`, `border-borderStrong`, `ring-focusRing`).
2. Do not use ad hoc hex values, raw `slate/*` palettes, or one-off custom gradients in feature components.
3. Use the shared typography tokens (`text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-bodyStrong`, `text-meta`, `text-micro`) instead of hardcoded font sizes.
4. Use shared radius (`rounded-sm` through `rounded-2xl`) and shadows (`shadow-panel`, `shadow-hover`, `shadow-glow`) for consistency.
5. Keep motion subtle with the shared duration tokens (`duration-fast`, `duration-base`, `duration-slow`).
6. Use `bg-signal-grid` only for dashboard/background surfaces, never for dense content containers.

## Accessibility Baseline

- Interactive components must expose visible keyboard focus with `ring-focusRing`.
- Overlay surfaces (modal/drawer) must support `Escape`, focus trapping, and focus restoration.
- Inputs should expose invalid state via `aria-invalid` when validation fails.

## Future Usage Guidance

- Build new feature screens from `src/shared/ui/components` first.
- If a new visual pattern appears more than once, extract it into a reusable primitive/layout/workflow component.
- Keep presentation concerns inside the component library and keep domain logic in modules/state/services.

