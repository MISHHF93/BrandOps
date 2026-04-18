import { setOAuthClientIdRuntimeOverrides } from './oauthPublisherIds';

let cached: Promise<void> | null = null;

/** Merge optional `public/brandops-oauth-public.json` (no Vite rebuild). Safe to call multiple times. */
export function loadOAuthPublicOverrides(): Promise<void> {
  if (cached) return cached;
  cached = (async () => {
    try {
      const response = await fetch('/brandops-oauth-public.json', { cache: 'no-store' });
      if (!response.ok) return;
      const raw = (await response.json()) as Record<string, unknown>;
      const pick = (key: string) => {
        const v = raw[key];
        return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
      };
      setOAuthClientIdRuntimeOverrides({
        google: pick('googleClientId'),
        github: pick('githubClientId'),
        linkedin: pick('linkedinClientId')
      });
    } catch {
      // Missing file or invalid JSON — build-time VITE_* / Settings still apply.
    }
  })();
  return cached;
}
