# Self-review: current branch

Date: 2026-04-11

## 1) Potential bugs

1. **Outreach draft status from form is ignored on create.**
   - The UI collects a `status` in form state, but `addOutreachDraft` always stores `status: 'draft'` regardless of input. This can surprise users who selected another status before saving.
2. **Template variant helper can crash if a template category has missing blocks.**
   - `buildVariant` calls `.replaceAll` on `template.openerBlock` directly. If imported/legacy data has undefined blocks, render can throw.
3. **Clipboard writes are not guarded for unsupported/blocked environments.**
   - `navigator.clipboard.writeText(...)` is awaited without fallback/error handling, so user interaction may fail silently in restricted contexts.
4. **Reminder timestamp is flattened during quick reschedule.**
   - `quickReschedulePublishingItem` sets both `scheduledFor` and `reminderAt` to the same value, which loses lead-time semantics and can create missed reminders.

## 2) Edge cases not fully handled

1. **Invalid or empty imported workspace fields.**
   - Import paths parse JSON and cast aggressively; malformed-but-object payloads can pass basic checks yet break assumptions later.
2. **Calendar grouping uses locale-dependent `toDateString()`.**
   - Day grouping and ordering can shift across locales/timezones, creating inconsistent grouping for shared data.
3. **Sorting by dates assumes valid ISO strings.**
   - Invalid dates become `NaN`, causing unstable ordering when sorting opportunities or queue items.
4. **List reorder does not validate index bounds.**
   - `reorderBrandVaultListItem` uses splice without explicit bounds checks, so stale indices can produce unexpected insertion behavior.

## 3) UX improvements still recommended

1. **Show explicit validation errors on create actions.**
   - For example, publishing creation currently no-ops when title/body is blank; users should see inline feedback.
2. **Show success/error toasts for async actions.**
   - Most mutating actions are async but the UI rarely surfaces operation success/failure states.
3. **Disable destructive/inapplicable actions contextually.**
   - Example: hide/disable "Archive" when already archived, or "Restore" when active.
4. **Add empty-state guidance in high-density panels.**
   - CRM and Outreach lists should offer next-step prompts when filtered results are empty.

## 4) Refactor opportunities

1. **Centralize date parsing/formatting utilities.**
   - Date conversion is repeated across modules (`new Date(...)`, timezone conversions, reminder calculations).
2. **Normalize state update patterns in store actions.**
   - Repeated map/update blocks can be extracted to generic helpers to reduce drift and copy/paste bugs.
3. **Split large panel components into feature subcomponents.**
   - `PublishingQueuePanel`, `PipelineCrmPanel`, and `OutreachWorkspacePanel` each combine data shaping + rendering + action wiring.
4. **Strengthen import validation with runtime schema checks.**
   - Runtime validation (e.g., zod) would protect imported state and reduce defensive null handling across components.

## 5) Risks for future scaling

1. **Client-side full-array operations on every render.**
   - Frequent `filter` + `sort` + `map` over full collections can degrade responsiveness as records grow.
2. **Single monolithic Zustand store for all domains.**
   - As modules expand, unrelated updates may increase render pressure and coupling.
3. **ID generation via `Math.random()` can collide over long horizons.**
   - Low probability at small scale, but a UUID strategy is safer for growth and sync scenarios.
4. **No conflict-resolution strategy for concurrent edits/imports.**
   - Future multi-surface syncing may introduce last-write-wins data loss unless versioning/merge semantics are added.
