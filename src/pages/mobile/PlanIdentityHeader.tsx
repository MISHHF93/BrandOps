import clsx from 'clsx';
import { ChevronRight, UserRound } from 'lucide-react';
import {
  authProviderLabel,
  type LaunchAccessState,
  type LaunchMembershipState
} from '../../shared/account/launchAccess';

function operatorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]![0];
    const b = parts[1]![0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0]!.length >= 2) return parts[0]!.slice(0, 2).toUpperCase();
  if (parts.length === 1 && parts[0]!.length === 1) return parts[0]!.toUpperCase();
  return 'BO';
}

function membershipToneLabel(membership: LaunchMembershipState): { label: string; tone: 'muted' | 'success' | 'warning' } {
  switch (membership.status) {
    case 'active':
      return { label: 'Membership active', tone: 'success' };
    case 'trialing':
      return { label: 'Trial', tone: 'warning' };
    case 'past_due':
      return { label: 'Billing issue', tone: 'warning' };
    case 'canceled':
      return { label: 'Canceled', tone: 'muted' };
    default:
      return { label: 'Workspace on device', tone: 'muted' };
  }
}

export interface PlanIdentityHeaderProps {
  btnFocus: string;
  operatorName: string;
  positioningPreview: string;
  launchAccess: LaunchAccessState;
  onOpenSettings: () => void;
  /** `sheet` drops the outer shell so the parent Plan surface controls the border. */
  variant?: 'card' | 'sheet';
}

export function PlanIdentityHeader({
  btnFocus,
  operatorName,
  positioningPreview,
  launchAccess,
  onOpenSettings,
  variant = 'card'
}: PlanIdentityHeaderProps) {
  const initials = operatorInitials(operatorName);
  const positioning = positioningPreview.trim().slice(0, 240);
  const auth = launchAccess.auth;
  const mem = membershipToneLabel(launchAccess.membership);
  const accountLine =
    auth.isAuthenticated && auth.email.trim()
      ? `${authProviderLabel(auth.provider)} · ${auth.email.trim()}`
      : 'Not signed in — use Settings to connect your account';

  return (
    <section
      className={clsx(
        'flex flex-col gap-3',
        variant === 'card' &&
          'rounded-2xl border border-border/45 bg-surface/55 px-3 py-3 sm:px-3.5',
        variant === 'sheet' && 'px-0 py-0'
      )}
      aria-labelledby="plan-identity-heading"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/35 bg-accentSoft/22 text-[13px] font-bold uppercase tracking-wide text-accent"
          aria-hidden
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p id="plan-identity-heading" className="text-[13px] font-semibold leading-tight text-text">
            {operatorName.trim() || 'Workspace operator'}
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-snug text-textSoft">
            <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden />
            <span>{positioning || 'Add positioning under Settings → Preferences.'}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border/35 bg-bgSubtle/55 px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-textMuted">Account</p>
          <p className="mt-1 break-words text-[11px] text-textMuted">{accountLine}</p>
          <p
            className={clsx(
              'mt-1 text-[10px] font-semibold',
              mem.tone === 'success' && 'text-success',
              mem.tone === 'warning' && 'text-warning',
              mem.tone === 'muted' && 'text-textSoft'
            )}
          >
            {mem.label}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          title="Account, billing, and workspace preferences"
          className={clsx(
            'inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/50 bg-bg px-2 py-1.5 text-[11px] font-semibold text-text',
            btnFocus
          )}
        >
          Account & billing
          <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
        </button>
      </div>
    </section>
  );
}
