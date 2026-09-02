# BRANDOPS MCP SECURITY

**Status:** Source-derived threat model for the MCP surface. Every control below names the module
that enforces it and the test that proves it.
**Last updated:** 2026-08-31
**Baseline:** 1122 tests / 216 files · `tsc`, `eslint`, `vite build` clean.
**Companion documents:** [`BRANDOPS_MCP_ARCHITECTURE.md`](BRANDOPS_MCP_ARCHITECTURE.md) ·
[`BRANDOPS_MCP_CAPABILITY_MATRIX.md`](BRANDOPS_MCP_CAPABILITY_MATRIX.md) ·
[`BRANDOPS_MCP_CERTIFICATION.md`](BRANDOPS_MCP_CERTIFICATION.md)

---

## 1. Threat model

**What is being protected.** Not the model, and not the tools — the _governed longitudinal state_:
the Digital Twin, the Evidence Ledger, Goals, Projects, Artifacts, Plans, Approvals, Receipts,
Outcomes. Compute is interchangeable. This state is not.

**Who the adversary is.** Not a buggy client. A **hostile or compromised one** — a client that has
a valid token and is now working against the user, or an honest client being steered by injected
instructions in content it read somewhere else. The design assumption throughout is that the model
on the other end may be adversarial and that its arguments are attacker-controlled data.

**What the adversary wants.**

| Goal                                        | Why it is worth attacking                              |
| ------------------------------------------- | ------------------------------------------------------ |
| Read state it was not granted               | The workspace is the asset                             |
| Write a claim into the Twin as verified     | Laundering a false fact into durable, trusted state    |
| Cause an irreversible external action       | Real-world consequence — publishing, sending, revoking |
| Bypass or delegate the approval boundary    | Removes the human from the loop                        |
| Poison memory so future decisions are wrong | The most durable attack: it survives the session       |
| Act without leaving a record                | Makes every other attack deniable                      |

**What is explicitly out of scope.** The local operating system, the user's disk, and the user
themselves. BrandOps is local-first; a workspace JSON readable by an attacker is already lost, and
no MCP control changes that.

---

## 2. Trust boundaries

```
   external AI  ──────────►  the only boundary that matters
                             ▲
   agent output, tool args,  │  everything crossing left-to-right is
   evidence refs, intent     │  DATA, never instructions
                             │
   BrandOps canonical state  ┘
```

Two rules define the boundary and everything else implements them:

**1. An agent may propose. It may never promote.**
Agent-supplied content enters as `AGENT_REPORTED` at most. Promotion to verified Twin state
requires a user action through a BrandOps-side surface an agent cannot reach. The trust ladder is
`USER_VERIFIED(6) > BRANDOPS_VERIFIED(5) > AGENT_REPORTED(3) > EXTERNAL_SOURCE(2) >
MODEL_INFERRED(1) > UNKNOWN(0)`, and nothing in the MCP path can move a value up it.

**2. A connection is not an authorization.**
Every single call re-resolves identity → workspace → capability grant → tier → policy. There is no
"authenticated session" that stops being checked, and there is no per-connection state a client can
establish once and then trade on.

---

## 3. Controls, by attack

### 3.1 Spoofed or stale identity

| Control                                                                                      | Where                            |
| -------------------------------------------------------------------------------------------- | -------------------------------- |
| Tokens stored as SHA-256 hashes; the plaintext is shown once and never persisted             | `sessions.ts`                    |
| Revocation takes effect on the next call — no grace window, no cached decision               | `sessions.ts`, `policyEngine.ts` |
| `expiresAt` enforced by the policy engine, not by the client's honesty                       | `policyEngine.ts`                |
| Over HTTP the bearer is re-resolved per request; two concurrent clients never share identity | `mcp-http-gateway.mjs`           |

_Proven by:_ `mcpAdversarial.test.ts` — forged token, revoked session holding a valid token,
expired session reaching the engine.

### 3.2 Cross-workspace access

A session is bound to the workspace it was issued in, and the check runs before dispatch.

The workspace's identity is resolved in one place (`workspaceIdentity.ts`) for a reason that was
found the hard way: `builderActivity.workspaceId` is an authorization input, but **nothing owned
it**. Three services minted it independently and disagreed — `'local-workspace'`, `'default'`, and
`'default-workspace'`. On a fresh workspace, whichever write landed first named the workspace, and
from that moment every session issued against `'local-workspace'` was locked out with
`workspace_mismatch`. **An outcome report, or an activity ingest, could lock every connected agent
out of the workspace it was already working in** — and `brandops_ingest_activity` is a door an agent
opens directly. Identity is now derived, never invented, and both doors have regression tests.

_Proven by:_ `mcpAdversarial.test.ts` — "a session issued for one workspace is refused against
another"; and, per write path, "cannot rename the workspace out from under a live session".

`P0-security.test.ts` also covers data isolation between two workspaces. Its closing assertion used
to be `expect(wsB.id).not.toBe(wsA.id)` — comparing a field the test itself had just set to two
different values, which could only pass. It now asserts what the comment above it claimed: that the
two workspaces share no object references, and that a write through one is not observable through
the other.

### 3.3 Permission escalation

| Control                                                                                                                                                                                                                                                                                     | Where                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Per-session capability grants; anything outside the list is refused before dispatch                                                                                                                                                                                                         | `policyEngine.ts`                      |
| Trust derived from the **registry**, not a hardcoded name list — a name-matching derivation silently misclassifies every capability added after it was written                                                                                                                              | `policyEngine.ts`                      |
| Operator `trustCeiling` caps a session below its grants, survives a reload, and can only ever restrict                                                                                                                                                                                      | `policyEngine.ts`, `storage.ts`        |
| Read-only sessions are limited to READ capabilities                                                                                                                                                                                                                                         | `sessions.ts`                          |
| An unknown capability id fails closed instead of throwing inside the authorization stage, and contributes no trust                                                                                                                                                                          | `gateway.ts`, `policyEngine.ts`        |
| One derivation, not two: `agentIdentity.deriveTrustLevel` delegates to the registry-driven computation the gateway enforces, so the level shown to a person is the level applied. The name-matching version it replaced classified a session holding `builder.sessions.revoke` as READ_ONLY | `agentIdentity.ts` → `policyEngine.ts` |

_Proven by:_ `mcpAdversarial.test.ts` — ungranted capability, ceiling neutering a live grant,
ceiling never raising trust, unknown id failing closed.

### 3.4 Approval bypass and delegation

The invariant is absolute: an `approval`-access capability's **only** legal output is a pending
proposal carrying a `NEEDS_APPROVAL` checkpoint. If a handler claims success without producing one,
the gateway fails the call closed rather than reporting success.

Over the protocol the boundary is visible and still uncrossable. The task reports
`input_required` with `resolvableBy: "user"`, and `tasks/update` with `action: "accept"` is refused
with `approval_not_delegable`. An agent may **decline** — withdrawing its own request is always
safe. Approving happens inside BrandOps, by a person.

_Proven by:_ `agentInterop.test.ts` (fail-closed invariant), `canonicalLoopEndToEnd.test.ts`
(end-to-end), `mcpDurableExecution.test.ts` and `mcpSuccessCriterion.test.ts` (protocol-level
refusal), `mcpAdversarial.test.ts` (approving twice is a no-op; a cancelled task cannot be
resurrected by a late approval).

### 3.5 Prompt injection and memory poisoning

Two independent screens, deliberately different in kind:

1. **Signature screen** (`validation.ts`) — 7 patterns for instruction-override, persona injection,
   markup injection and prompt exfiltration, over sanitized text with a 4000-character cap. A match
   refuses the call and is audited.
2. **Memory Firewall** (`memoryScreen.ts` → `memory/memoryFirewall.ts`) — writes only. Agent text
   is sanitized, classified by **provenance** (`external-agent-message` → `EXTERNAL_SOURCE`, which
   can never be verified), and scored for instruction risk. A firewall `reject` refuses the call and
   writes nothing; every other verdict is recorded in the audit entry.

The firewall gates on `reject`, not on `requiresVerification`. Agent content is `AGENT_REPORTED` by
definition, and BrandOps already answers that with the approval gate and the proposal queue; a
second refusal there would block every legitimate write while protecting against nothing.

The firewall existed and was correct for a long time before it enforced anything — **nothing outside
`services/memory/` had ever called it**, exactly as the agent identity registry was reachable only
from its own test. Both are now on the request path.

A related hazard has also been removed. A **second** `processThroughFirewall` lived in
`candidateMemory.ts` with the same name and the same signature as the real one, but it was a bare
passthrough that consulted no configuration at all — blocked sources, `autoRejectLowTrust` and
verification requirements all ignored. Nothing imported it, so it was dead; but it was dead in the
shape where an auto-import silently selects the version that enforces nothing and the call site
still looks correct in review. `memoryFirewall.processThroughFirewall` is now the only entry point.

The same scan removed two more shadow sets. `types/builder.ts` held a second `trustTierLabel` /
`strongestTier` / `isUsableAsFact` — with a **third, inlined copy of the trust rank table** — and
`tracing/productionTrace.ts` held `buildCheckpoint`, `buildOperatorTrace` and `buildAuditEntry`,
passthroughs shadowing by name the three builders that actually write the audit ledger, producing
objects with no id, no timestamp and no clamping. Both sets were dead; both were one auto-import away
from being load-bearing and wrong.

_Proven by:_ `mcpAdversarial.test.ts` — injection payload refused without being recorded; firewall
verdict present on every write; agent text cannot launder itself into a verified classification; a
payload that survives only as control characters is refused and writes nothing; a hardened firewall
configuration is honoured rather than overridden.

### 3.6 Replay and duplicate irreversible work

| Control                                                                                                      | Where                           |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| Idempotency keyed on (session, capability, key); a replay returns the stored result rather than acting twice | `idempotency.ts`                |
| One idempotency key yields one task handle, not two                                                          | `mcp/tasks.ts` + `proposals.ts` |
| `decideAgentProposal` acts only on a _pending_ proposal, so a second approval is a no-op                     | `proposals.ts`                  |
| Cancellation is idempotent and never un-terminates a finished task                                           | `mcp/tasks.ts`                  |

_Proven by:_ `mcpAdversarial.test.ts` — replayed key, duplicate execution requests, concurrent
double-cancel, approving the same execution twice.

### 3.7 Task-handle guessing and enumeration

Handles are opaque (`br_task_` + time + 8 random chars) and **session-scoped**: a task belongs to
the session that requested it, so a handle replayed from another session resolves to
`task_not_owned` rather than leaking execution state. `tasks/list` is deliberately not implemented —
the extension does not define it, and inventing it would let a client enumerate work it does not own.

_Proven by:_ `mcpAdversarial.test.ts` — guessed handle; a second, equally authorized session denied.

### 3.8 Overbroad discovery

`tools/list` returns only what the calling session may invoke. Advertising a tool the caller cannot
use leaks the shape of the workspace and invites calls that can only be refused. Over HTTP,
`scopes_supported` advertises the minimal read set; everything else is step-up, and the 403 names
the exact capability the call needed rather than dumping all 40.

_Proven by:_ `mcpAdversarial.test.ts`, `mcpSuccessCriterion.test.ts` (a second session sees exactly
its own three tools), `mcpHttpTransport.test.ts`.

### 3.9 Malformed input

Hostile arguments are fuzzed against **every** tool: prototype-pollution keys, wrong types, nulls,
arrays where objects belong, deep nesting, 50 KB strings, empty and numeric keys. The contract is
that the surface answers in the envelope rather than throwing.

This found a real defect. `evidence: 'not-an-array'` on `brandops_record_achievement` reached `.map`
on a string and threw **straight out of `executeAgentToolCall`** — no envelope, no audit entry, a
call with no record that it happened, reachable by any client that sent the wrong JSON type. Fixed
at the source, and the class is closed: a handler that throws is now converted into a fail-closed
`handler_error` refusal, with the exception text going to the audit summary and a generic message to
the caller.

_Proven by:_ `mcpAdversarial.test.ts` — the fuzz sweep and its named regression.

### 3.10 Acting without a record

Every call — success, failure, refusal, replay — appends an audit entry carrying the capability, the
operation, latency, a request preview, the policy verdict and the checks that ran, the intent
contract where one applies, and the firewall verdict on writes. Successful calls additionally emit
an operator trace and a checkpoint. There is no path that mutates state without writing to the
ledger, including the crash path.

_Proven by:_ `mcpSuccessCriterion.test.ts` — "leaves an audit trail for every hop of the loop".

### 3.11 Rate abuse

Per session, per tier, per minute: READ 120 · GENERATE 60 · PREPARE 30 · EXTERNAL_ACTION 10 ·
SENSITIVE_ACTION 3. A compromised client exhausts its ability to **act** long before its ability to
**look**, and one noisy tier cannot starve another.

_Proven by:_ `mcpAdversarial.test.ts` — sensitive budget exhausted while reads still flow; budgets
are per session, not global.

---

## 4. Risk tiers

`READ → GENERATE → PREPARE → EXTERNAL_ACTION → SENSITIVE_ACTION`

| Tier               | Obligation                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| READ               | Grant + policy                                                                                  |
| GENERATE / PREPARE | Grant + policy + firewall + a **synthesized**, audited intent contract                          |
| EXTERNAL_ACTION    | …plus a **declared** intent contract, and approval where the registry says `access: 'approval'` |
| SENSITIVE_ACTION   | …plus explicit `intent.confirm: true`, checked _before_ the approval gate                       |

The intent contract is the answer to a specific attack: a granted capability says the client _may_
act; the contract says what it is acting _for_. Without it, a confused or compromised client can
launder an unrelated action through a legitimately granted capability, and the approval surface
would show the user a mechanical request with no purpose attached — "send this email" instead of
"send this email because the user asked you to follow up on Tuesday".

---

## 5. Known gaps

Stated as gaps, not as future work that is nearly done.

| #   | Gap                                                              | Consequence                                                                                                                                                                                                                                                                                                                                                                                                                         | Tracked            |
| --- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 1   | **No TLS on the HTTP binding**                                   | Bearer tokens would traverse the network in clear text. Mitigated only by the default `127.0.0.1` bind                                                                                                                                                                                                                                                                                                                              | G1                 |
| 2   | **No OAuth authorization server integrated**                     | `authorization_servers` is an honest empty list; only BrandOps-issued session tokens are accepted, and there is no consent screen, refresh, or central revocation                                                                                                                                                                                                                                                                   | G1                 |
| 3   | **Sessions come from a manually exported workspace JSON**        | A hosted client cannot connect to a real deployment. The file is at least now a _live_ store — both hosts re-read it per call and compare-and-swap on write — so it is a deployment gap rather than a staleness bug                                                                                                                                                                                                                 | G1                 |
| 4   | **Rate limits are in-memory and per-process**                    | A multi-instance deployment multiplies every budget by the instance count. This is a local abuse brake, not a distributed quota                                                                                                                                                                                                                                                                                                     | G11                |
| 5   | **No delegation chains**                                         | An agent cannot act on behalf of another agent under a narrowed grant. Today every session is terminal                                                                                                                                                                                                                                                                                                                              | G11                |
| 6   | **Discovery is scoped by grants, not by connected systems**      | A tool whose underlying connector is absent is still advertised to a session that holds it                                                                                                                                                                                                                                                                                                                                          | G12                |
| 7   | **ASK text is not injection-screened**                           | `detectPromptInjection` covers agent tool arguments only. The user is the authorized operator, but pasted webpage or document text reaching the AI pipeline is unscanned                                                                                                                                                                                                                                                            | Canonical §11 P0-1 |
| 8   | **Live interoperability with third-party clients is UNVERIFIED** | Both of our own transports have been driven end to end over real JSON-RPC. That is our transport, not a second vendor's client                                                                                                                                                                                                                                                                                                      | See certification  |
| 9   | **Test files are not type-checked**                              | `tsconfig.app.json` includes `src` only, and Vitest transpiles without checking, so a type error in a test surfaces at runtime or not at all. `npm run typecheck:tests` now makes the number visible — **161 pre-existing errors** — deliberately outside the release gate, since wiring them in today would either block every commit or invite a blanket suppression. It should only ever go down; new test files should add zero |

> **A note on running the gate.** Use `npm run typecheck` (`tsc -b`). The root `tsconfig.json` is
> solution-style, so a bare `tsc --noEmit` compiles **zero files** and always passes — a genuinely
> broken reference in `agentIdentity.ts` sailed through it and was caught only by the test run.

---

## 6. Operator guidance

**Binding.** The HTTP gateway binds `127.0.0.1` by default. `0.0.0.0` exposes the workspace to the
network; put TLS and authentication in front of it or do not do it. The process prints a warning
when bound to all interfaces.

**Origins.** `BRANDOPS_MCP_ALLOWED_ORIGINS` is empty by default, which rejects every request
carrying an `Origin` header. That is the right setting for non-browser clients — widen it only for a
browser client you control.

**Grants.** Grant the narrowest set that lets the client do its job. A client that only reads should
never hold `execution.request`. Discovery reflects the grant, so a narrow grant also produces a
narrow, less confusing tool surface for the model.

**Trust ceiling.** When a client starts behaving oddly, set `trustCeiling` rather than editing
grants. It takes effect immediately, survives a reload, and is reversible without reconstructing
what the session was supposed to have.

**Revocation.** Revoking is immediate and requires no cooperation from the client. Prefer it to
rotating a token when you suspect compromise.

**Reading the ledger.** `externalAgentAudit.entries` is the record of what agents did. The policy
verdict on each entry shows which checks ran; the firewall line on writes shows how the agent's own
words were classified. A refusal is as informative as a success — a run of them is what a probing
client looks like.
