import { type CommandRoute, parseCommandRoute } from '../../services/agent/intent/commandIntent';

/**
 * “Intent-first” copy for Chat — the `command` string must still satisfy {@link parseCommandRoute}
 * and the agent engine; titles are for discovery, not protocol.
 */
export type BrandOpsChatIntent = {
  id: string;
  groupId: 'essentials' | 'pipeline' | 'content' | 'connect';
  title: string;
  subtitle: string;
  command: string;
  /** Bumps default ordering in empty-input chips */
  pickWeight: number;
  /** If false, only appears in typeahead, not the horizontal chips */
  showAsChip: boolean;
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

const blob = (i: BrandOpsChatIntent) =>
  norm([i.title, i.subtitle, i.command, i.id.replace(/-/g, ' ')].join(' '));

const CHAT_INTENT_RAW: BrandOpsChatIntent[] = [
  {
    id: 'check-pipeline',
    groupId: 'essentials',
    title: 'Check pipeline',
    subtitle: 'Health and ranked opportunities',
    command: 'pipeline health',
    pickWeight: 100,
    showAsChip: true
  },
  {
    id: 'jot-note',
    groupId: 'essentials',
    title: 'Jot a note',
    subtitle: 'Capture a thought to the workspace',
    command: 'add note: follow up on launch feedback',
    pickWeight: 90,
    showAsChip: true
  },
  {
    id: 'follow-up',
    groupId: 'essentials',
    title: 'New follow-up',
    subtitle: 'Add something to your task list',
    command: 'create follow up: check warm lead status',
    pickWeight: 88,
    showAsChip: true
  },
  {
    id: 'outreach',
    groupId: 'pipeline',
    title: 'Draft outreach',
    subtitle: 'Email or DM angle from context',
    command: 'draft outreach: follow up on warm lead from demo',
    pickWeight: 70,
    showAsChip: true
  },
  {
    id: 'add-contact',
    groupId: 'pipeline',
    title: 'Add a contact',
    subtitle: 'Name, org, and role in one line',
    command: 'add contact: Alex Rivera, Northwind Labs, Founder',
    pickWeight: 65,
    showAsChip: true
  },
  {
    id: 'opportunity',
    groupId: 'pipeline',
    title: 'Move a deal',
    subtitle: 'Update opportunity stage',
    command: 'update opportunity to proposal',
    pickWeight: 62,
    showAsChip: true
  },
  {
    id: 'post',
    groupId: 'content',
    title: 'Draft a post',
    subtitle: 'Social copy from a theme',
    command: 'draft post: weekly insight from the workspace',
    pickWeight: 60,
    showAsChip: true
  },
  {
    id: 'content-idea',
    groupId: 'content',
    title: 'Add content idea',
    subtitle: 'Save an article or idea for later',
    command: 'add content: weekly insight memo',
    pickWeight: 55,
    showAsChip: true
  },
  {
    id: 'reschedule',
    groupId: 'essentials',
    title: 'Reschedule publishing',
    subtitle: 'Move a scheduled post to a new time',
    command: 'reschedule publishing: move next post to Friday 9am',
    pickWeight: 50,
    showAsChip: false
  },
  {
    id: 'complete-fu',
    groupId: 'essentials',
    title: 'Complete follow-up',
    subtitle: 'Mark a task as done',
    command: 'complete follow up: call notes logged',
    pickWeight: 48,
    showAsChip: false
  },
  {
    id: 'notion',
    groupId: 'connect',
    title: 'Connect Notion',
    subtitle: 'Link a source workspace for ideas',
    command: 'connect notion source: Growth workspace',
    pickWeight: 58,
    showAsChip: true
  },
  {
    id: 'add-source',
    groupId: 'connect',
    title: 'Connect a source',
    subtitle: 'Generic “connect” phrasing also works',
    command: 'add source: HubSpot pipeline feed',
    pickWeight: 45,
    showAsChip: false
  },
  {
    id: 'update-content',
    groupId: 'content',
    title: 'Tweak a draft',
    subtitle: 'Update an existing item',
    command: 'update content: tighten hook on weekly insight',
    pickWeight: 40,
    showAsChip: false
  },
  {
    id: 'configure',
    groupId: 'essentials',
    title: 'Change workspace style',
    subtitle: 'Settings-style configure line',
    command: 'configure: tone: concise, no emojis in drafts',
    pickWeight: 35,
    showAsChip: false
  }
];

type IntentRow = BrandOpsChatIntent & { _blob: string };

const INTENT_INDEX: IntentRow[] = CHAT_INTENT_RAW.map((i) => ({ ...i, _blob: blob(i) }));

function stripRow(i: IntentRow): BrandOpsChatIntent {
  const { _blob, ...rest } = i;
  void _blob;
  return rest;
}

export const BRANDOPS_CHAT_INTENTS: BrandOpsChatIntent[] = CHAT_INTENT_RAW;

/** Curated example groups (same source as the composer). */
export const CHAT_EXAMPLE_GROUPS: { id: string; label: string; commandIds: string[] }[] = [
  {
    id: 'essentials',
    label: 'Start fast',
    commandIds: ['check-pipeline', 'jot-note', 'follow-up']
  },
  {
    id: 'pipeline',
    label: 'Pipeline & people',
    commandIds: ['outreach', 'add-contact', 'opportunity']
  },
  {
    id: 'content',
    label: 'Content & calendar',
    commandIds: ['post', 'content-idea', 'reschedule']
  },
  { id: 'connect', label: 'Connections', commandIds: ['notion', 'add-source'] }
];

const byId = new Map(BRANDOPS_CHAT_INTENTS.map((i) => [i.id, i]));

function intentForId(id: string): BrandOpsChatIntent | undefined {
  return byId.get(id);
}

export function getExampleGroupCommands() {
  return CHAT_EXAMPLE_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    commands: g.commandIds
      .map((cid) => intentForId(cid))
      .filter((x): x is BrandOpsChatIntent => Boolean(x))
      .map((i) => i.command)
  }));
}

export function suggestIntents(
  query: string,
  opts: { recentLines: string[]; limit: number; chipCap: number }
): { list: BrandOpsChatIntent[]; chips: BrandOpsChatIntent[] } {
  const { recentLines, limit, chipCap } = opts;
  const recent = new Set(recentLines.map(norm).filter(Boolean));
  const q = norm(query);
  const score = (i: BrandOpsChatIntent & { _blob: string }) => {
    let s = i.pickWeight;
    if (recent.has(norm(i.command))) s += 30;
    if (q) {
      if (i._blob.includes(q)) s += 80;
      if (i.command.toLowerCase().includes(q)) s += 50;
      if (i.title.toLowerCase().includes(q)) s += 40;
    } else s += 0;
    for (const r of recent) {
      if (r && i._blob.includes(r.slice(0, Math.min(20, r.length)))) s += 5;
    }
    return s;
  };

  const pool = INTENT_INDEX;
  if (!q) {
    const ordered = [...pool].sort((a, b) => score(b) - score(a));
    const seen = new Set<string>();
    const diversified: typeof ordered = [];
    for (const g of ['essentials', 'pipeline', 'content', 'connect'] as const) {
      const next = ordered.find((i) => i.groupId === g && !seen.has(i.id));
      if (next) {
        diversified.push(next);
        seen.add(next.id);
      }
    }
    for (const i of ordered) {
      if (diversified.length >= chipCap) break;
      if (!seen.has(i.id) && i.showAsChip) {
        diversified.push(i);
        seen.add(i.id);
      }
    }
    const chips = diversified
      .filter((c) => c.showAsChip)
      .slice(0, chipCap)
      .map(stripRow);
    return { list: ordered.slice(0, limit).map(stripRow), chips };
  }

  const ranked = pool
    .map((i) => ({ i, s: score(i) }))
    .filter(({ i, s }) => s > i.pickWeight - 1 || i._blob.includes(q))
    .sort((a, b) => b.s - a.s)
    .map(({ i }) => stripRow(i));
  return { list: ranked.slice(0, limit), chips: [] };
}

const ROUTE_PLAIN: Record<CommandRoute, string> = {
  'add-note': 'Adds a note to your workspace',
  'reschedule-publishing': 'Reschedules a publishing post',
  'add-integration-source': 'Connects a new source (Notion, etc.)',
  'add-integration-artifact': 'Attaches an integration artifact',
  'add-ssh-target': 'Registers an SSH target for automation',
  'add-outreach-draft': 'Drafts outreach text',
  'add-publishing-draft': 'Drafts a social post',
  'archive-opportunity': 'Archives a deal (needs confirmation if destructive)',
  'restore-opportunity': 'Restores a deal from archive',
  'complete-follow-up': 'Marks a follow-up complete',
  'create-follow-up': 'Creates a new follow-up',
  'add-contact': 'Adds or enriches a contact',
  'update-contact-relationship': 'Updates a relationship stage',
  'update-contact': 'Updates a contact’s details',
  'add-content': 'Adds a content item',
  'update-content': 'Updates existing content',
  'duplicate-content': 'Duplicates a content item',
  'archive-content': 'Archives content (needs confirmation if destructive)',
  'update-publishing': 'Changes publishing / queue',
  'configure-workspace': 'Applies workspace settings',
  'pipeline-health': 'Runs a pipeline check',
  'update-opportunity': 'Updates a deal or stage',
  unsupported: 'We will do our best to interpret or guide you to a supported request'
};

export function getInputRouteHint(text: string): string | null {
  const t = text.trim();
  if (t.length < 2) return null;
  const route = parseCommandRoute(t);
  return ROUTE_PLAIN[route] ?? null;
}

export function getIntentByCommandLine(command: string): BrandOpsChatIntent | undefined {
  const n = norm(command);
  return BRANDOPS_CHAT_INTENTS.find((i) => norm(i.command) === n);
}
