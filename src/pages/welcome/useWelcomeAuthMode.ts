import { useEffect, useLayoutEffect, useState } from 'react';
import type { WelcomeAuthMode } from './welcomeUtils';
import {
  migrateLegacyWelcomeHashToQuery,
  normalizeWelcomeSearchParams,
  readWelcomeAuthMode,
  stripWelcomeAuthFromUrl,
  syncWelcomeAuthToUrl
} from './welcomeUtils';

/**
 * Sign-in: `welcome.html`. Sign-up: `welcome.html?flow=signup`. Legacy `?auth=` is normalized first.
 */
export function useWelcomeAuthMode(signedIn: boolean | undefined) {
  const [authMode, setAuthMode] = useState<WelcomeAuthMode>(() => readWelcomeAuthMode() ?? 'signIn');

  useLayoutEffect(() => {
    normalizeWelcomeSearchParams();
    migrateLegacyWelcomeHashToQuery();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (signedIn === undefined) return;
    if (signedIn) {
      stripWelcomeAuthFromUrl();
      return;
    }
    syncWelcomeAuthToUrl(authMode);
  }, [authMode, signedIn]);

  useEffect(() => {
    const syncFromUrl = () => {
      const fromUrl = readWelcomeAuthMode();
      if (fromUrl) setAuthMode(fromUrl);
    };
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  return { authMode, setAuthMode };
}
