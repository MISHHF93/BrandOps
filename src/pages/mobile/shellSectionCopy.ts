import type { MobileShellTabId } from './mobileShellQuery';

/**
 * Emotional purpose of each tab (shown under the workspace title for the active tab).
 * Keeps Pulse vs Today and Integrations vs Settings mentally distinct.
 */
export const SHELL_TAB_PURPOSE: Record<MobileShellTabId, string> = {
  pulse: 'Calm orientation — one timeline of what is coming at you (soonest first).',
  chat: 'Agency — tell the agent what to do; commands change your workspace.',
  daily: 'Intention — plan the day, then deep-dive work areas (not a second Pulse).',
  integrations: 'Your stack — connect sources, sync, and pipes between tools.',
  settings: 'Control & trust — you, your account, and how BrandOps behaves.'
};
