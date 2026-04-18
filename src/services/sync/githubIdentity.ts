import type { BrandOpsData, LinkedInIdentityProfile, LinkedInOAuthState } from '../../types/domain';
import {
  createCodeChallenge,
  getOAuthRedirectUrl,
  getWebOAuthRedirectUrl,
  isExtensionIdentityAvailable,
  launchOAuthWebAuthFlow,
  randomString
} from './oauthPkce';

const GITHUB_AUTH = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';

const SCOPES = ['read:user', 'user:email'];

const encodeBody = (payload: Record<string, string>) => {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => body.set(key, value));
  return body.toString();
};

const expiresAtFromSeconds = (expiresIn: number) =>
  new Date(Date.now() + Math.max(expiresIn - 60, 0) * 1000).toISOString();

interface GithubTokenResponse {
  access_token: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
}

const normalizeAuth = (
  token: GithubTokenResponse,
  previousAuth: LinkedInOAuthState = { scope: [] }
): LinkedInOAuthState => ({
  accessToken: token.access_token,
  refreshToken: previousAuth.refreshToken,
  expiresAt:
    typeof token.expires_in === 'number'
      ? expiresAtFromSeconds(token.expires_in)
      : previousAuth.expiresAt,
  scope: token.scope?.split(/[ ,]+/).filter(Boolean) ?? previousAuth.scope ?? [],
  tokenType: token.token_type ?? previousAuth.tokenType ?? 'Bearer'
});

const fetchGithubEmails = async (accessToken: string): Promise<string | undefined> => {
  const response = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json'
    }
  });
  if (!response.ok) return undefined;
  const data = (await response.json()) as Array<{ email: string; primary?: boolean; verified?: boolean }>;
  if (!Array.isArray(data)) return undefined;
  const primary = data.find((e) => e.primary && e.verified);
  const first = data.find((e) => e.verified);
  return primary?.email ?? first?.email ?? data[0]?.email;
};

const fetchGithubProfile = async (accessToken: string): Promise<LinkedInIdentityProfile | undefined> => {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json'
    }
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
  if (typeof o.id === 'number') profile.sub = String(o.id);
  if (typeof o.login === 'string' && o.login.length > 0) {
    profile.name = typeof o.name === 'string' && o.name.length > 0 ? o.name : o.login;
  } else if (typeof o.name === 'string') {
    profile.name = o.name;
  }
  if (typeof o.avatar_url === 'string' && o.avatar_url.length > 0) profile.picture = o.avatar_url;
  if (typeof o.email === 'string' && o.email.length > 0) {
    profile.email = o.email;
  } else {
    const email = await fetchGithubEmails(accessToken);
    if (email) profile.email = email;
  }
  return Object.keys(profile).length > 0 ? profile : undefined;
};

const githubAuthError = (message: string) =>
  new Error(
    `${message} Add a GitHub OAuth App client ID and register the redirect URL: extension redirect from Settings, or https://YOUR_ORIGIN/oauth/github-brandops.html for browser sign-in (PKCE; no client secret required).`
  );

export const getGithubRedirectUri = (): string | null => getOAuthRedirectUrl('github-brandops');

export const githubIdentitySync = {
  disconnect(data: BrandOpsData): BrandOpsData {
    const g = data.settings.syncHub.github;
    const hasClient = Boolean(g.clientId?.trim());
    return {
      ...data,
      settings: {
        ...data.settings,
        syncHub: {
          ...data.settings.syncHub,
          github: {
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
    const clientId = data.settings.syncHub.github.clientId.trim();
    if (!clientId) {
      throw githubAuthError(
        'Add a GitHub OAuth App client ID (Settings) or set VITE_GITHUB_CLIENT_ID at build before connecting.'
      );
    }

    const redirectUri = isExtensionIdentityAvailable()
      ? chrome.identity.getRedirectURL('github-brandops')
      : getWebOAuthRedirectUrl('github-brandops');
    if (!redirectUri) {
      throw githubAuthError('OAuth redirect could not be resolved for this environment.');
    }
    const state = randomString(24);
    const codeVerifier = randomString(96);
    const codeChallenge = await createCodeChallenge(codeVerifier);

    const authUrl = new URL(GITHUB_AUTH);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', SCOPES.join(' '));
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    const resultUrl = await launchOAuthWebAuthFlow(authUrl.toString(), redirectUri);

    if (!resultUrl) {
      throw new Error('GitHub authorization was cancelled before completion.');
    }

    const result = new URL(resultUrl);
    const returnedState = result.searchParams.get('state');
    const returnedError = result.searchParams.get('error');
    const code = result.searchParams.get('code');

    if (returnedError) {
      const desc = result.searchParams.get('error_description');
      throw new Error(`GitHub authorization failed: ${returnedError}${desc ? ` — ${desc}` : ''}`);
    }

    if (!code || returnedState !== state) {
      throw new Error('GitHub authorization response could not be verified.');
    }

    const tokenResponse = await fetch(GITHUB_TOKEN, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: encodeBody({
        client_id: clientId,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier
      })
    });

    const tokenJson = (await tokenResponse.json()) as GithubTokenResponse & {
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || tokenJson.error) {
      throw new Error(
        tokenJson.error_description ?? tokenJson.error ?? 'GitHub token exchange failed.'
      );
    }

    const auth = normalizeAuth(tokenJson);
    const access = auth.accessToken as string;
    const profile = await fetchGithubProfile(access);
    const now = new Date().toISOString();

    return {
      ...data,
      settings: {
        ...data.settings,
        primaryIdentityProvider: 'github',
        syncHub: {
          ...data.settings.syncHub,
          github: {
            ...data.settings.syncHub.github,
            clientId,
            connectionStatus: 'connected',
            lastError: undefined,
            lastConnectedAt: now,
            auth,
            profile: profile ?? data.settings.syncHub.github.profile
          }
        }
      }
    };
  }
};
