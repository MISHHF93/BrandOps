import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { WelcomeApp } from './welcomeApp';

document.documentElement.setAttribute('data-app-surface', 'welcome');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WelcomeApp />
  </React.StrictMode>
);
