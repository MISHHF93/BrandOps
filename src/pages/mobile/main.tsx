import React from 'react';
import ReactDOM from 'react-dom/client';
import { MobileApp } from './mobileApp';
import '../../styles/index.css';
import { bootstrapDocumentThemeFromWebStorage } from '../../shared/ui/theme';

bootstrapDocumentThemeFromWebStorage();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MobileApp surfaceLabel="mobile" />
  </React.StrictMode>
);
