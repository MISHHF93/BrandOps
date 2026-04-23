import React from 'react';
import ReactDOM from 'react-dom/client';
import { MobileApp } from './mobileApp';
import '../../styles/index.css';
import { AppErrorBoundary } from '../../shared/ui/AppErrorBoundary';
import { bootstrapDocumentThemeFromWebStorage } from '../../shared/ui/theme';
import { initIntelligenceRulesFromRemote } from '../../rules/intelligenceRulesRuntime';

void initIntelligenceRulesFromRemote().catch(() => {
  /* best-effort */
});

bootstrapDocumentThemeFromWebStorage();
document.documentElement.setAttribute('data-app-surface', 'mobile');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary surfaceLabel="BrandOps Mobile">
      <MobileApp surfaceLabel="mobile" initialTab="pulse" />
    </AppErrorBoundary>
  </React.StrictMode>
);
