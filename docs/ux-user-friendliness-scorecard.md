# BrandOps user friendliness scorecard

Use this to agree on what “easy to use” means, score the current product honestly, and track improvements. Score each row **1–5** (1 = hurts users, 5 = effortless). Leave notes and evidence (screens, quotes, task times).

**Scale**

| Score | Meaning |
|------:|---------|
| 1 | Blocking or hostile; frequent errors or abandonment |
| 2 | Understandable only with trial and error |
| 3 | Works after onboarding; friction on first visits |
| 4 | Predictable for repeat users; rare confusion |
| 5 | New users succeed on core tasks without help |

---

## 1. First-time clarity (mental model)

| Criterion | 1–5 | Notes |
|-----------|-----|-------|
| I can explain in one sentence what this app does for me today | | |
| I know which **single place** is “home” after sign-in | | |
| Names match what I expect (e.g. “Today” vs “Pulse”) | | |

**Pain you reported:** overlapping ideas (timeline vs planner vs commands) inflate cognitive load — score these strictly.

---

## 2. Navigation & wayfinding

| Criterion | 1–5 | Notes |
|-----------|-----|-------|
| I can reach my goal in **≤3 taps/clicks** from the default screen | | |
| Bottom tabs feel distinct — I rarely open the wrong one | | |
| **⌘K / Ctrl+K** (command palette) is discoverable without reading docs | | |
| URLs / back button behavior match my expectation | | |

**Suggested spot checks**

- “See what’s due soon” → where did you land?
- “Change a setting” → path taken?
- “Run one workspace command” → path taken?

---

## 3. Information density & calm

| Criterion | 1–5 | Notes |
|-----------|-----|-------|
| First screen fits **one primary job** — not three competing boards | | |
| Headlines and pills don’t duplicate the same idea | | |
| I can dismiss or shrink onboarding/helper UI once learned | | |

---

## 4. Language & labeling

| Criterion | 1–5 | Notes |
|-----------|-----|-------|
| Tab and section titles match everyday words (not product jargon only) | | |
| Tooltip / help text is **short**; long explanations live in Help | | |
| Errors say what broke and **one** next step | | |

---

## 5. Consistency across surfaces

| Criterion | 1–5 | Notes |
|-----------|-----|-------|
| mobile shell vs extension popup vs dashboard feel like **one product** | | |
| Same verbs for same actions (“Run”, “Chat”, etc.) | | |
| Signing in / gating explains why I’m blocked—not only “upgrade” | | |

---

## 6. Confidence & failures

| Criterion | 1–5 | Notes |
|-----------|-----|-------|
| I know when a command **started**, **finished**, or **failed** | | |
| Destructive actions are hard to trigger by mistake | | |
| I can recover after a wrong tab or wrong tap without losing work | | |

---

## 7. Accessibility & inclusive defaults

| Criterion | 1–5 | Notes |
|-----------|-----|-------|
| I can complete core flows with keyboard (where applicable) | | |
| Contrast / tap targets feel comfortable on a phone | | |
| Screen readers get equivalent structure (landmarks, current tab/work area) | | |

---

## Roll-up summary

| Area | Average (optional) | Top 3 fixes |
|------|--------------------|--------------|
| First-time clarity | | 1.<br>2.<br>3. |
| Navigation | | |
| Density / calm | | |
| Language | | |
| Cross-surface | | |
| Confidence | | |
| A11y | | |

**Overall user friendliness (your gut):** ___ / 5 — one sentence:

---

## How to use this in practice

1. **Solo pass** — Fill scores cold, then redo after one week (memory fades myths).
2. **Task tests** — Time 3 recurring jobs; note hesitations (“I knew where to go” vs “guessed”).
3. **Contrast with a comparator** — e.g. “vs last month’s build” only; avoid blaming users for navigation difficulty.

Revise criteria when IA changes (e.g. merging tabs); keep the score history in git or a changelog so trends are visible.

---

## Appendix A — Mapping your feedback to this scorecard

| What you're feeling | Mostly scores in… | Typical root cause |
|---------------------|-------------------|--------------------|
| "Too many roads to the same job" | §2 Navigation, §3 Density | Duplicate surfaces (Pulse vs Today lanes vs Chat starters) exposing the **same workspace snapshot** |
| "Redundant components" | §3 Density, §5 Consistency | Focus boards + timeline + tabs each repeat **signals** with different chrome |
| "Feels X-like" | §1 Mental model, §3 Density | Chronological queue + tabs ≈ feed + lateral sections — competing **attention hierarchies** |
| "Harmonize to one scroll" | §3 one primary job | Need a **single home narrative** with everything else tucked behind chat, sheet, or settings |

---

## Appendix B — North star (pick one verbal contract)

Hold the product to **one sentence** users can repeat:

1. **Chat-first workspace** — *"I talk to BrandOps here; it shows brief context cards when needed."*
2. **Today-first cockpit** — *"I land on my lanes; Chat is how I execute changes."*
3. **Inbox-first** — *"I process a queue first; drilling in is optional."*

Right now the product mixes **(2)** and **(3)** plus a full Chat tab — which reads as redundancy unless each surface has an exclusive job.

---

## Appendix C — Chat-centric solutions (preserve dashboard tools **without** parallel homes)

**Principle:** Keep **all logic, parameters, and agent tools** in one engine. Change **routing and layout** so users do not choose between three UX metaphors daily.

### C1 — Single primary tab: **Chat** (best fit for “AI chat app”)

- Default surface: Chat + pinned composer.
- **Context strip** above the composer: one compact “What’s next” (counts, due hint, sync) — read-only — from the existing workspace snapshot.
- Heavy Today/Pipeline/board UIs become **sheets/panels** opened from agent replies, ⌘K, or one **Inspect** entry — not competing homes.
- **Pulse** folds into a **Queue** drawer inside Chat or as structured message summaries — avoids a feed-shaped tab beside everything else.

Scores well on §2 (fewer taps) and §3 (one primary job).

### C2 — Single scroll **Home**

- One column: Brief → Do next → lane summaries → shortcuts to Sync/Settings.
- **No Pulse tab**: “Due soon” is only the opening block — avoids reverse-chron as a peer surface.
- Chat: prominent button or bar (“Ask BrandOps”).

Matches “harmonizing to one scroll.”

### C3 — Two tabs max: **Assistant | Workspace**

- **Assistant** = Chat + optional queue drawer.
- **Workspace** = read-only rollup + integrations path + Settings link (or gear opens Settings).

Shrinks lateral nav load (§1, §2).

### C4 — Parameters and AI tools placement

| Layer | Role |
|-------|------|
| **Structured UI** | Settings / Integrations forms — authoritative; avoid duplicating elsewhere |
| **Chat + ⌘K** | Same knobs via commands / `configure:` — navigation + execution, not a third dashboard clone |
| **Context cards** | Small in-thread confirmations when useful |

Keeps tooling while killing redundant roads (§5).

---

## Appendix D — De-redundancy checklist (every new UI)

1. What is **exclusive** here vs Chat / Home / Settings?
2. If nothing — merge or collapse to deep link only.
3. Can the user finish the task in **one scroll** without a tab dance?
4. If two routes exist (“see due” Pulse vs Today), pick **canonical** and demote the other to a shortcut.

---

## Appendix E — Suggested incremental experiments

1. Demote Pulse: implement a **Queue** drawer on Chat (smallest C1 slice).
2. Reduce lateral tabs: integrations teaser inside Settings only, or move toward C3 pair.
3. After each slice, rerun §2 spot checks and note scores in the Roll-up summary.
