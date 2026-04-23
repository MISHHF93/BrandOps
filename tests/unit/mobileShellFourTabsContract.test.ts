import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('MobileApp shell tab wiring (contract)', () => {
  const mobileApp = read('src/pages/mobile/mobileApp.tsx');

  it('maps each activeTab branch to the correct surface component', () => {
    expect(mobileApp).toMatch(/activeTab === 'chat'[\s\S]*?<MobileChatView/);
    expect(mobileApp).toMatch(/activeTab === 'pulse'[\s\S]*?<PulseTimelineView/);
    expect(mobileApp).toMatch(/activeTab === 'daily'[\s\S]*?<CockpitDailyView/);
    expect(mobileApp).toMatch(/activeTab === 'integrations'[\s\S]*?<MobileIntegrationsView/);
    expect(mobileApp).toMatch(/activeTab === 'settings'[\s\S]*?<MobileSettingsView/);
  });

  it('threads documentSurface into Settings and Integrations (packaged-page link parity)', () => {
    expect(mobileApp).toContain('documentSurface={surfaceLabel}');
    const integrationsJsx = mobileApp.match(/<MobileIntegrationsView[\s\S]*?\/>/)?.[0] ?? '';
    expect(integrationsJsx).toContain('documentSurface={surfaceLabel}');
    const cockpitJsx = mobileApp.match(/<CockpitDailyView[\s\S]*?\/>/)?.[0] ?? '';
    expect(cockpitJsx).not.toContain('documentSurface');
  });

  it('passes workstream state into Today (Cockpit) only', () => {
    expect(mobileApp).toContain('activeWorkstream={cockpitWorkstream}');
    expect(mobileApp).toContain('onSelectWorkstream={handleSelectWorkstream}');
  });

  it('threads Pulse → Today workstream navigation and Today → Pulse cross-link', () => {
    expect(mobileApp).toContain('onOpenCockpitWorkstream={openCockpitWorkstream}');
    const cockpitJsx = mobileApp.match(/<CockpitDailyView[\s\S]*?\/>/)?.[0] ?? '';
    expect(cockpitJsx).toContain("onOpenPulseTab={() => commitTab('pulse')}");
  });

  it('threads primeChat into Today and workspace data handlers into Settings', () => {
    const cockpitJsx = mobileApp.match(/<CockpitDailyView[\s\S]*?\/>/)?.[0] ?? '';
    expect(cockpitJsx).toContain('primeChat={primeChat}');
    expect(mobileApp).toContain('onExportWorkspace={exportWorkspace}');
    expect(mobileApp).toContain('onImportWorkspace={importWorkspace}');
    expect(mobileApp).toContain('onRequestResetWorkspace');
  });

  it('aliases runCommand to sendQuickCommand so shell chips use the same Chat-visible path as quick sends', () => {
    expect(mobileApp).toMatch(/const runCommand = sendQuickCommand/);
    expect(mobileApp).toMatch(/const sendQuickCommand[\s\S]*?commitTab\('chat'\)/);
  });

  it('threads commandBusy from commandLoading into Today and Integrations command surfaces', () => {
    const cockpitJsx = mobileApp.match(/<CockpitDailyView[\s\S]*?\/>/)?.[0] ?? '';
    const integrationsJsx = mobileApp.match(/<MobileIntegrationsView[\s\S]*?\/>/)?.[0] ?? '';
    expect(cockpitJsx).toContain('commandBusy={commandLoading}');
    expect(integrationsJsx).toContain('commandBusy={commandLoading}');
  });

  it('splits settings apply busy from chat command busy on MobileSettingsView', () => {
    const settingsJsx = mobileApp.match(/<MobileSettingsView[\s\S]*?\/>/)?.[0] ?? '';
    expect(settingsJsx).toContain('applyBusy={settingsApplyLoading}');
    expect(settingsJsx).toContain('commandBusy={commandLoading}');
    expect(settingsJsx).toContain("onOpenTodayTab={() => commitTab('daily')}");
  });

  it('exposes bottom nav labels aligned with URL tokens (pulse, chat, today, integrations, settings)', () => {
    expect(mobileApp).toContain('MOBILE_SHELL_NAV_TABS');
    const tabConfig = read('src/pages/mobile/mobileTabConfig.ts');
    expect(tabConfig).toContain("{ id: 'pulse', label: 'Pulse'");
    expect(tabConfig).toContain("{ id: 'chat', label: 'Chat'");
    expect(tabConfig).toContain("{ id: 'daily', label: 'Today'");
    expect(tabConfig).toContain("{ id: 'integrations', label: 'Integrations'");
    expect(tabConfig).toContain("{ id: 'settings', label: 'Settings'");
  });

  it('keeps Chat composer outside MobileChatView so input stays fixed to viewport', () => {
    expect(mobileApp).toMatch(/activeTab === 'chat'[\s\S]*placeholder="Message the agent/);
  });
});

describe('Mobile shell query parity (mobile + integrations HTML)', () => {
  const shell = read('src/pages/mobile/mobileShellQuery.ts');
  const mobileApp = read('src/pages/mobile/mobileApp.tsx');

  it('exports isAppShellWithSectionQuery for both mobile and integrations documents', () => {
    expect(shell).toContain('isAppShellWithSectionQuery');
    expect(shell).toContain('mobile');
    expect(shell).toContain('integrations');
    expect(mobileApp).toContain('isAppShellWithSectionQuery');
  });

  it('keeps popstate + parseMobileShellFromSearchParams wired for deep-link back/forward', () => {
    expect(mobileApp).toContain("addEventListener('popstate'");
    expect(mobileApp).toContain('parseMobileShellFromSearchParams');
    expect(mobileApp).toContain('replaceMobileShellQueryInUrl');
    expect(mobileApp).toMatch(/getCockpitMobileSectionHeadingId[\s\S]*?scrollIntoView/);
  });
});

describe('Surface entrypoints', () => {
  it('mobile.html boots MobileApp with Pulse as the default tab', () => {
    const main = read('src/pages/mobile/main.tsx');
    expect(main).toContain('initialTab="pulse"');
  });

  it('integrations.html boots renderChatbotSurface with integrations surface', () => {
    const main = read('src/pages/integrations/main.tsx');
    expect(main).toContain("surfaceLabel: 'integrations'");
    expect(main).toContain("initialTab: 'integrations'");
  });

  it('maps integrations document to chatbot-web agent source', () => {
    const src = read('src/shared/navigation/appDocumentSurface.ts');
    expect(src).toContain("'integrations'");
  });

  it('help.html boots HelpKnowledgeRoot', () => {
    const main = read('src/pages/help/main.tsx');
    expect(main).toContain('HelpKnowledgeRoot');
  });
});
