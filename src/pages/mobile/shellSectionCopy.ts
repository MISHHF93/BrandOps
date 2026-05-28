import type { MobileShellTabId } from './mobileShellQuery';

/**
 * Dock button tooltips: short clues only — no duplicating tab labels.
 */
export const SHELL_TAB_PURPOSE: Record<MobileShellTabId, string> = {
  workspace:
    'Plan / Operate — AI planning, trust controls, operational timeline, receipts, Pulse, and queue.',
  chat: 'ASK — AI twin intelligence for profession identity, connected tools, and planning.',
  daily: 'Plan — Today lanes and scheduled work.',
  integrations: 'Plan — integration readiness and sync.',
  settings: 'Plan — account and workspace preferences.'
};

/**
 * Screen reader context for the shell title (hidden from sighted users — keeps chrome minimal).
 */
export const SHELL_TAB_SR_SUMMARY: Record<MobileShellTabId, string> = {
  workspace:
    'Plan and Operate — AI planning, human trust controls, connected platform actions, timelines, and receipts.',
  chat: 'ASK — command entry and AI twin intelligence.',
  daily: 'Plan — Today lanes and work areas.',
  integrations: 'Plan — Connect tools and sync readiness.',
  settings: 'Plan — Account and workspace setup.'
};

/** Sticky header wordmark — distinct from dock abbreviations. */
export const SHELL_SCREEN_TITLE: Record<MobileShellTabId, string> = {
  workspace: 'Plan / Operate',
  chat: 'ASK',
  daily: 'Plan · Today',
  integrations: 'Plan · Connect',
  settings: 'Plan · Setup'
};

/** Region landmark for the Plan stack `<section>` — matches header title (not internal tab ids). */
export function shellPlanStackLandmarkLabel(tab: MobileShellTabId): string {
  return SHELL_SCREEN_TITLE[tab];
}
