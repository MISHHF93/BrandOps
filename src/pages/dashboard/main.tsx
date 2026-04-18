import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { bootstrapDocumentThemeFromWebStorage } from '../../shared/ui/theme';
import { DashboardApp } from './dashboardApp';

bootstrapDocumentThemeFromWebStorage();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>
);
