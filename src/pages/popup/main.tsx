import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { PopupApp } from './popupApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
