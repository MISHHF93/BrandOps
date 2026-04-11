# BrandOps Extension Foundation

BrandOps is a **Manifest V3** browser extension foundation built with **TypeScript**, **React**, and **Tailwind CSS**, designed for a premium dark command-center experience and long-term maintainability.

## Stack

- Manifest V3
- React + TypeScript
- Tailwind CSS + PostCSS
- Vite build pipeline
- Zustand store
- ESLint + Prettier

## Product surfaces included

- Popup (React): primary operator entrypoint
- Options page (React): settings and workspace controls
- Dashboard page (React): scalable full-workspace surface
- Background service worker (MV3)
- Content script foundation

## Scalable architecture

```text
src/
  app/                        # UI layout primitives
  background/                 # MV3 service worker entrypoint
  content/                    # Content script entrypoints
  modules/                    # Product module placeholders
    commandCenter/
    brandVault/
    contentLibrary/
    publishingQueue/
    outreachWorkspace/
    pipelineCrm/
    settings/
  pages/
    popup/
    options/
    dashboard/
  services/
    storage/                  # Storage repository + validation
    scheduling/               # Scheduling utility placeholders
    intelligence/             # Local intelligence placeholder interfaces
    messaging/
    llm/
    aiAdapters/
  shared/
    config/                   # Module registry definitions
    storage/                  # Browser storage abstraction layer
    ui/                       # Shared premium components
  state/                      # Zustand application state
  styles/                     # Tailwind + design tokens
  types/                      # Domain models
```

## Included placeholder modules

- Command Center
- Brand Vault
- Content Library
- Publishing Queue
- Outreach Workspace
- Pipeline CRM
- Settings

## Storage architecture

- `shared/storage/browserStorage.ts` provides a typed adapter over browser storage areas (`local`, `sync`, `session`).
- `services/storage/storage.ts` provides BrandOps-specific persistence, import/export, schema guardrails, and seed reset support.
- `modules/brandMemory/seed.ts` contains seeded demo workspace data for first-run bootstrapping.

## Development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run format
```

## Build extension

```bash
npm run build
```

## Load unpacked extension (Chrome / Edge)

1. Run `npm run build`.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the generated `dist/` folder.

## Notes

- UI is intentionally premium dark and componentized for future expansion.
- The scaffold is architected for maintainability and real product growth, including future local intelligence modules.
