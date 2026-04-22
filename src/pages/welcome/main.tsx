import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { AppErrorBoundary } from '../../shared/ui/AppErrorBoundary';
import { MobileApp } from '../mobile/mobileApp';

document.documentElement.setAttribute('data-app-surface', 'welcome');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary surfaceLabel="Welcome">
      <MobileApp initialTab="chat" surfaceLabel="chatbot-web" />
    </AppErrorBoundary>
  </React.StrictMode>
);
