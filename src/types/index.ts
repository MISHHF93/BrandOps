/**
 * Workspace domain model — **single source of truth** for TypeScript shapes.
 *
 * - **Persisted JSON** is `BrandOpsData` (`domain.ts`). Chrome/storage key: `brandops:data` (see `storageService`).
 * - **Normalization & defaults** — `src/services/storage/storage.ts` (`withDefaults`, per-entity normalizers).
 * - **Canonical empty install** — `src/modules/brandMemory/seed.ts` (`seedData`, `seed.source: production-empty`).
 * - **Sample / QA dataset** — `src/modules/brandMemory/demoSeed.ts` (`demoSampleData`, `demo-sample`).
 * - **Runtime env** — `src/vite-env.d.ts` (`VITE_*` public build-time strings only; no secrets in client bundle).
 */
export * from './domain';
