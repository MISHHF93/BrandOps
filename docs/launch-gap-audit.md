# BrandOps Launch Gap Audit

This document captures the highest-impact gaps found across the full application and provides a same-day execution plan.

## Audit scope

- Product surfaces reviewed: `dashboard`, `options`, `help`, `welcome`, background worker, content overlay.
- Wiring reviewed: frontend-to-store-to-service flows, extension messaging contracts, navigation links.
- Launch checks executed locally:
  - `npm run check` (pass, 4 React hook warnings)
  - `npm run test:unit` (pass: 10 files, 38 tests)
  - `npm run build` (pass)
  - `npm run verify:dist` (pass)

## Critical gaps (fix before pushing release)

1. **Sync promise vs implemented behavior mismatch**
   - UI copy points users to "Run sync from Settings", but state/services do not expose a real external sync write path.
   - Impact: user trust and feature expectation break.
   - Primary files: `src/services/storage/storage.ts`, `src/background/index.ts` (revisit as sync UX is reintroduced; legacy dashboard UIs are removed).

2. **Placeholder AI output still active**
   - Local adapter returns placeholder generated text.
   - Impact: shipped low-quality behavior in core intelligence experience.
   - Primary file: `src/services/llm/providerAdapter.ts`.

3. **Dead runtime messaging surface**
   - Multiple message types are registered but not consumed by actual UI flows.
   - Impact: avoidable maintenance + security/runtime confusion.
   - Primary files: `src/services/messaging/messages.ts`, `src/background/index.ts`.

4. **Accessibility hole in command/dialog interactions**
   - Dialog behavior is missing robust focus trap and focus return handling.
   - Impact: keyboard/screen-reader usability risk at launch.
   - Primary files: `src/pages/dashboard/dashboardApp.tsx`, `src/shared/ui/components/utils/focusTrap.ts`.

5. **CI does not run unit tests**
   - Workflow runs check/build/verify only.
   - Impact: regressions can merge without test execution.
   - Primary file: `.github/workflows/ci.yml`.

6. **No page-level React error boundary coverage**
   - Load errors are handled, but render-time failures can still white-screen surfaces.
   - Impact: poor failure containment in production.
   - Primary files: `src/pages/*/main.tsx`.

7. **Auth guard policy inconsistent across surfaces**
   - Dashboard is guarded, but `options`/`help` are operational without equivalent gate.
   - Impact: policy inconsistency and potential unauthorized operational access.
   - Primary files: `src/pages/dashboard/dashboardApp.tsx`, `src/pages/options/optionsApp.tsx`, `src/pages/help/helpApp.tsx`.

8. **Release verification does not cover critical runtime assets**
   - Current verification is mostly file/key presence checks.
   - Impact: false confidence for edge-case packaging/runtime failures.
   - Primary file: `scripts/verify-dist.mjs`.

## Medium gaps (address next)

- Integration-hub route intent is unclear (`integration-hub` maps to dashboard `connections`).
- Legacy module descriptors/services remain disconnected from active nav and product IA.
- Manifest host permissions appear broad compared to currently implemented calls.
- Dev preview auth flags can mask production authentication behavior.
- Component library visibility is gated to debug-only path, limiting launch QA discoverability.
- Module naming taxonomy drift increases cognitive load for contributors.

## Same-day execution plan

### Phase 1: release gate hardening (60-90 min)

- [ ] Add `npm run test:unit` to `.github/workflows/ci.yml`.
- [ ] Extend `scripts/verify-dist.mjs` to validate callback pages and required runtime config assets.
- [ ] Re-run: `npm run check && npm run test:unit && npm run build && npm run verify:dist`.

### Phase 2: user-facing trust fixes (90-120 min)

- [ ] Replace placeholder AI adapter output with either real provider path or explicit "not enabled" state.
- [ ] Align dashboard sync copy with real capability (or implement actual sync action if ready).
- [ ] Verify copy/behavior consistency in dashboard and settings.

### Phase 3: runtime and UX safety (90-120 min)

- [ ] Remove/disable unused message contracts in `messages.ts` and `background/index.ts`.
- [ ] Add or complete focus trap + focus return for command/dialog overlays.
- [ ] Add lightweight error boundary wrapper in each page entry.

### Phase 4: policy and cleanup pass (60-90 min)

- [ ] Decide and enforce auth-gate policy for `options` and `help`.
- [ ] Remove/deprecate disconnected legacy modules or clearly mark them as non-launch features.
- [ ] Review permissions in `public/manifest.template.json` and reduce where possible.

## Ship checklist (go/no-go)

- [ ] CI includes `check`, `test:unit`, `build`, and `verify:dist`.
- [ ] No placeholder UX in launch-critical flows.
- [ ] Keyboard-only dialog flows pass manual smoke test.
- [ ] Auth policy is consistent across all exposed surfaces.
- [ ] Dist package verified and release artifact generated.

## Current local baseline

- `check`: pass (warnings only in `src/pages/dashboard/dashboardApp.tsx`)
- `test:unit`: pass
- `build`: pass
- `verify:dist`: pass

Use this audit as the execution source for the launch patch and PR checklist.
