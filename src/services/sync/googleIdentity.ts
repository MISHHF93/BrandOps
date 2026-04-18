import type { BrandOpsData, LinkedInIdentityProfile, LinkedInOAuthState } from '../../types/domain';
import {
  createCodeChallenge,
  getOAuthRedirectUrl,
  isExtensionIdentityAvailable,
  randomString
} from './oauthPkce';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo';

const SCOPES = ['openid', 'email', 'profile'];

const encodeBody = (payload: Record<string, string>) => {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => body.set(key, value));
  return body.toString();
};

const expiresAtFromSeconds = (expiresIn: number) =>
  new Date(Date.now() + Math.max(expiresIn - 60, 0) * 1000).toISOString();

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

const normalizeAuth = (
  token: GoogleTokenResponse,
  previousAuth: LinkedInOAuthState = { scope: [] }
): LinkedInOAuthState => ({
  accessToken: token.access_token,
  refreshToken: token.refresh_token ?? previousAuth.refreshToken,
  expiresAt: expiresAtFromSeconds(token.expires_in),
  scope: token.scope?.split(/[ ,]+/).filter(Boolean) ?? previousAuth.scope ?? [],
  tokenType: token.token_type ?? previousAuth.tokenType ?? 'Bearer'
});

const fetchGoogleUserinfo = async (accessToken: string): Promise<LinkedInIdentityProfile | undefined> => {
  const response = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const text = await response.text();
  if (!response.ok) return undefined;
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    return undefined;
  }
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const profile: LinkedInIdentityProfile = {};
  if (typeof o.sub === 'string' && o.sub.length > 0) profile.sub = o.sub;
  if (typeof o.name === 'string' && o.name.length > 0) profile.name = o.name;
  if (typeof o.email === 'string' && o.email.length > 0) profile.email = o.email;
  if (typeof o.picture === 'string' && o.picture.length > 0) profile.picture = o.picture;
  return Object.keys(profile).length > 0 ? profile : undefined;
};

const googleAuthError = (message: string) =>
  new Error(
    `${message} Google sign-in needs the BrandOps extension and a Google OAuth client ID (Web application or Desktop) with this redirect URL registered.`
  );

export const getGoogleRedirectUri = (): string | null => getOAuthRedirectUrl('google-brandops');

export const googleIdentitySync = {
  disconnect(data: BrandOpsData): BrandOpsData {
    const g = data.settings.syncHub.google;
    const hasClient = Boolean(g.clientId?.trim());
    return {
      ...data,
      settings: {
        ...data.settings,
        syncHub: {
          ...data.settings.syncHub,
          google: {
            ...g,
            connectionStatus: hasClient ? 'configured' : 'disconnected',
            lastError: undefined,
            lastConnectedAt: undefined,
            auth: { scope: [] },
            profile: undefined
          }
        }
      }
    };
  },

  async connect(data: BrandOpsData): Promise<BrandOpsData> {
    if (!isExtensionIdentityAvailable()) {
      throw googleAuthError('Open this screen inside the installed extension to connect Google.');
    }

    const clientId = data.settings.syncHub.google.clientId.trim();
    if (!clientId) {
      throw googleAuthError(
        'Add a Google OAuth client ID (Settings) or set VITE_GOOGLE_CLIENT_ID at build before connecting.'
      );
    }

    const redirectUri = chrome.identity.getRedirectURL('google-brandops');
    const state = randomString(24);
    const codeVerifier = randomString(96);
    const codeChallenge = await createCodeChallenge(codeVerifier);

    const authUrl = new URL(GOOGLE_AUTH);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', SCOPES.join(' '));
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    const resultUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true
    });

    if (!resultUrl) {
      throw new Error('Google authorization was cancelled before completion.');
    }

    const result = new URL(resultUrl);
    const returnedState = result.searchParams.get('state');
    const returnedError = result.searchParams.get('error');
    const code = result.searchParams.get('code');

    if (returnedError) {
      const desc = result.searchParams.get('error_description');
      throw new Error(`Google authorization failed: ${returnedError}${desc ? ` — ${desc}` : ''}`);
    }

    if (!code || returnedState !== state) {
      throw new Error('Google authorization response could not be verified.');
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encodeBody({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier
      })
    });

    const tokenJson = (await tokenResponse.json()) as GoogleTokenResponse & {
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok) {
      throw new Error(
        tokenJson.error_description ?? tokenJson.error ?? 'Google token exchange failed.'
      );
    }

    const auth = normalizeAuth(tokenJson);
    const access = auth.accessToken as string;
    const profile = await fetchGoogleUserinfo(access);
    const now = new Date().toISOString();

    return {
      ...data,
      settings: {
        ...data.settings,
        primaryIdentityProvider: 'google',
        syncHub: {
          ...data.settings.syncHub,
          google: {
            ...data.settings.syncHub.google,
            clientId,
            connectionStatus: 'connected',
            lastError: undefined,
            lastConnectedAt: now,
            auth,
            profile: profile ?? data.settings.syncHub.google.profile
          }
        }
      }
    };
  }
};
