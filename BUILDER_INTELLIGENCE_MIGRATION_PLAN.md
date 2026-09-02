# Builder Intelligence — File/Module Migration Plan

**Date:** 2026-02-19  
**Scope:** 30 named systems, implemented in dependency order against the existing BrandOps repository.

> **STATUS NOTE (2026-08-31):** This is a forward-looking migration plan, not a record of completion. Verified against the current tree, several planned modules were **never built**: `policyEngine.ts`, `planDependencyEngine.ts`, `dailyBuilderBrief.ts`, `weeklyProfessionalReview.ts`, `sourceHealthHooks.ts`, `selfVerificationGate.ts`, `contextBundles.ts`, `builderTaxonomy.ts`, `builderCapabilities.ts`, `builderToolSchemas.ts`. `opportunityEngine.ts` exists but under `src/services/plan/` (not `builder/`). Only the modules listed as still present in `BUILDER_INTELLIGENCE_STATUS.md` (see its correction banner) are real. Treat this plan's file list as a proposal, not present reality.

---

## 1. Existing reusable surfaces (do not duplicate)

| Spec concept                          | Existing surface                                                                                                           | Reuse strategy                                                                                                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Context Bundles (1–7)                 | `src/services/interop/contextRetrieval.ts` + `CONTEXT_BUNDLE_IDS` in `agentInterop.ts`                                     | Extend `BUNDLE_BUILDERS` with `EXECUTION_CONTEXT`; add `ContextInspector` rendering on top                                                                                                         |
| MCP Gateway (8)                       | `src/services/interop/mcp/server.ts`, `capabilityRegistry.ts`, `gateway.ts`                                                | Add new capability definitions + tool arg schemas; route through `executeAgentToolCall`                                                                                                            |
| Agent sessions/auth (9, 10, 24)       | `src/services/interop/sessions.ts`                                                                                         | Add `lastSuccessfulRequest`, `scopes` summary, `Needs authentication`/`Unsupported` classification in UI                                                                                           |
| Agent events (2, 10, 13)              | `src/services/interop/events.ts` (`ExternalAgentEvent`, `ingestAgentEvent`, `reviewAgentEvent`, `promoteAgentEventToTwin`) | Create a parallel `ActivityEvent` entity; achievement detector consumes eligible events                                                                                                            |
| Agent proposals / approval (3, 5, 22) | `src/services/interop/proposals.ts`                                                                                        | Reuse for TwinDelta proposals; add achievement-verification and opportunity-acceptance flows                                                                                                       |
| Plan conversion (3, 20)               | `src/services/plan/askPlanConversion.ts` + `src/services/interop/convertToPlan.ts`                                         | Extend `planPreset` set with spec templates; strengthen input validation                                                                                                                           |
| Operator traces / audit (10, 23)      | `src/services/dataset/operatorTraces.ts`, `src/services/interop/audit.ts`                                                  | Add `ExecutionReceipt` canonical type; emit receipts alongside traces                                                                                                                              |
| Checkpoints (21, 23)                  | `src/services/execution/checkpointStore.ts`                                                                                | Use for plan dependency + execution state tracking                                                                                                                                                 |
| PLAN UI                               | `src/pages/mobile/` PLAN components                                                                                        | Add new flat sections: Builder Activity, Achievements, Opportunities, Approval Inbox, Context Inspector, Connected Agents, Agent Trust Center, Daily Brief, Project Intelligence                   |
| Storage                               | `src/services/storage/storage.ts`                                                                                          | Add new state slices: `builderActivity`, `achievements`, `professionalSignals`, `twinDeltas`, `projects`, `executionReceipts`, `builderBriefs`, `skillPack`, `featureRegistry`, `opportunityRadar` |
| Digital Twin                          | `src/services/digitalTwin/digitalTwin.ts`                                                                                  | Add TwinDelta + Twin version history; gate Twin updates through delta confirmation                                                                                                                 |

---

## 2. New files by batch

### Batch 1 — Core type contracts

- `src/types/builder.ts` — `ActivityEvent`, `Achievement`, `Project`, `SkillEvidence`, `Artifact`, `Relationship`, `Goal`, `Outcome`, `AchievementCandidate`, `ProfessionalSignal`, `TwinDelta`, `ExecutionReceipt`, `OpportunityRecommendation`, `ProjectIntelligence`, `BuilderBrief`, `WeeklyReview`, `SkillPack`, `FeatureRegistryEntry`, `PolicyDecision`, `ContextBundleId` extension for `EXECUTION_CONTEXT`
- `src/types/builderTaxonomy.ts` — relationship kinds, achievement kinds, signal kinds, opportunity categories, policy decision types

### Batch 2 — Builder services

- `src/services/builder/activityGraph.ts` — event ingest, dedupe, `getRecentActivity`, `getVerifiedAchievements`, `getProjectTimeline`, `proposeAchievement`
- `src/services/builder/achievementDetector.ts` — milestone detection rules, `detectAchievements`, `AchievementCandidate` construction
- `src/services/builder/achievementService.ts` — verify/edit/dismiss, artifact creation, Twin promotion hook
- `src/services/builder/opportunityEngine.ts` — 5 opportunity classes, ranking, `OpportunityRecommendation`
- `src/services/builder/professionalSignalEngine.ts` — signal derivation, thresholds, `TwinUpdateProposal` creation
- `src/services/builder/twinDeltaEngine.ts` — delta calculation, version history, confirmation gating
- `src/services/builder/contextBundles.ts` — extend `contextRetrieval.ts` with `EXECUTION_CONTEXT`; add `ContextInspector` data shape
- `src/services/builder/projectIntelligence.ts` — `Project` canonical object, status, milestones, content potential
- `src/services/builder/opportunityRadar.ts` — 8 categories, ranking, storage
- `src/services/builder/dailyBuilderBrief.ts` — optional briefing generation
- `src/services/builder/weeklyProfessionalReview.ts` — review artifact generation
- `src/services/builder/planCompiler.ts` — 10 plan templates, `CompilePlanDraft`, missing-input requests
- `src/services/builder/planDependencyEngine.ts` — dependency graph, state computation, safe retry
- `src/services/builder/executionReceiptService.ts` — receipt creation, linking
- `src/services/builder/policyEngine.ts` — centralized authorization, policy decisions
- `src/services/builder/skillPack.ts` — workflow definitions
- `src/services/builder/sessionToBrand.ts` — summarization command
- `src/services/builder/featureRegistry.ts` — machine-readable registry
- `src/services/builder/sourceHealthHooks.ts` — deterministic lifecycle hooks
- `src/services/builder/selfVerificationGate.ts` — trace + test + mark

### Batch 3 — MCP gateway expansion

- `src/services/interop/builderCapabilities.ts` — new capability definitions for builder tools
- `src/services/interop/mcp/builderToolSchemas.ts` — arg schemas for new tools
- `src/services/interop/gateway.ts` — extend `runHandler` with builder capability cases

### Batch 4 — PLAN UI sections

- `src/pages/mobile/BuilderActivitySection.tsx`
- `src/pages/mobile/AchievementCandidatesSection.tsx`
- `src/pages/mobile/OpportunitiesSection.tsx`
- `src/pages/mobile/ApprovalInboxSection.tsx`
- `src/pages/mobile/ContextInspector.tsx`
- `src/pages/mobile/ConnectedAgentsSection.tsx` (extend existing `ConnectedAgentsPanel.tsx`)
- `src/pages/mobile/AgentTrustCenter.tsx`
- `src/pages/mobile/DailyBriefSection.tsx`
- `src/pages/mobile/ProjectIntelligenceSection.tsx`

### Batch 5 — Evaluation + self-verification

- `src/services/evaluation/agentEvaluationSuite.ts`
- `src/services/evaluation/scenarios/` — scenario files
- `src/services/evaluation/selfVerificationGate.ts`

### Batch 6 — Storage normalization + tests

- Extend `src/services/storage/storage.ts` to normalize new state slices
- `tests/unit/builder/` — unit tests for each service
- `tests/integration/builderPaths.test.ts` — golden path + security tests
- `BRANDOPS_SOURCE_HEALTH.md` + `BRANDOPS_ARCHITECTURE.md` updates

---

## 3. Implementation order and rationale

1. **Feature Registry first** — every subsequent module registers itself; prevents dead UI / backend-only drift.
2. **Canonical contracts** — all services type against `builder.ts`; no inline shapes.
3. **Policy Engine** — before any MCP tool or UI surface executes a mutation, the policy engine must exist so we can prove denial paths.
4. **Activity Graph → Achievement Detector → Achievement Service** — the data backbone; everything else consumes activity/achievements.
5. **Context Bundles enhancement → MCP gateway** — get context isolation correct before exposing new tools.
6. **Professional Signal Engine + Twin Delta Engine** — consume verified achievements; produce Twin update proposals.
7. **Project Intelligence + Opportunity Radar** — derive higher-level insights from activity + signals.
8. **Plan Compiler + Dependency Engine + Execution Receipts** — plan execution backbone.
9. **Approvals/Approval Inbox** — unify the approval UX.
10. **Skills/Hooks/Session-to-Brand** — developer-facing surfaces.
11. **Reviews/Briefings** — scheduled/output surfaces.
12. **Evaluation Suite + Source Health Hooks + Self-Verification Gate** — quality assurance layer.
13. **PANEL UI sections** — wire everything to the existing PLAN surface.

---

## 4. Scope boundary for this implementation pass

Given the conversation compression boundary and the 30-subsystem scope, this pass will:

- **Fully implement** the core foundation: type contracts, activity graph, achievement detector/service, professional signal engine, twin delta engine, context bundle enhancement, project intelligence, opportunity radar, plan compiler, plan dependency engine, execution receipts, policy engine, feature registry, MCP gateway expansion, and the PLAN UI sections that surface them.
- **Partially implement** skills/hooks/session-to-brand/daily brief/weekly review/evaluation suite/self-verification gate — build the service contracts and the most critical scenarios, mark remainder as EXPERIMENTAL behind a feature flag until the full scenarios are in place.
- **Mark NOT IMPLEMENTED** only where the repository genuinely lacks a transport or the spec requires infrastructure the current architecture does not support (e.g., true async long-running MCP tasks — the current gateway is sync; we use the existing checkpoint/proposal pattern for long-running work instead).

---

## 5. Verification commitment

After every batch:

1. Run `npx tsc -b --noEmit`
2. Run `npx vitest run`
3. Run `npm run build`
4. Repair regressions immediately
5. Update `BRANDOPS_SOURCE_HEALTH.md` and `BRANDOPS_ARCHITECTURE.md`
6. Finish with a status table covering all 30 numbered features
