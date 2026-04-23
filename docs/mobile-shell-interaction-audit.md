# Mobile shell interaction audit

Short inventory of the five-tab [`MobileApp`](src/pages/mobile/mobileApp.tsx) shell (Pulse, Chat, Today, Integrations, Settings) plus the dedicated Help document. Use this to avoid mistaking **decorative** chrome for broken buttons.

## Decorative (non-interactive by design)

| Region                   | File                                                                                                                                                                | Notes                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Tab callout copy         | [`ShellSectionCallout.tsx`](src/pages/mobile/ShellSectionCallout.tsx)                                                                                               | Static explainer `div` / `p`.                                                    |
| At-a-glance metric chips | [`CockpitAtAGlanceStrip.tsx`](src/pages/mobile/CockpitAtAGlanceStrip.tsx) / [`cockpitDailyPrimitives.tsx`](src/pages/mobile/cockpitDailyPrimitives.tsx) `pulseTile` | Read-only counts; parent row has `role="group"` + `aria-label` (not actionable). |
| Intelligence signal rows | [`cockpitDailyPrimitives.tsx`](src/pages/mobile/cockpitDailyPrimitives.tsx) `signalList`                                                                            | Ranked text + scores; no per-row engine binding.                                 |
| Hub live feed rows       | [`MobileIntegrationsView.tsx`](src/pages/mobile/MobileIntegrationsView.tsx)                                                                                         | Read-only event list unless a button is present.                                 |

## Interactive — wiring

| Surface      | Component                                                                                                                         | Control                                                  | Handler                                         | Notes                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Chat         | [`MobileChatView.tsx`](src/pages/mobile/MobileChatView.tsx)                                                                       | Starters / history chips                                 | `onQuickCommand` → `sendQuickCommand`           | Switches to Chat then runs command.                        |
| Chat         | Same                                                                                                                              | Jump tabs                                                | `onNavigateTab`                                 | Tab switch only.                                           |
| Pulse        | [`PulseTimelineView.tsx`](src/pages/mobile/PulseTimelineView.tsx)                                                                 | Row “Open in Chat”                                       | `primeChat`                                     | Primes composer; user sends from Chat.                     |
| Pulse        | Same                                                                                                                              | Jump / pipeline health                                   | `onNavigateTab` / `runCommand`                  | Same command path as Today when running `pipeline health`. |
| Today        | [`CockpitDailyView.tsx`](src/pages/mobile/CockpitDailyView.tsx) orchestrates workstream sections                                  | Command chips                                            | `runCommand` (= `sendQuickCommand` from parent) | Must land on Chat to show thread + result.                 |
| Today        | [`CockpitTodayWorkstreamSection.tsx`](src/pages/mobile/CockpitTodayWorkstreamSection.tsx) (and other `Cockpit*WorkstreamSection`) | `primeChat` row actions                                  | Primes composer                                 | Does not send until user sends from Chat.                  |
| Today        | [`CockpitWorkstreamBar.tsx`](src/pages/mobile/CockpitWorkstreamBar.tsx)                                                           | Workstream pills                                         | `onSelectWorkstream`                            | Scroll + URL workstream only.                              |
| Integrations | [`MobileIntegrationsView.tsx`](src/pages/mobile/MobileIntegrationsView.tsx)                                                       | Quick add / note chips                                   | `runCommand`                                    | Same as Today.                                             |
| Settings     | [`MobileSettingsView.tsx`](src/pages/mobile/MobileSettingsView.tsx)                                                               | Preferences Apply                                        | `applySettingsConfigure`                        | **No** chat thread append by design.                       |
| Settings     | Same                                                                                                                              | Presets / audit “Run again” / messaging vault “Log note” | `runCommand`                                    | Same as Today (Chat + run).                                |
| Header       | [`mobileApp.tsx`](src/pages/mobile/mobileApp.tsx)                                                                                 | Help                                                     | `openExtensionSurface('help')`                  | Opens Knowledge page.                                      |
| Help         | [`HelpKnowledgeRoot.tsx`](src/pages/help/HelpKnowledgeRoot.tsx)                                                                   | Topic links                                              | `<a href>`                                      | Query + in-page scroll.                                    |

## Command busy state

[`MobileApp`](src/pages/mobile/mobileApp.tsx) passes `commandBusy={loading}` into Today, Integrations, and Pulse so command buttons disable while the agent round-trip is in flight. Settings uses the same `loading` flag as `applyBusy` for forms and disables preset / audit / vault command chips consistently.

## Today tab (Cockpit) navigation pattern and deep links

**Pattern A (current):** one vertical scroll on the Today tab plus a **sticky** workstream bar ([`CockpitWorkstreamBar.tsx`](src/pages/mobile/CockpitWorkstreamBar.tsx)). Work areas remain in the DOM with stable section heading `id`s so `scrollIntoView` and bookmarks work.

`mobile.html` / `integrations.html` use `?section=` parsed by [`parseMobileShellFromSearchParams`](src/pages/mobile/mobileShellQuery.ts). On the Today tab, after the first navigation, `section` is usually the **workstream id** (not `daily`).

| `?section=`                                         | Tab            | Workstream / scroll target                                                                                  |
| --------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `today`, `pipeline`, `brand-content`, `connections` | Today          | Same id; scroll to `id` from [`getCockpitMobileSectionHeadingId`](src/shared/config/dashboardNavigation.ts) |
| `overview`, `growth`, `content`, `systems` (legacy) | Today          | Canonicalized to the four ids above                                                                         |
| `daily`, `cockpit`                                  | Today          | Defaults workstream to `today`                                                                              |
| `pulse`, `timeline` (alias → pulse)                 | Pulse          | —                                                                                                           |
| `chat`, `settings`, `integrations`                  | Respective tab | —                                                                                                           |

**Heading `id`s (do not rename without updating navigation):** `cockpit-today`, `cockpit-pipeline`, `cockpit-brand`, `cockpit-connections` — defined on the `<h3>` (or section) in the corresponding `Cockpit*WorkstreamSection.tsx` files.

## Manual QA

1. From **Today**, tap e.g. **Create follow-up** — expect **Chat** tab to open and user + assistant messages to appear.
2. While a command is running, chips on Today / Integrations / Settings that send commands should be **disabled**.
3. Open `mobile.html?section=pipeline` — expect Today tab with viewport scrolled near the Pipeline block (`cockpit-pipeline`).
