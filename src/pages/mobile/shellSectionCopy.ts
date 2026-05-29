import type { MobileShellTabId } from './mobileShellQuery';

/**
 * Dock button tooltips: short clues only — no duplicating tab labels.
 */
export const SHELL_TAB_PURPOSE: Record<MobileShellTabId, string> = {
  workspace: 'Plan — operational workspace, approvals, opportunities, plans, activity, and receipts.',
  chat: 'Ask My Twin — focused conversation for questions, brainstorming, analysis, and drafts.',
  daily: 'Plan — activity feed and scheduled work.',
  integrations: 'Plan — sources and integration readiness.',
  settings: 'Plan — setup, account, and workspace preferences.'
};

/**
 * Screen reader context for the shell title (hidden from sighted users — keeps chrome minimal).
 */
export const SHELL_TAB_SR_SUMMARY: Record<MobileShellTabId, string> = {
  workspace: 'Plan — operational command board, approvals, plans, opportunities, timelines, and receipts.',
  chat: 'Ask My Twin — conversation-only AI twin intelligence.',
  daily: 'Plan — Activity feed and work areas.',
  integrations: 'Plan — Sources and sync readiness.',
  settings: 'Plan — Setup, account, and workspace preferences.'
};

/** Sticky header wordmark — distinct from dock abbreviations. */
export const SHELL_SCREEN_TITLE: Record<MobileShellTabId, string> = {
  workspace: 'Plan',
  chat: 'Ask My Twin',
  daily: 'Plan · Activity',
  integrations: 'Plan · Sources',
  settings: 'Plan · Setup'
};

/** Region landmark for the Plan stack `<section>` — matches header title (not internal tab ids). */
export function shellPlanStackLandmarkLabel(tab: MobileShellTabId): string {
  return SHELL_SCREEN_TITLE[tab];
}
