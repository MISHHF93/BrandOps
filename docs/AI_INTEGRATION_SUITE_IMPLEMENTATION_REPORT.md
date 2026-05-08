# AI Integration Suite — implementation report

## Executive summary

BrandOps now persists **operator-facing AI routing modes** (`settings.aiOperatorMode`, `settings.aiRoutingDiagnosticsEnabled`), scores **hosted `ask:`** completions toward latency vs reasoning vs citation fidelity (`src/services/ai/aiAskRouting.ts`), and ships **declarative pipeline scaffolding** with capped audit rows (`BrandOpsData.aiPipelineRuns`). Secrets remain outside workspace JSON; routing uses **heuristic capability vectors** derived from model id strings (no vendor telemetry in-tree).

## UX / IA improvements (this iteration)

- **Clear AI stance**: Settings → **Unified workspace** adds **Hosted Ask routing** chips + diagnostics toggle (`SettingsAiRoutingPanel.tsx`).
- **Assistant affordance**: Assistant headline shows a **one-line routing caption** (`buildAiAssistantRoutingCaption` in `buildWorkspaceSnapshot.ts`).
- **Guided onboarding**: Getting started step 5 references Unified workspace + Hosted Ask routing (`FirstRunJourneyCard.tsx`).
- **Settings readout**: Workspace model table lists routing mode + diagnostics (`MobileSettingsView.tsx`).

## Architecture — AI Integration Suite

| Layer | Responsibility |
| --- | --- |
| `src/types/aiIntegrationSuite.ts` | Typed primitives: providers/health (structs), capabilities, task types, routing policies, profiles, pipelines, pipeline runs, evaluation hooks. |
| `src/services/ai/aiAskRouting.ts` | Mode→policy weights, alternate model suggestions, scoring, max token/temperature tuning, diagnostics strings. |
| `src/services/ai/hostedAskTurn.ts` | Appends **routing & QA hints** block into hosted Ask system prompts. |
| `src/pages/mobile/mobileApp.tsx` | Wires routing into `runChatCompletion` (model id + decoding knobs + merged worker token cap). |
| `src/services/ai/aiPipelineCatalog.ts` | Canonical pipeline definitions (LinkedIn content, grounded answers, audits, governance gate, etc.). |
| `src/services/ai/aiPipelineRunner.ts` | Executes steps (deterministic digest + optional hosted completion) + constructs audit tags. |
| `src/services/ai/aiPipelineRunPersistence.ts` | Sanitize + prepend pipeline runs; respects `operatorTraceCollectionEnabled`. |
| `src/services/storage/storage.ts` | Normalizes settings keys + `aiPipelineRuns` bucket on workspace load/save. |

## Pipelines created (declarative IDs)

`linkedin_content_generation`, `source_grounded_answer`, `document_summarization`, `workspace_audit_report`, `integration_sync_analysis`, `governance_review`, `citation_validation`, `multimodal_artifact_processing`.

> **Note:** Hosted completion steps require live gateway policy + API key; deterministic-only pipelines (`workspace_audit_report`) run fully offline.

## Tests added / touched

- `tests/unit/aiAskRouting.test.ts` — mode shifts model preference + diagnostics flag behavior.
- `tests/unit/aiPipelineRunner.test.ts` — deterministic pipeline success + governance partial path without network.

Existing normalization contract continues to assert **settings key parity** with `defaultAppSettings`.

## Remaining blockers / caveats

- **No live provider registry sync**: scoring uses **static heuristics** per model id — real latency/cost requires telemetry ingestion (`ProviderHealthStatus` placeholders).
- **Local/private mode**: UI warns when adapter is not `local-only`; true local ONNX/WebGPU stack remains backlog (`nlpCapabilityManifest` internal-on-device path).
- **Human-review checkpoints**: `human_review_gate` pauses automation unless `humanReviewAck` is supplied — product UX for “approve” surface still needed.
- **Pipeline triggers**: no palette/agent verbs wired yet — call sites should invoke `runAiPipelineWithPersistence` deliberately.

## Recommended next epics

1. **Telemetry-backed scoring** — record gateway durations/error codes into rolling health rows (privacy-preserving aggregates).
2. **Task-specific routers** — map embeddings vs chat vs vision to distinct gateways beyond shared OpenAI-compatible POST.
3. **Pipeline UX** — Plan cards / palette entries launching audited runs + downloadable audit bundles (reuse provenance graph types).
4. **Evaluation harness** — populate `ModelEvaluationResult` from offline golden sets + rubric prompts.
