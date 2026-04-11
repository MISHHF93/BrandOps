# BrandOps (Browser Extension)

BrandOps is a production-ready **Manifest V3** browser extension for technical solo operators managing LinkedIn publishing, outreach, and pipeline workflows.

It is intentionally **local-first**, **privacy-first**, and immediately useful without external AI APIs.

## What BrandOps includes

### Core modules

1. Publishing Queue
2. Content Library
3. Outreach Workspace
4. Follow-Up Scheduler
5. Opportunity Pipeline CRM
6. Brand Messaging Vault
7. LinkedIn Companion Overlay
8. Dashboard / Command Center
9. Settings / Export / Import / Local Automation Rules

### Product principles implemented

- Local browser storage for core workspace operations.
- No dependency on external model APIs for MVP workflows.
- Strongly typed TypeScript domain models and state mutations.
- Modular architecture with extension-ready surfaces (popup, options, dashboard, content script, service worker).
- Premium dark command-center UI for high-density operations.

## Architecture overview

```text
src/
  background/                 # MV3 service worker
  content/                    # LinkedIn overlay companion (safe/non-automation)
  modules/                    # Domain seed + modular placeholders
  pages/
    popup/                    # Fast command cockpit entry
    dashboard/                # Full operator workspace
    options/                  # Settings + import/export controls
  services/
    storage/                  # Data persistence and import/export helpers
    aiAdapters/               # Optional future adapter interfaces
  shared/
    config/                   # Module registry definitions
    storage/                  # Browser local storage abstraction
    ui/                       # Header and card primitives
  state/                      # Zustand store and actions
  types/                      # Reusable domain models
```

## Local development

```bash
npm install
npm run build
```

Recommended quality checks:

```bash
npm run typecheck
npm run lint
```

## Load the extension in Chrome / Edge

1. Build once with `npm run build`.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the generated `dist/` folder.

## Usage flow

- Open the popup to check queue/outreach/follow-up counts.
- Open Dashboard to add drafts, update statuses, manage follow-ups, and inspect pipeline + messaging vault.
- Open Settings to export/import the entire workspace JSON.
- Visit LinkedIn and use the companion overlay for manual execution reminders.

## Notes on AI integration

- MVP mode keeps `aiAdapterMode` disabled by default.
- Architecture includes future adapter seams for optional local ML or opt-in external integrations.
- No fake AI auto-generation features are presented as active.

## Recommended next branches

After finishing this foundation branch, recommended sequence:

1. `feature/calendar-reminders-engine`  
   Add richer reminder calendar views and browser notification delivery windows.
2. `feature/pipeline-analytics`  
   Add conversion/velocity metrics, weighted forecasting trends, and stage aging.
3. `feature/linkedin-overlay-context-sync`  
   Improve overlay context retrieval and note capture while preserving safe manual workflow rules.
4. `feature/local-ml-prioritization`  
   Add optional local scoring/prioritization engine behind explicit user opt-in.
