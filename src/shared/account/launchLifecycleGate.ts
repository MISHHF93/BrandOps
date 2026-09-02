import type { LaunchAccessState } from './launchAccess';

/**
 * Development-only. When `true`, the mobile shell opens Chat/Workspace without
 * the on-device preview-identity wall, so a developer can reach the product
 * without signing in.
 *
 * The `DEV` guard is the whole point and was missing. `import.meta.env.*` is
 * inlined at build time, so a *production* build made with
 * `VITE_SKIP_LAUNCH_AUTH=1` constant-folded this to `true`, which folded
 * `shouldRequireLaunchAuth` to `false`, which deleted the authentication wall
 * from the shipped bundle outright. Verified against real builds: the negated
 * `auth.isAuthenticated` read appears once in a normal production bundle and
 * zero times in one built with the flag set.
 *
 * With the guard, `!import.meta.env.DEV` folds to `true` in any production
 * build and the skip becomes unreachable dead code before the flag is even
 * consulted, so no build-time environment can weaken a shipped gate. Its
 * neighbour below was always written this way; this one was not.
 */
function isLaunchAuthSkipped(): boolean {
  if (!import.meta.env.DEV) return false;
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
