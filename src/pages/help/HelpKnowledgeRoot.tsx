import { useEffect } from 'react';
import { KnowledgeCenterBody } from '../../shared/help/KnowledgeCenterBody';
import { QUERY } from '../../shared/navigation/extensionLinks';
import {
  hrefCockpitWorkstream,
  hrefExtensionIntegrationsPage,
  hrefPrimaryAppChat,
  hrefPrimaryAppIntegrationsTab,
  hrefPrimaryAppPipeline,
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
  const pipelineHref = hrefPrimaryAppPipeline();
  const brandHref = hrefCockpitWorkstream('brand-content');
  const connectionsHref = hrefCockpitWorkstream('connections');

  return (
    <div className="bo-system-screen min-h-screen min-w-0 text-text">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-bg/90 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-text">Knowledge Center</p>
          <nav
            aria-label="Primary app entry points"
            className="flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-textMuted"
          >
            <span className="w-full text-[10px] font-semibold uppercase tracking-wide text-textSoft sm:w-auto">
              Shell tabs
            </span>
            <a href={pulseHref} className={navLinkClass}>
              Pulse
            </a>
            <a href={chatHref} className={navLinkClass}>
              Chat
            </a>
            <a href={integrationsTabHref} className={navLinkClass} title="mobile.html?section=integrations">
              Integrations (in app)
            </a>
            <a href={settingsHref} className={navLinkClass}>
              Settings
            </a>
            <a href={integrationsHubHref} className={navLinkClass} title="integrations.html — extension hub">
              Integrations hub
            </a>
            <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
            <span className="w-full text-[10px] font-semibold uppercase tracking-wide text-textSoft sm:w-auto">
              Today workstreams
            </span>
            <a href={todayHref} className={navLinkClass}>
              Today
            </a>
            <a href={pipelineHref} className={navLinkClass}>
              Pipeline
            </a>
            <a href={brandHref} className={navLinkClass}>
              Brand &amp; content
            </a>
            <a href={connectionsHref} className={navLinkClass}>
              Connections
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
