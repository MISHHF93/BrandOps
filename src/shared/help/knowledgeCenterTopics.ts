/**
 * Knowledge Center: static in-repo topics (no markdown pipeline).
 * Order reflects onboarding priority: surfaces first, then execution concepts.
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
  title: 'Every day in BrandOps',
  intro:
    'Treat the Dashboard Today area as your cockpit: scan the map, then execute the smallest set of high-leverage moves. Publishing and outreach stay manual-assist—copy, act in-channel, then mark status here.',
  steps: [
    {
      title: 'Open the Dashboard → Today',
      body: 'Use Today for the mission map, health readouts, Execution Center queue, and reminders. If you use section mode, jump to Today from the cockpit nav.'
    },
    {
      title: 'Run the Execution Center first',
      body: 'Work the ranked “do now” list before you drift into busywork. If Execution Center is off, Settings explains how to turn it back on.'
    },
    {
      title: 'Clear one pipeline motion',
      body: 'Advance a deal, log a follow-up, or close a loop in Pipeline CRM so revenue work does not stack silently.'
    },
    {
      title: 'Ship one presence or publishing item',
      body: 'Move the publishing queue or content drafts forward: copy the draft, post or send in the real channel, then update status in BrandOps.'
    },
    {
      title: 'Capture from Quick actions; configure in Settings',
      body: 'Use the toolbar popup for quick capture and counts. Reserve Settings for OAuth, integrations, backups, and layout—avoid mid-day settings rabbit holes.'
    }
  ]
};

export const knowledgeCenterTopics: KnowledgeCenterTopic[] = [
  {
    id: 'surfaces',
    title: 'Where BrandOps runs',
    summary:
      'Dashboard, Quick actions popup, Settings, and this Knowledge Center—each surface has a clear job.',
    paragraphs: [
      'BrandOps is a browser extension with a few full pages: the Dashboard (your cockpit), Quick actions (toolbar popup), Settings, and this Knowledge Center.',
      'The full dashboard can be one vertical page with four anchors (Today, Pipeline, Brand & content, Connections), or section mode that mounts one area at a time — choose under Settings → Core setup → Cockpit layout and density.',
      'Heavy configuration (OAuth client IDs, LinkedIn identity, backups) lives in Settings. Quick capture and counts stay in Quick actions.'
    ]
  },
  {
    id: 'first-run',
    title: 'First run and profile',
    summary:
      'Welcome introduces the product; sign-in and sign-up both live on that page (not separate extension pages).',
    paragraphs: [
      'After install, the Welcome tab introduces the product; continuing to the Dashboard marks the short cockpit checklist complete so you are not asked twice.',
      'Sign-in and account creation share welcome.html: default is sign in (no query). Create account: welcome.html?flow=signup. Legacy ?auth= is still accepted. OAuth: Google, GitHub, LinkedIn.',
      'If you skipped profile setup, you can complete it anytime from the first-run overlay when it appears, or tune brand fields under Brand & content → Brand vault.',
      'LinkedIn sign-in is optional and used for identity on the Welcome screen — configure it under Settings → Integrations.'
    ]
  },
  {
    id: 'today-execution',
    title: 'Today: mission map and execution',
    summary:
      'Today bundles the map, metrics, Execution Center, signals, and the scheduler for daily operator rhythm.',
    paragraphs: [
      'The Today area combines a mission map, health metrics, the Execution Center (ranked “do now” work), operator signals (local heuristics), and the Scheduler Engine for reminders.',
      'Execution Center can be disabled from Settings; when off, you will see a banner explaining how to turn it back on.',
      'Publishing and outreach are manual-assist flows: copy drafts, act in the real channel, then mark status in BrandOps.'
    ]
  },
  {
    id: 'connections',
    title: 'Connections vs Settings',
    summary:
      'Connections shows live status; Integration hub in Settings is where targets and artifacts are edited.',
    paragraphs: [
      'The Connections dashboard area shows status and links. OAuth targets, manual artifacts, and SSH nodes are edited in Settings → Integration hub.',
      'LinkedIn capture runs as a content script overlay on linkedin.com — it never auto-sends messages.'
    ]
  },
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    summary: 'Alt+M opens the compass; Ctrl/Cmd+K opens the Dashboard command palette.',
    paragraphs: [
      'Open the compass menu with Alt+M. From the Dashboard, Ctrl/Cmd+K opens the command palette for quick actions like new drafts or copying workspace JSON.',
      'Section shortcuts are documented inside the command palette when you open it from the Dashboard.'
    ]
  }
];
