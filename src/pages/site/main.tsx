import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { AppErrorBoundary } from '../../shared/ui/AppErrorBoundary';
import { bootstrapDocumentThemeFromWebStorage } from '../../shared/ui/theme';
import { SiteApp } from './SiteApp';

bootstrapDocumentThemeFromWebStorage();
document.documentElement.setAttribute('data-app-surface', 'site');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary surfaceLabel="Marketing site">
      <SiteApp />
    </AppErrorBoundary>
  </React.StrictMode>
);
