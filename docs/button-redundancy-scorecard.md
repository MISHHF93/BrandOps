# Button Redundancy Scorecard

Date: 2026-04-29

Scope: mobile shell quick buttons, command chips, row actions, and navigation controls across Pulse, Chat, Today, Integrations, and Settings.

## Scoring

Each surface gets a 0-3 score on four axes:

- **Quick-action overload**: repeated command chips or too many nearby shortcuts.
- **Navigation redundancy**: local page/tab links that duplicate bottom nav, command palette, or header routes.
- **Intent ambiguity**: unclear difference between run now, prime Chat, edit/apply, or navigate.
- **Risk / side effect**: destructive or state-changing action presented as a casual chip.

Total score:

- **0-3**: keep as-is, maybe polish labels.
- **4-6**: consolidate or restyle.
- **7-9**: strong cleanup candidate.
- **10-12**: top priority; creates cognitive noise or risky action ambiguity.

## Scorecard

| Surface | File | Quick overload | Nav redundancy | Intent ambiguity | Risk | Total | Recommendation |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| First-run journey | `src/pages/mobile/FirstRunJourneyCard.tsx:54` | 3 | 3 | 2 | 1 | **9** | Replace hop chips plus checklist navigation with one guided path. Keep one primary `Pipeline health`; make checklist non-button or hide after first interaction. |
| Today workstream quick strip | `src/pages/mobile/CockpitWorkstreamCommandStrip.tsx:20` | 3 | 0 | 3 | 2 | **8** | Collapse to one per-workstream `Run` menu or convert into command suggestions in Chat only. This component repeats across all Today workstreams. |
| Today focus fast actions | `src/pages/mobile/CockpitFocusEngine.tsx:120` | 2 | 0 | 2 | 1 | **5** | Keep, but standardize as primary `Run` plus secondary icon-only `Review`/`Edit in Chat`. |
| Today row chips | `src/pages/mobile/CockpitTodayWorkstreamSection.tsx:35` | 3 | 0 | 3 | 2 | **8** | Reduce per-row chips to one `Open in Chat`; move alternate primes into Chat suggestions. Multiple row chips look equally important but target different command semantics. |
| Pipeline row and strip actions | `src/pages/mobile/CockpitPipelineWorkstreamSection.tsx:28` | 3 | 1 | 3 | 3 | **10** | Top cleanup. `Archive`, `Restore`, `Advance`, row-specific primes, and `Run in Chat` compete. Destructive/archive actions should be behind Chat confirmation or a menu. |
| Brand/content row and strip actions | `src/pages/mobile/CockpitBrandContentWorkstreamSection.tsx:24` | 3 | 1 | 3 | 3 | **10** | Top cleanup. Duplicate/archive first item plus row-specific duplicate/archive primes are redundant and risky. Keep row `Open in Chat`; move destructive actions to command palette/Chat. |
| Connections workstream navigation | `src/pages/mobile/CockpitConnectionsWorkstreamSection.tsx:29` | 1 | 3 | 2 | 0 | **6** | Remove either `Integrations` or `Page`; bottom nav already has Integrations, and the command palette can open Help/pages. Keep one external-page affordance only when needed. |
| Pulse quick axis | `src/pages/mobile/PulseTimelineView.tsx:137` | 1 | 0 | 1 | 0 | **2** | Good after cleanup. Keep `Pipeline health` and row `Open in Chat`; avoid reintroducing local tab jump buttons. |
| Chat guided examples and recent commands | `src/pages/mobile/MobileChatView.tsx:61` | 2 | 1 | 1 | 1 | **5** | Keep as collapsible. Consider deduping recent commands that are already visible in composer smart chips or command palette. |
| Chat composer smart chips | `src/pages/mobile/ChatCommandBar.tsx` | 2 | 0 | 1 | 1 | **4** | Keep. This is the right home for quick commands; watch overlap with Chat guided examples and command palette groups. |
| Global command palette | `src/pages/mobile/WorkspaceCommandPalette.tsx:67` | 2 | 2 | 1 | 1 | **6** | Keep as power-user surface, but make it the only global navigation/command menu. Avoid duplicating its command lists on every page. |
| Bottom navigation | `src/pages/mobile/mobileTabPrimitives.tsx:105` | 0 | 0 | 0 | 0 | **0** | Canonical primary navigation. Any local tab jump button must justify itself against this. |
| Integrations quick add and row actions | `src/pages/mobile/MobileIntegrationsView.tsx:22` | 3 | 1 | 2 | 1 | **7** | Consolidate Quick add into a single `Add...` action list or move to Chat suggestions. Row `Open in Chat` is useful but visually too similar to setup chips. |
| Settings assistant starters | `src/pages/mobile/MobileSettingsAISurface.tsx:115` | 2 | 0 | 2 | 1 | **5** | Keep inside collapsed Configure section, but label starters as fill-only. They should not look like immediate run buttons. |
| Settings quick tweaks / templates | `src/pages/mobile/MobileSettingsAISurface.tsx:229` and `:262` | 3 | 0 | 3 | 2 | **8** | High cleanup. Quick tweaks run in Chat while editable Preferences apply locally; visual treatment should separate `Apply setting` from `Run preset in Chat`. |
| Settings data/session | `src/pages/mobile/MobileSettingsAISurface.tsx:311` | 1 | 0 | 1 | 3 | **5** | Keep, but destructive `Reset workspace` and `Clear chat` should remain visually distinct from export/import. |
| Account / membership | `src/pages/mobile/MobileSettingsView.tsx:66` | 2 | 1 | 1 | 1 | **5** | Keep OAuth buttons; consolidate `Start checkout` / `Manage billing` / `Sign out` styling so they do not read like command chips. |

## Highest Priority Cuts

1. **Unify command semantics**
   - `Run`: executes immediately and appends to Chat.
   - `Review`: opens Chat with an editable command.
   - `Apply`: updates Settings without posting to Chat.
   - `Go`: navigation only.

2. **Make bottom nav canonical**
   - Remove local `Pulse`, `Today`, `Chat`, `Integrations` buttons unless they are contextual and rare.
   - Keep cross-page links only for documents outside the tab shell, such as `integrations.html` or Help.

3. **Retire repeated quick strips**
   - The repeated Today workstream strip is the largest source of button noise.
   - Candidate replacement: one compact `Commands` disclosure per workstream with grouped `Run now` and `Review in Chat`.

4. **Move destructive actions out of chips**
   - `Archive`, `Reset`, `Clear`, and similar actions need stronger visual hierarchy and/or confirmation.
   - Avoid placing destructive actions beside harmless `Open in Chat` chips.

5. **Choose one quick-command home**
   - Preferred primary home: Chat composer smart chips.
   - Secondary home: command palette.
   - Page-level shortcuts should be sparse and contextual.

## Proposed Button Taxonomy

| Type | Label pattern | Visual treatment | Where it belongs |
| --- | --- | --- | --- |
| Primary command | `Run` / specific verb | `bo-btn-primary` with icon | One per panel, max. |
| Review command | `Review in Chat` | subdued ghost/link | Rows and AI suggestions. |
| Fill composer | `Use starter` / short chip | low-emphasis chip | Settings assistant only. |
| Apply local setting | `Apply ...` | form button, not chip | Settings forms. |
| Navigation | tab label or icon | bottom nav / command palette | Global shell only. |
| External document | `Open ... page` | link-style | Header/details where context requires. |
| Destructive | `Archive...`, `Reset...`, `Clear...` | warning/danger, confirm | Dialog or protected menu. |

## Suggested First Cleanup Batch

1. Remove navigation duplicates in `FirstRunJourneyCard`.
2. Replace `CockpitWorkstreamCommandStrip` with a collapsed command menu or remove it from low-value workstreams.
3. In Pipeline and Brand/content rows, keep only one row action: `Review in Chat`.
4. In Connections, keep only one external-page link and rely on bottom nav for the Integrations tab.
5. Restyle Settings quick tweaks so presets are clearly `Run in Chat`, while editable fields remain `Apply`.
