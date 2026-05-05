import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('chatbot surface wiring', () => {
  it('mobile, dashboard, integrations, and welcome entrypoints render chatbot surface', () => {
    const mobileMain = read('src/pages/mobile/main.tsx');
    const dashboardMain = read('src/pages/dashboard/main.tsx');
    const integrationsMain = read('src/pages/integrations/main.tsx');
    const welcomeMain = read('src/pages/welcome/main.tsx');

    expect(mobileMain).toContain('renderChatbotSurface(');
    expect(mobileMain).toMatch(/initialTab:\s*'chat'/);
    expect(mobileMain).toContain("surfaceLabel: 'mobile'");
    expect(dashboardMain).toContain('renderChatbotSurface(');
    expect(integrationsMain).toContain('renderChatbotSurface(');
    expect(welcomeMain).toContain('renderChatbotSurface(');
    expect(welcomeMain).toMatch(/initialTab:\s*'chat'/);
  });

  it('help entrypoint mounts Knowledge Center root (not MobileApp shell)', () => {
    const helpMain = read('src/pages/help/main.tsx');
    expect(helpMain).toContain('HelpKnowledgeRoot');
  });

  it('root index redirects to mobile chatbot surface', () => {
    const indexHtml = read('index.html');
    expect(indexHtml).toContain("new URL('/mobile.html'");
  });

  it('mobile.html entry uses Assistant as the default shell tab', () => {
    const mobileMain = read('src/pages/mobile/main.tsx');
    expect(mobileMain).toMatch(/initialTab:\s*'chat'/);
  });

  it('renderChatbotSurface threads document surface into MobileApp (aligned with data-app-surface)', () => {
    const surface = read('src/pages/chatbotWeb/renderChatbotSurface.tsx');
    expect(surface).toContain('setAttribute(');
    expect(surface).toContain("data-app-surface', surfaceLabel");
    expect(surface).toContain('<MobileApp');
    expect(surface).toContain('surfaceLabel={surfaceLabel}');
  });
});
