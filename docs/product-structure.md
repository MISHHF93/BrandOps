# Product Structure

> **UI note:** These are **domain / data** areas. The live **extension UI** is the **MobileApp** chatbot ([`src/pages/mobile/mobileApp.tsx`](../src/pages/mobile/mobileApp.tsx)), not separate “Command Center” pages. See [`APPLICATION_WIRING_STATUS.md`](../APPLICATION_WIRING_STATUS.md).

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
- connected through shared workspace data (`BrandOpsData`)
- backed by local storage

Implementation notes:

- Canonical module definitions live in `src/shared/config/modules.ts`.
- Module IDs are typed in `src/types/domain.ts` via `WorkspaceModuleId`.
- Module metadata is seeded through `src/modules/brandMemory/seed.ts`.
- Persistence and normalization run through `src/services/storage/storage.ts`. Chat and channel ingress mutate workspace data via `src/services/agent/agentWorkspaceEngine.ts` (`executeAgentWorkspaceCommand`) or background/content-script paths; there is no global Zustand layer.
