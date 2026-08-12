import type { LaunchAccessState } from './launchAccess';

/** When `true`, the mobile shell opens Chat/Workspace without the on-device preview-identity wall. */
function isLaunchAuthSkipped(): boolean {
  const v = import.meta.env.VITE_SKIP_LAUNCH_AUTH;
  return v === '1' || v === 'true';
}

/** Development-only demo gate. Production billing needs verified server-side entitlements, which are not shipped here. */
function isMembershipGateEnforced(): boolean {
  if (!import.meta.env.DEV) return false;
  const v = import.meta.env.VITE_ENFORCE_MEMBERSHIP_GATE;
  return v === '1' || v === 'true';
}

export function shouldRequireLaunchAuth(access: LaunchAccessState): boolean {
  if (isLaunchAuthSkipped()) return false;
  return !access.auth.isAuthenticated;
}

export function shouldRequireLaunchMembership(access: LaunchAccessState): boolean {
  if (!isMembershipGateEnforced()) return false;
  return !shouldRequireLaunchAuth(access) && access.membership.status !== 'active';
}

export function canOpenLaunchWorkspace(access: LaunchAccessState): boolean {
  return !shouldRequireLaunchAuth(access) && !shouldRequireLaunchMembership(access);
}
