# Product Structure

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

Implementation notes:

- Canonical module definitions live in `src/shared/config/modules.ts`.
- Module IDs are typed in `src/types/domain.ts` via `WorkspaceModuleId`.
- Module metadata is seeded through `src/modules/brandMemory/seed.ts`.
- Shared state and persistence are coordinated through `src/state/useBrandOpsStore.ts` and `src/services/storage/storage.ts`.
