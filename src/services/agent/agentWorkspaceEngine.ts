import { BrandOpsData, IntegrationSourceKind, OpportunityStage, PublishingItem } from '../../types/domain';
import { scheduler } from '../scheduling/scheduler';
import { storageService } from '../storage/storage';
import { applyAiSettingsOperations, buildAiSettingsPlan } from '../ai/aiSettingsMode';

export type AgentAction =
  | 'add-note'
  | 'reschedule-publishing'
  | 'add-integration-source'
  | 'add-outreach-draft'
  | 'add-publishing-draft'
  | 'update-opportunity-stage'
  | 'update-opportunity'
  | 'archive-opportunity'
  | 'restore-opportunity'
  | 'create-follow-up'
  | 'complete-follow-up'
  | 'add-contact'
  | 'add-content-item'
  | 'archive-content-item'
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
    }${typeof confidence === 'number' ? `, confidence ${confidence}%` : ''}.`
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

export const executeAgentWorkspaceCommand = async (
  command: AgentWorkspaceCommand
): Promise<AgentWorkspaceResult> => {
  const workspace = await storageService.getData();
  const lower = command.text.toLowerCase();

  if (lower.includes('add note') || lower.startsWith('note:')) return addNote(workspace, command);
  if (lower.includes('reschedule') && (lower.includes('post') || lower.includes('publishing'))) {
    return reschedulePublishing(workspace, command);
  }
  if (lower.includes('add source') || lower.includes('connect')) return addIntegrationSource(workspace, command);
  if (lower.includes('draft outreach')) return addOutreachDraft(workspace, command);
  if (lower.includes('draft post') || lower.includes('create post')) return addPublishingDraft(workspace, command);
  if (lower.includes('archive opportunity')) return archiveOpportunity(workspace);
  if (lower.includes('restore opportunity')) return restoreOpportunity(workspace);
  if (lower.includes('complete follow up') || lower.includes('complete follow-up')) {
    return completeFollowUp(workspace);
  }
  if (
    lower.includes('create follow up') ||
    lower.includes('create follow-up') ||
    lower.includes('add follow up') ||
    lower.includes('add follow-up')
  ) {
    return createFollowUp(workspace, command);
  }
  if (lower.includes('add contact')) return addContact(workspace, command);
  if (lower.includes('add content') || lower.includes('create content')) {
    return addContentItem(workspace, command);
  }
  if (lower.includes('archive content')) return archiveContentItem(workspace);
  if (lower.includes('configure workspace') || lower.startsWith('configure:')) {
    return configureWorkspace(workspace, command);
  }
  if (lower.includes('update opportunity') || lower.includes('set opportunity')) {
    if (lower.includes('value') || lower.includes('confidence')) {
      return updateOpportunity(workspace, command);
    }
    return updateOpportunityStage(workspace, command);
  }

  return {
    ok: false,
    action: 'unsupported',
    summary:
      'Command not recognized. Try: add note, reschedule posts, connect source, draft outreach, draft post, or update opportunity stage.'
  };
};
