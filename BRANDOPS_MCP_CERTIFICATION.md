# BRANDOPS MCP CERTIFICATION

**Date:** 2026-08-31
**Baseline:** 40 capabilities · 40 tools · **1122 tests / 212 files passing** · `npm run typecheck`
(`tsc -b`) clean · `eslint` clean · `vite build` succeeds.

> **Use `npm run typecheck`, not `tsc --noEmit`.** The root `tsconfig.json` is solution-style
> (`"files": []` plus project references), so a bare `tsc --noEmit` compiles **zero files** and
> always reports success. `--listFiles` confirms it: 0. Build mode follows the references and is the
> only invocation that checks anything.
> **Verdict:** the directive's success criterion is **MET in-process and over BrandOps' own stdio
> transport**. Live interoperability with a third-party client is **UNVERIFIED**. Remote deployment is
> **NOT READY** (no TLS, no authorization server).

**Companion documents:** [`BRANDOPS_MCP_GATEWAY_DIRECTIVE.md`](BRANDOPS_MCP_GATEWAY_DIRECTIVE.md) ·
[`BRANDOPS_MCP_ARCHITECTURE.md`](BRANDOPS_MCP_ARCHITECTURE.md) ·
[`BRANDOPS_MCP_SECURITY.md`](BRANDOPS_MCP_SECURITY.md) ·
[`BRANDOPS_MCP_CAPABILITY_MATRIX.md`](BRANDOPS_MCP_CAPABILITY_MATRIX.md)

---

## 1. What is being certified

The directive is explicit that a hello-world tool call is not success:

> "Success means an external AI can discover an appropriately limited BrandOps capability surface,
> retrieve purpose-scoped evidence-backed context, produce or store an Artifact, convert
> intelligence into a governed Plan, request durable execution, encounter the correct approval
> boundary, inspect work status, receive a verified result and Receipt, report a subsequent Outcome,
> and then reconnect later or through a different compatible AI while BrandOps preserves the
> canonical professional/workspace state."

Ten claims. Each is certified below against a named artifact, not a description.

---

## 2. Evidence: the round trip in process

`tests/unit/mcpSuccessCriterion.test.ts` drives all ten steps. Every agent-side step goes through
`dispatchMcpMethod` — the same function both gateway processes route through — rather than calling
services directly, because the claim is about what an _MCP client_ can do. Every user-side step goes
through BrandOps-side surfaces an agent cannot reach; the boundary is only real if the test has to
cross it the way a person would.

| #   | Criterion clause                           | What the test asserts                                                                                                                                                                                                         |
| --- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Discover an appropriately limited surface  | `tools/list` returns **exactly** the 11 granted tools — not "some" — each with an `outputSchema`; `brandops_revoke_session` is absent                                                                                         |
| 2   | Purpose-scoped, evidence-backed context    | `brandops_search_evidence` returns hits that each carry a trust tier, plus a non-empty `limitations` list; `brandops_get_relevant_context` returns only granted bundles                                                       |
| 3   | Produce or store an Artifact               | `brandops_create_artifact` returns `status: pending`; the artifact is stored only after a user approves                                                                                                                       |
| 4   | Convert intelligence into a governed Plan  | The opportunity must be **approved by a person** before `brandops_convert_to_plan` succeeds; conversion produces a real `PlanReceipt`, not just a plan record                                                                 |
| 5   | Request durable execution                  | With the Tasks extension declared, the call returns `resultType: "task"` and a minted handle                                                                                                                                  |
| 6   | Encounter the correct approval boundary    | Task status is `input_required` with `resolvableBy: "user"`; `tasks/update` `accept` is refused with `approval_not_delegable` and `insufficientScope: ["brandops:approval"]`; a follow-up `tasks/get` shows **nothing moved** |
| 7   | Inspect work status                        | After a person approves, `tasks/get` leaves `input_required` and tracks the plan's real execution state                                                                                                                       |
| 8   | Verified result and Receipt                | `brandops_get_receipt` returns the receipt for that plan, with its timestamp; a completed task also carries `receiptId` in `task.result`                                                                                      |
| 9   | Report a subsequent Outcome                | `brandops_report_outcome` records `trustTier: AGENT_REPORTED` — reported, not believed                                                                                                                                        |
| 10  | Reconnect later, or through a different AI | The workspace is round-tripped through storage (`JSON` + `withDefaults`), a **new session with a different `clientKind`** reads the plan, the receipt and the artifact back                                                   |

Two assertions in step 10 are worth naming separately, because together they are the actual claim:

- **Canonical state is portable across clients.** The second AI, which never saw the first one's
  work, reads the plan and receipt by id.
- **A task handle is not.** The same second session is refused with `task_not_owned` when it
  presents the first client's handle. It inherits the workspace, never the session identity.

A second test in the same file asserts the ledger: every hop leaves an audit entry carrying the
capability, the policy verdict, and — on writes — the Memory Firewall's classification of the
agent's own words.

---

## 3. Evidence: live, over the wire

Driven through `scripts/mcp-gateway.mjs` as a real child process, real line-delimited JSON-RPC, a
real `2026-07-28` `_meta` block with the Tasks extension declared, against a workspace JSON on disk.

**Process A — discovery through execution request**

```
1 tools/list          -> 8 tools, all with outputSchema: true
2 context.read        -> ok: true | bundles: 3 | audit: true
3 artifact.create     -> ok: true | status: pending | approvalRequired: false
4 execution.request   -> resultType: task | status: input_required | taskId: minted
```

**Process B — a _separate_ gateway process, same workspace file**

```
5 tasks/get           -> status: input_required | resolvableBy: user
                         "Waiting for user approval before anything executes."
6 tasks/update accept -> approval_not_delegable: This task is waiting on a user approval.
                         An agent cannot accept it over the protocol; a person approves it
                         inside BrandOps. You may decline to withdraw the request.
7 execution.read      -> resultType: complete | structuredContent: true | content blocks: 1
                         ok: true | task status: input_required
```

Step 5 is the one that matters most. The task was minted in one process and read in another, with
nothing shared but the workspace file — which is the whole point of a _durable_ handle rather than a
long-lived session. The approval boundary survived the process boundary, and the refusal in step 6
came from a process that had never seen the request being made.

Step 7's `content blocks: 1` is the G18 conformance check passing: a second block would mean
`structuredContent` had been withheld because the result did not match its declared schema.

**Also verified live, earlier in the programme:** scoped discovery over stdio (a session holding
three capabilities is shown three tools, not 40); `structuredContent` byte-identical to the text
block; and, over Streamable HTTP, unauthenticated metadata discovery, the 401 challenge, a 403
`insufficient_scope` step-up naming the exact capability, 405 on GET, 403 on a foreign `Origin`, an
authorized `tools/list`, and the full durable-execution round trip.

---

## 4. What certification found

Certification is only worth running if it can fail. It did, twenty-five times, and each defect is
recorded here rather than quietly fixed.

| #   | Defect                                                                                                                                                                                                                                                                                                                                                                                                                                                       | How it surfaced                                                                                             | Severity                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `evidence: 'not-an-array'` reached `.map` on a string and threw **out of `executeAgentToolCall`** — no envelope, no audit entry, a call with no record it happened                                                                                                                                                                                                                                                                                           | Malformed-argument fuzz sweep                                                                               | **High.** Reachable by any client sending the wrong JSON type; defeated the audit guarantee                                                                                               |
| 2   | Reporting an outcome on a workspace with no `builderActivity` minted the id `'default'`, locking out every session issued against `'local-workspace'` with `workspace_mismatch`                                                                                                                                                                                                                                                                              | Step 10 of the round trip                                                                                   | **High.** One ordinary write could lock every connected agent out of the workspace it was working in                                                                                      |
| 3   | `brandops_get_execution` returned a `CreateTaskResult` to task-aware clients, so its declared `outputSchema` was never satisfiable for them                                                                                                                                                                                                                                                                                                                  | Step 7 of the live run                                                                                      | Medium. A published contract the tool did not honour                                                                                                                                      |
| 4   | `PlanReceipt.generatedSteps` declared as a number; it is a string array                                                                                                                                                                                                                                                                                                                                                                                      | Output-schema enforcement                                                                                   | Low, self-caught                                                                                                                                                                          |
| 5   | `McpTask.ttlMs` declared as a number; null is legal and is what BrandOps emits                                                                                                                                                                                                                                                                                                                                                                               | Output-schema enforcement                                                                                   | Low, self-caught                                                                                                                                                                          |
| 6   | An unknown capability id threw inside the authorization stage instead of failing closed                                                                                                                                                                                                                                                                                                                                                                      | Adversarial suite                                                                                           | Medium. The worst place to throw                                                                                                                                                          |
| 7   | `builderWorkspaceId` fell back to `'default-workspace'` — a _third_ value alongside `'local-workspace'` and `'default'` — and `ingestActivityEvent` writes it straight into `builderActivity.workspaceId`                                                                                                                                                                                                                                                    | Audit of every workspace-id fallback after defect 2                                                         | **High.** The same lockout as defect 2, through a door an agent opens directly with `brandops_ingest_activity`                                                                            |
| 8   | A second `processThroughFirewall` lived in `candidateMemory.ts` — same name, same signature as the real one, but a bare passthrough consulting **no firewall configuration**: blocked sources, `autoRejectLowTrust` and verification requirements all ignored                                                                                                                                                                                                | `knip` dead-export sweep                                                                                    | **High if ever called.** Dead, but dead in the most dangerous shape: an auto-import would silently pick the version that enforces nothing, and the call site would look correct in review |
| 9   | `agentIdentity.deriveTrustLevel` classified by matching capability _names_, so it was stale for every capability added after it was written — a session holding `builder.sessions.revoke`, the most consequential capability in the registry, displayed as READ_ONLY. Reachable only from its own test                                                                                                                                                       | Grep for modules the request path never consults                                                            | Medium. Told a person a session was safer than the gateway treats it                                                                                                                      |
| 10  | `AgentIdentityRegistry.byTrustLevel` / `.byClientKind` are typed as total `Record`s but were built sparsely and cast, so `registry.byTrustLevel.PROPOSER.length` — which the type says is safe — threw whenever no session held that level                                                                                                                                                                                                                   | Its own test, once defect 9 changed which levels occur                                                      | Low. A lying type; the cast was what hid it                                                                                                                                               |
| 11  | **`npx tsc --noEmit` checks zero files in this repository.** The root `tsconfig.json` is solution-style, so a bare invocation compiles nothing and always succeeds                                                                                                                                                                                                                                                                                           | `--listFiles` returned 0 while a genuinely broken reference ran green                                       | **High as a process defect.** Every "typecheck clean" produced that way was vacuous. The repo's own `npm run typecheck` (`tsc -b`) was correct all along                                  |
| 12  | `types/builder.ts` carried a second `trustTierLabel` / `strongestTier` / `isUsableAsFact` — including a **third, inlined copy of the trust rank table**, separate from `TRUST_TIER_RANK`                                                                                                                                                                                                                                                                     | Scan for exported names defined in more than one file                                                       | Medium. They agreed today; nothing kept them agreeing, and they answer questions about a trust boundary. All three were dead — removed                                                    |
| 13  | `tracing/productionTrace.ts` carried `buildCheckpoint`, `buildOperatorTrace` and `buildAuditEntry` — passthroughs shadowing by name the three builders that actually write the audit ledger, with no id, no timestamp and no clamping                                                                                                                                                                                                                        | Same scan                                                                                                   | Medium. Dead, but an auto-import would have written an id-less, timestamp-less checkpoint into the ledger the audit story depends on — removed                                            |
| 14  | `P0-security.test.ts` closed its workspace-isolation test with `expect(wsB.id).not.toBe(wsA.id)` — comparing a field the test itself had just set to two different values, under a comment claiming the boundary is structural                                                                                                                                                                                                                               | Test typecheck probe (`BrandOpsData` has no `id`)                                                           | Medium as a _verification_ defect. A tautology reading as a security check. Replaced with assertions that a write through one workspace is not observable through the other               |
| 15  | **Test files are not type-checked at all.** `tsconfig.app.json` includes `src` only and Vitest transpiles without checking                                                                                                                                                                                                                                                                                                                                   | Probing the suite with a tests-inclusive project                                                            | Recorded, not closed: 161 pre-existing errors. `npm run typecheck:tests` now makes the number visible, deliberately outside the release gate                                              |
| 16  | **Both gateway hosts served a frozen workspace.** Each read the JSON once at startup into a module-level variable; nothing the app wrote afterwards was ever visible, and no response said so                                                                                                                                                                                                                                                                | Pushing on G1 — asking what "reads live state" would actually require                                       | **High.** An agent asking for goals got a snapshot for the life of the process, presented as current                                                                                      |
| 17  | **Both gateway hosts silently destroyed concurrent writes.** Writing the whole file from a stale base clobbers whatever the app, a second gateway, or another agent saved in between                                                                                                                                                                                                                                                                         | Same audit                                                                                                  | **High.** Silent data loss with no error and no trace                                                                                                                                     |
| 18  | The new workspace store failed a call's compare-and-swap **against its own predecessor's write**: the stdio loop dispatches each request without awaiting the previous one, so a client's back-to-back calls overlapped                                                                                                                                                                                                                                      | Live pipelined `resources/read` run                                                                         | Medium. An ordinary second request returned a conflict error. Fixed by serializing mutations in-process; the CAS now means only "someone outside this process changed the file"           |
| 19  | **`brandops_verify_achievement` and `brandops_dismiss_achievement` were uncallable as documented.** Both declared `achievementId` **required**; both handlers read only `args.eventId`, so a client passing exactly what the schema asked for got `missing_event_id: eventId is required`                                                                                                                                                                    | Contract scan: schema vs. what the handler reads                                                            | **High.** Two tools no schema-following client could use — and every existing test passed, because every test called them the way the handler wanted                                      |
| 20  | Three tools declared `required: []` while their handlers demanded one of two ids, so the schema told a client it could call with nothing and the call was then refused                                                                                                                                                                                                                                                                                       | Same scan                                                                                                   | Medium. Now stated as `anyOf`, the constraint JSON Schema exists to express                                                                                                               |
| 21  | Six arguments were read by handlers and never declared, including a `reason` on achievement dismissal — an agent could record why it dismissed something and had no way to know                                                                                                                                                                                                                                                                              | Same scan                                                                                                   | Medium. Undiscoverable behavior; provenance quietly lost                                                                                                                                  |
| 22  | `brandops://profession/profession/identity` — entity ids already began with `profession/` and the provenance template prefixed it again                                                                                                                                                                                                                                                                                                                      | Provenance-resolvability scan                                                                               | Low. A doubled authority segment is always a bug, never a namespace                                                                                                                       |
| 23  | **19 of 40 tools had never had their success payload validated.** The conformance sweep drove every tool, but against a seed workspace with no twin, contacts, artifacts, achievements, opportunities, proposals or projects — so most landed on a "not found" branch and the sweep looked exhaustive while checking refusals                                                                                                                                | Branch-coverage measurement of the existing sweep                                                           | **High as a verification defect.** It is how defects 4 and 5 shipped. Closed with a populated fixture and a coverage floor                                                                |
| 24  | `computeProjectIntelligence` threw on `project.tags.length` for any project record without `tags` — a field the `Project` type declares required and nothing enforces, since `withDefaults` does not normalize `builderActivity.projects` at all                                                                                                                                                                                                             | The populated sweep, which surfaced it as `handler_error`                                                   | Medium. The same lying-type shape as the registry maps: a type promising totality nothing guarantees                                                                                      |
| 25  | **Two promote capabilities ran unapproved.** `builder.twin-proposals.accept` and `builder.achievements.verify` were `access: 'auto'`, so an agent holding either grant could accept the Twin proposal it had just created, or verify the achievement it had just reported. A second capability list in `builder/mcpBuilderCapabilities.ts` documented `'approval'` for both — in a place nothing consulted — while the registry that enforces said otherwise | Adding the capability-family taxonomy surfaced the duplicate list; comparing the two exposed the divergence | **Highest severity found.** It inverts the fourth invariant — _propose, never promote_ — and this document had been certifying that invariant as met                                      |

Defects 7 through 13 share one shape, and it is the shape worth naming: **a module that is correct
in isolation and wrong because something else exists.** A second workspace-id default, a second
firewall entry point, a second trust derivation, a type that promises more than its constructor
delivers. None of them is a bug in the code you are reading; each is a bug in the pair. The
codebase's recurring failure is duplication that drifts, not logic that is wrong — which is why the
fixes are all _collapses_ (one resolver, one entry point, one derivation, one total map) rather than
patches.

A deliberate scan for the class — every exported function name defined in more than one source file,
plus every module no source file imports — found the last of them and then stopped finding more. The
remaining duplicate names (`promoteToDurableMemory` and friends across `candidateMemory` /
`memoryFirewall`) are thin re-export aliases over a single implementation, so they cannot drift and
were left alone.

Defects 16 and 17 are worth separating from the rest: they were invisible _because the
certification passed_. The live durable-execution run used two gateway processes **sequentially** —
the second read the file after the first had exited — which is precisely the arrangement in which a
stale snapshot and a clobbering write both look correct. Overlap the processes and the second
destroys the first. A passing test can hide a defect by testing the one ordering that works.

The fix is the pattern the app already used: `storage.withWorkspaceMutation` reads, mutates, and
compares-and-swaps. `scripts/lib/workspaceStore.mjs` is the same contract against a file — read fresh
on every call, and never overwrite bytes that changed underneath. On a conflict it refuses and says
so rather than guessing at a merge, because guessing is how the lost-update bug happened.

Defects 11, 14 and 15 are _verification_ defects, and they are the most uncomfortable of the
seventeen: a gate reporting success without running, a security assertion that could only pass, and an
entire directory the compiler never sees. They are worse than ordinary bugs because they are what
was supposed to catch ordinary bugs.

Defects 4 and 5 deserve a note. Both were **caught by the mechanism under test**: the server
validated its own result, found it did not match the schema it had published, withheld
`structuredContent`, and said why. That is the behaviour working — a declared schema is a promise,
and the promise was checked rather than assumed. They are recorded as defects because the schema was
wrong, not because the enforcement was.

Defect 3 produced the cleaner fix of the six. Rather than special-casing tool names in the protocol
adapter, `createsTask` became a registry fact: a capability that _mints_ durable work returns a
`CreateTaskResult`; reading or cancelling one creates nothing and returns the ordinary envelope its
schema describes. The adapter stayed dumb, which is the architecture's one rule.

All six are fixed, each with a regression test.

---

## 5. Certification matrix

| Claim                                                                                                                          | Status                               | Evidence                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Small canonical tool surface, registry-derived                                                                                 | **CERTIFIED**                        | 40 capabilities, 1:1 tool mapping, `capabilityRegistry.ts`                                                                                                                                                                                                    |
| Least-privilege discovery                                                                                                      | **CERTIFIED**                        | Scoped `tools/list`; verified in test and live                                                                                                                                                                                                                |
| Every read flows through identity → workspace → authorization → context policy → scope → provenance                            | **CERTIFIED**                        | `gateway.ts` pipeline; `mcpSuccessCriterion.test.ts`                                                                                                                                                                                                          |
| Every mutation flows through identity → intent → capability → policy → approval → execution → verification → receipt → outcome | **CERTIFIED**                        | Round trip, steps 3–9                                                                                                                                                                                                                                         |
| External AI proposes, never promotes                                                                                           | **CERTIFIED (corrected 2026-08-31)** | `AGENT_REPORTED` on every agent write; promotion needs a user action. This row previously read CERTIFIED while two promote capabilities ran unapproved — see defect 25. Both are now approval-gated and covered by a behavioural test, not a registry reading |
| External content passes the Memory Firewall                                                                                    | **CERTIFIED, both directions**       | `memoryScreen.ts` screens agent-authored text arriving inbound; `mcp/client.ts` screens output from tools BrandOps calls — the directive's literal clause, satisfiable only once BrandOps could call one                                                      |
| Explicit agent identity, trust, expiry, rate limits, revocation                                                                | **CERTIFIED except delegation**      | `policyEngine.ts`; no on-behalf-of chains                                                                                                                                                                                                                     |
| A connection is not an authorization                                                                                           | **CERTIFIED**                        | Re-resolved per call; no per-connection state                                                                                                                                                                                                                 |
| Separate risk tiers                                                                                                            | **CERTIFIED**                        | 5 tiers with distinct obligations                                                                                                                                                                                                                             |
| Consequential tools never bypass approval                                                                                      | **CERTIFIED**                        | Fail-closed invariant + protocol-level refusal                                                                                                                                                                                                                |
| Idempotency and replay protection                                                                                              | **CERTIFIED**                        | Adversarial suite                                                                                                                                                                                                                                             |
| Structured output schemas                                                                                                      | **CERTIFIED**                        | Declared per tool and enforced at emission                                                                                                                                                                                                                    |
| Tasks extension over canonical Plan/Execution state                                                                            | **CERTIFIED**                        | Projection only; no second task engine                                                                                                                                                                                                                        |
| Adversarial test suite                                                                                                         | **CERTIFIED**                        | 30 tests across the named attack classes                                                                                                                                                                                                                      |
| Interoperability with more than one client/runtime                                                                             | **UNVERIFIED**                       | Both of _our_ transports driven end to end. That is our transport, not a second vendor's client                                                                                                                                                               |
| Remote server consumable by a hosted client                                                                                    | **NOT READY**                        | No TLS, no authorization server, workspace JSON export still required (G1)                                                                                                                                                                                    |
| Resources (`brandops://…`)                                                                                                     | **CERTIFIED**                        | `resources/list` (singletons only), `resources/templates/list` (grant-scoped), `resources/read` through the same governed path; spec-conformant `-32602` on a missing resource                                                                                |
| BrandOps as MCP client                                                                                                         | **CERTIFIED for the consuming path** | Operator-registered servers, allowlist intersected with `tools/list`, injection screen + Memory Firewall on every result, verified live against our own gateway. No third-party connector is wired, so live third-party consumption is UNVERIFIED             |
| Prompts / MCP Apps                                                                                                             | **ABSENT**                           | G15, G16, Phase 5, optional by design                                                                                                                                                                                                                         |

---

## 6. What "UNVERIFIED" means here

It means what it says. Nobody has pointed Claude Desktop, ChatGPT, Cursor or VS Code at this server
and watched it work. What _has_ happened is that both gateway processes were driven end to end over
real JSON-RPC with spec-shaped requests, and that the protocol behaviour is covered by contract
tests (`mcpProtocol.test.ts`, `mcpHttpTransport.test.ts`) written against the published
specification rather than against our own assumptions.

That is a stronger position than "it compiles" and a weaker one than "it interoperates". The gap is
named rather than papered over, and closing it requires a third-party client and, for hosted
clients, the G1 deployment work.

---

## 7. Re-running this certification

```bash
npx tsc --noEmit
npx eslint .
npx vitest run                                    # expect 1122 passing, 212 files
npx vite build

npx vitest run tests/unit/mcpSuccessCriterion.test.ts   # the round trip
npx vitest run tests/unit/mcpAdversarial.test.ts        # the attack suite
npx vitest run tests/unit/mcpStructuredOutput.test.ts   # the output contract
```

For the live leg, export a workspace from the Connected Agents panel and run the stdio gateway with
`BRANDOPS_MCP_TOKEN` and `BRANDOPS_MCP_WORKSPACE` set, or `npm run mcp:http` for the HTTP binding.
A `2026-07-28` request must carry `io.modelcontextprotocol/protocolVersion`, `clientInfo` and
`clientCapabilities` in `params._meta`, and must declare `io.modelcontextprotocol/tasks` under
`clientCapabilities.extensions` to receive task-shaped results.

---

## 8. Verdict

**The success criterion is met.** An external AI can discover a correctly limited surface, retrieve
evidence-backed context with provenance, produce an Artifact, convert intelligence into a governed
Plan, request durable execution, meet the approval boundary and be unable to cross it, inspect
status across a process restart, receive a Receipt, report an Outcome, and hand the workspace to a
different AI that finds the canonical state intact and the first client's task handle still not its
own.

**It is not deployed, and it has not met another vendor's client.** Those are the two things this
document will not claim.
