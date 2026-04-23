import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../styles/index.css';
import { bootstrapDocumentThemeFromWebStorage } from '../../shared/ui/theme';
import { initIntelligenceRulesFromRemote } from '../../rules/intelligenceRulesRuntime';
import { HelpKnowledgeRoot } from './HelpKnowledgeRoot';

void initIntelligenceRulesFromRemote().catch(() => {
  /* best-effort */
});

bootstrapDocumentThemeFromWebStorage();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HelpKnowledgeRoot />
  </React.StrictMode>
);
