/**
 * Knowledge Center: static in-repo topics (no markdown pipeline).
 * Order reflects onboarding priority: surfaces first, then execution concepts.
 * Copy matches the **MobileApp** shell (`mobile.html` and siblings), not legacy dashboard pages.
 */
export interface KnowledgeCenterTopic {
  id: string;
  title: string;
  /** One-line preview on topic cards; full copy stays in paragraphs. */
  summary?: string;
  paragraphs: string[];
}

export interface KnowledgeCenterDailyStep {
  title: string;
  body: string;
}

export interface KnowledgeCenterDailyPlaybook {
  title: string;
  intro: string;
  steps: KnowledgeCenterDailyStep[];
}

/** Featured “start here” block for the Knowledge Center layout. */
export const knowledgeCenterDailyPlaybook: KnowledgeCenterDailyPlaybook = {
  title: 'Every day in BrandOps (mobile shell)',
  intro:
    'BrandOps is chatbot-first: the **Chat** tab runs workspace commands; the **Today** tab is a read-only cockpit digest (pipeline, brand, connections). Integrations and Settings round out the four bottom tabs. Your fastest loop: scan Today, then execute in Chat.',
  steps: [
    {
      title: 'Open Today for the cockpit digest',
      body: 'Use the Today tab (or mobile.html?section=today) for metrics, pipeline signals, publishing peeks, and connection counts. Lists are read-only — actions are buttons that open Chat or run a command immediately.'
    },
    {
      title: 'Run one command from Chat',
      body: 'Switch to Chat and type natural-language commands (examples: pipeline health, draft post: …, add note: …). Expand Command starters for role-based chips (sales vs growth). Results appear in the thread.'
    },
    {
      title: 'Clear one revenue or follow-up motion',
      body: 'From Today → Pipeline, use “Run in Chat” / outreach chips, or type update opportunity … / draft outreach … so deal and outreach state change in the workspace.'
    },
    {
      title: 'Ship one brand or publishing motion',
      body: 'From Today → Brand & content, use draft post or reschedule posts commands in Chat. Publishing rows are digest-only until you act via the agent.'
    },
    {
      title: 'Configure in Settings; connect in Integrations',
      body: 'Settings holds workspace prefs, presets, export/import, and audit. Integrations lists sources and Quick add — both complement Chat; they do not replace command execution.'
    }
  ]
};

export const knowledgeCenterTopics: KnowledgeCenterTopic[] = [
  {
    id: 'surfaces',
    title: 'Where BrandOps runs',
    summary:
      'Primary UI is mobile.html (four tabs). welcome.html, dashboard.html, integrations.html, and help.html mount the same shell or this manual.',
    paragraphs: [
      'The product is a browser extension. **mobile.html** is the primary workspace: Chat, Today (cockpit), Integrations, Settings.',
      '**welcome.html** uses the same shell with a first-run bias toward the Today tab so new users see the cockpit immediately.',
      '**dashboard.html** loads the same shell; legacy ?section= workstream links redirect to mobile.html so deep links stay consistent.',
      '**integrations.html** is the Chrome options_ui entry (Integrations tab by default). **help.html** is this Knowledge Center.',
      'Use ?section= on mobile.html or integrations.html for tabs and cockpit workstreams (today, pipeline, brand-content, connections). See the mobile shell query parser in the codebase for the full token list.'
    ]
  },
  {
    id: 'first-run',
    title: 'First run and profile',
    summary:
      'Welcome uses the mobile shell; sign-in and sign-up share welcome.html.',
    paragraphs: [
      'After install, **welcome.html** opens the app on **Today** first so you see pipeline and publishing signal before Chat.',
      'Sign-in and account creation share welcome.html: default is sign in (no query). Create account: welcome.html?flow=signup. Legacy ?auth= is still accepted where implemented.',
      'Operator and brand fields also surface on Today and in Settings forms; tune cadence and reminders under Settings when you need workspace-level changes.'
    ]
  },
  {
    id: 'chat-commands',
    title: 'Chat commands (agent vocabulary)',
    summary:
      'Commands map to deterministic routes (parseCommandRoute) before executeAgentWorkspaceCommand runs.',
    paragraphs: [
      'Examples that match the router: add note:, create follow up:, complete follow up:, draft outreach:, draft post:, reschedule posts …, pipeline health, update opportunity …, archive opportunity, restore opportunity, add contact:, update contact:, add content:, update publishing:, connect … source:, add source:, add integration artifact:, add ssh:, configure: …',
      'Starters in the Chat tab are curated to these patterns. If a phrase is unsupported, the assistant explains what is available.',
      'Destructive phrases such as archive opportunity may ask for confirmation before running.'
    ]
  },
  {
    id: 'today-execution',
    title: 'Today: cockpit digest (not a second CRM UI)',
    summary:
      'Today combines metrics, intelligence signals, and peeks from the workspace snapshot.',
    paragraphs: [
      'Today shows scheduler tasks, notes, contacts, pipeline projection, outreach templates/history, opportunities, brand vault preview, content library slice, publishing queue slice, and companies.',
      'Row actions that say “Open in Chat” prime the composer; chips that run commands switch to Chat and execute so you always see the thread.',
      'Heavy spreadsheet-style editing is intentionally out of scope — use Chat commands or future dedicated surfaces if product adds them.'
    ]
  },
  {
    id: 'connections',
    title: 'Integrations vs Settings vs Today · Connections',
    summary:
      'Integrations tab and Today · Connections both summarize connectivity; Chat registers new sources.',
    paragraphs: [
      'The **Integrations** tab lists sources, providers, artifacts, SSH targets, and Quick add chips.',
      '**Today → Connections** summarizes counts and links to the packaged integrations page when useful.',
      'OAuth client configuration for the extension may still live in manifest-adjacent flows; workspace-level source creation uses Chat commands such as connect notion source: …'
    ]
  },
  {
    id: 'shortcuts',
    title: 'Shortcuts and navigation',
    summary: 'Bottom tab bar and ?section= deep links are the primary navigation.',
    paragraphs: [
      'Use the bottom nav to switch tabs. Workstream pills on Today update the URL (e.g. ?section=pipeline) and scroll to the matching section.',
      'From Chat, “Other sections” buttons jump to Today, Integrations, or Settings without losing your thread.'
    ]
  },
  {
    id: 'visual-wayfinding',
    title: 'Visual wayfinding (icons)',
    summary:
      'Icons repeat the same meaning as labels on tabs and section headers.',
    paragraphs: [
      'Each bottom tab has a consistent icon. Today workstreams use color-tinted cards so Pipeline, Brand & content, and Connections are easy to scan.',
      'Icons are decorative complements: labels and headings remain the source of truth for screen readers.'
    ]
  },
  {
    id: 'intelligence-tuning',
    title: 'Optional intelligence tuning',
    summary:
      'Ranking helpers use built-in defaults; hosted builds can layer brandops-intelligence-rules.json.',
    paragraphs: [
      'Content priority, outreach urgency, overdue risk, pipeline health, and publishing windows use fixed, explainable math.',
      'When you self-host a preview, maintainers may supply rules JSON or an environment URL so coefficients can be tuned without shipping a new binary.',
      'If no file or URL is provided, defaults stay in effect.',
      'Repository contributors: see docs/intelligence-rules-remote-layers.md for layering and validation notes.'
    ]
  }
];
