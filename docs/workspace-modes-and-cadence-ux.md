# Workspace modes, cadence, and configuration UX

This spec aligns **cadence** (one vocabulary, one primary control), **workspace templates** (few, scannable bundles), and **configuration** (blank starters that prime the assistant—not walls of chips).

---

## 1. Cadence — single source of truth

**Problem:** Cadence appeared as raw mode strings (`maker-heavy`), repeated in Quick tweaks, assistant chips, and the Advanced form—easy to drift.

**Decision:**

- **`CadenceFlowMode`** remains the canonical type in `src/types/domain.ts`.
- **`src/pages/mobile/cadencePresentation.ts`** owns:
  - `CADENCE_FLOW_ORDER` — display order for UI.
  - `cadenceModeTitle(mode)` — human title (e.g. `Launch day`, `Maker-heavy`).
  - `cadenceModeSummary(mode)` — one short line for tooltips / dense UI.
  - `cadenceConfigureFragment(mode)` — text passed to `applySettingsConfigure` / `configure:` (unchanged engine contract).

**Primary control:** The **Preferences** (Advanced) form — labeled **Operating mode** so users are not tripping over a second “cadence” place in the summary card. The `<select>` uses `cadenceModeTitle` for option labels; **Apply** sends `cadenceConfigureFragment` via the same `configure` engine as Chat.

**Not in Tier A:** The **Workspace** summary card (Tier A) does **not** show cadence or a cadence control — one clear place to change it.

**Removed from Quick tweaks:** Standalone “Cadence …” chips in `CONFIG_PRESETS` (avoid duplicate paths).

---

## 2. Workspace templates (modes)

**Problem:** Long stacked rows felt like “all presets” and competed with the assistant.

**Decision:**

- Keep **four** bundled `configure:` payloads (parser still expects compound plans); rename for clarity:
  - **Focus** — deep work, minimal motion, shorter day.
  - **Studio** — content and publishing window.
  - **Pipeline** — client-heavy CRM motion.
  - **Sprint** — launch-day push window.

**Presentation:** **2×2 grid** of compact cards (title + one-line summary). Same commands as before where possible so tests and `buildAiSettingsPlan` smoke coverage stay valid.

---

## 3. Configuration — blanks, not only presets

**Problem:** Suggestion chips that **immediately applied** felt like hidden presets; power users could not edit before commit.

**Decision:**

- **Composer blank starters:** chips only **fill the assistant field** with a sensible default line (user edits, then **Apply**). Labels are human (“Workday”, “Reminder lead”, …), not raw `configure:` tokens.
- Operating mode (cadence) is **not** duplicated here—use **Preferences → Operating mode**.
- Motion/visual/ambient/debug remain in **Quick tweaks** (Chat path) or Advanced form.

---

## 4. UI polish (Settings shell)

- Tier A summary line is **not** a second cadence surface; it uses visual, reminder, and rules (no “cadence” string).
- Workflow section uses **grid** + balanced spacing; no oversized chevron list.
- Assistant section copy states that **starter chips prime the composer** (they do not auto-apply).

---

## 5. Implementation map

| Piece                                                         | Location                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| Cadence copy + configure fragment                             | `src/pages/mobile/cadencePresentation.ts`                    |
| Composer blank starters                                       | `src/pages/mobile/configurationStarters.ts`                  |
| Presets (CONFIG without cadence; OPERATIONAL labels + layout) | `mobileSettingsPresets.ts`, `MobileSettingsAISurface.tsx`    |
| Tier A workspace summary (no cadence)                         | `SettingsTierAOverview` in `MobileSettingsAISurface.tsx`     |
| Assistant priming                                             | `SettingsAssistantComposer` in `MobileSettingsAISurface.tsx` |
| Operating mode `<select>` + Apply                             | `MobileSettingsView.tsx` (`SettingsEditablePanel`)           |

---

## 6. Acceptance

1. Operating mode is changeable from **Preferences**; Tier A does not show or duplicate it.
2. No “Cadence balanced / …” chips in Quick tweaks.
3. At least three composer starters **prime** only; Apply required.
4. Four workspace templates render as a **2×2** grid; each bundle still produces ≥2 planner operations (existing unit test).
