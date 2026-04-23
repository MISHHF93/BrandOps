import {
  ActivityNote,
  BrandOpsData,
  Contact,
  FollowUpTask,
  Opportunity,
  OutreachDraft
} from '../types/domain';

export interface LinkedInProfileContext {
  url: string;
  name: string;
  role: string;
  company: string;
}

export interface CompanionFormState {
  note: string;
  name: string;
  role: string;
  company: string;
  outreachDraft: string;
  pipelineName: string;
  followUpDate: string;
  linkedCompanyId: string;
  linkedOpportunityId: string;
}

export interface CompanionCaptureResult {
  data: BrandOpsData;
  summary: string;
  warning?: string;
}

const MAX_FIELD_LENGTH = {
  short: 120,
  medium: 260,
  long: 5000
} as const;

const trimValue = (value: string, maxLength: number) => value.trim().slice(0, maxLength);

const normalizeFollowUpDate = (value: string, now: Date) => {
  if (!value.trim()) return undefined;
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return undefined;

  // Keep reminders useful by preventing immediate overdue state on capture.
  const minimumDueMs = now.getTime() + 30 * 60 * 1000;
  return new Date(Math.max(parsed, minimumDueMs)).toISOString();
};

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const defaultCompanionFormState = (): CompanionFormState => ({
  note: '',
  name: '',
  role: '',
  company: '',
  outreachDraft: '',
  pipelineName: '',
  followUpDate: '',
  linkedCompanyId: '',
  linkedOpportunityId: ''
});

export const normalizeCompanionForm = (form: CompanionFormState, now = new Date()) => ({
  ...form,
  note: trimValue(form.note, MAX_FIELD_LENGTH.long),
  name: trimValue(form.name, MAX_FIELD_LENGTH.short),
  role: trimValue(form.role, MAX_FIELD_LENGTH.short),
  company: trimValue(form.company, MAX_FIELD_LENGTH.short),
  outreachDraft: trimValue(form.outreachDraft, MAX_FIELD_LENGTH.long),
  pipelineName: trimValue(form.pipelineName, MAX_FIELD_LENGTH.medium),
  followUpDate: normalizeFollowUpDate(form.followUpDate, now) ?? '',
  linkedCompanyId: trimValue(form.linkedCompanyId, MAX_FIELD_LENGTH.short),
  linkedOpportunityId: trimValue(form.linkedOpportunityId, MAX_FIELD_LENGTH.short)
});

export const normalizeLinkedInContext = (
  context: LinkedInProfileContext
): LinkedInProfileContext => ({
  url: context.url.trim(),
  name: trimValue(context.name, MAX_FIELD_LENGTH.short),
  role: trimValue(context.role, MAX_FIELD_LENGTH.short),
  company: trimValue(context.company, MAX_FIELD_LENGTH.short)
});

export const validateCompanionCapture = (
  context: LinkedInProfileContext,
  form: ReturnType<typeof normalizeCompanionForm>
) => {
  if (!/linkedin\.com/i.test(context.url)) {
    return 'Open a LinkedIn profile page before saving a capture.';
  }

  const hasContactContext = Boolean(context.name || context.role || context.company);
  const hasActionPayload = Boolean(
    form.note || form.outreachDraft || form.pipelineName || form.followUpDate
  );
  if (!hasContactContext && !hasActionPayload) {
    return 'Nothing to save yet. Add at least one field or capture profile context first.';
  }

  if (form.followUpDate && !hasContactContext) {
    return 'Follow-up reminders need contact context. Add a name, role, or company first.';
  }

  return null;
};

const withLimit = <T>(items: T[], limit: number) => items.slice(0, limit);

const findContactByProfileUrl = (contacts: Contact[], profileUrl: string) =>
  contacts.find((contact) => contact.links.some((link) => link === profileUrl));

const createContactFromContext = (
  context: LinkedInProfileContext,
  note: string,
  followUpIso: string | undefined,
  nowIso: string
): Contact => ({
  id: uid('contact'),
  name: context.name || 'LinkedIn contact',
  company: context.company || 'Unknown company',
  role: context.role || 'Unknown role',
  source: 'linkedin-companion',
  relationshipStage: 'new',
  status: 'active',
  nextAction: 'Review capture and send personalized manual outreach.',
  followUpDate: followUpIso,
  notes: note || 'Captured from LinkedIn companion.',
  links: context.url ? [context.url] : [],
  relatedOutreachDraftIds: [],
  relatedContentTags: ['linkedin'],
  lastContactAt: nowIso,
  fullName: context.name || 'LinkedIn contact',
  title: context.role || 'Unknown role',
  relationship: 'new'
});

const createOutreachDraft = (
  context: LinkedInProfileContext,
  messageBody: string,
  note: string,
  linkedOpportunityId: string | undefined,
  nowIso: string
): OutreachDraft => ({
  id: uid('out'),
  category: 'warm reconnect',
  targetName: context.name || 'LinkedIn profile',
  company: context.company || 'Unknown company',
  role: context.role || 'Unknown role',
  messageBody,
  outreachGoal: 'Start a relationship and identify fit',
  tone: 'Thoughtful and direct',
  status: 'draft',
  linkedOpportunity: linkedOpportunityId,
  notes: note,
  createdAt: nowIso,
  updatedAt: nowIso
});

const createOpportunity = (
  context: LinkedInProfileContext,
  pipelineName: string,
  note: string,
  followUpIso: string | undefined,
  nowIso: string
): Opportunity => ({
  id: uid('opp'),
  name: pipelineName || `${context.name || 'LinkedIn profile'} opportunity`,
  company: context.company || 'Unknown company',
  role: context.role || 'Unknown role',
  source: 'linkedin-companion',
  relationshipStage: 'new',
  opportunityType: 'collaboration',
  status: 'prospect',
  nextAction: 'Send manual follow-up from companion draft.',
  followUpDate: followUpIso || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  notes: note || 'Captured from LinkedIn companion.',
  links: context.url ? [context.url] : [],
  relatedOutreachDraftIds: [],
  relatedContentTags: ['linkedin'],
  createdAt: nowIso,
  updatedAt: nowIso,
  valueUsd: 0,
  confidence: 35,
  account: context.company || undefined,
  serviceLine: 'LinkedIn companion intake',
  stage: 'prospect'
});

const createFollowUp = (contactId: string, dueAt: string): FollowUpTask => ({
  id: uid('fu'),
  contactId,
  reason: 'LinkedIn follow-up from companion capture',
  dueAt,
  completed: false
});

const createActivityNote = (
  context: LinkedInProfileContext,
  note: string,
  entityId: string,
  nowIso: string
): ActivityNote => ({
  id: uid('note'),
  entityType: 'contact',
  entityId,
  title: `LinkedIn capture: ${context.name || context.company || 'profile'}`,
  detail: note || 'Captured from LinkedIn companion',
  status: 'captured',
  nextAction: 'Review and triage in dashboard.',
  createdAt: nowIso
});

export const applyCompanionCapture = (
  data: BrandOpsData,
  rawContext: LinkedInProfileContext,
  rawForm: CompanionFormState,
  now = new Date()
): CompanionCaptureResult | { error: string } => {
  const context = normalizeLinkedInContext(rawContext);
  const form = normalizeCompanionForm(rawForm, now);
  const validationError = validateCompanionCapture(context, form);
  if (validationError) {
    return { error: validationError };
  }

  const nowIso = now.toISOString();
  const nextData: BrandOpsData = structuredClone(data);
  let warning: string | undefined;
  let contact = findContactByProfileUrl(nextData.contacts, context.url);
  let createdContacts = 0;
  let createdOutreach = 0;
  let createdOpportunities = 0;
  let createdFollowUps = 0;
  let createdNotes = 0;

  const shouldCaptureContact = Boolean(context.name || context.role || context.company);
  if (shouldCaptureContact && !contact) {
    const newContact = createContactFromContext(
      context,
      form.note,
      form.followUpDate || undefined,
      nowIso
    );
    nextData.contacts = withLimit([newContact, ...nextData.contacts], 1200);
    contact = newContact;
    createdContacts += 1;
  } else if (contact) {
    contact.name = context.name || contact.name;
    contact.role = context.role || contact.role;
    contact.company = context.company || contact.company;
    contact.lastContactAt = nowIso;
    if (form.followUpDate) {
      contact.followUpDate = form.followUpDate;
    }
    if (context.url && !contact.links.includes(context.url)) {
      contact.links = withLimit([context.url, ...contact.links], 10);
    }
  }

  const linkedOpportunity = form.linkedOpportunityId
    ? nextData.opportunities.find((opportunity) => opportunity.id === form.linkedOpportunityId)
    : undefined;
  let opportunityId = linkedOpportunity?.id;

  if (form.pipelineName) {
    const opportunity = createOpportunity(
      context,
      form.pipelineName,
      form.note,
      form.followUpDate || undefined,
      nowIso
    );
    nextData.opportunities = withLimit([opportunity, ...nextData.opportunities], 900);
    opportunityId = opportunity.id;
    createdOpportunities += 1;
  } else if (linkedOpportunity) {
    linkedOpportunity.updatedAt = nowIso;
    if (form.followUpDate) {
      linkedOpportunity.followUpDate = form.followUpDate;
    }
  }

  if (form.outreachDraft) {
    const outreach = createOutreachDraft(
      context,
      form.outreachDraft,
      form.note,
      opportunityId,
      nowIso
    );
    nextData.outreachDrafts = withLimit([outreach, ...nextData.outreachDrafts], 1200);
    createdOutreach += 1;
    if (contact) {
      contact.relatedOutreachDraftIds = withLimit(
        [outreach.id, ...contact.relatedOutreachDraftIds.filter((item) => item !== outreach.id)],
        20
      );
    }
  }

  if (form.note && contact) {
    const note = createActivityNote(context, form.note, contact.id, nowIso);
    nextData.notes = withLimit([note, ...nextData.notes], 2000);
    createdNotes += 1;
  }

  if (form.followUpDate) {
    if (contact) {
      const followUp = createFollowUp(contact.id, form.followUpDate);
      nextData.followUps = withLimit([followUp, ...nextData.followUps], 2000);
      createdFollowUps += 1;
    } else {
      warning = 'Follow-up date was provided, but no contact context was saved.';
    }
  }

  const summary = [
    createdContacts ? `${createdContacts} contact` : null,
    createdNotes ? `${createdNotes} note` : null,
    createdOutreach ? `${createdOutreach} outreach draft` : null,
    createdOpportunities ? `${createdOpportunities} opportunity` : null,
    createdFollowUps ? `${createdFollowUps} follow-up` : null
  ]
    .filter(Boolean)
    .join(', ');

  return {
    data: nextData,
    summary: summary || 'Updated existing linked records.',
    warning
  };
};
