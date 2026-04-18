import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import { HelpApp } from './helpApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelpApp />
  </React.StrictMode>
);
