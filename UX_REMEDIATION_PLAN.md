# BrandOps UX Remediation Plan

> **User report (Apr 23, 2026):** "The application has no logic — I press a button and it takes me to another place. There are too many mismatching buttons, too much information to read. Nothing visual. The application is cognitive-heavy. I can't read it."
>
> This is the direct response. We identified the surface-level issues, root causes, then executed a surgical visual and density overhaul across the mobile shell without breaking contract (tests, command routing, storage, background worker).

---

## 1. What the user was actually seeing

After walking the live shell (`src/pages/mobile/*.tsx`) and the global stylesheet (`src/styles/index.css`), these were the concrete problems:

| #   | Issue                                                                   | Evidence                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Chronic tiny text (9–11px)** in primary content                       | `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-micro` (0.6875rem) everywhere in Pulse, Today, Chat, Settings                                                                                                        |
| 2   | **No visual hierarchy** — body / meta / caption all look equally muted  | `textMuted` + `textSoft` fill most screens; rare use of color; stat tiles (`pulseTile`) are 10px uppercase labels above tiny numbers                                                                                   |
| 3   | **Cognitive overload** — every tab narrates itself 3–5 times            | `MobileApp` header prints tab purpose, then `MobileTabPageHeader` title + subtitle, then `ShellSectionCallout` repeats the purpose, then each section has its own blurb                                                |
| 4   | **Button taxonomy collapse** — everything looks like a ghost chip       | `mobileChipClass`, `.bo-link`, `pulseTile`, "Open in Chat", "Run in Chat", "Review first", "Copy" all share the same rounded-outline-small aesthetic                                                                   |
| 5   | **Primary actions have no primary styling**                             | The Chat "Send" button uses `bg-surfaceActive` (same as disabled pill backgrounds); Pulse "Run in Chat" is a 10px text chip next to "Review first"                                                                     |
| 6   | **Monochrome accent palette reads as dead**                             | `--color-primary: 184 190 201` (a neutral grey) — "primary" never actually pops                                                                                                                                        |
| 7   | **Redundant meta-explanations of navigation itself**                    | Pulse body shows _"Intelligence here uses the same local rules…"_, Today shows _"Today is for planning — not the same screen as Pulse (timeline)."_, FirstRun explains the five tabs again                             |
| 8   | **"Every button takes me to Chat"** — user confusion about command loop | Quick actions all route through `sendQuickCommand` → switch to Chat → execute. The destination is correct, but no visual feedback connected the source button to its result, so it felt like navigation, not execution |
| 9   | **Too many density tiers of the same content**                          | Pulse: 4 color-coded "Matters now / Needs attention / Growing / AI" sections + 3 bucket lists (Today/This week/Later) + a Jump bar + an inline pipeline-health CTA                                                     |
| 10  | **Chat header spends 3 lines explaining which tab executes commands**   | `MobileChatView` header: _"This is where work actually runs. Use chips and matches, or Guided examples. Today is for planning and digests; Pulse is the time-ordered queue — both read; Chat executes."_               |

---

## 2. Root cause

The product copy grew into the UI. Over ~40 commits, every feature added a clarifying sentence next to itself so users would "know the shell." Instead of clarifying, the sentences compete with each other at identical visual weight, and the accent tokens were made neutral-grey for "calm aesthetic," which removed every affordance the sentences referred to.

The **logic is sound** — commands do execute, the agent engine is deterministic, tabs work correctly, URL deep-linking works. The failure is perceptual: users can't _find_ the action inside the wall of 11px grey text.

---

## 3. Design principles for the fix

1. **One narrator per screen.** The header owns the page purpose. Sections own their own content, not their own meta-explanation.
2. **Primary actions must look primary.** A filled button with real contrast for the one thing the screen exists to do (send a command, open Chat, run an AI recommendation).
3. **Visual baseline ≥ 12px for labels, ≥ 13–14px for body.** 9px and 10px are reserved for badges and tabular numerics only.
4. **Use color as information.** Success/warning/info/primary carry meaning. Meta copy stays monochrome. The brand still reads calm, but the signals pop.
5. **Hero tiles, not micro-tiles.** Numbers the user cares about deserve >=28px weight, gradient backplate, and a single-line label.
6. **Every decorative gradient/orb earns its pixels.** One subtle visual element per section at most.
7. **Preserve contracts.** The agent engine, storage key, deep links, and SSR test assertions must still pass.

---

## 4. Fix plan (shipped in this commit)

### 4.1 Tokens & global chrome — `tailwind.config.cjs`, `src/styles/index.css`

- Bump `micro` from `0.6875rem` to `0.75rem` (12px) with 1rem line-height.
- Add typography scale: `textLabel` 13px/1.2rem, `textMeta` 12px/1rem.
- Add a real **brand accent** token `--color-accent` (not grey) reused by primary CTAs, live status dots, and hero halos. Calibrated for both dark and light modes so the monochrome identity is preserved everywhere _except_ primary affordances.
- Add component classes:
  - `.bo-btn-primary` — filled, accent gradient, 13px, min-h 36px. Used by Chat Send, "Run in Chat" (Pulse), and Run in FirstRun.
  - `.bo-btn-ghost` — outline neutral chip for secondary nav only. Separates "navigate" from "execute" visually.
  - `.bo-stat-card` — gradient backplate, big number (text-2xl tabular), single-line label. Used as the Pulse hero.
  - `.bo-section-halo` — decorative radial behind headers so each page has one subtle illustrative element instead of a wall of text.
  - `.bo-visual-orb` — a small decorative colored dot used to mark a live/status signal.

### 4.2 Shell header — `src/pages/mobile/mobileApp.tsx`

- Remove the second-line tab-purpose sentence (`SHELL_TAB_PURPOSE[activeTab]`). It was narrating what the bottom nav already names, and the per-tab hero inside each view explains the purpose once.
- Keep brand eyebrow + active tab name. Keep Commands and Help icon links, but give them consistent `.bo-link bo-link--sm` treatment.
- Skip-link target stays.

### 4.3 Tab page header — `src/pages/mobile/mobileTabPrimitives.tsx`

- `MobileTabPageHeader` gets larger icon chip (h-10 w-10), `text-h1` title, body subtitle (13px not 11px), and an optional `.bo-section-halo` backplate.

### 4.4 Pulse — `src/pages/mobile/PulseTimelineView.tsx`

- New visual hero: 4 `bo-stat-card` tiles across (Due today / Needs attention / Growing / Recommended) with big numbers driven by `home.meta` + row counts.
- Section headers switch from `text-[10px] uppercase tracking-wide` to `text-label font-semibold` with a small colored dot (`bo-visual-orb`).
- Remove the "Intelligence here uses the same local rules…" meta-paragraph.
- Remove the `ShellSectionCallout` (already covered by the hero). **Keep** the three "What matters now / needs attention / growing" + "AI-recommended next actions" headings — SSR tests assert them.
- "Run in Chat" becomes `bo-btn-primary` (filled, accent). "Review first" stays as `bo-link` outline. Now the user can _see_ which button changes the workspace.
- Keep "Jump" row — the integration tests rely on it.

### 4.5 Chat — `src/pages/mobile/MobileChatView.tsx` and `ChatCommandBar.tsx`

- Replace three-line header blurb with a one-liner: _"Type or tap. Commands execute here."_
- Bubble padding/readability bumped (text-sm body default, wider line-height).
- `ChatCommandBar` Send button: `bo-btn-primary` with the sparkle icon. Disabled state keeps the loader but no longer visually matches the idle state (was confusing).
- Typeahead rows get larger touch targets (min-h 40px) and readable 13px title.
- Guided examples inner chips get slightly bigger title/subtitle and a consistent affordance.

### 4.6 Today (Cockpit) — `src/pages/mobile/CockpitDailyView.tsx`, `CockpitFocusEngine.tsx`, `cockpitDailyPrimitives.tsx`

- Drop the duplicate `ShellSectionCallout` at the top of Today.
- `CockpitFocusEngine`: remove the "Today is for planning — not the same screen as Pulse…" paragraph. Keep the three lanes. Upgrade the fast-actions chip to `bo-btn-primary` sized chip.
- `pulseTile` (used in "At a glance"): new gradient variant with 12px label (not 9px), `text-xl` number (not `text-lg`), and a soft border-top accent by index color. Tests assert the content strings, so labels stay the same.

### 4.7 First-run card — `src/pages/mobile/FirstRunJourneyCard.tsx`

- Trim the explanatory sentence from 42 words → 15 words: _"Read in Pulse / Today. Execute in Chat."_ plus the three tab chips and one primary Run.
- "Run: pipeline health" becomes the primary CTA with `bo-btn-primary`.

### 4.8 Stat tile primitive — `src/pages/mobile/cockpitDailyPrimitives.tsx`

- `pulseTile` layout: 12px label, 24px number, 11px subtitle, 88px min-width. Proportions match the new global typography.

---

## 5. What is explicitly not changed

- Agent engine, storage service, background worker, manifest, OAuth pages, Capacitor config, build pipeline, routing, deep links.
- Tab list, tab order, tab ids (`pulse | chat | daily | integrations | settings`).
- Command routes, chat command starters, intent matcher — same catalog, same plain-language inputs.
- Tests that assert literal strings in tabs — every SSR expectation in `tests/integration/mobileTabSurfacesSsr.test.ts` still resolves.

---

## 6. Verification

1. `npm run typecheck` — must remain green.
2. `npm run lint` — must remain green (no new eslint errors).
3. `npm run test` — all SSR and unit tests pass unchanged.
4. Manual: open `mobile.html`, rotate through all 5 tabs, confirm:
   - Header is one line of brand + one line of active-tab title.
   - Each page has exactly one hero, then its content.
   - Exactly one primary-colored filled button per screen is the "thing the screen exists to do."
   - No 9px or 10px text in body copy.
   - Bottom nav label remains readable.
5. Visual snapshot documented in commit.

---

## 7. Commit

Single focused commit on `main`:

> `ux: collapse narrative copy, add visual hierarchy, promote primary actions across mobile shell`

Then pushed to the existing remote (`git push origin HEAD`).

---

_Authored_: UX pass, Apr 23 2026. No changes to backend surfaces; all work is in the React mobile shell and the shared design tokens.
