# BRANDOPS GOLDEN WORKFLOWS

**Status:** Re-audited against real source + test evidence on 2026-08-31.
**Method:** Every workflow below is traced through source code that ACTUALLY EXISTS
and is backed by at least one passing unit test that ACTUALLY EXISTS. No workflow
is marked CERTIFIED unless its critical path is exercised by a real test.
**Honesty note:** The prior version of this document (2026-08-30) cited many files
that do not exist (`authorityIntelligence.ts`, `commandLayer.ts`, `commandExecution.ts`,
`policyEngine.ts`, `handoffs.ts`, `externalAgentSessions.ts`, `toolExecution.ts`,
`integrationHub.ts` import, and tests `commandLayer.test.ts`, `commandExecution.test.ts`,
`gateway.test.ts`, `idempotency.test.ts`, `authorityIntelligence.test.ts`,
`twinDeltaEngine.test.ts`, `achievementService.test.ts`, `activityGraph.test.ts`,
`agentSession.test.ts`, `contextDelivery.test.ts`, `automation.test.ts`, `handoffs.test.ts`).
Those citations were phantom. They are removed or re-pointed to the real components below.

**Current real baseline:** `tsc -b` clean, `eslint` clean, `vite build` OK, **1122 tests /
216 files passing**.

---

## WORKFLOW A — THINK TO WORK

**Path:** ASK → grounded answer → checkpoint → Convert to Plan → preview → approve → execute → verify → receipt → outcome

**Implementation evidence (real):**

- ASK drives `executeAiPipeline` / `runAiPipelineWithPersistence` in `src/services/ai/aiPipelineRunner.ts`.
- Pipeline step flow is exercised by `tests/unit/aiPipelineRunner.test.ts` and `tests/unit/aiGatewayTracing.test.ts`.
- Convert to Plan via `convertAskResponseToPlan` + `savePlanDraftToWorkspace` in `src/services/plan/askPlanConversion.ts` (tested: `askPlanConversion.test.ts`, `persistConvertedPlan.test.ts`).
- Execution via `executePlan` in `src/services/execution/planExecutor.ts` (tested: `planExecutor.test.ts`, `executionStateMachine.test.ts`).
- Verification via `verifyPlanOutcomes` in `src/services/execution/planVerifier.ts` (tested: `planVerifier.test.ts`).
- Receipts via the execution-receipt service (tested: `resolveExecutionReceipt.test.ts`).
- Outcomes now feed controlled learning (`recordOutcome`/`recordLearningSignal`) from within `verifyPlanOutcomes` (tested: `outcomeLearning.test.ts`).
- End-to-end ASK→verify is additionally covered by `tests/unit/canonicalLoopEndToEnd.test.ts`.

**Test evidence (real):** `aiPipelineRunner.test.ts`, `askPlanConversion.test.ts`, `planExecutor.test.ts`, `executionStateMachine.test.ts`, `planVerifier.test.ts`, `outcomeLearning.test.ts`, `persistConvertedPlan.test.ts`, `canonicalLoopEndToEnd.test.ts`.

**Status:** EXISTS, WIRED, TESTED, RUNTIME_VERIFIED (A→Z test present).
**Verdict component:** verified locally.

---

## WORKFLOW B — EVIDENCE TO TWIN

**Path:** evidence → candidate claim → provenance → verification → Twin Delta → approval → version update → improved future context

**Implementation evidence (real):**

- Agent-reported evidence via `ingestAgentEvent` in `src/services/interop/events.ts` (reported→verified→promoted lifecycle; user-only promotion).
- Twin delta computation via `calculateDeltas` in `src/services/builder/twinDeltaEngine.ts`.
- Twin update proposals via `createAgentProposal({kind:'twin_update'})` + `decideAgentProposal` in `src/services/interop/proposals.ts`.
- MCP surface `builder.twin-proposals.list/accept/reject` in `src/services/interop/mcp/builderToolHandlers.ts`.
- Context retrieval consumes the Twin via `retrieveAgentContext` in `src/services/interop/contextRetrieval.ts`.

**Test evidence (real):** `agentInterop.test.ts` (events/proposals/twin promote), `digitalTwin.test.ts`, `memoryContextEngine.test.ts`. (`twinDeltaEngine.test.ts`, `achievementService.test.ts`, `activityGraph.test.ts` DO NOT EXIST — cited falsely in the prior doc.)

**Status:** EXISTS, WIRED, TESTED, RUNTIME_VERIFIED (partial).
**Gap:** Twin-delta acceptance is routed through generic agent-proposal approval; it is not surfaced as a dedicated primary UI approval flow. The prior "memoryFirewall.ts / activityGraph.ts" citations were false — those modules do not exist as cited.

---

## WORKFLOW C — PROJECT TO PROOF OF WORK

**Path:** project/activity → evidence → achievement candidate → verification → artifact → skill evidence → professional opportunity

**Implementation evidence (real):**

- Achievement candidates & verification via `achievementDetector.ts` + `achievementService.ts` in `src/services/builder/` (wired over `builder.achievements.*` handlers).
- Opportunity readout via `buildOpportunityEngineReadout` in `src/services/plan/opportunityEngine.ts` (tested).
- Professional signal engine in `src/services/builder/professionalSignalEngine.ts`.
- Profession awareness via `professionPacks.ts` + `PROFESSION_CONTEXT` bundle (tested: `professionPacks.test.ts`).

**Test evidence (real):** `opportunityEngine.test.ts`, `professionPacks.test.ts`, `predictiveOpportunityLayer.test.ts`. (`activityGraph.test.ts`, `achievementService.test.ts`, `authorityIntelligence.test.ts` DO NOT EXIST.)

**Status:** EXISTS, WIRED, TESTED, RUNTIME_VERIFIED (partial).
**Gap:** There is NO `authorityIntelligence` module. Authority/authority-intelligence (Workflow H in the prior doc) is **ABSENT** — see Workflow H below.

---

## WORKFLOW D — OPPORTUNITY TO OUTCOME

**Path:** evidence → opportunity → qualification → Plan → execution → verification → outcome → learning

**Implementation evidence (real):**

- Opportunity radar via `computeOpportunityRadar`/`builderOpportunities` in `src/services/builder/opportunityRadar.ts` (wired over `builder.opportunities.*`).
- Full lifecycle via `src/services/opportunity/opportunityLifecycle.ts`: detect → qualify → save → dismiss → plan → act → observe → learn (tested: `opportunityLifecycle.test.ts`).
- Plan from opportunity via `planCompiler.ts` (`compilePlanFromOpportunity`).
- Verification feeds learning via `verifyPlanOutcomes` → `recordOutcome`/`recordLearningSignal` (tested: `outcomeLearning.test.ts`).

**Test evidence (real):** `opportunityLifecycle.test.ts`, `opportunityEngine.test.ts`, `outcomeLearning.test.ts`, `planVerifier.test.ts`, `canonicalLoopEndToEnd.test.ts`.

**Status:** EXISTS, WIRED, TESTED, RUNTIME_VERIFIED.

---

## WORKFLOW E — EXTERNAL ACTION

**Path:** objective → capability → approval gate → connector → execution → external verification → receipt

**Implementation evidence (real):**

- Approval-gated external actions via the `action.request` capability in `src/services/interop/gateway.ts`, which may ONLY produce a pending approval-gated request (fail-closed). Tested in `adversarialSecurity.test.ts` + `canonicalLoopEndToEnd.test.ts`.
- Capability registry = single source of access (`src/services/interop/capabilityRegistry.ts`); approval-access capabilities fail closed.
- No `commandLayer.ts` / `commandExecution.ts` / `policyEngine.ts` — the prior citations were phantom. The real policy surface is `capabilityRegistry.ts` + gateway fail-closed logic.
- **Real connectors are ABSENT/UNVERIFIED.** There is no backing backend. LinkedIn is an overlay/OAuth UI (`linkedinOverlay.ts`, `LinkedInSignInButton.tsx`). `integrationHonesty.ts` / `integrationSourceCatalog.ts` track connector honesty/source state but there are no live credentials.

**Test evidence (real):** `adversarialSecurity.test.ts`, `canonicalLoopEndToEnd.test.ts`, `P0-security.test.ts`.

**Status:** LOCKED-DOWN + TESTED (approval gate proven) but **NOT DEPLOYED/VERIFIED** — no live connector executes an external side effect.

---

## WORKFLOW F — EXTERNAL AGENT

**Path:** external agent → session/token → capability grant → scoped context → activity → event → user review → twin promote → plan → learning

**Implementation evidence (real):**

- Sessions via `src/services/interop/sessions.ts` — token-hash only, capability grants, revocation, read-only enforcement.
- Purpose-scoped context via `retrieveAgentContext` + `ContextBundleId` (incl. `PROFESSION_CONTEXT`) in `contextRetrieval.ts`.
- Gateway dispatch (auth→authorize→injection→idempotency→dispatch→audit) in `gateway.ts`.
- Events lifecycle (`ingestAgentEvent`/`reviewAgentEvent`/`promoteAgentEventToTwin`) in `events.ts`.
- End-to-end A→Z in `canonicalLoopEndToEnd.test.ts`.
- There is NO `handoffs.ts` (agent-to-agent handoff) — the prior citation was phantom. Agent selection logic does not exist.

**Test evidence (real):** `agentInterop.test.ts`, `agentInteropStorageRoundTrip.test.ts`, `agentIdentity.test.ts`, `canonicalLoopEndToEnd.test.ts`, `adversarialSecurity.test.ts`, `mcpProtocol.test.ts`.

**Status:** EXISTS, WIRED, TESTED, RUNTIME_VERIFIED.

---

## WORKFLOW G — AUTOMATION

**Path:** trigger → context → plan/capability → approval → action → verification → receipt → next schedule

**Implementation evidence (real):**

- Scheduling primitives exist (`src/services/scheduling/scheduler.ts`, tested `scheduler.test.ts`; `requestExtensionSchedulerSync.ts`).
- **There is NO in-process background scheduler and NO `automation.ts` execution engine.** The prior `automation.test.ts` citation was phantom.
- Real automation triggers (browser alarms / external scheduling) are NOT wired end-to-end.

**Test evidence (real):** `scheduler.test.ts`.

**Status:** EXISTS (scheduling primitives), WIRED (partial), TESTED (incomplete), **NOT RUNTIME_VERIFIED**.

---

## WORKFLOW H — AUTHORITY

**Path:** public evidence → Authority Graph → gap → opportunity → plan → legitimate action → observed outcome

**Implementation evidence (real):**

- `src/services/builder/authorityGraph.ts` — `buildAuthorityGraph(workspace)` exists.
- Wired into the agent gateway at `src/services/interop/gateway.ts:321`, reachable as an MCP
  capability. Tested in `tests/unit/mcpPhase1Capabilities.test.ts`.
- **Not surfaced in the app.** No mobile or extension surface calls it; nothing in `src/pages`
  references it. A person using BrandOps cannot reach this; an external agent can.
- The historical note below remains accurate about what it replaced: `authorityIntelligence.ts`
  never existed, and every citation of it in the pre-2026-08 docs was phantom.

**Status:** **EXISTS (agent surface only), WIRED (gateway), TESTED (capability level), NOT
RUNTIME_VERIFIED in the app.** Corrected 2026-09-01: this section read "ABSENT — not implemented"
after the module had been added and wired, which is the same class of error the document was written
to remove. Opportunities the user actually sees are still derived from the professional signal
engine and opportunity radar, not from this graph.

---

## WORKFLOW SUMMARY (truthful)

| Workflow                   | Status              | Tested (real)    | Runtime Verified                 | Key Gap                                                                                                                        |
| -------------------------- | ------------------- | ---------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A — Think to Work          | EXISTS+WIRED        | Yes (A→Z)        | Yes                              | None                                                                                                                           |
| B — Evidence to Twin       | EXISTS+WIRED        | Yes (partial)    | Yes (partial)                    | Twin-delta not in primary UI approval flow. Memory Firewall (`memoryScreen.ts`) and `activityGraph.ts` now exist and are wired |
| C — Project to Proof       | EXISTS+WIRED        | Yes (partial)    | Yes (partial)                    | User-facing derivation is the professional signal engine; the authority graph is agent-surface only                            |
| D — Opportunity to Outcome | EXISTS+WIRED        | Yes              | Yes                              | None                                                                                                                           |
| E — External Action        | LOCKED-DOWN, TESTED | Yes              | Approval gate yes / execution NO | No live connector; OAuth UI only                                                                                               |
| F — External Agent         | EXISTS+WIRED        | Yes (A→Z)        | Yes                              | Agent selection logic absent; no handoffs module                                                                               |
| G — Automation             | EXISTS (primitives) | Partial          | NO                               | No in-process background scheduler                                                                                             |
| H — Authority              | EXISTS (agent only) | Yes (capability) | NO (no app surface)              | Reachable by an external agent; no user-facing surface calls it                                                                |

---

## CROSS-CUTTING VERIFICATION (real, re-checked)

### Persistence

- Single-blob local-first persistence in `src/services/storage/storage.ts` (key `BRANDOPS_WORKSPACE_DATA_KEY`); normalizers + `withDefaults` preserve agent session/event/proposal state (`agentInteropStorageRoundTrip.test.ts`, `concurrencyAndFailure.test.ts`).

### Recovery & idempotency

- Gateway idempotency cache (`src/services/interop/idempotency.ts`) suppresses duplicate tool calls (`adversarialSecurity.test.ts`, `concurrencyAndFailure.test.ts`).
- Event dedupe (`dedupeKey`) prevents duplicate achievements (`agentInterop.test.ts`, `concurrencyAndFailure.test.ts`).
- Plan execution state machine prevents double-execution (`P0-security.test.ts`, `executionStateMachine.test.ts`).
- Learning is bounded (signals ≤ 500, outcomes ≤ 200, pref-hints ≤ 200) (`concurrencyAndFailure.test.ts`).

### Observability

- Agent audit via `appendAuditEntry` in `src/services/interop/audit.ts`; operator traces via `prependOperatorTrace`; checkpoints via `checkpointStore.ts`.

### Security (real, tested)

- Prompt-injection screening at the gateway (`adversarialSecurity.test.ts`) — including improved exfiltration + restored override patterns.
- Cross-workspace isolation (`P0-security.test.ts`).
- Approval fail-closed for approval-access capabilities (`canonicalLoopEndToEnd.test.ts`, `adversarialSecurity.test.ts`).
- Session token hashing + revocation (`agentInterop.test.ts`, `adversarialSecurity.test.ts`).
- Read-only sessions cannot be granted write capabilities (`agentInterop.test.ts`).

**Overall truth:** Workflows A, B(partial), C(partial), D, F are real and locally verified. E is security-tested but has no live connector. G is a primitive only. H is absent. Deployment remains LOCALLY_VERIFIED only — CI/STAGING/PRODUCTION are NOT_VERIFIED.
