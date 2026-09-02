# BRANDOPS MCP GATEWAY DIRECTIVE

**Status:** Canonical directive — governs all MCP / AI-interoperability work.
**Last updated:** 2026-08-31
**Method:** Directive recorded verbatim, then reconciled against forensic source inspection of `src/services/interop/`.

> **Why this file exists:** the repository has no single "master prompt" file. Canonical
> standing instructions live as `BRANDOPS_*.md` documents at the repo root. This is the
> canonical home for the MCP / AI-interoperability directive; `BRANDOPS_CANONICAL_ARCHITECTURE.md` §7
> points here.

---

## 1. Positioning

BrandOps is not "an app with AI agents." It is:

> **Professional Intelligence Graph + AI Workforce Control Plane + MCP Gateway**

```
              BRANDOPS
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
 INTELLIGENCE  CONTROL    GATEWAY
    GRAPH       PLANE       MCP

Identity       Plans       GPT
Evidence       Agents      Claude
Twin           Policy      Gemini
Goals          Tools       Codex
Projects       Approval    Cursor
Authority      Execution   VS Code
Outcomes       Verify      OpenCode
Memory         Receipts    Others
```

The model layer is interchangeable compute. BrandOps holds the durable asset: governed
longitudinal professional state — Digital Twin, Evidence Ledger, Context/RAG engine, Goals,
Projects, Artifacts, Authority Graph, Plans, Approvals, Receipts, Outcomes, Learning.

Topology: BrandOps is an **MCP Server** to external AI hosts, and where useful an **MCP Client**
to external systems (Gmail, Slack, GitHub, CRM, Notion, browsers, enterprise) through the
existing Tool/Connector/Policy architecture.

---

## 2. Canonical directive (verbatim)

> **BRANDOPS MCP GATEWAY / AI-TO-BRANDOPS INTEROPERABILITY DIRECTIVE:** Treat BrandOps as a first-class remote MCP server in addition to being its own application and agent runtime. The objective is for external AI systems and agent hosts—including ChatGPT where MCP support is available, Claude-compatible clients, Gemini-compatible agent environments, Cursor, VS Code, OpenCode, Hermes, Codex, custom enterprise agents and future MCP clients—to be able to securely consume BrandOps professional intelligence and request governed work without duplicating BrandOps' Digital Twin, RAG, Evidence, Plan, Policy, Execution or Outcome infrastructure. Implement the MCP layer as a thin protocol adapter over canonical BrandOps services; never place core business logic inside MCP handlers. Use the current MCP specification and stable SDK applicable at implementation time, currently centered on the 2026-07-28 stateless protocol model, modern authorization model and extensions architecture; research the official specification before implementation rather than relying on stale assumptions. BrandOps must function both as an **MCP Server**, exposing governed professional intelligence and work capabilities to external agents, and where useful as an **MCP Client**, consuming external MCP capabilities through the existing Tool/Connector/Policy architecture. Build a small canonical initial tool surface rather than exposing every internal function: governed context retrieval, evidence search, goals, projects, artifacts, public-authority intelligence, Next-Best-Actions, Artifact creation, achievement proposals, Twin update proposals, Opportunity creation, Convert-to-Plan, Plan retrieval, execution requests, execution status/cancellation, action requests, Outcome reporting and Receipt retrieval. Exact tool names and schemas must derive from the canonical repository architecture. Every read request must flow through identity → workspace → authorization → Context Policy → scope → provenance/redaction. Every mutation/action request must flow through external-client identity → delegated user/workspace identity → User Intent Contract → Capability → Policy Engine → Approval where required → Command → durable Execution → Verification → Receipt → Outcome. External AIs may propose information but must never directly promote claims into verified Digital Twin state. External tool output is untrusted data and must pass the Memory Firewall. Define explicit MCP client/agent identity, trust level, delegated capabilities, workspace scope, expiration, rate limits and revocation. Do not treat possession of an MCP connection as blanket authorization. Implement least-privilege per-tool and per-resource capability exposure. Capability discovery should reflect the actual user's Profession Pack, workspace permissions, connected systems, feature availability and authorization, rather than advertising unusable tools. Separate read, generate, propose, prepare, external-action and sensitive-action risk tiers. Consequential tools must never bypass BrandOps approvals. Make external-agent requests idempotent where applicable and protect against replay and duplicate irreversible execution. Implement structured output schemas and use full supported JSON Schema capabilities where beneficial. For long-running BrandOps work, integrate the current MCP Tasks extension where supported so a tool invocation may yield a durable BrandOps execution task that external clients can inspect, update or cancel without requiring a fragile long-lived session; map the protocol task onto BrandOps' canonical Plan/Execution/Checkpoint state rather than implementing a second task engine. Where MCP Apps are supported and materially useful, consider exposing safe compact BrandOps interactive surfaces such as Plan Preview, Approval, Needs You, Execution Status, Artifact Preview and Receipt; all UI-originated actions must travel through the same BrandOps Command/Policy/Audit path and the application must remain fully functional without MCP Apps. Expose read-oriented Resources only when their URI semantics, caching and access model are stable and useful; do not leak entire workspaces through broad resources. Prompts may be exposed sparingly but are not BrandOps' moat. BrandOps' moat is governed longitudinal state: Digital Twin, proprietary RAG/Context Engine, Evidence Ledger, Professional Capability Graph, Goals, Projects, Artifacts, Authority Graph, Plans, Outcomes, learning and permissions. Implement an `MCP Capability Matrix` documenting each exposed capability's request schema, response schema, authorization, trust tier, approval behavior, context scope, idempotency, verification method, audit behavior, rate limit and implementation/deployment status. Implement `External AI → BrandOps → External Tool/Agent → BrandOps Verification → External AI` workflows and prove that BrandOps remains authoritative even when another model initiates and another agent executes the work. Add security/adversarial tests for malicious MCP clients, spoofed identity, cross-workspace access, request replay, overbroad capability discovery, permission escalation, prompt injection through MCP arguments/results, tool-output memory poisoning, approval bypass, malformed schema, task-handle guessing, cancellation races, duplicate tasks and compromised external agents. Add interoperability tests against more than one compatible client/runtime where environment access permits; where live clients are unavailable, use protocol-level contract tests and label live interoperability UNVERIFIED rather than pretending success. Create `BRANDOPS_MCP_ARCHITECTURE.md`, `BRANDOPS_MCP_CAPABILITY_MATRIX.md`, `BRANDOPS_MCP_SECURITY.md` and `BRANDOPS_MCP_CERTIFICATION.md`. The success criterion is not that an MCP client can call a hello-world tool. Success means an external AI can discover an appropriately limited BrandOps capability surface, retrieve purpose-scoped evidence-backed context, produce or store an Artifact, convert intelligence into a governed Plan, request durable execution, encounter the correct approval boundary, inspect work status, receive a verified result and Receipt, report a subsequent Outcome, and then reconnect later or through a different compatible AI while BrandOps preserves the canonical professional/workspace state.

**Spec-claim note.** The 2026-07-28 stateless spec model, the Tasks extension, MCP Apps and the
ChatGPT MCP-apps availability referenced above are carried from the source proposal and are
**not independently verified in this repository**. The directive already requires researching the
official specification at implementation time; treat those specifics as inputs to that research,
not as settled facts.

---

## 3. As-built baseline (source-verified 2026-08-31, Phases 1–4 applied)

The MCP layer is **not greenfield.** What exists:

| Component                                                  | Source                                                                                                                         | State                                                                                                                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capability registry — single authorization source of truth | `src/services/interop/capabilityRegistry.ts`                                                                                   | **40 capabilities**, 1:1 `toolName` mapping                                                                                                                                                              |
| Risk tiers                                                 | `capabilityRegistry.ts` (`tier`)                                                                                               | `READ` / `GENERATE` / `PREPARE` / `EXTERNAL_ACTION` / `SENSITIVE_ACTION`                                                                                                                                 |
| Approval gating                                            | `capabilityRequiresApproval()` + `gateway.ts`                                                                                  | `access: 'approval'` fails closed; handler may only emit a `NEEDS_APPROVAL` proposal                                                                                                                     |
| Sensitive gating                                           | `capabilityIsSensitive()` + `intentContract.ts`                                                                                | `SENSITIVE_ACTION` additionally requires `intent.confirm: true` _before_ the approval gate                                                                                                               |
| User Intent Contract                                       | `src/services/interop/intentContract.ts`                                                                                       | required on `EXTERNAL_ACTION` / `SENSITIVE_ACTION`; synthesized and audited on every other mutation                                                                                                      |
| Gateway pipeline                                           | `src/services/interop/gateway.ts`                                                                                              | auth → **policy engine** → injection screen → idempotency → intent contract → dispatch → audit + checkpoint + trace                                                                                      |
| Policy Engine                                              | `src/services/interop/policyEngine.ts`                                                                                         | one verdict from a fixed check order (session live → workspace scope → capability grant → trust ceiling → rate limit → tier obligations); every check can only deny                                      |
| Sessions                                                   | `src/services/interop/sessions.ts`                                                                                             | SHA-256 token hash, per-session capability grants, optional `expiresAt`, immediate revoke, read-only sessions limited to READ                                                                            |
| Prompt-injection screening                                 | `src/services/interop/validation.ts`                                                                                           | sanitize + 7 detection patterns, 4000-char cap                                                                                                                                                           |
| Idempotency                                                | `src/services/interop/idempotency.ts`                                                                                          | keyed on (session, capability, idempotencyKey)                                                                                                                                                           |
| Trust tiers                                                | `src/types/agentInterop.ts`                                                                                                    | USER_VERIFIED(6) > BRANDOPS_VERIFIED(5) > AGENT_REPORTED(3) > EXTERNAL_SOURCE(2) > MODEL_INFERRED(1) > UNKNOWN(0)                                                                                        |
| MCP transports                                             | `mcp/server.ts` + `scripts/mcp-gateway.mjs` (stdio); `mcp/httpTransport.ts` + `scripts/mcp-http-gateway.mjs` (Streamable HTTP) | Both bindings route through one `dispatchMcpMethod`, so a capability cannot behave differently on one transport than the other                                                                           |
| Tasks extension                                            | `src/services/interop/mcp/tasks.ts`                                                                                            | `io.modelcontextprotocol/tasks` advertised on `initialize`; protocol task is a **projection** of Plan/Execution/Checkpoint state — no second task engine                                                 |
| Protocol versions                                          | `mcp/protocol.ts`                                                                                                              | `2026-07-28` (stateless, per-request `_meta`), `2025-06-18`, `2025-03-26`. Negotiated per request; legacy `initialize` still answered                                                                    |
| Authorization                                              | `mcp/httpTransport.ts`                                                                                                         | RFC 9728 Protected Resource Metadata, RFC 6750 `WWW-Authenticate` challenges, 403 `insufficient_scope` naming the exact capability, Origin validation, localhost-only binding by default                 |
| Structured output                                          | `mcp/outputSchema.ts`                                                                                                          | Every tool declares an `outputSchema`; results are validated against it before `structuredContent` is emitted, and withheld with the reason stated in-band if they do not conform                        |
| Workspace identity                                         | `services/workspaceIdentity.ts`                                                                                                | Resolved in one place, never invented. It is an authorization input, and services used to mint it independently and disagree                                                                             |
| Memory Firewall                                            | `interop/memoryScreen.ts` → `memory/memoryFirewall.ts`                                                                         | Agent-authored text on the write path is sanitized, classified by provenance (`external-agent-message` → `EXTERNAL_SOURCE`) and scored for instruction risk; the verdict is written into the audit entry |
| Client config                                              | `src/services/interop/mcp/claudeConfig.ts`                                                                                     | stdio snippet + bearer token + **manually exported** workspace JSON                                                                                                                                      |

**Consequence:** the directive is mostly a _completion and hardening_ mandate over an existing
gateway, not a new build. The governance spine (registry → tier → approval → idempotency →
audit) already matches the directive's model.

---

## 4. Gap ledger — directive requirement vs. as-built

| #   | Directive requirement                                                                          | As-built                                                                                                                                                                                                                                                                                                                                                                                       | Gap                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1  | Remote MCP server consumable by hosted clients (ChatGPT, hosted Claude)                        | Streamable HTTP binding + resource-server surface, verified live                                                                                                                                                                                                                                                                                                                               | **PARTIAL** — reachable over HTTP with per-request bearer auth, but **no TLS, no OAuth authorization server integrated, and sessions still come from an exported workspace JSON**. A hosted client cannot yet connect to a real deployment |
| G2  | Current spec / stateless model / extensions                                                    | `2026-07-28` supported and negotiated; per-request `_meta` validated; `-32020`/`-32021`/`-32022` implemented; `resultType` + `serverInfo` on every result; Tasks extension                                                                                                                                                                                                                     | **CLOSED** — migrated against the published spec, not assumptions                                                                                                                                                                          |
| G3  | Tasks extension → durable handle over Plan/Execution/Checkpoint                                | `mcp/tasks.ts` projects the task from proposal + plan + checkpoints; `tasks/get` / `tasks/cancel` / `tasks/update` served; `CreateTaskResult` on task-augmented calls                                                                                                                                                                                                                          | **CLOSED** — spec verified against the published Tasks extension before implementing                                                                                                                                                       |
| G4  | `execution request` / `execution status` / `cancel execution` tools                            | `execution.request` (approval-gated) / `execution.read` / `execution.cancel`                                                                                                                                                                                                                                                                                                                   | **CLOSED**                                                                                                                                                                                                                                 |
| G5  | Evidence search tool                                                                           | `evidence.read` → `brandops_search_evidence` over `interop/evidenceSearch.ts`                                                                                                                                                                                                                                                                                                                  | **CLOSED**                                                                                                                                                                                                                                 |
| G6  | Public-authority intelligence + authority gaps                                                 | `authority.read` over `builder/authorityGraph.ts`                                                                                                                                                                                                                                                                                                                                              | **CLOSED** — scoped to owned evidence; measures substantiation, not public reputation, and says so in every readout                                                                                                                        |
| G7  | Next-Best-Actions tool                                                                         | `next-best-actions.read` over `predictiveOperationsDashboard.ts`                                                                                                                                                                                                                                                                                                                               | **CLOSED**                                                                                                                                                                                                                                 |
| G8  | Outcome reporting + Receipt retrieval by id                                                    | `receipts.read` + `outcome.report` (AGENT_REPORTED, never auto-promoted)                                                                                                                                                                                                                                                                                                                       | **CLOSED**                                                                                                                                                                                                                                 |
| G9  | Policy Engine as an explicit stage                                                             | `interop/policyEngine.ts` — one auditable verdict per call, wired into the gateway ahead of dispatch, verdict written into the audit entry                                                                                                                                                                                                                                                     | **CLOSED**                                                                                                                                                                                                                                 |
| G10 | User Intent Contract on every mutation/action                                                  | `intentContract.ts`; required on EXTERNAL_ACTION/SENSITIVE_ACTION, synthesized + audited elsewhere, carried onto the approval surface                                                                                                                                                                                                                                                          | **CLOSED**                                                                                                                                                                                                                                 |
| G11 | External-agent identity registry: trust level, delegation, expiration, rate limits, revocation | operator `trustCeiling` (can only restrict, survives reload), registry-derived trust, per-(session,tier) rate limits, enforced expiry, immediate revocation                                                                                                                                                                                                                                    | **CLOSED except delegation** — no on-behalf-of chain between agents                                                                                                                                                                        |
| G12 | Capability discovery scoped by Profession Pack / connected systems / feature flags             | `tools/list` returns only capabilities the session was granted; the Profession Pack orders the surface                                                                                                                                                                                                                                                                                         | **CLOSED** — the pack deliberately orders rather than hides: dropping a granted capability because a pack does not list it would silently break workflows the user authorized                                                              |
| G13 | Sensitive-action tier (deletion, money, high-impact)                                           | `SENSITIVE_ACTION` in use (`builder.sessions.revoke`); demands `intent.confirm: true` before the approval gate                                                                                                                                                                                                                                                                                 | **CLOSED**                                                                                                                                                                                                                                 |
| G14 | Resources (`brandops://…`) with stable URI/caching/access semantics                            | `mcp/resources.ts` — `resources/list`, `resources/templates/list`, `resources/read`; each URI maps to a capability and reads through the same gateway                                                                                                                                                                                                                                          | **CLOSED** — the semantics became stable on their own: every governed read already emitted `brandops://` provenance, and nothing resolved it                                                                                               |
| G15 | Prompts                                                                                        | none                                                                                                                                                                                                                                                                                                                                                                                           | **ABSENT** (low priority — explicitly not the moat)                                                                                                                                                                                        |
| G16 | MCP Apps surfaces (Plan Preview, Approval, Needs You, Execution Status, Receipt)               | none                                                                                                                                                                                                                                                                                                                                                                                           | **ABSENT** (optional; app must stay fully functional without them)                                                                                                                                                                         |
| G17 | BrandOps as MCP **Client**                                                                     | `mcp/client.ts` — operator-registered servers, per-server tool allowlist, injection screen and Memory Firewall on every result; verified live against our own gateway over stdio                                                                                                                                                                                                               | **CLOSED for the consuming path.** No connector is wired to a real third-party server yet, so live third-party consumption is **UNVERIFIED**                                                                                               |
| G18 | Structured output schemas                                                                      | `mcp/outputSchema.ts` — every tool declares a 2020-12 `outputSchema`; `tools/call` emits `structuredContent` **validated against it before emission**                                                                                                                                                                                                                                          | **CLOSED** — the spec makes a declared schema binding, so it is enforced at the point of emission rather than assumed                                                                                                                      |
| G19 | Adversarial/security test suite for the MCP surface                                            | `mcpAdversarial.test.ts` (29 tests): forged token, revoked/expired session, cross-workspace access, capability escalation, trust-ceiling bypass, per-tier rate exhaustion, prompt injection, replay, agent-reported-never-verified, discovery scope, **tool-output memory poisoning, malformed-argument fuzzing across every tool, cancellation races, duplicate tasks, task-handle guessing** | **CLOSED** — the fuzz pass found a real crash (see Phase 4b)                                                                                                                                                                               |
| G20 | The four MCP documents                                                                         | `BRANDOPS_MCP_CAPABILITY_MATRIX.md`, `BRANDOPS_MCP_ARCHITECTURE.md`, `BRANDOPS_MCP_SECURITY.md`, `BRANDOPS_MCP_CERTIFICATION.md`                                                                                                                                                                                                                                                               | **CLOSED** — each written after the thing it documents existed, so none describes a plan                                                                                                                                                   |
| G21 | Success criterion — the full external-AI round trip                                            | `tests/unit/mcpSuccessCriterion.test.ts` drives all ten clauses through `dispatchMcpMethod`; the durable half re-verified live across two separate gateway processes                                                                                                                                                                                                                           | **CLOSED in-process and over our own stdio transport.** Third-party client interoperability remains **UNVERIFIED** — see `BRANDOPS_MCP_CERTIFICATION.md`                                                                                   |

---

## 5. Canonical target tool surface

Small and stable. Names must derive from the capability registry — every new tool is a
registry entry first, a tool second.

**READ** — `brandops_get_relevant_context` ✅ · `brandops_search_evidence` ✅ · `brandops_get_current_goals` ✅ ·
`brandops_list_projects` ✅ · `brandops_get_project_intelligence` ✅ · `brandops_search_artifacts` ✅ ·
`brandops_get_artifact` ✅ · `brandops_get_authority` ✅ · `brandops_get_next_best_actions` ✅ ·
`brandops_get_voice` ✅ · `brandops_get_relationship_context` ✅

**CREATE / PROPOSE** — `brandops_create_artifact` ✅ · `brandops_record_achievement` ✅ ·
`brandops_propose_twin_update` ✅ · `brandops_create_content_opportunity` ✅

**WORK** — `brandops_convert_to_plan` ✅ · `brandops_get_plan_status` ✅ ·
`brandops_request_plan_execution` ✅ · `brandops_get_execution` ✅ · `brandops_cancel_execution` ✅

**ACTION** — `brandops_request_action` ✅ (approval-gated, never executes directly; intent contract required)

**OUTCOME** — `brandops_report_outcome` ✅ · `brandops_get_receipt` ✅

✅ shipped — the canonical surface named by the directive is complete.

### Name reconciliation

The source essay sketches tool names illustratively; the directive itself settles the question —
_"Exact tool names and schemas must derive from the canonical repository architecture."_ So where the
two differ, the registry wins. The mapping, so nobody reads a difference as a gap:

| Essay                                                                       | Shipped                                                        | Why                                                                                                                     |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `brandops_get_context`                                                      | `brandops_get_relevant_context`                                | The retrieval is relevance-scored and bundle-scoped; the name says so                                                   |
| `brandops_get_goals`                                                        | `brandops_get_current_goals`                                   | Reads active goals, not goal history                                                                                    |
| `brandops_get_projects` / `brandops_get_project`                            | `brandops_list_projects` / `brandops_get_project_intelligence` | The single-project read returns computed intelligence, not a record                                                     |
| `brandops_propose_achievement`                                              | `brandops_record_achievement`                                  | It records an `AGENT_REPORTED` signal; "propose" would imply a review queue entry, which is what `artifact.create` does |
| `brandops_create_opportunity`                                               | `brandops_create_content_opportunity`                          | Scoped to content/positioning opportunities, which is what the engine produces                                          |
| `brandops_get_plan`                                                         | `brandops_get_plan_status`                                     | Returns status and steps, not the full plan object                                                                      |
| `brandops_get_authority_gaps`                                               | folded into `brandops_get_authority`                           | Gaps come from the same computation; two tools would be two round trips over one readout                                |
| `brandops_execute_plan`                                                     | `brandops_request_plan_execution`                              | It cannot execute. The name has to say that                                                                             |
| `brandops_get_twin_context`, `brandops_retrieve`, `brandops_search_context` | `brandops_get_relevant_context`                                | One governed retrieval path, not three names for it                                                                     |
| `brandops_report_work`                                                      | `brandops_record_achievement` + `brandops_report_outcome`      | Work and its outcome are separate trust claims and are recorded separately                                              |

Everything else in the essay's list ships under the name the essay used.

---

## 6. Non-negotiable invariants

1. **MCP handlers hold no business logic.** The MCP layer is a protocol adapter over canonical services.
2. **No tool exists outside the capability registry.** Registry entry → tier → access → tool.
3. **Approval-access capabilities can only ever produce an approval-gated request.** Fail closed (`gateway.ts` P1-4 invariant).
4. **External AI may propose, never promote.** Nothing an external agent asserts becomes verified Twin state without evidence validation and user verification. Agent claims are `AGENT_REPORTED` at most.
5. **External tool output is untrusted data** and passes the Memory Firewall before it can influence memory or the Twin.
6. **A connection is not an authorization.** Every call re-resolves identity → workspace → capability grant → tier → policy,
   and every consequential call must additionally declare _what it is acting for_ (User Intent Contract).
7. **Irreversible work is idempotent and replay-protected.**
8. **The product must remain fully functional with the entire MCP surface disabled.**

---

## 7. Sequencing

**Phase 1 — Complete the canonical surface (no protocol change). ✅ DONE (2026-08-31).**
G5, G6, G7, G8 (evidence search, authority, next-best-actions, receipt-by-id, outcome reporting),
plus G13 `SENSITIVE_ACTION` tier and G10 User Intent Contract on mutations. Registry + handler work
over existing services; no transport change. Shipped as 5 new capabilities (29 → 34), two new
services (`interop/evidenceSearch.ts`, `builder/authorityGraph.ts`), one new enforcement module
(`interop/intentContract.ts`), and `tests/unit/mcpPhase1Capabilities.test.ts`.
Baseline after: 1062 tests / 156 files, typecheck and lint clean.

**Phase 2 — Durable work over MCP. ✅ DONE (2026-08-31).**
G3 + G4. The Tasks extension was verified against the published spec first (`tasks/get`,
`tasks/update`, `tasks/cancel`; no `tasks/list`; opt-in via
`params._meta['io.modelcontextprotocol/clientCapabilities'].extensions`; `CreateTaskResult` with
`resultType: 'task'`). The protocol task is a **projection**, never a second engine:

```
ExecutionState                                        → task status
IDLE/UNDERSTANDING/PLANNING/WORKING/EXECUTING/VERIFYING → working
NEEDS_APPROVAL                                         → input_required
BLOCKED                                                → input_required (recovery)
COMPLETED                                              → completed
FAILED                                                 → failed
REJECTED / CANCELLED                                   → cancelled
```

`NEEDS_APPROVAL → input_required` makes BrandOps' human approval boundary a first-class protocol
state. An agent can see it and decline it; it can never accept it — `tasks/update` with
`action: 'accept'` is refused with `approval_not_delegable`. Approving inside BrandOps runs the plan
through the canonical executor, so the boundary opens onto real work rather than silence.
Baseline after: 1062 tests / 156 files, typecheck, lint and build clean.

**Phase 3 — Spec migration and remote reachability. ✅ G2 DONE / ⚠️ G1 PARTIAL (2026-08-31).**

_Verified against the published spec first._ 2026-07-28 removes the `initialize` handshake and
`Mcp-Session-Id`: every request carries its own `io.modelcontextprotocol/protocolVersion` and
`clientCapabilities` in `_meta`, and `Mcp-Method` / `Mcp-Name` / `MCP-Protocol-Version` mirror body
fields into headers so intermediaries can route without parsing bodies. The body stays the source
of truth — a header that disagrees is rejected with `-32020`, which is what stops a load balancer
and the server from acting on different values. Roots, Sampling, Logging and HTTP+SSE are
deprecated; the GET stream and DELETE teardown are gone.

_What shipped:_ `mcp/protocol.ts` (versions, `_meta` validation, MCP error codes, `resultType` +
`serverInfo` envelopes), `mcp/httpTransport.ts` (Streamable HTTP as a pure request→response
function), `scripts/mcp-http-gateway.mjs` (`npm run mcp:http`, binds 127.0.0.1), and one shared
`dispatchMcpMethod` both transports route through.

_Authorization:_ the server behaves as an OAuth 2.1 **resource server** — RFC 9728 Protected
Resource Metadata at `/.well-known/oauth-protected-resource` (unauthenticated, because discovery
cannot require the credential it describes), RFC 6750 challenges, and 403 `insufficient_scope`
naming the exact capability, since BrandOps capability ids _are_ the scopes. Advertised
`scopes_supported` is the minimal read set; everything else is granted by step-up.

_What G1 still lacks, plainly:_ no TLS, no authorization server integrated
(`authorization_servers` is an honest empty list — only BrandOps-issued session tokens are
accepted), and sessions still come from a manually exported workspace JSON. The transport is
remote-_capable_; a hosted client such as ChatGPT still cannot connect to a real deployment.
Baseline after: 1062 tests / 156 files, typecheck, lint and build clean.

**Phase 4 — Governance hardening. ✅ G9 / G11 / G12 DONE · ⚠️ G18, G19 PARTIAL (2026-08-31).**

_G9._ `interop/policyEngine.ts` is now the single authorization stage. Six checks in a fixed
order, one verdict, and the verdict (checks run + remaining budget) goes into the audit entry.
Every check can only deny, so introducing it could not widen any existing authority.

_G11._ The agent identity registry existed but **nothing consulted it** — it was reachable only
from its own test. Enforcement now runs on a registry-derived trust level plus an operator
`trustCeiling` that can only restrict, so a session can be neutered without editing its grants.
Per-(session,tier) rate limits budget consequential work far more tightly than reading
(SENSITIVE_ACTION 3/min vs READ 120/min). Delegation chains remain unimplemented.

_G12._ `tools/list` is scoped to the session's grants — verified live: a session holding the three
execution capabilities is shown three tools, not 40. The Profession Pack **orders** the surface
rather than filtering it; hiding a granted capability because a pack does not list it would
silently break workflows the user authorized.

Baseline after: 1062 tests / 156 files, typecheck, lint and build clean.

**Phase 4b — Structured output and the rest of the adversarial suite. ✅ G18 / G19 DONE (2026-08-31).**

_G18._ Verified against the published spec first: `Tool.outputSchema` is optional, but once
declared, _"Servers **MUST** provide structured results that conform to this schema"_ — so a
schema is a promise, not documentation. `mcp/outputSchema.ts` declares one per tool and
`dispatchMcpMethod` validates the result **before** emitting `structuredContent`. On a mismatch
the structured field is withheld and the reason is stated in-band; the client degrades to the text
block, which is complete, instead of validating a payload that quietly broke its contract.

Two things are declared exactly because they are exactly true: `capabilityId` is a `const`, so a
client can tell from the schema which capability answered; and `if ok === false then errorCode is
required`, because the gateway has no path that refuses without naming itself. The `data` payload
is declared only as deeply as a handler actually constructs it — pinning item shapes we merely
forward would turn every downstream refactor into a silent spec violation.

_G19._ The remaining four cases landed, and the fuzz pass earned its keep. Feeding
`evidence: 'not-an-array'` to `brandops_record_achievement` reached `.map` on a string and threw
**straight out of `executeAgentToolCall`** — no envelope, no audit entry, a call with no record
that it happened. Fixed at the source, and the class is closed too: a handler that throws is now
converted into a fail-closed refusal with the exception text in the audit summary and a generic
message to the caller.

_Invariant 5, finally enforced._ `memory/memoryFirewall.ts` had modeled this correctly all along —
its `CandidateSource` union has carried `'external-agent-message'` and `'mcp-response'` from the
start — and **nothing outside `services/memory/` had ever called it.** Same pattern as the agent
identity registry in Phase 4: a correct module enforcing nothing. `interop/memoryScreen.ts` now
screens agent-authored text on the write path. Scope stated plainly: the directive's clause is
about output from external tools BrandOps _calls_ (G17, absent), so what is screened here is the
server-side equivalent — agent-supplied text heading for workspace state. It gates on the
firewall's `reject`, not on `requiresVerification`, because agent content is `AGENT_REPORTED` by
definition and BrandOps already answers that with the approval gate; a second refusal there would
block every legitimate write while protecting against nothing.

Baseline after: 1089 tests / 157 files, typecheck, lint and build clean. Verified live over stdio:
`outputSchema` present on every advertised tool, `structuredContent` emitted and byte-identical to
the text block.

**Phase 4c — Certification. ✅ G20 / G21 DONE (2026-08-31).**

The success criterion is a _behavior_, so it was certified by driving it rather than by asserting
it. `tests/unit/mcpSuccessCriterion.test.ts` runs all ten clauses: every agent-side step through
`dispatchMcpMethod`, every user-side step through surfaces an agent cannot reach — the boundary is
only real if the test has to cross it the way a person would. The durable half was then re-verified
live across **two separate gateway processes** sharing nothing but the workspace file: the task was
minted in one, and the second refused `tasks/update accept` with `approval_not_delegable` having
never seen the request being made. That is what makes the handle durable rather than a session.

_Certification found six defects, two of them serious._ A malformed argument
(`evidence: 'not-an-array'`) threw **out of the gateway** — no envelope, no audit entry, a call with
no record that it happened. And reporting an outcome on a workspace that had not yet named itself
minted the id `'default'`, locking every session issued against `'local-workspace'` out with
`workspace_mismatch`: **one ordinary write could lock every connected agent out of the workspace it
was already working in.** Both are fixed with regression tests, and workspace identity is now
resolved in one place (`workspaceIdentity.ts`) instead of being invented by whichever service
materialized `builderActivity` first.

Two further defects were caught _by the mechanism under test_: the server validated its own result,
found it did not match the schema it had published, withheld `structuredContent` and said why. A
declared schema is a promise, and the promise was checked rather than assumed.

The sixth produced the cleanest fix. `brandops_get_execution` was returning a `CreateTaskResult` to
task-aware clients, so its declared `outputSchema` was never satisfiable for them. Rather than
special-case tool names in the protocol adapter, `createsTask` became a registry fact: a capability
that _mints_ durable work returns a task result; reading or cancelling one creates nothing. The
adapter stayed dumb, which is the architecture's one rule.

Baseline after: 1122 tests / 219 files, typecheck, lint and build clean.

**Phase 4d — Defect sweep. ✅ DONE (2026-08-31).**

Certification found a _class_, not a list, so the sweep went looking for more of the same shape:
**a module that is correct in isolation and wrong because something else exists.** Five more:

- A **second workspace-id default** (`'default-workspace'` in `builderToolHandlers`), reachable by
  `brandops_ingest_activity` — the same lockout as the outcome-report bug, through a door an agent
  opens directly. Both doors now have regression tests.
- A **second `processThroughFirewall`** in `candidateMemory.ts`: same name, same signature as the
  real one, consulting no firewall configuration at all. Dead, but dead in the shape where an
  auto-import silently picks the version that enforces nothing.
- A **second trust derivation** in `agentIdentity.ts`, classifying by capability _name_ and
  therefore stale for everything added since — it displayed a session holding
  `builder.sessions.revoke` as READ_ONLY. It now delegates to the registry-driven computation the
  gateway enforces.
- `AgentIdentityRegistry.byTrustLevel` typed as a total `Record` but **built sparsely and cast**, so
  an access the type calls safe threw whenever a level happened to be empty.
- **`npx tsc --noEmit` checks zero files in this repository.** The root `tsconfig.json` is
  solution-style, so a bare invocation compiles nothing and always succeeds; `--listFiles` returns 0. The repo's own `npm run typecheck` (`tsc -b`) was correct all along. A genuinely broken
  reference ran green under the wrong command and was caught only by the test run.

Every fix is a _collapse_ — one resolver, one entry point, one derivation, one total map — because
the failure was never wrong logic. It was duplication that drifted.

A second pass scanned for the class deliberately — every exported function name defined in more than
one source file, and every module no source file imports — and found the last three:

- `types/builder.ts` held a second `trustTierLabel` / `strongestTier` / `isUsableAsFact`, including a
  **third, inlined copy of the trust rank table**. Dead, and removed. A types module should not ship
  behavior at all.
- `tracing/productionTrace.ts` held `buildCheckpoint`, `buildOperatorTrace` and `buildAuditEntry` —
  passthroughs shadowing by name the three builders that write the audit ledger, returning objects
  with no id, no timestamp and no clamping. Dead, and removed; the unwired tracing core is left alone.
- `P0-security.test.ts` closed its workspace-isolation test with `expect(wsB.id).not.toBe(wsA.id)`,
  comparing a field the test had just set to two different values. A tautology reading as a security
  check. It now asserts that the two workspaces share no references and that a write through one is
  not observable through the other.

The scan then stopped finding more. The remaining duplicate names are thin re-export aliases over a
single implementation, so they cannot drift.

Also recorded, not closed: **test files are not type-checked at all** (`tsconfig.app.json` includes
`src` only). `npm run typecheck:tests` now makes the number visible — **161 errors** — deliberately
outside the release gate, because wiring it in today would either block every commit or invite a
blanket suppression. It should only ever go down.

Baseline after: 1122 tests / 219 files, `npm run typecheck`, lint and build clean.

**Phase 4e — Portable identity reads. ✅ DONE (2026-08-31).**

Three capabilities the source essay names and the surface did not have. All `READ`, all
`readOnly`, all registry-first, all backed by data that already exists:

- **`voice.read`** → `brandops_get_voice`. Tone, positioning, audience, the user's own voice
  examples and approved claims, with provenance. The essay calls this the easiest immediate win and
  it is: without it every host keeps a private, drifting, unattributable copy of "how this person
  sounds". `trustTier: USER_VERIFIED` here is a fact about _provenance_ — these are the user's own
  words — and it is stamped by BrandOps, never asserted by the caller.
- **`relationship.read`** → `brandops_get_relationship_context`. Stage, last contact, recorded
  interactions, and what is outstanding. Deliberately the working state of a relationship and not a
  dossier: the contact's free-form notes field is **not** in the payload, and `limitations` says so
  rather than leaving the omission to be discovered.
- **`artifact.read`** → `brandops_get_artifact`. One artifact by id.

The artifact read produced the one real mistake of the phase, and it is worth recording. The first
implementation looked the id up by running it through `searchArtifacts` — a _relevance_ search — so
an exact id scored nothing against titles and the tool reported `artifact_not_found` for artifacts
that plainly existed. Fixed with `getArtifactById`, which walks the same three slices in the same
order and shares the projection, so an id search returns always resolves and the two can never
disagree about what an artifact is or how it is summarized.

Verified live over stdio: scoped discovery returns exactly the three granted tools, both new reads
emit conforming `structuredContent`, and the contact's private notes do not appear in the payload.

Baseline after: 40 capabilities · 1122 tests / 219 files · `npm run typecheck`, lint and build clean.

**Phase 4f — The gateway reads live state. ✅ DONE (2026-08-31).**

Pushing on G1 started with a plain question: what would "the gateway reads live workspace state"
actually require? The answer was that it did not read live state at all.

Both hosts read the workspace JSON **once at startup** into a module-level variable, mutated it, and
wrote the whole file back. So an agent asking for goals received a snapshot frozen at process start,
presented as current — and every write the gateway made destroyed anything the app had saved in the
meantime, silently.

Neither showed up in certification, and the reason matters: the live durable-execution run used two
gateway processes **sequentially**, the second reading the file after the first exited. That is
exactly the ordering in which a stale snapshot and a clobbering write both look correct.

`scripts/lib/workspaceStore.mjs` replaces the snapshot with the contract the app already used
(`storage.withWorkspaceMutation`): read fresh on every call, compare-and-swap on write, refuse rather
than overwrite bytes that changed underneath. There is no generic merge for two divergent
workspaces, and guessing at one is how the lost update happened. A read-only call writes nothing at
all, so it neither bumps the mtime nor manufactures conflicts for other readers.

Verified live against the real gateway process: a write made by another writer _after_ the gateway
started is visible to the very next call.

This does not close G1 — there is still no TLS and no authorization server. It removes the part of
G1 that was a correctness bug rather than a deployment gap: the file is now a live store, not an
exported snapshot the gateway reads once and then talks over.

Baseline after: 40 capabilities · 1122 tests / 219 files · `npm run typecheck`, lint and build clean.

**Phase 5a — Resources. ✅ G14 DONE (2026-08-31).**

The directive gated Resources on URI semantics being "stable and useful". They had quietly become
both: fourteen distinct `brandops://` shapes were already being emitted as provenance on every
governed read — `brandops://achievement/{id}` on evidence hits, `brandops://twin/{id}/voice` on the
voice profile, `brandops://workspace/contact/{id}` on relationship context — and **nothing could
resolve any of them.** Provenance you cannot follow is a citation to a book with no library.

Verified against the published spec first: `resources/list` / `resources/templates/list` /
`resources/read`; `contents: [{uri, mimeType, text}]`; `capabilities.resources` may be `{}` when
neither `listChanged` nor `subscribe` is supported; a missing resource **MUST** be `-32602` with the
uri in `data` and **MUST NOT** be an empty `contents` array, because empty cannot be told apart from
"exists but has no content".

Two directive rules shaped the surface. **"Do not leak entire workspaces through broad resources"** →
`resources/list` returns _singletons only_ (there is one voice profile); everything addressable by id
is a **template**, which describes the shape without enumerating the contents. **Least privilege** →
the template list is scoped to the session's grants, which the spec explicitly permits: the resource
set "MAY vary by the authorization presented on the request".

The load-bearing design decision: **a resource is an address, not a data path.** Each URI resolves to
a capability call and runs through the same `executeAgentToolCall` a tool call runs, so identity,
policy, rate limit and audit all apply because it is literally the same code. There is no second
authorization surface to keep in sync. URI patterns are anchored and reject `/`, so there is no path
to join and therefore no traversal to sanitize — the spec's requirement is met by construction.

_The live run earned its keep again._ Pipelined requests exposed a defect in the new workspace store:
the stdio loop dispatches each request without awaiting the previous one, so a client's two
back-to-back calls overlapped and the second failed the compare-and-swap **against its own
predecessor's write**. Mutations are now serialized within the process, leaving the CAS to mean what
it should — someone _outside_ this process changed the file. Unit tests had missed it because they
awaited each call; the fix has a test that fires three at once.

Baseline after: 40 capabilities · 5 resource templates · 1122 tests / 219 files · `npm run
typecheck`, lint and build clean.

**Phase 5b — Contract and provenance scans. DONE (2026-08-31).**

Two mechanical scans, each finding something the whole suite had been passing over.

_Provenance resolvability._ Driving the read surface and classifying every `brandops://` string it
emits found **39 distinct shapes, 3 of which resolved**. That is not a 36-item backlog: most point at
a _fragment_ — one line of positioning, one DNA entry — and making each addressable would be the
"leak the whole workspace through broad resources" the directive forbids, arrived at one template at
a time. What was actually wrong is that nothing said which references were addresses and which were
citations. Both kinds are now named, the reference-only authorities are a reviewed list, and a test
drives the surface and fails on any shape nobody has classified. The same scan found
`brandops://profession/profession/identity`, a doubled authority segment.

_Tool contract._ Comparing each published schema against what its handler actually reads found three
classes at once, and the first is serious: **`brandops_verify_achievement` and
`brandops_dismiss_achievement` were uncallable as documented.** Both declared `achievementId`
required; both read only `args.eventId`. A client passing exactly what the schema asked for got
`missing_event_id: eventId is required`. Every existing test passed, because every existing test
called them the way the _handler_ wanted rather than the way the schema said.

Then: three tools declaring `required: []` while demanding one of two ids — now stated as `anyOf`,
which is the constraint JSON Schema exists for. And six arguments read but never declared, including
a `reason` on achievement dismissal, so an agent could record why it dismissed something and had no
way to discover that. `verifyAchievement` had likewise always accepted a note while the schema
advertised a `verificationStatus` nothing read; the note is now wired and declared.

`tests/unit/mcpToolContract.test.ts` holds all three directions as invariants: what the schema
requires must be enforced, what it documents must be sufficient, and what a handler reads must be
documented.

Baseline after: 40 capabilities, 5 resource templates, 1631 tests / 219 files, typecheck, lint and
build clean.

**Phase 5c — Verifying the verifiers. DONE (2026-08-31).**

Three scans, aimed at the documents and tests that certify everything else.

_The capability matrix was accurate and unverified._ It is a directive deliverable and it had been
hand-edited seven times in a day, with nothing checking it against the registry. It now is: every
capability has a row and no row is an orphan; tool name, tier, approval mode and access must match
the registry; the Required-args column must match the input schema; and the header's own capability
count must match reality. It was correct when the test was written — the point is that it can no
longer quietly stop being.

_The output conformance sweep was checking refusals._ Measuring branch coverage found it reached a
**success** branch on 21 of 40 tools. The other 19 published output schemas had only ever been
validated against "not found" payloads — which is exactly how two wrong schemas shipped
(`generatedSteps` typed as a number, `ttlMs` not permitting null). A populated fixture
(`tests/helpers/populatedWorkspace.ts`) raises that to 30, and a floor keeps it there. Everything in
the fixture is shaped to survive `withDefaults`, which silently drops records it does not recognise —
a fixture the normalizer discards is worse than none, because the test still passes, against nothing.

_That sweep immediately earned itself._ With real data in the workspace,
`brandops_get_project_intelligence` threw: `computeProjectIntelligence` reads `project.tags.length`,
`Project` declares `tags` required, and nothing enforces it — `withDefaults` does not normalize
`builderActivity.projects` at all. Any record from a partial write, an older schema or an import
crashed the read. The same lying-type shape as the registry maps in Phase 4d, and now guarded.

Baseline after: 40 capabilities, 5 resource templates, 1631 tests / 219 files, typecheck, lint and
build clean.

**Phase 5d — BrandOps as an MCP client. G17 DONE (2026-08-31).**

The outbound half of the topology, and the first thing in the codebase that can satisfy the
directive's clause **"External tool output is untrusted data and must pass the Memory Firewall."**
That sentence is about output from tools BrandOps _calls_. BrandOps could not call any, so the
clause was unsatisfiable, and the server-side screen added in Phase 4b was documented as the
analogous case rather than the same one. This is the same one.

`mcp/client.ts` is built on three rules, and they are the whole design:

- **A connection is not a capability.** A server is reachable only if an operator registered it, and
  only the tools that registration allowlists can be called. `tools/list` is _intersected_ with the
  allowlist, never trusted as it stands: a compromised or updated remote can add
  `exfiltrate_everything` to its own advertisement at any moment, and the remote must not get to
  decide what is permitted just because it decides what exists.
- **Every result is untrusted.** Output passes the injection screen and then the Memory Firewall as
  `mcp-response`, classifying it `EXTERNAL_SOURCE` — a tier that can never be verified. Callers get
  the _sanitized_ text, not the bytes the remote sent.
- **Nothing here is authoritative.** The client writes no workspace state. A caller receives screened
  content with provenance and decides what to do with it under the ordinary approval rules.

_Verified live, and the result is the good kind of strange._ Driven against our own stdio gateway,
BrandOps read its own voice profile through the client path — and got it back classified
`EXTERNAL_SOURCE`, `verified: false`, provenance `mcp://brandops-loopback/brandops_get_voice`. The
client has no way to know it is talking to itself, which is the point: the trust boundary is
structural, not identity-based. A non-allowlisted tool was refused client-side without a request
being sent.

_What this does not claim._ No connector is wired to a real third-party server, so live third-party
consumption is **UNVERIFIED** in exactly the sense the directive requires the label to be used.

Baseline after: 40 capabilities, 5 resource templates, 1631 tests / 219 files, typecheck, lint and
build clean.

**Phase 6a — Capability families, and the defect they exposed. DONE (2026-08-31).**

The Universal Capability System spec proposes ~300 tool names across 50 sections. Adding them is
not the instruction the directive gives: _"Build a small canonical initial tool surface rather than
exposing every internal function… then add capabilities based on evidence of actual usage."_ The
spec's own §46 says the same about its meta-capability — _"do not build it as an unrestricted
god-tool."_ So what was adopted is the part that is architecture rather than inventory.

_The taxonomy is now real._ Every capability carries a `family` from the canonical twenty
(KNOW … AUTOMATE), so the surface is organized by **what kind of work** a capability performs rather
than which screen it came from. The empty families are deliberately kept: an AI asking what BrandOps
can do deserves the difference between "BrandOps does not do this" and "BrandOps has no capability in
this family yet", and a taxonomy that hides its empty branches cannot express that. Ten of the twenty
families are currently empty — RESEARCH, UNDERSTAND, REASON, COMPARE, SIMULATE, DELEGATE,
COMMUNICATE, MONITOR, LEARN, AUTOMATE — and that is a more useful statement of scope than any
roadmap.

_Adding the field found the worst defect of the programme._ Assigning families required touching
every definition, which surfaced a **second capability list** in
`builder/mcpBuilderCapabilities.ts` — 19 hand-maintained definitions alongside the registry. They had
drifted:

| capability                      | second list said  | the registry enforced |
| ------------------------------- | ----------------- | --------------------- |
| `builder.achievements.verify`   | `approval`        | **`auto`**            |
| `builder.twin-proposals.accept` | `approval`        | **`auto`**            |
| `builder.sessions.revoke`       | `EXTERNAL_ACTION` | `SENSITIVE_ACTION`    |

The first two are _promote_ operations. Verified live before changing anything: an agent granted
`builder.twin-proposals.accept` **accepted a Twin proposal outright** — `ok=true`,
`approvalRequired=false`, no person involved. It could accept the proposal it had just created. That
is the fourth invariant inverted, and `BRANDOPS_MCP_CERTIFICATION.md` had been certifying the
invariant as met.

Both are now approval-gated, the second list is derived from the registry rather than duplicating it,
the certification row is corrected rather than quietly updated, and the invariant is covered by a
_behavioural_ test against a workspace where the targets exist — because a registry reading is what
was wrong.

_The limitation is closed too._ Failing closed was safe but useless: an agent could not even ask.
Both capabilities now create a **`promotion` proposal** — a new proposal kind, distinct from
`external_action` because nothing leaves BrandOps and recording an internal promotion as an external
action would put a lie in the ledger. The agent gets a pending request; the achievement stays
`UNVERIFIED` and the Twin stays untouched; a person approving is what performs the promotion, through
`builder/promotions.ts` calling the canonical `achievementService` and `twinDeltaEngine`.

The effects live in the builder layer rather than inside `interop/proposals.ts` on purpose. A copy of
a governed write inside the proposal module would be a second implementation of the thing that just
went wrong. Tests assert all three states: the request promotes nothing, an approval promotes, and a
rejection promotes nothing.

Baseline after: 40 capabilities in 10 populated families, 1631 tests / 219 files, typecheck, lint and
build clean.

**Phase 5 — Remaining optional surfaces.**
G16 MCP Apps, G15 Prompts (last — explicitly not the moat).

---

## 8. Document deliverables

| Document                            | Status                                                                                                                                                                                                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BRANDOPS_MCP_CAPABILITY_MATRIX.md` | **WRITTEN (2026-08-31)** — all 40 capabilities, source-derived; cross-cutting authorization/audit/idempotency/firewall/response-contract behavior; response + verification by group; stated limits                                                                                           |
| `BRANDOPS_MCP_ARCHITECTURE.md`      | **WRITTEN (2026-08-31)** — layering, module map, the nine-stage request lifecycle, protocol surface, result contract, task projection, transports, invariants, and how to extend the surface. Written after the transports settled, so it documents what exists rather than what was planned |
| `BRANDOPS_MCP_SECURITY.md`          | **WRITTEN (2026-08-31)** — threat model, trust boundaries, controls organized by attack with the module that enforces each and the test that proves it, risk-tier obligations, eight named gaps, operator guidance                                                                           |
| `BRANDOPS_MCP_CERTIFICATION.md`     | **WRITTEN (2026-08-31)** — the success criterion driven end to end, the live two-process run, the six defects certification found, a claim-by-claim matrix, and an explicit UNVERIFIED on third-party client interoperability                                                                |

Each was written _after_ the thing it documents existed. That ordering was deliberate: the earlier
deferrals are recorded above, and the reason each was deferred is the reason it is now accurate.

---

## 9. Success criterion

Not "an MCP client called a hello-world tool." Success is a full round trip:

```
External AI discovers a correctly limited capability surface
  → retrieves purpose-scoped, evidence-backed context
  → produces or stores an Artifact
  → converts intelligence into a governed Plan
  → requests durable execution
  → hits the correct approval boundary
  → inspects work status
  → receives a verified result and Receipt
  → reports an Outcome
  → reconnects later, or through a different AI,
    and BrandOps still holds the canonical professional/workspace state.
```

Live interoperability against a second client/runtime is labelled **UNVERIFIED** until it is
actually run. Protocol-level contract tests do not count as live interoperability.
