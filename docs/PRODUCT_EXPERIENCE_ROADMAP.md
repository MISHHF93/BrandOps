# BrandOps — $100M product experience roadmap

**Purpose.** This document is the experience strategy layer: what “great” means, how we phase investment, and how we measure whether BrandOps *earns* daily use and word-of-mouth. It is not a feature laundry list. Pair with [`BRANDOPS_USER_EXPERIENCE.md`](../BRANDOPS_USER_EXPERIENCE.md) (IA and flows) and [`product-charter.md`](./product-charter.md) (product intent).

**What “$100M” means here.** A bar for **clarity, trust, and repeat value** you would bet a serious business on: operators trust the system, the core loop is obvious, surfaces feel fast and coherent, and every major action has a clear story (why, what changes, what’s next). Scale follows retention and confidence—not vanity metrics.

---

## 1. North star

**Operators complete meaningful work in fewer steps and with higher confidence** than in ad-hoc tools (spreadsheets, DMs, random tabs).

- **See** state (Pulse, Today) with honest signal, not noise.
- **Act** from Chat and affordances that route into the same command engine.
- **Trust** that the workspace, sensitive copy, and controls behave predictably (local-first contract, no surprise).

**Strategic bet.** BrandOps wins as the **default command-and-state surface** for a serious LinkedIn and pipeline practice—*without* making users depend on cloud models for the core.

---

## 2. Success metrics (how we know it’s working)

| Layer | Indicators (examples) |
|--------|------------------------|
| **Habit** | WAU/MAU, days active per week, sessions that cross Pulse → Chat or Today → Chat |
| **Command confidence** | Successful send → “done” outcome rate; time-to-next-command; repeat use of same intents |
| **Trust** | Support themes around data loss, confusion, “what happened?” (should fall over time) |
| **Perceived quality** | Task completion without backtracking; NPS/PMF survey after stable cohorts (optional) |
| **Performance** | P95 time to interactive on shell surfaces; command feedback latency (perceived) |

**Implemented locally (on-device, no network).** The shell records privacy-preserving aggregates in extension storage (key `product-usage-v1`) and shows them under **Settings → Advanced → Local product metrics**: active calendar days in rolling 7/30, navigations to **Chat** from Pulse/Today/Integrations/Settings, command ok/fail counts and success rate, rolling median time between command completions, ~p95 command round-trip and first shell-ready time. This maps the table above to numbers you can inspect without a third-party analytics stack. Cohort NPS, support-ticket theming, and true WAU/MAU across users still need external or manual processes. Tie every major initiative in §4 to at least one row above.

---

## 3. Experience pillars (non-negotiables)

1. **One brain for action** — Chat, chips, command palette, and “Open in Chat” are one system; language and outcomes stay consistent.
2. **State before hype** — Pulse and Today surface what is true in the workspace; “AI” is a lens, not a slot machine.
3. **On-device as default** — Trust copy and behavior match storage and execution; progressive disclosure for advanced or online steps.
4. **Operator polish** — Loading, empty, error, and confirmation states feel intentional; motion respects `prefers-reduced-motion`.
5. **Findability** — People discover the next best action without reading docs first (progressive help, not a manual upfront).

These map directly to the shell model in `BRANDOPS_USER_EXPERIENCE.md` (Pulse → Chat; Today as cockpit; Settings for trust and data).

---

## 4. Phased roadmap

Phases are **sequenced by leverage**: earlier items unlock retention and clarity; later items multiply distribution and defensibility.

### Phase A — Foundation of trust and loop closure (0–1 quarter)

**Outcome:** A new user can orient, act once, and see the workspace *reflect* that act without doubt.

- **Command loop** — Consistent post-send feedback, failure recovery, and “what you can do next” in Chat (and palette where relevant).
- **Truth in the shell** — Pulse/Today data reflects the same rules as the engine; no contradictory labels between tabs.
- **Data confidence** — Export/import, backup, and session actions are discoverable, labeled, and confirmed with plain-language risk (aligned with Settings patterns).
- **Accessibility baseline** — Landmarks, focus, busy states, and readable contrast on the five-tab shell; treat as release gate.
- **Quality bar** — Typecheck, tests, and a short cross-surface checklist before ship (see `docs/launch-cross-surface-checklist.md` if maintained).

**Exit criteria (examples).** Median user completes first successful command and sees a visible workspace update; critical paths have empty/loading states; no P0 a11y blockers on primary flows.

### Phase B — Core habit and “premium” feel (1–2 quarters)

**Outcome:** The product *feels* like a product—speed perception, microcopy, motion, and empty states reinforce habit, not ornament.

- **Habit nudges** — Thoughtful first-run and return journeys without nagging; optional digest of “what changed” (Pulse/Today) tied to real data.
- **Speed perception** — Optimistic UI only where truth allows; indeterminate and explicit progress for work that takes time; keep Chat responsive while work runs.
- **Depth where it helps** — Today workstreams: clear hierarchy, scannable cards, and single-tap path to act in Chat.
- **Integrations as clarity** — Connection health and “what this affects” in Integrations; fewer dead ends, more “run this in Chat” with suggested lines.

**Exit criteria (examples).** Increased cross-tab sessions; reduced abandonment after first command; qual feedback on “feels professional / fast / clear.”

### Phase C — Differentiation and reach (2–4 quarters)

**Outcome:** Clear reason to choose BrandOps over generic AI wrappers and spreadsheets.

- **Intelligence with boundaries** — Optional layers (e.g. rules, local or remote) with explicit toggles, audit copy, and fallbacks in [`intelligence-rules-remote-layers.md`](./intelligence-rules-remote-layers.md) direction.
- **Role-ready workflows** — Saved command packs, recommended sequences for publishing vs pipeline vs outreach (still one engine).
- **Platform surfaces** — Where the charter allows, companion flows (e.g. LinkedIn context) that return value to the same workspace, not a parallel product.
- **Distribution** — Store listing, onboarding, and help that teach the *model* in under two minutes (orient → act → see result).

**Exit criteria (examples).** Referral and organic growth signals; feature retention on optional intelligence; support volume stable or down per user.

### Phase D — Moat and enterprise-adjacent confidence (4+ quarters)

**Outcome:** Teams and serious solo operators can adopt without fear.

- **Governance** — Audit-friendly export, clear retention story, org-ready narratives (even if single-user for a long time).
- **Reliability** — Versioned workspace considerations, recovery drills, and transparent changelogs for breaking behavior.
- **Ecosystem** — A small set of well-documented integration contracts rather than a zoo of one-offs.

**Exit criteria (examples).** Pilot readiness checklist for “serious” users; support themes shift from fear to feature requests.

---

## 5. What we deliberately will not do (until the pillars hold)

- **Slapping generative “AI” on every screen** to look modern while the core loop is fuzzy.
- **Inconsistent copy** for the same object across Chat, Today, and Pulse.
- **Hidden network or cloud steps** that violate the on-device default without disclosure.
- **Feature breadth** that outruns reliability, privacy story, and testability.

---

## 6. Dependencies and risks

| Risk | Mitigation |
|------|------------|
| **Trust erosion** (data surprise) | One command engine, one storage story, confirm destructive paths, test export round-trips |
| **Cognitive load** (too many surfaces) | IA discipline per `one-pager-ia-and-surface-map.md` and `BRANDOPS_USER_EXPERIENCE.md` |
| **Performance** | Budgets for shell; avoid blocking UI on long work; document heavy paths |
| **Scope creep** | Every initiative names pillar(s) in §3 and metrics in §2 |

---

## 7. Living document

- **Owner:** product + design + eng lead (whoever triages the roadmap in your team).
- **Refresh cadence:** at least **quarterly**, or when charter-level bets change.
- **Related:** [`docs/ux-production-readiness-spec.md`](./ux-production-readiness-spec.md), [`docs/brandops-command-first/`](./brandops-command-first/) for execution polish.

This roadmap is a **steering** artifact: when tradeoffs appear, return to the north star, pillars, and phase exit criteria before adding scope.
