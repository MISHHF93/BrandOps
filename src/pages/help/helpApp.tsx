import { useCallback, useEffect, useLayoutEffect } from 'react';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { InlineAlert } from '../../shared/ui/components';
import { RightPillNavDock } from '../../shared/ui/components/navigation/RightPillNavDock';
import { KnowledgeCenterBody } from '../../shared/help/KnowledgeCenterBody';
import type { DashboardNavItem } from '../../shared/config/dashboardNavigation';
import { navigateCrownFromExtensionSurface } from '../../shared/navigation/navigateCrownFromExtensionSurface';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';
import { applyDocumentTheme } from '../../shared/ui/theme';
import { ExtensionPagesFooter } from '../../shared/navigation/ExtensionPagesFooter';
import { QUERY } from '../../shared/navigation/extensionLinks';

export function HelpApp() {
  const { data, init, error } = useBrandOpsStore();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!data?.settings.theme) return;
    applyDocumentTheme(data.settings.theme, {
      visualMode: data.settings.visualMode,
      motionMode: data.settings.motionMode,
      ambientFxEnabled: data.settings.ambientFxEnabled
    });
  }, [data?.settings.ambientFxEnabled, data?.settings.motionMode, data?.settings.theme, data?.settings.visualMode]);

  useLayoutEffect(() => {
    const url = new URL(window.location.href);
    const legacy = url.hash.replace(/^#/, '');
    if (!legacy || url.searchParams.has(QUERY.helpTopic)) return;
    url.searchParams.set(QUERY.helpTopic, legacy);
    url.hash = '';
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, []);

  useEffect(() => {
    if (!data) return;
    const topic = new URLSearchParams(window.location.search).get(QUERY.helpTopic);
    if (!topic) return;
    requestAnimationFrame(() => {
      document.getElementById(topic)?.scrollIntoView({ block: 'start' });
    });
  }, [data]);

  const handleNavSelect = useCallback((item: DashboardNavItem) => {
    navigateCrownFromExtensionSurface(item);
  }, []);

  if (error) {
    return (
      <main className="bo-system-screen bo-dashboard-shell min-h-screen p-4">
        <section className="bo-card max-w-xl space-y-3" role="alert" aria-live="assertive">
          <h1 className="text-base font-semibold text-text">Knowledge Center</h1>
          <InlineAlert tone="danger" title="Could not load BrandOps" message={error} />
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="bo-system-screen bo-dashboard-shell min-h-screen p-4">
        <p className="text-sm text-textMuted">Loading Knowledge Center…</p>
      </main>
    );
  }

  return (
    <>
      <main
        className={`bo-system-screen bo-dashboard-shell bo-retro-ambient min-h-screen space-y-4 p-4 ${
          data.settings.visualMode === 'retroMagic' ? 'bo-retro-panel' : ''
        } ${data.settings.motionMode !== 'off' ? 'bo-retro-surface-enter' : ''}`}
      >
        <BrandHeader
          eyebrow="BrandOps"
          title="Knowledge Center"
          roleBadge="Work"
          subtitle="In-extension manual: surfaces, first run, Today execution, and shortcuts."
        />

        <KnowledgeCenterBody topicLinkMode="page-query" />

        <ExtensionPagesFooter />
      </main>
      <RightPillNavDock hostSurface="help" onSelectItem={handleNavSelect} />
    </>
  );
}
