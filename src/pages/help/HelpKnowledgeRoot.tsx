import { useEffect } from 'react';
import { KnowledgeCenterBody } from '../../shared/help/KnowledgeCenterBody';
import { PAGE, QUERY, buildMobileCockpitUrl, buildMobileShellUrl } from '../../shared/navigation/extensionLinks';
import { resolveExtensionUrl } from '../../shared/navigation/extensionRuntime';
import { AppErrorBoundary } from '../../shared/ui/AppErrorBoundary';

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

  const chatHref = resolveExtensionUrl(buildMobileShellUrl({ tab: 'chat' }));
  const todayHref = resolveExtensionUrl(buildMobileCockpitUrl({ section: 'today' }));
  const integrationsHref = resolveExtensionUrl(PAGE.integrations);

  return (
    <div className="bo-system-screen min-h-screen min-w-0 text-text">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-bg/90 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-text">Knowledge Center</p>
          <nav
            aria-label="Primary app entry points"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-textMuted"
          >
            <a href={todayHref} className="bo-link">
              Today (cockpit)
            </a>
            <a href={chatHref} className="bo-link">
              Chat
            </a>
            <a href={integrationsHref} className="bo-link">
              Integrations
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
