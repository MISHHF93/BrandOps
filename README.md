# BrandOps Extension Foundation

BrandOps is a **Manifest V3**, TypeScript-first browser extension foundation designed to scale into a serious product.

## Stack

- Manifest V3 extension architecture
- TypeScript + React
- Tailwind CSS + premium dark design tokens
- Zustand state management
- Chrome local storage abstraction
- ESLint + Prettier setup

## Scalable architecture

```text
src/
  background/                  # MV3 background service worker
  content/                     # Content scripts
  modules/                     # Domain modules and feature placeholders
    dashboard/
    brandMemory/
    contentStudio/
    outreach/
    opportunityCrm/
    settings/
  pages/
    popup/                     # React popup entry and UI
    dashboard/                 # Dashboard page
    options/                   # Extension options page
  services/
    storage/                   # Domain-level storage service
    aiAdapters/                # Future AI provider adapter contracts
    llm/                       # Local placeholder adapter implementation
    messaging/                 # Runtime message contracts
  shared/
    config/                    # App-wide module/navigation definitions
    storage/                   # Browser storage adapter primitives
    ui/                        # Shared React UI primitives
  state/                       # Global app store
  styles/                      # Tailwind + design token styling
  types/                       # Shared domain types
```

## Included foundation surfaces

### Product modules (placeholders)

- Dashboard
- Brand Memory
- Content Studio
- Outreach Assistant
- Opportunity CRM
- Settings

### Extension runtime surfaces

- Popup UI (React)
- Options page
- Dashboard page
- Background service worker
- LinkedIn content script placeholder

## Premium dark theme design system

`src/styles/index.css` includes reusable design tokens and utility components:

- semantic color tokens (`--bo-bg`, `--bo-surface`, `--bo-primary`, `--bo-accent`, etc.)
- reusable card and pill styles (`.bo-card`, `.bo-pill`)
- polished gradient background and subtle shadows

## Storage abstraction + seed demo data

- `shared/storage/browserStorage.ts` provides a clean key-value storage interface
- `services/storage/storage.ts` exposes extension data methods
- `modules/brandMemory/seed.ts` contains default demo data
- first load automatically seeds local data when none exists

## Local development

```bash
npm install
npm run build
```

Optional checks:

```bash
npm run lint
npm run typecheck
npm run format
```

## Load extension in Chrome/Edge

1. Run `npm run build`.
2. Open:
   - `chrome://extensions` (Chrome)
   - `edge://extensions` (Edge)
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the generated `dist/` folder.

## Notes

- This repo is intentionally structured for future growth (AI adapters, richer feature modules, and shared components).
- Seed data can be reset from the popup quick actions.
