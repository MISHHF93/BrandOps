# Product design audit and command surface (Phases 1–2)

This document captures a repo-aligned audit and the delivered command-surface work. Implementation lives in [`src/pages/mobile/mobileApp.tsx`](../../src/pages/mobile/mobileApp.tsx) and [`src/pages/mobile/WorkspaceCommandPalette.tsx`](../../src/pages/mobile/WorkspaceCommandPalette.tsx).

## Constraints (all phases)

- Preserve `data-theme`, `data-visual-mode`, `data-motion-mode`, and `data-ambient-fx` from [`src/shared/ui/theme.ts`](../../src/shared/ui/theme.ts).
- All agent invocations go through `executeAgentWorkspaceCommand` in [`src/services/agent/agentWorkspaceEngine.ts`](../../src/services/agent/agentWorkspaceEngine.ts) (the same path as Chat Send, via `sendQuickCommand` in `MobileApp`).
- The Help **Knowledge Center** is a separate document (`help.html`); the five-tab shell is `mobile.html` / `MobileApp`.
- Allow for extension-sized surfaces: avoid assuming a full desktop window.

## Prioritized findings (highest impact first)

1. **Command discoverability when not on Chat**  
   The main composer is fixed to the **Chat** tab only, while Pulse/Today/Integrations/Settings use chips and `runCommand` / `primeChat`. The product can feel “command inside Chat” rather than “command-native shell.”

2. **Global command entry**  
   There was no single surface for “jump + run + recent” from any tab. Users relied on the header / bottom nav and in-tab copy.

3. **Hierarchy and density**  
   The shell already uses `bo-glass-panel`, `shadow-panel`, and consistent typography, but the header was light on “operator console” affordances (keyboard, command entry).

4. **Today / Cockpit load**  
   Today combines workstream navigation and `CockpitWorkstreamCommandStrip`-style command hints; the audit flags watching cognitive overlap between workstream chips and the agent.

5. **Navigation alignment**  
   URL `?section=` and [`mobileShellQuery`](../../src/pages/mobile/mobileShellQuery.ts) must stay in sync with in-app tab switches (already handled in `commitTab`).

6. **Motion**  
   `motion` is a dependency, with user-controlled `data-motion-mode`. Decorative animation should stay secondary to purposeful layout feedback (covered in `02-visual-and-motion.md`).

7. **Data presentation**  
   Pulse and Today are list-heavy; future TanStack Table adoption is scoped in `03-component-stack-and-tabs.md`, not a prerequisite for a command core.

## Command surface: what shipped in code

- **`cmdk`**-based **Command palette** (Radix Dialog from `cmdk`):
  - **Go**: all five shell tabs + **Help (Knowledge Center)**.
  - **Suggested**: groups and lines from [`chatCommandStarters.ts`](../../src/pages/mobile/chatCommandStarters.ts) (each line still routes through the same intent system as today).
  - **Run in Chat** for a **free-typed** query when the user types a non-matching string (still calls `onRunCommand` with that line).
  - **Recent** from persisted **command chips** (same `brandops:agent:commandChips` list as the Chat tab).
- **Keyboard**: **⌘K / Ctrl+K** toggles the palette; does not add a second command bus.
- **Header** “Commands” control next to **Help** for discoverability.
- **Launch gates**: when sign-in is required, or when membership is required outside Settings, the palette still allows **Go** and **Help**; agent run groups show a short locked-state message (same gating as the main shell, without bypassing it).

## Follow-ups (not yet implemented)

- Optional **“prime chat only”** actions (prefill, no run) in the palette for longer drafts.
- **Pipeline / workstream** shortcuts that call `openCockpitWorkstream` in one step from the palette.
- Deduplicate or consolidate copy between [`extensionLinks` / `navigationIntents`](../../src/shared/navigation/) and the palette “Go” list.

## UX patterns referenced

- **Command-palette first**: one surface for search, navigation, and repeated agent lines.
- **Extension-friendly**: one overlay, fast keyboard path, no dependency on a wide layout.
- **No theme fork**: all styling uses existing Tailwind semantic tokens and `bo-system-*` classes.
