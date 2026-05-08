# Two-page consolidation — implementation report

## Summary

BrandOps keeps the **Ask | Plan** dock contract while making nested destinations (`Workstreams`, `Connect`, `Setup`) explicit via an in-shell **Plan sections** strip plus clearer chrome titles. Canonical AI/plan TypeScript aliases live in `brandOpsUnified.ts`; **Ask** gains a visible **trust score** heuristic on provenance cards; **Plan** gains an **Execution and governance** panel fed from existing persistence (`aiPipelineRuns`, `aiTraceGraph`, `operatorTraces`) and packaged intelligence rules.

## Consolidated into **Ask**

- Trust heuristic (`deriveTrustScore`) layered on `AssistantTraceSummary` with optional orphan-marker penalty (claim-check signal).
- Existing citations, evidence chips, routing caption, trace IDs, risk/evidence badges unchanged architecturally — documented as canonical in `docs/TWO_PAGE_CONSOLIDATION_MAP.md`.

## Consolidated into **Plan**

- `PlanSurfaceNav` — Overview · Workstreams · Connect · Setup (maps to existing `MobileShellTabId` routes; dock stays binary).
- `PlanExecutionInsights` — pipeline run peek, trace-bundle counts, pending operator-review count, governance policy rows derived from `getIntelligenceRules()` (no duplicate rule engine).
- `buildWorkspaceSnapshot` extensions: `recentAiPipelineRuns`, `memoryTraceSummary`, `planPendingReviewCount`.
- Header copy + `shellSectionCopy` titles now read **Plan · …** for nested tabs.

## Duplicates removed / avoided

- No parallel citation or trace persistence types; `brandOpsUnified.ts` is an alias/documentation barrel only.
- Plan destination grid keeps `aria-label="Plan destinations"`; strip uses **`Plan sections`** to avoid duplicate landmark labels.

## Blockers / follow-ups

- **Human review UX**: only backlog **count** surfaced; no approve/deny workflow UI yet.
- **Interactive memory graph**: summaries only (`bundleCount`, `lastBundleAt`).
- **Evaluation runs**: `EvaluationRun` type stubbed; not wired to automated rubric execution.

## Files touched (representative)

| Area | Files |
|------|-------|
| Docs | `docs/TWO_PAGE_CONSOLIDATION_MAP.md`, `docs/TWO_PAGE_CONSOLIDATION_REPORT.md` |
| Types | `src/types/brandOpsUnified.ts` |
| Services | `src/services/ai/trustScore.ts`, `src/services/plan/reviewQueue.ts`, `src/services/plan/governancePoliciesReadout.ts` |
| Snapshot | `src/pages/mobile/buildWorkspaceSnapshot.ts` |
| UI | `PlanSurfaceNav.tsx`, `PlanExecutionInsights.tsx`, `mobileApp.tsx`, `MobileWorkspaceHubView.tsx`, `AssistantTraceSummary.tsx`, `MobileChatView.tsx`, `shellSectionCopy.ts` |

## Tests added

- `tests/unit/trustScore.test.ts`
- `tests/unit/reviewQueueAndGovernanceReadout.test.ts`
- `tests/unit/twoPageWorkspaceSnapshotExtras.test.ts`
- `tests/unit/brandOpsUnifiedTypes.test.ts`
- Integration expectation updates in `tests/integration/mobileTabSurfacesSsr.test.ts`

## Recommended next steps (still two-page)

1. Lightweight **review queue** UI inside Plan (filter `operatorTraces` pending rows).
2. Link **pipeline run rows** to exported audit JSON / trace bundles when trace retention is on.
3. Optional: anchor jump link `#plan-exec-insights` from palette keywords.
