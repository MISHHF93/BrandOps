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
  /** Shell documents only — excludes `help` (Knowledge Center uses its own entry). */
  surfaceLabel: Exclude<AppDocumentSurfaceId, 'help'>;
  initialTab: MobileShellTabId;
  /** Defaults to `AI Chatbot: {surfaceLabel}`; override for primary `mobile.html` (e.g. BrandOps Mobile). */
  errorBoundaryLabel?: string;
}

export const renderChatbotSurface = ({
  surfaceLabel,
  initialTab,
  errorBoundaryLabel
}: RenderChatbotSurfaceOptions) => {
  void initIntelligenceRulesFromRemote().catch(() => {
    /* best-effort; defaults remain in memory */
  });
  bootstrapDocumentThemeFromWebStorage();
  document.documentElement.setAttribute('data-app-surface', surfaceLabel);

  const boundaryLabel = errorBoundaryLabel ?? `AI Chatbot: ${surfaceLabel}`;

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppErrorBoundary surfaceLabel={boundaryLabel}>
        <MobileApp initialTab={initialTab} surfaceLabel={surfaceLabel} />
      </AppErrorBoundary>
    </React.StrictMode>
  );
};
