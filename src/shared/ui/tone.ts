/**
 * Semantic surface tones — one definition for the whole interface.
 *
 * `toneClass` already existed inside `MobileWorkspaceHubView.tsx`, and three
 * inline ternary ladders in the same file spelled the identical mapping out
 * again, twenty lines below the helper. Two other surfaces wrote the same token
 * strings by hand. Changing how `danger` reads meant finding five places.
 *
 * Consolidating them surfaced the drift immediately: success was
 * `bg-successSoft/20` in one place and `bg-successSoft/15` in another, for the
 * same meaning on the same kind of chip. That is what "colour drift" looks like
 * before anyone notices — not a wrong colour, an *almost* right one.
 *
 * Resolved toward the heavier fill (`/20`) for status chips, because these carry
 * meaning at small sizes and the lighter fill was measurably weaker against the
 * matte background. `danger` stays at `/15`: it is the most saturated of the
 * accents, and matching the others made it shout.
 */

/** What a surface is telling the user, not what colour it is. */
export type SurfaceTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

/**
 * Border + fill + text for a static status surface — a chip, a badge, an icon
 * well. Not for interactive elements: those need hover and focus states, which
 * `toneInteractiveClass` adds.
 */
export function toneClass(tone: SurfaceTone | string | undefined): string {
  switch (tone) {
    case 'success':
      return 'border-success/45 bg-successSoft/20 text-success';
    case 'warning':
      return 'border-warning/45 bg-warningSoft/20 text-warning';
    case 'danger':
      return 'border-danger/45 bg-dangerSoft/15 text-danger';
    case 'info':
      return 'border-info/45 bg-infoSoft/15 text-info';
    case 'primary':
      return 'border-primary/45 bg-primarySoft/20 text-primary';
    default:
      // Unknown tones fall to neutral rather than throwing or rendering bare:
      // an unstyled chip in a status row reads as a bug to the user.
      return 'border-border/45 bg-bgSubtle/70 text-textMuted';
  }
}

/**
 * The same tone for something the user can press. The hover fill deepens rather
 * than shifting hue, so the meaning stays fixed while the affordance changes.
 */
export function toneInteractiveClass(tone: SurfaceTone | string | undefined): string {
  const base = toneClass(tone);
  switch (tone) {
    case 'success':
      return `${base} hover:bg-successSoft/30`;
    case 'warning':
      return `${base} hover:bg-warningSoft/30`;
    case 'danger':
      return `${base} hover:bg-dangerSoft/25`;
    case 'info':
      return `${base} hover:bg-infoSoft/25`;
    case 'primary':
      return `${base} hover:bg-primarySoft/30`;
    default:
      return `${base} hover:border-borderStrong hover:text-text`;
  }
}

/**
 * The lighter weight, for status text that runs the width of a panel rather than
 * sitting in a chip. A full-width tinted paragraph at chip strength reads as an
 * alert; this is the same meaning at the volume the context calls for.
 *
 * Two weights, deliberately — not one. A survey of the interface found `success`
 * rendered four different ways (`border/45 + Soft/20`, `/35 + Soft/10`,
 * `/35 + Soft/20`) and `info` drawn from a different token family entirely
 * (`bg-info` rather than `bg-infoSoft`). Some of that spread was drift and some
 * was a real contextual difference; collapsing it to a single weight would have
 * fixed the drift by introducing a different error.
 */
export function toneSubtleClass(tone: SurfaceTone | string | undefined): string {
  switch (tone) {
    case 'success':
      return 'border-success/35 bg-successSoft/10 text-success';
    case 'warning':
      return 'border-warning/35 bg-warningSoft/10 text-warning';
    case 'danger':
      return 'border-danger/35 bg-dangerSoft/10 text-danger';
    case 'info':
      return 'border-info/35 bg-infoSoft/10 text-info';
    case 'primary':
      return 'border-primary/35 bg-primarySoft/10 text-primary';
    default:
      return 'border-border/40 bg-bg/50 text-textMuted';
  }
}

/**
 * Border only — a container that carries a tone without becoming a status
 * surface. An expandable row that turns its edge amber when it needs attention
 * should not also tint its whole background; the row is still a row.
 *
 * Three weights, and each answers a use that exists in the interface: `toneClass`
 * for chips and badges, `toneSubtleClass` for full-width status text,
 * `toneBorderClass` for container accents. More than that would be indulgence;
 * fewer would force one of them to be wrong.
 */
export function toneBorderClass(tone: SurfaceTone | string | undefined): string {
  switch (tone) {
    case 'success':
      return 'border-success/35';
    case 'warning':
      return 'border-warning/35';
    case 'danger':
      return 'border-danger/35';
    case 'info':
      return 'border-info/35';
    case 'primary':
      return 'border-primary/35';
    default:
      return 'border-border/35';
  }
}

/** Every tone this module answers for. Used by tests to prove none is missing. */
export const SURFACE_TONES: readonly SurfaceTone[] = [
  'success',
  'warning',
  'danger',
  'info',
  'primary',
  'neutral'
];
