import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { AppErrorBoundary } from '../../shared/ui/AppErrorBoundary';
import { MobileApp } from '../mobile/mobileApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary surfaceLabel="Settings">
      <MobileApp initialTab="settings" surfaceLabel="chatbot-web" />
    </AppErrorBoundary>
  </React.StrictMode>
);
