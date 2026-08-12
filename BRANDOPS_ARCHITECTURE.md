# BrandOps Architecture — Target System Contract

**Status:** Living document. The target contract for BrandOps as a Personal Brand Operating System and portable professional-intelligence layer. Where reality conflicts with this contract, the contract is adapted to reality (see BRANDOPS_FORENSIC_AUDIT.md §5).

## 1. Canonical product loop

```
CREATE/IMPROVE TWIN → ASK → ARTIFACT → CONVERT TO PLAN → REVIEW/APPROVE → EXECUTE → VERIFY → LEARN
```

Every architectural, UX, AI, data, and integration decision must reinforce this loop. A capability is real only when it traces UI → service → persistence → event → UI. Nothing is auto-promoted from agent-reported to verified.

## 2. Execution grammar (single canonical state machine)

`src/types/executionState.ts:9-21`: `IDLE → UNDERSTANDING → PLANNING → WORKING → NEEDS_APPROVAL → EXECUTING → VERIFYING → COMPLETED`, plus `BLOCKED / FAILED / REJECTED / CANCELLED`. Transition table `:31-44`; validator `:46-49`. UI state is driven by real checkpoints/events (`findCheckpointsByConversation`, `findActiveCheckpoints`), never fabricated timers.

Autonomy tiers: `READ | GENERATE | PREPARE | EXTERNAL_ACTION | SENSITIVE_ACTION` (`executionState.ts:161-166`). External actions require explicit approval; sensitive/destructive actions require stronger confirmation and server-side validation.

## 3. Core domain contracts (canonical types in `src/types/`)

- **Workspace** `BrandOpsData` (`domain.ts`) — single persisted state blob normalized by `withDefaults` (`src/services/storage/storage.ts:2748-2819`), self-healing on corruption.
- **DigitalTwin** — persistent professional-intelligence core: identity, resume evidence, expertise, capabilities, goals, audience, positioning, voice, projects, achievements, preferences, memory, relationships. Trust tiers: `USER_VERIFIED / BRANDOPS_VERIFIED / AGENT_REPORTED / EXTERNAL_SOURCE / MODEL_INFERRED / UNKNOWN` (`types/agentInterop.ts:18-29`). Model inference must never silently become verified identity.
- **Conversation / Message / Checkpoint** — every meaningful action point becomes a checkpoint linked to source conversation, parent checkpoint, Twin, artifact, plan, tool, approval, outcome, receipt. Immutable ledger (`checkpointStore.ts`).
- **Artifact** — Universal Artifact layer (`BrandOpsAIArtifact`, trace bundles, integration-hub artifacts): durable, source-linked, searchable, reusable as context or plan input.
- **Plan / PlanStep / PlanDraft / PlanReceipt** — schema-validated drafts; preview-before-persist; save only after confirmation; link back to Ask source; receipt on approval/execution.
- **Approval / ReviewQueue / OperatorTrace** — approval requires matching pending trace + checkpoint; receipts answer what/when/why/through-what/under-whose-approval/result/next.
- **Execution / ExecutionEvent / Outcome** — executed ≠ successful; outcomes carry real downstream evidence and feed learning only when validated.
- **ExternalAgentSession / Audit / Idempotency** — bearer tokens hashed, never stored; per-session capability grants; bounded audit; idempotent replays.
- **Goal** — target: explicit goal entity with active/paused/completed/abandoned states; artifacts/plans/executions answer "why are we doing this?".

## 4. Canonical orchestration pipeline

Target: `intent → context assembly → memory retrieval → profession/Twin context → expert/tool selection → structured generation → validation/guardrails → artifact → plan → approval → execution → verification → receipt → controlled learning`.

Current reality (audit §2): Ask is orchestrated in `mobileApp.tsx`; declarative pipelines in `aiPipelineRunner.ts`; artifact synthesis in `brandOpsAiCore.ts`. **Reduction target:** one canonical pipeline; duplicate prompt/routing systems consolidated; deterministic logic where sufficient; model reasoning reserved for problems that require it.

## 5. Context engine

Answers "what does BrandOps know that is relevant to this exact request?" Purpose-scoped bundles (`PUBLIC_IDENTITY, BUILDER_CONTEXT, PROJECT_CONTEXT, WRITING_VOICE, CURRENT_GOALS, POSITIONING_CONTEXT, CONTENT_CONTEXT`), relevance + recency scoring, per-item cap 700 chars, per-bundle cap 12 items (`contextRetrieval.ts`). Trust boundaries: each bundle exposes a provenance summary (verified vs agent-reported vs inferred). Target: enforce context budgets across all prompt assembly; wire the embedding index for real retrieval instead of write-only.

## 6. Command layer (target; currently two ad-hoc systems)

One typed, permission-aware command envelope (`actor / workspace / target / parameters / permission / validation / idempotency / checkpoint / result`) shared by Ask, PLAN, buttons, future Cmd/Ctrl+K, and MCP/API clients. Current systems: (a) MCP capability tools (`capabilityRegistry.ts` → `gateway.ts`), (b) text router (`commandIntent.ts` → `agentWorkspaceEngine.ts`). Both must converge on the same contract without breaking persisted commands.

## 7. Agent interoperability

First-party gateway over duplicated per-vendor logic. External agents are authorized clients, never authorities over the Twin. Reads may run automatically; writes produce reviewable events/proposals/plans; `action.request` never executes. Security contract: hash tokens, injection screen, idempotency, audit, revocation, rate limits. MCP stdio transport exists (`mcp/server.ts`, `scripts/mcp-gateway.mjs`); workspace↔token sync flow is the outstanding gap (P1-3).

## 8. Platform / capability registry

Every integration/client exposes real auth status, supported read/write operations, scopes, approval requirements, health, and unsupported actions. Unavailable functionality is rendered honestly (Needs connection / Needs permission / Not supported). Current integrations are registry/honest-stub only — no vendor sync ships (P0-adjacent honesty preserved).

## 9. UI / UX principles (Calm Intelligence)

Quiet when idle; subtle activity during genuine work; amber when human intervention required; stable green on verified completion; red for failures — always with labels/icons, never color alone. Terminal-inspired calm, not a fake terminal. Progressive disclosure over cards; negative space; consistent tokens across light/dark and desktop/mobile. Ask stays the simplest surface.

## 10. Trust & safety

Untrusted at boundaries: model output, retrieved webpages/documents, uploaded resumes, external-agent instructions. Defenses: prompt-injection detection, confused-deputy avoidance (per-session capability grants), no cross-tenant leakage (local-first), secrets handling, approval gating, auditability, idempotency, bounded retries only for safe transient operations.

## 11. Evaluation & observability

AI changes measured by behavioral harness, not vibes: grounding, profession interpretation, contradictory memory, Ask usefulness, artifact quality, convert-to-plan correctness, schema compliance, tool selection, permission enforcement, unsupported-action handling, prompt injection, expert routing, recovery, hallucination resistance, latency/cost. Trajectory-level, not exact-string. Telemetry is privacy-conscious (local-first today) and funnel-based: Workspace → Twin → first useful Ask → Artifact/Convert → Plan saved → approval → verified execution → outcome.
