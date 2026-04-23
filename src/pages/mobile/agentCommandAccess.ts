import type { LaunchAccessState } from '../../shared/account/launchAccess';
import {
  shouldRequireLaunchAuth,
  shouldRequireLaunchMembership
} from '../../shared/account/launchLifecycleGate';
import type { MobileShellTabId } from './mobileShellQuery';

/**
 * When non-null, workspace agent commands (Chat, palette, quick runs) are blocked for this reason.
 * Settings tab may still run commands when only membership is missing (per shell rules).
 */
export function getAgentCommandLock(
  access: LaunchAccessState,
  activeTab: MobileShellTabId
): 'auth' | 'membership' | null {
  if (shouldRequireLaunchAuth(access)) return 'auth';
  if (shouldRequireLaunchMembership(access) && activeTab !== 'settings') return 'membership';
  return null;
}
