import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  CircleX,
  Loader2,
  PlayCircle,
  Route,
  ShieldAlert,
  Sparkles,
  XCircle,
  type LucideIcon
} from 'lucide-react';
import type { ExecutionState } from '../../../types/executionState';

/**
 * Shared keyboard-focus ring for every interactive element in this module —
 * same token/values as `MOBILE_BTN_FOCUS` (mobileTabPrimitives.tsx) and the
 * marketing site's own `FOCUS_RING`. Redeclared locally rather than imported
 * from `pages/mobile` since `shared/ui/execution` is a dependency of the
 * mobile shell, not the other way around.
 */
export const EXECUTION_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focusRing/80 focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

export interface ExecutionStateStyle {
  label: string;
  icon: LucideIcon;
  /** Tailwind color token name (text/border/bg all derive from the same token — see tailwind.config.cjs). */
  tone: 'textMuted' | 'accent' | 'warning' | 'success' | 'danger' | 'textSoft';
  /** 'spin' only for the literal loading icon; 'pulse' for other in-progress states; 'none' settles immediately. */
  motion: 'none' | 'pulse' | 'spin';
}

/**
 * Single source of truth for {state -> color+icon+label} — every execution
 * primitive (ActivityIndicator, StreamingStatus, Checkpoint, ExecutionStatus)
 * reads from this so Ask and Plan render one shared visual language. Color is
 * never the only signal — always paired with an icon and a text label.
 */
export const EXECUTION_STATE_STYLES: Readonly<Record<ExecutionState, ExecutionStateStyle>> = {
  IDLE: { label: 'Idle', icon: CircleSlash, tone: 'textMuted', motion: 'none' },
  UNDERSTANDING: { label: 'Understanding', icon: Sparkles, tone: 'accent', motion: 'pulse' },
  PLANNING: { label: 'Planning', icon: Route, tone: 'accent', motion: 'pulse' },
  WORKING: { label: 'Working', icon: Loader2, tone: 'accent', motion: 'spin' },
  NEEDS_APPROVAL: { label: 'Needs approval', icon: ShieldAlert, tone: 'warning', motion: 'none' },
  EXECUTING: { label: 'Executing', icon: PlayCircle, tone: 'accent', motion: 'pulse' },
  VERIFYING: { label: 'Verifying', icon: CheckCircle2, tone: 'accent', motion: 'pulse' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, tone: 'success', motion: 'none' },
  BLOCKED: { label: 'Blocked', icon: AlertTriangle, tone: 'warning', motion: 'none' },
  FAILED: { label: 'Failed', icon: XCircle, tone: 'danger', motion: 'none' },
  REJECTED: { label: 'Rejected', icon: CircleX, tone: 'danger', motion: 'none' },
  CANCELLED: { label: 'Cancelled', icon: CircleSlash, tone: 'textSoft', motion: 'none' }
};

const TONE_TEXT_CLASS: Record<ExecutionStateStyle['tone'], string> = {
  textMuted: 'text-textMuted',
  accent: 'text-accent',
  warning: 'text-warning',
  success: 'text-success',
  danger: 'text-danger',
  textSoft: 'text-textSoft'
};

const TONE_BG_SOFT_CLASS: Record<ExecutionStateStyle['tone'], string> = {
  textMuted: 'bg-surface',
  accent: 'bg-accent/12',
  warning: 'bg-warningSoft/20',
  success: 'bg-successSoft/20',
  danger: 'bg-dangerSoft/20',
  textSoft: 'bg-surface'
};

const TONE_BORDER_CLASS: Record<ExecutionStateStyle['tone'], string> = {
  textMuted: 'border-border/50',
  accent: 'border-accent/40',
  warning: 'border-warning/40',
  success: 'border-success/40',
  danger: 'border-danger/40',
  textSoft: 'border-border/40'
};

export function executionToneTextClass(tone: ExecutionStateStyle['tone']): string {
  return TONE_TEXT_CLASS[tone];
}

export function executionToneSoftBgClass(tone: ExecutionStateStyle['tone']): string {
  return TONE_BG_SOFT_CLASS[tone];
}

export function executionToneBorderClass(tone: ExecutionStateStyle['tone']): string {
  return TONE_BORDER_CLASS[tone];
}

const MOTION_CLASS: Record<ExecutionStateStyle['motion'], string> = {
  none: '',
  pulse: 'motion-safe:animate-pulse',
  spin: 'motion-safe:animate-spin'
};

export function executionMotionClass(motion: ExecutionStateStyle['motion']): string {
  return MOTION_CLASS[motion];
}
