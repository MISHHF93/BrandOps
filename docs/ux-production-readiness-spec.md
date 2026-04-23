# UX Production Readiness Spec

This document converts the UX audit into implementation-ready standards for production.

## 1) Identity and Auth Mode

### Product Identity

- Canonical product name in UI copy: `BrandOps`.
- Legacy internal naming (`OperatorOS`) may remain only for backward-compatible storage migration.
- New keys, labels, and user-facing messages must use `BrandOps` naming.

### Auth Mode Contract

- Current mode: `Local-first workspace`.
- User-facing promise: no required account sign-in to use core product features.
- Optional connected auth (for integrations like Google) is presented as:
  - "Connect integration account" and never "Sign in to BrandOps."

### Copy Rules

- Outcome-first labels over metaphor-only labels.
- Preferred examples:
  - `Open full dashboard` (instead of `Expand`)
  - `Save profile and continue` (instead of `Enter system`)
  - `Open settings first` (instead of `Open Control Deck first`)
- Metaphor language is acceptable in supportive copy, not primary action labels.

## 2) Onboarding and Feedback Contract

### Onboarding Completion

- Persist onboarding/profile completion under BrandOps keys.
- Maintain compatibility by writing to legacy keys during migration windows.
- Completion checks must consider both current and legacy keys.

### Profile Setup Save Semantics

- Save flow must include explicit states:
  - idle
  - saving
  - success notice
  - failure notice
- Success/failure feedback must be visible in-context before modal close.
- Disable primary submit while saving to prevent duplicate writes.

### Integration Save Semantics

- Success notices only after awaited persistence completes.
- Error states surface actionable text and do not clear user input silently.

## 3) Navigation and CTA Hierarchy

### Primary Surface Paths

- Popup primary action: open full dashboard.
- Dashboard primary path: section navigation + profile/task completion.
- Options primary path: settings updates and integration connections.

### Secondary Paths

- Crown menu and quick-jump actions are secondary shortcuts.
- Secondary actions should not out-rank primaries in wording, placement, or emphasis.

### CTA Standard

- Format: `Verb + destination/outcome`.
- Avoid ambiguous verbs without destination context (`Enter`, `Expand`, `Run`, `Do`).
- Keep labels short and specific.

## 4) Release Readiness Checklist

### Must Have

- BrandOps naming consistency for all new user-facing copy.
- Local-first auth messaging clearly separated from optional integration auth.
- Profile setup save feedback and persistence states implemented.
- Legacy key compatibility for onboarding/profile completion preserved.

### Should Have

- Shared feedback patterns across dashboard/popup/options.
- Unified empty-state language patterns.
- Surface-level primary vs secondary navigation emphasis validated in QA.

### QA Scenarios

- First launch with empty storage.
- Launch with legacy profile completion key only.
- Profile save success path and simulated error path.
- Popup-to-dashboard navigation clarity and label comprehension.
