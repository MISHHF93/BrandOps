import type {
  BrandOpsData,
  LinkedInIdentityProfile,
  LinkedInOAuthState
} from '../../types/domain';
import {
  createCodeChallenge,
  getOAuthRedirectUrl,
  getWebOAuthRedirectUrl,
  isExtensionIdentityAvailable,
  launchOAuthWebAuthFlow,
  randomString
} from './oauthPkce';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

const LINKEDIN_SCOPES = ['openid', 'profile', 'email'];

const LINKEDIN_PKCE_DOC =
  'https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow-native';

const expiresAtFromSeconds = (expiresIn: number) =>
  new Date(Date.now() + Math.max(expiresIn - 60, 0) * 1000).toISOString();

const encodeBody = (payload: Record<string, string>) => {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => body.set(key, value));
  return body.toString();
};

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

const requestLinkedInToken = async (
  payload: Record<string, string>
): Promise<LinkedInTokenResponse> => {
  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: encodeBody(payload)
  });

  const data = (await response.json()) as LinkedInTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    const hint =
      data.error === 'invalid_client' || data.error_description?.toLowerCase().includes('secret')
        ? ` If your app requires a client secret, enable the public-client PKCE flow for this LinkedIn app (see ${LINKEDIN_PKCE_DOC}).`
        : '';
    throw new Error(
      (data.error_description ?? data.error ?? 'LinkedIn token exchange failed.') + hint
    );
  }

  return data;
};

const normalizeLinkedInAuth = (
  token: LinkedInTokenResponse,
  previousAuth: LinkedInOAuthState = { scope: [] }
): LinkedInOAuthState => ({
  accessToken: token.access_token,
  refreshToken: token.refresh_token ?? previousAuth.refreshToken,
  expiresAt: expiresAtFromSeconds(token.expires_in),
  scope: token.scope?.split(/[ ,]+/).filter(Boolean) ?? previousAuth.scope ?? [],
  tokenType: token.token_type ?? previousAuth.tokenType ?? 'Bearer'
});

const fetchLinkedInUserinfo = async (
  accessToken: string
): Promise<LinkedInIdentityProfile | undefined> => {
  const response = await fetch(LINKEDIN_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const text = await response.text();
  if (!response.ok) {
    return undefined;
  }

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

const linkedinAuthError = (message: string) =>
  new Error(
    `${message} Add a LinkedIn app client ID and register the redirect URL: extension redirect from Settings, or https://YOUR_ORIGIN/oauth/linkedin-brandops.html for browser sign-in.`
  );

export const getLinkedInRedirectUri = (): string | null => getOAuthRedirectUrl('linkedin-brandops');

export const isLinkedInIdentityRuntimeAvailable = () => isExtensionIdentityAvailable();

export const linkedinIdentitySync = {
  disconnect(data: BrandOpsData): BrandOpsData {
    const li = data.settings.syncHub.linkedin;
    const hasClient = Boolean(li.clientId?.trim());
    return {
      ...data,
      settings: {
        ...data.settings,
        syncHub: {
          ...data.settings.syncHub,
          linkedin: {
            ...li,
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
    const clientId = data.settings.syncHub.linkedin.clientId.trim();
    if (!clientId) {
      throw linkedinAuthError(
        'Add a LinkedIn OAuth client ID (Settings) or set VITE_LINKEDIN_CLIENT_ID at build before connecting.'
      );
    }

    const redirectUri = isExtensionIdentityAvailable()
      ? chrome.identity.getRedirectURL('linkedin-brandops')
      : getWebOAuthRedirectUrl('linkedin-brandops');
    if (!redirectUri) {
      throw linkedinAuthError('OAuth redirect could not be resolved for this environment.');
    }
    const state = randomString(24);
    const codeVerifier = randomString(96);
    const codeChallenge = await createCodeChallenge(codeVerifier);

    const authUrl = new URL(LINKEDIN_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', LINKEDIN_SCOPES.join(' '));
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    const resultUrl = await launchOAuthWebAuthFlow(authUrl.toString(), redirectUri);

    if (!resultUrl) {
      throw new Error('LinkedIn authorization was cancelled before completion.');
    }

    const result = new URL(resultUrl);
    const returnedState = result.searchParams.get('state');
    const returnedError = result.searchParams.get('error');
    const code = result.searchParams.get('code');

    if (returnedError) {
      const desc = result.searchParams.get('error_description');
      throw new Error(
        `LinkedIn authorization failed: ${returnedError}${desc ? ` — ${desc}` : ''}`
      );
    }

    if (!code || returnedState !== state) {
      throw new Error('LinkedIn authorization response could not be verified.');
    }

    const token = await requestLinkedInToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier
    });

    const auth = normalizeLinkedInAuth(token);
    const access = auth.accessToken as string;
    const profile = await fetchLinkedInUserinfo(access);
    const now = new Date().toISOString();

    return {
      ...data,
      settings: {
        ...data.settings,
        primaryIdentityProvider: 'linkedin',
        syncHub: {
          ...data.settings.syncHub,
          linkedin: {
            ...data.settings.syncHub.linkedin,
            clientId,
            connectionStatus: 'connected',
            lastError: undefined,
            lastConnectedAt: now,
            auth,
            profile: profile ?? data.settings.syncHub.linkedin.profile
          }
        }
      }
    };
  }
};
