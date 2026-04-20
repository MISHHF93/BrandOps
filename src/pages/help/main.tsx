import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { AppErrorBoundary } from '../../shared/ui/AppErrorBoundary';
import { HelpApp } from './helpApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary surfaceLabel="Help">
      <HelpApp />
    </AppErrorBoundary>
  </React.StrictMode>
);
