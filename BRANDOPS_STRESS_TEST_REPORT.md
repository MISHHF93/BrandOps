# BRANDOPS STRESS / FAILURE-INJECTION TEST REPORT

**Last updated:** 2026-08-31 (re-audited)
**Method:** Failure-injection + concurrency/idempotency tests re-run against the real tree.
**Baseline:** `tsc -b` clean, `eslint` clean, `vite build` OK, **1122 tests / 220 files passing**.

> Honesty note: the prior report (2026-08-30) cited tests that do not exist
> (`gateway.test.ts`, `commandExecution.test.ts`, `idempotency.test.ts`,
> `linkedInSync.test.ts`, `linkedInOAuth.test.ts`, `storage.test.ts`,
> `contextDelivery.test.ts`) and overclaimed a "provider-unavailable → falls back to
> local model" behavior. Real coverage is re-pointed below. There is NO in-process
> auto fallback to a local model when the hosted provider fails — the pipeline returns
> `ok:false` on provider failure; model _routing_ between configured hosts lives in
> `aiAskRouting.ts` and is separate.

---

## FAILURE-INJECTION / CONCURRENCY MATRIX (real)

| Failure Mode                                       | Status            | Real Evidence                                                                                                                                                                     |
| -------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gateway prompt-injection variants                  | **TESTED**        | `adversarialSecurity.test.ts` — 6 injection-family variants blocked (instruction-override, persona, markup, exfiltration incl. `hidden system prompt`, override, disregard)       |
| Control-char / over-length input sanitization      | **TESTED**        | `adversarialSecurity.test.ts` — control chars stripped, length capped                                                                                                             |
| Oversized evidence arrays                          | **TESTED**        | `adversarialSecurity.test.ts` — capped at 12 refs, never unbounded                                                                                                                |
| Approval fail-closed (approval-access capability)  | **TESTED**        | `canonicalLoopEndToEnd.test.ts`, `adversarialSecurity.test.ts` — `action.request` only yields a pending approval-gated request; a capability that fails to produce one is blocked |
| Capability-not-granted (read session / no grants)  | **TESTED**        | `canonicalLoopEndToEnd.test.ts`, `concurrencyAndFailure.test.ts`                                                                                                                  |
| Unknown/revoked token                              | **TESTED**        | `agentInterop.test.ts`, `adversarialSecurity.test.ts` — throws E_UNAUTHORIZED                                                                                                     |
| Session revocation blocks in-flight calls          | **TESTED**        | `adversarialSecurity.test.ts`                                                                                                                                                     |
| Gateway idempotency (replay same key)              | **TESTED**        | `adversarialSecurity.test.ts` — cached result, no double creation                                                                                                                 |
| Event dedupe (re-ingest same key)                  | **TESTED**        | `concurrencyAndFailure.test.ts` — ledger does not grow                                                                                                                            |
| Plan double-execution                              | **TESTED**        | `P0-security.test.ts` — second execution rejected; one execution_started checkpoint                                                                                               |
| Approval bypass (draft/rejected cannot execute)    | **TESTED**        | `P0-security.test.ts`                                                                                                                                                             |
| Learning state bounds                              | **TESTED**        | `concurrencyAndFailure.test.ts` — signals ≤ 500, outcomes ≤ 200, pref-hints ≤ 200                                                                                                 |
| Empty-step verification (No NaN score)             | **TESTED**        | `concurrencyAndFailure.test.ts`                                                                                                                                                   |
| Storage round-trip stability                       | **TESTED**        | `concurrencyAndFailure.test.ts`, `agentInteropStorageRoundTrip.test.ts` — sessions/events/proposals/trust levels preserved                                                        |
| Preference-confidence regression (stale-count bug) | **TESTED**        | `outcomeLearning.test.ts` — confirmations raise confidence; contradictions lower it                                                                                               |
| Provider network retry/backoff (fetch)             | **TESTED**        | `retryWithBackoff.test.ts` — 500/429/network/permanent(401/403)/maxRetries                                                                                                        |
| Provider unavailable at pipeline level             | NOT auto-fallback | `aiPipelineRunner.ts` returns `ok:false`; NO silent local-model fallback. Local model is chosen at routing time, not as a crash fallback                                          |
| Tool timeout                                       | NOT_APPLICABLE    | Tool calls are synchronous; no async tool timeout model                                                                                                                           |
| Webhook (duplicate/replayed)                       | UNSUPPORTED       | Webhook ingestion not implemented                                                                                                                                                 |
| Async queue delay                                  | NOT_APPLICABLE    | No async queue in-process                                                                                                                                                         |
| Database/storage write failure                     | PARTIAL           | Throws; no dedicated graceful-handling test                                                                                                                                       |
| Multiple-tabs concurrent write                     | GAP (medium)      | `storage.local` shared across tabs; single-actor serialization expected, but no real multi-tab race test                                                                          |
| Recursive automation / agent loop                  | NOT_IMPLEMENTED   | No automation execution engine; no loop detection                                                                                                                                 |
| Budget exhaustion                                  | NOT_IMPLEMENTED   | No token/model budget enforcement                                                                                                                                                 |
| Connector outage / OAuth refresh                   | UNVERIFIED        | LinkedIn is overlay/OAuth UI only; no live credentials; no refresh-flow test                                                                                                      |

---

## SURVIVAL VERIFICATION (real)

- **Browser refresh:** checkpoints/plans persisted to local-first storage; reload via normalizers + `withDefaults` (`checkpointStore.test.ts`, `planStore.test.ts`, `agentInteropStorageRoundTrip.test.ts`).
- **Duplicate execution:** tool-call idempotency + plan state machine + event dedupe (`P0-security.test.ts`, `adversarialSecurity.test.ts`, `concurrencyAndFailure.test.ts`).
- **Partial failure:** plan steps are checkpointed individually; verification closes outcomes per step (`planVerifier.test.ts`, `planExecutor.test.ts`).
- **Approval bypass:** drafted/rejected plans and approval-access capabilities fail closed (`P0-security.test.ts`, `canonicalLoopEndToEnd.test.ts`).
- **Injection:** prompt-injection screening at the gateway rejects all tested variants (`adversarialSecurity.test.ts`).

---

## NOT TESTED / GAP ANALYSIS

| Gap                                             | Severity         | Remediation                                                                           |
| ----------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| Multi-tab concurrent `storage.local` write race | Medium           | Add a tab-concurrency contract test + last-writer-wins/patch-merge strategy           |
| Storage read/write failure graceful handling    | Medium           | Wrap storage IO; surface a recoverable error to UI                                    |
| Provider-level timeout injection                | Low              | Simulate hosted-completion timeout → assert pipeline `ok:false` (not silent fallback) |
| Token/model budget enforcement                  | Low/Not-in-scope | Add token counting + budget gate                                                      |
| Recursive-automation / agent-loop detection     | Low              | On automation execution engine (not yet present)                                      |
| Webhook ingestion (duplicate/replay)            | N/A              | Not in scope; label UNSUPPORTED                                                       |
| Live connector outage / OAuth expiry+refresh    | Unverified       | Requires a real connector backend + credentials (currently absent)                    |

---

## CONCLUSION

The system correctly handles the most critical failure modes that the architecture
can actually exercise on-device: approval bypass, prompt injection, capability grants,
session revocation, duplicate execution / idempotency, event dedupe, storage
round-trip stability, and bounded learning state — all covered by real, passing tests.
Two medium gaps remain unproven (multi-tab write race, storage-IO failure handling),
and anything requiring a live backend (connectors, provider auto-fallback, webhooks)
is honestly UNVERIFIED / NOT_IMPLEMENTED rather than claimed working.
