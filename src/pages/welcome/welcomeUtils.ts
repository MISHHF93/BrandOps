import { QUERY } from '../../shared/navigation/extensionLinks';
import { resolveExtensionUrl } from '../../shared/navigation/extensionRuntime';

/** Session flag: user accepted ToS/Privacy on Welcome (persists across reloads in-tab). */
export const WELCOME_LEGAL_STORAGE_KEY = 'bo:brandops-welcome-legal-v1';

export function hasExtensionIdentity(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.identity?.launchWebAuthFlow);
}

export function welcomeCrownSrc(): string {
  return resolveExtensionUrl('brandops-crown.svg');
}

export type WelcomeAuthMode = 'signIn' | 'signUp';

function parseFlowToken(raw: string | null): WelcomeAuthMode | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'signup' || v === 'sign-up') return 'signUp';
  if (v === 'signin' || v === 'sign-in') return 'signIn';
  return null;
}

function readWelcomeFlowFromSearch(): WelcomeAuthMode | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return (
    parseFlowToken(params.get(QUERY.welcomeFlow)) ?? parseFlowToken(params.get(QUERY.welcomeAuthLegacy))
  );
}

function readWelcomeFlowFromLegacyHash(): WelcomeAuthMode | null {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash.replace(/^#/, '').toLowerCase();
  if (raw === 'signup' || raw === 'sign-up') return 'signUp';
  if (raw === 'signin' || raw === 'sign-in') return 'signIn';
  return null;
}

/** Resolved from `flow` / legacy `auth` / legacy `#` — null means “use default” (sign in). */
export function readWelcomeAuthMode(): WelcomeAuthMode | null {
  return readWelcomeFlowFromSearch() ?? readWelcomeFlowFromLegacyHash();
}

/** Normalize legacy `auth` → `flow`, drop duplicate keys, then migrate hash. */
export function normalizeWelcomeSearchParams(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const legacy = url.searchParams.get(QUERY.welcomeAuthLegacy)?.toLowerCase();
  const hasFlow = url.searchParams.has(QUERY.welcomeFlow);

  if (legacy && !hasFlow) {
    if (legacy === 'signup' || legacy === 'sign-up') {
      url.searchParams.set(QUERY.welcomeFlow, 'signup');
    }
    url.searchParams.delete(QUERY.welcomeAuthLegacy);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }
}

/** Legacy `#signup` → `?flow=signup`; `#signin` → clean welcome.html */
export function migrateLegacyWelcomeHashToQuery(): void {
  if (typeof window === 'undefined') return;
  const fromHash = readWelcomeFlowFromLegacyHash();
  if (!fromHash) return;
  const url = new URL(window.location.href);
  if (url.searchParams.has(QUERY.welcomeFlow) || url.searchParams.has(QUERY.welcomeAuthLegacy)) {
    url.hash = '';
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    return;
  }
  url.hash = '';
  if (fromHash === 'signUp') {
    url.searchParams.set(QUERY.welcomeFlow, 'signup');
  } else {
    url.searchParams.delete(QUERY.welcomeFlow);
    url.searchParams.delete(QUERY.welcomeAuthLegacy);
  }
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

/** Sign in = bare URL; sign up = `?flow=signup` only (no legacy `auth` writes). */
export function syncWelcomeAuthToUrl(mode: WelcomeAuthMode): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.hash = '';
  if (mode === 'signUp') {
    url.searchParams.set(QUERY.welcomeFlow, 'signup');
    url.searchParams.delete(QUERY.welcomeAuthLegacy);
  } else {
    url.searchParams.delete(QUERY.welcomeFlow);
    url.searchParams.delete(QUERY.welcomeAuthLegacy);
  }
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

export function stripWelcomeAuthFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete(QUERY.welcomeFlow);
  url.searchParams.delete(QUERY.welcomeAuthLegacy);
  url.hash = '';
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}
