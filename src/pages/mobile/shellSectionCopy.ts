import type { MobileShellTabId } from './mobileShellQuery';

/** One-line map of the whole shell — use in headers and onboarding. */
export const SHELL_SECTIONS_LINE =
  'Five tabs — Pulse (timeline), Chat (commands), Today (cockpit), Integrations (sources), Settings (workspace prefs & data).';

/** @deprecated Use {@link SHELL_SECTIONS_LINE}. */
export const SHELL_FOUR_SECTIONS_LINE = SHELL_SECTIONS_LINE;

export const SHELL_SECTION_COPY: Record<
  MobileShellTabId,
  { headline: string; body: string }
> = {
  pulse: {
    headline: 'Pulse — what is due next',
    body: 'Read-only mix of follow-ups, publishing, scheduler, and outreach drafts — soonest first. Open a row in Chat to act; Today still has full cockpit sections.'
  },
  chat: {
    headline: 'Chat — command surface',
    body: 'The local agent runs deterministic routes (no cloud LLM required). Workspace totals below stay in sync; use Today for pipeline projection and deal lists, Integrations for the hub, Settings for export and full settings readout.'
  },
  daily: {
    headline: 'Today — cockpit',
    body: 'Execution pulse, weighted pipeline projection, opportunities to close, brand & content signals, and connections. Edits that change stored data still go through Chat commands or Settings forms.'
  },
  integrations: {
    headline: 'Integrations — hub',
    body: 'Sources, OAuth providers, synced artifacts, and SSH targets. Pipeline CRM and publishing queues are summarized on Today; run connect/add commands from Chat when you need custom phrasing.'
  },
  settings: {
    headline: 'Settings — trust & data',
    body: 'Read-only snapshot at top. Change stored values in Preferences. Assistant and templates are shortcuts; Advanced has dataset lineage, intelligence detail, export/import, and audit.'
  }
};
