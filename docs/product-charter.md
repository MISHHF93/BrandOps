# BrandOps Product Charter

BrandOps is a premium local-first browser extension for LinkedIn publishing workflow, outreach management, scheduling, and opportunity pipeline operations.

BrandOps is a personal publishing, outreach, and pipeline operating system for technical operators, consultants, founders, and builders.

## Core Purpose

BrandOps helps the user organize, schedule, and execute LinkedIn publishing and outreach workflows without relying on external AI models for core functionality.

## Primary Goals

- Let the user paste in post content they created anywhere.
- Organize drafts and reusable writing assets.
- Schedule publishing reminders and workflow steps.
- Manage outreach drafts and follow-up sequences.
- Track opportunities, contacts, and pipeline movement.
- Provide a browser-native command center for professional growth.
- Remain useful without external AI APIs.
- Support future optional local intelligence or external AI integrations, but do not depend on them.

## Primary User

A technical AI systems architect, consultant, builder, or founder who wants to:

- Grow visibility on LinkedIn.
- Organize publishing and outreach.
- Maintain a collaboration, client, and founder pipeline.
- Operate a disciplined personal brand workflow.
- Avoid subscription costs and avoid dependency on external AI generation tools.

## Product Principles

- Local-first where possible.
- Privacy-first.
- Modular.
- Premium operator dashboard feel.
- Clean and highly usable.
- Useful every day even with no AI integration.
- Scheduling and pipeline centric.
- Compliant, stable, and maintainable.

## Main Modules

1. Command Center
2. Brand Vault
3. Content Library
4. Publishing Queue
5. Outreach Workspace
6. Pipeline CRM
7. Scheduler Engine
8. LinkedIn Companion
9. Settings / Export / Import / Local Intelligence

## Technical Direction

- Browser extension with Manifest V3.
- TypeScript + React + Tailwind CSS.
- Local browser storage abstraction.
- Clean modular service architecture.
- Optional future adapter layer for local intelligence or external AI, but disabled and not required in MVP.

## UX Direction

- Premium dark UI.
- Calm technical operator console.
- High information density without clutter.
- Elegant, minimal, serious.
- Feels like a private command center for publishing and outreach execution.

## Engineering Requirements

- Strongly typed code.
- Modular reusable components.
- Robust storage abstraction.
- Reusable data models.
- Clear comments where helpful.
- Graceful empty states and error handling.
- Realistic seed data.
- Polished UI components.
- Future-ready architecture.

## Constraints

- Do not rely on external AI APIs for the core product.
- Do not fake AI features.
- Do not build fragile site automation that depends on unsafe auto-click behavior.
- Prioritize reminders, workflow management, local organization, and execution support.
- Keep architecture ready for optional local intelligence scoring/prioritization/recommendations.
