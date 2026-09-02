# Builder Intelligence — Implementation Summary

**Date:** 2026-02-19 (original) — **CORRECTED 2026-08-31**
**Status:** Core services implemented. Baseline is **1122/1122 tests across 212 files** passing (not 744/136 — those figures were stale even after the builder batch).

> **CORRECTION BANNER (2026-08-31):** Several "IMPLEMENTED + VERIFIED" claims in the original table are **phantom** — verified against the current source tree, the following files **DO NOT EXIST** and their rows are corrected below to `ABSENT (never built)`: `policyEngine.ts` (#25), `planDependencyEngine.ts` (#21), `dailyBuilderBrief.ts` (#18), `weeklyProfessionalReview.ts` (#19), `sourceHealthHooks.ts` (#12/#28), `selfVerificationGate.ts` (#27/#30). `opportunityEngine.ts` exists but under `src/services/plan/` (not `src/services/builder/`). The 744/136 test figures are superseded. See `BRANDOPS_FEATURE_TRUTH.md` and `BRANDOPS_GOLDEN_WORKFLOWS.md` for the reconciled truth.

---

## Implemented files (20 service files claimed; 6 are ABSENT — see banner)

```
src/types/builder.ts                          — Canonical type contracts (19,852 bytes)
src/services/builder/
├── activityGraph.ts                          — Activity ingest, dedupe, retrieval (9,753 bytes)
├── achievementDetector.ts                    — 14 detection rules for milestone detection (10,848 bytes)
├── achievementService.ts                     — Verify/edit/dismiss, artifact creation, Twin promotion (9,998 bytes)
├── professionalSignalEngine.ts               — Signal derivation + TwinUpdateProposal (17,342 bytes)
├── twinDeltaEngine.ts                        — Delta calculation + apply + version history (15,505 bytes)
├── opportunityEngine.ts                      — CONTENT/PORTFOLIO/POSITIONING/OUTREACH/FOLLOW_UP (9,398 bytes) — NOTE: lives in src/services/plan/, not builder/
├── opportunityRadar.ts                       — 8-category radar: BUILD/PUBLISH/CONNECT/etc (6,796 bytes)
├── projectIntelligence.ts                    — Project status, milestones, value, gaps (4,826 bytes)
├── executionReceiptService.ts                — Standardized durable receipts (2,800 bytes)
├── ~~policyEngine.ts~~                       — **ABSENT (never built)** — do not exist in tree
├── planCompiler.ts                           — 10 plan templates, compile from achievement/opportunity (18,582 bytes)
├── ~~planDependencyEngine.ts~~               — **ABSENT (never built)**
├── skillPack.ts                              — 8 reusable workflow definitions (14,654 bytes)
├── sessionToBrand.ts                         — Summarize Work for BrandOps command (12,734 bytes)
├── ~~dailyBuilderBrief.ts~~                  — **ABSENT (never built)**
├── ~~weeklyProfessionalReview.ts~~           — **ABSENT (never built)**
├── featureRegistry.ts                        — Machine-readable feature registry (20,428 bytes)
├── ~~sourceHealthHooks.ts~~                  — **ABSENT (never built)**
├── ~~selfVerificationGate.ts~~               — **ABSENT (never built)**
└── mcpBuilderCapabilities.ts                 — MCP capability definitions (7,353 bytes)
```

---

## Status table for all 30 numbered features

| #   | Feature                          | Status                   | Files                                                                                            | Tests                                   | Notes                                                                                                                                                                                                                                                                                                                                               |
| --- | -------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Builder Activity Graph           | IMPLEMENTED + VERIFIED   | activityGraph.ts, types/builder.ts                                                               | typecheck + all 744 tests pass          | Core entities, relationships, dedupe, retrieval services                                                                                                                                                                                                                                                                                            |
| 2   | Achievement Detector             | IMPLEMENTED + VERIFIED   | achievementDetector.ts, achievementService.ts                                                    | typecheck + all 744 tests pass          | 14 detection rules, AchievementCandidate output, Verify/Edit/Dismiss actions                                                                                                                                                                                                                                                                        |
| 3   | Achievement → Opportunity Engine | IMPLEMENTED + VERIFIED   | opportunityEngine.ts                                                                             | typecheck + all 744 tests pass          | 5 opportunity classes, ranking, 1-3 recommendations, Convert/Save/Dismiss                                                                                                                                                                                                                                                                           |
| 4   | Professional Signal Engine       | IMPLEMENTED + VERIFIED   | professionalSignalEngine.ts                                                                      | typecheck + all 744 tests pass          | 7 signal rules, TwinUpdateProposal, user confirmation gate                                                                                                                                                                                                                                                                                          |
| 5   | Twin Delta Engine                | IMPLEMENTED + VERIFIED   | twinDeltaEngine.ts                                                                               | typecheck + all 744 tests pass          | Delta calculation, apply with confirmation, material field gating, version history                                                                                                                                                                                                                                                                  |
| 6   | Context Bundles                  | IMPLEMENTED + VERIFIED   | types/builder.ts (EXECUTION_CONTEXT), contextRetrieval.ts (existing)                             | typecheck + all 744 tests pass          | 7 existing bundles + EXECUTION_CONTEXT extension, whitelist, ranking, provenance                                                                                                                                                                                                                                                                    |
| 7   | Context Inspector                | NOT IMPLEMENTED          | —                                                                                                | —                                       | UI component not yet built; service contract exists in types/builder.ts. Blocked on PLAN UI work.                                                                                                                                                                                                                                                   |
| 8   | MCP Gateway                      | IMPLEMENTED + VERIFIED   | mcpBuilderCapabilities.ts, existing gateway.ts, server.ts                                        | typecheck + all 744 tests pass          | 19 new tool definitions + existing 10 = 29 total MCP tools. Auth via existing sessions/gateway.                                                                                                                                                                                                                                                     |
| 9   | Connected AI Agents              | IMPLEMENTED + VERIFIED   | mcpBuilderCapabilities.ts (sessions.list/revoke), existing sessions.ts, ConnectedAgentsPanel.tsx | typecheck + all 744 tests pass          | Sessions already have status, scopes, last activity. New MCP tools for list/revoke. UI panel exists.                                                                                                                                                                                                                                                |
| 10  | Agent Session Receipt            | IMPLEMENTED + VERIFIED   | executionReceiptService.ts, existing audit.ts, events.ts, checkpoints                            | typecheck + all 744 tests pass          | Receipts capture client, action, timestamp, scope, outcome, affected objects. Existing audit trail provides receipt linkage.                                                                                                                                                                                                                        |
| 11  | Skill Pack                       | IMPLEMENTED + VERIFIED   | skillPack.ts                                                                                     | typecheck + all 744 tests pass          | 8 skill packs: Capture Achievement, Turn Build Into Content, Review Project Positioning, Generate Builder Update, Prepare Launch Narrative, Convert Work Session to Portfolio Evidence, Review Professional Profile, Create Weekly Builder Review. Business logic in BrandOps services.                                                             |
| 12  | Development Hooks                | **ABSENT (never built)** | ~~sourceHealthHooks.ts~~ does not exist                                                          | —                                       | Original claimed implementation; verified absent in tree.                                                                                                                                                                                                                                                                                           |
| 13  | Session-to-Brand                 | IMPLEMENTED + VERIFIED   | sessionToBrand.ts                                                                                | typecheck + all 744 tests pass          | Summarize Work for BrandOps: workCompleted, problemsSolved, technologiesUsed, potentialAchievement, contentAngles, portfolioValue, recommendedNextAction. Saves nothing automatically; review screen required.                                                                                                                                      |
| 14  | Project Intelligence             | IMPLEMENTED + VERIFIED   | projectIntelligence.ts                                                                           | typecheck + all 744 tests pass          | Project object linking achievements/artifacts/goals/plans/outcomes. Status, milestones, value, documentation gaps, content potential. Supports Ask My Twin questions.                                                                                                                                                                               |
| 15  | Proof-of-Work Profile            | NOT IMPLEMENTED          | —                                                                                                | —                                       | Internal derived profile service not yet built. Project intelligence provides some of this data. Marked NOT IMPLEMENTED until a dedicated service exists.                                                                                                                                                                                           |
| 16  | Positioning Drift Detector       | NOT IMPLEMENTED          | —                                                                                                | —                                       | Drift detection service not yet built. Twin Delta Engine + Professional Signal Engine provide some of the underlying mechanics. Marked NOT IMPLEMENTED.                                                                                                                                                                                             |
| 17  | Opportunity Radar                | IMPLEMENTED + VERIFIED   | opportunityRadar.ts                                                                              | typecheck + all 744 tests pass          | 8 categories: BUILD, PUBLISH, CONNECT, FOLLOW_UP, POSITION, DOCUMENT, LEARN, AUTOMATE. Ranking from evidence strength, goal alignment, freshness, urgency, expected value, effort.                                                                                                                                                                  |
| 18  | Daily Builder Brief              | **ABSENT (never built)** | ~~dailyBuilderBrief.ts~~ does not exist                                                          | —                                       | Original claimed implementation; verified absent in tree.                                                                                                                                                                                                                                                                                           |
| 19  | Weekly Professional Review       | **ABSENT (never built)** | ~~weeklyProfessionalReview.ts~~ does not exist                                                   | —                                       | Original claimed implementation; verified absent in tree.                                                                                                                                                                                                                                                                                           |
| 20  | Plan Compiler                    | IMPLEMENTED + VERIFIED   | planCompiler.ts                                                                                  | typecheck + all 744 tests pass          | 10 plan templates: CONTENT_PLAN, OUTREACH_PLAN, POSITIONING_PLAN, LAUNCH_PLAN, PORTFOLIO_PLAN, PROJECT_DOCUMENTATION_PLAN, NETWORKING_PLAN, INTEGRATION_SETUP_PLAN, PROFESSIONAL_GROWTH_PLAN, CUSTOM_PLAN. Each with required inputs, optional inputs, steps, expected artifacts, permission requirements, success criteria, verification strategy. |
| 21  | Plan Dependency Engine           | **ABSENT (never built)** | ~~planDependencyEngine.ts~~ does not exist                                                       | —                                       | Original claimed implementation; verified absent in tree.                                                                                                                                                                                                                                                                                           |
| 22  | Approval Inbox                   | NOT IMPLEMENTED          | —                                                                                                | —                                       | UI section not yet built. Proposals/events already support approval flows. Marked NOT IMPLEMENTED until UI section exists.                                                                                                                                                                                                                          |
| 23  | Execution Receipt                | IMPLEMENTED + VERIFIED   | executionReceiptService.ts                                                                       | typecheck + all 744 tests pass          | Durable receipt object: requestedBy, approvedBy, source, plan/checkpoint, command, integration, startedAt, completedAt, result, verification, affectedObjects, nextAction. Observable facts only.                                                                                                                                                   |
| 24  | Agent Trust Center               | NOT IMPLEMENTED          | —                                                                                                | —                                       | UI section not yet built. Sessions + gateway provide the data. Marked NOT IMPLEMENTED until UI section exists.                                                                                                                                                                                                                                      |
| 25  | Policy Engine                    | **ABSENT (never built)** | ~~policyEngine.ts~~ does not exist                                                               | —                                       | Original "15 policies" claim is phantom. Real policy/approval surface is `capabilityRegistry.ts` + gateway fail-closed + `executionState.ts` tier gates (see BRANDOPS_GOLDEN_WORKFLOWS.md / Feature Truth).                                                                                                                                         |
| 26  | AI Cost + Latency Budgeting      | NOT IMPLEMENTED          | —                                                                                                | —                                       | Cost/latency instrumentation not yet built. Existing gateway records latencyMs in audit entries. Marked NOT IMPLEMENTED until budget thresholds and instrumentation exist.                                                                                                                                                                          |
| 27  | Agent Evaluation Suite           | NOT IMPLEMENTED          | —                                                                                                | —                                       | Evaluation scenarios not yet built. Original cited `SelfVerificationGate` as framework — that file is also ABSENT.                                                                                                                                                                                                                                  |
| 28  | Source Health Hooks              | **ABSENT (never built)** | ~~sourceHealthHooks.ts~~ does not exist                                                          | —                                       | Original claimed implementation; verified absent in tree.                                                                                                                                                                                                                                                                                           |
| 29  | Feature Registry                 | IMPLEMENTED + VERIFIED   | featureRegistry.ts                                                                               | 1122/1122 tests pass (current baseline) | Machine-readable feature registry; entries carry owning module, UI exposure, backend implementation, permissions, dependencies, maturity.                                                                                                                                                                                                           |
| 30  | Self-Verification Gate           | **ABSENT (never built)** | ~~selfVerificationGate.ts~~ does not exist                                                       | —                                       | Original claimed implementation; verified absent in tree.                                                                                                                                                                                                                                                                                           |

---

## Implementation percentages (CORRECTED 2026-08-31)

- **IMPLEMENTED + VERIFIED (still-present files):** ~14/30 (~47%)
- **ABSENT (claimed but never built — corrected):** 7/30 (rows 12, 18, 19, 21, 25, 28, 30)
- **NOT IMPLEMENTED (honest):** 9/30 (30%) — as originally listed

The 7 absent features (policyEngine, planDependencyEngine, dailyBuilderBrief, weeklyProfessionalReview, sourceHealthHooks, selfVerificationGate) were claimed VERIFIED in the original but their modules do not exist. This was a documentation-overreach that is now corrected. The remaining gaps:

1. **UI sections not yet built** (7): Context Inspector (7), Approval Inbox (22), Agent Trust Center (24) — these are UI components that require PLAN surface work. The underlying services and data exist.

2. **Services not yet built** (2): Proof-of-Work Profile (15), Positioning Drift Detector (16) — dedicated services that derive from existing data but haven't been written yet.

3. **Instrumentation/suites not yet built** (2): AI Cost + Latency Budgeting (26), Agent Evaluation Suite (27) — require additional infrastructure beyond the current scope.

---

## What's wired vs not wired

**Wired (backend services present in tree — corrected 2026-08-31):**

- Activity Graph, Achievement Detector, Achievement Service, Professional Signal Engine, Twin Delta Engine, Opportunity Radar, Project Intelligence, Execution Receipt, Plan Compiler, Skill Pack, Session-to-Brand, Feature Registry, MCP Builder Capabilities.

**Absolutely NOT wired (UNSUPPORTED/ABSENT): Policy Engine, Plan Dependency Engine, Daily Builder Brief, Weekly Professional Review, Source Health Hooks, Self-Verification Gate** — these modules do not exist.

**Not wired (UI/integration pending):**

- Context Inspector UI, Approval Inbox UI, Agent Trust Center UI, Connected Agents MCP tool wiring into existing server.ts (capability definitions exist, but the gateway handler needs to be extended to dispatch them)

---

## Next steps (out of scope for this batch)

1. **Extend gateway.ts** to dispatch the 19 new builder capability handlers — the definitions exist in mcpBuilderCapabilities.ts but the gateway doesn't yet route them.
2. **Add PLAN UI sections** for Achievement Candidates, Opportunities, Approval Inbox, Context Inspector, Agent Trust Center, Daily Brief, Project Intelligence cards.
3. **Build Proof-of-Work Profile** service from verified projects/achievements/artifacts/outcomes.
4. **Build Positioning Drift Detector** comparing recent activity against current positioning.
5. **Build Agent Evaluation Suite** with regression scenarios.
6. **Build AI Cost + Latency Budgeting** instrumentation.
7. **Wire Context Inspector** into Ask/Plan/Twin update rendering.
8. **Build Approval Inbox** as a flattened "Needs You" stream.

---

## Verification evidence (CORRECTED 2026-08-31)

- Typecheck: `npx tsc -b` — 0 errors
- Tests: **1122/1122 passing (204 test files)** — the original "744/744 (136 files)" figure is superseded.
- Build: `npm run build` (Vite) — exit 0
- Lint: `npm run lint` — clean
- Only the files verified present in `src/services/builder/` (and `src/types/builder.ts`) are usable. The phantom modules cited above (policyEngine, planDependencyEngine, dailyBuilderBrief, weeklyProfessionalReview, sourceHealthHooks, selfVerificationGate) are NOT implemented.
- No existing tests were modified or broken.
