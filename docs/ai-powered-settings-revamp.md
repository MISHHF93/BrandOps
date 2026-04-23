# AI-powered Settings — product spec (minimal surface, maximal agent)

This document captures the idea of **revamping the Settings tab** into a **thin, workspace-centric surface** where most tuning happens through the **same on-device agent and schemas you already have** (`configure:` flows, `CONFIG_PRESETS` / `OPERATIONAL_PRESETS`, `buildAiSettingsPlan` in `aiSettingsMode.ts`, persisted `BrandOpsData`). The goal is **less vertical scroll**, **fewer duplicate “set / reset” affordances**, and a **clear story**: Settings = identity + data safety + “talk to the workspace,” not a second dashboard.

---

## 1. Problem statement

Today (`MobileSettingsView.tsx`) the Settings tab is **information-dense and honest**, but it mixes:

- **Operational controls** (preferences forms that compile to natural-language-style lines and call `applySettingsConfigure`)
- **Reference / debug** (dataset lineage, intelligence rules coefficients, full workspace model readout)
- **Discovery** (many one-tap `configure:` chips, workflow bundles, vault peek, audit re-run)
- **Session & data safety** (export / import / reset seed, clear chat)
- **Packaging** (extension shell escape hatch)

Many of those **overlap with Chat** (same `configure:` strings and `runCommand`) and with **Help** (coefficients, templates). The “crazy but good” insight: **treat Settings as a tab that resets mental scope** — a **compact command deck** backed by **schemas you already trust**, not a wall of panels.

---

## 2. Vision — “AI-powered” in this codebase

**Important constraint:** BrandOps mobile today is **local-first**; “AI” in Settings should mean **assistant-mediated configuration** using **`executeAgentWorkspaceCommand` / `configure-workspace`** (and related routes), **not** a promise of cloud generative UI unless you later add a remote model.

**Vision (v1, realistic):**

1. **Primary surface:** One **composer** (or prominent “Ask the workspace” field) that sends lines like Chat, but **scoped to settings intents** (reuse `applySettingsConfigure` so the thread stays clean, or optionally mirror to Chat).
2. **Guided packs:** **`OPERATIONAL_PRESETS`** as **workspace templates** (see `docs/workspace-modes-and-cadence-ux.md` — Focus / Studio / Pipeline / Sprint grid); **schema-aligned bundles** remain the hero of the tab.
3. **Minimal always-on:** Only **user / workspace identity**, **data backup & reset**, and **one line of status** (theme, cadence summary) stay as **compact rows** or a **single summary card**.
4. **Everything else** moves to: **collapsed “Advanced”**, **Help / Knowledge**, or **Chat** (“paste this coefficient question in Chat” is worse than a deep link — prefer Help).

**Vision (v2, optional later):** NL → structured plan preview (“You asked for X; I will apply these fields … Confirm”) before write — still backed by the same engine, with an explicit confirm step.

---

## 3. What stays visible (Tier A — minimal configuration)

| Area                              | Rationale                               | Notes                                                                                                               |
| --------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Operator / workspace identity** | User-owned, not inferable from one line | Short fields: name, primary offer, focus metric — or a **single “Profile” summary** edited via composer             |
| **Workspace data safety**         | Destructive / legal-adjacent            | **Export**, **Import**, **Reset to seed** — keep, with **strong hierarchy** (primary = export; destructive grouped) |
| **Session (local)**               | Distinct from workspace                 | **Clear chat transcript** — one control; copy explains it does not touch `BrandOpsData`                             |
| **Effective snapshot**            | Orientation without dumping the model   | **One card**: theme, cadence mode, workday window, rules source **label only** (no coefficient grid)                |

Tier A should fit **above the fold on a small phone** without scrolling, or with **one short scroll**.

---

## 4. What moves behind AI / advanced (Tier B)

| Current block                                                | Direction                                                                                                                                                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Preferences** multi-section form (`SettingsEditablePanel`) | **Default:** hide behind **“Adjust preferences with the assistant”** — composer + **3–4 suggested prompts** derived from today’s snapshot. **Optional:** “Show classic form” in Advanced. |
| **`CONFIG_PRESETS` grid**                                    | Merge into **composer chips** or **one “Quick tweaks” horizontal scroller** — fewer duplicated labels vs `OPERATIONAL_PRESETS`.                                                           |
| **Intelligence rules — sample coefficients**                 | Move to **Help** or **Advanced** only; Settings shows **source + OK/error** one line.                                                                                                     |
| **Workspace model readout** (`WorkspaceModelReadout`)        | **Advanced only** or **Help appendix** — power users, support.                                                                                                                            |
| **Dataset lineage**                                          | **Single line** in status card (“Seed v… · source …”) or Advanced.                                                                                                                        |
| **Messaging vault peek + log note**                          | **Today / Brand workstream** or Chat — not Settings unless you want a single “Vault” link.                                                                                                |
| **Recent agent activity + Run again**                        | **Chat sidebar** or **Pulse** — duplicate of Chat history pattern.                                                                                                                        |
| **Settings cockpit capability disclosure**                   | Shorten to **one sentence + link to Help** or fold into Help.                                                                                                                             |
| **Extension shell**                                          | **Footer link** when not on `integrations.html`; keep one line.                                                                                                                           |

---

## 5. “Tab reset” as a product metaphor

You called out liking **“one tab resets”** — map that to UX:

- **Entering Settings** = **context switch**: composer placeholder like _“What should we change about how this workspace runs?”_ and **no** full readout until user expands Advanced.
- **Leaving Settings** after a successful `configure:` = **toast / inline success** + optional **“View in Today”** deep link (already have workstream URLs).
- **Destructive resets** (seed reset, clear chat) stay **rare, labeled, confirm-modal** — never buried inside AI copy; **AI suggests, user confirms** for data wipes.

---

## 6. Engineering map (no new backend required for v1)

| Capability                        | Already exists                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| Apply settings without chat noise | `applySettingsConfigure` in `mobileApp.tsx`                                            |
| Bundled “modes”                   | `OPERATIONAL_PRESETS` in `mobileSettingsPresets.ts`                                    |
| Fine-grained chips                | `CONFIG_PRESETS`                                                                       |
| Parser / planner                  | `buildAiSettingsPlan` / `applyAiSettingsOperations` in `services/ai/aiSettingsMode.ts` |
| Persistence                       | `storageService`, `BrandOpsData`                                                       |

**New work is mostly UI composition** + copy + optional **intent hints** (regex or small classifier client-side) to suggest which preset to run — **not** a new persistence schema.

---

## 7. Risks and guardrails

1. **Discoverability:** If everything hides behind the assistant, new users may not find export/reset — Tier A must stay obvious.
2. **Offline / no remote LLM:** Copy must not imply a cloud “brain” unless you ship one.
3. **Errors:** `configure:` failures must surface **inline on Settings** (you already have `applyError` / `applyHint` patterns).
4. **Accessibility:** Composer + chips need **keyboard order**, **live region** for apply result, **confirm dialogs** for seed reset (already in shell).

---

## 8. Phased delivery

| Phase  | Outcome                                                                                                                                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** | New layout skeleton: Tier A card + composer + hero workflow presets; collapse rest under **Advanced**. **Implemented** in `MobileSettingsAISurface.tsx` + `MobileSettingsView.tsx` (`onOpenTodayTab` from `mobileApp.tsx`). |
| **S2** | Remove duplicate lists (audit, vault) from Settings or replace with links.                                                                                                                                                  |
| **S3** | Optional NL preview (confirm) before `applySettingsConfigure`.                                                                                                                                                              |
| **S4** | Telemetry hooks (if product wants): which preset fires, composer success rate.                                                                                                                                              |

---

## 9. Open decisions

1. Should Settings composer **append to Chat** for transparency, or **never** touch the thread (current `applySettingsConfigure` behavior)?
2. Do **OAuth / identity provider** controls live on Settings Tier A or only Integrations?
3. Is **“Advanced”** a single `<details>` or a second tab inside Settings (sub-nav)?

---

## 10. Next step

When you want to build this, start with **S1**: reshape `MobileSettingsView.tsx` only — **no** changes to `agentWorkspaceEngine` or storage unless we add preview/confirm. Use this doc as the **acceptance checklist** (Tier A visible, Tier B reachable, presets hero, destructive actions unchanged in severity).
