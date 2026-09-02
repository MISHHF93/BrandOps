# BRANDOPS CANONICAL ARCHITECTURE

**Status:** Living document — describes the code that actually exists after implementation.
**Last updated:** 2026-08-30
**Method:** Forensic source inspection + runtime verification

---

## 1. Product North Star

BrandOps is the AI workforce for everything beyond code. The canonical loop:

```
IDENTITY → PROFESSION → EVIDENCE → CONTEXT → ASK → ARTIFACT → PLAN →
CAPABILITY → AGENT/TASK → SKILL → TOOL/CONNECTOR → COMMAND → POLICY →
APPROVAL → EXECUTION → CHECKPOINT → VERIFICATION → RECEIPT → OUTCOME →
LEARNING → NEXT-BEST-ACTION → STRONGER CONTEXT/DIGITAL TWIN → repeat
```

Simplified product grammar: ASK=THINK/COMMAND, ARTIFACT=CRYSTALLIZE, PLAN=ORGANIZE,
AGENT=WORK, APPROVAL=CONTROL, TOOL=ACT, VERIFICATION=PROVE, RECEIPT=RECORD,
OUTCOME=MEASURE, LEARNING=IMPROVE, TWIN=COMPOUND.

---

## 2. Repository Structure

```
BrandOps-main/
├── src/
│   ├── background/          # Chrome MV3 background service worker
│   ├── content/             # Content scripts (LinkedIn companion)
│   ├── config/              # Workspace defaults, control plane config
│   ├── modules/             # BrandMemory demo seed
│   ├── pages/               # React UI (mobile shell, dashboard, welcome, help, integrations, site)
│   │   └── mobile/          # Primary mobile shell UI (~50 components)
│   ├── services/            # Backend service layer (compiled into extension)
│   │   ├── agent/           # Agent bridge, command executor, webhook bridge, intent
│   │   ├── agentIdentity/   # Agent identity service
│   │   ├── ai/              # AI pipeline, Ask routing, Copilot workers, embeddings, experts, gateway
│   │   ├── builder/         # Achievement, activity graph, context bundles, daily brief, opportunity,
│   │   │                     plan compiler, policy engine, professional signals, project intelligence,
│   │   │                     self-verification gate, skill pack, twin delta, weekly review
│   │   ├── connectedIdentity/ # Connected identity engine
│   │   ├── dailyOperatingLoop/ # Daily operating loop
│   │   ├── dataset/         # Operator traces
│   │   ├── decisions/       # Decision ledger
│   │   ├── digitalTwin/     # Digital Twin service
│   │   ├── evidence/        # Evidence ledger
│   │   ├── execution/       # Checkpoints, plan execution, plan store, plan verifier, receipts
│   │   ├── goals/           # Goal health
│   │   ├── intelligence/    # Behavioral intelligence, notification center, classifier
│   │   ├── interop/         # Agent bridge, audit, capability registry, context retrieval,
│   │   │                     convertToPlan, evidence search, events, gateway, idempotency,
│   │   │                     intent contract, MCP (protocol, transports, tasks), policy engine,
│   │   │                     proposals, sessions, trust boundaries, validation
│   │   ├── memory/          # Candidate memory, memory context engine, memory firewall
│   │   ├── messaging/       # Messages, request extension scheduler
│   │   ├── operatingTimeline/
│   │   ├── operationalIntelligence/
│   │   ├── operatorTwin/    # Build operator twin, read resume artifact
│   │   ├── opportunity/     # Opportunity lifecycle
│   │   ├── plan/            # Ask plan conversion, buyer persona, cross-platform planner,
│   │   │                     governance, human trust layer, opportunity engine, persist plan,
│   │   │                     platform action cards, positioning, predictive engines, review queue,
│   │   │                     unified operational inbox, workflow prediction
│   │   ├── redTeam/         # Red team corpus
│   │   ├── scheduling/      # Scheduler
│   │   ├── storage/         # Storage (single-blob persistence + inline normalization; the old
│   │   │                     normalizers/ tree was deleted as dead code)
│   │   ├── tracing/         # Production trace
│   │   ├── usage/           # Local product usage
│   │   └── whyNow/          # Why now service
│   ├── shared/              # Account, config, help, identity, integrations, navigation,
│   │   │                     operatorTwin, platform, storage, ui, workspace
│   ├── styles/              # Global CSS tokens
│   └── types/               # agentInterop, aiIntegrationSuite, aiTraceGraph, brandOpsAiCore,
│                             # builder, domain, executionState, integrationHub
├── scripts/                 # Dev, bridge proxy, MCP gateway, release packaging, model training
├── public/                  # Icons, branding, OAuth pages, manifest templates
├── android/                 # Capacitor Android shell
├── dist/                    # Production build output
└── tests/                   # 204 test files, 1122 tests (updated 2026-08-31)
```

---

## 3. Core Domain Model

### Workspace

- Single persisted state blob: `BrandOpsData` (domain.ts)
- Normalized by `withDefaults` (storage.ts:2748-2819)
- Self-healing on corruption via seed path
- Concurrent writers rebase via `withWorkspaceMutation` (CAS-style)

### Digital Twin

- Persistent professional-intelligence core (digitalTwin.ts)
- Fields: identity, resume evidence, expertise, capabilities, goals, audience, positioning,
  voice, projects, achievements, preferences, memory, relationships
- Trust tiers: USER_VERIFIED (6) > BRANDOPS_VERIFIED (5) > AGENT_REPORTED (3) >
  EXTERNAL_SOURCE (2) > MODEL_INFERRED (1) > UNKNOWN (0)
- Model inference NEVER silently becomes verified identity

### Conversation / Message / Checkpoint

- Every meaningful action point becomes a checkpoint (checkpointStore.ts)
- Linked to source conversation, parent checkpoint, Twin, artifact, plan, tool, approval,
  outcome, receipt
- Immutable ledger — no generator writes facts no backend produced

### Artifact

- Universal layer: `BrandOpsAIArtifact` (brandOpsAiCore.ts:34-48)
- Durable, source-linked, searchable, reusable as context or plan input
- Trace bundles (aiTraceGraph.ts:40-118)
- Integration-hub artifacts (domain.ts:477)

### Plan / PlanStep / PlanDraft / PlanReceipt

- Schema-validated drafts (askPlanConversion.ts:473-507)
- Preview-before-persist; save only after confirmation
- Link back to Ask source
- Receipt on approval/execution (domain.ts:957-967)

### Approval / ReviewQueue / OperatorTrace

- Approval requires matching pending trace + checkpoint (checkpointActions.ts:45-106)
- Receipts answer what/when/why/through-what/under-whose-approval/result/next

### Execution / ExecutionEvent / Outcome

- Executed ≠ successful (planExecutor.ts:76-212)
- Outcomes carry real downstream evidence
- Feed learning only when validated (planVerifier.ts:80-100)

### ExternalAgentSession / Audit / Idempotency

- Bearer tokens hashed with SHA-256; only hash stored (sessions.ts:27-40)
- Per-session capability grants
- Bounded audit (audit.ts)
- Idempotent replays (gateway.ts:495-505, in-memory LRU 250 entries)

### Goal

- Target: explicit goal entity with active/paused/completed/abandoned states
- `goals: string[]` on TwinIdentity (domain.ts:676)
- Surfaceed + editable in Twin dashboard (MobileSettingsAISurface.tsx)

---

## 4. Canonical Orchestration Pipeline

```
intent (parseCommandRoute / commandIntent)
→ context assembly (build*Readout functions)
→ memory retrieval (retrieveAgentContext, 8 bundles, relevance+freshness+provenance)
→ Twin/profession context (formatBrandProfileForAi, sourceFacts)
→ expert/tool selection (buildExpertOperatorIntegrationReadout)
→ generation (synthesizeContent for AI Core artifacts / runChatCompletion for hosted Ask)
→ schema validation/guardrails (validatePlanDraft, validationWarnings,
  approvalRequiredFor, detectPromptInjection, sanitizeAgentText)
→ artifact/plan (BrandOpsAIArtifact with auditReceipt / PlanDraft via convertAskResponseToPlan)
→ approval (requiredApprovals, approveCheckpointForTrace/Plan, rejectCheckpointForTrace/Plan)
→ execution (executePlan — recording only, no external side effects)
→ verification (verifyPlanOutcomes — operator-confirmed only)
→ receipt (PlanReceipt, resolveExecutionReceipt)
→ controlled learning (verifyPlanOutcomes mirrors to Twin memory,
  promoteAgentEventToTwin, recordVerifiedPlanOnTwin)
```

The pipeline is NOT duplicated — AI Core and hosted Ask are intentionally separate paths
that share the same persistence and validation layer.

---

## 5. Context Engine (RAG)

Purpose-scoped bundles (contextRetrieval.ts; verified against `src/types/agentInterop.ts:56-75`):

- PUBLIC_IDENTITY
- BUILDER_CONTEXT
- PROJECT_CONTEXT
- WRITING_VOICE
- CURRENT_GOALS
- POSITIONING_CONTEXT
- CONTENT_CONTEXT
- PROFESSION_CONTEXT

(8 bundles. Earlier revisions listed PROFESSIONAL_IDENTITY / RESEARCH_CONTEXT / EXECUTION_CONTEXT — these are **not** members of `ContextBundleId` and were phantom; removed.)

Each bundle: relevance + recency scoring, per-item cap 700 chars, per-bundle cap 12 items.
Provenance summary exposed (verified vs agent-reported vs inferred).

**GAP:** Embedding index is write-only. `contentEmbeddingsPipeline.ts:33` writes index
but it is never read for retrieval. Real RAG retrieval is not implemented.

---

## 6. Command Layer

**STATUS: ABSENT — Two ad-hoc systems exist.**

System A: MCP capability tools (capabilityRegistry.ts → gateway.ts)
System B: Text router (commandIntent.ts → agentWorkspaceEngine.ts)

Both must converge on the same contract. No CommandBus. No typed command envelope
(actor/workspace/objective/target/parameters/permission/policy-decision/idempotency/checkpoint/result).

---

## 7. Agent Interoperability

### Gateway (gateway.ts)

Auth → **Policy Engine** → Injection screen → Idempotency → **Memory Firewall** (writes only) →
**Intent Contract** → Dispatch → Audit + Checkpoint + Trace.
A handler that throws is converted to a fail-closed `handler_error` refusal rather than escaping
the pipeline — no call can leave the ledger by crashing.

### Sessions (sessions.ts)

Create, resolve (SHA-256 hash lookup), revoke, touch, list, diagnose.
Per-session capability grants; read-only sessions limited to READ capabilities.

### Validation (validation.ts)

Sanitize (strip control chars, collapse whitespace, length cap 4000).
Detect prompt injection (7 patterns: instruction-override, persona-injection,
markup-injection, prompt-exfiltration, override attempt).
Assert required/optional/enum/id/idempotencyKey.

### Trust Tiers

USER_VERIFIED (6) > BRANDOPS_VERIFIED (5) > AGENT_REPORTED (3) >
EXTERNAL_SOURCE (2) > MODEL_INFERRED (1) > UNKNOWN (0)

### Risk Tiers

READ → GENERATE → PREPARE → EXTERNAL*ACTION → SENSITIVE_ACTION.
`SENSITIVE_ACTION` (irreversible/high-impact, e.g. `builder.sessions.revoke`) requires explicit
confirmation in the intent contract \_and* BrandOps-side approval.

### MCP

Full documentation set: `BRANDOPS_MCP_GATEWAY_DIRECTIVE.md` (mandate + gap ledger),
`BRANDOPS_MCP_ARCHITECTURE.md` (design), `BRANDOPS_MCP_CAPABILITY_MATRIX.md` (per-capability
contract), `BRANDOPS_MCP_SECURITY.md` (threat model), `BRANDOPS_MCP_CERTIFICATION.md` (evidence and
verdict).

40 capabilities (corrected 2026-08-31 — `capabilityRegistry.ts` defined 29 `toolName` entries, not
10; Phase 1 of the MCP directive added 5: `evidence.read`, `authority.read`,
`next-best-actions.read`, `receipts.read`, `outcome.report`; Phase 2 added 3: `execution.request`,
`execution.read`, `execution.cancel`), 1:1 tool mapping, input **and output** schemas defined —
a declared `outputSchema` is enforced at emission, not assumed (`mcp/outputSchema.ts`).
Two transports, one dispatcher (`dispatchMcpMethod`): stdio (mcp/server.ts,
scripts/mcp-gateway.mjs) and Streamable HTTP (mcp/httpTransport.ts, scripts/mcp-http-gateway.mjs,
`npm run mcp:http`). Protocol versions `2026-07-28` / `2025-06-18` / `2025-03-26`, negotiated per
request (mcp/protocol.ts); the legacy `initialize` handshake is still answered for pre-stateless
clients. Capabilities: `tools` plus the `io.modelcontextprotocol/tasks` extension. No resources or
prompts.

**HTTP binding + authorization:** POST-only MCP endpoint (GET/DELETE → 405), `Origin` validated
(403), localhost-only bind by default, mirrored `Mcp-Method`/`Mcp-Name`/`MCP-Protocol-Version`
headers validated against the body (`-32020` on mismatch — the body is the source of truth), RFC
9728 Protected Resource Metadata served unauthenticated, RFC 6750 challenges, and 403
`insufficient_scope` naming the exact capability (BrandOps capability ids are the scopes).
**Not deployment-ready:** no TLS, no OAuth authorization server integrated, sessions still loaded
from an exported workspace JSON.
Token↔workspace sync: manual export only ("Export workspace for MCP" in Connected Agents panel).

**Durable execution (mcp/tasks.ts):** `tasks/get` / `tasks/cancel` / `tasks/update`. A protocol
task is a _projection_ of the execution-request proposal plus the Plan and its checkpoints —
BrandOps runs no second task engine. `NEEDS_APPROVAL` maps to the protocol's `input_required`, so
the human approval boundary is a visible task state; `tasks/update` with `accept` is refused
(`approval_not_delegable`) because an agent may decline its own request but never approve it.
Tasks are session-scoped: a handle from another session resolves to `task_not_owned`.

**User Intent Contract (intentContract.ts):** every non-READ capability carries one. Required on
`EXTERNAL_ACTION` / `SENSITIVE_ACTION`; synthesized and audited on other mutations. Expired
contracts are rejected; `SENSITIVE_ACTION` additionally requires `intent.confirm: true` before the
approval gate. Read-only session grants derive from the registry's `readOnly` flag, not id naming.

**Canonical directive:** `BRANDOPS_MCP_GATEWAY_DIRECTIVE.md` governs all MCP / AI-interoperability
work (positioning, target tool surface, non-negotiable invariants, gap ledger G1–G20, phasing).

### Agent Identity Registry

**STATUS: ENFORCING (2026-08-31).** The registry in `agentIdentity/agentIdentity.ts` (trust levels
READ_ONLY, CONTEXT_CONSUMER, PROPOSER, ACTION_REQUESTER) existed but **nothing consulted it** — it
was reachable only from its own test. Enforcement now lives in `interop/policyEngine.ts`, which
derives trust from the capability registry (not a hardcoded name list) and applies the operator's
`session.trustCeiling`. `agentIdentity.deriveTrustLevel` remains for display only; it predates the
newer capabilities and misclassifies them.

### Agent Handoffs

**STATUS: ABSENT** — No handoff mechanism with sourceAgent/targetAgent/objective/
checkpoint/requiredCapabilities/minimumContext/sourceArtifacts/allowedActions/
prohibitedActions/expectedOutput/budget/expiration/returnDestination.

---

## 8. Policy Engine (`src/services/interop/policyEngine.ts`)

**STATUS: PRESENT (built 2026-08-31, MCP directive Phase 4).** Note the path: the module
originally documented here as `policyEngine.ts` with 11 named decisions was a phantom that never
existed, and the earlier `controlPlane/` tree was deleted as dead code. What exists now is a
narrower, real engine scoped to agent interop — it decides whether an inbound agent request may
proceed, and nothing else.

`evaluateAgentPolicy` runs a fixed check order and returns one auditable verdict:

```
1. session_live      → revoked or expired          → session_inactive
2. workspace_scope   → session bound elsewhere      → workspace_mismatch
3. capability_grant  → not in the grant list        → capability_not_granted
4. trust_ceiling     → operator cap below the tier  → trust_level_insufficient
5. rate_limit        → per-(session,tier) budget    → rate_limited
6. tier_obligations  → approval / confirmation required?
```

Every check can only _deny_, so the engine can never widen authority. The verdict — including
which checks ran and the remaining budget — is written into the audit entry beside the outcome
(`formatPolicyDecision`).

**Trust ceiling.** `ExternalAgentSession.trustCeiling` is an operator cap that can only lower
effective trust, letting a session be neutered without editing its grant list. Trust implied by
grants is derived _from the registry_ (`derivedTrustFromGrants`), not from a hardcoded capability
list — the older name-matching derivation in `agentIdentity.ts` misclassifies every capability
added after it was written and is now display-only.

**Rate limits.** Per session, per tier, per minute: READ 120, GENERATE 60, PREPARE 30,
EXTERNAL_ACTION 10, SENSITIVE_ACTION 3. In-memory and per-process — a local abuse brake, not a
distributed quota.

The remaining policy concerns are still enforced where they were:

- Approval fail-closed is enforced by the **gateway** (`src/services/interop/gateway.ts`) via the capability registry's `access: 'approval'` — an `action.request` capability can only produce an approval-gated request, never a side effect.
- Autonomy tier → approval mapping lives in `src/types/executionState.ts` (`permissionTierRequiresApproval` — EXTERNAL_ACTION / SENSITIVE_ACTION require approval) and `classifyOperationalTaskTier`.
- Twin-change proposals require approval by construction (`createAgentProposal` is GENERATE tier, checkpoint NEEDS_APPROVAL).
- Achievement verification is user-only (`doesUserConfirm` paths in plan verifier / promotion).

**GAP (honest):** There is **no single centralized policy module**. The same policy concerns are distributed across `gateway.ts`, `capabilityRegistry.ts`, and `executionState.ts`. A Unified Policy Engine is a future consolidation (see `BRANDOPS_NEXT_CAPABILITIES.md`), not current reality.

---

## 9. Execution State Machine

Defined in executionState.ts:9-21:

```
IDLE → UNDERSTANDING → PLANNING → WORKING → NEEDS_APPROVAL →
EXECUTING → VERIFYING → COMPLETED
```

Plus: BLOCKED / FAILED / REJECTED / CANCELLED

Transition table: executionState.ts:31-44
Validator: executionState.ts:46-49

UI state driven by real checkpoints/events (findCheckpointsByConversation,
findActiveCheckpoints), never fabricated timers.

Autonomy tiers: READ | GENERATE | PREPARE | EXTERNAL_ACTION | SENSITIVE_ACTION
(executionState.ts:161-166)

---

## 10. PLAN Workspace

Flat feed design. Primary groups:

- NEEDS YOU
- ACTIVE WORK
- UPCOMING / SUGGESTED
- OPPORTUNITIES
- ARTIFACTS
- AGENTS / INTEGRATIONS
- RECEIPTS
- COMPLETED

Collapsed work item communicates: WHAT, WHY, STATE, WHO/WHAT IS WORKING, NEXT ACTION.
Expansion reveals: objective, tasks, agents, tools, evidence, checkpoints, dependencies,
approvals, outputs, receipts, outcomes.

---

## 11. Security Posture

### Controls Present

- No OAuth backend (local-first extension; by design)
- Agent bearer tokens hashed with SHA-256; only hash stored
- Input validation: sanitizeAgentText, detectPromptInjection (7 patterns),
  assertRequiredString, assertEnum, assertId, assertIdempotencyKey
- Trust boundaries: AGENT_REPORTED never silently promoted to verified
- **Memory Firewall enforced on the agent write path** (`interop/memoryScreen.ts`, added
  2026-08-31). Previously `memory/memoryFirewall.ts` was correct but **uncalled outside
  `services/memory/`** — the invariant was documented, not enforced. Agent-authored text is now
  sanitized, classified as `EXTERNAL_SOURCE` by provenance, and instruction-risk scored before
  dispatch; a firewall `reject` refuses the call and the verdict is written into the audit entry.
- **Declared response contracts** (`mcp/outputSchema.ts`): every MCP tool publishes an
  `outputSchema` and results are validated against it before `structuredContent` is emitted
- Permission enforcement on server: gateway fails closed on `access: 'approval'` capabilities
- Plan steps block external actions
- Idempotency: in-memory LRU (250 entries)
- AI bridge API keys stored outside workspace JSON (device-local)
- Integration honesty: badges show "Saved locally", "Background sync: off"

### Security Gaps (P0)

1. **Prompt injection in ASK text** — `detectPromptInjection` applied to agent tool args
   ONLY. User ask text enters AI pipeline unscanned. The user is the authorized operator,
   but malicious instructiveness in user-provided context (e.g., pasted webpage content,
   uploaded document text) can still influence the model.
2. ~~**Cross-workspace isolation** — untested.~~ **CLOSED (2026-08-31).** A session issued for
   workspace A, presented against workspace B, is refused with `workspace_mismatch` before
   dispatch — `mcpAdversarial.test.ts`, "a session issued for one workspace is refused against
   another".
3. ~~**Approval bypass** — untested.~~ **CLOSED (2026-08-31).** The gateway's P1-4 invariant
   (`approval`-access capabilities may only ever produce a pending, `NEEDS_APPROVAL`-checkpointed
   request) is covered in `agentInterop.test.ts` and driven end to end in
   `canonicalLoopEndToEnd.test.ts`. Re-execution is covered in `mcpAdversarial.test.ts`: approving
   the same proposal twice is a no-op, and a cancelled task cannot be resurrected by a late
   approval.

### Security Gaps (P1)

1. No structured logging — secret leakage risk is latent
2. No CSP audit for Chrome extension context
3. Content script (linkedinOverlay.ts) runs on LinkedIn pages — review needed
4. debugMode setting exists — should be gated in production builds
5. No rate limiting on AI calls (depends on provider)

---

## 12. Persistence

- `withDefaults` normalizes ~30 slices (storage.ts:2766-2842)
- Self-heals corrupt data (seed path)
- Reads are read-only — write-on-read removed
- Concurrent writers rebase via `withWorkspaceMutation` (CAS-style)
- Background SW + trace writer migrated to CAS

### Storage Normalizer Duplication — RESOLVED (2026-08-31)

The `./normalizers/` module tree no longer exists — it was **deleted** (along with the `controlPlane/` tree) in the dead-code-removal workstream. Normalization now lives inline in `storage.ts` / `withDefaults`; there is no shadowed-import duplication. Any lingering "38 shadow functions" claim elsewhere is obsolete.

---

## 13. UI/UX Principles (Calm Intelligence)

- Matte black / green palette
- Minimal, flat, responsive
- Negative space, progressive disclosure
- Compact expandable rows, minimal cards, minimal nesting
- Quiet idle state, visible work state, clear approval state
- Verified success (stable green), truthful failure (red)
- Terminal-inspired progressive states ONLY when corresponding to real backend operations
- Accessibility: keyboard navigation, focus states, labels, icons + text,
  reduced motion, responsive/touch behavior

---

## 14. AI Stack

### Model Gateway

- Single `runChatCompletion` / `runEmbeddings`
- 55s timeout, structured error codes
- No retry/backoff, no streaming
- `responseFormatJsonObject` unused in prod

### MoE Experts

- Deterministic capability cards, typed IO, confidence scoring (expertRegistry.ts:994-1064)
- 8 experts, tested

### Copilot Workers

- Registry + active worker selection exists (copilotWorkers.ts)
- Real per-worker execution beyond routing is limited

### AI Pipeline

- `aiPipelineRunner.ts` — declarative pipeline execution
- `aiPipelineCatalog.ts` — pipeline definitions
- `brandOpsAiCore.ts` — AI Core artifact synthesis

### Provider Portability

- BrandOps must not depend on any single provider
- Capability/provider registry needed
- Selection considers: task fit, capability, context window, structured output reliability,
  tool support, availability, latency, cost, risk

---

## 15. Architecture Debt

| Debt                                                                                                  | Impact                                    | Priority                                       |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| 8 routing systems                                                                                     | Confusing, duplicate logic                | P2                                             |
| ~~38 shadow normalizer functions~~                                                                    | ~~Maintenance burden~~                    | **RESOLVED** (normalizers deleted)             |
| Dual approval source of truth                                                                         | Potential inconsistency                   | P2                                             |
| Two ad-hoc command systems                                                                            | No unified command semantics              | P1                                             |
| No centralized Policy Engine (policy is distributed across gateway/capabilityRegistry/executionState) | No single authorization surface           | P1                                             |
| Embedding index write-only                                                                            | RAG not functional                        | P1                                             |
| ~~No integrated end-to-end loop test~~                                                                | ~~Can't verify full flow~~                | **RESOLVED** (`canonicalLoopEndToEnd.test.ts`) |
| Peripheral AI/prediction layers produce readouts from placeholder data                                | Misleading                                | P2                                             |
| Authority Intelligence (public-web authority/mentions layer)                                          | ABSENT — never implemented; Requirement H | P2                                             |
