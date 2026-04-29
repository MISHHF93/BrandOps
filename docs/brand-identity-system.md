# BrandOps Brand Identity System

BrandOps should feel like a quiet command center for an operator building and running a personal brand. The product language is not decorative first; it is controlled, legible, and decisive.

## Identity Idea

BrandOps is the place where brand signal turns into managed work.

- **Crown**: ownership, authority, and the operator's command point. Use it for the app shell, global command entry, first-run orientation, auth, and high-value empty states.
- **Ink canvas**: the application workspace. Dark mode is black/charcoal with fine borders; light mode is paper/ink with the same structure.
- **Gold**: brand ownership. It is not a warning color, so use `--brand-gold` for identity and reserve `--color-warning` for caution.
- **Command blue**: active command/action support. Use `--brand-command` sparingly where the user can run, navigate, or execute.
- **Status colors**: green, saffron, red, and info remain only for state feedback.

## Token Roles

The runtime source is `src/styles/index.css`; Tailwind aliases live in `tailwind.config.cjs`.

- `--brand-gold`: crown, wordmark, active shell identity, command entry aura.
- `--brand-gold-strong`: higher-contrast brand emphasis.
- `--brand-gold-soft`: soft brand backgrounds and halos.
- `--brand-command`: command-support accent in gradients and action context.
- `--brand-command-soft`: low-alpha command backgrounds.
- `--brand-ink`: canonical dark/paper ink anchor.

## Component Language

- Use `BrandOpsCrownMark` when a component needs only the vector mark.
- Use `BrandOpsMarkBadge` when the mark needs the framed app identity treatment.
- Use `bo-brand-lockup` for mark + text combinations.
- Use `bo-brand-kicker` for the small uppercase BrandOps label.
- Use `bo-brand-command-surface` for first-run or command-centered surfaces.

Do not create alternate logos, crown variants, or unrelated sparkle/badge marks for primary app identity.

## Voice

Preferred product nouns:

- Workspace
- Command
- Signal
- Today
- Run
- Review in Chat
- Apply

Avoid in primary flows:

- Template, preset, tweak
- Debug/internal labels
- Multiple competing CTAs for the same action

## Application Rules

1. The app shell owns the brand. Header, active navigation, and the floating command action should share the crown/gold language.
2. Navigation is wayfinding, not a second CTA system. Keep tabs and command entry visually distinct.
3. First-run should orient the workspace, not introduce settings. One command CTA is enough.
4. Settings should expose configuration only when it changes real behavior.
5. New surfaces should start from shared primitives before adding one-off styling.
6. Appearance is unified. Do not expose visual moods, retro modes, ambient effects, or motion intensity as workspace settings; motion should respect the operating system reduced-motion preference.
