import { useEffect, useState } from 'react';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';
import { GoogleSignInButton } from '../../shared/ui/oauth/GoogleSignInButton';
import { GitHubSignInButton } from '../../shared/ui/oauth/GitHubSignInButton';
import { LinkedInSignInButton } from '../../shared/ui/oauth/LinkedInSignInButton';
import { getPrimaryIdentityLabel } from '../../shared/identity/primaryIdentityLabel';
import { canAccessApp, isDemoBypassBuild } from '../../shared/identity/sessionAccess';
import {
  getEffectiveGitHubClientId,
  getEffectiveGoogleClientId,
  getEffectiveLinkedInClientId
} from '../../shared/config/oauthPublisherIds';
import { InlineAlert } from '../../shared/ui/components';
import type { OAuthButtonVariant } from '../../shared/ui/oauth/oauthButtonStyles';
import { oauthWelcomeMarketingOutlineClass } from '../../shared/ui/oauth/oauthButtonStyles';
import { WelcomeAuthModeTabs } from './WelcomeAuthModeTabs';
import { WelcomeHero } from './WelcomeHero';
import { WelcomeSignInModeFooter } from './WelcomeSignInModeFooter';
import { WelcomeSignedInSection } from './WelcomeSignedInSection';
import { WelcomeTermsConsent } from './WelcomeTermsConsent';
import { useWelcomeAuthMode } from './useWelcomeAuthMode';
import { hasExtensionIdentity, WELCOME_LEGAL_STORAGE_KEY } from './welcomeUtils';

const oauthMarketingClass = `w-full ${oauthWelcomeMarketingOutlineClass} !text-text`;

/** Setup hints (missing client IDs) vs real failures — avoids “Something went wrong” for configuration. */
type WelcomeAlert =
  | { kind: 'setup'; message: string }
  | { kind: 'error'; title: string; message: string };

export interface WelcomeAuthPanelProps {
  onContinue: () => void;
  canContinue: boolean;
  optionsHref: string;
}

export function WelcomeAuthPanel({ onContinue, canContinue, optionsHref }: WelcomeAuthPanelProps) {
  const {
    data,
    loading,
    connectGoogleIdentity,
    connectGitHubIdentity,
    connectLinkedInIdentity,
    startDemoSession
  } = useBrandOpsStore();
  const [alert, setAlert] = useState<WelcomeAlert | null>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const isDev = import.meta.env.DEV;
  const demoBypass = isDemoBypassBuild();
  /** `undefined` while store is loading — URL sync waits until session is known. */
  const sessionSignedIn = data == null ? undefined : canAccessApp(data);
  const { authMode, setAuthMode } = useWelcomeAuthMode(sessionSignedIn);
  const buttonVariant: OAuthButtonVariant = authMode === 'signUp' ? 'signUp' : 'signIn';

  useEffect(() => {
    try {
      if (sessionStorage.getItem(WELCOME_LEGAL_STORAGE_KEY) === '1') {
        setLegalAccepted(true);
      }
    } catch {
      // ignore
    }
  }, []);

  if (!data) return null;

  const primaryLabel = getPrimaryIdentityLabel(data);
  const runtimeReady = hasExtensionIdentity();
  /** Built with VITE_DEMO_BYPASS — optional browser demo when OAuth env IDs are absent. */
  const webPreviewDemo = demoBypass;
  const googleOAuthId = getEffectiveGoogleClientId(data).trim();
  const githubOAuthId = getEffectiveGitHubClientId(data).trim();
  const linkedinOAuthId = getEffectiveLinkedInClientId(data).trim();
  const hasWebOAuthClients = Boolean(googleOAuthId || githubOAuthId || linkedinOAuthId);
  /** Extension chrome.identity, or browser + at least one VITE_/Settings client ID (popup OAuth). */
  const oauthAvailable = runtimeReady || hasWebOAuthClients;
  const showInstallExtensionWarning = !runtimeReady && !webPreviewDemo && !hasWebOAuthClients;
  const showWebPreviewInfo = !runtimeReady && webPreviewDemo && !hasWebOAuthClients;
  const showDemoEscapeHatch = isDev || demoBypass;

  const persistLegal = (next: boolean) => {
    setLegalAccepted(next);
    try {
      if (next) sessionStorage.setItem(WELCOME_LEGAL_STORAGE_KEY, '1');
      else sessionStorage.removeItem(WELCOME_LEGAL_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const run = async (fn: () => Promise<void>) => {
    setAlert(null);
    try {
      await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed.';
      setAlert({ kind: 'error', title: 'Cannot complete sign-in', message });
    }
  };

  const startProviderConnect = async (
    connect: () => Promise<void>,
    providerConfigured: boolean,
    missingProviderMessage: string
  ) => {
    if (!legalAccepted) {
      setAlert({
        kind: 'error',
        title: 'Terms required',
        message: 'Please accept the Terms of Service and Privacy Policy first.'
      });
      return;
    }
    if (!providerConfigured) {
      setAlert({ kind: 'setup', message: missingProviderMessage });
      return;
    }
    await run(connect);
  };

  return (
    <div className="w-full rounded-2xl border border-border bg-bgElevated px-7 py-8 shadow-panel sm:px-8">
      <WelcomeHero signedIn={Boolean(sessionSignedIn)} authMode={authMode} />

      {!sessionSignedIn ? (
        <>
          <WelcomeAuthModeTabs authMode={authMode} onModeChange={setAuthMode} />

          {showWebPreviewInfo ? (
            <div className="mt-6">
              <InlineAlert
                tone="info"
                title="Preview in your browser"
                message="No OAuth client IDs detected yet. Use **Enter demo mode** below, or set VITE_* env vars (redeploy), or edit **public/brandops-oauth-public.json** on the server, then reload."
                className="rounded-lg border-border bg-surface/35 text-text"
              />
            </div>
          ) : null}

          {showInstallExtensionWarning ? (
            <div className="mt-6">
              <InlineAlert
                tone="warning"
                title="Install the extension"
                message="Sign-in requires the BrandOps extension (chrome.identity). Open this page from your installed extension."
                className="rounded-lg border-border bg-surface/35 text-text"
              />
            </div>
          ) : null}

          {alert ? (
            <div className="mt-6">
              <InlineAlert
                tone={alert.kind === 'setup' ? 'warning' : 'danger'}
                title={alert.kind === 'setup' ? 'OAuth not configured for web sign-in' : alert.title}
                message={alert.message}
                className={
                  alert.kind === 'setup'
                    ? 'rounded-lg border-border bg-surface/35 text-text'
                    : 'rounded-lg border-danger/40 bg-dangerSoft/15 text-text'
                }
              />
            </div>
          ) : null}

          {showWebPreviewInfo ? (
            <button
              type="button"
              className="mt-5 w-full rounded-xl border border-primary/35 bg-primary/10 px-4 py-3 text-sm font-semibold text-text transition hover:bg-primary/16"
              disabled={loading}
              onClick={async () => {
                setAlert(null);
                await startDemoSession();
                await onContinue();
              }}
            >
              Enter demo mode (browser preview)
            </button>
          ) : null}

          <WelcomeTermsConsent accepted={legalAccepted} onAcceptedChange={persistLegal} />

          <div className="mt-6 space-y-2.5">
            <GoogleSignInButton
              onClick={() =>
                void startProviderConnect(
                  () => connectGoogleIdentity(),
                  runtimeReady || Boolean(googleOAuthId),
                  webPreviewDemo
                    ? 'No Google client ID for this site. Set VITE_GOOGLE_CLIENT_ID (redeploy), or put it in public/brandops-oauth-public.json as googleClientId, or use Enter demo mode / the extension.'
                    : 'No Google client ID for this site. Set VITE_GOOGLE_CLIENT_ID (redeploy), add googleClientId in public/brandops-oauth-public.json, or sign in from the installed Chrome extension.'
                )
              }
              disabled={loading}
              loading={loading}
              variant={buttonVariant}
              className={oauthMarketingClass}
            />
            <GitHubSignInButton
              onClick={() =>
                void startProviderConnect(
                  () => connectGitHubIdentity(),
                  runtimeReady || Boolean(githubOAuthId),
                  webPreviewDemo
                    ? 'No GitHub client ID for this site. Set VITE_GITHUB_CLIENT_ID (redeploy), or githubClientId in public/brandops-oauth-public.json, or use Enter demo mode / the extension.'
                    : 'No GitHub client ID for this site. Set VITE_GITHUB_CLIENT_ID (redeploy), add githubClientId in public/brandops-oauth-public.json, or sign in from the installed Chrome extension.'
                )
              }
              disabled={loading}
              loading={loading}
              variant={buttonVariant}
              className={oauthMarketingClass}
            />
            <LinkedInSignInButton
              onClick={() =>
                void startProviderConnect(
                  () => connectLinkedInIdentity(),
                  runtimeReady || Boolean(linkedinOAuthId),
                  webPreviewDemo
                    ? 'No LinkedIn client ID for this site. Set VITE_LINKEDIN_CLIENT_ID (redeploy), or linkedinClientId in public/brandops-oauth-public.json, or use Enter demo mode / the extension.'
                    : 'No LinkedIn client ID for this site. Set VITE_LINKEDIN_CLIENT_ID (redeploy), add linkedinClientId in public/brandops-oauth-public.json, or sign in from the installed Chrome extension.'
                )
              }
              disabled={loading}
              loading={loading}
              variant={buttonVariant}
              className={oauthMarketingClass}
            />
          </div>

          {oauthAvailable || !showWebPreviewInfo ? (
            showDemoEscapeHatch ? (
              <button
                type="button"
                className="mt-4 w-full rounded-lg border border-border bg-surface/60 px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surfaceHover/70"
                disabled={loading}
                onClick={async () => {
                  setAlert(null);
                  await startDemoSession();
                  await onContinue();
                }}
              >
                {demoBypass && !isDev ? 'Enter demo mode (preview)' : 'Enter demo mode (dev only)'}
              </button>
            ) : null
          ) : null}

          {showInstallExtensionWarning ? (
            <p className="mt-2 text-center text-xs text-textSoft">
              Open this page from the extension to complete sign-in.
            </p>
          ) : null}
          {showWebPreviewInfo ? (
            <p className="mt-2 text-center text-xs text-textMuted">
              Use VITE_* env vars, or edit brandops-oauth-public.json on the host, then reload. Register redirect URLs in each provider console (see .env.example).
            </p>
          ) : !runtimeReady && hasWebOAuthClients ? (
            <p className="mt-2 text-center text-xs text-textMuted">
              Sign-in opens in a popup; allow popups if your browser blocks them.
            </p>
          ) : null}

          <WelcomeSignInModeFooter authMode={authMode} onModeChange={setAuthMode} />
        </>
      ) : (
        <WelcomeSignedInSection
          primaryLabel={primaryLabel}
          canContinue={canContinue}
          optionsHref={optionsHref}
          onContinue={onContinue}
        />
      )}
    </div>
  );
}
