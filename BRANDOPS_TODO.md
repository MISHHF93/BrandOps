# BRANDOPS TODO — alignment against every standing instruction

**Status:** Derived, not remembered. Every figure below was read from the repository or produced by
running something, on 2026-09-02 at commit `5b99de9`+.
**Governed by:** [`BRANDOPS_CONTINUOUS_HEALING_DIRECTIVE.md`](BRANDOPS_CONTINUOUS_HEALING_DIRECTIVE.md)
**Instruments:** [`BRANDOPS_PRODUCTION_SCORECARD.md`](BRANDOPS_PRODUCTION_SCORECARD.md) ·
[`BRANDOPS_FEATURE_TRUTH.md`](BRANDOPS_FEATURE_TRUTH.md)

> This document exists because "are we aligned?" is not answerable from a chat log. It lists what was
> asked, what is true now, and — the part that matters — **where the work has not matched the
> instruction**. A todo list that only contains future work is a plan; one that admits standing
> shortfalls is a status.

---

## 0. Verified now

| Measure            | Value                                                      | How it was checked                       |
| ------------------ | ---------------------------------------------------------- | ---------------------------------------- |
| Product total      | 96.5 / 100                                                 | scorecard table, arithmetic-guarded      |
| PLAN surface       | 85.5 / 100                                                 | scorecard §1b, drift-guarded as of today |
| Tests              | 1762 passing / 234 files                                   | `npx vitest run`                         |
| Gates              | check · check:tests · knip · format · verify:dist all pass | `npm run <each>`                         |
| Ratchets           | knip 94 · test type errors 129                             | `npm run knip`, `npm run check:tests`    |
| Release verdict    | **NOT READY**                                              | one hard gate open                       |
| Shipaton readiness | 5 verified · 7 missing · 9 manual                          | `node scripts/shipaton-gate.mjs`         |
| GitHub             | `main` = `healing/...` = `5b99de9`                         | `git ls-remote origin` vs local HEAD     |

---

## 1. Standing directive — where the work has NOT matched it

Recorded first, because these are the items most likely to be quietly skipped.

| #   | The directive says                                                                                                                 | Actual                                                                                                                                                                                                        | Priority |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| S1  | "Visually inspect all affected frontend states and responsive breakpoints" — **every cycle**                                       | **Never performed as written.** Surfaces are asserted through SSR and jsdom against rendered HTML. No browser has been opened, no breakpoint exercised. Roughly fifteen cycles have closed without this step. | P1       |
| S2  | Twin deltas show OLD · PROPOSED · **WHY · EVIDENCE · IMPACT**                                                                      | `PromotionPreviewChange` carries `field`, `from`, `to` — OLD and PROPOSED only. `TwinDelta` already holds `reason` and `evidence`; cycle 67 dropped them.                                                     | P1       |
| S3  | Needs You answers nine questions: what · why · who asked · what happens · where · what data · risk · reversible · what if rejected | `ApprovalConsequence` answers **three**: what happens, reversible, whether it leaves the workspace. Six unanswered.                                                                                           | P1       |
| S4  | Frontend scored in **eleven subdimensions**, each with evidence, for every surface                                                 | Only PLAN has that treatment (§1b). ASK, Needs You, Receipts, Twin, MCP, Agents, Settings, Onboarding and Auth have no subdimension scoring.                                                                  | P2       |
| S5  | "Accessibility QA · performance checks" each cycle                                                                                 | `accessibilityAudit.test.ts` exists and structural contrast is computed. **No screen-reader run, no paint or interaction timing** — P9 4.0/5 and P10 4.0/5 say so on the row.                                 | P2       |
| S6  | Score every dimension with "next highest-value repair" recorded                                                                    | Present for most dimensions in the detail section; not consistently maintained per cycle.                                                                                                                     | P3       |

**S1 is the most serious.** It is not a missing feature, it is a step in the loop that has been
skipped every cycle while the loop was reported as run. The scorecard is honest about the
consequence in two places (P8 Responsive 3.0/5 "no viewport testing — that needs a browser", P9
Accessibility 4.0/5 "no screen-reader run"), so the score has not been inflated by it. But the
directive asks for the inspection, not for a note explaining its absence.

---

## 2. Standing directive — honoured

| Rule                                                 | Evidence                                                                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| A score rises only on new evidence                   | Every cycle entry carries tests and mutation results; increases refused twice this session when a dimension was at cap |
| **A score may fall**                                 | Cycle 65 lowered D8 10.0 → 9.0 on discovering a detector had been counted as a fix                                     |
| Weights never moved to change a total                | No weight has been edited; `scorecardArithmetic.test.ts` enforces score ≤ weight                                       |
| Hard gates override the total                        | 96.5 still reads NOT READY on the deployment gate                                                                      |
| Fabricated evidence is a gate                        | Cycle 68 found the registry citing 15 files that were never written; now guarded                                       |
| External AI proposes, never promotes                 | Agent-reported content lands `UNVERIFIED` / `AGENT_REPORTED`; promotion is a person's decision at every link           |
| An MCP connection is not authorization               | Cycle 69: a handoff can only narrow, and the source is the authenticated session, never an argument                    |
| Live interoperability labelled UNVERIFIED            | Third-party client interop still marked UNVERIFIED in D6                                                               |
| No credentials or tokens exposed                     | Tokens stored as SHA-256 hashes; raw tokens never enter workspace JSON                                                 |
| Update Feature Truth and the Scorecard from evidence | Both updated every cycle; two corrections applied downward                                                             |

---

## 3. What was asked, across the session

| #   | Ask                                                       | Status                 | Evidence                                                                                                                       |
| --- | --------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Revamp and simplify the **Plan page** (asked three times) | **Substantially done** | PLAN surface scored separately: 79.0 → 85.5 over seven cycles. P6 Workflow 7.0/10 and P8 Responsive 3.0/5 remain the weak rows |
| A2  | Chat and Ask My Twin are fine — leave them                | Honoured               | No changes to those surfaces                                                                                                   |
| A3  | Get to healthy source code                                | **Ongoing, ratcheted** | knip 96 → 94, test type errors held at 129, both fail CI if they rise                                                          |
| A4  | **Do not delete unwired code — wire it**                  | Honoured since         | `agentHandoffs` implemented rather than removed; `handoffsState` wired into counts rather than dropped                         |
| A5  | Commit and push to GitHub                                 | **Done**               | `main` fast-forwarded `6700246` → `5b99de9`, verified via `git ls-remote`                                                      |
| A6  | Shipaton 2026 — can we enter, is Kotlin required          | **Answered**           | Kotlin **not** required. `scripts/shipaton-gate.mjs` reports 5 verified / 7 missing / 9 manual                                 |
| A7  | Stay TypeScript; clean and publish                        | Half                   | Stays TypeScript. **Publishing is blocked** — see §5                                                                           |
| A8  | Full production product, not an MVP                       | **Partial**            | See §4; the honest blocker is that there is no backend                                                                         |
| A9  | Do not bypass authentication; keep developer-mode access  | **Done**               | Production auth-skip closed (cycle 65, measured 1 vs 0 occurrences in real builds); dev access via the sign-in gate            |
| A10 | Start the application                                     | Running                | `localhost:5173`, all six pages 200                                                                                            |
| A11 | No redundant URLs or pages; everything matching           | **Done**               | `pageSurfaceConsistency.test.ts`; six pages, duplication deliberate and documented, every `?section=` resolves                 |
| A12 | Full wiring between front and back                        | **Done for state**     | 35 of 41 workspace fields reachable; the rest are internal by design. Four cycles closed the real gaps                         |
| A13 | Keep wiring and fixing                                    | Cycles 66–68           | Twin history, promotion previews, stranded reported work, registry citations                                                   |
| A14 | Implement `agentHandoffs`                                 | **Done**               | Cycle 69 — service, four MCP tools, bridge, UI, 43 tests, mutation-verified eight ways                                         |

---

## 4. Open work, in priority order

The directive's priority function is severity × user impact × core-workflow importance × failure
frequency × security exposure × compounding value ÷ (cost × regression risk).

### P1 — the product makes a claim it cannot support

1. **S2 · Twin deltas do not say why.** A person accepts a change to their professional identity
   seeing the old value and the new one, with no reason and no evidence, when both are already on
   the delta. Directly against the Twin bar. Small change, high trust impact.
2. **S3 · Needs You answers three of nine questions.** No "who asked", no "what data is involved",
   no "what happens if I reject". The approval surface is the one place the directive is most
   specific about.
3. **S1 · Nothing has been looked at.** Every frontend claim in this repository rests on rendered
   HTML assertions. That is real evidence, and it is not the same as seeing the product.

### P2 — quality bars the directive sets that are unmeasured

4. **S4 · Subdimension scoring for surfaces other than PLAN.** ASK and Needs You especially.
5. **S5 · Screen-reader run, paint and interaction timing.** P9 and P10 are capped at 4.0/5 until
   these exist.
6. **P6 Workflow Efficiency 7.0/10** — the weakest PLAN row after responsive.

### P3 — carrying debt

7. **Test type errors: 129.** The ratchet holds; nothing is fixing them.
8. **Unused exports: 94.** Same.
9. **A flaky full-suite run**, once, not reproduced in six subsequent runs. The build-driven test in
   `launchGateContract.test.ts` is the only test that shells out to `vite build` and is the most
   likely source. Unresolved, not dismissed.

---

## 5. Blocked — needs a decision or a credential

None of these can be closed from inside the repository, and none should be reported as progress
until they are.

| Blocker                     | What it blocks                                                           | What is needed                          |
| --------------------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| **No backend of any kind**  | The deployment hard gate, and therefore the verdict itself               | A hosted API and a deploy target        |
| **No identity provider**    | Real authentication. Today `isAuthenticated` is a `localStorage` boolean | An auth backend                         |
| Android signing keystore    | Any uploadable build                                                     | `android/keystore.properties` or CI env |
| Android SDK on this machine | Compiling a bundle at all                                                | An SDK install                          |
| Play Console account        | Store listing, US availability, release window                           | An account                              |
| RevenueCat SDK + dashboard  | Shipaton entry — it is mandatory for the competition                     | SDK install and configuration           |
| Analytics                   | The growth criteria judges score                                         | A provider decision                     |
| 1179×2556 screenshot        | Store submission                                                         | A device or emulator                    |
| Demo video, Devpost fields  | Submission                                                               | Recording and a form                    |

**The verdict will not move until the first row moves.** Everything else in this document can reach
100 and the release status stays NOT READY, because production deployment is unverified and nothing
is published. That is the directive working as designed, not a scoring artefact.

---

## 6. Corrections applied while writing this

Recorded here rather than silently fixed, because a status document that hides its own repairs is
the failure it exists to prevent.

- **The PLAN table had drifted.** It read 79.0 while its own cycle log traced 79.0 → 81.0 → 81.5 →
  82.5 → 83.0 → 83.5 → 84.0 → **85.5** across seven cycles. Every increase was written down and none
  was applied. It summed correctly to 79.0, which is exactly why nobody noticed — a self-consistent
  table that contradicts the document around it. Reconstructed from the recorded movements; the
  reconstruction sums to 85.5 independently, which is what confirms it. `scorecardArithmetic.test.ts`
  now compares the table against the latest figure the log states, and the mutation is verified.
