# Branch Execution Plan

This plan is sequential and includes explicit next-branch handoff after each branch is complete.

## Branch 1: `feat/command-center-foundation`

Goal:

- Harden Command Center as the daily execution hub with strong empty states and 1-2 click actions.

Deliverables:

- Clear "right now" actions for publish, outreach, and pipeline.
- Keyboard shortcuts and command palette polish.
- Stable onboarding checklist with resume/profile import guardrails.

Done when:

- `npm run check` and `npm run build` pass.
- No blocking UX gaps for first-session setup.

Next branch:

- `feat/content-publishing-system`

## Branch 2: `feat/content-publishing-system`

Goal:

- Complete local-first content operations from draft capture to scheduled posting workflow.

Deliverables:

- Content Library quality filters and copy utilities.
- Publishing Queue scheduling, reminders, and status workflow.
- Strong clipboard and reminder-state feedback paths.

Done when:

- Content -> Publishing link flow is stable and test-covered.

Next branch:

- `feat/outreach-pipeline-operations`

## Branch 3: `feat/outreach-pipeline-operations`

Goal:

- Make outreach and pipeline movement operationally tight for daily use.

Deliverables:

- Outreach drafting, template reuse, and follow-up logging.
- Pipeline stage movement with urgency reminders and concise summaries.
- Contact/opportunity linking quality improvements.

Done when:

- Outreach -> Contact -> Opportunity chain is reliable and visible.

Next branch:

- `feat/scheduler-local-intelligence`

## Branch 4: `feat/scheduler-local-intelligence`

Goal:

- Solidify scheduler behavior and local intelligence scoring without external dependency.

Deliverables:

- Scheduler recurrence, snooze, due-state handling hardening.
- Explainable scoring and prioritization improvements.
- Policy enforcement for "external AI not required for core".

Done when:

- Rule-based recommendations remain deterministic and test-covered.

Next branch:

- `feat/linkedin-companion-safety`

## Branch 5: `feat/linkedin-companion-safety`

Goal:

- Keep LinkedIn companion useful while explicitly avoiding fragile automation.

Deliverables:

- Safe manual-assist workflows only (no unsafe auto-click behavior).
- Capture prompts, reminders, and contextual operator helpers.
- Clear compliance notes in UI and docs.

Done when:

- Companion actions are stable across typical LinkedIn page states.

Next branch:

- `feat/release-readiness-hardening`

## Branch 6: `feat/release-readiness-hardening`

Goal:

- Final production readiness and maintainability pass.

Deliverables:

- Export/import reliability checks and recovery paths.
- Performance sanity checks on dashboard surfaces.
- Final docs sync: setup, loading, architecture, and roadmap.

Done when:

- `npm run release` completes successfully and artifact validation passes.

Next branch:

- `main` merge or `hotfix/*` as required.
