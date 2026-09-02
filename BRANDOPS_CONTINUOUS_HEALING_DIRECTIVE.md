# BRANDOPS CONTINUOUS HEALING + PRODUCTION SCORECARD + INTERFACE QUALITY

**Status:** Canonical directive. Governs how work proceeds from here.
**Recorded:** 2026-08-31
**Companion:** [`BRANDOPS_PRODUCTION_SCORECARD.md`](BRANDOPS_PRODUCTION_SCORECARD.md) is the live
instrument this directive operates.

> **Why this is a separate document.** The MCP gateway directive answers _what to build_. This one
> answers _how to keep working_ — a loop rather than a feature. It supersedes "continue implementing"
> as the standing instruction.

---

## The loop

```text
DISCOVER → SCORE → FIND THE WEAKEST PRODUCTION DIMENSION → REPRODUCE REAL DEFECTS
→ ROOT-CAUSE → REPAIR → TEST → RUN THE PRODUCT → VISUALLY INSPECT → ATTACK
→ REGRESSION TEST → RESCORE FROM EVIDENCE → REPEAT
```

Do not stop because the application builds. Do not stop because tests pass. Do not stop because the
interface renders. Do not stop because the scorecard looks better.

**Optimize the product, not the score.**

---

## The standing command

Rather than "continue implementing":

> Run the next BrandOps healing cycle. Independently rescore the current repository and runtime from
> evidence, identify the highest-impact weakness preventing production readiness, repair the root
> cause rather than the symptom, run the affected Golden Workflow and adversarial/regression tests,
> visually inspect all affected frontend states and responsive breakpoints, update Feature Truth and
> the Production Scorecard only from verified evidence, then immediately continue to the next
> highest-impact defect unless blocked by credentials or an external dependency. Do not ask which
> files to inspect. Do not optimize the score; optimize the actual product.

The scorecard is the compass. **Runtime truth is the judge.**

---

## Scoring rules

15 weighted dimensions totalling 100 — the table lives in the scorecard. Weights change only with a
documented engineering reason, and **never to move a total**.

Each dimension records: current score · previous · change · evidence · defects · blockers · tests ·
runtime proof · next highest-value repair. Snapshots are kept.

**A score rises only when new source, runtime or test evidence justifies it.**

| Counts as evidence                                     | Does not count alone             |
| ------------------------------------------------------ | -------------------------------- |
| Passing deterministic tests · integration · E2E        | Code exists                      |
| Runtime traces · database verification                 | An agent reports success         |
| Visual and accessibility verification                  | A README claim                   |
| Performance measurement · failure injection            | A component renders in isolation |
| Security and adversarial tests                         | A mock passes                    |
| Connector contract and MCP interop tests               | HTTP 200                         |
| Deployment smoke tests · verified production behaviour | A screenshot looks correct       |

**A score may fall.** When deeper testing reveals defects an earlier pass missed, the number goes
down. A scorecard that only rises is a marketing document.

---

## Hard release gates

A total never overrides these. Any one open means **NOT READY**:

unresolved P0 · cross-workspace data leakage · approval bypass · authentication or authorization
bypass · duplicate irreversible external execution · fabricated evidence or verification · critical
Golden Workflow failure.

Production deployment unverified ⇒ never label `PRODUCTION_VERIFIED`.

Bands: 0–49 NOT READY · 50–69 development · 70–84 internal/alpha · 85–92 beta/RC · 93–97 production
candidate · 98–100 certification range. **A 99 with a critical authorization defect is NOT READY.**

---

## Priority function

```text
SEVERITY × USER IMPACT × CORE WORKFLOW IMPORTANCE × FAILURE FREQUENCY
        × SECURITY EXPOSURE × COMPOUNDING VALUE
    ÷ (IMPLEMENTATION COST × REGRESSION RISK)
```

P0/P1 before cosmetic polish. But once core workflows are stable, **visual and interaction quality is
a production requirement, not decoration.**

---

## Frontend quality is a first-class dimension

Move the interface from FUNCTIONAL → COHERENT → POLISHED → DELIGHTFUL → TRUSTWORTHY →
PRODUCTION-GRADE. Not a reskin.

Audit information architecture, navigation, and every surface — ASK, PLAN, Needs You, Command Center,
Artifacts, Twin, Evidence, Goals, Projects, Agents, MCP, Connectors, Authority, Settings, Onboarding,
Auth — across every state: empty, loading, working, approval, error, offline, success, mobile.

Look for visual inconsistency, spacing and typography drift, duplicate components, poor hierarchy,
card overload, nested containers, weak loading states, fake progress, unclear actions, inconsistent
iconography, modal abuse, text overflow, broken dark mode, touch and keyboard problems.

**Fix root causes through the design system.** One repaired primitive beats twenty patched screens.

Score it in subdimensions, each with evidence: visual consistency · information hierarchy ·
interaction quality · state clarity · responsive quality · accessibility · performance ·
design-system reuse · error and empty states · perceived trust · workflow efficiency. **Never 10/10
because it "looks good".**

### Visual north star — calm intelligence

Intelligent, calm, precise, premium, technical, trustworthy, fast, purposeful. Matte dark foundation,
restrained green accent, strong typography, information clarity, negative space, flat hierarchy,
progressive disclosure, subtle depth.

Avoid: generic SaaS dashboard, rainbow AI gradients, glassmorphism excess, giant cards,
card-inside-card, glowing borders, animation for its own sake, decorative terminal output.

The interface communicates **control, intelligence, work, evidence, trust**.

### Surfaces with specific bars

- **ASK** is an intelligent work console, not a chatbot: fast objective entry, real tool/activity
  indication, structured answers, evidence inspection, Convert to Plan, retry, uncertainty.
- **PLAN** is an AI chief of staff, not project-management software. Compact rows; collapsed state
  says WHAT · WHY · STATUS · WORKER · NEXT ACTION; expansion reveals complexity. A user must not need
  to understand agent orchestration to understand their work.
- **Needs You** must answer, immediately: what needs approval, why, who asked, what will happen,
  where, what data is involved, what the risk is, whether it is reversible, what happens if rejected.
  Deliberate, not bureaucratic.
- **Receipts** must let a person answer _"did BrandOps actually do this?"_ in seconds.
- **Digital Twin** is an evidence-backed model, not a settings form. Deltas show OLD · PROPOSED ·
  WHY · EVIDENCE · IMPACT.
- **MCP** should be legible without protocol knowledge: _"Claude can read my project context and
  create Artifacts, but it cannot send email without approval."_
- **Agent activity** renders backend truth only. Never manufacture activity to look alive.

---

## Design dependency discipline

> **Framer, Figma, component libraries, animation libraries, icon systems, visualization libraries
> and design references are _inputs_ to the BrandOps design system — not competing design systems.**

Take the visual quality they enable without turning the repository into a dependency collage.

**Figma** is a design source: token extraction, component specification, layout and typography
inspection, design-to-code comparison, asset retrieval — where real, authorized access exists. Never
claim an integration without it. Never generate code blindly from design output. BrandOps source
remains implementation authority.

**Framer** is an interaction and motion reference: studies, composition, responsive patterns,
microinteractions. Production must not depend on it because a prototype looked good, and a second
frontend architecture must not be embedded.

Before any new visual dependency, document: the problem · the existing solution · why it is
insufficient · the chosen dependency · alternatives considered · bundle and runtime impact ·
accessibility impact · maintenance health · license · **removal strategy**.

Prefer composable primitives. One canonical primitive per problem. Never five libraries solving the
same thing.

---

## Motion, accessibility, responsiveness, resilience

**Motion** communicates state — expansion, transition, progression, approval, completion, navigation
continuity. It never delays work. Honor reduced-motion. No fake progress.

**Accessibility defects are production defects.** Semantic HTML, keyboard navigation, focus order,
visible focus, labels, ARIA where needed, contrast, screen-reader semantics, error and status
announcements, touch targets, zoom and text scaling.

**Responsive** is not compressed desktop. ASK stays excellent on mobile; Needs You stays usable;
approval controls stay touch-safe; tables adapt; long content does not destroy layout.

**Every networked surface** handles loading, empty, partial, slow, timeout, offline, reconnecting,
unauthorized, forbidden, not found, server failure, provider failure, connector failure. No indefinite
spinners. No errors disguised as empty states. No success shown when persistence failed.

---

## Design-to-runtime truth

A polished interface must never hide: partial capability · unsupported connector · unverified
outcome · failed verification · stale evidence · an approval requirement · agent failure.

**Communicating uncertainty and failure elegantly is part of design quality**, not an exception to it.

---

## Each cycle closes with

Rerun baseline tests · affected integration and E2E · the Golden Workflow · relevant security tests ·
visual QA · accessibility QA · performance checks · inspect runtime logs · update Feature Truth ·
update the Production Scorecard · identify the next weakest high-impact dimension · continue.

Do not stop because a threshold was crossed. Continue until the remaining risk is **explicit and
justified**.

---

## Final standard

Production quality requires both **deep system quality** and an **excellent human experience**. The
backend should be capable of governed context, RAG, Twin, evidence, planning, agents, MCP, tools,
connectors, policy, approvals, durable execution, verification, receipts, outcomes and learning. The
frontend should make that sophistication feel simple:

```text
ASK → PLAN → WORKING → NEEDS YOU → DELIVERED → VERIFIED → LEARNED
```

The user should feel that BrandOps understands their work and gets things done — not that they are
operating an agent framework.

**Do not make BrandOps look production-ready. Make BrandOps production-ready.**
