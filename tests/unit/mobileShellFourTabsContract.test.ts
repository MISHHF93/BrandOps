import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

import { resolve } from 'node:path';



const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');



describe('MobileApp shell tab wiring (contract)', () => {

  const mobileApp = read('src/pages/mobile/mobileApp.tsx');



  it('maps each activeTab branch to the correct surface component', () => {

    expect(mobileApp).toMatch(/activeTab === 'chat'[\s\S]*?<MobileChatView/);

    expect(mobileApp).toMatch(/activeTab === 'workspace'[\s\S]*?<MobileWorkspaceHubView/);

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



  it('threads CockpitDailyView without obsolete Plan-tab cross-prop', () => {

    const cockpitJsx = mobileApp.match(/<CockpitDailyView[\s\S]*?\/>/)?.[0] ?? '';

    expect(cockpitJsx).not.toContain('onOpenPulseTab');

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

    expect(settingsJsx).toContain('membership={launchAccess.membership}');

    expect(settingsJsx).toContain('onStartCheckout={onStartCheckout}');

  });



  it('gates shell behind launch auth and membership states', () => {

    expect(mobileApp).toContain('shouldRequireLaunchAuth(launchAccess)');

    expect(mobileApp).toContain('LaunchAuthGate');

    expect(mobileApp).toContain('shouldRequireLaunchMembership(launchAccess)');

    expect(mobileApp).toContain('MembershipGate');

  });



  it('uses a two-tab dock plus palette destinations for deeper panels', () => {

    expect(mobileApp).toContain('<MobileShellNav');

    const tabConfig = read('src/pages/mobile/mobileTabConfig.ts');

    expect(tabConfig).toContain("id: 'chat'");

    expect(tabConfig).toContain("label: 'Assistant'");

    expect(tabConfig).toContain("id: 'workspace'");

    expect(tabConfig).toContain("label: 'Workspace'");

    expect(tabConfig).toContain('COMMAND_PALETTE_NAV_TARGETS');

    expect(tabConfig).toContain("tab: 'daily'");

    expect(tabConfig).toContain('Integrations');

    expect(tabConfig).toContain('Settings');

  });



  it('keeps Assistant composer outside MobileChatView so input stays fixed to viewport', () => {

    expect(mobileApp).toMatch(/activeTab === 'chat'[\s\S]*<ChatCommandBar/);

    const bar = read('src/pages/mobile/ChatCommandBar.tsx');

    expect(bar).toMatch(/placeholder="Ask BrandOps anything/);

  });



  it('embeds a dismissible first-run card on the Today tab', () => {

    expect(mobileApp).toMatch(/activeTab === 'daily'[\s\S]*FirstRunJourneyCard/);

  });



  it('threads getAgentCommandLock into the command palette for accurate agent lock copy', () => {

    expect(mobileApp).toContain('getAgentCommandLock(launchAccess, activeTab)');

    expect(mobileApp).toContain('agentLockReason={agentCommandLock}');

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

  it('mobile.html boots MobileApp with Assistant as the default tab', () => {

    const main = read('src/pages/mobile/main.tsx');

    expect(main).toMatch(/initialTab:\s*'chat'/);

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



describe('Lifecycle gate parity contract', () => {

  it('uses shared launch lifecycle gate helpers in mobile shell and background checks', () => {

    const mobileApp = read('src/pages/mobile/mobileApp.tsx');

    const background = read('src/background/index.ts');

    const gates = read('src/shared/account/launchLifecycleGate.ts');



    expect(mobileApp).toContain('shouldRequireLaunchAuth');

    expect(mobileApp).toContain('shouldRequireLaunchMembership');

    expect(background).toContain('canOpenLaunchWorkspace');

    expect(gates).toContain('canOpenLaunchWorkspace');

  });

});

