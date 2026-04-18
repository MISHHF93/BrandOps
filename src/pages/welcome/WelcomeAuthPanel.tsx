import { useEffect, useState } from 'react';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';
import { GoogleSignInButton } from '../../shared/ui/oauth/GoogleSignInButton';
import { GitHubSignInButton } from '../../shared/ui/oauth/GitHubSignInButton';
import { LinkedInSignInButton } from '../../shared/ui/oauth/LinkedInSignInButton';
import { getPrimaryIdentityLabel } from '../../shared/identity/primaryIdentityLabel';
import { canAccessApp, isDemoBypassBuild } from '../../shared/identity/sessionAccess';
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
  /** Built with VITE_DEMO_BYPASS — safe for Vercel / Safari / any browser demo (OAuth still needs extension). */
  const webPreviewDemo = demoBypass;
  const oauthAvailable = runtimeReady;
  const showInstallExtensionWarning = !oauthAvailable && !webPreviewDemo;
  const showWebPreviewInfo = !oauthAvailable && webPreviewDemo;
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

  const startProviderConnect = async (connect: () => Promise<void>) => {
    if (!legalAccepted) {
      setLocalError('Please accept the Terms of Service and Privacy Policy first.');
      return;
    }
    if (!oauthAvailable) {
      setLocalError(
        webPreviewDemo
          ? 'OAuth sign-in only runs inside the installed Chrome extension. Use Enter demo mode for this preview, or install BrandOps from the store.'
          : 'Open this page from the installed BrandOps extension to continue sign-in.'
      );
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
                message="Google, GitHub, and LinkedIn sign-in uses the Chrome extension only. On this preview site, use **Enter demo mode (browser preview)** below—works in any browser, no install."
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
              onClick={() => void startProviderConnect(() => connectGoogleIdentity())}
              disabled={loading || !oauthAvailable}
              loading={loading}
              variant={buttonVariant}
              className={oauthMarketingClass}
            />
            <GitHubSignInButton
              onClick={() => void startProviderConnect(() => connectGitHubIdentity())}
              disabled={loading || !oauthAvailable}
              loading={loading}
              variant={buttonVariant}
              className={oauthMarketingClass}
            />
            <LinkedInSignInButton
              onClick={() => void startProviderConnect(() => connectLinkedInIdentity())}
              disabled={loading || !oauthAvailable}
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
              OAuth buttons stay disabled here; they work after you install BrandOps from the Chrome Web Store.
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
