import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('chatbot surface wiring', () => {
  it('all web entrypoints render chatbot surface', () => {
    const dashboardMain = read('src/pages/dashboard/main.tsx');
    const optionsMain = read('src/pages/options/main.tsx');
    const helpMain = read('src/pages/help/main.tsx');
    const welcomeMain = read('src/pages/welcome/main.tsx');

    expect(dashboardMain).toContain('renderChatbotSurface(');
    expect(optionsMain).toContain('renderChatbotSurface(');
    expect(helpMain).toContain('renderChatbotSurface(');
    expect(welcomeMain).toContain('renderChatbotSurface(');
  });

  it('root index redirects to mobile chatbot surface', () => {
    const indexHtml = read('index.html');
    expect(indexHtml).toContain("new URL('/mobile.html'");
  });
});
