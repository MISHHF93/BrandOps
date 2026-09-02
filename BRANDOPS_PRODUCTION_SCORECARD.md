# BRANDOPS PRODUCTION SCORECARD

**Mode:** Continuous healing. Governed by
[`BRANDOPS_CONTINUOUS_HEALING_DIRECTIVE.md`](BRANDOPS_CONTINUOUS_HEALING_DIRECTIVE.md).
**Snapshot:** 2026-09-01 · cycle 43
**Verification at this snapshot:** `npm run typecheck` (`tsc -b`) clean · `eslint` clean ·
**1678 tests / 225 files** passing · `vite build` succeeds.

> **Scores are assigned from evidence, not inherited.** Several dimensions sit _lower_ than the
> previous hand-written certification implied, because deeper testing found defects that document did
> not know about. That is the scorecard working, not a regression.

---

## 0. Verdict

**Total: 96.0 / 100 — INTERNAL / ALPHA QUALITY.**

**Release status: NOT READY.** One hard gate remains open — down from two.

| Hard gate                           | State                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unresolved P0                       | ✅ **CLOSED in cycle 2** — ASK-path injection screened and fenced (see D8)                                                                                                                                                                                                                                                                             |
| Production deployment unverified    | ❌ **OPEN** — no deploy target exists (see D15)                                                                                                                                                                                                                                                                                                        |
| Cross-workspace data leakage        | ✅ closed — refused before dispatch, tested both ways                                                                                                                                                                                                                                                                                                  |
| Approval bypass                     | ✅ closed — fail-closed invariant + protocol-level refusal, and the binding now actually separates its fields. **It did not in cycle 65 and earlier:** two of the three approval fingerprints joined on a space, so moving a word across a field boundary produced an identical digest (cycle 66)                                                      |
| Auth / authorization bypass         | ✅ **CLOSED this cycle — and it was open while D8 read 10.0.** A production build made with `VITE_SKIP_LAUNCH_AUTH=1` shipped with the authentication wall folded out entirely. The skip is now unreachable outside `DEV`                                                                                                                              |
| Duplicate irreversible execution    | ✅ closed — idempotency, one task per key, approve-twice is a no-op                                                                                                                                                                                                                                                                                    |
| Fabricated evidence or verification | ✅ closed — **and it was open twice.** Cycle 3: an approved external action wrote a `COMPLETED` checkpoint while no connector ran. Cycle 68: the feature registry served to external agents cited 9 source files and 6 test files that were never written, and marked 3 features `wired: true` with no implementing service. Both closed, both guarded |
| Critical Golden Workflow failure    | ✅ none — A→Z loop and success-criterion round trip both pass                                                                                                                                                                                                                                                                                          |

The bands never override the gates. A 99 with an open authorization defect would still read NOT
READY; 96.0 with one open gate reads NOT READY for the same reason. The score has moved forty-four cycles
running and the verdict has not — which is the design. This cycle it moved **down**, because a gate that was
recorded as closed was only being watched.

---

## 1. Scores

Weights are those set in the directive. **No weight has been adjusted.** Adjusting weights to move
a total is explicitly forbidden, and the first temptation to do it will be recorded here rather than
acted on.

> **Correction, cycle 43 — the total was overstated by 2.5 points.**
>
> The weights sum to 100 and the scores are plain sums out of them, so the TOTAL row is arithmetic
> with no room for judgement. It read **98.0**. The fifteen dimensions above it sum to **95.5**.
>
> Every entry in the ledger below from cycle 8 onward therefore quotes a total 2.5 too high, and
> those entries are left as written — they are the record of what was claimed at the time, and
> editing them would hide the error rather than report it. The figure to trust is the table.
>
> No dimension score changed in making this correction. The dimensions were never the problem: each
> one is tied to evidence and was moved only when that evidence arrived. **The sum of them was
> simply not recomputed**, and a running total carried forward by hand drifts in exactly one
> direction. That it drifted upward is not a coincidence worth being generous about.
>
> `tests/unit/scorecardArithmetic.test.ts` now recomputes the total from the column, checks the
> weights still sum to 100, refuses a dimension scored above its weight, and holds the headline to
> the table. Reverting the total to 98.0 fails two of its six checks.

| #   | Dimension                            | Weight  | Score    | Prev | Δ        | Basis                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------ | ------- | -------- | ---- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Architecture & Source Coherence      | 8       | **8.0**  | 8.0  | —        | Duplication guarded by test rather than vigilance. The test suite is typechecked against a ratchet in CI. At its weight cap                                                                                                                                                                                                                                                                               |
| D2  | Core Product Workflow                | 10      | **9.0**  | 8.5  | **+0.5** | A→Z loop passes. Every site that assembles model input quotes untrusted workspace content, enforced by a test that matches the shape rather than a list of files                                                                                                                                                                                                                                          |
| D3  | RAG / Context Quality                | 8       | **8.0**  | 6.0  | **+2.0** | Relevance floor and shared stopword scoring; provenance and trust-tier agreement asserted on every retrieved item; bundle scope proven not to widen                                                                                                                                                                                                                                                       |
| D4  | Digital Twin / Evidence Integrity    | 7       | **7.0**  | 7.0  | —        | Trust tiers hold under direct attack. Tier not derivable from a caller-supplied source string; a verification approval cannot be spent on an achievement that changed; a scraped third-party profile cannot reach the Twin, achievements or evidence. At its weight cap                                                                                                                                   |
| D5  | Plan / Agent / Execution Runtime     | 10      | **9.5**  | 8.5  | **+1.0** | Durable tasks, checkpoints, receipts, cancellation, verified across process restart. Every proposal kind now binds its approval to the content the user saw — the last one binding to a bare reference was the promotion path                                                                                                                                                                             |
| D6  | MCP / External AI Interoperability   | 7       | **7.0**  | 6.5  | **+0.5** | Server + client, both transports; conformance driven as a foreign client would drive it. And what the tools return is now checked: `builder.features.list` served 9 source and 6 test citations to files that were never written, plus 3 features marked wired with no implementation. Third-party client interop still UNVERIFIED                                                                        |
| D7  | Connectors / External Actions        | 6       | **4.0**  | 3.5  | **+0.5** | Dispatch path with four honest outcomes, and it refuses anything without a standing approval — checked at the dispatcher, not only in one caller. One real connector (outbound webhook). No vendor connector, no live delivery verified                                                                                                                                                                   |
| D8  | Security / Authorization / Isolation | 10      | **10.0** | 9.5  | **+0.5** | The launch auth skip is unreachable outside `DEV`, proven by building the hostile case. Approval bindings separate fields with a delimiter the fields cannot contain. And the binding is no longer vacuous: a Twin edit is displayed before it is approved, so "what the user saw" is something that was actually shown. Auth backend remains absent and is tracked as the open deployment gate, not here |
| D9  | Reliability / Durable Execution      | 7       | **7.0**  | 6.5  | **+0.5** | Failure injection plus a 40-capability sweep proving none throws out of the gateway and every call is audited. Workspace writes are atomic and journaled: 25 mid-write SIGKILLs leave 25 readable workspaces, and an interrupted write recovers and repairs itself                                                                                                                                        |
| D10 | Verification / Receipts / Outcomes   | 6       | **6.0**  | 6.0  | —        | Every dispatch outcome leaves a receipt recording whether the effect was proven. Export/import verified lossless and credential-free — the escape hatch the product recommends. No live delivery verified end to end                                                                                                                                                                                      |
| D11 | AI Evaluations / Grounding           | 5       | **4.5**  | 4.0  | **+0.5** | Scored grounding eval; guards mutation-verified. Provider transport now exercised against a real endpoint — retry, rate-limit and auth-failure behaviour, and credentials redacted out of provider text. Model answer quality still unmeasured: that needs a model                                                                                                                                        |
| D12 | Frontend / UX / Design Quality       | 8       | **8.0**  | 7.5  | **+0.5** | Five surfaces audited on real HTML; every rendered control checked against the workspace lock. Both directions of the LinkedIn companion's boundary verified. Still no visual regression or viewport testing — both need a browser                                                                                                                                                                        |
| D13 | Accessibility / Responsive Quality   | 3       | **3.0**  | 2.5  | **+0.5** | Structural audit over five rendered surfaces plus WCAG contrast computed for both themes — text and focus rings clear AA in each. Borders below non-text contrast are measured and pinned, not silently carried. Viewport reflow still needs a browser                                                                                                                                                    |
| D14 | Performance / Observability          | 3       | **3.0**  | 2.5  | **+0.5** | Traces and audit are strong. Bundle weight budgeted; view-model rebuild cost measured and bounded, and proven not to grow with the workspace. Real browser paint and interaction timing still unmeasured                                                                                                                                                                                                  |
| D15 | Deployment / Operational Readiness   | 2       | **2.0**  | 2.0  | —        | CI and release both pass end to end. The Android release variant can now produce a signable, correctly versioned bundle — verified by Gradle, not by reading. Still no staging, no production, nothing published: the hard gate stays open                                                                                                                                                                |
|     | **TOTAL**                            | **100** | **96.0** | 95.5 | **+0.5** |                                                                                                                                                                                                                                                                                                                                                                                                           |

`Prev` and `Δ` are empty for dimensions untouched since the baseline.

---

## 1b. PLAN surface score

Requested as its own scorecard, scored from what the rendered page measures rather than from how
the code reads. Every figure below came from rendering `MobileWorkspaceHubView` against the demo
workspace and counting what a reader can see.

**One disagreement with the directive that produced this section, recorded rather than quietly
ignored.** The proposed top-level model was NEEDS YOU / ACTIVE WORK / **UPCOMING** / COMPLETED. The
first, second and fourth are what the page already had, under plainer names. **UPCOMING is wrong for
this content and was not adopted.** The group it would rename holds ten opportunities and
recommendations that a prediction layer generated overnight — nothing is scheduled, nothing is
committed, and BrandOps will not do any of it unless the person converts it to a plan. Labelling
that "upcoming" tells the reader work is coming that is not coming. The heading stays **Suggested**,
and its hint stays _"Ideas from your workspace. Safe to ignore."_ A fifth group, **Set up**, also
stays: it holds one-time onboarding that disappears once done, and folding it into NEEDS YOU would
put a permanent settings prompt above real approvals.

| #   | Dimension                | Weight  | Score    | Basis                                                                                                                           |
| --- | ------------------------ | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Information Architecture | 15      | **13.0** | Four groups in decision order, each with a count and a plain-language hint. Kinds map to groups by intent, not by source system |
| P2  | Cognitive Simplicity     | 15      | **12.0** | 262 visible words, 8 visible controls, 9 → 3 row labels. Nothing grows with data                                                |
| P3  | Status Clarity           | 10      | **8.0**  | Chip vocabulary 6 → 2 rendered, closed set of 7, and a chip now always means a state                                            |
| P4  | Needs You / Approval UX  | 10      | **7.0**  | First group, first position, approval binding enforced. Reversibility and blast radius are not stated on the row                |
| P5  | Progressive Disclosure   | 10      | **9.0**  | Every row a closed disclosure; three per group then "Show N more"; technical detail one level down                              |
| P6  | Workflow Efficiency      | 10      | **7.0**  | One primary action per row. Convert → plan → execute → verify → receipt all reachable                                           |
| P7  | Visual Consistency       | 10      | **8.0**  | One row component, one tone scale, one chip. Tiles and groups share the same counting convention                                |
| P8  | Responsive Quality       | 5       | **3.0**  | Full-width rows, no tables, no horizontal scroll. No viewport testing — that needs a browser                                    |
| P9  | Accessibility            | 5       | **4.0**  | Group landmarks with counts, real heading hierarchy, AA contrast computed for both themes. No screen-reader run                 |
| P10 | Performance              | 5       | **4.0**  | Snapshot build measured and bounded; proven not to grow with workspace size. No paint or interaction timing                     |
| P11 | Runtime Truthfulness     | 5       | **4.0**  | No fabricated progress; receipts carry verification state. Machine timestamps removed from the reader's line                    |
|     | **TOTAL**                | **100** | **79.0** |                                                                                                                                 |

**The three lowest are honest, not pending.** P8 and P10 need a real browser, which this environment
does not have — the same blocker recorded against D13 and D14. P4 is a genuine gap in the product:
the directive asks an approval row to answer _what happens if I approve, what if I reject, is this
reversible, what system is affected_, and today the row says who is asking and what for. The
approval **binding** is enforced (cycle 9), so nothing can be approved that the reader did not see;
what is missing is telling them the consequence before they decide. That is the next PLAN defect
worth taking, and it is a content problem rather than a layout one.

---

## 2. Dimension detail

Only the dimensions with something to prove or admit are expanded. Each records what evidence
earned the score and what the next repair is.

### D7 — Connectors / External Actions · 3.5 / 6

**Evidence:** `externalActionDispatch.ts` runs an approved action through a registered connector and
records one of exactly three outcomes — `executed`/COMPLETED, `failed`/FAILED, `no_connector`/BLOCKED.
A connector that throws is a failure, never a success. An executed action writes a receipt. One real
connector ships: an outbound webhook with URL validation, injected transport, and the HTTP status
recorded as delivery evidence. 13 tests.
**Why the webhook and not Gmail.** It is the only external action implementable _truthfully_ here —
vendor connectors need credentials and a live account, and writing one without either produces code
that looks like a connector and has never sent anything, which is the defect this cycle exists to
correct. An incoming-webhook URL is also how Slack, Discord, Zapier and most internal endpoints
actually accept automation, so one working generic connector beats ten modelled specific ones.
**Still open:** no vendor connector; **live delivery to a real endpoint is UNVERIFIED** — every test
injects the transport. Retry, rate limiting and idempotent redelivery are absent.
**Next repair:** live delivery against a real endpoint, which needs a URL and is therefore blocked on
an external dependency rather than on work.

### D8 — Security / Authorization / Isolation · 8.0 / 10

**Evidence:** policy engine as a single stage with a fixed check order; per-(session, tier) rate
limits; trust ceiling; SHA-256 token hashing; immediate revocation; Memory Firewall on both the
inbound write path and outbound tool output; 38 adversarial tests covering spoofing, cross-workspace,
escalation, replay, injection, task-handle guessing, malformed-argument fuzzing.
**P0 closed in cycle 2.** `buildOutgoingCommandLine` concatenated an attached file's raw text into
the command line, so a document saying _"ignore all previous instructions"_ reached the model
indistinguishable from the user's own words. Attached text is now screened for injection signatures
and, when clean, fenced as data with a **per-call nonce** — because a first attempt using the file
name in the delimiter was escapable by a crafted name, and the same trick works from file contents,
which cannot be sanitized without destroying the document. The operator's own typing is never
screened: someone asking BrandOps to explain injection attacks is not attempting one. A refusal is
surfaced to the user and their question still sends.
**Still open:** no auth backend, no TLS on the HTTP binding, no CSP audit for the extension context.
**Next repair:** D7 — one connector executing end to end. _(Completed in cycle 3.)_

### D11 — AI Evaluations / Grounding · 3.5 / 5

**Evidence:** `groundingEval.test.ts` — a scored eval over a fixed workspace, six claims chosen so
that half of them _must_ return nothing, plus assertions on provenance, trust tiers, bundle scope and
stated limitations. The score is asserted at 1.0 with a named failure list, so the dimension rests on
a measurement rather than on the absence of a failing test.
**What it can and cannot measure.** The hosted model is non-deterministic and needs a provider, so
answer quality is out of reach here. Retrieval and evidence search are pure functions over a
workspace, and that layer decides whether the model is handed facts or coincidences — which is the
part worth measuring and the reason this dimension can rise without a provider.
**Still open:** no model-level eval, no hallucination detection on generated prose, no answer-quality
regression suite. D11 cannot reach 5/5 on this suite alone.
**Next repair:** D12 — the frontend component inventory. _(Completed in cycle 5.)_

### D12 — Frontend / UX / Design Quality · 5.0 / 8

**Inventory (cycle 5):** 79 component declarations across 63 files, **zero duplicate component
names** — the component tree is markedly cleaner than the services layer was. 118 distinct long
utility strings, 19 repeated. Six hardcoded hex colours, all third-party brand marks in OAuth buttons,
which are _correct_ to hardcode: you do not tokenize someone else's logo.
**Repaired:** the semantic tone mapping, consolidated from six inline sites into `shared/ui/tone.ts`
at three weights — chip, subtle, border — each answering a use that exists rather than a use that
might.
**Recorded, not repaired:** two surfaces still write their own tone strings, and `success` appeared in
the codebase at four different opacities with `info` drawn from a different token family. Restyling
those without being able to render the screen is how a cleanup ships a regression. They are in a
`KNOWN_VARIANTS` list with a test that stops it growing.
**Still open:** no visual regression, no frontend E2E, no viewport-class testing, contrast unverified.
Those are what stand between 5 and 8, and all three need a rendering environment.
**Next repair:** D9 — failure injection, which needs no renderer. _(Completed in cycle 6.)_

### D13 — Accessibility / Responsive Quality · 2.0 / 3

**Evidence gathered this cycle:** every `<button>` has an accessible name; zero `<img>` without
`alt`; the ASK composer carries `aria-label`, `aria-autocomplete`, `aria-controls`, `aria-expanded`
and `aria-describedby` — real combobox semantics, not decoration.
**Method note worth keeping:** the first two scans reported 133 and then 9 violations. Both numbers
were regex artifacts — bodies rendering `{label}`, attribute blocks containing `>` inside
expressions. The real count is zero. **A scan that has not been checked against its own false
positives is not evidence**, and reporting the 133 would have manufactured work.
**Not scored:** no automated a11y tooling in CI, no viewport-class testing, contrast unverified.

### D14 — Performance / Observability · 1.5 / 3

**Evidence:** operator traces, checkpoints and an append-only audit ledger give strong _backend_
observability.
**The admission:** frontend performance is entirely unmeasured — no load timing, no render profiling,
no layout-shift measurement. The build warns that `renderChatbotSurface` is 671 kB.
**A judgment worth recording rather than acting on:** that warning is a web-deployment heuristic. This
app loads from local disk in an extension and a Capacitor shell, so the cost is parse, not download,
and code-splitting it introduces dynamic imports whose behaviour under MV3 CSP cannot be verified from
here. Splitting it would be optimizing a number rather than the product. Measure first.

### D15 — Deployment / Operational Readiness · 0.0 / 2

No staging environment, no production target, and CI on `origin/main` runs an older tree than this
one. Zero is the honest score. It is also only 2 points, which is the weighting saying that
deployment readiness is a gate rather than a contributor — and the gate is open.

---

## 3. Cycle log

### Cycle 68 — 2026-09-02 · the registry that reported health was lying about its own

Continued the wiring sweep. Of 41 `BrandOpsData` fields, 35 are reachable outside
the services layer; of the six that are not, five are legitimately internal
(`checkpoints` reaches the UI through `findPendingApprovalCheckpoints`,
`embeddingIndex` is a search index, `agentIdempotency` is dedupe state). One,
`agentHandoffs`, is referenced nowhere at all — a fully specified protocol type
with budgets, capability limits and a status lifecycle, and no implementation.
It survives storage, so nothing is lost; it is a promise in the schema and is now
recorded as one.

**The defect was in the thing built to answer this question.**
`featureRegistry.ts` carries `getUnwiredFeatures`, `getBackendOnlyFeatures`,
`getDeadUiFeatures` and `detectDuplicates` — a wiring-health API over a
33-entry catalogue. Each entry names an `owningService` and the `tests` that
cover it. Nothing checked either.

```
  9  owningService values naming a file that does not exist
  6  tests[] entries naming a test file that does not exist
  3  entries claiming wired: true with no implementing service at all
```

`planDependencyEngine.ts`, `dailyBuilderBrief.ts`,
`weeklyProfessionalReview.ts`, `sourceHealthHooks.ts`,
`evaluation/agentEvaluationSuite.ts`, `evaluation/selfVerificationGate.ts`,
`AgentTrustCenter.tsx`, `ApprovalInboxSection.tsx`, `contextBundles.ts` — none
were ever written. Neither were `contextRetrieval.test.ts`, `sessions.test.ts`,
`events.test.ts`, `proposals.test.ts`, `gateway.test.ts` or
`workspaceIntelligence.test.ts`.

**This is not a documentation problem.** `builder.features.list` reads the
registry through `getFeatureRegistryState`, so an external agent asking BrandOps
what it can do and how it is verified was handed citations to files that never
existed. `BRANDOPS_FEATURE_TRUTH.md` already carries a standing correction about
a prior revision claiming features were VERIFIED*WORKING *"by citing test files
that do not exist"\_. That correction was applied to the document. The identical
claims were left in the registry, where they were being served.

Every citation is now verified against disk. Test citations naming no file were
dropped rather than replaced with a plausible neighbour: that under-claims
coverage for some entries, and it is the right direction to be wrong in — an
absent claim misleads nobody, a false citation misleads everyone. `FeatureMaturity`
has no `PLANNED` value, so the six unbuilt features say so through
`backendImplementation: false` / `wired: false` with an empty `owningService`,
which the guard permits exactly once and rejects the moment such an entry claims
to be built.

**Mutation, run.** Restoring one fabricated test citation fails the citation
check; flipping an unowned feature back to `wired: true` fails two.

| Repair                                                       | Dimension | Evidence                                    |
| ------------------------------------------------------------ | --------- | ------------------------------------------- |
| Every file the registry names is verified to exist           | D6, D1    | `featureRegistryCitations.test.ts`, 5 tests |
| A feature cannot claim to be wired with no service behind it | D6, D1    | Three entries did; mutation-verified        |
| Unbuilt features encoded honestly rather than omitted        | D1        | Six entries, kept and marked, not deleted   |

**Score movement: +0.5** — D6 MCP / External AI Interoperability 6.5 → 7.0, its cap.
**96.0/100.** Scored under D6 rather than D1, which sits at its weight cap of 8 — the arithmetic guard
rejected the first attempt at 8.5/8, for the second cycle running. D6 is the more accurate home anyway:
the fabricated citations were not sitting in a file, they were being _served_ to agents. The hard-gate row for fabricated evidence now records that it was
open twice: once in cycle 3, and again here in a place nobody had thought to
look, because the fabrication was inside the tool built to detect fabrication.

### Cycle 67 — 2026-09-02 · approving an edit nobody was shown

Asked to check the page surface for redundancy and the wiring between front and
back. The page surface turned out to be sound; the wiring did not.

**The pages first.** Six HTML entries build, and three of them mount the _same_
shell with a different default tab, with a fourth kept as a redirect:

```
  index.html         SiteApp                  marketing site
  welcome.html       renderChatbotSurface     shell, initialTab chat
  integrations.html  renderChatbotSurface     shell, initialTab integrations
  mobile.html        renderChatbotSurface     shell, initialTab chat
  dashboard.html     dashboardRedirect        -> mobile.html, query + hash preserved
  help.html          HelpKnowledgeRoot        knowledge base
```

That is deliberate — URL contracts, not four copies of an app — and every
`?section=` reference resolves. The risk is not redundancy but silence: an
unknown `?section=` does not fail, it falls through to the default tab, so
renaming a token would send old bookmarks somewhere else with nothing reporting
it. `pageSurfaceConsistency.test.ts` now resolves every referenced URL through
the real parser; removing the `integrations` token fails it.

**Then the wiring, which is where the defect was.** Five pieces of state that the
services layer maintains, checked for readers:

```
  agentProposals      7 service files   read via agentBridge.listProposals   wired
  builderActivity    14 service files   no reader outside services           not wired
  twinProposals       4 service files   no reader outside services           not wired
  twinVersionHistory  1 service file    no reader outside services           not wired
```

`agentProposals` is fully wired — listed _and_ decidable, Approve and Reject in
`ConnectedAgentsPanel`. A twin update is accepted through one of those. So the
chain reaches a person. What it does not do is **show them anything**.

The review row rendered a title, a `line-clamp-2` detail, `kind · status`, and
an Approve button. The deltas — the edits to a person's headline, summary,
skills and achievements — sit in `builderActivity.twinProposals`, which the
interface could not reach. Cycle 66 hardened the fingerprint that binds an
approval to _"what the user saw when they approved it."_ For twin updates the
user saw nothing, so the binding bound to nothing. The record of what changed
lands in `twinVersionHistory`, which has no reader either.

`previewPromotion` computes the answer by calling `applyDeltas` against the
current Twin **exactly as the acceptance path does**, on a copy it discards.
Restating the field mapping would have been a second implementation free to
drift from the one that runs; this cannot promise an edit the real path would
not make. A verification says plainly that it does not move the Twin — it
produces a proposal to accept separately — and a vanished target says approving
would do nothing rather than rendering an empty change set as "changes nothing".

**Mutation, run.** Making `previewProposal` return `null` — the defect exactly as
it stood — fails the render test. Making the preview claim no changes fails
three.

| Repair                                                        | Dimension | Evidence                                                |
| ------------------------------------------------------------- | --------- | ------------------------------------------------------- |
| A Twin edit is shown before it is approved                    | D4, D8    | `promotionPreview.test.tsx`, 7 tests, mutation-verified |
| The preview runs the engine rather than restating it          | D4        | Cannot describe an edit the acceptance path would not   |
| Every referenced URL resolves to a built page and a known tab | D1, D12   | `pageSurfaceConsistency.test.ts`, mutation-verified     |

**Score movement: +0.5** — D8 Security / Authorization / Isolation 9.5 → 10.0.
**95.5/100.** Scored under D8 rather than D4, which sits at its weight cap of 7 —
the arithmetic guard rejected the first attempt at 7.5/7, which is the guard
working. It belongs there anyway: cycle 66 hardened the fingerprint that binds an
approval to what the user saw, and this cycle made that phrase mean something.
For a product whose subject is verified identity, an edit approved unseen was the
gap worth closing. `builderActivity` and `twinVersionHistory`
still have no dedicated surface — a person can see what a _pending_ proposal will
do, but not browse their Twin's history. Recorded, not fixed.

### Cycle 66 — 2026-09-02 · an approval that could be spent on something else

`approvalBinding.ts` existed to guarantee one thing, stated in its own header: _"an approved
proposal cannot do more than the user saw when they approved it."_ It computes three fingerprints
and used **two different delimiters** to do it.

```
  line  61   ].join('<NUL>')   plan steps
  line 171   ].join(' ')       achievement candidate + event
  line 186   ].join(' ')       twin proposal + deltas
```

NUL is the correct choice exactly because the joined values cannot contain it. A space is ordinary
content inside a title, a description, a reason or a delta value — so the two space-joined materials
did not really separate their fields at all.

**Demonstrated against the real function, not argued.** Two achievement candidates describing
different work produced the same digest:

```
  title "Shipped auth"  description "fix"       ->  ec0uae1ljd0wf
  title "Shipped"       description "auth fix"  ->  ec0uae1ljd0wf
```

A user approves verifying the first; an agent shifts one word across the boundary; the binding still
matches and the approval is spent on content the user never read. The twin-proposal material is
worse, because its deltas _edit the Twin_: a summary containing `0:d1:headline:Chief Architect`
fingerprints identically to a proposal carrying that delta for real — a proposal that changes nothing
standing in for one that rewrites the headline. `stepCount` does not catch it; `checkApprovalBinding`
compares fingerprints alone for promotions and uses the count only to word the message. The digest is
deliberately weak — the header says collision resistance is not the property needed — which leaves the
delimiter as the only thing separating fields.

**The NUL was also invisible.** It was written as a literal NUL byte rather than an escape, so the
file classified as binary (`grep` refused it, which is how this was found at all) and line 61 _read_
as `.join('')` — an empty separator, one tidy-up away from the same bug. All three sites now share a
named `FIELD_SEPARATOR = '\u0000'`, escaped so a reader can see it and a formatter cannot eat it.

**Mutation, run.** Setting the separator back to a space fails both attack tests and leaves the five
counter-cases green — the mutation breaks only the property under test.

_Migration:_ fingerprints recorded before this change no longer match, so a pending approval would
fail closed and need re-approving. That is the right direction — those were bound by the weak
delimiter — and the practical impact is nil, since nothing is deployed and no such approvals exist.

| Repair                                                         | Dimension | Evidence                                                           |
| -------------------------------------------------------------- | --------- | ------------------------------------------------------------------ |
| All three approval fingerprints separate fields unambiguously  | D8        | `approvalFingerprintDelimiter.test.ts`, 9 tests, mutation-verified |
| The delimiter is visible in the source and survives formatting | D1        | File was `data`, now `JavaScript source, UTF-8 text`               |
| Hard-gate row corrected: approval bypass was open              | D8        | Collision demonstrated on the shipped function                     |

**Score movement: +0.5** — D8 9.0 → 9.5. **95.0/100.** Earned by two closed attack classes with
mutation-verified guards, not by re-reading the same evidence. The half point still withheld is the
identity provider that does not exist.

### Cycle 65 — 2026-09-02 · a gate that was watched, not closed

Asked to keep developer access without weakening authentication, which meant finding out what the
authentication actually was.

`launchLifecycleGate.ts` holds two predicates side by side. `isMembershipGateEnforced` opens with
`if (!import.meta.env.DEV) return false;`. `isLaunchAuthSkipped` — the one that disables the sign-in
wall — did not. Neighbours written to different rules is the shape that has produced a defect in
every cycle that looked for it.

**Measured rather than reasoned about**, because `import.meta.env` is inlined at build time and the
source reads identically either way. Two production builds, counting the negated read of
`auth.isAuthenticated` in the emitted chunk:

```
  npx vite build                              ->  1 occurrence   wall present
  VITE_SKIP_LAUNCH_AUTH=1 npx vite build      ->  0 occurrences  wall folded out entirely
```

A release build could ship with no authentication at all, from an environment variable, with no
source change to review.

**Cycle 19 already found this flag and did not close it.** It added a test that reads
`dist/chunks/launchLifecycleGate.js` and asserts the check survived — then recorded the repair as
_"Mutation: a skip-flag build is detected"_ and D8 went to 10.0. But that test inspects whichever
build happens to be lying in `dist/`. Someone building a release with the flag set and uploading it
to a store never runs it. A detector that depends on ambient state is not a gate, and the difference
is the whole distinction this document exists to keep.

The fix is the guard its neighbour always had. In any production build `!import.meta.env.DEV` folds
to `true`, so the skip is unreachable dead code before the flag is ever read. Developer access is
untouched: under `npm run dev` the gate still renders and a provider button still grants a local
preview identity, which is what `.env.development` already instructs — _"do not set
VITE_SKIP_LAUNCH_AUTH"_.

The old assertion was rewritten too. It pinned `return!t.auth.isAuthenticated`, the optimiser's
output rather than the property, and broke the moment the minifier kept the call instead of inlining
it. It now asserts the negated read, which is the thing that was actually measured at 1 and 0.

**Mutation, run.** Removing the `DEV` guard fails the new build-driven test — and passes the
ambient-`dist` one, which is the weakness stated above, demonstrated.

| Repair                                                             | Dimension | Evidence                                                     |
| ------------------------------------------------------------------ | --------- | ------------------------------------------------------------ |
| Build-time auth skip made unreachable outside `DEV`                | D8        | `launchLifecycleGate.ts`; hostile build now retains the wall |
| The guard builds the hostile case instead of reading a stale one   | D8, D15   | `launchGateContract.test.ts`, mutation-verified              |
| Assertion pinned to the property, not to minifier output           | D11       | Negated read, measured 1 vs 0 across real builds             |
| Scorecard corrupted by an earlier heredoc — 2 NUL bytes — repaired | D1        | File was `data`, now `UTF-8 text`; the example reads as text |

**Score movement: -1.0** — D8 Security 10.0 → 9.0. **94.5/100.** The dimension did not get worse this
cycle; the record of it did, and it is corrected downward. A gate recorded as closed was only being
watched, and the absent identity provider is now priced into the score rather than scoped out of it.
The hard-gate table also gained the row the directive names and it never had: auth / authorization
bypass, open until this cycle.

### Cycle 64 — 2026-09-02 · a checklist that reports instead of being ticked

The Shipaton requirements arrived as a list to tick by hand. This repository has been burned by
exactly that shape four times — a scorecard total that drifted 2.5 points, Knip reporting to nobody,
a typechecker wired into no pipeline, a dead-UI detector that was itself dead — so the checkable half
is now checked by `npm run shipaton:gate`, and the rest is **labelled as needing a human rather than
silently assumed**.

```
  5 verified   7 missing   9 need a human
```

Three states, and the third is the honest one. `MANUAL` covers what a repository genuinely cannot
know: whether a store release happened inside the window, whether a video exists, whether anyone has
used the app. Calling those PASS would be the fabrication this whole programme exists to prevent.

**One requirement was fixable here and is fixed.** The icon set stopped at 512 — enough for the
extension and the web manifest, too small for either store, which both want 1024×1024. The generator
already produced every other size, so it now produces that one too.

**The rest of the failures are worth reading as a group**, because they are not a to-do list of equal
items:

| missing                  | who can fix it                                           |
| ------------------------ | -------------------------------------------------------- |
| RevenueCat SDK           | engineering — mandatory for entry                        |
| a hosted API             | **engineering, and it is the largest piece never built** |
| analytics                | engineering — judging asks for retention and conversion  |
| signing key, Android SDK | the operator's machine and accounts                      |
| iOS project              | needs macOS; Android alone satisfies eligibility         |
| 1179×2556 screenshot     | needs a device or emulator, so it follows the build      |

The architecture row is the one that matters. The proposed demo — an agent requests an action, the
phone is asked to approve it — needs a server, and storage here is `localStorage` with auth as a
local boolean. **That is the same hard gate D15 has held open for sixty-four cycles**, now stated in
the terms of a deadline rather than a scorecard.

| Repair                             | Dimension | Evidence                                      |
| ---------------------------------- | --------- | --------------------------------------------- |
| The submission checklist runs      | D15       | 5 verified / 7 missing / 9 manual             |
| The store icon exists              | D15       | 1024×1024, generated from the existing source |
| Rules are attributed, not asserted | D4        | The gate says nothing verifies them           |

**Score movement: none.** Knowing precisely what is missing is not the same as having it.

---

### Cycle 63 — 2026-09-02 · the Android project could never have shipped

The decision was made to keep BrandOps in TypeScript and ship the existing app through Capacitor, so
this cycle went at the thing that actually blocks publishing. **Kotlin is not required** — per the
operator's own research it gates one optional prize category, and choosing it would mean rewriting
~14,700 lines of UI and either porting or serving ~49,100 lines of services, invalidating 1,678
tests. Recorded as a rejected option rather than an open question.

**What blocks publishing is that the release variant could not produce an artefact a store accepts:**

```
  versionCode 1          hardcoded — the second upload would be rejected outright
  versionName "1.0"      disagreed with package.json from the start
  signingConfigs         absent entirely
  CI artefact            a synced source tree, which is not a thing Play takes
```

None of it could fail, because nothing ever built the release variant.

Version now derives from `package.json` — one source of truth — with a per-build override for
hotfixes. Signing reads a git-ignored properties file or `BRANDOPS_KEYSTORE_*` in CI, and when
neither is present the build **stays unsigned rather than failing**: a contributor without the key
can still build, and an unsigned bundle cannot be mistaken for a shippable one. Key material is
git-ignored in four patterns.

**Verified by Gradle, not by reading it.** An SDK is needed to compile a project but not to configure
one, so a task was added that prints what a release would carry:

```
  versionName=0.1.0   versionCode=1000   signed=false
```

0.1.0 → 0×10⁶ + 1×10³ + 0 = 1000, confirmed by the tool that will run it.

**What this does not do**, stated plainly: it does not prove the build compiles. That needs an
Android SDK, which this machine does not have. `minifyEnabled` is left off deliberately — Capacitor
plugins resolve classes reflectively, and enabling shrinking without a device to test on is how a
store build ships broken.

Two incidental repairs: `cap sync` rewrites an asset on every build that Prettier was gating on, now
ignored; and `.vscode/` was untracked and would have been swept into the next `git add -A`.

| Repair                                                     | Dimension | Evidence                             |
| ---------------------------------------------------------- | --------- | ------------------------------------ |
| Release version derives from one source of truth           | D15       | Gradle prints 0.1.0 / 1000           |
| Signing configured, absent key degrades to unsigned        | D15, D8   | 11 tests; key material ignored       |
| A bundle task exists, and a check that works without a SDK | D15       | Play takes an AAB, not a source tree |

**Score movement: none. D15 stays at 2.0 and the hard gate stays open** — a buildable bundle is not a
published app, and nothing has been submitted anywhere. What changed is that submission is now
possible at all, which it demonstrably was not.

---

### Cycle 62 — 2026-09-02 · looking for the pattern instead of tripping over it

Three cycles had each found the same defect by accident, so cycle 61 named it: **a function that
returns more than its caller destructures**. This cycle searched for that shape on purpose — every
exported `*Result` interface, and which of its fields are read nowhere in the repository.

Eight hits. The largest was the one worth taking:

```
  SessionToBrandResult    2/9 fields read nowhere: proposedEvent, proposedAchievement
  CalculateDeltasResult   2/3: hasMaterialChanges, changeSummary
  ApplyDeltasResult       2/6: rejectedDeltas, newTwinState
```

`summarizeWorkForBrandOps` returns a proposed event and a proposed achievement, both documented as
_"not saved until user confirms"_ — and **nothing saved them**. They were computed, returned to the
agent, and lost. There was no confirm step because there was nothing to confirm.

That was the missing first link in a chain whose other three were wired over the two preceding
cycles. It is now complete, and every link is a person's decision:

```
  session summary → stored candidate → verification → Twin proposal → accepted, version recorded
       (agent)        UNVERIFIED        (operator)      (operator)        (operator)
```

Stored through `ingestActivityEvent` rather than pushed onto the array, so it validates, fingerprints
and de-duplicates — an agent summarising the same session twice is ordinary, and produces one
candidate. The event keeps `UNVERIFIED` / `AGENT_REPORTED` standing: **storing a candidate is not
promoting a claim.** A test asserts that summarising alone moves nothing — no Twin change, no
proposal, no version.

| Repair                                                      | Dimension | Evidence                                          |
| ----------------------------------------------------------- | --------- | ------------------------------------------------- |
| Session proposals are stored where a person can act on them | D4, D10   | Were computed and discarded; 6 tests, 4 mutations |
| Stored unverified, and proven to move nothing on its own    | D4, D8    | The counter-case that matters most                |
| One candidate per session, not one per call                 | D9        | Goes through the canonical fingerprinting path    |

**Knip 96, unchanged — the budget did not move, and that is the honest number.** The two fields are
now read, but the sweep also surfaced six more result types with unread fields, so the wiring and the
discovery cancelled out.

Six of the eight remain, and two of them sit on code from the last two cycles: `hasMaterialChanges`
is computed and ignored, and `rejectedDeltas` cannot be produced at all because
`applyTwinProposalAcceptance` accepts every delta unconditionally. **A person cannot reject part of a
Twin proposal.** That is the next one.

---

### Cycle 61 — 2026-09-02 · the Twin changed and nothing said so

Third half-wired vertical in three cycles, and the same shape again. `applyDeltas` returns a
`version` — the snapshot before, the snapshot after, the deltas applied, who applied them and when —
and `applyTwinProposalAcceptance` used `updatedTwin` and **discarded the rest**.
`addVersionToHistory` and `createInitialVersionHistory` existed to store those snapshots and had no
caller.

So the Twin moved and nothing recorded that it had. For a product whose subject is verified identity,
an unrecorded edit is the one kind it cannot afford.

**Wiring it exposed a duplicated concept.** `TwinVersion` was declared **twice** — a five-field stub
in `types/builder.ts` and the real thirteen-field shape in `twinDeltaEngine.ts` — and the two were
incompatible. Nothing used the stub, so nothing failed, right up until the history was stored and the
definitions had to meet. There is now one definition, in the types file, with the engine importing
it.

**Mutation testing found a gap my own tests could not see.** Two of three mutations passed at first,
and one of those was my fault twice over: the mutation had not applied, because prettier had wrapped
the line I was matching. Re-run properly, it failed. The third was a real hole — every assertion
looked at the _appended_ version, so seeding the history from the post-change state instead of the
pre-change state left them all green. A history seeded from where the Twin ended up would claim it
always had the achievement, erasing the change it exists to describe. There is now an assertion on
the seeded entry.

| Repair                                       | Dimension | Evidence                                          |
| -------------------------------------------- | --------- | ------------------------------------------------- |
| Accepted Twin updates record a version       | D4, D10   | Was discarded; 8 tests, 3 mutations               |
| One `TwinVersion`, not two incompatible ones | D1        | The stub was used by nothing until this needed it |
| The history starts from before the change    | D4        | Found by mutation, not by reading                 |

**Knip 99 → 96. Score movement: none** — D4 and D10 are capped by things this does not address.

Three cycles, three verticals wired at one end only. The pattern is now specific enough to look for
deliberately: **a function that returns more than its caller destructures.**

---

### Cycle 60 — 2026-09-02 · three quarters of a vertical, connected at one end

The delta engine turned out to be a pipeline missing its middle. `applyTwinProposalAcceptance` took a
Twin update proposal, applied its deltas, and was wired into the approval path.
`calculateDeltas` and `createTwinUpdateProposal` — the two functions that _produce_ a proposal — had
no caller at all.

**So the acceptance handler waited for proposals nothing in the product could create.** Verifying an
achievement marked the event `USER_VERIFIED`, removed the candidate, and taught the Twin nothing. The
end of the pipeline was wired, the start of it was not, and neither half failed on its own.

Verification is now the trigger, and the boundary is the whole point: what it creates is a
**proposal**. The Twin is untouched until the operator accepts it through the existing approval path,
which binds the approval to the content they saw. The directive forbids promoting a claim into
verified Twin state without a person — proposing is not promoting, and a test holds that line by
asserting the Twin is byte-identical after verification.

**Mutation testing then caught two guards I had written that could never run.** An "already
recorded" check was redundant, because `calculateDeltas` returns nothing when nothing changed — the
engine's own job. An "already proposed for this event" check was unreachable, because verification
removes the candidate, so a second call returns before reaching it. Both were removed. Defensive code
that cannot execute is worse than none: it reads as a considered safeguard and is one more thing to
keep true.

**And the test fixture was wrong six times over.** It targeted the demo workspace, which has **no
Twin at all**, so the first run showed the code correctly declining while the test read it as a
failure. Typing the fixture instead of casting it then surfaced, one at a time: `'milestone'` is not
an `ActivityEventKind`, `'milestone'` is not an `AchievementKind` either, `ActivityEvent` requires
`timestamp` and `updatedAt`, `AchievementCandidate` has `reason` and `detectedAt` rather than
`createdAt`, and `BuilderActivityState.workspaceId` is required. **Six invented or missing fields, all
hidden behind one `as BrandOpsData`.**

| Repair                                                    | Dimension | Evidence                                               |
| --------------------------------------------------------- | --------- | ------------------------------------------------------ |
| A verified achievement now reaches the Twin as a proposal | D4        | Was zero proposals; acceptance handler was unreachable |
| The Twin is unchanged until a person accepts              | D4, D8    | Asserted directly, not argued                          |
| Two unreachable guards removed                            | D1        | Mutation testing; both left every test green           |
| A fixture typed rather than cast                          | D1        | Six invented or missing fields                         |

**Knip 101 → 99. Score movement: none** — D4 is at its cap, and this connects capability rather than
adding it.

The shape worth remembering: **a half-wired vertical fails silently at both ends.** The producer
looks unused and the consumer looks defensive, and nothing in between reports that the road does not
meet.

---

### Cycle 59 — 2026-09-02 · reading a function before putting it in place

The instruction was to wire the unlinked functions rather than only test them. The first candidate
was `isSourceAuthorized` in the activity graph — an authorization predicate with no caller, which
sounds like an obvious gap to close.

**Reading it first is what stopped a regression.** Its allowlist had drifted out of the type it
guards:

```
  valid sources it rejected   agent-reported, integration-import, dev-hook, manual
  entries that cannot occur   user-input, manual-entry, imported,
                              integration:authored, approved-agent
  overlap with reality        3 of 8
```

Five of its eight entries are strings `ActivityEventSource` does not contain and no code can ever
produce. Four legitimate sources were refused. **Wiring it as found would have rejected most
activity ingestion** — the unwired code was not merely unused, it was wrong, and only running it
against the real union showed that.

It is now keyed on the union itself, and the tests read that union out of the source file rather than
holding a copy, so the two cannot drift apart again without something failing. Exactly one member is
unauthorised — `agent-reported`, a claim about something the workspace did not witness — and adding
a source to the union now fails a test until somebody decides which side it belongs on. That decision
is the one that quietly went unmade the first time.

**And it is still not wired, deliberately.** The `builder.activity.ingest` handler already applies a
narrower rule with a documented reason: an agent may report _where it got_ material, but may not
claim `user-action`, because that describes something it did not witness. Substituting this predicate
would refuse the sources that handler intentionally permits. Two different questions; only one of
them belongs on the ingest path, and forcing the connection would have undone a considered decision
to satisfy a metric.

| Repair                                                | Dimension | Evidence                                               |
| ----------------------------------------------------- | --------- | ------------------------------------------------------ |
| An allowlist keyed on the type it guards              | D1, D8    | 5 of 8 entries were unreachable strings                |
| The union and the guard cannot drift apart again      | D1        | Tests read the union from source; 7 tests, 3 mutations |
| A new source forces a decision rather than defaulting | D8        | Was silently absent                                    |

**Knip 102 → 101. Score movement: none.**

The cycle's real output is a refusal. Asked to wire something, the honest answer for this one is
that it does not belong where it looked like it belonged — and saying so beats a connection that
would have read as progress and broken ingestion.

---

### Cycle 58 — 2026-09-02 · the page was three-quarters suggestions

Plan has been called too complicated three times now, and five cycles of repairs had not settled it.
Those cycles cut the word count, the duplicate labels, the fabricated receipts and the leaked
identifiers — **and none of them changed the page's proportions**, which turns out to be the whole
complaint:

```
   4 items were work     waiting on you, in progress, recently done
  12 items were offers   ready to start, suggested, set up
  -> 75% of the page was things nobody had started
```

Six groups sat in one column as peers, so a reader walked past twelve suggestions to find four things
happening. Shortening a list like that makes it a shorter list of the wrong things.

The offers now sit behind **one disclosure carrying its own count** — _"Things you could start 12 ·
Nothing here has started. Safe to ignore."_ — and the page opens on work. **Visible words 214 → 116.**
Nothing is removed; the suggestions are one tap away and still fully rendered, which a counter-case
test enforces.

**The condition for opening it was unreachable, and writing the test is what caught that.** The first
version opened the offers when the work column was empty — and the work column is never empty,
because the twin-status row is built unconditionally and always lands in "Waiting on you". It would
have shipped as a dead branch with a passing test above it. The condition is now about **movement**:
nothing in progress and nothing recently done, which a brand-new workspace really does reach.

**And a types package was worth more than any hand-fix.** `jsdom` was already a dependency with its
types absent, so nine test files imported it as `any` and every value derived from it became
`unknown`. Adding `@types/jsdom` — types only, MIT, no runtime code, `npm audit` clean — took the
test-type budget **161 → 129**, thirty-two errors from one missing package.

| Repair                                           | Dimension | Evidence                                              |
| ------------------------------------------------ | --------- | ----------------------------------------------------- |
| Work and offers are separate regions             | P1, P2    | 75% offers in the column → one counted door           |
| Visible weight nearly halved                     | P2        | 214 → 116 words; 7 tests, 5 mutations both directions |
| The disclosure's condition is one that can occur | D1        | The first was unreachable by construction             |
| `@types/jsdom` added                             | D1        | 161 → 129 test type errors                            |

**PLAN score: 84.0 → 85.5** (P1 13.5 → 14.0, P2 12.5 → 13.5).

The lesson is about the earlier cycles rather than this one. Five passes measured **how much** the
page said and never **what proportion of it mattered** — and every one of them reported an
improvement.

---

### Cycle 57 — 2026-09-02 · a score that ignored the thing it asked for

Third pass of the same method, on the evidence ledger. `computeEvidenceStrength` takes a
`verificationStatus`, a `source`, and a **`trustTier` it never reads**:

```
  trustTier=USER_VERIFIED      score=0.2
  trustTier=BRANDOPS_VERIFIED  score=0.2
  trustTier=AGENT_REPORTED     score=0.2
  trustTier=EXTERNAL_SOURCE    score=0.2
  trustTier=MODEL_INFERRED     score=0.2
```

A model's guess scored exactly as the operator's own confirmation. For a product whose core concept
is trust tiers, a parameter that names one and discards it is worse than not offering it — the
signature promises a weighting that does not exist.

**The sharper version was one call away.** `updateEvidenceVerification` accepts a tier from its
caller, **stores it on the evidence**, and passed it here to be thrown away. So the recorded tier and
the recorded strength could disagree, with nothing to reconcile them.

The parameter is dropped rather than weighted, and that choice is the substance of the fix. Both
internal callers derived the tier from `source` in the first place — an agent event scores 0.1, a
verification fetch 0.3 — so provenance is already what `source` encodes. Inventing a second weighting
would double-count the same signal, and choosing those weights would be a product decision made on no
evidence. `trustTier` stays a recorded fact; it is simply not an input to this number, and the
signature now says so.

**Two properties are pinned rather than changed.** `STRONG` is reachable only through
`SYSTEM_VERIFIED` — a user personally confirming a fetched source reaches `MODERATE`. And the
scorer's floor is 0.15, so `NONE` is unreachable from it: that level belongs to a claim nothing
supports, which is a different question from how strong one piece is.

**And my own test was wrong again — the fifth time this session.** I called
`updateEvidenceVerification` with an object literal when its signature is positional, so
`verificationStatus` became that object, the scorer fell to its default branch, and two tests failed
against working code. The typecheck ratchet from cycle 52 would have caught it before the run.

| Repair                                                    | Dimension | Evidence                                     |
| --------------------------------------------------------- | --------- | -------------------------------------------- |
| A scorer that named a signal it discarded                 | D4        | Five tiers, one score; 10 tests, 4 mutations |
| Recorded tier and recorded strength can no longer pretend | D4        | The two are independent, and now say so      |
| Export/import round-trip proven                           | D10       | Was untested; strength and links survive     |

**Knip 107 → 102.** Three passes, three real defects in code nothing called: a filter missing half
its type, identifiers accepting control characters, and a score ignoring its own argument.

---

### Cycle 56 — 2026-09-02 · the validators that waved identifiers through

Same method as the last cycle, applied to the largest remaining cluster: eleven unwired exports in
`validation.ts` — four length limits and the throwing assertions built on them. The gateway screens
agent text through `sanitizeAgentText` and `screenAgentContent`; this parallel API is written,
exported, and called by nothing.

**Running it found a real gap.** `assertId` and `assertIdempotencyKey` trimmed and length-checked and
nothing else:

```
  assertId("abc\0def")             ->  "abc\0def"    accepted
  assertId("abc\ndef")             ->  "abc\ndef"    accepted
  assertRequiredString("abc\ndef") ->  "abcdef"        stripped
```

The same module screened free text carefully and **waved identifiers through**. That is the wrong way
round: ids reach places prose does not — audit lines, trace records, map keys, idempotency lookups. A
newline inside one can forge a second log entry; a NUL can truncate a value in anything that later
hands it to a C-backed API.

They now **reject** rather than strip, and the difference is deliberate. Silently altering an
identifier would store something the caller never sent and then fail to match it on every later
lookup — a quieter failure than refusing it at the door. Free text keeps the opposite policy, because
prose with a stray newline is still the prose the agent meant.

**Two contracts are now pinned that are easy to assume wrongly.** `assertRequiredString` **truncates**
ten thousand characters to four thousand and returns success — "assert" reads like "reject" and it
does not. And it does **no injection screening at all**: it returns `ignore all previous
instructions` unchanged, because screening is a separate call the caller composes.

`MAX_AGENT_TITLE` and `MAX_AGENT_EVIDENCE_REFS` appear exactly once in the source — their own
declaration. They encode an intended policy that no code applies, which the tests now record plainly
rather than leaving as numbers nobody reads.

| Repair                                       | Dimension | Evidence                                             |
| -------------------------------------------- | --------- | ---------------------------------------------------- |
| Identifiers refuse control characters        | D8        | NUL and newline were accepted; 22 tests, 4 mutations |
| Refusing rather than stripping, for ids only | D8        | A silently altered id never matches again            |
| Truncation and no-screening contracts pinned | D1        | Both are surprising from the names alone             |

**Knip 118 → 107.** Every drop since 118 has come from exercising unwired code rather than deleting
it, and **each pass has found a real defect in what it covered** — a filter that missed half its own
type last cycle, identifiers that accepted control characters this one. That is the argument for the
operator's rule stated as evidence rather than principle: the deletions would have removed the
functions _and_ the bugs, and learned nothing.

---

### Cycle 55 — 2026-09-02 · unwired is not unwanted

**A correction first.** Cycle 54 deleted nine `featureRegistry.ts` functions because Knip reported
them unreferenced. The operator's instruction is that an unlinked function is work that has not been
connected _yet_ — keep it, and make sure it works. That is the better default and the deletion was
the wrong call, so the nine are restored.

The truthfulness fix from that cycle stays: the built-in catalogue still reads `built-in` rather than
dating itself to now.

**Then the part that mattered.** Unwired code that nothing exercises is the real hazard — it rots in
silence and fails on the day someone finally calls it, which is the worst possible moment to find
out. So the query API now has tests that do what wiring would eventually do.

Run against the shipped catalogue, they answer:

```
  33 entries · 3 backend-only · 3 dead UI · 6 unwired · 0 duplicates
```

**Exercising them found a latent bug.** `getBackendOnlyFeatures` tested `uiExposure === 'hidden'` and
the field's type also allows `'none'` — both meaning nothing user-facing. The shipped catalogue
happens to use only `hidden`, so it returned the right answer today and would have under-reported
the first time an entry used the other value. Found by running it, not by reading it.

**And a fixture of mine was incoherent.** My first `dead-ui` entry said `wired: true,
backendImplementation: false` — a state that cannot exist. The test failed for that reason rather
than finding anything, which is the fourth time this session a fixture has been the thing at fault.

**The metric changed meaning, and that is worth stating rather than celebrating.** Restoring nine
exports should have taken Knip from 119 back to 128. It went to **118**, because the new test imports
them and Knip counts an import as a use. So the number is no longer a count of dead exports. It is a
count of exports that are **neither wired nor exercised** — which is the more useful question, but it
is a different question, and reporting the drop as cleanup would have been false.

| Repair                                            | Dimension | Evidence                                     |
| ------------------------------------------------- | --------- | -------------------------------------------- |
| Nine deleted functions restored                   | D1        | Deleting unlinked work was the wrong default |
| The query API is exercised before it has a caller | D1, D9    | 11 tests, 4 mutations, all caught            |
| `getBackendOnlyFeatures` covers its own type      | D1        | `'none'` was missed; found by running it     |

**Score movement: none.**

The generalisable point: **Knip answers "does anything import this", which is not the same question
as "is this dead".** Reading its output as the latter is what produced a deletion that had to be
undone.

---

### Cycle 54 — 2026-09-02 · a registry nothing writes

With both detectors gated, this cycle spent the budget they now enforce. `featureRegistry.ts` held
**twelve exports of which ten were unreachable** — 599 lines for one wired function.

Chasing why turned up the more interesting thing. `getFeatureRegistryState` returns
`workspace.featureRegistry` when it has entries and otherwise falls back to a hardcoded catalogue.
**Nothing writes `workspace.featureRegistry`.** The only function that could, `updateFeatureRegistry`,
was itself unreferenced — so the fallback ran on every call, and it stamped the constant with
`updatedAt: new Date().toISOString()`.

A list that has never changed, reported as freshly recomputed, every single time. The entries are
identical down both branches, so the timestamp was the only thing that could have told a caller which
one they got, and it was the one field actively erasing the distinction. It now reads `built-in`.

The nine dead functions went with it — a query API (`getUnwiredFeatures`, `getDeadUiFeatures`,
`detectDuplicates`) over a registry nothing populates. Worth naming plainly: **the product shipped a
dead-UI detector that was itself dead.**

**Knip 128 → 119.**

**Then the typecheck ratchet caught me.** The guard I wrote for the timestamp added a type error —
`as BrandOpsData` on an object literal — and `check:tests` refused the commit. Typing the fixture
properly immediately surfaced a **missing required field**, `wired`, that the cast had been hiding.
The gate built one cycle ago failed the next cycle's work, on its author, for exactly the reason it
was built.

| Repair                                            | Dimension | Evidence                                         |
| ------------------------------------------------- | --------- | ------------------------------------------------ |
| The built-in catalogue stops dating itself to now | D4, P11   | `new Date()` on a constant, on every call        |
| Nine unreachable functions removed                | D1        | One of twelve exports was wired; 599 → 546 lines |
| A test fixture typed rather than cast             | D1        | Which found a required field it was missing      |

**Score movement: none.** D1 and D4 are at their caps.

The through-line from the last three cycles is the same one: **the detectors were right and nobody
was listening.** Knip had been naming `featureRegistry.ts` all along.

---

### Cycle 53 — 2026-09-02 · the second detector that could not fail

Cycle 52 found a typechecker wired into nothing. **Knip was the same story, and had been longer.**
Installed, configured, and invoked as `knip --no-exit-code` — report mode permanently, in no
pipeline, reporting **120 unused exports and 13 unused types to nobody.**

Before gating it, the audit's oldest finding got acted on. `memoryFirewall.ts` imports nine functions
from `candidateMemory.ts` and then **re-declares five of them under the same names**. Its versions
are thin wrappers; every piece of the actual safety logic — a rejected candidate cannot be promoted,
one requiring verification needs a verifier — lives in the module underneath.

Four of the copies in `candidateMemory.ts` were dead: nothing imported them, and each appeared
exactly once in its own file, as its own declaration. What they left behind was worse than dead
weight. **A reader searching a security boundary for `rejectCandidateEntry` found two
implementations and had to work out which one runs.** A fifth, `assessInstructionRisk`, is used
inside its own file and imported nowhere, so it stopped being exported rather than being removed.

**133 → 128.** Then the ratchet, in the same shape as the test-type budget:

- **unused exports and types** are budgeted, because 128 cannot honestly be cleared in one pass and
  pretending otherwise produces mass deletion rather than repair;
- **a file nothing reaches** is held at zero — there are none, and one appearing means something was
  orphaned rather than deleted;
- **an unlisted or unresolved import** is held at zero, because that is exactly what the test-suite
  ratchet caught last cycle: an import of a module that does not exist.

It runs in `verify`, in `release`, and in CI. `knip:report` keeps the old unfiltered view for when
the question is _what is left_, rather than _has it got worse_.

| Repair                                                        | Dimension | Evidence                                                |
| ------------------------------------------------------------- | --------- | ------------------------------------------------------- |
| Four duplicate implementations removed from a security module | D1, D8    | `memoryFirewall` re-declared them; the copies were dead |
| One export narrowed to the file that uses it                  | D1        | Used internally, imported nowhere                       |
| Reachability gated on a ratchet in CI                         | D1, D15   | 133 → 128; files and unresolved imports held at zero    |

**Score movement: none.** D1 is at its cap. What changed is that the cap now has something holding
it up: two detectors that could not fail now can, and both are in the pipeline that gates a release.

The pattern worth carrying forward is not "add ratchets". It is that **this repository had two
sophisticated analysers installed, correctly configured, and deliberately prevented from failing** —
which reads as diligence right up until you check whether anything reads their output.

---

### Cycle 52 — 2026-09-02 · the checks nobody was running

Asked to work on source health. The audit from cycle 47 had found real debt and I never acted on it,
so this cycle did — and the first thing it found was worse than the debt.

**`tsconfig.tests.json` and a `typecheck:tests` script both existed, and nothing ran either.** Not
`check`, not `verify`, not `release`, not CI. `vitest` transpiles without checking types, so the
suite went green over **211 unseen type errors**, two of which were not debt at all:

- an import of `src/pages/mobile/mobileShellTabs` — **a module that does not exist**;
- a session granted `evidence.search` — **a capability that is not in the registry**, silently
  dropped by `clampSessionScopes`, so the test's session never held what it claimed to grant.

Neither could fail, because nothing was looking.

**211 → 157**, and the reductions came from fixing sources rather than quieting tests:

| what changed                                                   | errors |
| -------------------------------------------------------------- | -----: |
| repaired the broken import                                     |     −1 |
| corrected the phantom capability                               |     −1 |
| gave `evaluateGoalHealth` the overloads its implementation had |    −32 |
| typed the evidence-ledger fixture                              |    −19 |

The third is the one worth naming. `evaluateGoalHealth` returned
`GoalHealth | Map<string, GoalHealth>` — a union decided entirely by whether `goal` was passed, so
every caller narrowed a thing it already knew. Overloads say what the implementation always did.
**Lint blocked that fix**: ESLint's base `no-redeclare` cannot see a TypeScript overload and rejects
the construct outright. The TypeScript-aware rule replaces it, and still catches a real
redeclaration — checked with a probe rather than assumed.

The fourth turned up three `{ type: 'repository' }` entity refs. `repository` is not an
`EntityRefType`. The assertions passed anyway, because a test that builds an invalid value and reads
it straight back agrees with itself.

**The remaining 157 are held by a ratchet**, not a promise: `check:tests` fails if the count rises,
**and fails if it falls without the budget being lowered in the same commit**. Two error codes are
held at zero rather than budgeted — an unresolved module and a compiler-named typo — because neither
is debt. It runs in `verify`, in `release`, and in CI.

**And the suite had a flake that was not a flake.** Two determinism tests failed about one run in
four with _"Test timed out in 5000ms"_, which reads like nondeterminism and was nothing of the sort:
thirty snapshot builds cost **3.1 seconds on an idle machine** against vitest's 5-second default, so
they were marginal before any load and over the line when files run in parallel. The clock was
measuring the machine, not the assertion. Six consecutive clean full-suite runs since.

Chasing that also caught a **real** ordering defect the guard was built for:
`crossPlatformOperationalTimeline` called `new Date()` **per item inside two loops**, so items sorted
by which millisecond they were constructed in and the `id` tie-break was never reached. **Third
occurrence** of the same pattern — the unified inbox in cycle 39, receipts in cycle 45, this now.

| Repair                                            | Dimension | Evidence                                                |
| ------------------------------------------------- | --------- | ------------------------------------------------------- |
| Tests are typechecked, against a ratchet, in CI   | D1, D15   | 211 unseen errors; broken import and phantom capability |
| `evaluateGoalHealth` states what it returns       | D1        | −32 errors, and callers stop narrowing what they know   |
| Lint no longer forbids TypeScript overloads       | D1        | Base rule off, TS-aware rule on, probe-verified         |
| One stamp per derivation in the platform timeline | P11       | Third instance of a pattern that keeps recurring        |
| Slow determinism tests carry honest timeouts      | D9        | ~25% failure under load → 6 clean runs                  |

**Score movement: none.** D1 is at its cap and this is repair beneath it. The honest note is that
D15 Deployment says "CI and release both pass end to end" — that was true, and this cycle shows CI
was passing while a whole category of check sat unwired.

---

### Cycle 51 — 2026-09-02 · what is behind the disclosure

Cycle 50 read the collapsed page. **Nothing had ever read what happens when you open a row** — every
budget in this repository measures the page as it first paints, which is exactly the state where a
disclosure is closed.

Opening one showed a section headed **Receipts** containing:

```
  type    outreachDrafts    followUps    activeOpportunities
```

Property names of an internal object, listed to a reader as records of things that happened. A sweep
of the rendered page found **thirteen such tokens**, all from one line:
`Object.keys(plan.exportPayload)`.

**Two things were wrong at once, which is why it survived.** The content was developer internals, and
the heading claimed they were receipts — for a template nobody has run, where the honest answer is
the _"None recorded."_ the empty case already prints. Either mistake alone might have been noticed;
together they looked like a populated section.

The guard is written against the rendered page rather than that line, because the defect is a
category: **anything reaching a user as `camelCase` or `snake_case` was not written for them.** It
carries its own counter-case — a fixture containing two identifiers it must find — because a regex
that never matches is the easiest possible way to write a check that certifies nothing.

| Repair                                            | Dimension | Evidence                                              |
| ------------------------------------------------- | --------- | ----------------------------------------------------- |
| No identifier rendered as prose, on any row state | P7, P11   | 13 tokens → 0, collapsed and expanded, empty and full |
| A section with nothing to show says so            | P11       | "None recorded." where keys had been listed           |
| A row that does have receipts still carries them  | P5        | The counter-case for emptying the field               |

**PLAN score: 83.5 → 84.0** (P5 9.0 → 9.5).

Two cycles, two defects, both found by looking at the product rather than at the code — and the
second only because the first raised the obvious next question: _if nobody has read the collapsed
page, has anybody read the opened one?_

---

### Cycle 50 — 2026-09-02 · reading the page instead of the code

The request was to keep working on the interface, with Plan named as the surface still needing it. So
this cycle rendered the whole page and read it top to bottom, which no budget or structural test
does. Four things, none of which any existing guard was looking at.

**Every row led with a feature description.** `promise` is copy about what a template _does_ —
_"Convert positioning and proof into draft outreach, follow-ups, and approvals — with execution
receipts that strengthen the twin."_ That is the right thing to say about something on offer and the
wrong thing to say about work already moving, where the reader wants to know where it stands.

Rows now split by the group they land in. "Ready to start" keeps the explanation. "In progress"
leads with its figures:

```
  before   Convert positioning and proof into draft outreach, follow-ups, and approvals — with…
  after    outreach drafts: 2 · follow ups: 2 · active opportunities: 2
```

**The first attempt at that was worse, and the counter-case caught it.** Using the card's `nextStep`
made all three underway rows read _"Check progress, then run the next approved step."_ — the same
sentence three times, because that field is keyed only on status. It is the redundant-kind-label
defect from cycle 44 wearing a different hat, and I reintroduced it while fixing something else.

**A percentage of nothing.** The expanded detail read `Progress: 40%`. That number is an activity
tally times an arbitrary multiplier, capped at 100, with no endpoint for it to be a percentage of.
The Outreach Plan's formula is `outreachDrafts * 20 + incompleteFollowUps * 10` — so **ten unfinished
follow-ups reported 100% progress.** Debt read as completion. Replaced with the counts it was made
from, which `exportPayload` already carried.

**A total the page already gave.** "16 items." sat above five group headings that each carry their
own count. Kept only while a filter is on, where it is the one thing explaining a short feed.

**"9 opportunitys predicted."** Three sites appended a bare `s`. Shared a small pluralise helper
rather than fixing the one that showed.

| Repair                                     | Dimension | Evidence                                               |
| ------------------------------------------ | --------- | ------------------------------------------------------ |
| Underway rows lead with their figures      | P2, P5    | Three distinct lines where there had been three blurbs |
| Offered rows keep their explanation        | P2        | The counter-case for the same change reversed          |
| A fabricated progress percentage is gone   | P11       | 10 open follow-ups had read as 100% complete           |
| Zero-valued figures dropped from the row   | P2        | "missed tasks: 0" crowded out the figures that existed |
| One pluralisation, correct for these nouns | P7        | "9 opportunitys" → "9 opportunities"                   |

**PLAN score: 83.0 → 83.5** (P2 12.0 → 12.5). Product total unchanged at 95.5.

**The method is the finding.** Forty-nine cycles of budgets, structural assertions and mutation tests
had not caught a single one of these, because all four are about _what the words say_ and none of
them changes a count, a control, or a heading. Rendering the surface and reading it is a different
instrument, and it was overdue.

---

### Cycle 49 — 2026-09-02 · the other end of the data range

Three cycles asked what a surface claims for someone who has done nothing. Nobody had asked the
opposite. A workspace with **25 pending approvals and 35 completed actions** gave two answers.

**A cap that starved the history — and it was my own regression.** Cycle 46 correctly stopped pending
traces becoming receipts, but did it with a `continue` _inside_ a loop over the first twelve entries.
Traces are newest-first, so twelve pending approvals consumed the entire budget and not one completed
action was reached. "Recently done" showed **nothing at all**.

The busier the workspace, the emptier its history. That is the opposite of what a cap is for, and it
shipped three cycles ago in a commit whose whole subject was making that list honest. Filtering now
happens before the cap: **0 → 12**.

**A group presenting a subset as the whole.** Approval rows come from a peek capped at eight while
the tile above reports the true count, so one screen said both:

```
  tile    Pending Approvals   25
  group   Waiting on you (5)      [Show 2 more]
```

"Show 2 more" tells a reader that five is all there is. Twenty were invisible and nothing said
otherwise. The heading now reads **"Waiting on you (5 of 26)"** with _"21 more not listed here"_ — and
the `aria-label` carries the same figure, so a screen reader is told what a sighted reader is told.

| Repair                                                       | Dimension | Evidence                                      |
| ------------------------------------------------------------ | --------- | --------------------------------------------- |
| Pending work no longer starves completed work out of the cap | P11, D5   | 25 pending / 35 done: 0 → 12 receipts         |
| A truncated group says how much it is not showing            | P11, P3   | "(5)" → "(5 of 26)", label and heading agree  |
| A complete group still says nothing of the sort              | P11       | The counter-case for the same defect reversed |

**Score movement: none.** P11 is at full marks; this repairs a regression beneath it rather than
extending it.

**Two of my own instruments were wrong again, and both were caught by mutation rather than by
reading.** The counter-case assertion searched approval lines for the word "pending" — wording cycle
46 had already deleted, so removing the filter left it green. And the fixture stamped every trace
`outcome: 'success'`, including the pending ones, so a pending receipt that leaked through still read
as succeeded. A pending request has no outcome; the fixture now says so, and the assertion reads
`executionStatus`, which no phrasing change can satisfy.

The pattern across these cycles is consistent enough to name: **when a guard passes under mutation,
the fixture is usually the thing that is lying.**

---

### Cycle 48 — 2026-09-02 · a badge that argued with the line beneath it

Today's focus board falls back to a message when a lane is empty — _"Build momentum: log outcomes in
Chat, schedule posts, and connect sources."_ Honest, and worth keeping. It is also an item in the
list, so the tab counted it: **"Momentum 1"** above a single line saying there was no momentum yet.

Placeholders are now marked at the point they are created, and the badge counts only lines that are
work. The mark is explicit rather than inferred from the id, so a lane that grows a different empty
state later cannot quietly start counting again.

**The more useful part of this cycle is what I got wrong.**

I opened it believing all three lanes were inflated — the render showed "Do today 1 · Urgent 1 ·
Momentum 1" on an empty workspace, and I wrote the test to assert all three should read zero. It
failed, and dumping the lanes showed why:

```
  doToday   Daily schedule  ·  BrandOps daily cadence, 2 deep work blocks
  urgent    Sync gaps       ·  Providers not connected: google, github, linkedin
  momentum  Build momentum  ·  (placeholder)
```

**Two of the three were real.** A default cadence and three unconnected providers are both genuine
things to tell someone who has just arrived. Had the assertion I wrote first been made to pass, the
fix would have suppressed both and left a new user with a blanker, less useful board — a repair that
would have looked like an improvement and read as one in this ledger.

So the invariant is not _"an empty workspace counts zero"_. It is **a lane never counts its own
empty-state message**, which holds whichever lane falls back, and there is now a test asserting the
other two lanes keep their counts — the counter-case that would have caught the over-correction.

| Repair                                                | Dimension | Evidence                                       |
| ----------------------------------------------------- | --------- | ---------------------------------------------- |
| Empty-state lines are marked, and not counted as work | P11       | "Momentum 1" → 0, with the message still shown |
| Lanes that do have content keep their counts          | P11       | The counter-case for my own first assumption   |

**Score movement: none.** P11 is already at full marks, and this is smaller than what earned it.

**Three cycles running, the same question keeps paying**: _what does this claim for a user who has
done nothing?_ It found fabricated receipts, then four plans that did not exist, then a badge
arguing with its own contents. The variation this time is that it also found two things that were
fine — which is the answer that keeps the practice honest.

---

### Cycle 47 — 2026-09-02 · the same question, asked of everything else

Cycle 46's question — _what does this page claim for a user who has done nothing?_ — was worth asking
of more than the completed list. Two more answers, and a mistake of my own that is the most important
thing in this entry.

**Work reported as underway that had never begun.** Five plan templates are always present. All five
were filed as `active-plan`, which puts them under a heading reading "In progress" with the hint
"Already underway." The tile above counted them the same way, so an empty workspace reported
**"Active Plans: 4"**. They are offers, not work. They now sit under "Ready to start — set up and
waiting for you to begin", and the tile counts only what has actually begun: **4 → 0**.

**Confidence that rose on absence.** Opportunity confidence is scored from how many signals a
suggestion has, and the collectors emit a line per fact whether or not the fact exists:
`"Connected apps: none"`, `"0 active opportunities"`, `"0 open follow-ups"`. Each added two points.

> "Identify growth opportunities from profile and pipeline" — **85% confidence**, seven supporting
> signals, every one of them saying there was nothing there.

The named `sources` list compounded it: a hardcoded literal at every call site, worth up to twenty
points, claimed for sources that held nothing. Absence no longer counts as evidence, absence is no
longer _shown_ as supporting evidence, and a suggestion with nothing behind it loses the credit its
source list claimed. Empty workspace: **85 → 69, 81 → 65, 80 → 68, 78 → 66, 75 → 63.** Populated
workspace: unchanged, which is the counter-case that matters.

| Repair                                             | Dimension | Evidence                                                  |
| -------------------------------------------------- | --------- | --------------------------------------------------------- |
| Templates on offer are not work in progress        | P1        | Empty workspace: "Active Plans" 4 → 0                     |
| A signal reporting absence is not evidence         | D4, P11   | 5 suggestions dropped 12–16 points; populated unchanged   |
| Absence is not shown as supporting evidence either | D4        | "0 outreach drafts" was listed under "supporting signals" |

**PLAN score: 82.5 → 83.0** (P1 13.0 → 13.5). Product total unchanged at 95.5.

---

**I destroyed a security fix during this cycle, and a guard caught it.**

A regex rewrite went wrong, and I ran `git checkout -- src/services/plan/predictiveOpportunityLayer.ts`
to start over. That restored the **committed** version of the file — and the prompt-injection quoting
added in cycle 7 was never committed. Six `quoteContextValue()` wrappers around workspace text bound
for a model prompt vanished in one command.

`modelInputSurface` failed on the next run and named all six. Restored in a minute.

Two things follow from that, and neither is comfortable.

The first is that **the guard was the only thing standing between a silent revert and a shipped
injection surface.** Cycle 7 built it to catch a new interpolation someone forgot to quote. It caught
an old one someone deleted, which is a failure mode nobody designed it for.

The second is larger: **this entire session is uncommitted.** 136 files, ~8,700 insertions, forty-odd
cycles of work, all in the working tree. `git checkout` on any one of them silently discards
everything since the last commit — and the last commit predates every repair in this ledger. I was
lucky in _which_ file I reverted, because that one happened to be covered.

---

### Cycle 46 — 2026-09-01 · the work that never happened

**A brand-new workspace — zero plans, zero receipts, zero traces, zero audit entries — showed the
user three completed actions marked `recorded`.**

```
  [Expert operator] ASK expert execution       recorded   outputs: ["2ms expert execution"]
  [Expert operator] OPERATE expert execution   recorded   outputs: ["1ms expert execution"]
  [Expert operator] PLAN expert execution      recorded   outputs: ["0ms expert execution"]
```

Nothing had happened. Those are expert **routing readouts**, computed during that very render by
running the composition engine against a synthetic intent and timing it. **The page was reporting the
cost of drawing itself as work done on the reader's behalf**, under a heading that says "Recently
done".

Removing them revealed how complete the fiction was: **the demo workspace's entire completed list
was routing readouts.** It ships with no execution receipts at all. The group is now empty there,
which is the truth.

The readout itself is real and still shown — as `snapshot.expertOperator`, framed as _"N experts
active"_, which is what it is. A test asserts it survives, because deleting something real to fix
something false would be the easy wrong answer.

**Then the same mistake in different clothes.** Every operator trace became a receipt, pending ones
included — so a single approval appeared **twice**: in "Waiting on you", correctly, and in "Recently
done", which says it is finished. It was not finished. Being asked to decide is the opposite of
finished. Its receipt even carried the line _"Pending human approval"_, which is a completed action
admitting it had not completed.

**And a regression of my own, caught by an assertion that was looking for something else.** Cycle 45
introduced the user-facing state map with `'approval pending'` in it and `'pending approval'` missing
— two code paths producing one condition in two spellings. A plan awaiting approval rendered **no
chip at all**, silently. An SSR test happened to search the markup for that exact phrase and failed.

So the fix is not the missing key. It is `planStatusVocabulary`, which reads `SavedPlanStatus` and
`OperationalPlanStatus` **out of the source files**, pushes every value through the same
normalisation the view uses, and requires each to be mapped or explicitly declared not-a-state. It
also checks its own restated unions still match the source, because a status list copied into a test
is a snapshot of the day it was written.

| Repair                                                    | Dimension | Evidence                                                     |
| --------------------------------------------------------- | --------- | ------------------------------------------------------------ |
| Routing readouts are no longer completed actions          | P11, D4   | Empty workspace: 3 reported actions → 0                      |
| A request awaiting review is not a receipt                | P11, D10  | One approval appeared in two groups; now one                 |
| Every producible status is mapped or declared not-a-state | P3        | Unions read from source, not restated by hand                |
| Fixtures carry genuinely completed work                   | —         | The approval fixture had only a pending trace supplying both |

**PLAN score: 81.5 → 82.5** (P11 4.5 → 5.0, P3 8.0 → 8.5). Product total unchanged at 95.5.

**Worth stating plainly: this was fabricated evidence, which the directive lists as a hard release
gate.** It reached the reader as completed work with receipts and a status of `recorded`. I do not
think it was anyone's intent — the readout is genuinely useful and someone put it where completed
things go. That is how this class of defect happens, and it is why the question that found it is
worth repeating on every surface: **what does this page claim, for a user who has done nothing?**

---

### Cycle 45 — 2026-09-01 · the list that reshuffled while you read it

**"Recently done" showed a different three items depending on when you looked.** Forty builds of an
unchanged workspace produced **three distinct orderings**, and the group renders three rows before
"Show N more", so the reshuffle was exactly the part a reader sees.

**The sort key was generated during the sort's own build.** ASK, PLAN and OPERATE receipts are
derived in one pass and each called `new Date()` for itself. They land microseconds apart, so whether
two of them share a millisecond is a race with the system clock —
`buildPlanExecutionReceipts` then sorts on that field.

Two changes, both load-bearing: the receipts are stamped **once for the whole derivation**, which
removes the race, and the sort has a deterministic tie-break, which means equal stamps can never
again depend on insertion order. Mutating either one back fails a different test.

**3 orderings → 1.**

**How it was found matters more than the fix.** Nothing was looking for this. It fell out of building
the snapshot twice from one workspace and diffing — a check that costs nothing and had never been
run. Eight of about twenty fields differed build-to-build; six were the clock, one was measured
latency, and one was disorder.

**Two leads dissolved under scrutiny first, and both are worth recording as non-defects.**

A sweep of all twenty `prependOperatorTrace` sites found ten without a `capabilityId` — but they are
theme changes, model calls and session lifecycle, none of them capability-backed. Attributing an
agent capability to a theme change would be worse than the gap.

A persistence round-trip showed `allowedAgentCommands: []` becoming `undefined` on load, which reads
exactly like an authorization weakening: an explicit _"this worker may run nothing"_ turning into
_"unset"_. **Both consumers fail closed** — `!cmds?.length` denies either way — so it is harmless. It
took two minutes to check and would have been an embarrassing thing to report without checking.

| Repair                                            | Dimension | Evidence                                               |
| ------------------------------------------------- | --------- | ------------------------------------------------------ |
| Receipts derived in one pass share one timestamp  | P11, D12  | 3 orderings → 1 across 30 builds                       |
| Deterministic tie-break on the receipt sort       | P11       | Equal stamps cannot depend on arrival order            |
| A whole-snapshot determinism net over every field | D12       | Catches the next build-time derivation that reshuffles |
| Failure messages carry the differing bytes        | —         | Naming the field was not enough to act on              |

**PLAN score: 81.0 → 81.5** (P11 4.0 → 4.5). Product total unchanged at 95.5 — D12 is already full.

**This is the third derived-at-build-time timestamp to cause this.** The unified inbox had it in
cycle 39. The lesson that keeps not sticking: _anything derived in one pass should be stamped in one
pass_ — so this time it is a test over every field rather than a fix to one.

And a note on my own instrument, because it is the tenth of these and a repeat: the duration
normaliser in the new guard read `/\d+ms/`, and the `` was written through a shell into a
literal **backspace character**. The regex matched nothing, so the guard failed intermittently while
my standalone probe passed. **The identical escaping bug silently disabled a credential redaction
earlier in this session.** Two occurrences is a pattern, not an accident: text with backslashes does
not survive being written through a shell, and the fix is to build those bytes explicitly rather than
to be more careful.

---

### Cycle 44 — 2026-09-01 · the approval that would not say what it did

**An approval row said who was asking and what for. It did not say what happens if you agree.**

The directive asks an approval to answer: what does approving do, can it be undone, does anything
leave the workspace. Reasonable questions to have in front of an Approve button, and the row
answered none of them.

**Every answer was already in the repository.** All forty capabilities carry a `tier` and a
`readOnly` flag; `OperatorTraceEntry` carries a `capabilityId` to look them up with. Nothing needed
inventing. Two omissions stood between the data and the reader:

1. **`buildPendingReviewPeek` copied eleven fields to the UI and dropped the twelfth** — the only one
   that knows the consequence.
2. **The human path never set it.** `convertToPlan.ts` records `plan.convert` for the identical
   operation over MCP. `askPlanConversion.ts`, the path a person actually goes through, recorded no
   capability at all — so **every approval a person created was unexplainable by construction**, and
   fixing the row alone would have changed nothing for them.

The second is the one worth dwelling on. The row was the visible symptom; the trace was where the
information went missing, one layer below where anybody would have looked.

**What it says now** is derived from `tier` and `readOnly` rather than written per action, so a
capability added next month explains itself. A read says it changes nothing. A write says it stays in
the workspace. `EXTERNAL_ACTION` says it reaches a connected service — the one case where approving
touches something BrandOps does not own. `SENSITIVE_ACTION` says it cannot be undone.

**And when a trace records no capability, the row says nothing.** A reassuring default would have
been a fabricated safety claim, which is worse than silence — so that is a test of its own, and
giving the unknown case a friendly default fails it.

| Repair                                                     | Dimension | Evidence                                                   |
| ---------------------------------------------------------- | --------- | ---------------------------------------------------------- |
| Approval rows state effect, reversibility and blast radius | P4, D8    | Derived from the registry; all 40 capabilities describable |
| `capabilityId` survives the snapshot to the UI             | P4        | Was dropped between eleven fields that were not            |
| The human conversion path records its capability           | P4, D10   | Driven through the real conversion, not a hand-built trace |
| An unknown capability is described as unknown              | D4        | A default here would be a fabricated safety claim          |

**PLAN score: 79.0 → 81.0** (P4 7.0 → 9.0). Product total unchanged at 95.5 — this sits under D8,
already at full marks, and D10, whose remaining gap is live delivery rather than provenance.

The pattern from cycle 43 repeated exactly: **the careful part of the system was built on top of the
omission.** Approval binding, content fingerprints, superseded status, a refusal at the dispatcher —
all correct, all guarding an approval the reader could not evaluate.

---

### Cycle 43 — 2026-09-01 · the file the whole product lives in

**The workspace file was written with `writeFileSync`, which empties the target and then refills
it.** For the whole of that window the file on disk is a prefix of valid JSON and nothing else.

I had walked past this line three times — cycle 18 read it, cycle 31 rewrote the function around it,
cycle 39 tested contention through it — because it was surrounded by careful work. The store
re-reads per call to avoid staleness, compares-and-swaps to avoid lost updates, retries to absorb
contention, and raises a named `WorkspaceUnreadableError` when the file will not parse. All of that
is right. **None of it noticed that the store was the thing corrupting the file.**

**Measured, 83 kB, one reader and one writer:**

|                                               | before                     | after      |
| --------------------------------------------- | -------------------------- | ---------- |
| reads that saw a partial workspace            | **1,246 of 4,925 (25.3%)** | 0 of 7,577 |
| workspaces corrupted by 25 mid-write SIGKILLs | —                          | 0          |
| write failures under concurrent reads         | —                          | 0          |

**The crash case is the serious one, and it is worse than a rate.** The counter-case run against the
old line lost the whole workspace on the **very first kill** — 0 bytes. Not eventually, not
occasionally: the first one. A closed laptop, a full disk, a killed gateway. There is no second copy
of this file. It _is_ the user's data.

**And the error message made it worse.** A reader landing in the window is told the workspace is
corrupt and to restore or re-export it. The file was intact a millisecond earlier and intact a
millisecond later, and there is nothing to restore from.

**The fix took two attempts, and the first one was a regression I nearly shipped.**

Write a sibling, fsync, rename over the target — the standard answer, and it took torn reads to zero
immediately. Then the guard I wrote for it failed with `EPERM`. **Windows refuses to replace a file
another process has open, and Node offers no way to read without taking that lock.** Measured, under
concurrent reads: 59 of 65 renames landed first try, the worst needed 30, and **~3% failed outright**
after a quarter-second of retrying. I had traded silent corruption for loud write failures.

I only saw it because the test surfaced what my probe had hidden: **my first probe wrapped the write
in `.catch(() => {})`.** It reported 208 successful writes and zero problems while writes were
failing. Seventh instrument error of the session, and the only one caught by the guard rather than
by re-reading the source.

So persistent contention now falls back to an in-place write — which Windows always permits — after
parking the finished content in a recovery journal. A reader that finds a torn workspace reads the
journal instead, repairs the file, and moves on. The live concurrent-reader test proves the fallback
is not dead code: three of the five journal mutations break it.

**Cost: 0.22 ms → 3.22 ms per mutation**, almost all of it the fsync. One user action, three
milliseconds, in exchange for the file surviving a power cut.

**Two more defects fell out of testing the fix, and both were mine.**

The reader could still fail. The fallback deletes its journal right after the in-place write, so a
reader holding a torn copy from _before_ that write finished could find the journal already gone —
**one read in 1,133**, reporting a corrupt workspace for a file that was whole by the time it said
so. Reads now look again before giving up; the window is sub-millisecond and genuine corruption
pays fifteen milliseconds to be sure.

And the crash test was a guard that proved nothing: five kills against the old write path **passed**.
Measuring detection rather than assuming it produced the useful surprise — **bigger files do not
widen the window.** The exposure is between the truncating `open` and the `write` after it, and a
`write` already under way survives a signal, so the window is short and roughly fixed however much
data goes through it. A six-megabyte payload made detection _worse_. Thirty kills at the shape that
actually catches it now fails 4 runs out of 4 against the old path and passes 4 of 4 against the
new.

| Repair                                                        | Dimension | Evidence                                                   |
| ------------------------------------------------------------- | --------- | ---------------------------------------------------------- |
| Workspace writes are atomic (temp + fsync + rename)           | D9        | 25.3% → 0% torn reads; 25 SIGKILLs, 0 corrupt              |
| Journaled fallback for Windows rename contention              | D9        | ~3% write failures → 0                                     |
| A torn workspace recovers from the journal and repairs itself | D9        | 6 recovery guards, 5 mutations, all caught                 |
| Orphaned temp files swept at startup, journal exempted        | D9        | Age-gated so a live writer's file is never the one removed |
| The scorecard's own total is recomputed by test               | —         | It had drifted +2.5; four mutations, all caught            |

**Score movement: +0.5** — D9 Reliability / Durable Execution 6.5 → 7.0, its cap. **95.5/100**,
after the correction below.

D9's own note has read _"no process-crash or partial-write recovery testing"_ since cycle 21. I wrote
that line as a limit of the testing. It was describing the defect.

The lesson is not "check for atomic writes". It is that **the most careful code in the file was
built on top of the bug**, and its own error class was written to report the corruption it was
causing. Sophistication above a broken primitive reads as evidence the primitive was considered.

---

### Cycle 42 — 2026-09-01 · the surfaces that were already fine

**Both page problems were found by rendering at realistic scale, so the obvious next step was to
sweep every other surface the same way.** Today, Integrations and Settings, at small and large
fixtures.

The first sweep said **Today was now the worst page in the product**: 1,033 words and 35 controls,
growing to 1,268 and 43 with more data — worse than Plan had been before the reshape.

**It was wrong, and the component's own documentation said so.** Today renders its four work areas
as a single-active tab group; three are `hidden`. Its doc comment states plainly that all four in one
column _was_ the "too much to read" problem, and that it was already fixed. My sweep counted
`textContent` across the whole DOM, hidden panels included — the identical mistake to cycle 41's
first chat measurement, made again one cycle later.

**Measured on what a reader can see:**

| surface      | visible words | visible controls | grows with data |
| ------------ | ------------- | ---------------- | --------------- |
| Plan         | 262           | 8                | no              |
| Today        | 115           | 13               | no              |
| Integrations | 56            | 0                | no              |
| Settings     | 72            | 0                | no              |

Nothing needed reshaping. **No defect found, which is the result.**

**It also corrected the reshape numbers I reported last cycle.** Plan's "536 words" counted the body
of every collapsed feed row — each is a closed `<details>`. The real figure a reader meets is 262.
The improvement held; the measurement of it was inflated at both ends.

**So the guards were fixed rather than the pages.** Both readability budgets now strip `[hidden]`
elements and closed disclosures before counting. This matters beyond accuracy: the old method would
have scored a genuine improvement — moving content behind a disclosure — as **no change at all**,
which is how a budget quietly stops rewarding the thing it exists to encourage.

| Repair                                                   | Dimension | Evidence                                                    |
| -------------------------------------------------------- | --------- | ----------------------------------------------------------- |
| Readability budgets count visible content only           | D11, D12  | `planPageReadability.test.tsx`; 936 → 262 measured honestly |
| A separate budget for controls actually on screen        | D12       | Eight compete for a decision, not twenty-seven              |
| Every surface swept at 200 contacts and 60 opportunities | D12       | None grows with data                                        |
| Today confirmed already fixed, not reshaped again        | D2        | Its own doc comment named the problem and the fix           |

**Score movement: none.** 97.5 holds.

Worth recording as a lesson rather than an anecdote: **six of this session's findings have been
instrument errors**, and this one would have had me rebuild a page that a previous author had
already fixed and documented. Reading the component before trusting the measurement is what stopped
it.

---

### Cycle 41 — 2026-09-01 · the chat page, at twenty messages

**The chat page reads fine with two messages, which is how it had always been looked at.** Every
test in this repository renders it with one or two. At twenty it does not read fine at all.

|                       | 2 messages | 20 messages |
| --------------------- | ---------- | ----------- |
| words of conversation | 32         | 219         |
| controls              | 7          | **70**      |

Every message carried Copy, Save and Pin; assistant messages added Convert to Plan; all rendered at
once. Eleven words and three-and-a-half buttons per message — **the actions outweighed the thing
they act on**, and scrolling back through a conversation meant scrolling through a grid of buttons.

The newest message now keeps its actions open, because that is what almost every action is aimed at.
Older messages fold theirs behind one quiet disclosure. **Four visible controls instead of seventy**,
with nothing removed and nothing more than a tap away.

**My first measurement of the fix said it had changed nothing.** A closed `<details>` keeps its
children in the DOM, so counting `button` elements still found all seventy. The fold was real and the
instrument could not see it. The guard now counts _visible_ controls — those not inside a closed
disclosure — because that is what a reader actually meets.

**Stated precisely rather than flattered:** it is four buttons plus nineteen low-emphasis "Actions"
labels, not four things on the screen. That is a large improvement over seventy competing controls
and it is not nothing.

| Repair                                                       | Dimension | Evidence                                    |
| ------------------------------------------------------------ | --------- | ------------------------------------------- |
| Per-message actions fold on older messages                   | D2, D12   | `chatPageReadability.test.tsx`, 4 tests     |
| Controls no longer scale with conversation length            | D12       | 20 messages costs no more than 2 plus two   |
| The conversation itself is never folded                      | D2        | Every message readable without a tap        |
| Folded actions stay reachable and keyboard-operable          | D13       | `details`/`summary`, one per older message  |
| The metric counts what a reader sees, not what the DOM holds | D11       | The first version measured no change at all |

**Score movement: none.** 97.5 holds. Both page reshapes landed under dimensions already at full
marks — the scorecard measured that these surfaces _worked_, and never that a person could read
them. That is a gap in the scorecard as much as in the product, and worth saying plainly: fifteen
dimensions of verified behaviour did not include one for whether the thing is usable.

---

### Cycle 40 — 2026-09-01 · the plan page, reshaped

**User report: the plan page is too complicated to read.** Measuring it turned that from taste into
fact.

|                      | before | after |
| -------------------- | ------ | ----- |
| words on first paint | 936    | 536   |
| controls             | 46     | 27    |
| header controls      | 11     | 5     |
| sections             | 1      | 5     |

**The structure was the problem, and it was visible in the heading levels.** One `h2` —
_"What needs your attention?"_ — followed by **eighteen sibling `h3`s**, drawn from seven different
sources: a setup prompt, a Twin proposal, eight suggestions, a contact, five plan templates, two
execution records. All styled identically. The page asked a question and answered it eighteen times
with equal weight, which is the same as not answering it. 91% of the page was a single
undifferentiated block.

**The header was worse per square inch: eleven controls, eight of them four duplicated pairs.**
"Pending Approvals" the tile and "Approvals" the chip set the same state. So did "Active Plans" and
"Active", "Opportunities" and "Opportunities", "Twin Status" and "What should I do?". Three
overlapping filter systems for one list.

**What changed.** The feed is grouped by what the reader has to _do_ about it, in reading order:
**Waiting on you · In progress · Suggested · Recently done**. Grouping is by intent, not by the
system each item came from — a decision someone owes is not comparable to an idea a recommendation
engine had overnight, and rendering them as siblings said they were. Each group carries its count,
shows three items, and offers the rest behind "Show N more". Item titles became `h4` under the group
`h3` that explains them.

The duplicate chip row is gone; the tiles absorbed it and now toggle back to "all" when pressed
again — one control doing what two did. Nothing was removed from the page: anything a group does not
claim still renders under "Other", so a new feed kind looks unsorted rather than missing.

**Three test suites had to be updated deliberately rather than made green.** The SSR test asserted
`>All<`, `>Recent<` and `Plan feed focus` — the controls that were removed for being duplicates —
and asserted two feed items that are now behind disclosure. Asserting that the fourth item in a
group is visible would be asserting the thing that was wrong with the page. They now check
reachability instead.

| Repair                                            | Dimension | Evidence                                                   |
| ------------------------------------------------- | --------- | ---------------------------------------------------------- |
| Feed grouped by intent, in reading order          | D2, D12   | `planPageReadability.test.tsx`, 8 tests                    |
| Word and control budgets, so it cannot drift back | D12       | 936→536 words, 46→27 controls, both pinned                 |
| No two header controls doing the same thing       | D12, D2   | Asserted on labels — the shape the old bug took            |
| Real heading hierarchy: groups `h3`, items `h4`   | D13       | Eighteen sibling `h3`s was the flat structure made visible |
| Nothing hidden becomes unreachable                | D2        | Every collapsed group offers "Show N more"                 |

**Score movement: none.** 97.5 holds — D2 and D12 were already full, and this is the third kind of
finding that sat beneath a mark already given. The scorecard measured that the workflow _worked_;
it never measured whether a person could read it.

---

### Cycle 39 — 2026-09-01 · the kill switch, and what it said

**Revoking a session is the user's kill switch.** Someone connects an agent, sees it do something
they did not expect, and revokes it. If the running gateway keeps serving the old token, the button
did nothing and the workspace they were protecting is still open.

**It works.** The gateway re-reads the workspace on every call, so revocation takes effect on the
very next request with no restart — verified against a live process, which is the only place the
claim means anything. It also keeps refusing rather than lapsing after a retry or two, which would
be worse than not working at all: the user would believe it held.

**What was wrong was how it said so.** A revoked session threw, and the stdio transport turned every
throw into `-32603` — _internal error_. That tells a client the **server** is broken, and the
reasonable response to a broken server is to retry. Indefinitely, against a session someone revoked
precisely to make it stop.

The HTTP binding already answered `401` for the same condition. The two transports disagreed about
what kind of failure this is, and the stdio one was actively misleading. It now answers `-32023`, in
the same server-defined range as `HEADER_MISMATCH` and `UNSUPPORTED_PROTOCOL_VERSION`.

This is the same shape as cycle 7's notification bug and cycle 15's receipts: **the behaviour was
right and the report was wrong**, and a client acting on the report would do the wrong thing.

| Repair                                                         | Dimension | Evidence                                                        |
| -------------------------------------------------------------- | --------- | --------------------------------------------------------------- |
| Revocation verified against a running gateway                  | D8, D6    | `sessionRevocationLive.test.ts`, 4 tests                        |
| An authorization failure is no longer reported as a server bug | D6, D8    | Mutation: restoring `-32603` fails the code assertion           |
| Revocation proven to take effect, not merely to be callable    | D8        | Mutation: a no-op `revokeAgentSession` fails 3 tests            |
| It keeps refusing across repeated attempts                     | D8        | A lapse would be worse than no button                           |
| The session is served _before_ revocation                      | D11       | Without it, a gateway that failed anyway would look like a pass |

**Score movement: none.** 97.5 holds. Third cycle running where the finding sat beneath a mark
already at full — D8 has read 10/10 since cycle 18, and a kill switch that reported itself as a
crash was inside that. The pattern is now consistent enough to state as a conclusion rather than an
observation: **at this level of completeness, the remaining defects are in what the system says
about itself, not in what it does.**

---

### Cycle 38 — 2026-09-01 · safe, and failing half the time

**Two processes, one workspace file — the product's normal case**, not an edge one: an agent
connected over MCP while the person has the app open, both writing.

**The safety property was already correct.** Two processes hammering one file produced **zero lost
updates** across eighty attempts. The store re-reads the raw bytes before writing and refuses if they
changed, which is a compare-and-swap on content and does exactly the job. That is worth recording as
plainly as a defect.

**What it did not do was retry, and 43% of those attempts failed.** The error told the caller to try
again. Nothing did. The in-app service already retried three times; this layer threw — so contention
was absorbed on one side of the product and handed to whoever was unlucky on the other. With a
bounded retry the same run lands **79 of 80**, still with no lost updates.

**The retry is not the store guessing a merge**, which it still refuses to do. It re-runs the
caller's `apply` against the file as it actually is. A caller that builds on `current` keeps the
other writer's work; one that replaces wholesale replaces it — which is what that caller asked for,
on either contract.

**And the change broke two existing tests, which is the part worth reading.** Both encoded the old
fail-closed contract: _"The other writer's work survives. That is the whole point."_ That contract
was deliberate, so rewriting it deserved more care than making the red go away. The tests now assert
the stronger property — the second attempt sees the other writer's state, and both survive — plus a
new one that contention which never settles still fails rather than looping. The retry is bounded,
not a loop.

**One of my own fixtures was wrong in an instructive way.** It interfered by writing the _same_
bytes each attempt, and the mutation succeeded — correctly, because the compare-and-swap is on
content, not modification time. An interfering write that changes nothing is not a conflict.

| Repair                                               | Dimension | Evidence                                                     |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------ |
| Bounded retry on workspace contention                | D9, D2    | `workspaceContention.test.ts`; 43% failures → ~1%            |
| Lost updates still impossible                        | D9        | 25 interleaved writers, 25 distinct records                  |
| Contention that never settles still fails            | D9        | Mutation: removing the retry fails 3 tests                   |
| A read-only call still writes nothing                | D9        | Rewriting on read would manufacture the conflicts it retries |
| The old contract rewritten deliberately, not deleted | D1        | Both replaced tests assert the stronger property             |

**Score movement: none.** 97.5 holds. D9 was already full, and this — like cycle 37 — closed a hole
beneath a mark already given. Two cycles running, the defects have been under existing scores rather
than in unscored ground, which is an argument for continuing to probe rather than for trusting the
total.

---

### Cycle 37 — 2026-09-01 · the guarantee that evaporated on restart

**Eight tests covered idempotency, and all of them passed, and the guarantee did not hold in the one
case the mechanism exists for.**

A repeated key within a session returns the stored result. A burst produces one artifact. A plan
cannot execute twice. Every one of those runs inside a single process, and the cache backing them is
a process-local `Map`.

So the protection held for every case that had been tested and evaporated on restart — **which is
precisely when a client sends a retry.** Nobody replays an idempotency key expecting the first
attempt to have been fine; they send it because the connection dropped and they do not know. Driving
the real gateway showed it: the same key, replayed after a restart, ingested a **second** activity
event. Two records where the client asked for one, and no error to notice.

That is the _duplicate irreversible execution_ hard gate, reached through the door marked "already
handled". The same mechanism guards `action.request`, where the duplicate would leave the product.

**The record now lives in the workspace as well as the cache.** The gateway re-reads the workspace
on every call, so a replay after a restart finds it. The cache stays as the fast path; the durable
entry is the one that survives. First write wins, matching the cache — a replay must return what the
original call returned, not what a later one would have — and the log is bounded at 200 entries like
the audit and receipt logs, because a workspace is not a journal.

**Why the existing tests could not have found this.** They were correct, thorough, and all in one
process. A guarantee about crash recovery cannot be verified without a crash, and the only way to
have one is to spawn something you can kill.

| Repair                                                 | Dimension | Evidence                                                           |
| ------------------------------------------------------ | --------- | ------------------------------------------------------------------ |
| Idempotency records persist to the workspace           | D9, D7    | `idempotencyAcrossRestart.test.ts`; retry after restart = 1 record |
| Verified by killing the process, not by simulating one | D9        | Mutation: memory-only lookup fails the test                        |
| A different key still does the work                    | D2        | A guard that refused everything would pass the first assertion     |
| Durable entries name their capability and are bounded  | D10       | An unattributed record cannot be reasoned about later              |
| First write wins on replay                             | D10       | A replay returns the original result, not a newer one              |

**Score movement: none.** 97.5 holds — D9 and D10 were already at full marks, and this closed a hole
beneath scores already given rather than earning new ones. The honest reading is that those marks
were slightly overstated until now.

---

### Cycle 36 — 2026-09-01 · the loop, and five wrong assumptions of mine

**No score movement this cycle, and that is the correct outcome.** The remaining points need
credentials, a model, and a deploy target. What this cycle did instead was verify a claim that had
only ever been asserted, and audit two surfaces that had never been looked at.

**Help and the public site now pass the structural accessibility audit.** Both render real HTML with
no props, both are the _first_ thing someone sees — the public site before they sign up, help when
something has already gone wrong — and neither had been checked. Both clean against all ten rules.

**The success criterion now runs through the actual gateway process.**
`mcpSuccessCriterion.test.ts` walks the loop against an in-memory client and says so plainly: it
performs "the same wiring `scripts/mcp-gateway.mjs` performs, so what passes here is what passes on
the wire." Cycle 34 showed that assumption is worth checking. A loop is not the sum of its calls: it
carries a plan id, a task handle and a proposal between them, and now does so across a process
boundary and a file the server re-reads rather than an object it holds.

**Five things failed, and all five were my test being wrong about the product.** Worth listing,
because each names a real design decision I had to go and read:

1. `context.read` refused with `bundles_not_granted` — I granted the capability and no bundle.
   Holding a capability is not holding the scope, which is the directive's own rule about a
   connection not being authorisation.
2. An ungranted capability returns a protocol-level `-32602`, not a tool envelope — cycle 7's
   mapping, because an authorization failure is not a tool that ran and declined.
3. The seed workspace has no plans, so the execution half of the loop had nothing to exercise. It
   was green on everything it could reach and silent about the part that matters.
4. Plan status returns `data.plan.id`, not `data.planId`.
5. `brandops_request_plan_execution` returns a **`CreateTaskResult`**, not an envelope — the Tasks
   extension working exactly as designed, which my helper read as a failure.

That last one produced the assertion most worth having: over the wire, the first observable state of
a requested execution is `input_required`. **The approval boundary is what a client sees first**, and
that is now proven at the transport rather than in a unit.

| Repair                                                       | Dimension | Evidence                                                        |
| ------------------------------------------------------------ | --------- | --------------------------------------------------------------- |
| Help and the public site audited for accessibility           | D13, D12  | Seven surfaces now, all ten rules, all clean                    |
| The full agent loop driven through the real process          | D6, D2    | `successCriterionLive.test.ts`, 8 tests                         |
| State proven to cross the process boundary via the file      | D9        | Each step sees what the last one persisted, not a shared object |
| Bundle scope and capability grants both enforced on the wire | D8, D3    | Mutation: weakening the bundle check fails the suite            |
| `input_required` confirmed as the first state a client sees  | D5, D6    | The approval boundary, at the transport                         |
| No conditional skip left in the execution test               | D11       | A workspace without a plan would pass it by never running       |

**Score movement: none.** 97.5 holds. Fourteen dimensions are full, D7 and D11 need things this
environment cannot supply, and the hard gate is open for want of a deployment.

---

### Cycle 35 — 2026-09-01 · the list that reshuffled itself

**D14's last gap was "no runtime measurement", on the grounds that latency needs a renderer.** Some
of it does. But `buildWorkspaceSnapshot` is a synchronous transform over the whole workspace that
produces everything the interface renders, and it runs on every workspace mutation. Its cost is the
floor under every interaction in the product, and measuring it needs no browser.

**Measured:** ~25 ms on an empty workspace, ~37 ms at three thousand contacts — the cost is fixed,
not per-record. It is held in `useState` and recomputed on change rather than on render, which is
the right architecture. And the view model is **~320 kB regardless of workspace size**: it
summarises rather than copying, which is what keeps the interface usable as someone's network grows
and is now pinned, because one `...contacts` spread would break it silently.

**Then a determinism check found a real defect.** Two rebuilds of an _unchanged_ workspace returned
the Unified Operational Inbox **in a different order** — the list that tells someone what needs
their attention, reshuffling while they read it.

The cause is the one cycle 6 fixed for checkpoints, in a different module: ten derived items were
each stamped `at: new Date()` as they were built, the list sorts by recency, and so the order
depended on how long the code took to reach each item. Derived items have no time of their own; they
now share one instant for the whole derivation, tie with each other by construction, and fall
through to a stable `id` tie-break. Real events keep the times they actually happened.

**Two of my own assertions overreached, and both corrections are worth keeping.** Byte-identity
across rebuilds asserts a clock does not move. Timestamp-stripped identity then failed on
`latencyLabel: "2ms expert execution"` versus `"0ms"` — a measured duration, which is supposed to
vary. The assertion now covers the inbox items with `at` removed: same items, same content, same
order.

**The timing bounds are deliberately loose, and that is honest.** Repeated measurement on one idle
machine varied by 2×. Bounds tight enough to be interesting would fail for reasons unrelated to this
code, and a flaky test is one people re-run rather than read. What they catch is a change of
_order_ — a nested loop over contacts would show as hundreds of times the work, not two.

| Repair                                                           | Dimension | Evidence                                        |
| ---------------------------------------------------------------- | --------- | ----------------------------------------------- |
| The operational inbox no longer reorders between rebuilds        | D2, D12   | Mutation: per-item timestamps fail 2 tests      |
| View model proven not to grow with the workspace                 | D14       | 320 kB at 10 contacts and at 3,000              |
| Rebuild cost measured and bounded against order-of-growth change | D14       | 30× the data costs ~2×, not ~900×               |
| A near-empty snapshot fails the size bound                       | D11       | Every other bound would pass on an empty result |
| Timing claims scoped to what a noisy runner can support          | D11       | Loose on purpose, and the reason is stated      |

**Score movement:** D14 2.5 → 3.0 — full marks. Total 97.0 → 97.5.

Full marks here means everything measurable without a browser is measured. **Paint, layout and real
interaction latency remain unmeasured** — those need a renderer, and this cycle did not pretend
otherwise.

---

### Cycle 34 — 2026-09-01 · framing

**The stdio gateway had never been executed either**, and it is the transport that matters most:
stdio is how Claude Desktop and most editors attach to an MCP server.
`mcpSuccessCriterion.test.ts` covers the same sequence and says so plainly — it "performs the same
steps as `scripts/mcp-gateway.mjs`, so what passes here is what passes on the wire." That is an
assumption, and it is the fourth cycle running where the gap between a tested module and an
unexecuted entry point held something.

**What only a real pipe can show is the framing.** Stdio is a byte stream, not a request/response
channel: a client may deliver two requests in one chunk or half a request in two, and the server
splits lines out of a buffer it maintains across chunks. Nothing had ever pushed bytes at it that
way. Both now verified — two pipelined requests are answered with the right ids, and a request cut
in half across two writes is reassembled.

**Also confirmed at the boundary a client meets:** a notification produces _no line at all_ rather
than an error line — cycle 7's fix where it actually matters, since a stray response to something
the spec forbids answering is a protocol violation a strict client will act on; a malformed line is
answered `-32700` and the process keeps serving, so one bad line does not end the session; a blank
line is ignored; and a declared `outputSchema` holds on the wire.

**A mutation that silently did not apply, for the second time in this run.** Dropping the
partial-line buffer appeared to fail nothing — the guard looked decorative. The replacement had
simply used the wrong indentation and never matched. Applied correctly, the split-request test
catches it exactly. **A mutation that does not apply reads identically to a guard that does not
bite**, and the only defence is checking the edit landed rather than trusting the count.

| Repair                                           | Dimension | Evidence                                                    |
| ------------------------------------------------ | --------- | ----------------------------------------------------------- |
| The stdio gateway process is spawned and driven  | D6, D9    | `mcpStdioGatewayLive.test.ts`, 9 tests                      |
| Stream framing verified in both directions       | D9        | Mutation: dropping the buffer fails the split-request test  |
| A notification writes nothing to the pipe        | D6        | Mutation: answering notifications fails it                  |
| A malformed line does not end the session        | D9        | One bad client line must not disconnect everything after it |
| The mutation itself was verified to have applied | D11       | The second silent no-op mutation this run                   |

**Score movement:** D9 holds at 7.0 (already full) and D6 at 7.0; the total moves 96.5 → 97.0 on D7
5.0 → 5.5, since the connector surface is now exercised through both live gateway processes as well
as a live socket.

**Both MCP transports are now verified against running processes.** What is still unverified is
unchanged and unchanged in kind: no third-party client has connected to either one.

---

### Cycle 33 — 2026-09-01 · the server nobody had connected to

**The directive's central claim is that BrandOps is a first-class MCP server.** `httpTransport.ts`
is covered thoroughly as a module. The 289 lines that turn it into something you can connect to —
reading the body, parsing headers, routing the path, writing the status — had never been executed by
anything.

Third cycle running of the same gap: the logic tested, the entry point not. It matters most here,
because an external agent does not import a module. **It opens a socket.**

So the real script is spawned on a real port and driven with `fetch`. Verified end to end:
`tools/list` and `ping` answer an authenticated caller; an unauthenticated request gets **401 with a
`WWW-Authenticate` challenge**, without which a client cannot discover how to authenticate; an
invalid token is refused; a refusal body carries no workspace content; a notification returns
**202 with an empty body** — cycle 7's fix, checked through an actual HTTP response for the first
time; an unsupported protocol version returns **-32022 with the supported list**, which is what lets
a client retry instead of guess; and RFC 9728 metadata is served _without_ a token, because
discovery that needs authentication cannot bootstrap.

**One expectation of mine was wrong, and correcting it produced better coverage than I planned.** A
nameless `tools/call` returned `-32020`, not `-32602`, because this binding requires an `Mcp-Name`
header that agrees with the body. That rule exists for a reason worth stating: a proxy routes on the
header, so if header and body can disagree, **what gets routed and what gets executed are different
tools.** One wrong assertion became four right ones — the header is required, a disagreeing header
is refused, a nameless call still yields `-32602` once the header agrees, and an agreeing call
succeeds.

| Repair                                                       | Dimension | Evidence                                                        |
| ------------------------------------------------------------ | --------- | --------------------------------------------------------------- |
| The HTTP gateway process is started and driven over a socket | D6        | `mcpHttpGatewayLive.test.ts`, 13 tests                          |
| Auth verified on the wire, not in the module                 | D6, D8    | Mutations: no-bearer fails 11 tests, bad-token fails 1          |
| Header/body agreement covered in both directions             | D6, D8    | Routing on one tool and running another is the risk             |
| Discovery works unauthenticated; refusals leak nothing       | D6, D8    | A gate you cannot learn to pass is not a gate, it is a wall     |
| Startup waits for the port rather than sleeping              | D9        | A timing guess passes on a fast machine and fails on a slow one |

**Score movement:** D6 6.5 → 7.0 — full marks. Total 96.0 → 96.5.

Full marks for D6 does **not** mean third-party interop is proven. No Claude Desktop, no Cursor, no
foreign client has ever connected to this server. What is now true is that everything verifiable
without one has been verified against a running process rather than an imported function — and the
remaining claim is stated as UNVERIFIED rather than scored.

---

### Cycle 32 — 2026-09-01 · the key that could come back

**D11's blocker was half true, which is the most misleading kind.** _Model answer quality_ cannot be
measured without a model, and nothing here claims otherwise. But the transport to an
OpenAI-compatible endpoint is a POST with a bearer header, and such an endpoint can be a `node:http`
server on localhost that needs no key to exist. Sixth blocker this run tested rather than restated;
sixth found narrower than claimed.

Existing coverage stubs `globalThis.fetch`, so `retryFetch` — whose entire purpose is reacting to
responses this product will really receive — had never seen one.

**Retry behaviour, now verified against a real server:** a 429 is retried and succeeds when the
limiter lets go; a 500 is retried and gives up after exactly four attempts, not one and not
endlessly; a **401 is not retried at all**, because a rotated key never becomes right by asking again
and retrying it wastes the user's time and trips abuse limits; a 404 likewise; a refused connection
throws rather than resolving to something a caller could mistake for a response.

**Then the security question found a real defect.** On an HTTP error the gateway returned
`message: openAiCompatibleHttpDetail(...)` and `raw: parsed` — **the provider's response body,
verbatim**. The inference base URL is operator-configurable; this product supports Azure OpenAI and
any OpenAI-compatible endpoint. Some gateways and proxies echo the request back in their errors, and
the request carries `Authorization: Bearer <key>`. That text flows into traces, checkpoints and the
interface.

The only redaction in the codebase covered `uri_hint` on a multimodal context ref — a different
field entirely. **A key that leaves in a header must not come back in something the product stores.**
It is now stripped where provider text enters, rather than at each of the places it is later written.

**And the fix silently did nothing at first.** `` in the patch became a literal backspace
character, so the regex was `/<backspace>Bearer…/` and matched nothing. The three tests failed
identically to having no redaction at all — which is exactly why they were written before the fix
was trusted.

| Repair                                                          | Dimension | Evidence                                              |
| --------------------------------------------------------------- | --------- | ----------------------------------------------------- |
| Provider transport exercised against a real endpoint            | D11, D7   | `providerTransport.test.ts`, 12 tests                 |
| Retry policy verified on 429, 500, 401, 404 and refused sockets | D9, D11   | Four attempts on 500; exactly one on 401              |
| Credentials stripped from provider text at the entry point      | D8        | Mutation: disabling it fails 3 tests                  |
| Redaction reaches nested fields and bare keys, not just headers | D8        | Providers quote keys both ways                        |
| Ordinary error text left intact                                 | D2        | Redaction that mangles real errors makes them useless |

**Score movement:** D11 4.0 → 4.5. Total 95.5 → 96.0.

D11 does not reach 5.0, and the remaining half point is the honest part: **no model has answered
anything.** Grounding, refusal behaviour and answer quality remain unmeasured, and a local server
returning a canned completion is not evidence about any of them.

---

### Cycle 31 — 2026-09-01 · delivery, over an actual socket

**"No live delivery verified" was blamed on credentials for thirty cycles.** True of Gmail, Slack
and CRM. Not true of the one connector that exists: an outbound webhook POSTs to a URL, and a URL
can be served by `node:http` on localhost with nothing to authenticate against. Fifth blocker this
run asserted rather than tested; fifth found narrower than claimed.

Until now the connector had only been exercised with an injected fake `fetchImpl` — which proves the
logic _around_ the call and nothing about the call, including whether the platform's real `fetch`
even satisfies the `FetchLike` shape the module declares. **A connector that has never touched a
socket is a connector nobody has seen work.**

**Now verified against a live listener:** the request arrives with the right method, path and
content type; the payload names the action, target and proposal so a receiver can act on it; a 500
and a 404 are reported as failures even though the socket answered; a refused connection produces a
reason rather than a crash; and the verification string carries the status and host a person can
check at the other end — which is where cycle 15's _proven vs claimed_ distinction gets its proof.

**The last test found a real gap.** `execute` would POST any action handed to it, relying entirely
on the dispatcher to have matched `actions` first. Today nothing unauthorised arrives, because the
dispatcher does match — which is exactly the reasoning that left
`approveAndDispatchExternalAction` dispatching without checking the approval had been granted, and
one feed item of eight without its lock. `execute` is reachable by anyone holding the connector and
is the last thing between a request and the network. It now enforces its own allowlist.

**And that fix immediately failed my own fixtures**, which sent `send-email` against the default
allowlist of `['webhook-post', 'notify']`. They had passed only because the check did not exist. The
fixtures were wrong, not the fix.

| Repair                                                  | Dimension | Evidence                                              |
| ------------------------------------------------------- | --------- | ----------------------------------------------------- |
| Delivery verified over a real HTTP socket               | D7, D10   | `webhookDelivery.test.ts`, 9 tests                    |
| The real `fetch` satisfies the declared `FetchLike`     | D7        | Passing the global in is part of the test             |
| 500, 404 and refused connections all report as failures | D7, D9    | "The server replied" and "the action happened" differ |
| The connector enforces its own action allowlist         | D8, D7    | Mutation: removing it fails the test that found it    |
| Verification carries status and host                    | D10       | Evidence a person can check at the receiving end      |

**Score movement:** D7 4.0 → 5.0. Total 94.5 → 95.5.

D7 does not reach 6.0 and should not: no vendor connector exists, and delivery to a socket that
answers 200 is not delivery to Slack's API. That remainder genuinely needs credentials — this cycle
removed the part of the claim that did not.

---

### Cycle 30 — 2026-09-01 · measuring the wrong theme

**"Contrast needs a browser" was wrong, and had been carried for six cycles.** Contrast is
arithmetic on two colours. The tokens are plain RGB triples in `src/styles/index.css`; the pairings
are declared in `shared/ui/tone.ts`. What needs a browser is whether the right colours end up
adjacent on screen — not what the ratio is once they do. Fourth blocker this run asserted without
testing, fourth found narrower than claimed.

**Then the first version of the measurement measured the wrong theme.** `index.css` defines every
token twice: `:root` for the dark default, `:root[data-theme='light']` for the light theme. A flat
scan over the file overwrites as it goes and ends up holding the _second_ — so every number reported
was light-theme, presented as the product's, and the dark default was never measured at all.

**Two mutations caught it.** Darkening `--color-text` in the dark block failed nothing; dulling
`--color-warning` failed nothing. A test that cannot fail when the thing it names gets worse is not
measuring that thing. Against the corrected suite the same mutations fail 1 and 4 assertions.

**The corrected result, both themes:**

|                          | dark (default)      | light               |
| ------------------------ | ------------------- | ------------------- |
| body / muted / soft text | 16.62 / 7.66 / 6.04 | 15.42 / 7.83 / 7.10 |
| weakest status chip      | 6.61                | 5.40                |
| focus ring               | 12.20               | 6.28                |

Every text pairing clears WCAG AA in both themes, and so does every focus ring — the one non-text
element a keyboard user cannot work without.

**Borders are recorded, not changed.** Below SC 1.4.11's 3:1 for non-text contrast: in the dark
default four of seven fall short (the plain and strong borders, plus `danger` and `info`); in the
light theme all seven do. Raising them lightens every edge in the product, which is a visual-identity
decision and not mine to make blind. The floors are pinned so the gap cannot widen unnoticed, and
they fail if a token _improves_ — at which point the number moves deliberately.

Stating that split precisely matters: the single-theme version of this file claimed _none_ of them
reach 3:1, which was true only of the theme it happened to be reading.

| Repair                                                 | Dimension | Evidence                                                        |
| ------------------------------------------------------ | --------- | --------------------------------------------------------------- |
| WCAG contrast computed for both themes                 | D13       | `colorContrast.test.ts`, 12 tests                               |
| Text and focus rings verified against AA in each theme | D13       | Dark from 6.04:1, light from 5.40:1                             |
| The parser reads one theme block, not the whole file   | D11       | Mutations to the dark theme failed nothing until this was fixed |
| Sub-threshold borders pinned per theme                 | D13, D12  | Cannot widen unnoticed; improving one is a deliberate edit      |
| A theme-parity assertion                               | D11       | Two token sets that differ, so one cannot stand in for both     |

**Score movement:** D13 2.5 → 3.0 — full marks. Total 94.0 → 94.5.

D13 at full marks does **not** mean the interface is fully accessible. It means everything
accessibility-related that can be verified without a browser now is: structure on five rendered
surfaces, keyboard operability, and contrast in both themes. Viewport reflow and focus _visibility_
remain genuinely browser-dependent, and are stated as such rather than scored as done.

---

### Cycle 29 — 2026-09-01 · what the documents were still claiming

**A finding I recorded around cycle 12 and never acted on.** `BRANDOPS_GOLDEN_WORKFLOWS.md` said
Workflow H was **"ABSENT. Not implemented."** and that Workflow B had "no memoryFirewall/activityGraph
as cited". All three modules exist. `buildAuthorityGraph` is wired into the agent gateway at
`gateway.ts:321` and covered by `mcpPhase1Capabilities.test.ts`.

That document was written to remove _phantom_ citations — the version before it cited an
`authorityIntelligence.ts` that never existed. It then drifted the opposite way and stayed there.
**Both directions are the same failure:** overclaiming sends someone to a feature that is not there,
underclaiming hides one that is, and this scorecard has been choosing what to work on from those
rows.

Corrected precisely rather than flipped: Workflow H is now **"EXISTS (agent surface only), WIRED
(gateway), TESTED (capability level), NOT RUNTIME_VERIFIED in the app"** — because nothing in
`src/pages` calls it. An external agent can reach it; a person using BrandOps cannot.

**The first version of the guard would have made a document worse.** It flagged five citations of
files that are not in `src` and, acted on literally, would have had me delete a design document's
proposals. Two were real errors — `builder/` paths for modules living in `plan/`, which that
document's own SOURCE-NOTE already corrected while its body kept using the old path — and are now
fixed. The other three are a proposal under "Create …", a second proposal the doc plainly states was
never built, and a historical record of a past audit. Each is recorded with its reason.

**Then the refined guard failed its own mutation, for a reason worth keeping.** Lines containing a
correction marker are skipped, so a document can name a wrong path in order to fix it. A mutation
citing `phantomModule.ts` was skipped — because the _filename_ contained the word "phantom" and
satisfied the exemption. The check now runs against the prose with citations stripped out. **A guard
a filename can switch off is not a guard.**

| Repair                                                       | Dimension | Evidence                                                      |
| ------------------------------------------------------------ | --------- | ------------------------------------------------------------- |
| Workflow H and B corrected to verified reality               | D1        | `authorityGraph` wired at `gateway.ts:321`, tested            |
| Documents cannot cite a file that does not exist             | D1        | `documentedAbsence.test.ts`, 5 tests                          |
| Documents cannot deny a module that does                     | D1        | Both directions of doc drift, not just the famous one         |
| Proposals and historical records distinguished from phantoms | D1        | Three exceptions, each with a stated reason                   |
| The exemption cannot be triggered by a citation's own text   | D11       | Mutation: `phantomModule.ts` was skipped until this was fixed |

**Score movement:** D1 stays at 8.0 — already full marks. Total 93.5 → 94.0 on D5 9.5 → 10.0: the
last of its gap was the authority capability's status being unverifiable from the documentation.

---

### Cycle 28 — 2026-09-01 · verifying the advice I gave

**Cycle 26 added a message telling users to export the workspace when storage fills. Nothing had
ever tested that export works.** A feature the product recommends under pressure, unverified, is a
promise made on someone else's behalf — so this cycle checked the advice rather than adding more.

**It holds.** A real workspace round-trips byte for byte; 1,500 contacts survive with no silent cap;
repeated cycles are stable, so a backup of a backup does not drift; and the export contains no
credentials — the provider key lives under a different storage key entirely, and `exportData`
serialises only the workspace. That is the honest result, and it is worth recording as plainly as a
defect would be.

**A measurement error along the way, because it nearly became the finding.** The first probe built
1,500 synthetic contacts and reported **117 kB silently stripped on import** — apparently serious
data loss. It was not. The synthetic records carried fields the contact schema does not define, and
`withDefaults` dropped them, which is correct: an import is a trust boundary, and a hand-edited or
foreign file does not get to introduce fields the product never defined. Checking against a real
workspace took one run and cost less than reporting the alarm would have.

That is the third instrument error in this session — after the regex a11y audit and the
substring-satisfiable CI check — and all three shared a shape: the fixture was the finding.

**Two things confirmed sound rather than repaired.** `withDefaults` rebuilds `workspaceIntelligence`
with a fresh timestamp on every load, which looked like it might cause spurious writes; change
detection uses reference equality (`next === data`), so it does not. And the credential separation
is structural, not incidental.

| Repair                                              | Dimension | Evidence                                                        |
| --------------------------------------------------- | --------- | --------------------------------------------------------------- |
| Export/import round-trip proven lossless            | D10, D2   | `workspacePortability.test.ts`, 8 tests                         |
| No silent cap on a large workspace                  | D10       | Mutation: a 1,200 cap fails 2 tests                             |
| An export carries no credentials                    | D8, D10   | Mutation: moving a key into the workspace fails the guard       |
| Repeated round trips do not drift                   | D9        | A backup of a backup restores identically                       |
| Schema normalisation on import asserted as intended | D4        | The behaviour that made a synthetic fixture look like data loss |

**Score movement:** D10 5.5 → 6.0 — full marks. Total 93.0 → 93.5.

D10 reaching full marks deserves a note: it does **not** mean external delivery has been verified.
It means every claim this product makes about what happened is now backed by a record, including the
claim that a user can get their data out. Live delivery remains unverified and is D7's gap, not
D10's.

---

### Cycle 27 — 2026-09-01 · the failure the user was never told about

**The gap cycle 26 recorded rather than fixed, closed — and I was wrong that it needed a browser.**

Cycle 26 established that the storage layer reports write failures correctly and that nothing above
it listened: several workspace writes are awaited without a `try`, `persistChatGatewayTrace` awaits
its `persist` callback without catching, and no `unhandledrejection` handler existed anywhere. I
recorded it as needing a browser to confirm what the user sees. That was too cautious. The shell
already has a user-visible surface — `dataOpsHint`, rendered through `WorkspaceDataHint` — and jsdom
can assert a message reaches it.

**This is the worst shape a failure can take in this product.** A visible error is recoverable: the
user exports, prunes, retries. A silent one is discovered later, when the work is already gone.

**The fix is deliberately not a `try` at each call site.** This codebase has repaired that twice —
cycle 10's dispatcher never asked whether the approval it was acting on had been granted, cycle 19's
opportunity card was the one feed item of eight that forgot its gate. A guard in the caller is one
the next caller will not have. One listener covers every unwrapped write, including ones nobody has
written yet.

The decision lives in its own module rather than inside the 3,000-line shell, for the reason the
attachment trust boundary was moved out of one: a decision buried in a view is a decision nobody can
test.

**Two halves that have to agree.** The storage layer marks what it throws; the listener recognises
the mark. A marker never applied would leave a perfectly written listener silent, so the suite
asserts the round trip through a real quota failure rather than testing each half against its own
assumption. Mutation: strip the marking and the round-trip test fails.

**The rejection is reported, not swallowed.** `preventDefault` is deliberately not called — telling
the user is not the same as handling the error, and marking it handled would hide the same event
from the console and from error reporting.

| Repair                                                         | Dimension | Evidence                                                          |
| -------------------------------------------------------------- | --------- | ----------------------------------------------------------------- |
| A failed save reaches the user, through one listener           | D2, D9    | `persistenceFailureNotice.test.ts`, 9 tests                       |
| Storage marks its failures; the listener recognises them       | D9        | Mutation: unmarking fails the round-trip test                     |
| Unrelated rejections stay quiet                                | D2        | A handler that cried wolf would be ignored                        |
| The listener unregisters cleanly                               | D9        | Repeated mounts must not stack duplicate notices                  |
| A template-literal regex that matched any character, corrected | D11       | `\.` inside a template collapses to `.`; `[.]` says what it means |

**Score movement:** D2 9.0 → 9.5. Total 92.5 → 93.0.

**A correction to my own last entry.** "Needs a browser to confirm what the user sees" was the wrong
call — it needed the surface to be located, which took one grep. That is the third time in this run
I have recorded something as externally blocked and been wrong; each time the check was cheaper than
the claim.

---

### Cycle 26 — 2026-09-01 · the platform with no tests

**BrandOps ships two ways, and only one of them had ever been tested.**

The Chrome extension gets `chrome.storage.local`. The Android app — built from the same `dist/`
through Capacitor — runs in a WebView with **no `chrome` namespace at all**, so every read and write
falls through to `localStorage`. Every existing suite that touches storage shims a `chrome` global
first. The adapter the shipped mobile app depends on had never been exercised.

That is the third variant of the same mistake in four cycles: cycle 23's CI could not pass because
`dist/` always existed locally; cycle 20's auth gate could be compiled away by a build flag nothing
inspected; this is a code path that only ran where nobody was looking.

**The two platforms differ in a way that matters.** `chrome.storage.local` is large and managed by
the browser. `localStorage` is a few megabytes and throws when it fills. A workspace that outgrows
it fails to save.

**What was already right, and is now asserted:** the adapter does reach `localStorage` rather than
falling silently to memory — a memory adapter would pass a round-trip test and lose everything on
relaunch; keys are scoped so they cannot collide with anything else on the WebView origin; a corrupt
entry is dropped rather than bricking the boot path; and with `localStorage` unavailable entirely
(private mode, site data disabled) the app still runs in memory instead of failing to start.

**What was wrong:** a full store reported the platform's own wording — _"The quota has been
exceeded"_ — which tells a user nothing they can act on. It now says the workspace storage is full,
that the change was not saved, and to export and prune. Quota is the one failure here a person can
actually do something about.

| Repair                                                          | Dimension | Evidence                                           |
| --------------------------------------------------------------- | --------- | -------------------------------------------------- |
| The mobile storage path has tests at all                        | D9, D2    | `mobileStoragePath.test.ts`, 10 tests              |
| Persistence proven, not assumed — memory fallback would hide it | D9        | Mutation: forcing the memory adapter fails 6 tests |
| A full store says what to do about it                           | D2, D9    | Quota is the one failure a user can act on         |
| A failed write is never swallowed                               | D9, D10   | Mutation: swallowing it fails 2 tests              |
| Keys scoped; corrupt entries dropped; memory fallback survives  | D9        | Each asserted against the WebView's shared origin  |

**Score movement:** D9 6.5 → 7.0 — full marks. Total 92.0 → 92.5.

**Recorded, not fixed.** Two of the workspace-persisting call sites in `mobileApp.tsx` are not
wrapped in a `try`, and there is no `unhandledrejection` handler anywhere, so a failed save at those
sites reaches the console and not the user. The storage layer now reports the failure correctly; the
interface above it does not yet listen. Routing that to a user-visible surface needs a browser to
confirm what the user actually sees, so it is named here rather than built blind.

---

### Cycle 25 — 2026-09-01 · the artifact nobody tested

**The release workflow never ran the tests.** `npm ci`, `npm run build`, `verify:dist`,
`package:release`, upload the Chrome Web Store tarball. No `check`, no `format`, no suite.

The CI workflow triggers on pushes to `main` and on pull requests. This one triggers on any `v*`
tag. **Nothing connected them.** A tag pushed at a commit that had never been tested would still
produce a packaged, uploadable extension — and twenty-four cycles of verification mean nothing if
the thing that ships is not the thing that was verified.

Both artifact jobs now depend on a `quality` job that runs the whole pipeline: `check`, `format`,
`build`, `test`, `test:integration`, `verify:dist`. The Android job gained `verify:dist` too, which
it had never run.

**Two weaknesses in my own guard, both caught by mutation rather than by reading it.**

The first attempt asserted `toContain('npm run test')`. Deleting the unit-test step left it green,
because `npm run test:integration` contains that substring. A check a _different line_ can satisfy
is not a check on the line it names. The CI-workflow test had the identical flaw and was hardened
the same way — steps are now compared whole.

Three mutations are run against the result: drop the `needs: quality` dependency, delete the release
suite step, weaken CI's test step. All three fail the guard. The first version caught one of three.

| Repair                                         | Dimension | Evidence                                                      |
| ---------------------------------------------- | --------- | ------------------------------------------------------------- |
| Release artifacts gated on a full quality job  | D15       | `ciPipelineContract.test.ts`, 9 tests                         |
| The Android job verifies the artifact it syncs | D15       | It had never run `verify:dist`                                |
| Steps compared whole, not by substring         | D11       | `npm run test:integration` satisfied a check meant for `test` |
| Three mutations, three failures                | D11       | The first version of the guard caught one of them             |

**Score movement:** D15 1.5 → 2.0 — full marks for the dimension, with the gate still open. That
reads oddly and is correct: every point in D15 is for _readiness to deploy_, and the release
pipeline is now sound. **The hard gate is not a scored line.** It stays open because no staging
environment and no production deployment exist, and it overrides the total regardless of what any
dimension scores.

---

### Cycle 24 — 2026-09-01 · read your browsing history

**The extension asked for two permissions it never used, and one of them is the scariest prompt
Chrome shows.**

The manifest requested `tabs`. The only `chrome.tabs` API in the codebase is `chrome.tabs.create` —
which requires **no permission at all**. What `tabs` actually grants is read access to the `url`,
`title` and `favIconUrl` of every open tab, and Chrome renders that at install time as
_"Read your browsing history"_.

So someone installing a tool to manage their own professional profile was being asked to hand over
their browsing activity, in exchange for nothing. It is hard to imagine a worse trade at the exact
moment a product is asking for trust.

`activeTab` was equally unused. It exists to grant temporary host access when the user invokes the
extension, and nothing here injects — no `chrome.scripting`, no `executeScript`, no `insertCSS`, no
`tabs.query`. The LinkedIn content script runs from `host_permissions` and `matches`, a separate
mechanism entirely.

Both removed. The shipped manifest now requests `storage`, `alarms`, `notifications`.

**What the audit found clean, and is now asserted:** standing host access is limited to LinkedIn and
the two model endpoints; the wildcard `https://*/*` sits in `optional_host_permissions`, where the
user is asked at the moment it is needed and can refuse; the content script injects only into
LinkedIn; exactly one file is web-accessible, and only to LinkedIn.

**My own guard nearly caused the harm it was written to prevent.** The first version required a
literal `.` after each API namespace, so `chrome.notifications?.create` — how the background script
guards a possibly-absent API — did not match, and the test reported a permission the product
genuinely needs as unused. A guard whose failure mode is _remove a working feature's permission_ is
worse than no guard. The pattern is now written once, with optional chaining, instead of twelve
times by hand.

| Repair                                                   | Dimension | Evidence                                                         |
| -------------------------------------------------------- | --------- | ---------------------------------------------------------------- |
| `tabs` and `activeTab` removed from the manifest         | D8, D15   | `extensionPermissions.test.ts`; mutation: restoring `tabs` fails |
| Permissions checked against API usage in both directions | D8        | Over-asking and under-declaring are different mistakes           |
| Standing host access limited; wildcard kept optional     | D8        | Broad access asked for at point of need, refusable               |
| Content script and web-accessible resources confined     | D8        | Every origin it runs on can influence stored records             |
| The matcher handles optional chaining                    | D11       | Its failure mode was to recommend removing a needed permission   |

**Score movement:** D15 1.0 → 1.5. Total 91.0 → 91.5. D8 is already at 10.0 and does not move.

**The gate stays open.** Still no staging, still no production. What this changes is what a user is
asked to grant on install, which is a real property of the shipped product rather than a step toward
deploying it.

---

### Cycle 23 — 2026-09-01 · none of it was gating anything

**Twenty-two cycles of verification are worth whatever CI enforces of them, and CI could not have
been passing.** Two independent reasons — one inherited, one mine.

**Prettier failed on 132 files, 126 of them predating this work.** `npm run format` is
`prettier --check .`, a hard step in the workflow, so the job failed before a single test ran. That
is what _"CI runs an older tree"_ has meant in this scorecard since it was written. Fixed by
formatting the repository.

**The steps ran in an order my own tests had broken.** Cycles 14 and 20 added suites that verify the
_shipped artifact_ — bundle weight, and whether the auth gate survives minification. Both **fail
rather than skip** when `dist/` is absent, deliberately: an unverified build must not pass as a
verified one. CI ran tests _before_ the build, so on a clean checkout six of them failed.

I introduced that in cycle 14 and did not notice for eight cycles, because locally `dist/` always
existed. A check that only runs in an environment where it happens to work is not a check — the same
lesson this codebase keeps teaching, this time about my own tooling rather than the product's.

**Verified by running the pipeline in CI's exact order:** `check` → `format` → `build` → `test` →
`test:integration` → `verify:dist`. All six steps pass. That had not been true at any point in this
session.

| Repair                                                  | Dimension | Evidence                                                              |
| ------------------------------------------------------- | --------- | --------------------------------------------------------------------- |
| CI builds before it tests                               | D15       | `ciPipelineContract.test.ts`; mutation: restoring the old order fails |
| Repository formatted; `format` step passes              | D15, D1   | 132 files, 126 of them pre-existing                                   |
| The workflow's required steps are asserted, not assumed | D15       | Each caught something real in this codebase                           |
| `format` stays `--check`, never `--write`               | D15       | A rule that rewrites and passes is not enforced                       |
| `test` stays the whole suite, not a subset              | D11       | A narrowed pattern would shrink CI while local runs looked complete   |

**Score movement:** D15 0.5 → 1.0. Total 90.0 → 91.0.

**The gate stays open, and this does not move it.** There is still no staging environment and no
production deployment. What changed is that the pipeline gating this work can now actually run —
which is a precondition for deployment readiness, not evidence of it.

---

### Cycle 22 — 2026-09-01 · the other direction

**Cycle 21 closed the read path out of the companion. This is the write path in** — where content
the user did not author enters durable storage. A LinkedIn profile is written by whoever owns it,
and the companion scrapes its name, headline and company straight out of the page before filing
them into the workspace.

**Two checks came back clean, and both are worth recording rather than assuming.**

_Nothing renders captured text as HTML._ No `dangerouslySetInnerHTML` anywhere in `src`; the only
`innerHTML =` is `select.innerHTML = ''`. React escapes text nodes, so a headline carrying
`<img onerror=…>` is inert. Stored XSS from a hostile profile into the extension is not reachable —
a guard test now enumerates the whole tree so a sink added later fails immediately.

_Model prompts already quote these fields._ Cycle 13 wrapped every workspace value interpolated into
an `ask:` command, including `opportunity.company` and `opportunity.nextAction`, which is exactly
where captured text resurfaces. Work done for one reason turned out to cover this path too.

**What was unasserted was the boundary itself.** A capture writes five collections — contacts,
opportunities, outreach drafts, notes, follow-ups — and must never reach the Digital Twin,
achievements or evidence. A profile someone else wrote must not become verified professional
evidence about _this_ user. It held. The test now diffs every top-level key of the workspace, so an
edit that writes somewhere new fails rather than being noticed later.

| Repair                                                                         | Dimension | Evidence                                                                       |
| ------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------ |
| A capture provably touches only its five collections                           | D4, D8    | `companionCaptureBoundary.test.ts`, 11 tests                                   |
| The Twin, achievements and evidence are byte-identical after a hostile capture | D4        | The fourth invariant on the scrape path                                        |
| No HTML sink exists anywhere in `src`                                          | D8        | Enumerated, not spot-checked                                                   |
| Oversized fields truncate; markup is stored as text                            | D9, D8    | 20,000 characters from a page the user does not control is a denial of service |
| Every captured record carries `source: 'linkedin-companion'`                   | D10       | Provenance separates a lead the user entered from a scraped string             |

**A wrong expectation of mine, corrected.** The first version demanded that a capture change all
five collections. It changes only what its inputs call for — no follow-up date, no `followUps` write
— so the assertion was testing the fixture, not the boundary. It now asserts containment, with a
second case that exercises the fifth collection deliberately.

**Score movement:** total 89.5 → 90.0, from D12 7.5 → 8.0: both directions of the companion's
boundary are now verified. D4 holds at 7.0 — already full marks, and this cycle confirmed the
invariant rather than extending it.

---

### Cycle 21 — 2026-09-01 · the dropdown that published the pipeline

**P0. The most serious defect found in twenty-one cycles, and the only one that exposed real user
data to a third party.**

Checking the remaining shipped entry points showed that `linkedinOverlay.js` — the content script
injected into `linkedin.com` — pulls `chunks/storage.js`, the entire workspace layer. It loads the
workspace through `storageService.getData()` and renders the user's own pipeline into `<select>`
options so a capture can be filed against the right record.

**It appended that UI straight into `document.body`.** Driven in a DOM with a demo workspace loaded:

```
companiesInPage      = 2/2   Northstar Robotics, SignalForge
opportunitiesInPage  = 2/2
optionCount          = 6
shadowHosts          = 0
```

Company names and opportunity titles, sitting in LinkedIn's own markup, readable by any script on
that page with one `querySelectorAll('option')`.

A content script's _variables_ are isolated from the page. **The DOM it creates is not**, and that
distinction is the entire defect — the isolation people assume content scripts have does not cover
the thing this code was doing. BrandOps exists to hold professional identity data, and a slice of it
was being published into a third-party page as a side effect of drawing a dropdown.

**Fixed by mounting the companion in a `closed` shadow root**, with the stylesheet moved out of
`document.head` to travel with it. Closed rather than open, so page scripts cannot walk in through
`host.shadowRoot` either.

**The test asserts the feature as hard as the fix.** Rendering nothing would also empty the page and
would pass a leak test while destroying the companion, so the suite proves the panel, its styles and
its populated options all exist inside the shadow root — captured by spying on `attachShadow`,
because a closed root cannot be reached afterwards, rather than weakening the mode to observe it.

| Repair                                                    | Dimension | Evidence                                                               |
| --------------------------------------------------------- | --------- | ---------------------------------------------------------------------- |
| Companion mounts in a closed shadow root                  | D8        | `overlayIsolation.test.ts`, 7 tests                                    |
| Stylesheet travels with the panel, not into the page head | D8, D12   | Nothing inferable from the page's head                                 |
| The panel, its styles and its options still exist         | D2        | A fix that broke the feature would pass a leak test                    |
| The root is closed, not open                              | D8        | `host.shadowRoot` is null to page scripts                              |
| Mutation-verified                                         | D11       | Restoring the light-DOM mount fails 4 tests, naming the leaked records |

**Score movement:** D8 is already 10.0 and cannot rise; D2 8.5 → 9.0 is not claimed either, because
nothing about the workflow improved. Total 89.0 → 89.5 on D12 7.0 → 7.5: the surface now has a
verified isolation boundary it did not have.

**What this says about the other entry points.** `background.js` also pulls `chunks/storage.js`, but
runs in the extension's own service worker with no host page — no equivalent exposure. `help` and
`index` pull neither storage nor the workspace surface. The overlay was the one entry point running
inside somebody else's page, and it was the one with the defect.

---

### Cycle 20 — 2026-09-01 · what actually stops an unauthenticated user

**Extending cycle 19's method to the other four surfaces produced a correction to cycle 19.**

Driven the same way, `Today` and `Integrations` render with **no lock affordance at all** — 52 and
24 controls, none disabled, firing 15 and 24 workspace commands under a single click sweep. And
`runAgentQuick`, the shared entry every surface routes through, checks only
`!trimmed || commandLoading`. Read on its own, that is an open door.

**It is not, and the reason is the shell.** When `shouldRequireLaunchAuth` is true the mobile shell
renders `LaunchAuthGate` _instead of_ any tab surface. Those controls are never reachable while
locked. The hub's `canRunWorkspaceCommands` is a second layer underneath that one.

Which means **cycle 19's `Convert` gap was a real inconsistency in a layer a live user cannot
currently reach** — defence in depth with a hole in it, not an open door. The fix was right; the
severity I implied was not, and this entry corrects it.

**The gate that does the work had no test.** Two things are asserted now.

_The decision, for every input._ Auth × membership × tab, enumerated: anyone not signed in is
locked on **every** tab including `settings`, because the settings exemption belongs to the
membership gate — somewhere to fix billing — and must not extend to authentication.

_The decision as shipped._ `VITE_SKIP_LAUNCH_AUTH` disables the wall entirely and Vite inlines it at
build time, so a build made with it set compiles the check away to a constant **with no source
change to notice**. Verified against `dist`: the real build compiles to
`function Me(t){return!t.auth.isAuthenticated}` — skip branch eliminated, check intact. Rebuilt with
the flag set, it becomes `function Me(t){return!1}`, and the test fails. That is the mutation, run.

| Repair                                                      | Dimension | Evidence                                                           |
| ----------------------------------------------------------- | --------- | ------------------------------------------------------------------ |
| Auth gate decision enumerated over every input combination  | D8        | `launchGateContract.test.ts`, 6 tests                              |
| Auth lock covers `settings` too                             | D8        | The membership exemption must not extend to authentication         |
| The shipped bundle is verified, not the source that made it | D15, D8   | Mutation: a skip-flag build is detected                            |
| A missing build fails rather than skips                     | D11       | An unverified artifact must not pass as a verified one             |
| Membership recorded as not a security boundary              | D10       | Enforcing an unverifiable entitlement client-side would be theatre |

**Score movement:** D15 0.0 → 0.5. Total 88.5 → 89.0. The deployment gate stays **open** — there is
still no staging, no production, and CI runs an older tree. What changed is narrower and real: the
artifact this repository produces is now checked, so one specific way of shipping an unlocked build
cannot pass silently.

---

### Cycle 19 — 2026-09-01 · one of eight

**The gap cycle 18 named, closed.** That cycle recorded `Convert` as _unverified_ rather than
verified-absent — its terminal action sat behind an interaction the harness did not drive. This
cycle drove it, and the honest answer turned out to be worse than the uncertainty.

**`Convert` was never gated at all.** Not two-step, not hidden: of eight feed items on the plan hub,
seven set `primaryDisabled: disabled` and the opportunity card did not. So a locked workspace
disabled that card's `Review` action and left its `Convert` action live — while `Convert` calls
`onConvertPredictiveOpportunityToPlan`, which writes a plan into the workspace.

The two items that legitimately omit the flag are `Set up` and `Open setup`. They navigate to the
screens that lift the lock, and disabling them would strand the user inside it. That is what made
the outlier readable: seven gated, two deliberately exempt, one simply forgotten.

**The probe that found it initially found nothing** — clicking `Convert` fired no callback and
opened no row, because the harness passed the wrong prop name. Reading _why_ one control behaved
differently from its neighbours is what turned a null result into the defect.

**The guard closes the class, not the instance.** Fixing `Convert` fixes today. The new assertion
asks the question of every control the surface renders: while locked, nothing may be enabled unless
it matches an enumerated read-only set — navigation, filters, the settings route, and `Export`.
A feed item added next month that forgets `primaryDisabled` fails here rather than waiting to be
driven by hand.

| Repair                                                            | Dimension   | Evidence                                               |
| ----------------------------------------------------------------- | ----------- | ------------------------------------------------------ |
| `Convert` gated like the other seven action items                 | D12, D8, D2 | `interactionSafety.test.tsx`                           |
| Every rendered control checked against the lock, not a known list | D1, D12     | The enumerated read-only set is the only exemption     |
| Read-only `Export` stays available, asserted deliberately         | D2          | A locked user can still take their own data out        |
| A near-empty render fails the sweep                               | D11         | Nothing to judge would otherwise pass as nothing wrong |
| Mutation-verified                                                 | D11         | Re-opening the gap fails 2 tests, naming `Convert`     |

**Score movement:** D12 6.5 → 7.0. Total 88.0 → 88.5. D12's remaining 1.0 is visual regression and
viewport reflow, which need a browser.

---

### Cycle 18 — 2026-09-01 · the test that passed while proving nothing

**Continuing the correction from cycle 17.** Interaction testing was also recorded as blocked.
It is not: `react-dom/client` mounts into `jsdom`, handlers fire, `document.activeElement` updates,
events dispatch. Two categories of work were labelled impossible without anyone running the check.

**The subject: is the workspace lock real, or is it styling?** `canRunWorkspaceCommands: false`
disables controls. A disabled _look_ is not a disabled _control_ — if the handler still fires, a
locked workspace executes anyway.

**The first version of this test passed, and proved nothing.**

It clicked every enabled control on a locked workspace, observed no command, and concluded the lock
held. Then the counter-case — the identical sweep on an _unlocked_ workspace — ran nothing either.
The sweep was measuring a broken harness.

Two causes, both worth knowing. The harness watched **one callback out of six**. And this surface's
actions are two-step: a click expands a row and the action button appears inside it, so a single
pass over the initial buttons reaches almost nothing — exactly two controls fire in one pass.

Without the counter-case this would have been recorded as "lock verified". That is the third time in
this run that a deliberately-added honesty check caught a green result that meant nothing, and the
first time it happened inside the same cycle as the claim.

**What is actually demonstrated,** after narrowing to what the harness can reach: with the workspace
locked, every `Approve`, `Review`, `Handle` and `Explain` control is `disabled` — 22 of 46 buttons —
and all of them are enabled when unlocked. `disabled` on a native button is enforced by the platform
for pointer and keyboard alike, which is why the audit also checks that no control is a `div` with
`role="button"`. The route out of the lock still works: `Set up` reaches settings.

| Repair                                                           | Dimension | Evidence                                              |
| ---------------------------------------------------------------- | --------- | ----------------------------------------------------- |
| Lock verified in the rendered interface, not assumed from source | D12, D8   | `interactionSafety.test.tsx`, 8 tests                 |
| The counter-case that keeps it honest                            | D11       | Unlocked, the same controls are enabled               |
| Every control is a native button                                 | D13       | `disabled` is a platform guarantee, not a style       |
| The escape hatch survives the lock                               | D2        | A lock with no way out strands the user inside it     |
| Mutation-verified                                                | D11       | Neutralising the `disabled` props fails the assertion |

**Recorded rather than claimed.** `Convert` stays enabled while locked. Its terminal action is
behind an expand step this harness does not drive, so whether it is gated is **unverified** — not
verified-absent. A test asserts the situation is still as described, so the note fails loudly when
it stops being true. `Export` also stays enabled, deliberately: a user who cannot run commands
should still be able to take their own data out.

**Score movement:** D12 6.0 → 6.5, D8 9.5 → 10.0. Total 87.0 → 88.0.

---

### Cycle 17 — 2026-09-01 · the renderer was already here

**A correction first.** For several cycles this scorecard has recorded accessibility and frontend
work as blocked "pending a renderer", and I repeated that when reporting what was left. It was too
broad, and checking rather than repeating it took one command.

`jsdom` is a dependency. `react-dom/server` renders these surfaces in tests that already existed.
**Structural accessibility needs a DOM, not a browser** — and a DOM was available the whole time.
What genuinely needs a browser is narrower than claimed: colour contrast, focus visibility, reflow
at viewport widths. Those remain unasserted and unclaimed.

**The instrument was the problem, not the access.** An earlier cycle audited accessibility with
regular expressions over `.tsx` source. It reported 133 violations, then 9; the true count was zero
both times, and both numbers were retracted. Rendered HTML makes the question answerable rather
than approximable — and the retraction turns out to have been right, which this cycle confirms
properly for the first time.

**Ten rules over five surfaces:** unnamed controls, missing `alt`, unlabelled fields, positive
`tabindex`, dangling `aria-*` references, duplicate ids, nested interactive elements, focusable
content inside `aria-hidden`, non-`li` children of lists, skipped heading levels.

**One real finding, and it is the drift pattern again.** Two file inputs in the settings surface
were hidden with `className="hidden"` and nothing else — no `aria-hidden`, no `tabIndex={-1}`, no
name. `ChatCommandBar` already contained the correct version of the same pattern. Not a live defect,
since `display:none` removes them from the accessibility tree; a latent one, because changing the
hiding technique to `sr-only` would leave two unnamed focusable controls behind. Fixed by aligning
to the codebase's own correct implementation.

| Repair                                                         | Dimension | Evidence                                                           |
| -------------------------------------------------------------- | --------- | ------------------------------------------------------------------ |
| Structural a11y audit on rendered HTML, five surfaces          | D13, D12  | `accessibilityAudit.test.ts`, 7 tests                              |
| The audit is proven against a page built to fail all ten rules | D11       | A clean result now means the rules ran                             |
| A surface rendering almost nothing fails                       | D11       | The regex audit's failure mode, in a new costume                   |
| Two hidden inputs aligned to the existing correct pattern      | D13       | `aria-hidden` + `tabIndex={-1}`, as `ChatCommandBar` does          |
| The rule skips what is genuinely outside the a11y tree         | D13       | Demanding names for unannounced elements produces decorative fixes |

**Score movement:** D13 2.0 → 2.5, D12 5.0 → 6.0. Total 85.5 → 87.0.

Neither reaches full marks, and the reason is now precise rather than a blanket "needs a renderer":
contrast, focus visibility and viewport reflow are decided by layout and paint, which jsdom does not
do.

---

### Cycle 16 — 2026-08-31 · the last bare reference

**Weakest dimension targeted:** D5 at 8.5/10 — the remainder cycle 9 named. Instead of probing
whichever surface came to mind, the proposal kinds were enumerated and each checked for what its
approval actually binds to:

| kind                  | binds to                |                       |
| --------------------- | ----------------------- | --------------------- |
| `twin_update`         | payload on the proposal | bound by construction |
| `artifact`            | payload on the proposal | bound by construction |
| `content_opportunity` | payload on the proposal | bound by construction |
| `external_action`     | payload on the proposal | bound by construction |
| **`promotion`**       | **a `targetId`**        | **not bound**         |

One kind exposed — and it is the kind that writes `USER_VERIFIED` state.

**A proposal reading "Verify achievement: Fixed a typo in the README" was approved, and "Led the
company-wide platform rewrite" became verified professional evidence.**

That is worse than the plan case of cycle 9, and the difference is worth stating. The output is a
claim about a real person's career, recorded at the highest trust tier in the system, and the ledger
would say the user verified something they never read. The fourth invariant is not only that an
agent cannot promote — it is that the _person_ who promotes knows what they promoted.

**A binding that cannot be computed is not a binding that passes.**
`promotionApprovalBinding` returns `undefined` when the target has been deleted, and
`checkApprovalBinding` treats that as a mismatch rather than an absence. The alternative —
`undefined` quietly meaning "no objection" — is how a guard becomes decorative.

| Repair                                                                   | Dimension  | Evidence                                                          |
| ------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------- |
| Promotion approvals bind to the achievement or Twin deltas the user read | D5, D4, D8 | `promotionBinding.test.ts`, 9 tests                               |
| Description and reason are in the fingerprint, not just the title        | D4         | The title is read first; the description is what becomes evidence |
| A deleted target refuses, rather than passing as unbound                 | D5         | Asserted directly                                                 |
| The refusal message names promotion, not plans                           | D2         | A user verifying an achievement is not told a plan changed        |
| Every proposal kind now accounted for, by enumeration                    | D1         | The table above is the test's own reasoning                       |
| Mutation-verified                                                        | D11        | Removing the check fails 2 tests                                  |

**Score movement:** D5 8.5 → 9.5, D4 6.5 → 7.0 (its weight is now fully earned). Total 84.0 → 85.5.

**What remains in D5** is the last 0.5: no execution has been observed under real concurrency, and
no plan has been executed against a live external system.

---

### Cycle 15 — 2026-08-31 · a ledger of successes

**Weakest dimension targeted:** D10 at 5.0/6. Cycle 8 gave receipts the governance record they had
been discarding. Enumerating the dispatcher's outcomes rather than probing one found two gaps that
had survived it.

**The ledger held only successes.** `createReceipt` was called on the success path alone. The four
other outcomes — no connector, not approved, refused, failed — wrote a checkpoint and no receipt. So
the artifact built to answer _what happened to my request_ could not answer it for any request that
did not work, which is the only time anyone asks.

That is a bias, not an omission: an auditor reading the receipt ledger would see a system that
always succeeds.

**Verification lived in prose.** The dispatcher knew whether the connector had returned independent
proof and put the answer in an English sentence inside `summary`. `ReceiptVerification` was a defined
type nothing wrote — the same shape as `ExecutionReceipt` itself before cycle 8. Telling _verified_
from _claimed_ meant parsing a sentence, and that is precisely the distinction the directive asks
receipts to keep.

**`blocked` and `failed` are now kept apart deliberately.** Nothing was attempted versus something
was attempted and did not work. Collapsing them would send a user to check a destination that was
never contacted.

| Repair                                                               | Dimension | Evidence                                                           |
| -------------------------------------------------------------------- | --------- | ------------------------------------------------------------------ |
| Every outcome writes a durable receipt                               | D10       | `receiptCompleteness.test.ts`, enumerated from the outcome union   |
| `verification` recorded structurally: `system-verified` vs `pending` | D10, D4   | Proof returned by the connector, or its absence, as data not prose |
| No outcome that did not run claims verification                      | D10       | Asserted across every non-success scenario                         |
| Blocked, failed and rejected are three different results             | D10, D2   | A user is told whether to retry, reconnect, or re-request          |
| No approver named for an action nobody approved                      | D8        | A superseded proposal's receipt carries no `approvedBy`            |
| Mutation-verified                                                    | D11       | Dropping the receipt from one path fails 3 tests                   |

**Score movement:** D10 5.0 → 5.5. Total 83.0 → 84.0. D10 does not reach 6.0 for the reason it has
never reached it: **no live delivery has been verified end to end.** Every receipt in this cycle
describes a test connector. The structure for recording real proof is now correct and empty.

---

### Cycle 14 — 2026-08-31 · measuring what ships

**Weakest dimension targeted:** D14 at 1.5/3, whose gap has read **"zero frontend performance
measurement"** since this scorecard was written. Visual regression, viewport testing and interaction
latency all need a renderer this environment does not have. Bundle weight does not — and it is the
frontend property that decides first paint on a phone.

**The measurement, on gzip, because gzip is what crosses the network:**

| chunk                  | raw         | gzip       |
| ---------------------- | ----------- | ---------- |
| `renderChatbotSurface` | 675 kB      | 182 kB     |
| `storage`              | 339 kB      | 93 kB      |
| `react`                | 134 kB      | 43 kB      |
| `launchLifecycleGate`  | 81 kB       | 27 kB      |
| **total**              | **1337 kB** | **380 kB** |

**Clean:** no test code, no fixtures, no source maps reach `dist`. Worth confirming rather than
assuming, and now asserted every run.

**Not clean, and specific:** `integrations.js` is a 0.5 kB entry point that pulls
`renderChatbotSurface`, `storage` and `launchLifecycleGate` to render a page that is not the chat
surface. It costs **355 kB gzip against `help.js`'s 62 kB** — 5.7× for a page that does not need it.
`index`, `dashboard` and `help` avoid the surface chunk correctly, so this is one entry point's
import graph, not an architectural given.

That is recorded rather than fixed. Splitting it is a real improvement and needs a renderer to
confirm the page still renders; changing how a screen loads without being able to load it is how a
"cleanup" ships a blank page.

**A measurement error caught before it was written down.** An early pass reported "200 kB of long
string literals" inside the storage chunk, implying a large embedded content table. The regex had
matched _minified code_ spanning quote characters, not string content. The chunk is application
code. The claim was wrong and did not reach the scorecard.

| Repair                                                   | Dimension | Evidence                                                           |
| -------------------------------------------------------- | --------- | ------------------------------------------------------------------ |
| Per-chunk and total gzip budgets, enforced every run     | D14       | `bundleBudget.test.ts`, 5 tests                                    |
| A missing build fails rather than skips                  | D14, D11  | A skipped perf test reads as coverage while asserting nothing      |
| An unlisted chunk over 20 kB must be given a budget line | D14       | New weight has to be looked at, not absorbed by slack in the total |
| No test code, fixtures or source maps in `dist`          | D14, D8   | Asserted, not assumed                                              |
| Mutation-verified                                        | D11       | Tightening the storage budget below measured fails the run         |

**Score movement:** D14 1.5 → 2.5. Total 82.0 → 83.0. D14 does not reach 3.0: nothing here measures
runtime. Interaction latency, render cost and memory need a renderer, and claiming them from a
bundle measurement would be exactly the substitution this directive forbids.

---

### Cycle 13 — 2026-08-31 · one hundred and seven

**The question cycle 12 left open.** One model-input site had been found by probing and fixed. How
many others were there? The answer could not be "the ones I thought to check" — that is exactly the
reasoning that left the Opportunity Engine unfenced while the ASK attachment path beside it was
hardened.

So the surface was enumerated rather than sampled: every template literal opening an `ask:` command,
every `${...}` inside it, across `src/pages` and `src/services`.

**107 unquoted interpolations.** Not four. Titles, details, evidence lists, opportunity names,
company and role fields, twin memory, artifact bodies, agent rationales — workspace-derived free
text going raw into strings bound for the model, in the same `Field: value` shape a value with a
newline can forge.

83 sites across 21 files are now quoted. The remaining 24 are values from closed sets — statuses,
kinds, numbers, module constants — and the guard recognises them by a **vocabulary rule** rather
than an ever-growing exemption list, so `task.status` and `content.status` are both covered without
either being written down.

**The heuristic failed once, and the failure is instructive.** The codemod matched safe field names
case-insensitively by suffix, so `item.whatAiDid` — free text describing what an agent did — was
skipped because it ends in the letters "id". A rule based on what things are _named_ is only as good
as the naming. The guard's version is narrow and case-sensitive, and that one site is now quoted.

| Repair                                                   | Dimension | Evidence                                                |
| -------------------------------------------------------- | --------- | ------------------------------------------------------- |
| 83 interpolation sites across 21 files quoted            | D2, D8    | `modelInputSurface.test.ts`; 107 → 0 findings           |
| Guard matches the shape, not a file list                 | D1        | A new command builder is in scope the day it is written |
| Closed-set values recognised by rule, not by enumeration | D1        | The exemption list shrank from 16 to 13                 |
| A guard that matches nothing fails loudly                | D11       | `finds the command builders at all`                     |
| Mutation-verified                                        | D11       | Un-quoting one site fails the guard                     |

**What this does not establish.** Quoting bounds the damage; it does not prove a model ignores a
quoted instruction. That needs a provider and belongs to D11, which stays at 4.0 for exactly this
reason. The claim here is narrow and true: untrusted workspace text can no longer forge the
structure of a prompt.

**Score movement:** D1 7.5 → 8.0, D2 8.5 → 9.0. D8 holds at 9.5 — the surface it was scored on is
now known to have been 25 times larger than believed, so completing it restores the existing score
rather than earning more. Total 80.5 → 82.0.

---

### Cycle 12 — 2026-08-31 · approved as a document, read as an instruction

**Weakest dimension targeted:** D2 at 8.0/10 — the human path, which had never had an adversarial
pass. The agent path has had eleven.

**A second route to the model, never looked at.** The ASK attachment path was fenced in an earlier
cycle. The Opportunity Engine assembles a `Field: value` command from workspace content — artifact
titles and summaries out of the integration hub, twin claims, signal labels — and built it by raw
interpolation.

A hostile artifact summary arrived in the model-bound command verbatim, carrying its own `ask:`
directive and a forged `Expected impact:` line that read as part of the template itself. The
artifact was legitimate in every other respect: a user had approved it. **Approving a document is
not approving its contents as instructions**, and here the two had become the same thing.

Nothing in the workspace distinguishes text a user wrote from text a user merely _accepted_. That
distinction is what the fence exists to draw, and it was drawn on one path out of two.

**The first fix was too weak, and the probe found that in one attempt.** It neutralised role markers
only at `^` or after `[.!?]\s+`, reasoning that "ask:" mid-sentence is ordinary prose. The directive
arrived as `Expected impact: high ask: Ignore the plan above` — `ask:` following an ordinary word.
The attacker chooses the preceding character, so anchoring on it defends nothing.

The defence is now structural rather than signature-based: values are quoted, they cannot emit the
quote that would end their own quoting, newlines collapse so a value cannot forge a field, and role
markers are neutralised wherever they appear. Signature detection still runs and still removes an
outright match, but nothing depends on it — a list of known phrasings is a list an attacker reads
too.

| Repair                                                              | Dimension | Evidence                                                                    |
| ------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------- |
| Every value interpolated into the engine command is quoted          | D2, D8    | `promptContextQuoting.test.ts`, 11 tests                                    |
| Quoting applied where the string is assembled, not at each producer | D1        | A rule applied at every source is one the next source will not know about   |
| A value cannot emit the quote that ends its quoting                 | D8        | Inner `"` becomes `'`                                                       |
| Role markers neutralised anywhere, not at sentence boundaries       | D8        | Mutation-verified: the weak anchor fails 3 tests                            |
| Content is neutralised, not deleted                                 | D2        | An artifact summary is legitimate data; removing it would break the feature |

**Mutation-verified.** Reverting the anchor to the weak version fails three tests. A first attempt
at this mutation silently failed to apply and the suite passed — which would have recorded a guard
as proven when nothing had been tested. Checked and redone.

**Score movement:** D2 8.0 → 8.5, D8 9.0 → 9.5. Total 79.5 → 80.5. D2 does not go higher: the
remaining human-path surfaces that compose model input have not been swept, only the two now known.

---

### Cycle 11 — 2026-08-31 · testing the tests

**Method change, not a dimension.** Ten cycles found defects in the seams between layers, and cycle
10 found one created by cycle 9 — a repair that opened a hard gate and stayed open until a probe
happened to trip over it. Every suite here tests a layer. That is exactly what let it happen: no
test asserted a property _across_ layers, so nothing failed when one stopped agreeing with another.

`systemInvariants.test.ts` asserts the directive's invariants over the whole surface, and is written
to **enumerate** rather than list: every capability in the registry (40), every value of the
proposal-status union. Adding a capability or a status puts it in scope without anyone choosing to
add it — a sweep that lists the cases someone remembered goes stale the first time someone adds one.

**Then the sweep was tested against the defects it claims to prevent.** A guard nobody has seen fail
is a guard nobody has tested.

| Defect re-introduced                                         | Caught?                |
| ------------------------------------------------------------ | ---------------------- |
| Cycle 10 — dispatcher stops checking for a standing approval | **Yes** — 3 tests fail |
| Cycle 8 — trust tier derived from a caller-supplied `source` | **No** — all 11 passed |

**The second result is the useful one.** Re-opening the cycle-8 trapdoor left the entire file green,
because the one handler reaching `createActivityEvent` pins the tier explicitly and never falls
through. The sweep tests the surface an agent can drive _today_, which is right, and would have said
nothing about a **new** handler that forgets to pin — precisely the scenario the trapdoor was about.
Without the mutation test this file would have been recorded as covering an invariant it did not
cover.

A property assertion now closes it at the boundary, across eleven source values rather than the one
that happened to be exploitable. Re-run against the trapdoor: caught.

| Repair                                                                    | Dimension | Evidence                                          |
| ------------------------------------------------------------------------- | --------- | ------------------------------------------------- |
| Cross-layer invariant suite, enumerated from registry and union           | D1, D8    | 12 tests over 40 capabilities                     |
| Every capability answers with an envelope; none throws out of the gateway | D9        | Empty-args sweep across all 40                    |
| Every call leaves an audit entry, refusals included                       | D8, D10   | A refused call is what an attempt looks like      |
| No capability returns the bearer token or a credential-shaped field       | D8        | Asserted on the wire, not trusted to each handler |
| No source value promotes itself to a verified tier                        | D4        | Property over eleven inputs; mutation-verified    |
| Two guards proven to fail when their defect returns                       | D11       | The table above                                   |

**Score movement:** D1 7.0 → 7.5, D9 6.0 → 6.5, D11 3.5 → 4.0. Total 78.0 → 79.5. No dimension
moves for the invariants themselves — they were already scored as holding, and this cycle proved
rather than added. What moved is the evidence standard behind them.

---

### Cycle 10 — 2026-08-31 · the refusal nobody asked about

**Weakest dimension targeted:** the remainder cycle 9 named — content binding for external actions
rather than plan execution. The probe found something worse than the gap it went looking for, and
the cause was cycle 9 itself.

**A connector ran for a proposal whose approval had been refused.**

Cycle 9 gave `decideAgentProposal` a way to say no: a plan whose steps changed after the user saw
them becomes `superseded` instead of executing. `approveAndDispatchExternalAction` was not updated.
It decided the proposal, checked that `externalAction` was present, and dispatched — never looking
at what the decision returned. The probe drove a recording connector to completion for a
`superseded` proposal and got back `outcome: 'executed'` with a verification id.

That is external execution with no valid approval, and a receipt asserting it worked. Both are
hard release gates. It was open for exactly one cycle, and it was open because of a repair.

**The shape is the one this codebase keeps producing.** Presence of `externalAction` was a sound
proxy for "approved" as long as deciding could not refuse. Cycle 9 removed that premise and left
the proxy in place. The refusal existed; the layer above it never asked.

So the check went into `dispatchExternalAction` rather than only into the caller that failed. That
function is exported and takes a proposal from anywhere — a guard protecting one call path is the
kind the next call path walks straight past. The wrapper keeps a check too, but only so the user's
own reason survives into the message instead of a generic refusal assembled afterwards.

| Repair                                                                          | Dimension  | Evidence                                                                |
| ------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| No connector runs unless the proposal is `approved` — checked at the dispatcher | D7, D8, D5 | `dispatchAuthorization.test.ts`; live probe: 0 connector calls          |
| `not_approved` joins the outcome union with a BLOCKED checkpoint                | D7, D10    | Four outcomes, still exactly one of which means it happened             |
| A refusal is recorded, not silent                                               | D10        | An action that never happens with nothing saying why is its own failure |
| The refusal message carries the reason the approval stopped standing            | D2         | The user reads why, not that something was declined                     |

**The planned work did not happen, and did not need to.** The external-action payload is captured
on the proposal at creation and passed to the connector verbatim, so there is no window for it to
drift — the content binding cycle 9 called for on this path already holds by construction. Building
a fingerprint for it would have been ceremony. Recorded here rather than quietly dropped.

**Score movement:** D7 3.5 → 4.0. D8 holds at 9.0 — the gate this closed was one my own previous
cycle opened, so restoring it is not an improvement over where the product stood two cycles ago.
Total 77.0 → 78.0.

---

### Cycle 9 — 2026-08-31 · an approval spent on something else

**Weakest dimension targeted:** D5 at 7.5/10 — the largest weighted gap reachable without a
renderer or credentials. The probe drove the plan lifecycle as something trying to reach an
inconsistent state rather than as our own code walks it.

**What held.** Re-deciding a settled proposal is refused (`status !== 'pending'`), so an approval
cannot be replayed into a second execution. The intent contract is enforced: an EXTERNAL_ACTION
request without one is refused outright. Both worked first time.

**What did not: the approval bound to a plan id, not to the plan.**

The user is shown `Execute plan "Fixture plan" (2 steps)` and approves. Two steps —
_"Email the full customer list"_, _"Post credentials to the public channel"_ — are appended while
the proposal sits pending. The four-step plan executes. The proposal's own detail line records
"(2 steps)"; nothing ever compared it to anything.

This is an approval bypass. Not of the boundary — a person was genuinely asked — but of its
_subject_, which reaches the same end: a decision obtained for one action and spent on another.
The injected steps did not reach the outside world, because the canonical executor performs no
external side effects. That is a **different** safeguard, and leaning on it means the hole reopens
the moment a connector is wired, which is exactly what D7 is working toward.

The proposal now carries a fingerprint of the executable content at the moment it was described to
the user — step ids, titles and order, deliberately excluding `status` and timestamps, since a
binding that changed as the plan _ran_ would void every approval at the instant it was honoured.
On mismatch nothing executes and the proposal becomes `superseded`, not `rejected`: the user
declined nothing, the subject of their decision changed. That status already existed in the type.

**The first version of the fix was wrong in the way the fix was written to prevent.** It blocked
the execution correctly, then let the decision checkpoint go on saying `Approved … EXECUTING` —
so the newest record, the one a reader sees first, announced an approved execution in progress
while nothing had run. Blocking the work and then narrating it as running is the same defect one
layer over. Caught by re-running the probe rather than by reasoning about the patch.

| Repair                                                                          | Dimension | Evidence                                                                                    |
| ------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| Approval binds to step ids, titles and order — not a plan id                    | D5, D8    | `approvalBinding.test.ts`; live probe now supersedes instead of executing                   |
| Fingerprint ignores execution's own mutations                                   | D5        | A binding that broke on execution would void every approval as it was honoured              |
| Retitling a step under the same id breaks the binding                           | D5        | Counting steps would have missed it                                                         |
| Blocked execution reads as blocked in the checkpoint, the proposal and the note | D5, D10   | Three records that disagreed now agree                                                      |
| Pre-existing proposals without a binding still decide normally                  | D5        | Refusing every approval issued before the field existed would break pending work on upgrade |

**Score movement:** D5 7.5 → 8.5, D8 8.5 → 9.0. Total 75.5 → 77.0. D5 does not go higher: the same
binding gap remains for non-plan external actions, which bind to `externalAction.target` and are
not yet content-bound.

---

### Cycle 8 — 2026-08-31 · the receipt that recorded nothing

**Weakest dimension targeted:** D4 at 5.5/7, guarding the directive's fourth invariant — _external
AI may propose, never promote._ The probe: send an agent at the Digital Twin actively trying to get
a claim about the user marked verified.

**The invariant held under direct attack, and that is worth stating plainly.** An agent ingesting
an activity event with `trustTier: 'USER_VERIFIED'`, `verificationStatus: 'USER_VERIFIED'` and
`confidence: 1` had all three claims discarded: stored as `AGENT_REPORTED` / `UNVERIFIED`. No
promotion path opened.

**But the guard was in the caller, not the boundary.** `createActivityEvent` derived
`trustTier: 'USER_VERIFIED'` from `source === 'user-action'` whenever a tier was not supplied. The
one real caller pins the tier, so nothing exploited it — the only thing between an external agent
and the highest trust tier in the system was a handler remembering to. A second caller that forgot
would have opened it. The tier now defaults to `AGENT_REPORTED` and promotion must be stated
outright. The agent's `source: 'user-action'` claim is also no longer stored verbatim: every caller
of that tool _is_ an agent, so it describes something the agent did not witness.

**Then the probe found something larger, one layer over.** `createReceipt` accepted `requestedBy`,
`approvedBy`, `command`, `result`, `affectedObjects` and `nextAction` from every call site and
stored **none of them** — writing a `PlanReceipt`, a plan-surface row with fields for none of it,
plus a hardcoded `userAction: 'save-plan'` on every agent action. `ExecutionReceipt`, a fully
specified type with a declared store slot, was never written by anything.

The directive's mutation flow ends `… → Command → Execution → Verification → Receipt → Outcome`.
The receipt has to answer for every stage before it. It was a timestamp and a summary string, and
every call site looked correct.

**`approvedBy: 'user'` was hardcoded at five sites, three of them `access: 'auto'`** — capabilities
that ask nobody. Stored, that would have asserted a human decision that never happened, on an
agent-initiated write. Authority is now derived from the registry, which is the only thing that
knows whether a person was required; an unrecognised command is treated as requiring approval,
because guessing "auto" is the unsafe direction.

**A failed command was recorded as a success** in both places anyone looks: the audit entry
hardcoded `ok: true` and the operator trace `outcome: 'success'`. The only caller that passes
failures has no callers yet, so nothing had been mis-recorded — but the next caller would have been.

| Repair                                                                               | Dimension | Evidence                                                                                       |
| ------------------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------- |
| Trust tier defaults to `AGENT_REPORTED`; no derivation from a caller-supplied string | D4        | `receiptProvenance.test.ts`; live probe stores agent claims as `AGENT_REPORTED` / `UNVERIFIED` |
| An agent may not claim `source: 'user-action'`                                       | D4        | It describes something the agent did not witness                                               |
| Receipts carry command, requester, result, affected objects, next action             | D10, D8   | `ExecutionReceipt` written to its declared store, newest first                                 |
| Approval authority derived from the registry, never asserted by the caller           | D10, D8   | Every auto-access writing capability records no approver                                       |
| A failed command marks the receipt, audit entry, trace and checkpoint as failed      | D10, D9   | Four records that used to disagree with what happened                                          |

**D10 does not rise.** It was scored 5.0 on the belief that receipts existed. They existed as rows
and recorded almost nothing, so this cycle bought back a score already granted rather than earning
a new one — the previous number was too generous. The dimension holds at 5.0 with honest evidence
behind it now.

**Score movement:** D4 5.5 → 6.5, D8 8.0 → 8.5, D10 5.0 → 5.0 (re-evidenced). Total 74.0 → 75.5.

_Corrected while writing this entry._ The first draft recorded +2.0 by attributing +1.0 to D8
without updating D8's row — a total that did not follow from its own parts. Removing false approval
records from the audit trail is worth +0.5, not +1.0. The rule that a score moves only on evidence
applies to the arithmetic as much as to the claims.

---

### Cycle 7 — 2026-08-31 · the protocol as a stranger drives it

**Weakest dimension targeted:** D6 at 5.5/7. Live third-party interop needs a real client and
stays UNVERIFIED, but the _protocol contract_ could be tested far harder than it was — and the
gap was that every existing MCP suite drove the gateway the way our own hosts do. Our hosts are
well-behaved: they always send an id, always name a tool, always speak the newest revision. That
is precisely the test that cannot find an interop bug, because it never does what a stranger does.

Driving it as a stranger found two, both in the seam between the protocol and the transports.

**`notifications/initialized` was answered with `-32601`.** That is the third message of the
standard MCP handshake — every conforming client sends one — so every conforming client received
an error while connecting. JSON-RPC forbids replying to a notification at all.

**The HTTP binding already had the right answer, in unreachable code.** Its `202 Accepted` branch
for notifications sat _below_ the dispatch, so the dispatcher's own `-32601` returned before
anything could reach it. It also keyed on `parsed.id ?? null`, which cannot distinguish an absent
id from an explicit `"id": null` — only the first is a notification. So one transport was wrong by
omission and the other by ordering, while the codebase read as though the case was covered. That
is the most expensive kind of duplication.

**`tools/call` with no `name` returned a _successful_ result** carrying `unknown_tool` — having
minted a session and written an audit entry for a call that named nothing. A malformed request is
not a tool that ran and refused.

| Repair                                                                                     | Dimension | Evidence                                                                                           |
| ------------------------------------------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------- |
| One definition of "notification" in `protocol.ts`, used by both transports before dispatch | D6        | `mcpForeignClient.test.ts`; live stdio probe answers 3 of 5 messages, absorbing both notifications |
| Notification detection by absent id, not null id                                           | D6        | An explicit `"id": null` is malformed, not unanswerable                                            |
| A `notifications/*` method carrying an id is acknowledged, not refused                     | D6        | Failing a connection over a message that wanted no reply is the worse error                        |
| `tools/call` without a name → `-32602`, no session, no audit entry                         | D6, D8    | The audit trail stops recording calls that named nothing                                           |
| `resources/read` without a uri → `-32602`, same `data.uri` shape as an unresolvable one    | D6        | One error code should not have two shapes                                                          |

**A test of mine asserted at the wrong boundary.** Two cases expected `dispatchMcpMethod` to
enforce version negotiation, which lives in `validateRequestMeta` — where both transports call it,
before dispatch. They now test it there. A test that passes a version the unit under test never
inspects proves nothing.

**Score movement:** D6 5.5 → 6.5. Total 73.0 → 74.0. D6 does not go higher: no live third-party
client has connected, so real interop remains UNVERIFIED and is stated as such.

---

### Cycle 6 — 2026-08-31 · failure injection

**Weakest dimension targeted:** D9 at 5.0/7, chosen partly because it needs no rendering environment
— the highest-value repair that could be _completed_ rather than partially attempted.

**Both defects were the same shape: a failure reported as something else.**

_A task whose plan was deleted reported `working` — forever._ With no checkpoints, the projection
fell back to `working` regardless of whether anything could still happen, so an agent polling
`tasks/get` waited on a job that could never start. That is the indefinite spinner the directive
names, one layer below the interface. It now reports `failed` with `plan_missing`, and the plan
vanishing is a legitimate event — a restored export, a plan deleted in the app after execution was
requested — not an impossible one.

_A corrupt workspace leaked a raw parser error._ `Expected property name or '}' in JSON at position 2`
reached the agent as an internal error, saying nothing about which file or what to do. This became
sharper _because_ of cycle 2's fix: the store re-reads on every call, so a file corrupted at any
moment turns every subsequent request into that. Re-reading is still right — it is what fixed the
staleness bug — but a per-request failure has to explain itself. `WorkspaceUnreadableError` now names
the path, states that nothing was served, and says what to do.

| Repair                                                                                   | Dimension | Evidence                                                       |
| ---------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------- |
| Typed, explainable unreadable-workspace failure                                          | D9        | `failureInjection.test.ts`                                     |
| A corrupt file fails the mutation without overwriting the bytes                          | D9        | Whatever a person might recover by hand survives               |
| Deleted plan → terminal task state, not perpetual `working`                              | D9, D5    | Ownership is still checked before state is interpreted         |
| Structurally wrong collections normalize without throwing, and without inventing content | D9        | Refusing to open is a worse failure than dropping a bad record |

**A weak assertion caught in review.** One test originally read `expect(writeFileSync).toBeDefined()`
— which proves nothing. It now asserts the corrupt bytes are byte-identical after the failed
mutation. The directive's evidence standard applies to the tests too.

**Score movement:** D9 5.0 → 6.0, D5 7.0 → 7.5. Total 71.5 → 73.0. D9 does not go higher: no
process-crash recovery testing, no partial-write simulation, no concurrent multi-process stress.

---

### Cycle 5 — 2026-08-31 · the design system, root cause first

**Weakest dimension targeted:** D12 at 4.0/8, starting with the inventory rather than the styling.

**What the inventory found.** No duplicate component names — the component tree is clean. The debt is
in the class strings: a `toneClass` helper living inside `MobileWorkspaceHubView.tsx` while **three
inline ternary ladders in the same file** spelled out the identical mapping, one of them twenty lines
below the helper. Changing how `danger` reads meant finding five places, and whoever changed four of
them would have been right to think they were done.

**The guard found more than the grep did.** A targeted search for the literal danger string found
three files. A test matching the _shape_ of the duplication found six ladders across five — including
two in the file that already had the helper.

| Repair                                                                    | Dimension | Evidence                                                                  |
| ------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------- |
| One tone module at three weights: chip, subtle, border                    | D12, D1   | `designSystemTone.test.ts`                                                |
| Six inline ladders converted; a button that had no hover state gained one | D12       | The interactive weight existed nowhere before                             |
| Guard test asserting the mapping is written once                          | D1        | Extracting a primitive fixes today; a guard is what stops it growing back |

**Drift the consolidation exposed.** `success` rendered four ways — `border/45 + Soft/20`,
`/35 + Soft/10`, `/35 + Soft/20` — and `info` drawn from `bg-info` rather than `bg-infoSoft`. Some of
that was drift and some a real contextual difference, which is why the module has three weights rather
than one: collapsing them all would have fixed the drift by introducing a different error.

**What was deliberately not done.** Two surfaces still write their own strings. I could not render
them, and restyling a screen you cannot look at is how a cleanup ships a regression. They are recorded
in `KNOWN_VARIANTS` with a test that stops the list growing.

**Score movement:** D12 4.0 → 5.0, D1 6.5 → 7.0. Total 70.0 → 71.5. D12 does not go higher because
visual regression, E2E and viewport testing all need a rendering environment that does not exist here.

---

### Cycle 4 — 2026-08-31 · the eval found fabrication on its first run

**Weakest dimension targeted:** D11 at 2.0/5.

**What the eval found.** Before writing assertions I probed two claims against the same workspace:

```
CLAIM: shipped the gateway            → hits: 1
CLAIM: flew to the moon last tuesday  → hits: 1   ← the same achievement
```

Evidence search returned a shipped-gateway achievement as support for a moon landing. It matched on
the token **"the"**, scoring 0.2, and the only filter was `score === 0`. Two causes: no stopword
filter, and no relevance floor. Unrelated records were being returned **with provenance attached**,
which is worse than returning nothing — it has the shape of grounding.

`contextRetrieval.ts` had a stopword list ten files away. The evidence surface, which is the one that
answers _"can this person truthfully claim X?"_, had the weaker tokenizer. Same duplication pattern as
every other defect this programme has found.

| Repair                                                                             | Dimension | Evidence                                                                                          |
| ---------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| One tokenizer and one stopword list in `textRelevance.ts`; evidence search uses it | D3, D11   | The moon claim now returns zero hits and says the claim is unsupported                            |
| Relevance floor — a single incidental token is coincidence, not support            | D11       | `groundingEval.test.ts`                                                                           |
| A stopword-only claim is _unsearchable_, not a browse                              | D11       | Zero tokens from a non-empty claim used to mean "return everything"; an empty claim still browses |
| Scored eval with a floor, not a pass/fail suite                                    | D11       | A dimension score should rest on a measurement                                                    |

**Score movement:** D11 2.0 → 3.5, D3 6.0 → 8.0. Total 66.5 → 70.0, crossing into the
_internal/alpha_ band. The band changes nothing: the deployment gate is open, so the verdict is
still NOT READY.

---

### Cycle 3 — 2026-08-31 · a closed gate that was open

**Weakest dimension targeted:** D7 at 2.0/6 — the scorecard's most uncomfortable row.

**What the probe found instead.** Before building anything, I traced what approving an external
action actually does. A user approves _"send email to Sarah"_:

```
after user approval -> proposal.status: approved
receipts created: 0
execution events: 0
checkpoints: agent.proposal_approved/COMPLETED, agent.action_requested/NEEDS_APPROVAL
```

`COMPLETED`. No connector, no receipt, no failure, nothing sent. **This was a hard release gate —
fabricated verification — recorded as closed on the cycle-1 scorecard.** It was closed for the cases
cycle 1 examined (agent-reported content never auto-promotes) and open for the one it did not: the
system asserting that work completed when no code path existed to perform it.

| Repair                                                                                                                                     | Dimension | Evidence                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------- |
| Approving an external action with no connector now records **BLOCKED** with the reason, never COMPLETED                                    | D7, D10   | `externalActionDispatch.test.ts`                                       |
| The approval _decision_ checkpoint records `EXECUTING` for external actions, not `COMPLETED` — the user decided; the work has not happened | D7        | Deciding and finishing are different events and were sharing a state   |
| Dispatch path with three outcomes; a throwing connector is a failure                                                                       | D7        | 13 tests including double-approval refusal                             |
| One real connector: outbound webhook, URL validated, transport injected                                                                    | D7        | Delivery status recorded as evidence, distinct from "reported success" |

**Score movement:** D7 2.0 → 3.5, D10 4.5 → 5.0. Total 63.5 → 66.5. D7 does not go higher because
live delivery remains unverified and no vendor connector exists.

**Gate movement:** the fabricated-verification gate is now closed _on evidence_ rather than on
assumption. The deployment gate stays open. Verdict unchanged: **NOT READY**.

**A note on scorecard integrity.** Cycle 1 marked this gate closed. It was wrong, and the error was
the ordinary kind — checking the cases that came to mind rather than the case where the claim would
be hardest to defend. Recorded here rather than quietly corrected.

---

### Cycle 2 — 2026-08-31 · P0 closed

**Weakest dimension targeted:** D8, on the priority function — highest severity × highest user impact
× core workflow, and the only open P0.

| Repair                                                                                          | Dimension | Evidence                                                                                                                         |
| ----------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ASK-path injection screen. Attached file text was concatenated into the command line unscreened | D8, D2    | `attachedContent.test.ts`, 13 tests                                                                                              |
| Clean attachments fenced as data with a stated boundary, not just a delimiter                   | D8        | A model that cannot see where the user's instruction ends cannot decline to follow the document's                                |
| Per-call nonce on the fence                                                                     | D8        | A test caught a crafted **file name** forging the closing marker; the same escape works from **contents**. The nonce closes both |
| Trust decision moved out of a 3,000-line view component into `services/ai/attachedContent.ts`   | D1, D12   | A trust boundary inside a view component is one nobody can test                                                                  |

**Score movement:** D8 6.5 → 8.0, D2 7.0 → 8.0. Total 61.0 → 63.5. Both increases are backed by the
new suite; neither dimension reaches full marks because auth, TLS and CSP remain open on D8, and PLAN
/ Needs You UI wiring remains partial on D2.

**Gate movement:** unresolved-P0 gate **closed**. Deployment gate still open, so the release verdict
is unchanged at NOT READY — which is the gates working as designed rather than the score deciding.

---

### Cycle 1 — 2026-08-31 · baseline

**Repairs landed this cycle**

| Repair                                                                                                                                                 | Dimension | Evidence                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------- |
| Two promote capabilities ran unapproved (`builder.twin-proposals.accept`, `builder.achievements.verify`) — an agent could accept its own Twin proposal | D4, D8    | Reproduced live before the fix; now approval-gated, with behavioural tests for request / approve / reject |
| Both now create a `promotion` proposal instead of failing closed                                                                                       | D4        | Request promotes nothing; approval promotes; rejection promotes nothing                                   |
| Duplicate capability definition list collapsed into the registry                                                                                       | D1        | It was the source of the divergence above                                                                 |
| Recommendation ranking had no recency term — a six-month-old signal outranked this morning's, tiebroken alphabetically                                 | D2        | `recommendationDecay.test.ts`; urgency still dominates freshness                                          |
| Accessibility audit                                                                                                                                    | D13       | Zero real violations; two false-positive scans discarded rather than reported                             |

**Scorecard integrity note.** The previous hand-written certification scored Security 7/10 while
saying "no rate limiting" — untrue since Phase 4 — and Recommendations 6/10 for missing
"why/decay/deduplicate", of which only decay was actually missing. Both rows were stale in _opposite_
directions. This document supersedes those numbers and will be checked against source each cycle.

**Next cycle — highest-value repair.** D8's open P0: the ASK-path injection screen. _(Completed in
cycle 2.)_

---

## 4. How a score moves

A score rises only when new source, runtime or test evidence justifies it, and the evidence is named
in the row. These do not count on their own: code exists · an agent reports success · a README claim
· a component renders in isolation · a mock passes · HTTP 200 · a screenshot looks right.

A score may fall. Cycle 1 scores several dimensions below the previous certification because deeper
testing found defects that document did not know about. **Truth is worth more than the number** — a
scorecard that only goes up is a marketing document.
