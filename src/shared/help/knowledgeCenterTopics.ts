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
      body: 'Assistant is the default home — type commands or use Starters; lines beginning with ask: use hosted models when configured. Press ⌘K / Ctrl+K for the full catalogue. Planning Quick picks and Pulse live on Plan to avoid duplicating controls between tabs.'
    },
    {
      title: 'Open Plan for counts and queue',
      body: 'Tap **Plan** on the dock for live instruments and the soonest-first queue table — read-only context before you execute more commands.'
    },
    {
      title: 'Open Today for the cockpit digest',
      body: 'Use the Today tab (or mobile.html?section=today) for metrics, pipeline signals, publishing peeks, and connection counts. Lists are read-only — actions are buttons that open Chat or run a command immediately.'
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
      'Primary UI is mobile.html (Assistant + Workspace dock; deeper panels for Today / Integrations / Settings). welcome.html, dashboard.html, integrations.html, and help.html mount the same shell or this manual.',
    paragraphs: [
      'The product is a browser extension. **mobile.html** is the primary workspace: Assistant (default), Plan (dock), Today, Integrations, and Settings (Assistant + Plan are the dock; Plan surfaces a read-only **workspace profile** — edits live under Settings → Preferences). Deeper tabs use ⌘K or actions from Plan.',
      '**welcome.html** uses the same shell and lands on **Assistant** first — open **Plan** for the **Getting started** checklist (Plan / Today / palette / Settings / Help).',
      '**dashboard.html** loads the same shell; legacy ?section= workstream links redirect to mobile.html so deep links stay consistent.',
      '**integrations.html** is the Chrome options_ui entry (Integrations tab by default). **help.html** is this Knowledge Center.',
      'Use ?section= on mobile.html or integrations.html for tabs and cockpit workstreams (today, pipeline, brand-content, connections). See the mobile shell query parser in the codebase for the full token list.'
    ]
  },
  {
    id: 'first-run',
    title: 'First run and profile',
    summary: 'Welcome uses the mobile shell; sign-in and sign-up share welcome.html.',
    paragraphs: [
      'On **welcome.html** / **mobile.html** you start on **Assistant**. The **Getting started** checklist is on **Plan**: pipeline health, Pulse / Quick picks, **Today**, palette (**⌘K** / **Ctrl+K**), then **Settings** and **Help → First run and profile**.',
      '**Plan** can show **Finish setup** after you dismiss Getting started if placeholder identity fields remain — same destinations as **Edit profile** / Integrations / ⌘K.',
      'The **Operator twin (Encode → Align → Decode)** topic explains ingest (résumé + brand), precedence on hosted **ask:**, and how Today closes the execution loop.',
      'Sign-in and account creation share welcome.html: default is sign in (no query). Create account: welcome.html?flow=signup. Legacy ?auth= is still accepted where implemented.',
      'Under **Settings → Preferences**, pick an **Operating profile** preset (launch sprint, focused builder, etc.) and tap **Apply operating profile** — one action aligns cockpit layout/density, AI defaults, and cadence to match how you work.',
      'Operator and brand fields also surface on Today and in Settings forms; tune cadence and reminders under Settings when you need workspace-level changes.'
    ]
  },
  {
    id: 'operator-twin',
    title: 'Operator twin (Encode → Align → Decode)',
    summary:
      'One mental model: ingest résumé and operating context, keep an accurate operator model, then act to offload work and lift execution.',
    paragraphs: [
      '**Encode** — résumé / CV plain text, brand profile fields, live workspace entities, and integration signals all feed the same **operator twin** story (not disconnected “notification” blobs). Twin ingest for résumé lives under **Settings → Unified workspace** (same deep link: **mobile.html?section=settings#settings-resume-neural-phase**).',
      '**Align** — curated **Brand profile** wins on conflicts vs the compressed résumé artifact; the artifact supplements hosted **ask:** turns only. Nothing is uploaded until you send a hosted line; native / on-device paths do not silently ship the résumé blob.',
      '**Decode / act** — hosted Ask receives one assembled **operator twin** appendix in the system prompt; Today and Chat are where you close the loop (commands, digest, and optional **Execution check-in** vs your focus metric). See **Today: cockpit digest** for the read-only digest pattern.'
    ]
  },
  {
    id: 'chat-commands',
    title: 'Chat commands (agent vocabulary)',
    summary:
      'Commands map to deterministic routes (parseCommandRoute) before executeAgentWorkspaceCommand runs.',
    paragraphs: [
      'Examples that match the router: add note:, create follow up:, complete follow up:, draft outreach:, draft post:, reschedule posts …, pipeline health, update opportunity …, archive opportunity, restore opportunity, add contact:, update contact:, add content:, update publishing:, connect … source:, connect hubspot source:, connect linear source:, connect stripe source:, add source:, add integration artifact:, add ssh:, configure: …',
      'Starters in the Assistant tab are curated to these patterns; identical Quick picks stay on Plan so Ask is not cluttered. If a phrase is unsupported, the assistant explains what is available.',
      'Destructive phrases such as archive opportunity may ask for confirmation before running.',
      'Lines beginning with **ask:** use your configured **hosted** OpenAI-compatible endpoint when enabled; everything else stays on-device.',
      '**Operator twin — résumé ingest** is under **Settings → Unified workspace** (Phase R artifact). Paste or load plain text, then **Compress & save** — the artifact is sent only with hosted **ask:** lines (Brand profile still wins on conflicts). From Assistant use the twin ingest shortcut or **mobile.html?section=settings#settings-resume-neural-phase**. Help topic **Operator twin (Encode → Align → Decode)** explains precedence end-to-end.'
    ]
  },
  {
    id: 'today-execution',
    title: 'Today: cockpit digest (not a second CRM UI)',
    summary: 'Today combines metrics, intelligence signals, and peeks from the workspace snapshot.',
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
      'The **Integrations** tab lists sources, providers, artifacts, SSH targets, and **Add via Chat** presets for CRM (HubSpot, Salesforce, Pipedrive), issues (Linear, Jira), support (Zendesk), docs (Notion, Drive, Airtable), ads (Meta, LinkedIn Marketing), billing (Stripe), Microsoft 365, plus engineering staples (GitHub, Slack, webhook).',
      '**Today → Connections** summarizes counts and links to the packaged integrations page when useful.',
      'OAuth client configuration for the extension may still live in manifest-adjacent flows; workspace-level source creation uses Chat commands such as connect notion source: …',
      'Read **Integration registry (what is real today)** for local-first storage vs sync-hub slots and what “connected” means.'
    ]
  },
  {
    id: 'integration-registry',
    title: 'Integration registry (what is real today)',
    summary:
      'Hub sources are workspace records on this device. Automated vendor sync ships incrementally; the Pulse strip’s Sync hub counts Google, GitHub, and LinkedIn preferences only.',
    paragraphs: [
      'When you use **Add via Chat** or run **connect … source:** / **add source:**, BrandOps stores an **integration hub source** in extension-local storage. That row captures kind, display name, default artifact categories, and tags so Chat, Today, and Settings stay aligned — it does **not** by itself call vendor APIs or stream live CRM/issue/doc data.',
      '**Captured artifacts** under Technical inventory are workspace objects (you or the agent add them). Treat them as structured notes until a future connector pulls from an external system.',
      'The Pulse counters **Sources** vs **Sync hub** mean different things: **Sources** counts hub rows you registered; **Sync hub** reflects Google, GitHub, and LinkedIn **preference** rows from Settings (they may still show disconnected until OAuth is completed in your build).',
      'For backups and audits, use **Export workspace JSON** (Settings → Data safety). Multi-device continuity is manual until optional cloud sync exists.'
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
      'Ranking helpers use built-in defaults; hosted builds can layer brandops-intelligence-rules.json.',
    paragraphs: [
      'Content priority, outreach urgency, overdue risk, pipeline health, and publishing windows use fixed, explainable math.',
      'When you self-host a preview, maintainers may supply rules JSON or an environment URL so coefficients can be tuned without shipping a new binary.',
      'If no file or URL is provided, defaults stay in effect.',
      'Remote intelligence rules use validated defaults plus optional signed remote payloads — keep schemas versioned when extending.'
    ]
  }
];
