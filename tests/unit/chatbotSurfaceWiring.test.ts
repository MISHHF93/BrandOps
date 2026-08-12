import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('chatbot surface wiring', () => {
  it('mobile, integrations, and welcome entrypoints render chatbot surface', () => {
    const mobileMain = read('src/pages/mobile/main.tsx');
    const integrationsMain = read('src/pages/integrations/main.tsx');
    const welcomeMain = read('src/pages/welcome/main.tsx');

    expect(mobileMain).toContain('renderChatbotSurface(');
    expect(mobileMain).toMatch(/initialTab:\s*'chat'/);
    expect(mobileMain).toContain("surfaceLabel: 'mobile'");
    expect(integrationsMain).toContain('renderChatbotSurface(');
    expect(welcomeMain).toContain('renderChatbotSurface(');
    expect(welcomeMain).toMatch(/initialTab:\s*'chat'/);
  });

  it('dashboard entry redirects to the canonical mobile shell instead of mounting a duplicate app', () => {
    const dashboardMain = read('src/pages/dashboard/main.tsx');
    expect(dashboardMain).not.toContain('renderChatbotSurface(');
    expect(dashboardMain).toContain("new URL('mobile.html', window.location.href)");
  });

  it('help entrypoint mounts Knowledge Center root (not MobileApp shell)', () => {
    const helpMain = read('src/pages/help/main.tsx');
    expect(helpMain).toContain('HelpKnowledgeRoot');
  });

  it('root index is the marketing site, not a redirect into the app shell', () => {
    const indexHtml = read('index.html');
    expect(indexHtml).toContain('src/pages/site/main.tsx');
    expect(indexHtml).not.toContain('renderChatbotSurface');
    const siteMain = read('src/pages/site/main.tsx');
    expect(siteMain).toContain("document.documentElement.setAttribute('data-app-surface', 'site')");
    const siteApp = read('src/pages/site/SiteApp.tsx');
    expect(siteApp).toContain('hrefSignIn()');
    expect(siteApp).toContain('hrefSignUp()');
  });

  it('prepares the mobile shell as Capacitor index without replacing the web marketing entry', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>;
    };
    const prepareScript = read('scripts/prepare-capacitor-web.mjs');

    expect(packageJson.scripts['android:sync']).toContain('npm run cap:prepare');
    expect(packageJson.scripts['ios:sync']).toContain('npm run cap:prepare');
    expect(prepareScript).toContain("join(dist, 'mobile.html')");
    expect(prepareScript).toContain("join(dist, 'index.html')");
    expect(prepareScript).toContain('copyFile(mobileEntry, capacitorEntry)');
  });

  it('welcome.html hands off to mobile.html once sign-in completes, so the app opens only after the site', () => {
    const mobileApp = read('src/pages/mobile/mobileApp.tsx');
    expect(mobileApp).toContain("surfaceLabel !== 'welcome'");
    expect(mobileApp).toContain('hrefPrimaryAppDefault()');
  });

  it('mobile.html entry uses ASK as the default shell tab', () => {
    const mobileMain = read('src/pages/mobile/main.tsx');
    expect(mobileMain).toMatch(/initialTab:\s*'chat'/);
  });

  it('re-reads workspace state after gateway tracing before persisting a hosted Ask result', () => {
    const mobileApp = read('src/pages/mobile/mobileApp.tsx');
    const tracePersist = mobileApp.indexOf('await persistChatGatewayTrace(');
    const freshRead = mobileApp.indexOf(
      'const postGatewayData = await storageService.getData();',
      tracePersist
    );
    const successPersist = mobileApp.indexOf(
      'prependAiAssistantTurnTrace(postGatewayData,',
      freshRead
    );

    expect(tracePersist).toBeGreaterThan(-1);
    expect(freshRead).toBeGreaterThan(tracePersist);
    expect(successPersist).toBeGreaterThan(freshRead);
  });

  it('renderChatbotSurface threads document surface into MobileApp (aligned with data-app-surface)', () => {
    const surface = read('src/pages/chatbotWeb/renderChatbotSurface.tsx');
    expect(surface).toContain('setAttribute(');
    expect(surface).toContain("data-app-surface', surfaceLabel");
    expect(surface).toContain('<MobileApp');
    expect(surface).toContain('surfaceLabel={surfaceLabel}');
  });
});
