import { renderChatbotSurface } from '../chatbotWeb/renderChatbotSurface';

/** Growth / sales first-run: land on Workspace overview, then Assistant for commands. */
renderChatbotSurface({
  surfaceLabel: 'welcome',
  initialTab: 'workspace'
});
