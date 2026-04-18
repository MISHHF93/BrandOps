# BrandOps Component Library

## What Was Built

A reusable component system was added under `src/shared/ui/components` with four groups:

- `primitives/`
  - `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Badge`, `StatusPill`, `Divider`, `Tooltip`
- `layout/`
  - `AppShell`, `PageHeader`, `SectionHeader`, `Card`, `Panel`, `Tabs`, `EmptyState`, `Drawer`, `Modal`
- `workflow/`
  - `StatCard`, `ActivityItem`, `ContentItemCard`, `ScheduledTaskRow`, `PipelineColumn`, `ContactCard`, `OpportunityCard`, `ReminderItem`, `QuickActionTile`
- `feedback/`
  - `Toast`, `ToastViewport`, `InlineAlert`, `ConfirmDialog`, `LoadingSkeleton`, `Spinner`

Barrel exports:

- `src/shared/ui/components/index.ts`
- Per-group `index.ts` files for local imports.

## Architecture Notes

- Components are presentation-only and do not contain persistence or business logic.
- Reusable style utilities live in:
  - `src/shared/ui/components/utils/cn.ts`
  - `src/shared/ui/components/utils/styles.ts`
- Overlay accessibility utility:
  - `src/shared/ui/components/utils/focusTrap.ts` (focus trap, `Escape` handling, focus restore, optional scroll lock)
- Components consume semantic tokens from the Tailwind design system (`bg-*`, `text-*`, `border-*`, `ring-focusRing`, `shadow-*`).
- Interactive components implement keyboard and focus behavior through semantic HTML and visible focus rings.

## Example Screen Integration

An integrated showcase was added to the Options surface:

- `src/pages/options/componentLibraryShowcase.tsx`
- wired into `src/pages/options/optionsApp.tsx`

This demonstrates reusable usage of primitives, layout, workflow, and feedback components in one operator-facing screen.

## Testing Considerations

- Run `npm run lint` to validate type-safe prop usage and accessibility-related lint checks.
- Run `npm run build` to validate compile-time integrity and bundling.
- Manual QA checks:
  - keyboard tab flow through buttons, tabs, drawers, and modals
  - visible focus ring on all interactive elements
  - hover/active/disabled state consistency
  - modal/drawer escape key and backdrop-close behavior

## Known Limitations

- Tooltip behavior is lightweight CSS-based and does not currently include viewport collision handling.
- Toast stack is presentational and does not yet include centralized state management or auto-dismiss timers.

## Future Recommendations

- Add controlled + uncontrolled composition patterns for `Tabs` and `Switch`.
- Add a shared motion utility layer for state transitions to reduce style duplication.
- Introduce visual regression tests for core components before wider module migration.
