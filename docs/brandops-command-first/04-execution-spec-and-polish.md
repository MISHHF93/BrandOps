# Front-end execution spec and premium polish (Phases 7–8)

## Component inventory (current + near-term)

| Component / area        | Location                                                                            | Notes                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Shell                   | [`mobileApp.tsx`](../../src/pages/mobile/mobileApp.tsx)                             | Header, main, bottom nav, gates, **WorkspaceCommandPalette**.          |
| Command palette         | [`WorkspaceCommandPalette.tsx`](../../src/pages/mobile/WorkspaceCommandPalette.tsx) | `cmdk` + `Command.Dialog`.                                             |
| Tab views               | `Pulse*`, `Cockpit*`, `Mobile*View`                                                 | Each receives `runCommand` / `primeChat` as today.                     |
| Theme                   | [`theme.ts`](../../src/shared/ui/theme.ts)                                          | `applyDocumentThemeFromAppSettings` on load and after commands.        |
| Future: motion wrappers | TBD                                                                                 | Optional `motion` on tab body; see `02-visual-language-and-motion.md`. |
| Future: data tables     | TBD                                                                                 | `@tanstack/react-table` in one view first.                             |

## Page structure and state

- **State source:** `BrandOpsData` via `storageService` + `buildWorkspaceSnapshot` for read-only UI.
- **Command path:** `sendQuickCommand` → `startSend` / `executeCommandFlow` → `executeAgentWorkspaceCommand` → storage refresh + chat messages.
- **URL:** `?section=` for tab and Today workstream; `commitTab` and `openCockpitWorkstream` keep history in sync.
- **Palette state:** `commandPaletteOpen` in `MobileApp`; closing on select is handled inside the palette with `onOpenChange(false)`.

## State transitions (command and navigation)

1. **Run command from palette** → `onRunCommand` = `runCommand` → `sendQuickCommand` → switch to **Chat** + `startSend` (same as tab chips).
2. **Navigate** → `commitTab` only.
3. **Help** → `openExtensionSurface('help')`.
4. **Destructive** commands → existing confirm dialog in `MobileApp` (unchanged).

## Accessibility

- **Palette:** `cmdk` provides listbox/combobox roles; `label` set on `Command.Dialog`.
- **Keyboard:** **⌘K / Ctrl+K** global; `vimBindings` default inside `cmdk` (Ctrl+N/J/P/K) — document for power users.
- **Focus:** On open, `Command.Input` is `autoFocus`; on close, focus returns per Radix.
- **Motion:** All new motion must respect `data-motion-mode` and `prefers-reduced-motion`.
- **Contrast:** Only semantic `text-text`, `border-border`, etc.

## Responsive behavior

- **Max width** `max-w-md` for shell and palette; palette `w-[min(100%-1.5rem,28rem)]`.
- **Safe area:** bottom nav and Chat composer already use `env(safe-area-inset-bottom)`; palette is top-anchored (`top-[10vh]`) to avoid clashing with the nav.

## Implementation notes (React + Tailwind)

- Reuse `MOBILE_BTN_FOCUS` and `bo-link` for new header controls.
- New surfaces: `bo-system-overlay--soft` + `bo-system-sheet` for overlays.
- Do not import chart or table libraries until a tab spec is agreed (`03-component-stack-and-tabs.md`).

## Premium polish (checklist for later passes)

- **Typography:** one `text-h1` / `text-h2` per view; cap line length in muted prose.
- **Microcopy:** error strings from the agent stay concise; add **retry** hints in Chat only if product adds retry.
- **Skeletons:** for snapshot refresh, show inline **pulse** placeholders on the affected card (already used in places — extend consistently).
- **Hover / active:** `bg-surfaceActive`, `border-borderStrong` on pressable rows.
- **Empty states:** one line of guidance + one **primary** action (e.g. “Open Chat” or a starter command).
- **Trust:** data ops hints (`dataOpsHint` in `MobileApp`) for export/import/reset; keep audit trail messaging aligned with the agent.

## Suggested implementation tickets (ordered)

1. **Done in tree:** Add `cmdk` and **WorkspaceCommandPalette** + **⌘K** + header **Commands** control.
2. Add **E2E or integration** test: open palette, select “Pulse”, assert `?section=pulse` or active tab (if test harness allows).
3. Optional **“Prime in Chat”** palette item that calls `primeChat` without run.
4. **Motion:** tab content wrapper with `data-motion-mode` gating.
5. **TanStack Table** pilot: single table in Today or Integrations.
6. **visx** pilot: one metric, only with defined data shape.
