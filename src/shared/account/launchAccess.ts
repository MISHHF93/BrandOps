import { getBrowserStorage } from '../storage/browserStorage';

export type AuthProviderId = 'google' | 'apple' | 'email' | 'github' | 'linkedin';

export type MembershipStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled';

export interface LaunchAuthState {
  isAuthenticated: boolean;
  provider: AuthProviderId | null;
  email: string;
  signedInAt?: string;
}

export interface LaunchMembershipState {
  status: MembershipStatus;
  renewalDate?: string;
  customerId?: string;
}

export interface LaunchAccessState {
  auth: LaunchAuthState;
  membership: LaunchMembershipState;
}

export const LAUNCH_ACCESS_STORAGE_KEY = 'launch:access';
const LEGACY_KEY = 'brandops:launch:access';

const DEFAULT_STATE: LaunchAccessState = {
  auth: {
    isAuthenticated: false,
    provider: null,
    email: ''
  },
  membership: {
    status: 'none'
  }
};

function parseLaunchAccessState(input: Partial<LaunchAccessState> | null | undefined): LaunchAccessState {
  const parsed = input ?? {};
  return {
    auth: {
      isAuthenticated: Boolean(parsed.auth?.isAuthenticated),
      provider:
        parsed.auth?.provider === 'google' ||
        parsed.auth?.provider === 'apple' ||
        parsed.auth?.provider === 'email' ||
        parsed.auth?.provider === 'github' ||
        parsed.auth?.provider === 'linkedin'
          ? parsed.auth.provider
          : null,
      email: typeof parsed.auth?.email === 'string' ? parsed.auth.email : '',
      signedInAt: typeof parsed.auth?.signedInAt === 'string' ? parsed.auth.signedInAt : undefined
    },
    membership: {
      status:
        parsed.membership?.status === 'trialing' ||
        parsed.membership?.status === 'active' ||
        parsed.membership?.status === 'past_due' ||
        parsed.membership?.status === 'canceled'
          ? parsed.membership.status
          : 'none',
      renewalDate:
        typeof parsed.membership?.renewalDate === 'string' ? parsed.membership.renewalDate : undefined,
      customerId: typeof parsed.membership?.customerId === 'string' ? parsed.membership.customerId : undefined
    }
  };
}

export function authProviderLabel(provider: AuthProviderId | null): string {
  if (provider === 'google') return 'Google';
  if (provider === 'apple') return 'Apple';
  if (provider === 'email') return 'Email magic link';
  if (provider === 'github') return 'GitHub';
  if (provider === 'linkedin') return 'LinkedIn';
  return 'None';
}

export function readLaunchAccessState(): LaunchAccessState {
  if (typeof localStorage === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return DEFAULT_STATE;
    return parseLaunchAccessState(JSON.parse(raw) as Partial<LaunchAccessState>);
  } catch {
    return DEFAULT_STATE;
  }
}

export function writeLaunchAccessState(state: LaunchAccessState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
  void writeLaunchAccessStateForRuntime(state);
}

export async function readLaunchAccessStateForRuntime(): Promise<LaunchAccessState> {
  try {
    const browserLocalStorage = getBrowserStorage('local');
    const raw = await browserLocalStorage.get<Partial<LaunchAccessState>>(LAUNCH_ACCESS_STORAGE_KEY);
    return parseLaunchAccessState(raw);
  } catch {
    return DEFAULT_STATE;
  }
}

export async function writeLaunchAccessStateForRuntime(state: LaunchAccessState): Promise<void> {
  try {
    const browserLocalStorage = getBrowserStorage('local');
    await browserLocalStorage.set(LAUNCH_ACCESS_STORAGE_KEY, state);
  } catch {
    // ignore storage persistence errors
  }
}
