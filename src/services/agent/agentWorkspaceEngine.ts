import { BrandOpsData, IntegrationSourceKind, OpportunityStage, PublishingItem } from '../../types/domain';
import { scheduler } from '../scheduling/scheduler';
import { storageService } from '../storage/storage';
import { applyAiSettingsOperations, buildAiSettingsPlan } from '../ai/aiSettingsMode';
import { parseCommandRoute } from './intent/commandIntent';

export type AgentAction =
  | 'add-note'
  | 'reschedule-publishing'
  | 'add-integration-source'
  | 'add-integration-artifact'
  | 'add-ssh-target'
  | 'add-outreach-draft'
  | 'add-publishing-draft'
  | 'update-opportunity-stage'
  | 'update-opportunity'
  | 'archive-opportunity'
  | 'restore-opportunity'
  | 'create-follow-up'
  | 'complete-follow-up'
  | 'add-contact'
  | 'update-contact'
  | 'update-contact-relationship'
  | 'add-content-item'
  | 'update-content-item'
  | 'duplicate-content-item'
  | 'archive-content-item'
  | 'update-publishing-item'
  | 'configure-workspace'
  | 'unsupported';

export interface AgentWorkspaceCommand {
  text: string;
  actorName?: string;
  source: 'chatbot-web' | 'chatbot-mobile' | 'telegram' | 'whatsapp';
}

export interface AgentWorkspaceResult {
  ok: boolean;
  action: AgentAction;
  summary: string;
}

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const trimText = (value: string, fallback = '', maxLength = 400) => {
  const normalized = value.trim();
  if (!normalized) return fallback;
  return normalized.slice(0, maxLength);
};

const WEEKDAYS: Array<{ tokens: string[]; value: number }> = [
  { tokens: ['sunday', 'sun'], value: 0 },
  { tokens: ['monday', 'mon'], value: 1 },
  { tokens: ['tuesday', 'tue', 'tues'], value: 2 },
  { tokens: ['wednesday', 'wed'], value: 3 },
  { tokens: ['thursday', 'thu', 'thur', 'thurs'], value: 4 },
  { tokens: ['friday', 'fri'], value: 5 },
  { tokens: ['saturday', 'sat'], value: 6 }
];

const parseTargetDate = (text: string): Date | null => {
  const lower = text.toLowerCase();
  const now = new Date();
  const target = new Date(now);
  if (lower.includes('tomorrow')) {
    target.setDate(target.getDate() + 1);
    return target;
  }
  for (const weekday of WEEKDAYS) {
    if (weekday.tokens.some((token) => lower.includes(token))) {
      const delta = (weekday.value - target.getDay() + 7) % 7 || 7;
      target.setDate(target.getDate() + delta);
      return target;
    }
  }
  return null;
};

const parseClock = (text: string) => {
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!match) return { hour: 11, minute: 0 };
  const rawHour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  if (!Number.isFinite(rawHour) || !Number.isFinite(minute) || rawHour < 1 || rawHour > 12) {
    return { hour: 11, minute: 0 };
  }
  return { hour: match[3].toLowerCase() === 'pm' ? (rawHour % 12) + 12 : rawHour % 12, minute };
};

const parseIntegrationKind = (text: string): IntegrationSourceKind => {
  const lower = text.toLowerCase();
  if (lower.includes('notion')) return 'notion';
  if (lower.includes('slack')) return 'slack';
  if (lower.includes('github')) return 'github';
  if (lower.includes('webhook')) return 'webhook';
  if (lower.includes('drive')) return 'google-drive';
  if (lower.includes('rss')) return 'rss';
  if (lower.includes('workspace')) return 'google-workspace';
  return 'custom-api';
};

const parseOpportunityStage = (text: string): OpportunityStage | null => {
  const lower = text.toLowerCase();
  if (lower.includes('discovery')) return 'discovery';
  if (lower.includes('proposal')) return 'proposal';
  if (lower.includes('negotiation')) return 'negotiation';
  if (lower.includes('won')) return 'won';
  if (lower.includes('lost')) return 'lost';
  if (lower.includes('prospect')) return 'prospect';
  return null;
};

const parseNumber = (text: string, label: string): number | null => {
  const pattern = new RegExp(`${label}\\s*(\\d{1,9})`, 'i');
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

const parseAfterColon = (text: string, fallback = '') => {
  const raw = text.split(':').slice(1).join(':');
  return trimText(raw || fallback, fallback, 5000);
};

const parsePublishingStatus = (
  text: string
): 'queued' | 'due-soon' | 'ready-to-post' | 'posted' | 'skipped' | null => {
  const lower = text.toLowerCase();
  if (lower.includes('ready')) return 'ready-to-post';
  if (lower.includes('queued') || lower.includes('queue')) return 'queued';
  if (lower.includes('due-soon') || lower.includes('due soon')) return 'due-soon';
  if (lower.includes('posted')) return 'posted';
  if (lower.includes('skipped') || lower.includes('skip')) return 'skipped';
  return null;
};

const withScheduler = async (next: BrandOpsData) => {
  const merged = { ...next, scheduler: scheduler.reconcile(next) };
  return storageService.setData(merged);
};

const addNote = async (workspace: BrandOpsData, command: AgentWorkspaceCommand): Promise<AgentWorkspaceResult> => {
  const detail = trimText(command.text.split(':').slice(1).join(':') || command.text, '', 1200);
  if (!detail) return { ok: false, action: 'add-note', summary: 'Note detail was empty.' };
  const now = new Date().toISOString();
  const actor = trimText(command.actorName ?? command.source, command.source, 90);
  await withScheduler({
    ...workspace,
    notes: [
      {
        id: uid('note'),
        entityType: 'company',
        entityId: 'agent-chat',
        title: `Agent note from ${actor}`,
        detail,
        createdAt: now
      },
      ...workspace.notes
    ]
  });
  return { ok: true, action: 'add-note', summary: 'Note added to workspace.' };
};

const reschedulePublishing = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const targetDate = parseTargetDate(command.text);
  if (!targetDate) {
    return { ok: false, action: 'reschedule-publishing', summary: 'Include a day like tomorrow or Friday.' };
  }
  const clock = parseClock(command.text);
  targetDate.setHours(clock.hour, clock.minute, 0, 0);
  const targetIso = targetDate.toISOString();
  let changed = 0;
  const updatedQueue: PublishingItem[] = workspace.publishingQueue.map((item) => {
    if (item.status === 'posted' || item.status === 'skipped') return item;
    changed += 1;
    return {
      ...item,
      scheduledFor: targetIso,
      reminderAt: targetIso,
      status: 'queued',
      updatedAt: new Date().toISOString()
    };
  });
  if (changed === 0) {
    return { ok: false, action: 'reschedule-publishing', summary: 'No publishing items available to reschedule.' };
  }
  await withScheduler({ ...workspace, publishingQueue: updatedQueue });
  return { ok: true, action: 'reschedule-publishing', summary: `Rescheduled ${changed} publishing item(s).` };
};

const addIntegrationSource = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const nameMatch = command.text.match(/source\s*:\s*([^\n]+)/i) ?? command.text.match(/connect\s+([a-z0-9\-_ ]{3,60})/i);
  const name = trimText(nameMatch?.[1] ?? 'Agent Integration Source', 'Agent Integration Source', 100);
  const now = new Date().toISOString();
  await withScheduler({
    ...workspace,
    integrationHub: {
      ...workspace.integrationHub,
      sources: [
        {
          id: uid('source'),
          name,
          kind: parseIntegrationKind(command.text),
          status: 'planned',
          artifactTypes: ['conversation-log', 'campaign-event'],
          tags: [command.source, 'agent-ingest'],
          notes: 'Created by AI chatbot command.',
          createdAt: now
        },
        ...workspace.integrationHub.sources
      ]
    }
  });
  return { ok: true, action: 'add-integration-source', summary: `Integration source "${name}" added.` };
};

const addIntegrationArtifact = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const bodyAfterPrefix = trimText(
    command.text.replace(/^add integration artifact:?\s*/i, '').replace(/^add artifact:\s*/i, ''),
    '',
    2000
  );
  const title =
    pickLabeledField(command.text, 'title') ??
    trimText(bodyAfterPrefix.split(/[,]/)[0] ?? '', 'Untitled artifact', 140);
  const artifactType = pickLabeledField(command.text, 'type') ?? 'capture';
  const sourceHint = (pickLabeledField(command.text, 'source') ?? '').toLowerCase();
  let sourceId: string | undefined;
  if (sourceHint) {
    const byName = workspace.integrationHub.sources.find(
      (s) => s.name.toLowerCase() === sourceHint || s.id === sourceHint
    );
    sourceId = byName?.id;
  }
  if (!sourceId) {
    sourceId = workspace.integrationHub.sources[0]?.id;
  }
  if (!sourceId) {
    return {
      ok: false,
      action: 'add-integration-artifact',
      summary: 'Add an integration source first, or include source: <name or id> in the command.'
    };
  }
  const summaryText = pickLabeledField(command.text, 'summary') ?? 'Ingested via agent command.';
  const now = new Date().toISOString();
  await withScheduler({
    ...workspace,
    integrationHub: {
      ...workspace.integrationHub,
      artifacts: [
        {
          id: uid('artifact'),
          sourceId,
          title: title.slice(0, 140),
          artifactType: artifactType.slice(0, 70),
          summary: summaryText.slice(0, 640),
          tags: [command.source, 'agent-artifact'],
          createdAt: now,
          updatedAt: now
        },
        ...workspace.integrationHub.artifacts
      ]
    }
  });
  return {
    ok: true,
    action: 'add-integration-artifact',
    summary: `Integration artifact "${title.slice(0, 80)}" added.`
  };
};

const parseSshFromCommand = (text: string) => {
  const name = pickLabeledField(text, 'name') ?? pickLabeledField(text, 'label');
  const host = pickLabeledField(text, 'host');
  const portRaw = pickLabeledField(text, 'port');
  const user = pickLabeledField(text, 'user') ?? pickLabeledField(text, 'username');
  const port = portRaw ? Math.max(1, Math.min(65535, Number(portRaw) || 22)) : 22;
  return { name, host, port, user };
};

const addSshTargetCommand = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const { name, host, port, user } = parseSshFromCommand(command.text);
  if (!name || !host || !user) {
    return {
      ok: false,
      action: 'add-ssh-target',
      summary: 'Use: add ssh: name: MyServer host: example.com port: 22 user: deploy'
    };
  }
  const now = new Date().toISOString();
  await withScheduler({
    ...workspace,
    integrationHub: {
      ...workspace.integrationHub,
      sshTargets: [
        {
          id: uid('ssh'),
          name: name.slice(0, 90),
          host: host.slice(0, 120),
          port,
          username: user.slice(0, 80),
          authMode: 'agent',
          description: 'Created from agent command.',
          tags: [command.source],
          commandHints: [],
          createdAt: now
        },
        ...workspace.integrationHub.sshTargets
      ]
    }
  });
  return { ok: true, action: 'add-ssh-target', summary: `SSH target "${name}" added.` };
};

const addOutreachDraft = async (workspace: BrandOpsData, command: AgentWorkspaceCommand): Promise<AgentWorkspaceResult> => {
  const body = trimText(command.text.split(':').slice(1).join(':') || '', '', 2000);
  if (!body) {
    return { ok: false, action: 'add-outreach-draft', summary: 'Use "draft outreach: <message>" to add a draft.' };
  }
  const now = new Date().toISOString();
  await withScheduler({
    ...workspace,
    outreachDrafts: [
      {
        id: uid('out'),
        category: 'follow-up',
        targetName: 'New lead',
        company: 'TBD',
        role: 'Decision maker',
        messageBody: body,
        outreachGoal: 'Start a conversation',
        tone: 'Direct and practical',
        status: 'draft',
        notes: 'Created from AI chat command.',
        createdAt: now,
        updatedAt: now
      },
      ...workspace.outreachDrafts
    ]
  });
  return { ok: true, action: 'add-outreach-draft', summary: 'Outreach draft created.' };
};

const addPublishingDraft = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const body = trimText(command.text.split(':').slice(1).join(':') || '', '', 5000);
  if (!body) {
    return { ok: false, action: 'add-publishing-draft', summary: 'Use "draft post: <content>" to create a publishing draft.' };
  }
  const now = new Date().toISOString();
  await withScheduler({
    ...workspace,
    publishingQueue: [
      {
        id: uid('pub'),
        title: 'AI Chat Draft',
        body,
        platforms: ['linkedin'],
        tags: ['ai-chat'],
        status: 'ready-to-post',
        createdAt: now,
        updatedAt: now
      },
      ...workspace.publishingQueue
    ]
  });
  return { ok: true, action: 'add-publishing-draft', summary: 'Publishing draft created.' };
};

const updateOpportunityStage = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const stage = parseOpportunityStage(command.text);
  if (!stage) {
    return { ok: false, action: 'update-opportunity-stage', summary: 'Include a stage: prospect, discovery, proposal, negotiation, won, or lost.' };
  }
  const first = workspace.opportunities.find((item) => !item.archivedAt);
  if (!first) {
    return { ok: false, action: 'update-opportunity-stage', summary: 'No active opportunity found to update.' };
  }
  await withScheduler({
    ...workspace,
    opportunities: workspace.opportunities.map((item) =>
      item.id === first.id ? { ...item, status: stage, stage, updatedAt: new Date().toISOString() } : item
    )
  });
  return { ok: true, action: 'update-opportunity-stage', summary: `Updated ${first.company} to ${stage}.` };
};

const pickLabeledField = (text: string, label: string) => {
  const pattern = new RegExp(
    `\\b${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*([^,\\n]+)`,
    'i'
  );
  const m = text.match(pattern);
  return m ? trimText(m[1] ?? '', '', 500) : undefined;
};

const opportunityUsesRichUpdate = (text: string) => {
  const lower = text.toLowerCase();
  if (lower.includes('value') || lower.includes('confidence')) return true;
  if (pickLabeledField(text, 'name')) return true;
  if (pickLabeledField(text, 'company')) return true;
  if (pickLabeledField(text, 'source')) return true;
  if (pickLabeledField(text, 'notes')) return true;
  return false;
};

const updateOpportunity = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const first = workspace.opportunities.find((item) => !item.archivedAt);
  if (!first) {
    return { ok: false, action: 'update-opportunity', summary: 'No active opportunity found to update.' };
  }
  const stage = parseOpportunityStage(command.text);
  const value = parseNumber(command.text, 'value');
  const confidence = parseNumber(command.text, 'confidence');
  const name = pickLabeledField(command.text, 'name');
  const company = pickLabeledField(command.text, 'company');
  const source = pickLabeledField(command.text, 'source');
  const notes = pickLabeledField(command.text, 'notes');

  await withScheduler({
    ...workspace,
    opportunities: workspace.opportunities.map((item) =>
      item.id === first.id
        ? {
            ...item,
            ...(stage ? { status: stage, stage } : {}),
            ...(typeof value === 'number' ? { valueUsd: Math.max(0, value) } : {}),
            ...(typeof confidence === 'number'
              ? { confidence: Math.max(0, Math.min(100, confidence)) }
              : {}),
            ...(name ? { name: name.slice(0, 200) } : {}),
            ...(company ? { company: company.slice(0, 200) } : {}),
            ...(source ? { source: source.slice(0, 200) } : {}),
            ...(notes !== undefined ? { notes: notes.slice(0, 4000) } : {}),
            updatedAt: new Date().toISOString()
          }
        : item
    )
  });
  return {
    ok: true,
    action: 'update-opportunity',
    summary: `Opportunity updated${stage ? ` to ${stage}` : ''}${
      typeof value === 'number' ? `, value ${value}` : ''
    }${typeof confidence === 'number' ? `, confidence ${confidence}%` : ''}${
      name ? `, name set` : ''
    }${company ? `, company set` : ''}.`
  };
};

const archiveOpportunity = async (
  workspace: BrandOpsData
): Promise<AgentWorkspaceResult> => {
  const first = workspace.opportunities.find((item) => !item.archivedAt);
  if (!first) {
    return { ok: false, action: 'archive-opportunity', summary: 'No active opportunity available to archive.' };
  }
  const now = new Date().toISOString();
  await withScheduler({
    ...workspace,
    opportunities: workspace.opportunities.map((item) =>
      item.id === first.id ? { ...item, archivedAt: now, updatedAt: now } : item
    )
  });
  return { ok: true, action: 'archive-opportunity', summary: `Archived opportunity for ${first.company}.` };
};

const restoreOpportunity = async (
  workspace: BrandOpsData
): Promise<AgentWorkspaceResult> => {
  const archived = workspace.opportunities.find((item) => Boolean(item.archivedAt));
  if (!archived) {
    return { ok: false, action: 'restore-opportunity', summary: 'No archived opportunity found to restore.' };
  }
  const now = new Date().toISOString();
  await withScheduler({
    ...workspace,
    opportunities: workspace.opportunities.map((item) =>
      item.id === archived.id ? { ...item, archivedAt: undefined, updatedAt: now } : item
    )
  });
  return { ok: true, action: 'restore-opportunity', summary: `Restored opportunity for ${archived.company}.` };
};

const createFollowUp = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const contact = workspace.contacts[0];
  if (!contact) {
    return { ok: false, action: 'create-follow-up', summary: 'No contact found to attach a follow-up task.' };
  }
  const reason = trimText(command.text.split(':').slice(1).join(':') || 'Chatbot-created follow-up', 'Follow up', 220);
  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await withScheduler({
    ...workspace,
    followUps: [
      {
        id: uid('fu'),
        contactId: contact.id,
        reason,
        dueAt,
        completed: false
      },
      ...workspace.followUps
    ]
  });
  return { ok: true, action: 'create-follow-up', summary: `Follow-up created for ${contact.name}.` };
};

const completeFollowUp = async (
  workspace: BrandOpsData
): Promise<AgentWorkspaceResult> => {
  const task = workspace.followUps.find((item) => !item.completed);
  if (!task) {
    return { ok: false, action: 'complete-follow-up', summary: 'No incomplete follow-up found.' };
  }
  await withScheduler({
    ...workspace,
    followUps: workspace.followUps.map((item) =>
      item.id === task.id ? { ...item, completed: true } : item
    )
  });
  return { ok: true, action: 'complete-follow-up', summary: 'Marked one follow-up as completed.' };
};

const addContact = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const detail = parseAfterColon(command.text, 'New Contact, Company, Role');
  const segments = detail.split(',').map((segment) => segment.trim());
  const name = trimText(segments[0] ?? 'New Contact', 'New Contact', 90);
  const company = trimText(segments[1] ?? 'Unknown Company', 'Unknown Company', 90);
  const role = trimText(segments[2] ?? 'Decision maker', 'Decision maker', 90);
  const now = new Date().toISOString();
  await withScheduler({
    ...workspace,
    contacts: [
      {
        id: uid('contact'),
        name,
        company,
        role,
        source: 'manual',
        relationshipStage: 'new',
        status: 'active',
        nextAction: 'Send intro message',
        followUpDate: now,
        notes: 'Created from AI chat command.',
        links: [],
        relatedOutreachDraftIds: [],
        relatedContentTags: [],
        lastContactAt: now
      },
      ...workspace.contacts
    ]
  });
  return { ok: true, action: 'add-contact', summary: `Contact ${name} added.` };
};

const updateContact = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const target = workspace.contacts[0];
  if (!target) return { ok: false, action: 'update-contact', summary: 'No contact found to update.' };

  const detail = parseAfterColon(command.text, '');
  const parts = detail.split(',').map((segment) => segment.trim()).filter(Boolean);
  const name = parts[0] ? trimText(parts[0], target.name, 90) : target.name;
  const company = parts[1] ? trimText(parts[1], target.company, 90) : target.company;
  const role = parts[2] ? trimText(parts[2], target.role, 90) : target.role;

  await withScheduler({
    ...workspace,
    contacts: workspace.contacts.map((contact) =>
      contact.id === target.id
        ? { ...contact, name, company, role, lastContactAt: new Date().toISOString() }
        : contact
    )
  });
  return { ok: true, action: 'update-contact', summary: `Updated contact ${name}.` };
};

const parseContactRelationshipStage = (text: string): 'new' | 'building' | 'trusted' | 'partner' | null => {
  const tail = parseAfterColon(text, text).toLowerCase();
  const token = tail.split(/[,\n]/)[0]?.trim() ?? '';
  if (token === 'new' || token === 'building' || token === 'trusted' || token === 'partner') {
    return token;
  }
  if (token.includes('trusted')) return 'trusted';
  if (token.includes('building')) return 'building';
  if (token.includes('partner')) return 'partner';
  if (token.includes('new')) return 'new';
  return null;
};

const updateContactRelationship = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const target = workspace.contacts[0];
  if (!target) {
    return { ok: false, action: 'update-contact-relationship', summary: 'No contact found to update.' };
  }
  const stage = parseContactRelationshipStage(command.text);
  if (!stage) {
    return {
      ok: false,
      action: 'update-contact-relationship',
      summary: 'Include a stage: new, building, trusted, or partner.'
    };
  }
  await withScheduler({
    ...workspace,
    contacts: workspace.contacts.map((c) =>
      c.id === target.id ? { ...c, relationshipStage: stage, lastContactAt: new Date().toISOString() } : c
    )
  });
  return {
    ok: true,
    action: 'update-contact-relationship',
    summary: `Contact relationship stage set to ${stage}.`
  };
};

const addContentItem = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const body = parseAfterColon(command.text, '');
  if (!body) {
    return {
      ok: false,
      action: 'add-content-item',
      summary: 'Use "add content: <text>" to create a content library item.'
    };
  }
  const now = new Date().toISOString();
  const title = trimText(body.split('\n')[0] ?? 'AI Content Item', 'AI Content Item', 140);
  await withScheduler({
    ...workspace,
    contentLibrary: [
      {
        id: uid('cli'),
        type: 'post-draft',
        title,
        body,
        tags: ['ai-chat'],
        audience: 'General audience',
        goal: 'Capture and refine reusable content',
        status: 'drafting',
        publishChannel: 'linkedin',
        notes: 'Created from AI chat command.',
        createdAt: now,
        updatedAt: now
      },
      ...workspace.contentLibrary
    ]
  });
  return { ok: true, action: 'add-content-item', summary: 'Content library item created.' };
};

const updateContentItem = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const target = workspace.contentLibrary.find((item) => item.status !== 'archived');
  if (!target) {
    return { ok: false, action: 'update-content-item', summary: 'No active content item found to update.' };
  }
  const body = parseAfterColon(command.text, '');
  if (!body) {
    return { ok: false, action: 'update-content-item', summary: 'Use "update content: <text>" to update content.' };
  }
  const title = trimText(body.split('\n')[0] ?? target.title, target.title, 140);
  await withScheduler({
    ...workspace,
    contentLibrary: workspace.contentLibrary.map((item) =>
      item.id === target.id
        ? {
            ...item,
            title,
            body,
            updatedAt: new Date().toISOString()
          }
        : item
    )
  });
  return { ok: true, action: 'update-content-item', summary: `Updated content item "${title}".` };
};

const duplicateContentItem = async (
  workspace: BrandOpsData
): Promise<AgentWorkspaceResult> => {
  const target = workspace.contentLibrary.find((item) => item.status !== 'archived');
  if (!target) {
    return { ok: false, action: 'duplicate-content-item', summary: 'No active content item found to duplicate.' };
  }
  const now = new Date().toISOString();
  await withScheduler({
    ...workspace,
    contentLibrary: [
      {
        ...target,
        id: uid('cli'),
        title: `${target.title} (Copy)`,
        status: target.status === 'archived' ? 'idea' : target.status,
        createdAt: now,
        updatedAt: now
      },
      ...workspace.contentLibrary
    ]
  });
  return { ok: true, action: 'duplicate-content-item', summary: `Duplicated content item "${target.title}".` };
};

const archiveContentItem = async (workspace: BrandOpsData): Promise<AgentWorkspaceResult> => {
  const item = workspace.contentLibrary.find((entry) => entry.status !== 'archived');
  if (!item) {
    return { ok: false, action: 'archive-content-item', summary: 'No active content item found to archive.' };
  }
  await withScheduler({
    ...workspace,
    contentLibrary: workspace.contentLibrary.map((entry) =>
      entry.id === item.id ? { ...entry, status: 'archived', updatedAt: new Date().toISOString() } : entry
    )
  });
  return { ok: true, action: 'archive-content-item', summary: `Archived content item "${item.title}".` };
};

const updatePublishingItem = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const target = workspace.publishingQueue[0];
  if (!target) {
    return { ok: false, action: 'update-publishing-item', summary: 'No publishing item found to update.' };
  }

  const status = parsePublishingStatus(command.text);
  const checklist = parseAfterColon(command.text, '');
  const next = workspace.publishingQueue.map((item) =>
    item.id === target.id
      ? {
          ...item,
          ...(status ? { status } : {}),
          ...(checklist ? { checklist: checklist.slice(0, 1200) } : {}),
          updatedAt: new Date().toISOString()
        }
      : item
  );

  await withScheduler({
    ...workspace,
    publishingQueue: next
  });

  return {
    ok: true,
    action: 'update-publishing-item',
    summary: `Updated publishing item "${target.title}"${status ? ` to ${status}` : ''}.`
  };
};

const configureWorkspace = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const prompt = parseAfterColon(command.text, command.text);
  const plan = buildAiSettingsPlan(prompt);
  if (plan.operations.length === 0) {
    return {
      ok: false,
      action: 'configure-workspace',
      summary:
        plan.unsupportedRequests[0] ??
        'No supported workspace configuration operation found in that command.'
    };
  }
  const appliedResult = applyAiSettingsOperations(workspace, plan.operations);
  await withScheduler(appliedResult.data);
  const summary = appliedResult.applied[0] ?? 'Workspace configuration applied.';
  return { ok: true, action: 'configure-workspace', summary };
};

const MAX_AUDIT = 200;

const recordCommandAudit = async (result: AgentWorkspaceResult, command: AgentWorkspaceCommand) => {
  try {
    const data = await storageService.getData();
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const nextEntry = {
      id,
      at: new Date().toISOString(),
      source: command.source,
      action: result.action,
      ok: result.ok,
      summary: result.summary.slice(0, 500),
      commandPreview: command.text.trim().slice(0, 240)
    };
    const prior = data.agentAudit?.entries ?? [];
    await storageService.setData({
      ...data,
      agentAudit: { entries: [nextEntry, ...prior].slice(0, MAX_AUDIT) }
    });
  } catch {
    // Audit is best-effort; command side-effects already applied.
  }
};

const runParsedRoute = async (
  workspace: BrandOpsData,
  command: AgentWorkspaceCommand,
  route: ReturnType<typeof parseCommandRoute>
): Promise<AgentWorkspaceResult> => {
  const lower = command.text.toLowerCase();
  switch (route) {
    case 'add-note':
      return addNote(workspace, command);
    case 'reschedule-publishing':
      return reschedulePublishing(workspace, command);
    case 'add-integration-source':
      return addIntegrationSource(workspace, command);
    case 'add-integration-artifact':
      return addIntegrationArtifact(workspace, command);
    case 'add-ssh-target':
      return addSshTargetCommand(workspace, command);
    case 'add-outreach-draft':
      return addOutreachDraft(workspace, command);
    case 'add-publishing-draft':
      return addPublishingDraft(workspace, command);
    case 'archive-opportunity':
      return archiveOpportunity(workspace);
    case 'restore-opportunity':
      return restoreOpportunity(workspace);
    case 'complete-follow-up':
      return completeFollowUp(workspace);
    case 'create-follow-up':
      return createFollowUp(workspace, command);
    case 'add-contact':
      return addContact(workspace, command);
    case 'update-contact-relationship':
      return updateContactRelationship(workspace, command);
    case 'update-contact':
      return updateContact(workspace, command);
    case 'add-content':
      return addContentItem(workspace, command);
    case 'update-content':
      return updateContentItem(workspace, command);
    case 'duplicate-content':
      return duplicateContentItem(workspace);
    case 'archive-content':
      return archiveContentItem(workspace);
    case 'update-publishing':
      return updatePublishingItem(workspace, command);
    case 'configure-workspace':
      return configureWorkspace(workspace, command);
    case 'update-opportunity':
      if (opportunityUsesRichUpdate(command.text) || lower.includes('value') || lower.includes('confidence')) {
        return updateOpportunity(workspace, command);
      }
      return updateOpportunityStage(workspace, command);
    case 'unsupported':
    default:
      return {
        ok: false,
        action: 'unsupported',
        summary:
          'Command not recognized. Try: add note, reschedule posts, connect source, draft outreach, draft post, or update opportunity stage.'
      };
  }
};

export const executeAgentWorkspaceCommand = async (
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const workspace = await storageService.getData();
  const route = parseCommandRoute(command.text);
  const result = await runParsedRoute(workspace, command, route);
  await recordCommandAudit(result, command);
  return result;
};
