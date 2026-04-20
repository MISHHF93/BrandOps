import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { AppErrorBoundary } from '../../shared/ui/AppErrorBoundary';
import { OptionsApp } from './optionsApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary surfaceLabel="Settings">
      <OptionsApp />
    </AppErrorBoundary>
  </React.StrictMode>
);
