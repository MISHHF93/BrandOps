import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { bootstrapDocumentThemeFromWebStorage } from '../../shared/ui/theme';
import { AppErrorBoundary } from '../../shared/ui/AppErrorBoundary';
import { DashboardApp } from './dashboardApp';

bootstrapDocumentThemeFromWebStorage();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary surfaceLabel="Dashboard">
      <DashboardApp />
    </AppErrorBoundary>
  </React.StrictMode>
);
