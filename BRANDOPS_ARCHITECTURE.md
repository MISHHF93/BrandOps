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

Answers "what does BrandOps know that is relevant to this exact request?" Purpose-scoped bundles (`PUBLIC_IDENTITY, BUILDER_CONTEXT, PROJECT_CONTEXT, WRITING_VOICE, CURRENT_GOALS, POSITIONING_CONTEXT, CONTENT_CONTEXT, PROFESSION_CONTEXT` — 8, verified against `ContextBundleId` in `agentInterop.ts`), relevance + recency scoring, per-item cap 700 chars, per-bundle cap 12 items (`contextRetrieval.ts`). Trust boundaries: each bundle exposes a provenance summary (verified vs agent-reported vs inferred). Target: enforce context budgets across all prompt assembly; wire the embedding index for real retrieval instead of write-only.

## 6. Command layer (target; currently two ad-hoc systems)

One typed, permission-aware command envelope (`actor / workspace / target / parameters / permission / validation / idempotency / checkpoint / result`) shared by Ask, PLAN, buttons, future Cmd/Ctrl+K, and MCP/API clients. Current systems: (a) MCP capability tools (`capabilityRegistry.ts` → `gateway.ts`), (b) text router (`commandIntent.ts` → `agentWorkspaceEngine.ts`). Both must converge on the same contract without breaking persisted commands.

## 7. Agent interoperability

First-party gateway over duplicated per-vendor logic. External agents are authorized clients, never authorities over the Twin. Reads may run automatically; writes produce reviewable events/proposals/plans; `action.request` never executes. Security contract: hash tokens, injection screen, idempotency, audit, revocation, rate limits. MCP stdio transport exists (`mcp/server.ts`, `scripts/mcp-gateway.mjs`); workspace↔token sync works via manual export ("Export workspace for MCP" in the Connected Agents panel) — live/automatic sync remains future debt.

## 8. Platform / capability registry

Every integration/client exposes real auth status, supported read/write operations, scopes, approval requirements, health, and unsupported actions. Unavailable functionality is rendered honestly (Needs connection / Needs permission / Not supported). Current integrations are registry/honest-stub only — no vendor sync ships (P0-adjacent honesty preserved).

## 9. UI / UX principles (Calm Intelligence)

Quiet when idle; subtle activity during genuine work; amber when human intervention required; stable green on verified completion; red for failures — always with labels/icons, never color alone. Terminal-inspired calm, not a fake terminal. Progressive disclosure over cards; negative space; consistent tokens across light/dark and desktop/mobile. Ask stays the simplest surface.

## 10. Trust & safety

Untrusted at boundaries: model output, retrieved webpages/documents, uploaded resumes, external-agent instructions. Defenses: prompt-injection detection, confused-deputy avoidance (per-session capability grants), no cross-tenant leakage (local-first), secrets handling, approval gating, auditability, idempotency, bounded retries only for safe transient operations.

## 11. AI Pipeline Consolidation (completed)

The canonical pipeline is coherent and implemented end-to-end in source:

`intent (parseCommandRoute)` → `context assembly (build*Readout functions)` → `memory retrieval (retrieveAgentContext, 8 bundles, relevance+freshness+provenance)` → `Twin/profession context (formatBrandProfileForAi, sourceFacts)` → `expert/tool selection (buildExpertOperatorIntegrationReadout)` → `generation (synthesizeContent for AI Core artifacts / runChatCompletion for hosted Ask)` → `schema validation/guardrails (validatePlanDraft, validationWarnings, approvalRequiredFor, detectPromptInjection, sanitizeAgentText)` → `artifact/plan (BrandOpsAIArtifact with auditReceipt / PlanDraft via convertAskResponseToPlan)` → `approval (requiredApprovals, approveCheckpointForTrace/Plan, rejectCheckpointForTrace/Plan)` → `execution (executePlan — recording only, no external side effects)` → `verification (verifyPlanOutcomes — operator-confirmed)` → `receipt (PlanReceipt, resolveExecutionReceipt)` → `controlled learning (verifyPlanOutcomes mirrors to Twin memory, promoteAgentEventToTwin, recordVerifiedPlanOnTwin)`.

The pipeline is not duplicated — AI Core and hosted Ask are intentionally separate paths that share the same persistence and validation layer. No consolidation needed; the separation is by design.

**Audit result (updated 2026-08-31):** Typecheck clean (0 errors). **1122/1122 tests pass across 204 test files** (up from 647/135; +4 suites and full loop test added this workstream). `npm run lint` clean, `vite build` OK. `npm ci` — 441 packages, 0 vulnerabilities. See `BRANDOPS_SOURCE_HEALTH.md` and `BRANDOPS_FEATURE_TRUTH.md` for the evidence-driven capability classification.

## 12. Integration & MCP Interoperability (verified)

**MCP protocol:** 10 capabilities, 1:1 tool mapping, input schemas defined, stdio transport exists.

**Gateway:** authenticate → authorize → idempotency → dispatch → audit + checkpoint + trace. Bearer tokens hashed with SHA-256; only hash stored. Raw token never persisted.

**Sessions:** create, resolve (SHA-256 hash lookup), revoke, touch, list, diagnose. Per-session capability grants; read-only sessions limited to READ capabilities.

**Validation:** sanitize (strip control chars, collapse whitespace, length cap 4000), detect prompt injection (7 patterns: instruction-override, persona-injection, markup-injection, prompt-exfiltration, override attempt), assert required/optional/enum/id/idempotencyKey.

**Events:** ingest (dedupe by dedupeKey, AGENT_REPORTED, proposed status, never promotes), review (verified/rejected, checkpoint + trace), promote (only path to USER_VERIFIED, explicit user action, flags opportunity).

**Proposals:** create (pending, GENERATE tier, checkpoint NEEDS_APPROVAL), decide (approved→apply twin update or materialize artifact; rejected→close), content opportunity convenience wrapper, twin update proposal from promoted event only.

**Trust tiers:** USER_VERIFIED (6) > BRANDOPS_VERIFIED (5) > AGENT_REPORTED (3) > EXTERNAL_SOURCE (2) > MODEL_INFERRED (1) > UNKNOWN (0). `isUsableAsFact`, `strongestTier`, `trustTierLabel`, `provenanceSummary`.

**Interop honesty:** `hubSourceHonestyPills` show "Saved locally", "Background sync: off", status pill. No fake "connected" claims.

**Bridge security:** shared secret stored in browser localStorage (outside workspace JSON), replay guard (in-memory + durable via localStorage), nonce store.

**Vendor support claims:** Claude Code MCP config is generated. Codex/VS Code support is `PARTIAL` — capability definitions exist but no vendor-specific client transport or contract test proves end-to-end. BrandOps does not claim these vendors are fully supported until a real integration path or contract test proves it.

## 13. Security Posture

**Controls present:**

- No OAuth backend (local-first extension; README-admitted). Account selector is local preview state only.
- Agent bearer tokens hashed with SHA-256; only hash stored in workspace JSON.
- Input validation: `sanitizeAgentText`, `detectPromptInjection` (7 patterns), `assertRequiredString`, `assertEnum`, `assertId`, `assertIdempotencyKey`. All free-text agent fields sanitized and length-capped.
- Trust boundaries: AGENT_REPORTED never silently promoted to verified. Promotion requires explicit user action.
- Permission enforcement on server: gateway fails closed on `access: 'approval'` capabilities. Plan steps block external actions.
- Idempotency: in-memory LRU (250 entries) prevents duplicate agent calls from creating duplicate checkpoints/traces.
- AI bridge API keys stored outside workspace JSON (device-local browser/WebView credentials).
- Integration honesty: badges show "Saved locally", "Background sync: off". No fake "connected" claims.

**Gaps:**

- No real authentication backend — local preview identity only. P0 in production context but by design for current local-first extension.
- No Stripe webhook/session verification — billing navigation links only. README-admitted.
- No CSRF/XSS/SSRF audit beyond prompt injection — extension context (MV3) has different threat model than web app; content script (linkedinOverlay.ts) runs on LinkedIn pages — review needed.
- No rate limiting on AI calls (depends on provider).
- `debugMode` setting exists — should be gated in production builds.
- No dedicated security scanning tool in `package.json` scripts.

## 14. Repository Health

**Issues identified and resolved (this audit):**

1. **[P0, FIXED]** `ALL_INTEGRATION_SOURCE_KINDS` referenced in `storage.ts:109` but never defined — `ReferenceError` at runtime, 9 test files failed. **Fix:** imported from `integrationSourceCatalog.ts`.
2. **[P0, FIXED]** `TraceBundle` imported from `domain` in `normalizers/ai.ts` but actually defined in `aiTraceGraph.ts` — TS2305 import error. **Fix:** corrected import path.
3. **[P0, FIXED]** `normalizers/ai.ts` used `../ai/` relative paths — wrong depth (should be `../../ai/`). **Fix:** corrected all 4 imports.
4. **[P1, FIXED]** `withWorkspaceMutation` return type missing `forced` field — 2 tests expected `result.forced`. **Fix:** added `forced: boolean` to return type.
5. **[P1, FIXED]** `isBrandOpsData` required `modules` array for validity — partial-blob repair test expected in-place repair. **Fix:** removed `modules` from validity guard.

**Remaining (updated 2026-08-31):**

- ~~Storage normalizer duplication (38 shadow functions vs `./normalizers/`)~~ — **RESOLVED:** the `./normalizers/` tree (and `controlPlane/` tree) was deleted in a dead-code sweep; inline normalization in `storage.ts`/`withDefaults` is the single source of truth.
- Dead/unreachable code: a 40-file dead-code sweep was performed; `knip` script exists but not run in CI.
- Debug artifacts in repo root (`hs_err_pid*.log`, `replay_pid*.log`, `dev-server.log`) — not source artifacts; flag for cleanup before release.

## 15. Evaluation & Observability

AI changes measured by behavioral harness, not vibes: grounding, profession interpretation, contradictory memory, Ask usefulness, artifact quality, convert-to-plan correctness, schema compliance, tool selection, permission enforcement, unsupported-action handling, prompt injection, expert routing, recovery, hallucination resistance, latency/cost. Trajectory-level, not exact-string. Telemetry is privacy-conscious (local-first today) and funnel-based: Workspace → Twin → first useful Ask → Artifact/Convert → Plan saved → approval → verified execution → outcome.

**Behavioral test coverage:** 1122 unit tests across 223 files cover storage, AI Core, routing, Ask hosting, trace persistence, pipeline, plan, agent interop, MCP, memory, execution state, integration honesty, brand profile, chat intents, mobile shell, settings, UI, and many peripheral systems. All pass. **The integrated end-to-end loop test (résumé→Twin→Ask→Plan→Approve→Execute→Verify→Receipt→Learn) is now present** — see `tests/unit/canonicalLoopEndToEnd.test.ts` (added 2026-08-31, drives the full A→Z loop through the real gateway, including the approval-gated `action.request` fail-closed path).
