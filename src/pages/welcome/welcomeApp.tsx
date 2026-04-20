import { useCallback, useEffect } from 'react';
import type { DashboardNavItem } from '../../shared/config/dashboardNavigation';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';
import { buildDashboardUrl, PAGE } from '../../shared/navigation/extensionLinks';
import { getExtensionManifestVersion, resolveExtensionUrl } from '../../shared/navigation/extensionRuntime';
import { navigateCrownFromExtensionSurface } from '../../shared/navigation/navigateCrownFromExtensionSurface';
import { applyDocumentTheme } from '../../shared/ui/theme';
import { canAccessApp } from '../../shared/identity/sessionAccess';
import { InlineAlert } from '../../shared/ui/components';
import { RightPillNavDock } from '../../shared/ui/components/navigation/RightPillNavDock';
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

  const handleNavSelect = useCallback((item: DashboardNavItem) => {
    navigateCrownFromExtensionSurface(item);
  }, []);

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
      <>
        <WelcomeAuthLayout>
          <WelcomePlaceholderCard>
            <InlineAlert tone="danger" title="Could not load BrandOps" message={error} />
          </WelcomePlaceholderCard>
        </WelcomeAuthLayout>
        <RightPillNavDock hostSurface="welcome" onSelectItem={handleNavSelect} />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <WelcomeAuthLayout>
          <WelcomePlaceholderCard>
            <p className="text-center text-sm text-textMuted">Loading welcome…</p>
          </WelcomePlaceholderCard>
        </WelcomeAuthLayout>
        <RightPillNavDock hostSurface="welcome" onSelectItem={handleNavSelect} />
      </>
    );
  }

  const allowedIntoApp = canAccessApp(data);

  return (
    <>
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
      <RightPillNavDock hostSurface="welcome" onSelectItem={handleNavSelect} />
    </>
  );
}
