import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { DashboardApp } from './dashboardApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>
);
