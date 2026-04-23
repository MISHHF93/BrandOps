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

export const SHELL_SECTION_COPY: Record<MobileShellTabId, { headline: string; body: string }> = {
  pulse: {
    headline: 'Pulse — stay oriented',
    body: 'A single time-ordered queue across follow-ups, publishing, scheduler, and outreach. Not your plan for the day — that is Today.'
  },
  chat: {
    headline: 'Chat — make it happen',
    body: 'The only place commands execute. Use chips, typeahead, or Guided examples — then read the thread.'
  },
  daily: {
    headline: 'Today — plan and work',
    body: 'Focus engine plus workstreams (pipeline, brand, connections). Digests are read-only until you act in Chat.'
  },
  integrations: {
    headline: 'Integrations — connect the stack',
    body: 'Sources, OAuth, and live signals between products. Not account or workspace identity — that is Settings.'
  },
  settings: {
    headline: 'Settings — you and your workspace',
    body: 'Account, membership, export/import, cadence, and preferences. Not wiring external tools — that is Integrations.'
  }
};
