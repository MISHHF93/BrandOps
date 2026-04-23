import { renderChatbotSurface } from '../chatbotWeb/renderChatbotSurface';

/** Growth / sales first-run: land on Today cockpit, then use bottom nav to Chat for commands. */
renderChatbotSurface({
  surfaceLabel: 'welcome',
  initialTab: 'daily'
});
