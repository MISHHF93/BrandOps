import type { IdentityProviderId, IdentityProviderSettings } from '../../../types/domain';
import {
  getPublisherGitHubClientId,
  getPublisherGoogleClientId,
  getPublisherLinkedInClientId
} from '../../../shared/config/oauthPublisherIds';
import { getPrivacyPolicyHref, getResolvedPrivacyPolicyUrl } from '../../../shared/config/privacyPolicyUrl';
import { IntegrationHubSetupPanel } from '../../../modules/integrationHub/IntegrationHubSetupPanel';
import { GitHubSignInButton } from '../../../shared/ui/oauth/GitHubSignInButton';
import { GoogleSignInButton } from '../../../shared/ui/oauth/GoogleSignInButton';
import { LinkedInSignInButton } from '../../../shared/ui/oauth/LinkedInSignInButton';
import { Plug2 } from 'lucide-react';

interface IntegrationsSectionProps {
  primaryIdentityProvider: IdentityProviderId | null;
  googleSync: IdentityProviderSettings;
  googleClientId: string;
  /** True when build-time or saved client ID exists (enables Connect). */
  googleOAuthReady: boolean;
  googleRedirectUri: string | null;
  githubSync: IdentityProviderSettings;
  githubClientId: string;
  githubOAuthReady: boolean;
  githubRedirectUri: string | null;
  linkedinSync: IdentityProviderSettings;
  linkedinClientId: string;
  linkedinOAuthReady: boolean;
  linkedinRedirectUri: string | null;
  oauthRuntimeReady: boolean;
  oauthLoading: boolean;
  onGoogleClientIdChange: (value: string) => void;
  onSaveGoogleClientId: () => Promise<void>;
  onConnectGoogle: () => Promise<void>;
  onDisconnectGoogle: () => Promise<void>;
  onCopyGoogleRedirect: () => Promise<void>;
  onGitHubClientIdChange: (value: string) => void;
  onSaveGitHubClientId: () => Promise<void>;
  onConnectGitHub: () => Promise<void>;
  onDisconnectGitHub: () => Promise<void>;
  onCopyGitHubRedirect: () => Promise<void>;
  onLinkedInClientIdChange: (value: string) => void;
  onSaveLinkedInClientId: () => Promise<void>;
  onConnectLinkedIn: () => Promise<void>;
  onDisconnectLinkedIn: () => Promise<void>;
  onCopyLinkedInRedirect: () => Promise<void>;
  onPrimaryIdentityChange: (provider: IdentityProviderId | null) => Promise<void>;
}

export function IntegrationsSection({
  primaryIdentityProvider,
  googleSync,
  googleClientId,
  googleOAuthReady,
  googleRedirectUri,
  githubSync,
  githubClientId,
  githubOAuthReady,
  githubRedirectUri,
  linkedinSync,
  linkedinClientId,
  linkedinOAuthReady,
  linkedinRedirectUri,
  oauthRuntimeReady,
  oauthLoading,
  onGoogleClientIdChange,
  onSaveGoogleClientId,
  onConnectGoogle,
  onDisconnectGoogle,
  onCopyGoogleRedirect,
  onGitHubClientIdChange,
  onSaveGitHubClientId,
  onConnectGitHub,
  onDisconnectGitHub,
  onCopyGitHubRedirect,
  onLinkedInClientIdChange,
  onSaveLinkedInClientId,
  onConnectLinkedIn,
  onDisconnectLinkedIn,
  onCopyLinkedInRedirect,
  onPrimaryIdentityChange
}: IntegrationsSectionProps) {
  const connected =
    [googleSync, githubSync, linkedinSync].filter((s) => s.connectionStatus === 'connected').length;
  const privacyUrl = getResolvedPrivacyPolicyUrl();
  const privacyHref = getPrivacyPolicyHref();
  const privacyHosted = privacyHref.startsWith('https://');
  const publisherOAuthAtBuild =
    Boolean(getPublisherGoogleClientId()) ||
    Boolean(getPublisherGitHubClientId()) ||
    Boolean(getPublisherLinkedInClientId());

  return (
    <section id="options-integrations" className="bo-card scroll-mt-4 space-y-4">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Plug2 size={18} strokeWidth={2} className="shrink-0 text-primary/90" aria-hidden />
          Integrations
        </h2>
        <p className="text-xs text-textMuted">
          <strong>Third-party sign-in</strong> (Google, GitHub, LinkedIn): connect/disconnect per provider. The published
          build may include OAuth client IDs via <code className="text-text">VITE_*_CLIENT_ID</code>; the fields below
          are an <strong>optional override</strong> for development.
          {publisherOAuthAtBuild ? (
            <>
              {' '}
              This build has at least one publisher client ID — saved values override per provider when non-empty.
            </>
          ) : null}
        </p>
        <p className="text-xs text-textMuted">
          <strong>Sign out</strong> (Dashboard) clears every IdP session at once — these controls remove one provider
          only. Integration hub sources are below.
        </p>
        <p className="text-xs text-textMuted">
          <a
            className="bo-link"
            href={privacyHref}
            {...(privacyHosted ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
          >
            Privacy policy
          </a>
          {privacyUrl ? ' (hosted)' : ' (bundled)'} — how OAuth and local storage are used.
        </p>
      </header>

      {connected > 1 ? (
        <article className="rounded-xl border border-border bg-bg/40 p-3 text-sm">
          <label className="block space-y-1">
            <span>Primary display profile</span>
            <select
              value={primaryIdentityProvider ?? ''}
              onChange={(event) => {
                const v = event.target.value;
                void onPrimaryIdentityChange(
                  v === 'google' || v === 'github' || v === 'linkedin' ? v : null
                );
              }}
              className="w-full max-w-md rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
            >
              <option value="">Last connected (default)</option>
              {googleSync.connectionStatus === 'connected' ? (
                <option value="google">Google</option>
              ) : null}
              {githubSync.connectionStatus === 'connected' ? (
                <option value="github">GitHub</option>
              ) : null}
              {linkedinSync.connectionStatus === 'connected' ? (
                <option value="linkedin">LinkedIn</option>
              ) : null}
            </select>
          </label>
          <p className="mt-2 text-xs text-textMuted">
            Chooses which connected profile shows as &quot;Signed in as …&quot; on the Dashboard. If unset, the most
            recently connected provider is used.
          </p>
        </article>
      ) : null}

      {!oauthRuntimeReady ? (
        <p className="rounded-xl border border-warning/30 bg-warningSoft/10 p-3 text-xs text-warning">
          OAuth sign-in works only from the installed BrandOps extension runtime.
        </p>
      ) : null}

      <article className="rounded-xl border border-border bg-bg/40 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Google (OpenID)</h3>
            <p className="text-xs text-textMuted">
              Status: {googleSync.connectionStatus}
              {googleSync.lastConnectedAt
                ? ` · Last connected ${new Date(googleSync.lastConnectedAt).toLocaleString()}`
                : ''}
            </p>
            {googleSync.profile?.name || googleSync.profile?.email ? (
              <p className="mt-1 text-xs text-text">
                Signed in as{' '}
                {googleSync.profile?.name
                  ? `${googleSync.profile.name}${
                      googleSync.profile.email ? ` (${googleSync.profile.email})` : ''
                    }`
                  : googleSync.profile?.email}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="bo-link" onClick={() => void onSaveGoogleClientId()}>
              Save client ID
            </button>
            <GoogleSignInButton
              onClick={() => void onConnectGoogle()}
              disabled={!googleOAuthReady || !oauthRuntimeReady}
              loading={oauthLoading}
            />
            <button
              type="button"
              className="bo-link"
              onClick={() => void onDisconnectGoogle()}
              disabled={googleSync.connectionStatus === 'disconnected'}
            >
              Disconnect
            </button>
          </div>
        </div>

        <label className="block space-y-1 text-sm">
          <span>Google OAuth client ID</span>
          <input
            value={googleClientId}
            onChange={(event) => onGoogleClientIdChange(event.target.value)}
            placeholder="Web or Desktop / Chrome extension OAuth client ID"
            className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
          />
        </label>

        <div className="flex flex-wrap items-end gap-2">
          <p className="min-w-0 flex-1 text-xs text-textMuted break-all">
            Redirect URI: {googleRedirectUri ?? 'Install the extension to view redirect URI.'}
          </p>
          <button
            type="button"
            className="bo-link shrink-0"
            disabled={!googleRedirectUri}
            onClick={() => void onCopyGoogleRedirect()}
          >
            Copy redirect URI
          </button>
        </div>
        <p className="text-xs text-textMuted">
          Register the redirect URL in Google Cloud Console (OAuth client). Scopes: openid, email, profile.
        </p>
        {googleSync.lastError ? <p className="text-xs text-danger">Last Google error: {googleSync.lastError}</p> : null}
      </article>

      <article className="rounded-xl border border-border bg-bg/40 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">GitHub OAuth</h3>
            <p className="text-xs text-textMuted">
              Status: {githubSync.connectionStatus}
              {githubSync.lastConnectedAt
                ? ` · Last connected ${new Date(githubSync.lastConnectedAt).toLocaleString()}`
                : ''}
            </p>
            {githubSync.profile?.name || githubSync.profile?.email ? (
              <p className="mt-1 text-xs text-text">
                Signed in as{' '}
                {githubSync.profile?.name
                  ? `${githubSync.profile.name}${
                      githubSync.profile.email ? ` (${githubSync.profile.email})` : ''
                    }`
                  : githubSync.profile?.email}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="bo-link" onClick={() => void onSaveGitHubClientId()}>
              Save client ID
            </button>
            <GitHubSignInButton
              onClick={() => void onConnectGitHub()}
              disabled={!githubOAuthReady || !oauthRuntimeReady}
              loading={oauthLoading}
            />
            <button
              type="button"
              className="bo-link"
              onClick={() => void onDisconnectGitHub()}
              disabled={githubSync.connectionStatus === 'disconnected'}
            >
              Disconnect
            </button>
          </div>
        </div>

        <label className="block space-y-1 text-sm">
          <span>GitHub OAuth App client ID</span>
          <input
            value={githubClientId}
            onChange={(event) => onGitHubClientIdChange(event.target.value)}
            placeholder="OAuth App Client ID (PKCE — no secret in extension)"
            className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
          />
        </label>

        <div className="flex flex-wrap items-end gap-2">
          <p className="min-w-0 flex-1 text-xs text-textMuted break-all">
            Callback URL: {githubRedirectUri ?? 'Install the extension to view redirect URI.'}
          </p>
          <button
            type="button"
            className="bo-link shrink-0"
            disabled={!githubRedirectUri}
            onClick={() => void onCopyGitHubRedirect()}
          >
            Copy callback URL
          </button>
        </div>
        <p className="text-xs text-textMuted">
          Enable PKCE in the GitHub OAuth App settings. Scopes: read:user, user:email.
        </p>
        {githubSync.lastError ? <p className="text-xs text-danger">Last GitHub error: {githubSync.lastError}</p> : null}
      </article>

      <article className="rounded-xl border border-border bg-bg/40 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">LinkedIn identity (OpenID)</h3>
            <p className="text-xs text-textMuted">
              Status: {linkedinSync.connectionStatus}
              {linkedinSync.lastConnectedAt
                ? ` · Last connected ${new Date(linkedinSync.lastConnectedAt).toLocaleString()}`
                : ''}
            </p>
            {linkedinSync.profile?.name || linkedinSync.profile?.email ? (
              <p className="mt-1 text-xs text-text">
                Signed in as{' '}
                {linkedinSync.profile?.name
                  ? `${linkedinSync.profile.name}${
                      linkedinSync.profile.email ? ` (${linkedinSync.profile.email})` : ''
                    }`
                  : linkedinSync.profile?.email}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="bo-link" onClick={() => void onSaveLinkedInClientId()}>
              Save client ID
            </button>
            <LinkedInSignInButton
              onClick={() => void onConnectLinkedIn()}
              disabled={!linkedinOAuthReady || !oauthRuntimeReady}
              loading={oauthLoading}
            />
            <button
              type="button"
              className="bo-link"
              onClick={() => void onDisconnectLinkedIn()}
              disabled={linkedinSync.connectionStatus === 'disconnected'}
            >
              Disconnect
            </button>
          </div>
        </div>

        <label className="block space-y-1 text-sm">
          <span>LinkedIn OAuth client ID</span>
          <input
            value={linkedinClientId}
            onChange={(event) => onLinkedInClientIdChange(event.target.value)}
            placeholder="Paste your LinkedIn app Client ID"
            className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
          />
        </label>

        <div className="flex flex-wrap items-end gap-2">
          <p className="min-w-0 flex-1 text-xs text-textMuted break-all">
            Redirect URI: {linkedinRedirectUri ?? 'Install the extension to view redirect URI.'}
          </p>
          <button
            type="button"
            className="bo-link shrink-0"
            disabled={!linkedinRedirectUri}
            onClick={() => void onCopyLinkedInRedirect()}
          >
            Copy redirect URI
          </button>
        </div>
        <p className="text-xs text-textMuted">
          Register this exact redirect URL under Authorized redirect URLs for your LinkedIn app. Public-client PKCE is
          required — see{' '}
          <a
            className="underline text-text"
            href="https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow-native"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn native OAuth (PKCE)
          </a>
          .
        </p>

        {linkedinSync.lastError ? (
          <p className="text-xs text-danger">Last LinkedIn error: {linkedinSync.lastError}</p>
        ) : null}
      </article>

      <IntegrationHubSetupPanel />
    </section>
  );
}
