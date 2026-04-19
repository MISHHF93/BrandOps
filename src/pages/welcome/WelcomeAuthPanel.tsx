import { useCallback, useEffect, useState } from 'react';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';
import { GoogleSignInButton } from '../../shared/ui/oauth/GoogleSignInButton';
import { GitHubSignInButton } from '../../shared/ui/oauth/GitHubSignInButton';
import { LinkedInSignInButton } from '../../shared/ui/oauth/LinkedInSignInButton';
import { getPrimaryIdentityLabel } from '../../shared/identity/primaryIdentityLabel';
import { canAccessApp } from '../../shared/identity/sessionAccess';
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
import { WelcomeVercelPreviewAuth } from './WelcomeVercelPreviewAuth';
import { canUseVercelPreviewSignIn, isPreviewDeploymentSignInEnabled } from '../../shared/config/previewDeployment';

const oauthMarketingClass = `w-full ${oauthWelcomeMarketingOutlineClass} !text-text`;

/** Setup hints (missing client IDs) vs real failures — avoids “Something went wrong” for configuration. */
type WelcomeAlert =
  | { kind: 'setup'; message: string }
  | { kind: 'error'; title: string; message: string };

const missingGoogleMsg =
  'No Google client ID for this site. Set VITE_GOOGLE_CLIENT_ID (redeploy), add googleClientId in public/brandops-oauth-public.json, or sign in from the installed Chrome extension.';
const missingGitHubMsg =
  'No GitHub client ID for this site. Set VITE_GITHUB_CLIENT_ID (redeploy), add githubClientId in public/brandops-oauth-public.json, or sign in from the installed Chrome extension.';
const missingLinkedInMsg =
  'No LinkedIn client ID for this site. Set VITE_LINKEDIN_CLIENT_ID (redeploy), add linkedinClientId in public/brandops-oauth-public.json, or sign in from the installed Chrome extension.';

export interface WelcomeAuthPanelProps {
  onContinue: () => void;
  canContinue: boolean;
  optionsHref: string;
}

export function WelcomeAuthPanel({ onContinue, canContinue, optionsHref }: WelcomeAuthPanelProps) {
  const { data, loading, connectGoogleIdentity, connectGitHubIdentity, connectLinkedInIdentity } =
    useBrandOpsStore();
  const persistLegalAccepted = useCallback(() => {
    try {
      sessionStorage.setItem(WELCOME_LEGAL_STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setLegalAccepted(true);
  }, []);
  const [alert, setAlert] = useState<WelcomeAlert | null>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
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
  const googleOAuthId = getEffectiveGoogleClientId(data).trim();
  const githubOAuthId = getEffectiveGitHubClientId(data).trim();
  const linkedinOAuthId = getEffectiveLinkedInClientId(data).trim();
  const hasWebOAuthClients = Boolean(googleOAuthId || githubOAuthId || linkedinOAuthId);
  const previewPathAvailable =
    isPreviewDeploymentSignInEnabled() && canUseVercelPreviewSignIn();
  const showInstallExtensionWarning = !runtimeReady && !hasWebOAuthClients && !previewPathAvailable;

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
          <WelcomeVercelPreviewAuth storageReady onPreviewSucceeded={persistLegalAccepted} />

          <WelcomeAuthModeTabs authMode={authMode} onModeChange={setAuthMode} />

          {showInstallExtensionWarning ? (
            <div className="mt-6">
              <InlineAlert
                tone="warning"
                title="Install the extension or configure OAuth"
                message="Sign-in requires the BrandOps extension (chrome.identity) or web OAuth client IDs (VITE_* / public/brandops-oauth-public.json). Open this page from your installed extension when possible."
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

          <WelcomeTermsConsent accepted={legalAccepted} onAcceptedChange={persistLegal} />

          <div className="mt-6 space-y-2.5">
            <GoogleSignInButton
              onClick={() =>
                void startProviderConnect(
                  () => connectGoogleIdentity(),
                  runtimeReady || Boolean(googleOAuthId),
                  missingGoogleMsg
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
                  missingGitHubMsg
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
                  missingLinkedInMsg
                )
              }
              disabled={loading}
              loading={loading}
              variant={buttonVariant}
              className={oauthMarketingClass}
            />
          </div>

          {showInstallExtensionWarning ? (
            <p className="mt-2 text-center text-xs text-textSoft">
              Open this page from the extension to use chrome.identity, or configure OAuth client IDs for web sign-in.
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
