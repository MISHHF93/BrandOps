# BRANDOPS MCP ARCHITECTURE

**Status:** Source-derived. Written after the transports settled, so it documents what exists
rather than what was planned.
**Last updated:** 2026-08-31
**Baseline:** 40 capabilities · 40 tools · 1122 tests / 215 files · `npm run typecheck` (`tsc -b`),
`eslint`, `vite build` clean. A bare `tsc --noEmit` checks nothing here — see the certification note.
**Companion documents:** [`BRANDOPS_MCP_GATEWAY_DIRECTIVE.md`](BRANDOPS_MCP_GATEWAY_DIRECTIVE.md)
(the mandate and gap ledger) · [`BRANDOPS_MCP_CAPABILITY_MATRIX.md`](BRANDOPS_MCP_CAPABILITY_MATRIX.md)
(per-capability contract) · [`BRANDOPS_MCP_SECURITY.md`](BRANDOPS_MCP_SECURITY.md) (threat model) ·
[`BRANDOPS_MCP_CERTIFICATION.md`](BRANDOPS_MCP_CERTIFICATION.md) (evidence).

---

## 1. The one architectural rule

> **The MCP layer is a protocol adapter. It holds no business logic.**

Everything an external AI can do, BrandOps can already do without it. The adapter translates
JSON-RPC into calls on canonical services and translates the results back. If a rule about _what
may happen_ lives in `src/services/interop/mcp/`, it is in the wrong place — the rules live in the
capability registry, the policy engine, and the gateway, all of which the in-app surfaces use too.

The practical test: **turning the entire MCP surface off must leave the product fully functional.**
It does. No canonical service imports the MCP layer; the dependency runs one way.

---

## 2. Layering

```
  External AI host (Claude Code, VS Code, Codex, a custom agent…)
        │  JSON-RPC 2.0
        ▼
  ┌───────────────────────── transport ─────────────────────────┐
  │  scripts/mcp-gateway.mjs        stdio, line-delimited        │
  │  scripts/mcp-http-gateway.mjs   Streamable HTTP + OAuth RS   │
  │      └── mcp/httpTransport.ts   pure request → response      │
  └──────────────────────────┬──────────────────────────────────┘
                             │  one entry point, both bindings
                             ▼
              mcp/server.ts :: dispatchMcpMethod
              ├── mcp/protocol.ts     version + _meta + envelopes
              ├── mcp/outputSchema.ts declared + enforced results
              └── mcp/tasks.ts        Tasks extension projection
                             │
                             ▼
              interop/gateway.ts :: executeAgentToolCall
              ┌──────────── the governed pipeline ─────────────┐
              │ sessions → policyEngine → validation →          │
              │ idempotency → memoryScreen → intentContract →   │
              │ dispatch → audit + checkpoint + operator trace  │
              └────────────────────────────────────────────────┘
                             │
                             ▼
              canonical services — Twin, Context/RAG, Evidence,
              Goals, Projects, Artifacts, Authority, Plans,
              Approvals, Execution, Receipts, Outcomes, Learning
```

Two properties fall out of this shape and both are load-bearing:

**One dispatcher.** Both transports call `dispatchMcpMethod`. A capability cannot behave one way
over stdio and another over HTTP, and a rule cannot be enforced on one binding and forgotten on the
other. Adding a third transport is a transport, not a second policy surface.

**One gateway.** The MCP layer has no privileged path into the services. `executeAgentToolCall` is
the same function the in-app Connected Agents panel calls. An external AI is a client of the same
door the product uses, with narrower keys.

---

## 3. Module map

| Module                          | Lines | Responsibility                                                                                                                                               |
| ------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `interop/capabilityRegistry.ts` | 431   | **The source of truth.** 40 capabilities: id, tool name, tier, access mode, read-only, `createsTask`. Every other module reads authorization facts from here |
| `interop/gateway.ts`            | 1030  | The governed pipeline and every capability handler                                                                                                           |
| `interop/policyEngine.ts`       | 323   | One authorization verdict per call, from a fixed check order                                                                                                 |
| `interop/sessions.ts`           | 246   | Create / resolve (SHA-256 hash) / revoke / expire; per-session grants and trust ceiling                                                                      |
| `interop/intentContract.ts`     | 175   | User Intent Contract: parse, require, synthesize, expire                                                                                                     |
| `interop/memoryScreen.ts`       | 120   | Memory Firewall on the agent write path                                                                                                                      |
| `interop/validation.ts`         | 170   | Sanitization and prompt-injection signatures                                                                                                                 |
| `interop/idempotency.ts`        | 46    | (session, capability, key) → stored result                                                                                                                   |
| `interop/audit.ts`              | 58    | The append-only agent ledger                                                                                                                                 |
| `mcp/server.ts`                 | 903   | Tool schemas, scoped discovery, `dispatchMcpMethod`, stdio loop                                                                                              |
| `mcp/protocol.ts`               | 223   | Supported versions, `_meta` validation, MCP error codes, result envelopes                                                                                    |
| `mcp/outputSchema.ts`           | 476   | Declared output contracts and the validator that enforces them                                                                                               |
| `mcp/httpTransport.ts`          | 412   | Streamable HTTP as a pure function; OAuth resource-server surface                                                                                            |
| `mcp/tasks.ts`                  | 317   | Tasks extension projected onto Plan/Execution/Checkpoint state                                                                                               |
| `workspaceIdentity.ts`          | 39    | The workspace's identity, resolved in one place                                                                                                              |

---

## 4. The request lifecycle

Every `tools/call` — read or write, first attempt or replay — takes the same path. Each stage can
only refuse; none can widen what a later stage permits.

| #   | Stage                  | Refuses when                                                                                                       | Source                                                |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| 1   | **Identity**           | The bearer token does not hash to a live session                                                                   | `sessions.ts`                                         |
| 2   | **Policy**             | Session revoked/expired · wrong workspace · capability not granted · trust ceiling too low · tier budget exhausted | `policyEngine.ts`                                     |
| 3   | **Injection screen**   | Arguments match a prompt-injection signature                                                                       | `validation.ts`                                       |
| 4   | **Idempotency**        | _(not a refusal)_ A replayed key returns the stored result instead of acting twice                                 | `idempotency.ts`                                      |
| 5   | **Memory Firewall**    | _(writes only)_ The firewall rejects the agent's content                                                           | `memoryScreen.ts`                                     |
| 6   | **Intent Contract**    | A consequential tier declared no intent, or a sensitive one did not confirm                                        | `intentContract.ts`                                   |
| 7   | **Dispatch**           | The handler itself fails — or throws, which becomes a fail-closed refusal                                          | `gateway.ts`                                          |
| 8   | **Approval invariant** | An `approval`-access capability produced anything other than a pending, `NEEDS_APPROVAL`-checkpointed request      | `gateway.ts`                                          |
| 9   | **Record**             | _(never refuses)_ Audit entry, checkpoint, operator trace — written on success, failure and refusal alike          | `audit.ts`, `checkpointStore.ts`, `operatorTraces.ts` |

Three details in that order matter more than they look:

- **Idempotency sits before the firewall.** A replay returns content that was screened when it was
  first accepted. Re-judging it could refuse work BrandOps has already recorded.
- **The approval invariant runs only on handlers that claimed success.** A handler that already
  failed executed nothing, so overwriting its error with `approval_required` would hide the real
  reason while protecting against nothing.
- **Stage 9 has no failure branch.** A call cannot leave the ledger by crashing: an exception in a
  handler is converted to a `handler_error` refusal that still writes its audit entry.

---

## 5. Protocol surface

**Versions.** `2026-07-28` (current), `2025-06-18`, `2025-03-26`. Negotiated per request. The
retired `initialize` handshake is still answered, because a legacy client opens with it and
refusing would break every client that has not migrated.

**Stateless model.** In `2026-07-28` there is no session handshake and no `Mcp-Session-Id`. Every
request carries `io.modelcontextprotocol/protocolVersion`, `clientInfo` and `clientCapabilities` in
`_meta`, and the Streamable HTTP binding mirrors `Mcp-Method` / `Mcp-Name` / `MCP-Protocol-Version`
into headers so intermediaries can route without parsing bodies. **The body stays authoritative** —
a header that disagrees is rejected with `-32020`, which is what stops a load balancer and the
server from acting on different values.

**Methods served.** `initialize` (legacy), `ping`, `tools/list`, `tools/call`, `tasks/get`,
`tasks/cancel`, `tasks/update`. Not `tasks/list` — the extension does not define it, and inventing
it would let a client enumerate work it does not own.

**Discovery is scoped.** `tools/list` returns only the calling session's granted capabilities.
Advertising a tool the caller cannot invoke leaks the shape of the workspace and invites calls that
can only ever be refused. The active Profession Pack **orders** the result; it never hides a
granted capability, because dropping one the user authorized would silently break their workflow.

---

## 6. The result contract

Every tool returns the same envelope, and every tool publishes a JSON Schema 2020-12 `outputSchema`
describing it:

```jsonc
{
  "ok": true,
  "capabilityId": "receipts.read", // const in the schema — you can tell what answered
  "data": {
    /* per-capability payload */
  },
  "approvalRequired": false, // true ⇒ this capability can only ever request approval
  "deduplicated": false, // true ⇒ an idempotency replay returned a stored result
  "checkpointIds": ["chk-…"], // audit linkage
  "auditEntryId": "agent-audit-…" // always written
}
```

The spec makes a declared schema binding — _"Servers MUST provide structured results that conform
to this schema"_ — so `dispatchMcpMethod` **validates before emitting**. If a result does not
conform, `structuredContent` is withheld and the reason is stated in a second text block; the
client degrades to the text result, which is complete, rather than validating a payload that
quietly broke its contract.

`structuredContent` and the text block are the same value serialized once, so they cannot disagree.

Two things are declared exactly because they are exactly true: `capabilityId` is a `const`, and
`if ok === false then errorCode is required` — the gateway has no path that refuses without naming
itself. The `data` payload is declared only as deeply as a handler actually constructs it. Pinning
shapes we merely forward would turn every downstream refactor into a silent spec violation.

---

## 7. Durable work: the Tasks extension

**BrandOps runs no second task engine.** A protocol task is a read-only projection over state that
already exists — the execution-request proposal (who asked, under which session, with what intent),
the Plan it points at, and that plan's checkpoint history. Nothing in `mcp/tasks.ts` stores progress
of its own, so a task can never disagree with the execution it describes.

```
ExecutionState                                          → task status
IDLE/UNDERSTANDING/PLANNING/WORKING/EXECUTING/VERIFYING  → working
NEEDS_APPROVAL                                           → input_required
BLOCKED                                                  → input_required (recovery)
COMPLETED                                                → completed
FAILED                                                   → failed
REJECTED / CANCELLED                                     → cancelled
```

`NEEDS_APPROVAL → input_required` is the important row. BrandOps' human approval boundary becomes a
first-class protocol state, so a remote agent sees the boundary rather than a mysterious stall. It
still cannot cross it: `tasks/update` with `action: "accept"` is refused with
`approval_not_delegable`. An agent may **decline** — withdrawing its own request is always safe.

Only a capability whose registry entry sets `createsTask` returns a `CreateTaskResult`. Reading or
cancelling an existing task creates nothing and returns the ordinary envelope its `outputSchema`
describes. Which capabilities mint a task is a registry fact, not a rule the adapter knows.

Task handles are **session-scoped**. A second session — even one granted the same capabilities —
gets `task_not_owned`. Authorization is not ownership.

---

## 8. Transports

|            | stdio                                           | Streamable HTTP                                                                                                                                          |
| ---------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host       | `scripts/mcp-gateway.mjs`                       | `scripts/mcp-http-gateway.mjs` (`npm run mcp:http`)                                                                                                      |
| Credential | `BRANDOPS_MCP_TOKEN` in the process environment | Per-request `Authorization: Bearer`                                                                                                                      |
| Identity   | One session for the process lifetime            | Re-resolved on every request; two clients never share identity                                                                                           |
| Binding    | —                                               | `127.0.0.1` by default                                                                                                                                   |
| Discovery  | —                                               | RFC 9728 Protected Resource Metadata at `/.well-known/oauth-protected-resource`, unauthenticated (discovery cannot require the credential it describes)  |
| Refusals   | JSON-RPC errors                                 | 401 with `WWW-Authenticate` + `resource_metadata` · 403 `insufficient_scope` naming the exact capability · 403 on a foreign `Origin` · 405 on GET/DELETE |

BrandOps capability ids **are** the OAuth scopes — least privilege is already modeled in the
registry, so a second vocabulary would only be a place for the two to drift. Advertised
`scopes_supported` is the minimal read set; everything else is granted by step-up, where the 403
names the exact capability the call needed.

**Deployment status, stated plainly:** the HTTP binding is remote-_capable_, not deployment-ready.
No TLS, no authorization server integrated (`authorization_servers` is an honest empty list), and
sessions still come from a manually exported workspace JSON. A hosted client such as ChatGPT cannot
connect to a real deployment today. Tracked as **G1 (PARTIAL)**.

---

## 9. Invariants

These are the properties the rest of the design exists to preserve.

1. **MCP handlers hold no business logic.**
2. **No tool exists outside the capability registry.** Registry entry → tier → access → tool.
3. **Approval-access capabilities can only ever produce an approval-gated request.** Fail closed.
4. **External AI may propose, never promote.** Nothing an agent asserts becomes verified Twin state
   without evidence validation and a user action. Agent claims are `AGENT_REPORTED` at most.
5. **Agent-authored content is untrusted** and passes the Memory Firewall before it reaches
   workspace state.
6. **A connection is not an authorization.** Every call re-resolves identity → workspace →
   capability grant → tier → policy, and every consequential call declares what it is acting for.
7. **Irreversible work is idempotent and replay-protected.**
8. **The product remains fully functional with the entire MCP surface disabled.**

---

## 10. Extending the surface

Adding a capability is deliberately registry-first, and the ordering is the safety property:

1. **Registry entry** — id, tool name, tier, access mode, `readOnly`, `createsTask` if it mints
   durable work. Authorization now exists for it, and it is refused by default because no session
   has been granted it.
2. **Handler** in `gateway.ts`, calling canonical services. No new policy.
3. **Input schema** in `TOOL_ARG_SCHEMAS`. Prefer real constraints — `enum`, `minimum` — derived
   from the canonical list rather than described in prose, so a client can be right the first time
   instead of learning the rule from a refusal.
4. **Output contract** in `outputSchema.ts` if the handler constructs a stable shape. Declare only
   what the handler guarantees.
5. **Tests** — capability behavior, and an adversarial case if the capability is consequential.
6. **Matrix row** in `BRANDOPS_MCP_CAPABILITY_MATRIX.md`.

A tool that skips step 1 does not exist: `dispatchMcpMethod` resolves tool names through the
registry, and an unknown name is refused with `unknown_tool` before anything runs.
