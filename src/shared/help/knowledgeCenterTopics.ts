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
    'You land on **Assistant**. Open **Plan** on the dock for the dismissible **Getting started** checklist (five steps): pipeline health, Pulse / Quick picks, **Today**, **⌘K / Ctrl+K**, then **Settings** and **Help — First run**. Assistant stays focused on chat — pulse and curated commands stay on Plan. The dock is **Ask** and **Plan** only. Help → **Operator twin (Encode → Align → Decode)** names the spine: ingest context, keep the model accurate, act from Today and Chat.',
  steps: [
    {
      title: 'Run one command from Assistant',
      body: 'Assistant is the default home — type commands or use Starters. Recognized workspace commands run locally; other Chat requests use the hosted model only when you explicitly configure and enable it. Press ⌘K / Ctrl+K for the full catalogue. Planning Quick picks and Pulse live on Plan to avoid duplicating controls between tabs.'
    },
    {
      title: 'Open Plan for counts and queue',
      body: 'Tap **Plan** on the dock for live instruments and the soonest-first queue table — read-only context before you execute more commands.'
    },
    {
      title: 'Open Today for the cockpit digest',
      body: 'Use the Today tab for metrics, pipeline signals, publishing peeks, and connection counts. Lists are read-only — actions are buttons that open Chat or run a command immediately.'
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
      'The main app opens the Assistant and Plan dock, with deeper panels for Today, Integrations, and Settings. Separate windows open the Integrations hub, Help, or the primary app.',
    paragraphs: [
      'The product runs as a browser extension. The primary workspace shows Assistant (default), Plan (dock), Today, Integrations, and Settings. Plan surfaces a read-only workspace profile — edits live under Settings → Preferences. Deeper tabs use the command palette or actions from Plan.',
      'The main app opens to Assistant by default. The Getting started checklist is on Plan: pipeline health, Pulse, Quick picks, Today, the command palette, then Settings and Help.',
      'A legacy dashboard window loads the same shell; workstream links redirect to the primary app so deep links stay consistent.',
      'The Integrations hub opens the Integrations tab by default. The Help page opens this Knowledge Center.',
      'Use the bottom tab bar and workstream pills to navigate. Workstream pills on Today scroll to the matching section.'
    ]
  },
  {
    id: 'first-run',
    title: 'First run and profile',
    summary:
      'The welcome screen uses the same shell; its account controls select local access only.',
    paragraphs: [
      'On the welcome screen you start on Assistant. The Getting started checklist is on Plan: pipeline health, Pulse, Quick picks, Today, the command palette, then Settings and Help.',
      'Plan can show Finish setup after you dismiss Getting started if placeholder identity fields remain — same destinations as Edit profile, Integrations, or the command palette.',
      'The Operator twin (Encode → Align → Decode) topic explains ingest (résumé + brand), precedence on hosted Assistant requests, and how Today closes the execution loop.',
      'The provider-labelled controls on the welcome screen choose an on-device sign-in provider only. They do not use server sign-in, verify an email address, or create a server session.',
      'Under Settings → Preferences, pick an Operating profile preset (launch sprint, focused builder, etc.) and tap Apply operating profile — one action aligns cockpit layout, density, AI defaults, and cadence to match how you work.',
      'Operator and brand fields also surface on Today and in Settings forms; tune cadence and reminders under Settings when you need workspace-level changes.'
    ]
  },
  {
    id: 'operator-twin',
    title: 'Operator twin (Encode → Align → Decode)',
    summary:
      'One mental model: ingest résumé and operating context, keep an accurate operator model, then act to offload work and lift execution.',
    paragraphs: [
      '**Encode** — résumé / CV plain text, brand profile fields, live workspace entities, and integration signals all feed the same **operator twin** story (not disconnected “notification” blobs). Twin ingest for résumé lives under **Settings → Unified workspace** (same section in Settings → Unified workspace).',
      '**Align** — curated **Brand profile** wins on conflicts vs the compressed résumé artifact; the artifact supplements hosted Assistant turns only. Nothing is transmitted to the AI endpoint until you submit a request while hosted AI is enabled; local commands do not silently ship the résumé blob.',
      '**Decode / act** — hosted Ask receives one assembled **operator twin** appendix in the system prompt; Today and Chat are where you close the loop (commands, digest, and optional **Execution check-in** vs your focus metric). See **Today: cockpit digest** for the read-only digest pattern.'
    ]
  },
  {
    id: 'chat-commands',
    title: 'Chat commands (agent vocabulary)',
    summary:
      'Recognized command phrases trigger workspace actions; anything else is handled as a conversational ask.',
    paragraphs: [
      'Examples of recognized commands: add note:, create follow up:, complete follow up:, draft outreach:, draft post:, reschedule posts …, pipeline health, update opportunity …, archive opportunity, restore opportunity, add contact:, update contact:, add content:, update publishing:, connect … source:, connect hubspot source:, connect linear source:, connect stripe source:, add source:, add integration artifact:, add ssh:, configure: …',
      'Starters in the Assistant tab are curated to these patterns; identical Quick picks stay on Plan so Ask is not cluttered. If a phrase is unsupported, the assistant explains what is available.',
      'Destructive phrases such as archive opportunity may ask for confirmation before running.',
      'Recognized workspace command patterns stay on-device. Other Chat submissions, including explicit **ask:** lines, use your configured OpenAI-compatible endpoint only when hosted mode is enabled.',
      '**Operator twin — résumé ingest** is under **Settings → Unified workspace**. Paste or load plain text, then **Compress & save** — the artifact can be included with hosted Assistant requests (Brand profile still wins on conflicts). From Assistant use the twin ingest shortcut. Help topic **Operator twin (Encode → Align → Decode)** explains precedence end-to-end.'
    ]
  },
  {
    id: 'today-execution',
    title: 'Today: cockpit digest (not a second CRM UI)',
    summary: 'Today combines metrics, intelligence signals, and peeks from the workspace snapshot.',
    paragraphs: [
      'Today shows scheduler tasks, notes, contacts, pipeline projection, outreach templates/history, opportunities, brand vault, content library slice, publishing queue slice, and companies.',
      'Row actions prime the composer or switch to Chat and run a command so you always see the thread.',
      'Heavy spreadsheet-style editing is intentionally out of scope — use Chat commands or future dedicated surfaces if product adds them.'
    ]
  },
  {
    id: 'connections',
    title: 'Integrations vs Settings vs Today · Connections',
    summary:
      'Integrations tab and Today · Connections both summarize connectivity; Chat registers new sources.',
    paragraphs: [
      'The **Integrations** tab lists sources, providers, artifacts, servers, and **Add via Chat** presets for CRM (HubSpot, Salesforce, Pipedrive), issues (Linear, Jira), support (Zendesk), docs (Notion, Drive, Airtable), ads (Meta, LinkedIn Marketing), billing (Stripe), Microsoft 365, plus engineering staples (GitHub, Slack, webhook).',
      '**Today → Connections** summarizes counts and links to the packaged Integrations hub when useful.',
      'Server sign-in is not available yet. Workspace-level source creation uses Chat commands such as connect notion source: … and creates local registry records only.',
      'Read **Integration registry (what is real today)** for local-first storage vs sync-hub slots and what “connected” means.'
    ]
  },
  {
    id: 'integration-registry',
    title: 'Integration registry (what is real today)',
    summary:
      'Hub sources are workspace records on this device. Automated vendor sync ships incrementally; the Pulse strip’s Sync hub counts Google, GitHub, and LinkedIn preferences only.',
    paragraphs: [
      'When you use **Add via Chat** or run **connect … source:** / **add source:**, BrandOps stores an **integration hub source** in local storage. That row captures kind, display name, default artifact categories, and tags so Chat, Today, and Settings stay aligned — it does **not** by itself call vendor APIs or stream live CRM/issue/doc data.',
      '**Captured artifacts** under Technical inventory are workspace objects (you or the agent add them). Treat them as structured notes until a future connector pulls from an external system.',
      'The Pulse counters **Sources** vs **Sync hub** mean different things: **Sources** counts hub rows you registered; **Sync hub** reflects Google, GitHub, and LinkedIn preference rows from Settings. These rows are not verified provider sessions yet.',
      'For backups and audits, use **Export workspace JSON** (Settings → Data safety). Multi-device continuity is manual until optional cloud sync exists.'
    ]
  },
  {
    id: 'shortcuts',
    title: 'Shortcuts and navigation',
    summary: 'Bottom tab bar switches between the main BrandOps sections.',
    paragraphs: [
      'Use the bottom nav to switch tabs. Workstream pills on Today scroll to the matching section.',
      'From Chat, "Other sections" buttons jump to Today, Integrations, or Settings without losing your thread.'
    ]
  },
  {
    id: 'visual-wayfinding',
    title: 'Visual wayfinding (icons)',
    summary: 'Icons repeat the same meaning as labels on tabs and section headers.',
    paragraphs: [
      'Each bottom tab has a consistent icon. Today workstreams use color-tinted cards so Pipeline, Brand & content, and Connections are easy to scan.',
      'Icons are decorative complements: labels and headings remain the source of truth for screen readers.'
    ]
  },
  {
    id: 'intelligence-tuning',
    title: 'Optional intelligence tuning',
    summary:
      'Ranking helpers use built-in defaults; hosted builds can layer custom intelligence rules.',
    paragraphs: [
      'Content priority, outreach urgency, overdue risk, pipeline health, and publishing windows use fixed, explainable math.',
      'When you self-host BrandOps, maintainers may supply custom rules so scoring can be tuned to your workspace.',
      'If no custom rules file is provided, defaults stay in effect.'
    ]
  }
];
