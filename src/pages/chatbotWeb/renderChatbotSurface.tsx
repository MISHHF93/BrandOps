import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { AppErrorBoundary } from '../../shared/ui/AppErrorBoundary';
import { bootstrapDocumentThemeFromWebStorage } from '../../shared/ui/theme';
import { MobileApp } from '../mobile/mobileApp';

type ChatbotInitialTab = 'chat' | 'daily' | 'integrations' | 'settings';

interface RenderChatbotSurfaceOptions {
  surfaceLabel: string;
  initialTab: ChatbotInitialTab;
}

export const renderChatbotSurface = ({
  surfaceLabel,
  initialTab
}: RenderChatbotSurfaceOptions) => {
  bootstrapDocumentThemeFromWebStorage();
  document.documentElement.setAttribute('data-app-surface', surfaceLabel);

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppErrorBoundary surfaceLabel={`AI Chatbot: ${surfaceLabel}`}>
        <MobileApp initialTab={initialTab} surfaceLabel="chatbot-web" />
      </AppErrorBoundary>
    </React.StrictMode>
  );
};
