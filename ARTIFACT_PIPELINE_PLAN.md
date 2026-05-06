# Artifact pipeline: fusion strings → JSON graphs → annotation

This document is the **planning reference** for how BrandOps turns workspace/resume inputs into artifacts consumed by the in-repo native model **and** by downstream tooling that needs structured, annotatable objects.

## Objective

**Yes — captured inputs are designed to live as parallel representations.**

| Representation | Role |
|----------------|------|
| **Fusion blob** (`profileBlob…`) | Pipe-separated **segment tokens** for `nativeTinyMlp` segment attention (`|` splits → hashed slots). |
| **Structured JSON package** | Parallel **`structured.{domain}`** record graphs aligned with `BrandOpsData`, plus **`graphEdges`** linking entities (“adjacent objects”). |
| **Resume** | Same extraction yields **`fusedText`** (MLP) and **`resume.{sections, skills, roles, bullets}`** arrays (annotation). |

You can **label either rail**: classify segments in the blob *or* attach labels/metadata per JSON row and edge without changing storage semantics.

## Canonical source types

Single authority for persisted workspace shape:

- **`src/types/domain.ts`** — `export interface BrandOpsData { … }`

All artifact projections intentionally **mirror those keys** (with safe truncation caps). Missing/null persistence fields normalize to **`''`** or **`[]`** — never `null` in script outputs.

## Implemented modules (code map)

| Area | Path | Responsibility |
|------|------|------------------|
| String coercion | `scripts/lib/nativeArtifactUtils.mjs` | `asNonNullStr`, `coerceArtifactBlob`, `joinArtifactParts`. |
| Profile + fusion blobs | `scripts/lib/nativeProfileContext.mjs` | `buildNativeProfileBlob`, `extractNativeEmployeeContextFromWorkspaceExport`, coverage trace. |
| Work-memory segments | `scripts/lib/nativeWorkContext.mjs` | `extractWorkContextSegments`, `summarizeNativeWorkArtifacts`. |
| Resume | `scripts/lib/nativeResumeArtifacts.mjs` | `extractResumeArtifacts`, **`extractResumeArtifactRecord`** (JSON facets). |
| Structured graph | **`scripts/lib/nativeStructuredArtifacts.mjs`** | **`buildNativeStructuredArtifactPackage`**, **`buildArtifactGraphEdges`**. |
| MLP | `scripts/lib/nativeTinyMlp.mjs` | Segment-attention embedding + softmax labels. |
| CLI probe | `scripts/run-native-model.mjs` | `--trace-artifacts`, **`--structured-json`**. |
| Train | `scripts/train-native-model.mjs`, `scripts/data/native-mlp-corpus.json` | Offline weights (`brandops.native_mlp.v2`). |

## Structured package schema (`schemaVersion: 1`)

Top-level shape emitted by `buildNativeStructuredArtifactPackage(exportJson, opts)`:

- **`fusion`** — `profileBlobEmployeeContext`, `profileBlobBrandOnly`, `segmentTokens[]` (mirrors string pipeline).
- **`resume`** — structured arrays + `fusedText` (resume-specific facets).
- **`structured`** — one subtree per major domain: `brand`, `brandVault`, `modules`, `publishingQueue`, `contentLibrary`, `contacts`, `companies`, `activityNotes`, outreach triple (`drafts` / `templates` / `history`), `followUps`, `opportunities`, `messagingVault`, `scheduler`, **`settings` (privacy-safe slice)**, `externalSync`, `integrationHub` (`sources`, `artifacts`, `liveFeed`, `sshTargets`), `seed`, `agentAudit`, `operatorTraces`, `embeddingIndex`.
- **`graphEdges`** — `{ relation, fromKind, fromId, toKind, toId }[]` for cross-table joins already implicit in IDs (opportunity→contact, note→entity, publishing→content library item, opportunity→draft, follow-up→contact).
- **`annotationHints`** — suggested URI-ish prefixes for stable annotation IDs.

### Privacy / size policies

- **No OAuth tokens or secrets**: `settings` projection intentionally avoids `syncHub`, raw `aiBridge` secrets, and provider credential payloads.
- **Embeddings**: by default **`embeddingIndex` omits `vector`**. Opt-in later via `{ includeEmbeddingVectors: true }` when wiring programmatic callers.

## Annotation workflow (same pipeline)

1. **Export** workspace JSON (existing BrandOps export).
2. **Run** `native:model:run` with **`--structured-json`** (optional **`--trace-artifacts`** for counts).
3. **Persist** `structuredArtifacts` JSON beside traces / ML logits.
4. **Annotate**:
   - **Row-level**: add fields such as `labels[]`, `reviewStatus`, `annotatorNote` on copies of `structured.*[]` rows (do not mutate canonical workspace schema without migration).
   - **Edge-level**: extend `graphEdges` or attach labels per edge ID derived from `(relation,from,to)`.

Training the toy MLP **does not require** structured JSON today; structured output exists so **human/automation pipelines share one ingestion path**.

## CLI examples

```bash
npm run native:model:run -- --workspace path/to/export.json --structured-json --trace-artifacts "pipeline health"
```

Resume still merges through resume fused text; raw resume bytes feed **`resumeRaw`** inside structured builders when passed from the runner.

## Roadmap (beyond current repo scope)

| Item | Notes |
|------|------|
| **Stable artifact IDs** | Deterministic UUID v5 from `(kind,id)` for annotation vendors. |
| **Round-trip labels** | Optional `artifacts.labels.json` sidecar keyed by stable IDs. |
| **Extension UI** | Call structured builder from storage export flow (not wired yet — CLI/script today). |
| **Vectors / secrets gates** | Enterprise profiles enabling vectors + redacted exports only after audit. |

## Revision history

- **2026-05-06** — Initial documented dual-rail plan + `nativeStructuredArtifacts.mjs` + `--structured-json`.
