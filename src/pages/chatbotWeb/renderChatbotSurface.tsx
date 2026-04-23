import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { AppErrorBoundary } from '../../shared/ui/AppErrorBoundary';
import { bootstrapDocumentThemeFromWebStorage } from '../../shared/ui/theme';
import { MobileApp } from '../mobile/mobileApp';
import type { AppDocumentSurfaceId } from '../../shared/navigation/appDocumentSurface';
import type { MobileShellTabId } from '../mobile/mobileShellQuery';
import { initIntelligenceRulesFromRemote } from '../../rules/intelligenceRulesRuntime';

interface RenderChatbotSurfaceOptions {
  /** Matches `data-app-surface` and `MobileApp` document identity (not the legacy `chatbot-web` string). */
  surfaceLabel: AppDocumentSurfaceId;
  initialTab: MobileShellTabId;
}

export const renderChatbotSurface = ({
  surfaceLabel,
  initialTab
}: RenderChatbotSurfaceOptions) => {
  void initIntelligenceRulesFromRemote().catch(() => {
    /* best-effort; defaults remain in memory */
  });
  bootstrapDocumentThemeFromWebStorage();
  document.documentElement.setAttribute('data-app-surface', surfaceLabel);

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppErrorBoundary surfaceLabel={`AI Chatbot: ${surfaceLabel}`}>
        <MobileApp initialTab={initialTab} surfaceLabel={surfaceLabel} />
      </AppErrorBoundary>
    </React.StrictMode>
  );
};
