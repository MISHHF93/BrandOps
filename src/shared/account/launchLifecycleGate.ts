import type { LaunchAccessState } from './launchAccess';

/** When `true`, signed-in users must have `membership.status === 'active'` to use the shell (except Settings shortcuts). Default: off — set `VITE_ENFORCE_MEMBERSHIP_GATE=1` for production billing. */
function isMembershipGateEnforced(): boolean {
  const v = import.meta.env.VITE_ENFORCE_MEMBERSHIP_GATE;
  return v === '1' || v === 'true';
}

export function shouldRequireLaunchAuth(access: LaunchAccessState): boolean {
  return !access.auth.isAuthenticated;
}

export function shouldRequireLaunchMembership(access: LaunchAccessState): boolean {
  if (!isMembershipGateEnforced()) return false;
  return !shouldRequireLaunchAuth(access) && access.membership.status !== 'active';
}

export function canOpenLaunchWorkspace(access: LaunchAccessState): boolean {
  return !shouldRequireLaunchAuth(access) && !shouldRequireLaunchMembership(access);
}
