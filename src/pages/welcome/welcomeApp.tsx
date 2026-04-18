import { useEffect } from 'react';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';
import { buildDashboardUrl, PAGE } from '../../shared/navigation/extensionLinks';
import { getExtensionManifestVersion, resolveExtensionUrl } from '../../shared/navigation/extensionRuntime';
import { applyDocumentTheme } from '../../shared/ui/theme';
import { canAccessApp } from '../../shared/identity/sessionAccess';
import { WelcomeAuthLayout } from './WelcomeAuthLayout';
import { WelcomeAuthPanel } from './WelcomeAuthPanel';
import { WelcomeLegalFooter } from './WelcomeLegalFooter';
import { WelcomePlaceholderCard } from './WelcomePlaceholderCard';

export function WelcomeApp() {
  const { data, init, error, completeWelcomeOnboarding } = useBrandOpsStore();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!data?.settings.theme) return;
    applyDocumentTheme(data.settings.theme, {
      visualMode: 'classic',
      motionMode: data.settings.motionMode,
      ambientFxEnabled: false
    });
  }, [data?.settings.motionMode, data?.settings.theme]);

  const dashboardHref = resolveExtensionUrl(buildDashboardUrl());
  const optionsHref = resolveExtensionUrl(PAGE.options);
  const manifestVersion = getExtensionManifestVersion();

  const markWelcomeAndGo = async () => {
    await completeWelcomeOnboarding();
    try {
      sessionStorage.setItem('bo:dashboard-after-welcome', '1');
    } catch {
      // ignore
    }
    window.location.href = dashboardHref;
  };

  if (error) {
    return (
      <WelcomeAuthLayout>
        <WelcomePlaceholderCard>
          <p className="text-center text-sm leading-relaxed text-danger">Could not load BrandOps: {error}</p>
        </WelcomePlaceholderCard>
      </WelcomeAuthLayout>
    );
  }

  if (!data) {
    return (
      <WelcomeAuthLayout>
        <WelcomePlaceholderCard>
          <p className="text-center text-sm text-textMuted">Loading…</p>
        </WelcomePlaceholderCard>
      </WelcomeAuthLayout>
    );
  }

  const allowedIntoApp = canAccessApp(data);

  return (
    <WelcomeAuthLayout>
      <div className="flex w-full flex-col gap-5">
        <WelcomeAuthPanel
          onContinue={() => void markWelcomeAndGo()}
          canContinue={allowedIntoApp}
          optionsHref={optionsHref}
        />
        <WelcomeLegalFooter manifestVersion={manifestVersion} />
      </div>
    </WelcomeAuthLayout>
  );
}
