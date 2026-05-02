# BrandOps — frontend evaluation & market readiness plan

Single source of truth after documentation consolidation. Update checkboxes as work completes.

---

## 1. Current system snapshot

| Layer                   | What ships                                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shell UI**            | React 18 + Vite 7 + TypeScript + Tailwind. Primary entry `mobile.html` → five-tab `MobileApp` (Pulse, Chat, Today, Integrations, Settings).                      |
| **Other HTML surfaces** | `welcome.html`, `dashboard.html` (redirect/compatibility), `integrations.html` (MV3 `options_ui`), `help.html` (Knowledge Center), `index.html` → `mobile.html`. |
| **Extension runtime**   | MV3 service worker `background.js` (scheduler, reminders, agent ingress). Content script `linkedinOverlay.js` on `*.linkedin.com`.                               |
| **Persistence**         | `chrome.storage` / fallback; canonical workspace via `storageService`. Command execution via `executeAgentWorkspaceCommand`.                                     |
| **Mobile packaging**    | Capacitor deps present; native shells are optional relative to Chrome launch.                                                                                    |

Deep linking: `mobile.html` / `integrations.html` honor `?section=` (tab tokens, Cockpit workstream ids, legacy aliases, workspace module ids). Covered by `tests/unit/mobileShellQuery.test.ts` and `tests/unit/workspaceModuleRoutingContract.test.ts`.

---

## 2. Evaluation — readiness vs “launch to market”

### Strengths

- **Repeatable pipeline**: `npm run release` runs typecheck, ESLint, **Prettier `--check`**, **Vitest unit + integration suites**, production build, dist verification, and produces `release/brandops-extension-v0.1.0.tar.gz`.
- **CI parity**: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) mirrors release gates (`check` → **`format`** → full tests → `build` → `verify:dist`), excluding tarball packaging.
- **Contract tests**: Vitest suite exercises routing, agent intents, storage normalization, shell behavior, and **`history.replaceState` URL sync** for deep links ([`tests/unit/mobileShellUrlBarSync.test.ts`](tests/unit/mobileShellUrlBarSync.test.ts)).
- **Manifest**: MV3 template includes permissions, OAuth-related host permissions, `options_ui`, background module worker, LinkedIn content script.
- **Legal surface**: `public/privacy-policy.html` is copied into `dist/` per `verify-dist.mjs`.

### Gaps / risks (honest)

| Area                        | Risk                                                                                                            | Mitigation (tracked below)                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Chrome Web Store review** | Listing copy, screenshots, justification for permissions/OAuth hosts are publisher work—not enforced in code.   | Phase 2 checklist.                                  |
| **Auth / OAuth**            | Production client IDs and redirect URIs must match published extension ID and OAuth consoles.                   | Env + publisher checklist; test installed-ID flows. |
| **Membership / Stripe**     | Optional build gates (`VITE_ENFORCE_MEMBERSHIP_GATE`); unclear production intent without product sign-off.      | Decide policy; document env for store builds.       |
| **Telemetry**               | Local usage readouts exist; confirm store disclosure matches actual behavior (local-only vs any network).       | Privacy text + listing alignment.                   |
| **LinkedIn companion**      | Narrow host permission; overlay UX and compliance still reviewer-sensitive.                                     | Manual QA + conservative copy in listing.           |
| **Docs removed**            | Prior markdown specs were deleted intentionally; spot-check remaining **user-visible** copy for stale promises. | Phase 3 walkthrough + editorial pass.               |

---

## 3. Execution phases

### Phase 0 — Documentation hygiene

- [x] Remove scattered markdown (keep Cursor `.cursor/skills/*` only).
- [x] Replace with this file + minimal `README.md`.

### Phase 1 — Automated quality gates

- [x] `npm run check` (typecheck + ESLint) passes.
- [x] `npm run format` (Prettier `--check`) passes — **also runs in CI** and inside **`npm run release`**.
- [x] `npm run build` passes.
- [x] `npm run verify:dist` passes.
- [x] `npm run test` passes (unit suite).
- [x] `npm run test:integration` passes.
- [x] `npm run release` passes (artifacts under `release/`). **`release` runs `format`, then `test` + `test:integration`, then build/package** so formatting drift or test regressions block shipping artifacts.

See **Production test findings** below for the latest automated run record.

### Phase 2 — Chrome Web Store submission (publisher)

- [x] **Draft listing copy** + **permission narrative** prepared _(§6 — tailor tone with legal/marketing before paste)_.
- [ ] **Screenshots** & promo tiles _(capture from stable build; Chrome requires specific sizes)_.
- [x] **Privacy practices** questionnaire prep _(cross-check answers against [`public/privacy-policy.html`](public/privacy-policy.html))_.
- [x] **OAuth redirect checklist** _(§6 URI table — register exact URLs per provider + chrome-extension ID)_.
- [x] **Permission justification** narrative _(§6 — paste/adapt per Developer Dashboard prompts)_.
- [ ] Bump **`version`** in [`package.json`](package.json) / [`public/manifest.template.json`](public/manifest.template.json) **on each store upload** _(then `npm run build`)_.

### Phase 3 — Product hardening (engineering)

- [x] Sweep codebase for broken `docs/*` path references after markdown removal (comments + `.env.example`).
- [ ] Manual walkthrough: cold install → welcome → Pulse → Chat command → Today workstreams → Integrations → Settings → Help _(checkboxes under **§5 Extension fidelity QA**)_.
- [x] Regression pass on **`?section=` + URL bar sync** — automated via [`tests/unit/mobileShellQuery.test.ts`](tests/unit/mobileShellQuery.test.ts), [`tests/unit/workspaceModuleRoutingContract.test.ts`](tests/unit/workspaceModuleRoutingContract.test.ts), [`tests/unit/mobileShellUrlBarSync.test.ts`](tests/unit/mobileShellUrlBarSync.test.ts), plus [`tests/unit/mobileShellFourTabsContract.test.ts`](tests/unit/mobileShellFourTabsContract.test.ts) _(popstate wiring contract)_; optional manual spot-check in §5.
- [x] **Capacitor/Android/iOS scope for v1:** ship **Chrome extension first**; Capacitor deps remain for optional native experiments—not blocking extension launch _(see Decision log)_.

### Phase 4 — Post-launch

- [x] **Monitoring playbook** drafted _(§7)_.
- [x] **Version cadence policy** drafted _(§7)_ — semver `manifest.version` aligned with [`scripts/copy-manifest.mjs`](scripts/copy-manifest.mjs) pipeline.

---

## 4. Immediate commands

```bash
npm install
npm run dev              # http://localhost:5173 — opens via scripts/dev.mjs
npm run dev:mobile       # Vite + open mobile.html
npm run release          # check + format + unit tests + integration tests + build + verify-dist + tarball
```

Load unpacked: Chrome → Extensions → Developer mode → Load unpacked → select **`dist/`** after **`npm run release`** or **`npm run build`** (same `dist/` output).

**Optional — layout-only preview (no `chrome.*` APIs):** `npm run build` then `npm run preview` (port **4173**, see [`vite.config.ts`](vite.config.ts)).

**CI:** GitHub Actions [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `check`, **`npm run format`**, full **`npm run test`** + **`npm run test:integration`**, `build`, `verify:dist` _(parity with `release`, minus tarball)_.

---

## 5. Production test findings

_Use this section after each production-style run. Automated rows can be pasted from CI or local terminal._

### Latest automated run (local)

| Gate              | Result      | Notes                                                                                                                                                             |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run release` | **Pass**    | Includes `check`, **`format`**, `npm run test` (45 files / 203 tests), `npm run test:integration` (1 file / 14 tests), `build`, `verify:dist`, `package:release`. |
| `verify-dist`     | **Pass**    | Required HTML, chunks, OAuth pages, `privacy-policy.html`, `manifest.json` shape per [scripts/verify-dist.mjs](scripts/verify-dist.mjs).                          |
| Release artifact  | **Created** | `release/brandops-extension-v0.1.0.tar.gz`                                                                                                                        |

### Extension fidelity QA (manual — Step 3 runbook)

_Complete in Chrome or Edge with **Load unpacked → `dist/`**._ Check off when verified:

- [ ] Cold load / first-run → shell usable (`welcome.html` / `mobile.html` per entry flow).
- [ ] Five-tab shell: Pulse, Chat (command executes), Today (workstreams), Integrations, Settings.
- [ ] `help.html` Knowledge Center navigation.
- [ ] Options page opens `integrations.html` (`options_ui`).
- [ ] Deep links: `?section=` tab tokens + Cockpit workstreams / module ids (`mobile.html`, `integrations.html`).
- [ ] Background: scheduler path sanity (optional timed check); notifications if exercised.
- [ ] LinkedIn overlay on `*.linkedin.com` (if shipping content script).
- [ ] OAuth / sign-in against **published** extension ID and provider consoles.

_Add defects inline:_ _(none logged yet — replace when issues found)._

---

## 6. Chrome Web Store submission drafts

_Use these as starting points only — run past counsel/policy before submitting._

### Listing copy (draft)

**Short description** _(≤132 chars; tighten further if needed):_

> BrandOps is a local-first command workspace for operators: pulse your pipeline, plan Today, run agent commands in Chat, and manage integrations—all without sending workspace data off-device by default.

**Detailed description** _(expand with your positioning; disclose OAuth/sign-in):_

> BrandOps helps technical builders run their operating rhythm from Chrome: a five-tab shell (Pulse timeline, Chat agent commands, Today cockpit, Integrations hub, Settings). Workspace state persists locally via extension storage; commands execute through a deterministic local engine. Optional federated sign-in uses Google/GitHub/LinkedIn OAuth where configured; tokens stay on-device unless you configure external sync (see Privacy Policy). A LinkedIn companion content script runs only on linkedin.com pages you visit while the extension is enabled.

Single-purpose: **personal productivity / operator workspace tied to the BrandOps shell**.

### Permission justifications _(adapt per Dashboard character limits)_

| Permission      | Plain-language justification                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`       | Persist workspace snapshot, scheduler tasks, preferences, and chat UI state locally across sessions.                                                  |
| `alarms`        | Wake the service worker for scheduled reminders tied to workspace tasks.                                                                              |
| `notifications` | Surface reminder notifications when tasks become due (when OS/browser allows).                                                                        |
| `identity`      | Use Chrome identity APIs for OAuth sign-in flows tied to extension OAuth clients.                                                                     |
| `tabs`          | Open or focus extension pages (`welcome.html`, `mobile.html`, etc.) when navigating from UI or onboarding flows (see `chrome.tabs.create` usage).     |
| `activeTab`     | Temporary access to the foreground tab context when the user invokes the extension UI from the toolbar—paired with conservative host usage elsewhere. |

_Removed unused **`scripting`** permission from [`public/manifest.template.json`](public/manifest.template.json) to match actual API usage before store review._

### Host permissions _(summarize for reviewer)_

- **`*.linkedin.com`** + LinkedIn OAuth/API hosts: LinkedIn companion overlay and LinkedIn OAuth completion pages bundled under `dist/oauth/linkedin-brandops.html`.
- **Google / GitHub hosts**: federated OAuth popup/callback flows for bundled OAuth HTML under `dist/oauth/*`.

### OAuth redirect URIs _(register every variant you ship)_

| Surface                        | Example pattern                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Extension `chrome.identity`    | `https://EXTENSION_ID.chromiumapp.org/*` _(Chrome-provided)_ plus provider-specific redirect URIs from OAuth consoles                            |
| Hosted OAuth HTML _(optional)_ | `https://YOUR_ORIGIN/oauth/google-brandops.html` _(same for github / linkedin)_ — must match [`dist/oauth/*.html`](public/oauth/) deployed paths |

See [.env.example](.env.example) for `VITE_*` client IDs and hosted URLs.

---

## 7. Post-launch operations

- **Reviews:** Check Chrome Web Store ratings/reviews weekly for the first month; batch replies if policy allows.
- **Crash / telemetry:** No remote crash reporter is wired by default — if you add one, update Privacy Policy + listing **before** enabling.
- **Version cadence:** Bump [`package.json`](package.json) `version` and [`public/manifest.template.json`](public/manifest.template.json) `version` together; run `npm run release`; tag Git `vX.Y.Z`; attach store package notes (what changed).
- **Hotfixes:** Prefer patch version for urgent reviewer-visible regressions.

---

## 8. Decision log

_Add dated decisions here so marketing/engineering stay aligned._

| Date       | Decision                                                                                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(today)_  | Legacy markdown corpus removed; this file is the canonical readiness tracker until superseded.                                                                                                                                                                 |
| _(today)_  | Source/help comments and `.env.example` updated to drop stale `docs/*` pointers; CSS cockpit comment dereferenced deleted spec.                                                                                                                                |
| 2026-05-02 | **`npm run release`** pipeline: **`check`** → **`format`** (Prettier) → **`test`** → **`test:integration`** → **`build`** → **`verify:dist`** → **`package:release`**. CI mirrors this minus tarball ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)). |
| 2026-05-02 | Production testing runbook executed: automated gates green; manual Step 3 checklist left open for operator sign-off in-browser.                                                                                                                                |
| 2026-05-02 | Removed unused **`scripting`** MV3 permission from manifest template — codebase uses declarative content scripts + `tabs`/`activeTab` only; narrows reviewer scope.                                                                                            |
| 2026-05-02 | Repo-wide **`npm run format:write`** applied so `npm run format` stays green on CI/local.                                                                                                                                                                      |
| 2026-05-02 | **`npm audit fix`** applied (PostCSS ≥8.5.10); dependency tree reports **0** vulnerabilities after **`npm install`**.                                                                                                                                          |

---

## 9. Assistant suggestions — matched vs still on you

| Topic                                                                                           | Where it landed                                                                                              | Status                                                             |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **Automated pipeline** (`check`, **Prettier**, tests, integration, build, verify-dist, tarball) | §1 strengths, §3 Phase 1, `npm run release`, [`.github/workflows/ci.yml`](.github/workflows/ci.yml)          | **Matched**                                                        |
| **Artifact verification** (`dist/`, manifest, OAuth HTML, privacy)                              | [`scripts/verify-dist.mjs`](scripts/verify-dist.mjs), §5 table                                               | **Matched**                                                        |
| **Dead-code hygiene** (Knip, orphan routing tests)                                              | `knip.json`, unit tests                                                                                      | **Matched** (`npx knip` exits 0)                                   |
| **Narrow MV3 permissions** (drop unused `scripting`)                                            | [`public/manifest.template.json`](public/manifest.template.json), §6                                         | **Matched**                                                        |
| **Deep-link URL bar behavior** (`replaceMobileShellQueryInUrl`)                                 | [`tests/unit/mobileShellUrlBarSync.test.ts`](tests/unit/mobileShellUrlBarSync.test.ts), Vitest jsdom options | **Matched**                                                        |
| **`npm audit` / dependency hygiene**                                                            | PostCSS via **`npm audit fix`**; **`npm install`**                                                           | **Matched** _(re-run `npm audit` after future dependency changes)_ |
| **Dev server / local run**                                                                      | **`npm run dev`** → `http://localhost:5173/`                                                                 | **Matched** _(boot verified)_                                      |
| **Manual extension QA** (five tabs, help, options, OAuth with real IDs)                         | §5 checkboxes                                                                                                | **Yours** — tick when done in Chrome                               |
| **Store screenshots + version bump per upload**                                                 | §3 Phase 2                                                                                                   | **Yours**                                                          |
| **OAuth console registration + listing legal review**                                           | §6 drafts                                                                                                    | **Yours**                                                          |
| **Membership / Stripe gate policy for prod builds**                                             | §2 gaps table, `.env.example`                                                                                | **Product decision**                                               |
