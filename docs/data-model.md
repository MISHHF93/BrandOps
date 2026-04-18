# Data Model

BrandOps core entities:

- `BrandVaultEntry`
- `ContentItem`
- `ScheduledPost`
- `OutreachDraft`
- `Contact`
- `Company`
- `Opportunity`
- `ActivityLog`

Runtime mapping in code:

- `BrandVaultEntry` -> `MessagingVaultEntry`
- `ContentItem` -> `ContentLibraryItem`
- `ScheduledPost` -> `PublishingItem`
- `ActivityLog` -> `ActivityNote`

All entities are designed to be:

- locally stored
- versionable
- exportable/importable
- linked across modules

How this is enforced:

- Local storage and normalization live in `src/services/storage/storage.ts`.
- Entity records support timestamps and optional `version` fields for revision-aware evolution.
- Workspace export/import is handled by store actions and persisted as JSON snapshots.
- Cross-module links are represented through IDs, tags, and relationship fields.

Core relationships:

- `Content -> Publishing Queue`
  - `ScheduledPost.contentLibraryItemId` links a queue item to a `ContentItem`.
- `Outreach -> Contacts -> Opportunities`
  - `OutreachDraft.linkedOpportunity`, `Opportunity.contactId`, and `relatedOutreachDraftIds` carry chainable links.
- `Vault -> Content + Outreach`
  - `BrandVault`/`BrandVaultEntry` assets feed reusable language for `ContentItem` and `OutreachDraft` execution.
