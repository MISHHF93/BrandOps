import type { MobileShellTabId } from './mobileShellQuery';

/**
 * Dock button tooltips: short clues only — no duplicating tab labels.
 */
export const SHELL_TAB_PURPOSE: Record<MobileShellTabId, string> = {
  workspace:
    'Plan — Today + Pipeline shortcuts, jump links, Pulse, Today snapshot, queue; ⌘K for Setup & Connect.',
  chat: 'Assistant — workspace commands and hosted Ask; ⌘K jumps anywhere.',
  daily: 'Today lanes and workstreams.',
  integrations: 'Connect tools and sync.',
  settings: 'Account and workspace prefs.'
};

/**
 * Screen reader context for the shell title (hidden from sighted users — keeps chrome minimal).
 */
export const SHELL_TAB_SR_SUMMARY: Record<MobileShellTabId, string> = {
  workspace:
    'Plan — Today and Pipeline tiles; ⌘K opens Integrations, Setup, and commands; jump links below.',
  chat: 'Assistant — command entry and Ask.',
  daily: 'Today plan and work areas.',
  integrations: 'Integrations.',
  settings: 'Settings.'
};

/** Sticky header wordmark — distinct from dock abbreviations. */
export const SHELL_SCREEN_TITLE: Record<MobileShellTabId, string> = {
  workspace: 'Plan',
  chat: 'Assistant',
  daily: 'Today',
  integrations: 'Integrations',
  settings: 'Settings'
};
