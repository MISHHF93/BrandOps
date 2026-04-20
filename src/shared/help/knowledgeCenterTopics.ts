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
  },
  {
    id: 'visual-wayfinding',
    title: 'Visual wayfinding (icons)',
    summary:
      'Icons repeat the same meaning as labels: compass destinations, the “you are here” strip, and major section headers.',
    paragraphs: [
      'The right-hand compass lists Dashboard areas and other windows. Each row shows a small icon plus text so you can scan the map before reading descriptions.',
      'The strip under the header (BrandOps / …) shows the same icon family for your current section so orientation stays consistent when you scroll.',
      'Collapsible panels such as Workspace map, Cockpit metrics, and Advanced diagnostics include a leading icon in the summary row to hint at what is inside.',
      'Icons are decorative complements: labels and headings remain the source of truth for screen readers and clarity.'
    ]
  },
  {
    id: 'intelligence-tuning',
    title: 'Optional intelligence tuning',
    summary:
      'Ranking helpers always work offline from built-in defaults; hosted or preview builds can layer a small JSON patch.',
    paragraphs: [
      'Content priority, outreach urgency, overdue risk, pipeline health, publishing windows, and template matching use fixed, explainable math in the extension.',
      'When you self-host a web preview (or an internal build), maintainers may place `brandops-intelligence-rules.json` next to the app or set an environment URL so coefficients can be tuned without shipping a new binary.',
      'If no file or URL is provided, nothing changes: defaults stay in effect and the cockpit behaves the same as a stock install.',
      'Repository contributors: see `docs/intelligence-rules-remote-layers.md` for the full layering, validation, and security notes.'
    ]
  }
];
