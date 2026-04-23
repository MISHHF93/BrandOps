# Mobile Settings — UX element inventory

This document lists **user-facing elements** for the mobile Settings experience: profile blanks, work rhythm, safety, and trace surfaces. It ties each idea to the **current codebase** so implementation can proceed in ordered slices.

**Related types:** `BrandProfile` and `AppSettings` in `src/types/domain.ts`; configure parsing in `src/services/ai/aiSettingsMode.ts`; Advanced form in `src/pages/mobile/MobileSettingsView.tsx` (`SettingsEditablePanel`).

---

## 1. Design principles (mobile)

- **One primary scroll** on the main Settings tab: read-only **Workspace snapshot** at top, then Assistant → Quick tweaks → Templates → **Preferences** (forms) → Data safety; trace content under **Advanced** (`<details>`).
- **Group + Apply:** Keep **one Apply per group** (workday, operating mode, profile, visual, motion) so users get predictable feedback and partial failure is localized.
- **Same engine as Chat:** Filled values should still be expressible as natural `configure:` / assistant lines where possible (`buildAiSettingsPlan` + `applyAiSettingsOperations`).
- **Read vs write:** Many workspace fields are **trace-only** in Advanced (full model readout) until we add parsers + apply steps for them.

---

## 2. Current map (as implemented)

| Area | Component / block | What the user does |
|------|-------------------|-------------------|
| **Header** | `MobileTabPageHeader` | Orients: snapshot read-only, Preferences = forms, Advanced = lineage & audit. |
| **Workspace snapshot** | `SettingsTierAOverview` | Read-only: visual, reminder, rules, one **Profile (saved)** line + seed; links to Preferences, Help, View Today. |
| **Configure via assistant** | `SettingsAssistantComposer` | Type or paste; blank chips prime the field (workday, reminder, cap, etc.). |
| **Quick tweaks** | `SettingsQuickConfigureScroller` | One-tap Chat commands: visual, motion, ambient, debug, workday, caps. |
| **Workspace templates** | `SettingsWorkflowModesHero` | One-tap bundled `configure:` (Focus, Studio, Pipeline, Sprint). |
| **Data safety** | `SettingsDataSafetyBlock` | Export, import, reset workspace, clear chat. |
| **Preferences (edit workspace)** | `SettingsEditablePanel` (below templates) | **Writable:** workday, max tasks, remind, % business, operating mode preset, **profile** (operator, positioning, offer, brand voice, metric), visual, motion, ambient, debug. |
| **Advanced — full model** | `WorkspaceModelReadout` | Read-only table: timezone, theme, Cockpit, AI adapter, identity provider, notification center, deep work blocks, sync flags, overlay, automation summary, brand voice *preview*, etc. |

---

## 3. Brand & profile — what the data model already has

`BrandProfile` (`domain.ts`) today:

| Field | Role | In Advanced form now? | In `buildAiSettingsPlan` + apply? |
|-----|------|------------------------|-------------------------------------|
| `operatorName` | How the operator is addressed in copy | Yes (`Operator name`) | Yes (`operator name is "…"`) |
| `positioning` | One-line who/what (strategic) | **Yes** (textarea) | **Yes** (`positioning is "…"`) |
| `primaryOffer` | Main offer / wedge | Yes | Yes |
| `voiceGuide` | Tone, vocabulary, do/don’t | **Yes** (textarea) | **Yes** (`brand voice is "…"` or `voice guide is "…"`) |
| `focusMetric` | North-star metric | Yes | Yes |

**Done (P0):** Profile form, `MobileWorkspaceSnapshot`, `buildAiSettingsPlan`, and `update-brand-profile` apply path all include positioning and voice. Composer blank starters include **Positioning** and **Brand voice** chips.

---

## 4. Proposed profile block (form elements)

Use this as the **target checklist** for the Profile subsection under Advanced → Preferences. Order is **identity → offer → voice → measure** (short fields first, longer last).

| # | Element | Control | Notes |
|---|---------|---------|--------|
| 1 | **Operator / display name** | Single-line text | Maps to `operatorName`. Consider `autocomplete="name"` where appropriate. |
| 2 | **Positioning** | Single-line or two-line text | Maps to `positioning`. Placeholder e.g. “Who you help, in one sentence.” |
| 3 | **Primary offer** | Single-line text (long) | Maps to `primaryOffer`. |
| 4 | **Brand voice** | `textarea` (3–5 rows) | Maps to `voiceGuide`. Scrolling is OK; cap length in apply (storage already uses trimmed strings). |
| 5 | **Focus metric** | Single-line text | Maps to `focusMetric`. Help text: e.g. “One number or phrase you check weekly.” |
| 6 | **Apply profile** | Primary button | Submits all non-empty fields in one `configure` line (or multiple operations) — same pattern as today. |

**Empty state:** If all optional fields are empty, keep current behavior: block Apply with a clear message (“Enter at least one profile field.”).

**Progressive disclosure (optional later):** Collapse “Brand voice” behind “Show full voice guidelines” if the form feels long on small phones.

---

## 5. Other Settings areas (future or partial)

These are **not** all in the editable panel yet; the **full readout** already surfaces many for transparency.

| Theme | Example elements | Model source | Suggested priority |
|-------|------------------|-------------|--------------------|
| **Time & calendar** | Timezone, week starts on, default reminder lead | `AppSettings` / `NotificationCenterSettings` | Medium — need dedicated controls + plan steps |
| **Cockpit** | Layout mode, density | `AppSettings` | Low unless we expose in configure |
| **AI & models** | Local model on/off, adapter mode, guidance mode, preferred model, role context, prompt template | `AppSettings` + `notificationCenter` | Medium — sensitive; good for a separate “AI” subsection |
| **Notifications** | Master on/off, per-channel (if any) | `notificationCenter` | As product requires |
| **Sync & identity** | Google / GitHub / LinkedIn status, primary IdP | `syncHub` + `primaryIdentityProvider` | Often link-outs, not free-text |
| **Overlay** | Enabled, compact, contact insights | `overlay` | Low |
| **Deep work** | Block count, hours, which blocks | `cadenceFlow` (partial) + NC | Optional alignment with “Workday” |
| **Automation** | Count + names (read-only list) | `automationRules` | Read-only or future editor |
| **Brand vault** | Long-form bios, assets | `brandVault` | Separate “Brand & content” module; link from Settings |

---

## 6. Engine and snapshot (implemented)

1. **Parse** — `buildAiSettingsPlan`: quoted `positioning is "…"` and `brand voice is "…"` (or `voice guide is "…"`). Quoted voice/positioning may span lines; the closing `"` must be followed by `,` or end of string (do not put raw `"` inside the value).
2. **Apply** — `update-brand-profile` merges `positioning` (trim, max 400) and `voiceGuide` (trim, max 2000) with existing brand fields.
3. **Snapshot** — `MobileWorkspaceSnapshot` includes `positioning` and `voiceGuide` from `workspace.brand`.
4. **Tests** — `tests/unit/aiSettingsMode.test.ts` covers parse + apply for the new fields.

---

## 7. Acceptance criteria (for a “profile page filled out” slice)

- User can type **name, positioning, offer, voice, and metric** in Advanced and **Apply** once.
- After refresh or navigation, values reload into the same fields.
- Chat / assistant can set the same fields with equivalent natural language (or documented `configure:` fragments).
- No duplicate conflicting surfaces: Workspace summary stays a **summary**; full editing stays under Advanced (aligned with [workspace modes doc](./workspace-modes-and-cadence-ux.md)).

---

## 8. Suggested implementation order

1. **P0 — Complete `BrandProfile` in Advanced:** add positioning + brand voice fields; extend snapshot, parser, and apply; keep one Apply.
2. **P1 — Tier A / Cockpit** optionally show a **one-line** positioning preview (truncate) next to offer/focus.
3. **P2 — Timezone / week start** in Preferences or a “Calendar” sub-section with new plan operations.
4. **P3 — AI / notification** sub-panels** tied to the existing full readout rows.

This file is the spec source; when implementing, prefer small PRs (P0 first) and keep `configure` behavior and tests in sync with `aiSettingsMode`.
