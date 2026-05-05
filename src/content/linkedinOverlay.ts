import { BrandOpsData } from '../types/domain';
import { storageService } from '../services/storage/storage';
import { scheduler } from '../services/scheduling/scheduler';
import { normalizeExternalSyncSectionReferences } from '../shared/config/legacySectionIds';
import {
  applyCompanionCapture,
  CompanionFormState,
  defaultCompanionFormState,
  LinkedInProfileContext
} from './linkedinCompanionSafety';

const ROOT_ID = 'brandops-linkedin-companion-root';
const STYLE_ID = 'brandops-linkedin-companion-style';
const PANEL_VISIBLE_KEY = 'brandops:linkedin-companion:open';

type StatusTone = 'info' | 'success' | 'error';

interface CompanionElementState {
  launcher: HTMLButtonElement | null;
  panel: HTMLDivElement | null;
  status: HTMLDivElement | null;
  saveButton: HTMLButtonElement | null;
  companySelect: HTMLSelectElement | null;
  opportunitySelect: HTMLSelectElement | null;
}

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const companionState = {
  bootstrapped: false,
  detached: false,
  initializedForHref: '',
  profileUrl: '',
  form: defaultCompanionFormState(),
  linkedInCache: {
    name: '',
    role: '',
    company: ''
  },
  elements: {
    launcher: null,
    panel: null,
    status: null,
    saveButton: null,
    companySelect: null,
    opportunitySelect: null
  } as CompanionElementState,
  fieldRefs: {} as Partial<Record<keyof CompanionFormState, FieldElement>>,
  observers: [] as Array<() => void>,
  refreshToken: 0
};

const isLinkedInProfilePage = (url: URL) => {
  const profilePathPatterns = [/^\/in\//, /^\/pub\//, /^\/sales\/lead\//, /^\/talent\/profile\//];
  return profilePathPatterns.some((pattern) => pattern.test(url.pathname));
};

const sanitizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const setStatus = (message: string, tone: StatusTone = 'info') => {
  if (!companionState.elements.status) return;
  companionState.elements.status.textContent = message;
  companionState.elements.status.dataset.variant = tone;
};

const getFieldValue = (name: keyof CompanionFormState) => companionState.form[name];

const setFieldValue = (name: keyof CompanionFormState, value: string, syncElement = true) => {
  companionState.form[name] = value;
  if (syncElement) {
    const element = companionState.fieldRefs[name];
    if (element) {
      element.value = value;
    }
  }
};

const resetFormFromProfile = () => {
  companionState.form = defaultCompanionFormState();
  setFieldValue('name', companionState.linkedInCache.name);
  setFieldValue('role', companionState.linkedInCache.role);
  setFieldValue('company', companionState.linkedInCache.company);
  if (companionState.linkedInCache.name) {
    setFieldValue('pipelineName', `${companionState.linkedInCache.name} - LinkedIn opportunity`);
  }
};

const safeParseProfile = (): Omit<LinkedInProfileContext, 'url'> => {
  const profileHeading = document.querySelector('h1');
  const titleElement = document.querySelector('.text-body-medium.break-words');
  const companyLink = document.querySelector('a[href*="/company/"] span[aria-hidden="true"]');

  const ogTitle =
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ?? '';
  const derivedNameFromOg = ogTitle.includes('|') ? ogTitle.split('|')[0] : ogTitle;

  return {
    name: sanitizeText(profileHeading?.textContent ?? derivedNameFromOg ?? ''),
    role: sanitizeText(titleElement?.textContent ?? ''),
    company: sanitizeText(companyLink?.textContent ?? '')
  };
};

const syncFormWithProfile = () => {
  const parsed = safeParseProfile();
  companionState.linkedInCache = parsed;

  if (!getFieldValue('name')) setFieldValue('name', parsed.name);
  if (!getFieldValue('role')) setFieldValue('role', parsed.role);
  if (!getFieldValue('company')) setFieldValue('company', parsed.company);
  if (!getFieldValue('pipelineName') && parsed.name) {
    setFieldValue('pipelineName', `${parsed.name} - LinkedIn opportunity`);
  }
};

/** Aligns with `index.css` liquid durations; mirrors web shell (system reduced-motion only). */
const applyLiquidMotionToCompanionRoot = async (root: HTMLDivElement) => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.style.setProperty('--duration-liquid-hover', reduced ? '0ms' : '220ms');
  root.style.setProperty('--duration-liquid-enter', reduced ? '0ms' : '320ms');
};

const ensureStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --bo-bg: #0A0D12;
      --bo-bg-elevated: #0F131A;
      --bo-surface: #131A24;
      --bo-surface-hover: #182131;
      --bo-border: #243041;
      --bo-border-strong: #33445D;
      --bo-text: #E8EEF8;
      --bo-text-muted: #A9B6C9;
      --bo-text-soft: #7F8DA3;
      --bo-primary: #5B8CFF;
      --bo-focus: rgba(91, 140, 255, 0.45);
      --bo-success: #3ECF8E;
      --bo-danger: #FF6B6B;
      --bo-warning: #F5B942;
      /* Injected UI: fixed dark chrome on LinkedIn; not wired to in-app theme. */
      --bo-shadow: 0 12px 30px rgba(0, 0, 0, 0.34);
    }
    #${ROOT_ID} {
      --ease-liquid-out: cubic-bezier(0.22, 1, 0.36, 1);
      --ease-liquid-in-out: cubic-bezier(0.45, 0, 0.2, 1);
      --duration-liquid-hover: 220ms;
      --duration-liquid-enter: 320ms;
      --glass-blur-soft: 8px;
      --glass-blur: 12px;
      --glass-blur-strong: 18px;
      --glass-saturate: 110%;
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483000;
      font-family: Segoe UI, Inter, system-ui, -apple-system, sans-serif;
      color: var(--bo-text);
      line-height: 1.4;
    }
    .brandops-launcher {
      width: 44px;
      height: 44px;
      border: 1px solid var(--bo-border-strong);
      border-radius: 999px;
      background: linear-gradient(165deg, rgba(19, 26, 36, 0.72), rgba(15, 19, 26, 0.65));
      color: #CDBA8A;
      display: grid;
      place-items: center;
      box-shadow: var(--bo-shadow), inset 0 1px 0 rgba(232, 238, 248, 0.06);
      backdrop-filter: blur(var(--glass-blur-soft)) saturate(var(--glass-saturate));
      cursor: pointer;
      transition:
        transform var(--duration-liquid-hover) var(--ease-liquid-out),
        background var(--duration-liquid-hover) var(--ease-liquid-out),
        border-color var(--duration-liquid-hover) var(--ease-liquid-out);
      font-size: 18px;
      font-weight: 700;
    }
    .brandops-launcher:hover {
      transform: translateY(-0.5px);
      background: linear-gradient(165deg, rgba(24, 33, 49, 0.82), rgba(19, 26, 36, 0.76));
      border-color: var(--bo-primary);
    }
    .brandops-launcher:focus-visible,
    .brandops-btn:focus-visible,
    .brandops-input:focus-visible,
    .brandops-select:focus-visible,
    .brandops-textarea:focus-visible {
      outline: 2px solid var(--bo-focus);
      outline-offset: 2px;
    }
    .brandops-panel {
      width: min(370px, calc(100vw - 24px));
      max-height: min(86dvh, 820px);
      overflow: auto;
      border-radius: 16px;
      border: 1px solid var(--bo-border);
      background: linear-gradient(
        165deg,
        rgba(19, 26, 36, 0.82),
        rgba(15, 19, 26, 0.78)
      );
      box-shadow: var(--bo-shadow), inset 0 1px 0 rgba(232, 238, 248, 0.045);
      padding: 14px;
      backdrop-filter: blur(var(--glass-blur-strong)) saturate(var(--glass-saturate));
    }
    .brandops-panel[hidden] { display: none; }
    .brandops-kicker {
      margin: 0;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--bo-text-soft);
      font-weight: 600;
    }
    .brandops-title {
      margin: 4px 0 8px;
      font-size: 16px;
      font-weight: 600;
      color: var(--bo-text);
    }
    .brandops-copy {
      margin: 0;
      font-size: 12px;
      color: var(--bo-text-muted);
    }
    .brandops-row { margin-top: 10px; }
    .brandops-grid {
      display: grid;
      gap: 8px;
      grid-template-columns: 1fr 1fr;
    }
    .brandops-field-label {
      display: block;
      margin-bottom: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--bo-text-soft);
    }
    .brandops-input,
    .brandops-select,
    .brandops-textarea {
      width: 100%;
      border-radius: 10px;
      border: 1px solid var(--bo-border);
      background: var(--bo-surface);
      color: var(--bo-text);
      box-sizing: border-box;
      padding: 8px 10px;
      font-size: 13px;
      transition:
        border-color var(--duration-liquid-hover) var(--ease-liquid-out),
        background var(--duration-liquid-hover) var(--ease-liquid-out);
    }
    .brandops-input:hover,
    .brandops-select:hover,
    .brandops-textarea:hover {
      border-color: var(--bo-border-strong);
      background: var(--bo-surface-hover);
    }
    .brandops-textarea {
      min-height: 74px;
      resize: vertical;
    }
    .brandops-actions {
      margin-top: 12px;
      display: grid;
      gap: 8px;
      grid-template-columns: 1fr 1fr;
    }
    .brandops-btn {
      border: 1px solid var(--bo-border);
      border-radius: 9px;
      background: var(--bo-surface);
      color: var(--bo-text);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 8px;
      transition:
        border-color var(--duration-liquid-hover) var(--ease-liquid-out),
        background var(--duration-liquid-hover) var(--ease-liquid-out),
        transform var(--duration-liquid-hover) var(--ease-liquid-out);
    }
    .brandops-btn:hover {
      border-color: var(--bo-border-strong);
      background: var(--bo-surface-hover);
      transform: translateY(-0.5px);
    }
    .brandops-btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
      transform: none;
    }
    .brandops-btn-primary {
      border-color: color-mix(in srgb, var(--bo-primary) 65%, var(--bo-border) 35%);
      background: color-mix(in srgb, var(--bo-primary) 22%, var(--bo-surface) 78%);
    }
    .brandops-compliance {
      margin-top: 10px;
      border: 1px solid rgba(245, 185, 66, 0.35);
      background: rgba(245, 185, 66, 0.08);
      color: #E8D7A7;
      border-radius: 10px;
      padding: 8px;
      font-size: 11px;
    }
    .brandops-status {
      margin-top: 10px;
      min-height: 18px;
      font-size: 12px;
      color: var(--bo-text-muted);
    }
    .brandops-status[data-variant='success'] { color: var(--bo-success); }
    .brandops-status[data-variant='error'] { color: var(--bo-danger); }
    @media (max-width: 560px) {
      #${ROOT_ID} {
        right: 10px;
        bottom: 10px;
      }
      .brandops-panel {
        width: min(360px, calc(100vw - 16px));
      }
    }
    @media (prefers-reduced-motion: reduce) {
      #${ROOT_ID} {
        --duration-liquid-hover: 0ms;
        --duration-liquid-enter: 0ms;
      }
    }
  `;
  document.head.appendChild(style);
};

const buildProfileContext = (): LinkedInProfileContext => ({
  url: companionState.profileUrl || window.location.href,
  name: getFieldValue('name').trim(),
  role: getFieldValue('role').trim(),
  company: getFieldValue('company').trim()
});

const loadWorkspaceData = async () => {
  try {
    return await storageService.getData();
  } catch (error) {
    setStatus(`Unable to load workspace state. ${(error as Error).message}`, 'error');
    return null;
  }
};

const updateSelectOptions = (data: BrandOpsData) => {
  const selectConfig: Array<{
    select: HTMLSelectElement | null;
    key: keyof CompanionFormState;
    items: Array<{ id: string; label: string }>;
    placeholder: string;
  }> = [
    {
      select: companionState.elements.companySelect,
      key: 'linkedCompanyId',
      items: data.companies.slice(0, 50).map((item) => ({
        id: item.id,
        label: item.name
      })),
      placeholder: 'No linked company'
    },
    {
      select: companionState.elements.opportunitySelect,
      key: 'linkedOpportunityId',
      items: data.opportunities
        .filter((item) => !item.archivedAt)
        .slice(0, 50)
        .map((item) => ({
          id: item.id,
          label: item.name
        })),
      placeholder: 'No linked opportunity'
    }
  ];

  selectConfig.forEach(({ select, key, items, placeholder }) => {
    if (!select) return;
    const currentValue = getFieldValue(key);
    select.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent =
      items.length === 0 ? `${placeholder} (none available)` : placeholder;
    select.append(defaultOption);

    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.label;
      select.append(option);
    });

    select.value = items.some((item) => item.id === currentValue) ? currentValue : '';
    setFieldValue(key, select.value, false);
  });
};

const withKeyboardShortcutHint = (label: string, shortcut: string) => `${label} (${shortcut})`;

const handleSaveCapture = async () => {
  const workspace = await loadWorkspaceData();
  if (!workspace) return;

  const saveButton = companionState.elements.saveButton;
  if (saveButton) saveButton.disabled = true;

  try {
    const outcome = applyCompanionCapture(
      workspace,
      buildProfileContext(),
      companionState.form,
      new Date()
    );
    if ('error' in outcome) {
      setStatus(outcome.error, 'error');
      return;
    }

    const normalized = normalizeExternalSyncSectionReferences(outcome.data);
    const withScheduler = { ...normalized, scheduler: scheduler.reconcile(normalized) };
    await storageService.setData(withScheduler);
    updateSelectOptions(withScheduler);
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      void chrome.runtime.sendMessage({ type: 'SYNC_SCHEDULER' });
    }
    setStatus(
      outcome.warning ? `${outcome.summary}. ${outcome.warning}` : `${outcome.summary} saved.`,
      outcome.warning ? 'info' : 'success'
    );
  } catch (error) {
    setStatus(`Save failed. ${(error as Error).message}`, 'error');
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
};

const handleCopyOutreach = async () => {
  const text = getFieldValue('outreachDraft').trim();
  if (!text) {
    setStatus('Outreach draft is empty. Add text before copying.', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus('Outreach draft copied. Send manually from LinkedIn.', 'success');
  } catch (error) {
    setStatus(`Clipboard copy failed. ${(error as Error).message}`, 'error');
  }
};

const createInputField = (
  label: string,
  name: keyof CompanionFormState,
  type: 'text' | 'date' | 'textarea' = 'text'
) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'brandops-row';

  const labelEl = document.createElement('label');
  labelEl.className = 'brandops-field-label';
  labelEl.textContent = label;

  let field: FieldElement;

  if (type === 'textarea') {
    const textarea = document.createElement('textarea');
    textarea.className = 'brandops-textarea';
    textarea.value = getFieldValue(name);
    textarea.addEventListener('input', () => setFieldValue(name, textarea.value, false));
    field = textarea;
  } else {
    const input = document.createElement('input');
    input.type = type;
    input.className = 'brandops-input';
    input.value = getFieldValue(name);
    input.addEventListener('input', () => setFieldValue(name, input.value, false));
    field = input;
  }

  companionState.fieldRefs[name] = field;
  wrapper.append(labelEl, field);
  return wrapper;
};

const createSelectField = (label: string, name: keyof CompanionFormState) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'brandops-row';

  const labelEl = document.createElement('label');
  labelEl.className = 'brandops-field-label';
  labelEl.textContent = label;

  const select = document.createElement('select');
  select.className = 'brandops-select';
  select.addEventListener('change', () => setFieldValue(name, select.value, false));

  companionState.fieldRefs[name] = select;
  wrapper.append(labelEl, select);
  return { wrapper, select };
};

const setPanelVisibility = async (isVisible: boolean) => {
  if (!companionState.elements.panel || !companionState.elements.launcher) return;
  companionState.elements.panel.hidden = !isVisible;
  companionState.elements.launcher.setAttribute('aria-expanded', String(isVisible));

  try {
    await chrome.storage.local.set({ [PANEL_VISIBLE_KEY]: isVisible });
  } catch {
    // Visibility preference persistence should not block usage.
  }
};

const createPanel = async () => {
  const panel = document.createElement('div');
  panel.className = 'brandops-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'BrandOps LinkedIn companion');
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      void setPanelVisibility(false);
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleSaveCapture();
    }
  });

  const kicker = document.createElement('p');
  kicker.className = 'brandops-kicker';
  kicker.textContent = 'BrandOps companion';

  const title = document.createElement('p');
  title.className = 'brandops-title';
  title.textContent = 'LinkedIn operator capture';

  const copy = document.createElement('p');
  copy.className = 'brandops-copy';
  copy.textContent =
    'Manual-assist only. Capture context, copy drafts, and keep pipeline updates safe.';

  const compliance = document.createElement('div');
  compliance.className = 'brandops-compliance';
  compliance.textContent =
    'Safety policy: no auto-clicking, no auto-sending, no hidden automation. You review and execute every action.';

  const captureUrlRow = document.createElement('div');
  captureUrlRow.className = 'brandops-row';
  const captureUrlButton = document.createElement('button');
  captureUrlButton.type = 'button';
  captureUrlButton.className = 'brandops-btn';
  captureUrlButton.textContent = 'Capture current LinkedIn URL';
  captureUrlButton.addEventListener('click', () => {
    companionState.profileUrl = window.location.href;
    setStatus('Current LinkedIn profile URL captured.', 'success');
  });
  captureUrlRow.append(captureUrlButton);

  const topGrid = document.createElement('div');
  topGrid.className = 'brandops-grid';
  topGrid.append(createInputField('Name', 'name'), createInputField('Role', 'role'));

  const linkedCompanyField = createSelectField('Link existing company', 'linkedCompanyId');
  const linkedOpportunityField = createSelectField(
    'Link existing opportunity',
    'linkedOpportunityId'
  );
  companionState.elements.companySelect = linkedCompanyField.select;
  companionState.elements.opportunitySelect = linkedOpportunityField.select;

  const actions = document.createElement('div');
  actions.className = 'brandops-actions';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'brandops-btn brandops-btn-primary';
  saveButton.textContent = withKeyboardShortcutHint('Save capture', 'Ctrl/Cmd+Enter');
  saveButton.addEventListener('click', () => {
    void handleSaveCapture();
  });
  companionState.elements.saveButton = saveButton;

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'brandops-btn';
  copyButton.textContent = 'Copy outreach draft';
  copyButton.addEventListener('click', () => {
    void handleCopyOutreach();
  });

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'brandops-btn';
  resetButton.textContent = 'Reset fields';
  resetButton.addEventListener('click', () => {
    resetFormFromProfile();
    setStatus('Fields reset to profile defaults.', 'info');
  });

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'brandops-btn';
  closeButton.textContent = 'Close companion';
  closeButton.addEventListener('click', () => {
    void setPanelVisibility(false);
  });

  actions.append(saveButton, copyButton, resetButton, closeButton);

  const status = document.createElement('div');
  status.className = 'brandops-status';
  status.textContent = 'Ready. Review fields, then save capture.';
  companionState.elements.status = status;

  panel.append(
    kicker,
    title,
    copy,
    compliance,
    captureUrlRow,
    topGrid,
    createInputField('Company', 'company'),
    createInputField('Profile note', 'note', 'textarea'),
    createInputField('Outreach draft (manual send)', 'outreachDraft', 'textarea'),
    createInputField('Opportunity title', 'pipelineName'),
    createInputField('Follow-up date', 'followUpDate', 'date'),
    linkedCompanyField.wrapper,
    linkedOpportunityField.wrapper,
    actions,
    status
  );

  const workspace = await loadWorkspaceData();
  if (workspace) {
    updateSelectOptions(workspace);
  }

  return panel;
};

const buildCompanion = async () => {
  if (companionState.detached) return;

  const existingRoot = document.getElementById(ROOT_ID);
  if (existingRoot) existingRoot.remove();

  ensureStyles();
  syncFormWithProfile();
  companionState.profileUrl = window.location.href;

  const root = document.createElement('div');
  root.id = ROOT_ID;

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'brandops-launcher';
  launcher.setAttribute('aria-label', 'Open BrandOps LinkedIn companion');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.textContent = '♛';

  const panel = await createPanel();

  launcher.addEventListener('click', () => {
    const willOpen = panel.hidden;
    void setPanelVisibility(willOpen);
    if (willOpen) {
      setStatus('Capture context and execute manually. No auto-send.', 'info');
    }
  });

  root.append(panel, launcher);
  document.body.appendChild(root);
  await applyLiquidMotionToCompanionRoot(root);

  companionState.elements.launcher = launcher;
  companionState.elements.panel = panel;

  try {
    const visibilityState = await chrome.storage.local.get(PANEL_VISIBLE_KEY);
    await setPanelVisibility(Boolean(visibilityState[PANEL_VISIBLE_KEY]));
  } catch {
    await setPanelVisibility(false);
  }
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
  const refreshId = ++companionState.refreshToken;

  void (async () => {
    let isOverlayEnabled = true;
    try {
      const data = await storageService.getData();
      isOverlayEnabled = data.settings.overlay.enabled;
    } catch {
      isOverlayEnabled = true;
    }

    if (refreshId !== companionState.refreshToken) return;

    const isProfile = isLinkedInProfilePage(new URL(currentHref));
    if (!isProfile || !isOverlayEnabled) {
      teardownCompanion();
      return;
    }

    companionState.detached = false;
    await buildCompanion();
  })();
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
