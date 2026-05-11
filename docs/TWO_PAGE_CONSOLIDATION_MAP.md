# BrandOps two-page consolidation map (Ask · Plan)

This document maps **existing capabilities** to the **two dock-visible surfaces** — **Ask** (`chat`) and **Plan** (`workspace` + nested Plan panels) — without introducing standalone product pages for Mission Control, Trust Engine, Workflow Builder, etc.

## Surface contract

| Dock     | Route tokens (`?section=`)                                       | Primary modules                                                                                                            |
| -------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Ask**  | `chat`                                                           | Assistant transcript, `ask:` hosted routing, citations, evidence chips, trace summaries, copilot workers, command composer |
| **Plan** | `workspace`, `daily`, `integrations`, `settings`, workstream ids | Hub overview, Cockpit workstreams, Integrations, Settings, pulse/queue, audits, pipelines, governance/readiness            |

The bottom dock highlights **only Ask vs Plan** (`dockTabForShellTab`). Nested Plan destinations remain URL-addressable but roll up under **Plan**.

## Canonical models (single source of truth)

| Concept                           | Canonical type / storage                                                                   | Primary UI surface                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Citations / retrieval chunks      | `AiCitationChunk` (`domain.ts`), alias `AICitation` / `RetrievalChunk` (`aiTraceGraph.ts`) | **Ask** — chips, inline markers                             |
| Ask trace bundle (graph-shaped)   | `TraceBundle`, `AIWorkspaceTraceIndexState` → `BrandOpsData.aiTraceGraph`                  | **Ask** — collapsible provenance; **Plan** — summary counts |
| Turn-level assistant log          | `AiAssistantTurnTrace` → `BrandOpsData.aiAssistantTraces`                                  | **Ask** — history export / diagnostics                      |
| Slim trace header                 | `AITrace` (`aiTraceGraph.ts`)                                                              | Shared metadata                                             |
| Pipeline definition               | `AIPipeline`, `AIPipelineStep` (`aiIntegrationSuite.ts`)                                   | **Plan** — catalog-driven runs                              |
| Pipeline execution record         | `PipelineRun`, `AiPipelineRunLogState` → `BrandOpsData.aiPipelineRuns`                     | **Plan** — history card                                     |
| Model routing / modes             | `AiOperatorMode`, `resolveHostedAssistantRouting` (`aiAskRouting.ts`)                      | **Ask**                                                     |
| Operator / automation audit       | `AgentAuditEntry` (`domain.ts`)                                                            | **Plan** — recent audit feed (existing)                     |
| Operator behavior traces + review | `OperatorTraceEntry`, `reviewStatus` (`domain.ts`)                                         | **Plan** — pending review count                             |
| Hosted evaluation rubric row      | `ModelEvaluationResult` (`aiIntegrationSuite.ts`)                                          | **Plan** (future row linkage to runs)                       |
| Governance hints on I/O           | `BrandOpsAiProvenanceGovernanceMeta` (`aiTraceGraph.ts`)                                   | **Ask** — risk/evidence badges                              |
| Brand voice / positioning         | `BrandProfile`, `BrandVault` (`domain.ts`)                                                 | **Plan** — identity & vault sections                        |
| Packaged intelligence rules       | `getIntelligenceRules()` (`rules/*`) + `MobileIntelligenceRulesReadout`                    | **Plan** — governance/policy summary                        |
| LinkedIn copilot                  | Worker registry + overlay tooling (existing integration paths)                             | **Ask** — worker picker; overlay stays isolated             |

## Features merged into **Ask** (no new page)

- Model/provider routing caption (existing).
- Citations, orphan marker sanitization, provenance JSON (`aiIoProvenance`, `aiInlineCitations`).
- Trace summary UI (`AssistantTraceSummary`).
- **Trust score** — derived chip from governance meta (`trustScore.ts`), not a separate Trust product.
- Evidence chips (`AssistantEvidenceChips`).
- Evaluation/governance signals exposed inline on assistant turns (risk / evidence completeness).

## Features merged into **Plan** (no new page)

- **Plan sub-navigation** (`PlanSurfaceNav`) — Hub · Workstreams · Connect · Setup — clarifies nested destinations without extra dock tabs.
- Pulse, queue, KPI tiles (existing hub).
- Cockpit workstreams (`CockpitDailyView`).
- Integrations & Settings panels (unchanged components; repositioned mentally as Plan slices).
- **Pipeline run history peek** (from `aiPipelineRuns`).
- **Memory graph summary** — bundle count / last activity from `aiTraceGraph`.
- **Human review backlog** — count of `OperatorTraceEntry` with `reviewStatus === 'pending'`.
- Agent audit trail (existing `recentAudit`).

## Duplicates / conflicts avoided

- Do **not** introduce parallel citation types; use `AiCitationChunk` + graph aliases only.
- Do **not** add a second trace persistence path; keep `aiAssistantTraces` vs `aiTraceGraph.bundles` separation documented in `brandOpsUnified.ts` (turn log vs graph bundles).
- UI: reuse `MobileIntegrationsView`, `MobileSettingsView`, `CockpitDailyView` instead of cloning modules.

## Shared services & hooks to reuse

| Capability        | Service / helper                                          |
| ----------------- | --------------------------------------------------------- |
| Routing           | `resolveHostedAssistantRouting`, `buildHostedAskMessages` |
| Trace build       | `buildAssistantAskTraceBundle`, `prependAITraceBundle`    |
| Citation sanitize | `sanitizeAiCitationChunks`, `parseHostedAskResponse`      |
| Pipeline catalog  | `AI_PIPELINE_LIBRARY`, `runAiPipelineWithPersistence`     |
| Snapshot assembly | `buildWorkspaceSnapshot`                                  |

## Blockers (explicit)

- Live provider health telemetry still stubbed in registry entries.
- Human-review **workflow UI** beyond counts (approve/deny queues) not built — only backlog metric + operator traces exist.
- Full graph visualization remains a summary; deep interactive memory graph is future work inside Plan.
