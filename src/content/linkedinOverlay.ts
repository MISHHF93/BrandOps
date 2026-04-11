const ROOT_ID = 'brandops-linkedin-companion-root';
const STYLE_ID = 'brandops-linkedin-companion-style';
const STORAGE_KEY = 'brandops:data';
const PANEL_VISIBLE_KEY = 'brandops:linkedin-companion:open';

interface BrandOpsEntity {
  id: string;
  name?: string;
  company?: string;
}

interface BrandOpsData {
  contacts?: Array<Record<string, unknown>>;
  companies?: BrandOpsEntity[];
  opportunities?: BrandOpsEntity[];
  notes?: Array<Record<string, unknown>>;
  outreachDrafts?: Array<Record<string, unknown>>;
  followUps?: Array<Record<string, unknown>>;
}

interface LinkedInProfileContext {
  url: string;
  name: string;
  role: string;
  company: string;
}

interface FormState {
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

const companionState = {
  bootstrapped: false,
  detached: false,
  profileUrl: '',
  launcher: null as HTMLButtonElement | null,
  panel: null as HTMLDivElement | null,
  status: null as HTMLDivElement | null,
  observers: [] as Array<() => void>,
  initializedForHref: '',
  form: {
    note: '',
    name: '',
    role: '',
    company: '',
    outreachDraft: '',
    pipelineName: '',
    followUpDate: '',
    linkedCompanyId: '',
    linkedOpportunityId: ''
  } satisfies FormState,
  linkedInCache: {
    name: '',
    role: '',
    company: ''
  } as Omit<LinkedInProfileContext, 'url'>,
  sourceUrlLocked: true
};

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const isLinkedInProfilePage = (url: URL) => {
  const profilePathPatterns = [/^\/in\//, /^\/pub\//, /^\/sales\/lead\//, /^\/talent\/profile\//];
  return profilePathPatterns.some((pattern) => pattern.test(url.pathname));
};

const sanitizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const safeParseProfile = (): Omit<LinkedInProfileContext, 'url'> => {
  const profileHeading = document.querySelector('h1');
  const titleElement = document.querySelector('.text-body-medium.break-words');
  const companyLink = document.querySelector('a[href*="/company/"] span[aria-hidden="true"]');

  const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ?? '';
  const derivedNameFromOg = ogTitle.includes('|') ? ogTitle.split('|')[0] : ogTitle;

  const name = sanitizeText(profileHeading?.textContent ?? derivedNameFromOg ?? '');
  const role = sanitizeText(titleElement?.textContent ?? '');
  const company = sanitizeText(companyLink?.textContent ?? '');

  return {
    name,
    role,
    company
  };
};

const syncFormWithProfile = () => {
  const parsed = safeParseProfile();

  companionState.linkedInCache = parsed;

  if (!companionState.form.name) companionState.form.name = parsed.name;
  if (!companionState.form.role) companionState.form.role = parsed.role;
  if (!companionState.form.company) companionState.form.company = parsed.company;
  if (!companionState.form.pipelineName && parsed.name) {
    companionState.form.pipelineName = `${parsed.name} - LinkedIn opportunity`;
  }
};

const setStatus = (message: string, variant: 'info' | 'success' | 'error' = 'info') => {
  if (!companionState.status) return;
  companionState.status.textContent = message;
  companionState.status.dataset.variant = variant;
};

const ensureStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483000;
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #0f172a;
      line-height: 1.35;
    }
    .brandops-launcher {
      width: 48px;
      height: 48px;
      border: none;
      border-radius: 999px;
      background: linear-gradient(135deg, #0f172a, #1d4ed8);
      color: #fff;
      display: grid;
      place-items: center;
      box-shadow: 0 10px 35px rgba(15, 23, 42, 0.3);
      cursor: pointer;
      transition: transform 160ms ease, box-shadow 160ms ease;
    }
    .brandops-launcher:hover {
      transform: translateY(-1px);
      box-shadow: 0 16px 35px rgba(15, 23, 42, 0.35);
    }
    .brandops-panel {
      width: min(360px, calc(100vw - 24px));
      max-height: min(86vh, 800px);
      overflow: auto;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 0 24px 50px rgba(15, 23, 42, 0.2);
      padding: 14px;
    }
    .brandops-panel[hidden] {
      display: none;
    }
    .brandops-row { margin-top: 10px; }
    .brandops-heading {
      margin: 0;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #334155;
    }
    .brandops-subheading {
      margin: 4px 0 8px;
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
    }
    .brandops-field-label {
      display: block;
      margin-bottom: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #475569;
    }
    .brandops-input,
    .brandops-select,
    .brandops-textarea {
      width: 100%;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      background: #fff;
      padding: 8px 10px;
      font-size: 13px;
      color: #0f172a;
      box-sizing: border-box;
    }
    .brandops-textarea { min-height: 70px; resize: vertical; }
    .brandops-grid {
      display: grid;
      gap: 8px;
      grid-template-columns: 1fr 1fr;
    }
    .brandops-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 10px;
    }
    .brandops-btn {
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      background: #fff;
      color: #0f172a;
    }
    .brandops-btn-primary {
      background: #1d4ed8;
      border-color: #1d4ed8;
      color: #fff;
    }
    .brandops-status {
      margin-top: 8px;
      font-size: 12px;
      color: #334155;
      min-height: 18px;
    }
    .brandops-status[data-variant='success'] { color: #166534; }
    .brandops-status[data-variant='error'] { color: #b91c1c; }
  `;
  document.head.appendChild(style);
};

const getFormValue = (name: keyof FormState) => companionState.form[name];
const setFormValue = (name: keyof FormState, value: string) => {
  companionState.form[name] = value;
};

const readData = async () => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return (stored[STORAGE_KEY] ?? {}) as BrandOpsData;
};

const writeData = async (data: BrandOpsData) => {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
};

const getProfileContext = (): LinkedInProfileContext => {
  const sourceUrl = companionState.sourceUrlLocked ? companionState.profileUrl : window.location.href;
  return {
    url: sourceUrl,
    name: getFormValue('name').trim(),
    role: getFormValue('role').trim(),
    company: getFormValue('company').trim()
  };
};

const createContactRecord = (context: LinkedInProfileContext, notes: string) => ({
  id: uid('contact'),
  name: context.name || 'LinkedIn contact',
  company: context.company || 'Unknown company',
  role: context.role || 'Unknown role',
  source: 'linkedin-companion',
  relationshipStage: 'new' as const,
  status: 'active' as const,
  nextAction: 'Review companion note and personalize outreach',
  followUpDate: getFormValue('followUpDate') || undefined,
  notes,
  links: [context.url],
  relatedOutreachDraftIds: [],
  relatedContentTags: [],
  lastContactAt: new Date().toISOString()
});

const createOutreachDraftRecord = (context: LinkedInProfileContext) => ({
  id: uid('out'),
  category: 'warm reconnect' as const,
  targetName: context.name || 'LinkedIn profile',
  company: context.company,
  role: context.role,
  messageBody: getFormValue('outreachDraft').trim(),
  outreachGoal: 'Start relationship and explore fit',
  tone: 'Thoughtful and direct',
  status: 'draft' as const,
  linkedOpportunity: getFormValue('linkedOpportunityId') || undefined,
  notes: getFormValue('note').trim(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const createOpportunityRecord = (context: LinkedInProfileContext) => ({
  id: uid('opp'),
  name: getFormValue('pipelineName').trim() || `${context.name || 'Profile'} opportunity`,
  company: context.company || 'Unknown company',
  role: context.role || 'Unknown role',
  source: 'linkedin-companion',
  relationshipStage: 'new' as const,
  opportunityType: 'collaboration' as const,
  status: 'prospect' as const,
  nextAction: 'Follow up with personalized message draft',
  followUpDate: getFormValue('followUpDate') || new Date(Date.now() + 7 * 86400000).toISOString(),
  notes: getFormValue('note').trim(),
  links: [context.url],
  relatedOutreachDraftIds: [],
  relatedContentTags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  valueUsd: 0,
  confidence: 0.3,
  contactId: undefined,
  account: context.company || undefined,
  serviceLine: 'LinkedIn companion intake',
  stage: 'prospect' as const
});

const createFollowUpRecord = (contactId: string) => ({
  id: uid('fup'),
  contactId,
  reason: 'LinkedIn profile follow-up',
  dueAt: getFormValue('followUpDate') || new Date(Date.now() + 3 * 86400000).toISOString(),
  completed: false
});

const createActivityNoteRecord = (context: LinkedInProfileContext) => ({
  id: uid('note'),
  entityType: 'contact' as const,
  entityId: getFormValue('linkedOpportunityId') || uid('entity'),
  title: `LinkedIn note for ${context.name || 'profile'}`,
  detail: getFormValue('note').trim() || 'Captured from LinkedIn companion',
  status: 'captured',
  nextAction: 'Review and triage in BrandOps workspace',
  createdAt: new Date().toISOString()
});

const saveCompanionCapture = async () => {
  const context = getProfileContext();
  const data = await readData();

  const noteText = getFormValue('note').trim();
  const shouldSaveContact = Boolean(context.name || context.company || context.role);
  const shouldSaveDraft = Boolean(getFormValue('outreachDraft').trim());
  const shouldSaveOpportunity = Boolean(getFormValue('pipelineName').trim());

  data.contacts = data.contacts ?? [];
  data.outreachDrafts = data.outreachDrafts ?? [];
  data.opportunities = data.opportunities ?? [];
  data.followUps = data.followUps ?? [];
  data.notes = data.notes ?? [];

  let contactId = '';

  if (shouldSaveContact) {
    const contact = createContactRecord(context, noteText);
    data.contacts.unshift(contact);
    contactId = contact.id;
  }

  if (noteText) {
    data.notes.unshift(createActivityNoteRecord(context));
  }

  if (shouldSaveDraft) {
    data.outreachDrafts.unshift(createOutreachDraftRecord(context));
  }

  if (shouldSaveOpportunity) {
    data.opportunities.unshift(createOpportunityRecord(context));
  }

  if (getFormValue('followUpDate') && contactId) {
    data.followUps.unshift(createFollowUpRecord(contactId));
  }

  await writeData(data);
};

const createInput = (
  label: string,
  name: keyof FormState,
  type: 'text' | 'date' | 'textarea' = 'text'
) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'brandops-row';

  const labelEl = document.createElement('label');
  labelEl.className = 'brandops-field-label';
  labelEl.textContent = label;

  let input: HTMLInputElement | HTMLTextAreaElement;

  if (type === 'textarea') {
    const textarea = document.createElement('textarea');
    textarea.className = 'brandops-textarea';
    textarea.value = getFormValue(name);
    textarea.addEventListener('input', () => setFormValue(name, textarea.value));
    input = textarea;
  } else {
    const textInput = document.createElement('input');
    textInput.type = type;
    textInput.className = 'brandops-input';
    textInput.value = getFormValue(name);
    textInput.addEventListener('input', () => setFormValue(name, textInput.value));
    input = textInput;
  }

  wrapper.append(labelEl, input);
  return wrapper;
};

const createSelect = (label: string, name: keyof FormState, options: BrandOpsEntity[]) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'brandops-row';

  const labelEl = document.createElement('label');
  labelEl.className = 'brandops-field-label';
  labelEl.textContent = label;

  const select = document.createElement('select');
  select.className = 'brandops-select';

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = 'None';
  select.append(emptyOption);

  options.forEach((option) => {
    const optionEl = document.createElement('option');
    optionEl.value = option.id;
    optionEl.textContent = option.name ?? option.company ?? option.id;
    select.append(optionEl);
  });

  select.value = getFormValue(name);
  select.addEventListener('change', () => setFormValue(name, select.value));

  wrapper.append(labelEl, select);
  return wrapper;
};

const createPanel = async () => {
  const panel = document.createElement('div');
  panel.className = 'brandops-panel';
  panel.hidden = true;

  const title = document.createElement('p');
  title.className = 'brandops-heading';
  title.textContent = 'BrandOps Companion';

  const subtitle = document.createElement('p');
  subtitle.className = 'brandops-subheading';
  subtitle.textContent = 'Capture LinkedIn context and queue workflow actions';

  const urlRow = document.createElement('div');
  urlRow.className = 'brandops-row';

  const captureUrlButton = document.createElement('button');
  captureUrlButton.className = 'brandops-btn';
  captureUrlButton.textContent = 'Capture current page URL';
  captureUrlButton.addEventListener('click', () => {
    companionState.profileUrl = window.location.href;
    companionState.sourceUrlLocked = true;
    setStatus('Captured current LinkedIn page URL.', 'success');
  });
  urlRow.append(captureUrlButton);

  const basicGrid = document.createElement('div');
  basicGrid.className = 'brandops-grid';
  basicGrid.append(createInput('Name', 'name'), createInput('Role', 'role'));

  const stored = await readData();
  const companyOptions = (stored.companies ?? []).slice(0, 20);
  const opportunityOptions = (stored.opportunities ?? []).slice(0, 20);

  const saveButton = document.createElement('button');
  saveButton.className = 'brandops-btn brandops-btn-primary';
  saveButton.textContent = 'Save to BrandOps';
  saveButton.addEventListener('click', async () => {
    try {
      saveButton.disabled = true;
      await saveCompanionCapture();
      setStatus('Saved contact context and selected workflow actions.', 'success');
    } catch (error) {
      setStatus(`Unable to save. ${(error as Error).message}`, 'error');
    } finally {
      saveButton.disabled = false;
    }
  });

  const closeButton = document.createElement('button');
  closeButton.className = 'brandops-btn';
  closeButton.textContent = 'Hide panel';
  closeButton.addEventListener('click', () => setPanelVisibility(false));

  const actions = document.createElement('div');
  actions.className = 'brandops-actions';
  actions.append(saveButton, closeButton);

  const status = document.createElement('div');
  status.className = 'brandops-status';
  status.textContent = 'No automation, no auto-send. Manual workflow support only.';

  panel.append(
    title,
    subtitle,
    urlRow,
    basicGrid,
    createInput('Company', 'company'),
    createInput('Profile note', 'note', 'textarea'),
    createInput('Outreach draft (optional)', 'outreachDraft', 'textarea'),
    createInput('Opportunity title', 'pipelineName'),
    createInput('Follow-up date', 'followUpDate', 'date'),
    createSelect('Link existing company', 'linkedCompanyId', companyOptions),
    createSelect('Link existing opportunity', 'linkedOpportunityId', opportunityOptions),
    actions,
    status
  );

  companionState.status = status;

  return panel;
};

const setPanelVisibility = (isVisible: boolean) => {
  if (!companionState.panel || !companionState.launcher) return;
  companionState.panel.hidden = !isVisible;
  companionState.launcher.setAttribute('aria-expanded', String(isVisible));
  void chrome.storage.local.set({ [PANEL_VISIBLE_KEY]: isVisible });
};

const buildCompanion = async () => {
  if (companionState.detached) return;

  const existing = document.getElementById(ROOT_ID);
  if (existing) existing.remove();

  ensureStyles();

  syncFormWithProfile();
  companionState.profileUrl = window.location.href;

  const root = document.createElement('div');
  root.id = ROOT_ID;

  const launcher = document.createElement('button');
  launcher.className = 'brandops-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Open BrandOps companion');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.textContent = 'BO';

  const panel = await createPanel();

  launcher.addEventListener('click', () => {
    const willShow = panel.hidden;
    setPanelVisibility(willShow);
    if (willShow) setStatus('Review fields before saving to BrandOps.', 'info');
  });

  root.append(panel, launcher);
  document.body.appendChild(root);

  companionState.launcher = launcher;
  companionState.panel = panel;

  const visibilityState = await chrome.storage.local.get(PANEL_VISIBLE_KEY);
  const shouldOpen = Boolean(visibilityState[PANEL_VISIBLE_KEY]);
  setPanelVisibility(shouldOpen);
};

const teardownCompanion = () => {
  companionState.detached = true;
  const root = document.getElementById(ROOT_ID);
  if (root) root.remove();
};

const refreshForLocationChange = () => {
  const currentHref = window.location.href;
  if (currentHref === companionState.initializedForHref) return;
  companionState.initializedForHref = currentHref;

  const isProfile = isLinkedInProfilePage(new URL(currentHref));

  if (!isProfile) {
    teardownCompanion();
    return;
  }

  companionState.detached = false;
  void buildCompanion();
};

const watchHistory = () => {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function patchedPushState(...args) {
    const result = originalPushState.apply(this, args);
    queueMicrotask(refreshForLocationChange);
    return result;
  };

  history.replaceState = function patchedReplaceState(...args) {
    const result = originalReplaceState.apply(this, args);
    queueMicrotask(refreshForLocationChange);
    return result;
  };

  const onPopState = () => refreshForLocationChange();
  window.addEventListener('popstate', onPopState);

  companionState.observers.push(() => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener('popstate', onPopState);
  });
};

const bootstrap = () => {
  if (companionState.bootstrapped) return;
  companionState.bootstrapped = true;

  watchHistory();
  refreshForLocationChange();
};

bootstrap();
