import { useEffect } from 'react';
import { KnowledgeCenterBody } from '../../shared/help/KnowledgeCenterBody';
import { QUERY } from '../../shared/navigation/extensionLinks';
import {
  hrefExtensionIntegrationsPage,
  hrefPrimaryAppChat,
  hrefPrimaryAppIntegrationsTab,
  hrefPrimaryAppPulse,
  hrefPrimaryAppSettingsTab,
  hrefPrimaryAppToday
} from '../../shared/navigation/navigationIntents';
import { AppErrorBoundary } from '../../shared/ui/AppErrorBoundary';

const navLinkClass = 'bo-link';

export function HelpKnowledgeRoot() {
  useEffect(() => {
    const topic = new URLSearchParams(window.location.search).get(QUERY.helpTopic);
    if (!topic) return;
    const id = decodeURIComponent(topic);
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const pulseHref = hrefPrimaryAppPulse();
  const chatHref = hrefPrimaryAppChat();
  const settingsHref = hrefPrimaryAppSettingsTab();
  const integrationsTabHref = hrefPrimaryAppIntegrationsTab();
  const integrationsHubHref = hrefExtensionIntegrationsPage();
  const todayHref = hrefPrimaryAppToday();

  return (
    <div className="bo-system-screen min-h-screen min-w-0 text-text">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-bg/90 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-text">Knowledge Center</p>
          <nav
            aria-label="Primary app entry points"
            className="flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-textMuted"
          >
            <a href={pulseHref} className={navLinkClass}>
              Pulse
            </a>
            <a href={chatHref} className={navLinkClass}>
              Chat
            </a>
            <a href={todayHref} className={navLinkClass}>
              Today
            </a>
            <a
              href={integrationsTabHref}
              className={navLinkClass}
              title="mobile.html?section=integrations"
            >
              Integrations tab
            </a>
            <a href={settingsHref} className={navLinkClass}>
              Settings
            </a>
            <a
              href={integrationsHubHref}
              className={navLinkClass}
              title="integrations.html — extension hub"
            >
              Integrations page
            </a>
          </nav>
        </div>
      </header>
      <main className="px-4 py-6">
        <AppErrorBoundary surfaceLabel="Help">
          <KnowledgeCenterBody topicLinkMode="page-query" />
        </AppErrorBoundary>
      </main>
    </div>
  );
}
