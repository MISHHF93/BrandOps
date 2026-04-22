import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('chatbot surface wiring', () => {
  it('all web entrypoints render chatbot surface', () => {
    const dashboardMain = read('src/pages/dashboard/main.tsx');
    const integrationsMain = read('src/pages/integrations/main.tsx');
    const helpMain = read('src/pages/help/main.tsx');
    const welcomeMain = read('src/pages/welcome/main.tsx');

    expect(dashboardMain).toContain('renderChatbotSurface(');
    expect(integrationsMain).toContain('renderChatbotSurface(');
    expect(helpMain).toContain('renderChatbotSurface(');
    expect(welcomeMain).toContain('renderChatbotSurface(');
  });

  it('root index redirects to mobile chatbot surface', () => {
    const indexHtml = read('index.html');
    expect(indexHtml).toContain("new URL('/mobile.html'");
  });

  it('renderChatbotSurface threads document surface into MobileApp (aligned with data-app-surface)', () => {
    const surface = read('src/pages/chatbotWeb/renderChatbotSurface.tsx');
    expect(surface).toContain('setAttribute(');
    expect(surface).toContain("data-app-surface', surfaceLabel");
    expect(surface).toContain('<MobileApp');
    expect(surface).toContain('surfaceLabel={surfaceLabel}');
  });
});
