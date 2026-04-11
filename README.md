# BrandOps Browser Extension

BrandOps is a privacy-first personal brand operating system for technical AI builders.

## What this MVP includes

- **Brand Memory** for positioning, offer framing, tone, keywords.
- **Content Studio** to generate on-brand LinkedIn draft posts.
- **Outreach Assistant** to draft collaboration/consulting outreach messages.
- **Opportunity CRM** to track leads from lead → closed.
- **LinkedIn Overlay** to provide in-page context and copyable outreach opener.
- **Dashboard + Popup + Settings pages** for command-center workflows.
- **LLM adapter layer** currently using local template provider (future-ready for external APIs).

## Architecture

```text
src/
  background/            # MV3 service worker + runtime message handling
  content/               # LinkedIn content script overlay
  pages/
    popup/               # Quick-action cockpit
    dashboard/           # Full command center view
    options/             # Settings / prompt profile controls
  modules/
    brandMemory/         # seed and profile model
    contentStudio/       # post generation service
    outreach/            # outreach generation service
    crm/                 # opportunity transitions
  services/
    storage/             # chrome.storage.local abstraction
    llm/                 # provider adapter interface + local provider
    messaging/           # runtime message types
  state/                 # Zustand app store
  app/                   # reusable layout/components
  types/                 # domain model
```

## Product principles implemented

- **Local-first storage:** data persisted in `chrome.storage.local`.
- **Privacy-first by default:** no backend dependency in MVP mode.
- **Modular code:** services and modules separated by responsibility.
- **Strong typing:** domain models and service contracts in TypeScript.
- **Future LLM integration:** provider adapter interface ready for OpenAI/Anthropic/custom endpoints.

## Run locally

```bash
npm install
npm run build
```

For local web UI preview during development:

```bash
npm run dev
```

## Load extension in Chrome/Edge

1. Build the project (`npm run build`).
2. Open extension management page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the generated `dist/` folder.

## MVP behavior notes

- On first install, seed data is loaded into local storage.
- Popup gives quick actions for content and outreach generation.
- Dashboard provides full visibility across drafts + pipeline.
- LinkedIn pages receive a lightweight contextual overlay widget.

## Suggested next branches

1. `feat/openai-anthropic-provider-impl`
2. `feat/linkedin-dom-context-parser`
3. `feat/export-import-encrypted-backups`
4. `feat/opportunity-reminders-and-followups`
5. `feat/analytics-weekly-brand-score`
