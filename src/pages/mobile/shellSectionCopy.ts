import type { MobileShellTabId } from './mobileShellQuery';

/**
 * Dock button tooltips: short clues only — no duplicating tab labels.
 */
export const SHELL_TAB_PURPOSE: Record<MobileShellTabId, string> = {
  workspace: 'Counts, soonest queue table, and shortcuts — not a separate feed tab.',
  chat: 'Assistant runs typed workspace commands.',
  daily: 'Today lanes and workstreams.',
  integrations: 'Connect tools and sync.',
  settings: 'Account and workspace prefs.'
};

/**
 * Screen reader context for the shell title (hidden from sighted users — keeps chrome minimal).
 */
export const SHELL_TAB_SR_SUMMARY: Record<MobileShellTabId, string> = {
  workspace: 'Workspace overview — instruments and queue.',
  chat: 'Assistant command entry.',
  daily: 'Today plan and work areas.',
  integrations: 'Integrations.',
  settings: 'Settings.'
};

/** Sticky header wordmark — distinct from dock abbreviations. */
export const SHELL_SCREEN_TITLE: Record<MobileShellTabId, string> = {
  workspace: 'Workspace',
  chat: 'Assistant',
  daily: 'Today',
  integrations: 'Integrations',
  settings: 'Settings'
};
