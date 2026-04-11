# BrandOps MVP

BrandOps is a **local-first browser extension workspace** for solo operators and lean teams who run brand, outreach, publishing, and pipeline execution in one place.

This MVP focuses on **workflow quality** and **transparent helper logic** rather than hype:
- no dependency on external model APIs,
- no black-box automation claims,
- explainable local heuristics that help prioritize work.

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

These helpers are deterministic and explainable. Every score is derived from transparent rules in code.

---

## Architecture summary

```text
src/
  app/                        # Shared layout primitives
  background/                 # MV3 service worker
  content/                    # Content script entry points
  modules/                    # Product modules (vault, content, queue, outreach, CRM)
  pages/                      # popup / dashboard / options React entry surfaces
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

- **Popup:** high-frequency quick actions.
- **Dashboard:** full workspace with global search, onboarding, and command palette.
- **Options:** backup/import/export and settings controls.
- **Background worker:** lightweight scheduler sync and extension orchestration.

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

### Data resilience
- Full workspace export/import as JSON.
- Clipboard + downloadable backups.
- JSON file import and text import.
- Schema normalization and demo reset fallback.

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

### 3) Build extension

```bash
npm run build
```

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

### Firefox (temporary add-on)

1. Build the project.
2. Open `about:debugging`.
3. Choose **This Firefox**.
4. Click **Load Temporary Add-on**.
5. Select `dist/manifest.json`.

---

## Data model summary

BrandOps stores a single workspace payload containing:

- `brand`: profile and operating identity.
- `brandVault`: reusable messaging assets and snippet banks.
- `modules`: module registry metadata.
- `contentLibrary`: reusable and in-progress content units.
- `publishingQueue`: draft/schedule/reminder pipeline.
- `outreachDrafts`, `outreachTemplates`, `outreachHistory`.
- `contacts`, `companies`, `opportunities`.
- `followUps` and `scheduler` task state.
- `notes` and `messagingVault` context.
- `settings` and seed metadata.

All data is stored in browser extension storage and can be exported/imported as JSON.

---

## Future roadmap

### Near-term
- Saved search views and pinning.
- Multi-step onboarding templates by user role.
- Rule editor for custom local scoring weights.
- Bulk editing for queue and CRM records.

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

- **Local-first by default.**
- **Explainability over magic.**
- **Operator workflows over vanity features.**
- **Reliable execution over hype AI claims.**
