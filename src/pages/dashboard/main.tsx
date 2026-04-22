import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { bootstrapDocumentThemeFromWebStorage } from '../../shared/ui/theme';
import { AppErrorBoundary } from '../../shared/ui/AppErrorBoundary';
import { MobileApp } from '../mobile/mobileApp';

bootstrapDocumentThemeFromWebStorage();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary surfaceLabel="Dashboard">
      <MobileApp initialTab="chat" surfaceLabel="chatbot-web" />
    </AppErrorBoundary>
  </React.StrictMode>
);
