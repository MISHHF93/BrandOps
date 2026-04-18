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
  const [localError, setLocalError] = useState<string | null>(null);
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
    setLocalError(null);
    try {
      await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed.';
      if (/oauth|client id|client_id/i.test(message)) {
        setLocalError('This sign-in provider is not available yet. Please try another provider.');
        return;
      }
      setLocalError(message);
    }
  };

  const startProviderConnect = async (
    connect: () => Promise<void>,
    providerConfigured: boolean,
    missingProviderMessage: string
  ) => {
    if (!legalAccepted) {
      setLocalError('Please accept the Terms of Service and Privacy Policy first.');
      return;
    }
    if (!providerConfigured) {
      setLocalError(missingProviderMessage);
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
                message="No OAuth client IDs are set for this preview build. Use **Enter demo mode (browser preview)** below, or add VITE_GOOGLE_CLIENT_ID / VITE_GITHUB_CLIENT_ID / VITE_LINKEDIN_CLIENT_ID so sign-in can run in the browser (popup)."
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

          {localError ? (
            <div className="mt-6">
              <InlineAlert
                tone="danger"
                title="Something went wrong"
                message={localError}
                className="rounded-lg border-danger/40 bg-dangerSoft/15 text-text"
              />
            </div>
          ) : null}

          {showWebPreviewInfo ? (
            <button
              type="button"
              className="mt-5 w-full rounded-xl border border-primary/35 bg-primary/10 px-4 py-3 text-sm font-semibold text-text transition hover:bg-primary/16"
              disabled={loading}
              onClick={async () => {
                setLocalError(null);
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
                    ? 'Add VITE_GOOGLE_CLIENT_ID (or a Google client ID in Settings) to sign in from this browser, or use Enter demo mode.'
                    : 'Add VITE_GOOGLE_CLIENT_ID or a Google client ID in Settings to sign in from this browser, or open BrandOps from the Chrome extension.'
                )
              }
              disabled={loading || (!runtimeReady && !googleOAuthId)}
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
                    ? 'Add VITE_GITHUB_CLIENT_ID (or a GitHub client ID in Settings) to sign in from this browser, or use Enter demo mode.'
                    : 'Add VITE_GITHUB_CLIENT_ID or a GitHub client ID in Settings to sign in from this browser, or open BrandOps from the Chrome extension.'
                )
              }
              disabled={loading || (!runtimeReady && !githubOAuthId)}
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
                    ? 'Add VITE_LINKEDIN_CLIENT_ID (or a LinkedIn client ID in Settings) to sign in from this browser, or use Enter demo mode.'
                    : 'Add VITE_LINKEDIN_CLIENT_ID or a LinkedIn client ID in Settings to sign in from this browser, or open BrandOps from the Chrome extension.'
                )
              }
              disabled={loading || (!runtimeReady && !linkedinOAuthId)}
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
                  setLocalError(null);
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
              Set OAuth env vars above to enable provider buttons, or install BrandOps from the Chrome Web Store for extension sign-in.
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
