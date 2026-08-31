import type { MobileShellTabId } from './mobileShellQuery';

/**
 * Dock button tooltips: short clues only — no duplicating tab labels.
 */
export const SHELL_TAB_PURPOSE: Record<MobileShellTabId, string> = {
  workspace:
    'Workspace — plans, approvals, execution receipts, and your professional operating feed.',
  chat: 'Ask My Twin — twin-grounded strategic thinking with expert routing and Ask → Plan conversion.',
  daily: 'Cockpit — daily focus board, predictions, quick actions, and next-best-move intelligence.',
  integrations: 'Integrations — connected data sources, agents, sync hubs, and workspace I/O.',
  settings: 'Settings — Digital Twin creation, AI routing config, voice preferences, and workspace model.'
};

/**
 * Screen reader context for the shell title (hidden from sighted users — keeps chrome minimal).
 */
export const SHELL_TAB_SR_SUMMARY: Record<MobileShellTabId, string> = {
  workspace: 'Workspace — operational feed, plans, approvals, execution receipts, and timeline.',
  chat: 'Ask My Twin — twin-grounded conversation with expert routing and plan conversion.',
  daily: 'Cockpit — daily focus board, predictions, and next-best-move intelligence.',
  integrations: 'Integrations — connected data sources, agents, and sync hub readiness.',
  settings: 'Settings — Digital Twin, AI configuration, voice preferences, and workspace model.'
};

/** Sticky header wordmark — distinct from dock abbreviations. */
export const SHELL_SCREEN_TITLE: Record<MobileShellTabId, string> = {
  workspace: 'Workspace',
  chat: 'Ask My Twin',
  daily: 'Cockpit',
  integrations: 'Integrations',
  settings: 'Settings'
};

/** Region landmark for the shell page `<section>` — matches header title (not internal tab ids). */
export function shellPlanStackLandmarkLabel(tab: MobileShellTabId): string {
  return SHELL_SCREEN_TITLE[tab];
}
