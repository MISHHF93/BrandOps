# BrandOps MVP

BrandOps is a **local-first browser extension workspace** for solo operators and lean teams who run brand, outreach, publishing, and pipeline execution in one place.

This MVP focuses on **workflow quality** and **transparent helper logic** rather than hype:
- no dependency on external model APIs,
- no black-box automation claims,
- explainable local heuristics that help prioritize work.

---

## Operating philosophy

BrandOps is designed as a **daily operator cockpit**, not a passive tool.

The product assumes:
- the user actively executes their workflow,
- decisions are made with visibility, not automation,
- structure beats randomness.

BrandOps does not replace thinking. It organizes and amplifies it.

Core principles:
- visibility over automation
- structure over chaos
- execution over intention
- clarity over abstraction

---

## Daily workflow

BrandOps is optimized for a repeatable daily loop:

1. Review Command Center
   - upcoming posts
   - due follow-ups
   - active opportunities
2. Execute Publishing Queue
   - copy post
   - publish manually
   - mark as completed
3. Run Outreach
   - select targets
   - use saved messaging
   - send manually
   - log status
4. Update Pipeline
   - move opportunities
   - log replies
   - schedule follow-ups
5. Capture Insights
   - save ideas
   - refine messaging
   - update vault

BrandOps is not passive. It is an execution system.

---

## Product structure

BrandOps modules:

- Command Center
- Brand Vault
- Content Library
- Publishing Queue
- Outreach Workspace
- Pipeline CRM
- Scheduler Engine
- LinkedIn Companion
- Settings / Export / Import / Local Intelligence

Each module is:

- independent
- connected through shared state
- backed by local storage

---

## Product overview

BrandOps gives you one command surface for:
- capturing reusable brand messaging,
- planning and scheduling content,
- tracking outreach and follow-ups,
- managing lightweight CRM opportunities,
- reviewing risk and priorities from local intelligence helpers.

### What “local intelligence” means in this project

BrandOps includes rule-based helpers that score and rank work using data already in your workspace:
- content priority scoring,
- overdue risk scoring,
- outreach urgency ranking,
- publishing recommendations,
- pipeline health heuristics,
- vault-based snippet suggestions.

These helpers are deterministic and explainable. Every score is derived from transparent rules in code, with **embedded defaults** plus an optional **remote rule pack** merge (see [`docs/intelligence-rules-remote-layers.md`](docs/intelligence-rules-remote-layers.md)).

---

## Architecture summary

```text
src/
  app/                        # Shared layout primitives
  background/                 # MV3 service worker
  content/                    # Content script entry points
    linkedinCompanionSafety   # companion validation and manual-capture logic
  modules/                    # Product modules (vault, content, queue, outreach, CRM)
  pages/                      # dashboard / welcome / options / help React entry surfaces (MPA)
  services/
    intelligence/             # local heuristic scoring + ranking
    scheduling/               # reminder lifecycle + grouping
    storage/                  # schema normalization + import/export
    messaging/                # runtime message contracts
  shared/
    config/                   # module registry
    storage/                  # browser storage adapters
    ui/                       # shared UI primitives
  state/                      # Zustand state and user actions
  styles/                     # Tailwind and design tokens
  types/                      # domain models
```

### Runtime shape

- **Toolbar (extension icon):** opens the Dashboard in a new tab (`chrome.action.onClicked`); there is no `default_popup` HTML surface in the manifest today.
- **Dashboard:** full workspace with global search, onboarding, command palette, and compass navigation.
- **Options:** backup/import/export and settings controls.
- **Background worker:** lightweight scheduler sync and extension orchestration.

### Documentation (this repository)

These files ship with **source** and **self-hosted previews**; they are not bundled into the Chrome Web Store zip as standalone pages, but the **product behavior** they describe is in the build.

| Document | Contents |
|----------|----------|
| [`docs/intelligence-rules-remote-layers.md`](docs/intelligence-rules-remote-layers.md) | Rule domains, L1/L2/L3 layers, optional `brandops-intelligence-rules.json` / `VITE_INTELLIGENCE_RULES_URL`, validation, roadmap. |
| [`ICONOGRAPHY.md`](ICONOGRAPHY.md) | Lucide icon map for the cockpit, sizes, accessibility, and where symbols appear in the UI. |

In-app summaries live under **Help → Knowledge Center** (topics *Visual wayfinding* and *Optional intelligence tuning*).

---

## Feature list (MVP)

### Core product
- Onboarding checklist for first-time setup.
- Global cross-module search (content, publishing, outreach, CRM, vault snippets).
- Command palette style quick actions.
- Keyboard shortcuts for fast navigation.
- Improved empty and error states.
- Consistent UI language and interaction patterns.
- Accessibility improvements (`focus-visible`, labels, semantic dialog/alerts).
- Developer tools in Options: debug mode toggle, mock activity generator, and guarded demo reset.
- LinkedIn Companion safety workflow:
  - manual-assist capture only (no auto-send or auto-click behavior),
  - defensive validation before local writes,
  - duplicate-safe contact capture by LinkedIn URL,
  - keyboard-safe controls (`Escape`, `Ctrl/Cmd+Enter`) and explicit compliance messaging.

### UI foundation
- Semantic-token Tailwind design system (`bg`, `surface`, `border`, `text`, `primary`, `secondary`, semantic status colors, and `focusRing`).
- Typed typography/radius/shadow/motion tokens for consistent component behavior.
- Reusable component library across primitives, layout, workflow, and feedback surfaces.
- Integrated component demo surface in Options to validate production states and interaction patterns.
- Dashboard-safe `bg-signal-grid` background utility for subtle operator-console texture.

### Data resilience
- Full workspace export/import as JSON.
- Clipboard + downloadable backups.
- JSON file import and text import.
- Schema normalization and demo reset fallback.
- Stronger settings normalization and malformed payload guardrails on import.

### Production hardening updates
- Defensive browser-storage parsing that auto-recovers from corrupted JSON entries.
- Safe storage recovery path in the background worker (fallback to seeded workspace if storage load fails).
- Normalized persistence on every write (`storageService.setData`) so invalid edge inputs cannot poison state.
- Expanded normalization coverage for brand profile, modules, follow-ups, messaging vault, scheduler tasks, and seed metadata.
- Scheduler hardening for invalid timestamps and non-finite snooze inputs.
- Store-level sanitization for publishing, outreach, integration source, artifact, SSH, contact, note, and opportunity mutations.
- Integration hub form validation with inline success/error notifications.
- Confirm dialogs for destructive archive actions in Outreach and Pipeline modules.
- Options page status notifications promoted to inline semantic alerts for clearer operator feedback.

### Production readiness directive

BrandOps now enforces a production-readiness baseline:
- unified quality gate via `npm run check` (typecheck + lint),
- CI validation on pull requests and pushes to `main`,
- build artifact verification via `npm run verify:dist`.

Recommended pre-release sequence:

```bash
npm ci
npm run check
npm run build
npm run verify:dist
npm run package:release
```

This generates a downloadable release archive at:

```text
release/brandops-extension-v<version>.tar.gz
```

### Testing and QA notes

- Run static checks before packaging:
  - `npm run typecheck`
  - `npm run lint`
- Run behavior and performance checks:
  - `npm run test:unit`
  - `npm run test:perf`
  - `npm run build`
- Use **Options → Developer tools** for QA workflows:
  - Enable/disable debug mode.
  - Generate synthetic mock activity to verify loaded-state rendering and search.
  - Reset to seeded demo workspace with confirmation.
- Validate first-launch behavior by removing extension storage and reloading the extension.
- New reliability tests cover:
  - storage normalization and malformed import handling (`tests/unit/storageService.test.ts`)
  - scheduler recovery from malformed task timestamps (`tests/unit/scheduler.test.ts`)
  - LinkedIn companion capture safety and validation (`tests/unit/linkedinCompanionSafety.test.ts`)

### Known limitations

- Browser notifications/scheduler execution are best-effort while the browser is running.
- Debug mode currently exposes internal QA utilities only in the Options page (not the Dashboard or other full-page surfaces).
- Resume parsing remains heuristic-first for PDF and DOCX and may need manual profile edits on complex resume layouts.
- Modal/drawer focus trapping is still limited in some component-library overlays and can be further hardened.
- LinkedIn profile parsing depends on common selectors and `og:title`; major LinkedIn DOM changes can reduce auto-prefill quality.

### Local intelligence helpers
- Content priority ranking.
- Overdue risk scoring.
- Outreach urgency ranking.
- Publishing timing recommendations.
- Pipeline health heuristic ranking.
- Template/snippet suggestion logic using Brand Vault reusable snippets.

---

## Setup steps

### 1) Install dependencies

```bash
npm install
```

### 2) Run development mode

```bash
npm run dev
```

The dev server is **fixed to `http://localhost:5173`** (`strictPort` in `vite.config.ts`). `npm run dev` runs `scripts/dev.mjs`, which on **Windows** tries to stop whatever is already **listening** on 5173 (stale Vite, etc.), then starts Vite. If it still fails, use `netstat -ano | findstr :5173` and end the PID in Task Manager. Use that origin for local OAuth redirect URIs.

### 3) Build extension

```bash
npm run build
```

### 3.1) Build + seal a downloadable artifact

```bash
npm run release
```

This runs type checks, lint, production build, dist verification, and packages the built extension into `release/`.

### 4) Run checks

```bash
npm run typecheck
npm run lint
npm run format
```

---

## Extension loading instructions

### Chrome / Edge (unpacked)

1. Run `npm run build`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the generated `dist/` folder.

### Direct deployment handoff (artifact workflow)

1. Run `npm run release`.
2. Upload `release/brandops-extension-v<version>.tar.gz` to your artifact store or attach it to a release.
3. Download and extract the archive wherever deployment happens.
4. Load the extracted folder as an unpacked extension (or select `manifest.json` for temporary Firefox loading).

### Firefox (temporary add-on)

1. Build the project.
2. Open `about:debugging`.
3. Choose **This Firefox**.
4. Click **Load Temporary Add-on**.
5. Select `dist/manifest.json`.

---

## Data model summary

Core entities:

- `BrandVaultEntry`
- `ContentItem`
- `ScheduledPost`
- `OutreachDraft`
- `Contact`
- `Company`
- `Opportunity`
- `ActivityLog`

All entities are:

- locally stored
- versionable
- exportable/importable
- linked across modules

Relationships:

- `Content -> Publishing Queue`
- `Outreach -> Contacts -> Opportunities`
- `Vault -> Content + Outreach`

See [docs/data-model.md](docs/data-model.md) for the runtime type mapping and field-level link details.

---

## Future roadmap

### Near-term
- Saved search views and pinning.
- Multi-step onboarding templates by user role.
- Rule editor for custom local scoring weights.
- Bulk editing for queue and CRM records.
- Centralized toast state manager to unify notification lifecycles across all modules.
- Stronger schema version migration pipeline with explicit upgrade steps per persisted version.
- Optional encrypted backup passphrase flow for exported local workspace archives.
- Migrate LinkedIn companion overlay to a React + shared component-library render path for full UI token parity.

### Mid-term
- Optional offline-first desktop shell (Electron/Tauri).
- Local analytics snapshots and trend charts.
- Cross-device encrypted sync (opt-in).

### Long-term
- Plugin-style extension points for custom modules.
- Team collaboration mode with local-first conflict resolution.
- Rich policy controls for organization-grade governance.

---

## Principles

- **Visibility over automation.**
- **Structure over chaos.**
- **Execution over intention.**
- **Clarity over abstraction.**

---

## Strategic Docs

- Product charter: [docs/product-charter.md](docs/product-charter.md)
- Branch-by-branch execution plan: [docs/branch-execution-plan.md](docs/branch-execution-plan.md)
- Product module structure: [docs/product-structure.md](docs/product-structure.md)
- Data model details: [docs/data-model.md](docs/data-model.md)
- Design system: [docs/design-system.md](docs/design-system.md)
- Component library: [docs/component-library.md](docs/component-library.md)
- One-pager IA (surfaces, compass, KPIs): [docs/one-pager-ia-and-surface-map.md](docs/one-pager-ia-and-surface-map.md)
- Cockpit overlays (Knowledge / Quick settings on dashboard): [dashboard-cockpit-overlay-plan.md](dashboard-cockpit-overlay-plan.md)
- Compact cockpit UX (minimal signal / growth & portfolio glance): [docs/cockpit-compact-ux-spec.md](docs/cockpit-compact-ux-spec.md)
