import type { MobileShellTabId } from './mobileShellQuery';

/**
 * Dock button tooltips: short clues only — no duplicating tab labels.
 */
export const SHELL_TAB_PURPOSE: Record<MobileShellTabId, string> = {
  workspace:
    'Plan — overview, execution insights, Pulse, queue; strip jumps to Workstreams, Connect, Setup.',
  chat: 'Assistant — workspace commands and hosted Ask; ⌘K jumps anywhere.',
  daily: 'Plan — Today lanes and workstreams.',
  integrations: 'Plan — integration readiness and sync.',
  settings: 'Plan — account and workspace preferences.'
};

/**
 * Screen reader context for the shell title (hidden from sighted users — keeps chrome minimal).
 */
export const SHELL_TAB_SR_SUMMARY: Record<MobileShellTabId, string> = {
  workspace:
    'Plan — Today and Pipeline tiles; ⌘K opens Integrations, Setup, and commands; jump links below.',
  chat: 'Assistant — command entry and Ask.',
  daily: 'Plan — Today lanes and work areas.',
  integrations: 'Plan — Connect tools and sync readiness.',
  settings: 'Plan — Account and workspace setup.'
};

/** Sticky header wordmark — distinct from dock abbreviations. */
export const SHELL_SCREEN_TITLE: Record<MobileShellTabId, string> = {
  workspace: 'Plan',
  chat: 'Assistant',
  daily: 'Plan · Workstreams',
  integrations: 'Plan · Connect',
  settings: 'Plan · Setup'
};
