import { quoteContextValue } from '../../services/interop/validation';
import type { BrandOpsData } from '../../types/domain';
import { buildPlatformAwareAskReadout } from '../ai/platformAwareAskContext';

export type PlatformActionPlatform = 'Gmail' | 'LinkedIn' | 'Google Calendar' | 'Notion' | 'Slack';

export interface PlatformActionCard {
  id: string;
  platform: PlatformActionPlatform;
  title: string;
  description: string;
  sourceContext: string[];
  approvalRequirement: string;
  command: string;
}

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function uniq(values: string[], cap = 5): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const t = compact(value);
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t.slice(0, 220));
    if (out.length >= cap) break;
  }
  return out;
}

function sourceContext(workspace: BrandOpsData, terms: string[]): string[] {
  const normalizedTerms = terms.map((term) => term.toLowerCase());
  return uniq(
    [
      ...workspace.integrationHub.sources
        .filter((source) =>
          normalizedTerms.some((term) =>
            `${source.kind} ${source.name} ${source.tags.join(' ')} ${source.notes}`
              .toLowerCase()
              .includes(term)
          )
        )
        .map((source) => `${source.name} (${source.status})`),
      ...workspace.integrationHub.artifacts
        .filter((artifact) =>
          normalizedTerms.some((term) =>
            `${artifact.artifactType} ${artifact.title} ${artifact.tags.join(' ')} ${artifact.summary}`
              .toLowerCase()
              .includes(term)
          )
        )
        .map((artifact) => `${artifact.title}: ${artifact.summary}`),
      ...workspace.integrationHub.liveFeed
        .filter((feed) =>
          normalizedTerms.some((term) =>
            `${feed.source} ${feed.title} ${feed.detail}`.toLowerCase().includes(term)
          )
        )
        .map((feed) => `${feed.source}: ${feed.title}`),
      ...workspace.notes
        .filter((note) =>
          normalizedTerms.some((term) =>
            `${note.title} ${note.detail}`.toLowerCase().includes(term)
          )
        )
        .map((note) => `${note.title}: ${note.detail}`)
    ],
    5
  );
}

function action(input: {
  id: string;
  platform: PlatformActionPlatform;
  title: string;
  description: string;
  sourceContext: string[];
  task: string;
  approvalRequirement?: string;
}): PlatformActionCard {
  const context = input.sourceContext.length
    ? input.sourceContext.join(' | ')
    : 'Connected platform metadata is available, but no approved summaries are attached yet.';
  return {
    id: input.id,
    platform: input.platform,
    title: input.title,
    description: input.description,
    sourceContext: input.sourceContext,
    approvalRequirement:
      input.approvalRequirement ??
      'Preview only. Human approval is required before sending, posting, scheduling, syncing, or creating external tasks.',
    command: `ask: ${quoteContextValue(input.task)}\n\nPlatform: ${quoteContextValue(input.platform)}\nSource context: ${quoteContextValue(context)}\nRules: Use only connected platform context and approved summaries. If required source details are missing, say what is missing. Do not execute externally. Include approval requirements and receipt expectations.`
  };
}

export function buildPlatformActionCards(workspace: BrandOpsData): PlatformActionCard[] {
  const connected = new Set(buildPlatformAwareAskReadout(workspace).connectedApps);
  const cards: PlatformActionCard[] = [];

  if (connected.has('Gmail')) {
    const context = sourceContext(workspace, ['gmail', 'email', 'mail']);
    cards.push(
      action({
        id: 'platform-gmail-draft-reply',
        platform: 'Gmail',
        title: 'Draft reply',
        description: 'Draft a grounded email reply from approved Gmail/email summaries.',
        sourceContext: context,
        task: 'Draft a Gmail reply using approved email summaries and the active twin voice.'
      }),
      action({
        id: 'platform-gmail-schedule-follow-up',
        platform: 'Gmail',
        title: 'Schedule follow-up',
        description: 'Create a follow-up plan from approved Gmail/email context.',
        sourceContext: context,
        task: 'Create a follow-up schedule from approved Gmail/email conversation context.'
      })
    );
  }

  if (connected.has('LinkedIn')) {
    const context = sourceContext(workspace, ['linkedin']);
    cards.push(
      action({
        id: 'platform-linkedin-draft-outreach',
        platform: 'LinkedIn',
        title: 'Draft outreach',
        description: 'Draft LinkedIn outreach grounded in profile and approved platform context.',
        sourceContext: context,
        task: 'Draft LinkedIn outreach using verified twin facts, positioning, and approved LinkedIn context.'
      }),
      action({
        id: 'platform-linkedin-generate-positioning',
        platform: 'LinkedIn',
        title: 'Generate positioning',
        description: 'Generate LinkedIn positioning based on approved professional context.',
        sourceContext: context,
        task: 'Generate LinkedIn positioning options using verified twin facts and approved LinkedIn context.'
      })
    );
  }

  if (connected.has('Google Calendar')) {
    const context = sourceContext(workspace, ['google-calendar', 'calendar', 'meeting']);
    cards.push(
      action({
        id: 'platform-calendar-summarize-day',
        platform: 'Google Calendar',
        title: 'Summarize day',
        description: 'Summarize the day from connected calendar/scheduler context.',
        sourceContext: context,
        task: 'Summarize my day using connected calendar context, scheduler tasks, and operational priorities.'
      }),
      action({
        id: 'platform-calendar-prep-meeting-notes',
        platform: 'Google Calendar',
        title: 'Prep meeting notes',
        description:
          'Prepare meeting notes from connected calendar and approved workspace context.',
        sourceContext: context,
        task: 'Prepare meeting notes from connected calendar context and approved workspace facts.'
      })
    );
  }

  if (connected.has('Notion')) {
    const context = sourceContext(workspace, ['notion', 'note', 'doc']);
    cards.push(
      action({
        id: 'platform-notion-generate-plan',
        platform: 'Notion',
        title: 'Generate plan from notes',
        description: 'Turn approved Notion/local notes into an executable PLAN draft.',
        sourceContext: context,
        task: 'Generate an execution plan from connected Notion notes and approved local note summaries.'
      })
    );
  }

  if (connected.has('Slack')) {
    const context = sourceContext(workspace, ['slack', 'thread', 'discussion']);
    cards.push(
      action({
        id: 'platform-slack-summarize-discussions',
        platform: 'Slack',
        title: 'Summarize discussions',
        description: 'Summarize approved Slack discussion context into decisions and risks.',
        sourceContext: context,
        task: 'Summarize approved Slack discussion context into decisions, risks, and next steps.'
      }),
      action({
        id: 'platform-slack-create-operational-tasks',
        platform: 'Slack',
        title: 'Create operational tasks',
        description: 'Convert approved Slack summaries into operational task proposals.',
        sourceContext: context,
        task: 'Create operational task proposals from approved Slack summaries. Do not create external tasks automatically.'
      })
    );
  }

  return cards;
}
