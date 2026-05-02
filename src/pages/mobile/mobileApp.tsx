import { type ChangeEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  executeAgentWorkspaceCommand,
  type AgentWorkspaceResult
} from '../../services/agent/agentWorkspaceEngine';
import { storageService, createInMemorySeededWorkspace } from '../../services/storage/storage';
import type { BrandOpsData } from '../../types/domain';
import {
  getCockpitMobileSectionHeadingId,
  type DashboardSectionId
} from '../../shared/config/dashboardNavigation';
import {
  DEFAULT_DASHBOARD_SECTION,
  isAppShellWithSectionQuery,
  type MobileShellTabId,
  parseMobileShellFromSearchParams,
  replaceMobileShellQueryInUrl
} from './mobileShellQuery';
import { CockpitDailyView } from './CockpitDailyView';
import { PulseTimelineView } from './PulseTimelineView';
import { MobileChatView, type ChatMessage } from './MobileChatView';
import { MobileIntegrationsView } from './MobileIntegrationsView';
import { MobileSettingsView } from './MobileSettingsView';
import { buildWorkspaceSnapshot, type MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import { MOBILE_BTN_FOCUS, MobileShellNav } from './mobileTabPrimitives';
import { FirstRunJourneyCard, readFirstRunJourneyDismissed } from './FirstRunJourneyCard';
import { getAgentCommandLock } from './agentCommandAccess';
import { ChatCommandBar } from './ChatCommandBar';
import { WorkspaceCommandPalette } from './WorkspaceCommandPalette';
import { mapDocumentSurfaceToAgentSource } from '../../shared/navigation/appDocumentSurface';
import type { AppDocumentSurfaceId } from '../../shared/navigation/appDocumentSurface';
import { openExtensionSurface } from '../../shared/navigation/openExtensionSurface';
import { CircleHelp } from 'lucide-react';
import { MOBILE_SHELL_NAV_TABS } from './mobileTabConfig';
import { runSettingsConfigure } from './runSettingsConfigure';
import { applyDocumentThemeFromAppSettings } from '../../shared/ui/theme';
import {
  readLaunchAccessState,
  writeLaunchAccessState,
  authProviderLabel,
  type AuthProviderId,
  type LaunchAccessState
} from '../../shared/account/launchAccess';
import {
  shouldRequireLaunchAuth,
  shouldRequireLaunchMembership
} from '../../shared/account/launchLifecycleGate';
import { GoogleSignInButton } from '../../shared/ui/oauth/GoogleSignInButton';
import { AppleSignInButton } from '../../shared/ui/oauth/AppleSignInButton';
import { EmailMagicLinkButton } from '../../shared/ui/oauth/EmailMagicLinkButton';
import { GitHubSignInButton } from '../../shared/ui/oauth/GitHubSignInButton';
import { LinkedInSignInButton } from '../../shared/ui/oauth/LinkedInSignInButton';
import {
  BrandOpsCrownMark,
  OnDeviceDialogTrustFooter,
  WorkspaceDataHint
} from '../../shared/ui/brandopsPolish';
import {
  recordCommandOutcome,
  recordInitialShellReady,
  recordLocalSessionDay,
  recordShellNavigation
} from '../../services/usage/localProductUsage';

const uid = () => `msg-${Math.random().toString(36).slice(2, 9)}`;

const btnFocus = MOBILE_BTN_FOCUS;

interface MobileAppProps {
  initialTab?: MobileShellTabId;
  /** Host HTML document: `mobile` for `mobile.html`; `renderChatbotSurface` passes welcome | dashboard | integrations (`help.html` is the Knowledge Center entry, not this shell). */
  surfaceLabel?: AppDocumentSurfaceId | 'chatbot';
}

const CHAT_THREAD_KEY = 'brandops:agent:chatThread';
const COMMAND_CHIPS_KEY = 'brandops:agent:commandChips';
const MAX_PERSISTED_MESSAGES = 50;
const MAX_COMMAND_CHIPS = 24;

const defaultWelcomeMessage = (
  surface: AppDocumentSurfaceId | 'chatbot' = 'mobile'
): ChatMessage => {
  const mobileLine = 'Try: pipeline health. Or press ⌘K.';
  const welcomeLine = 'Try: pipeline health. Or press ⌘K. Pulse reads, Chat acts.';
  return {
    id: uid(),
    role: 'assistant',
    resultKind: 'plain',
    text: surface === 'welcome' ? `Welcome. ${welcomeLine}` : mobileLine
  };
};

const normalizeStoredMessage = (raw: unknown): ChatMessage | null => {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.id !== 'string') return null;
  if (m.role !== 'user' && m.role !== 'assistant') return null;
  if (typeof m.text !== 'string') return null;
  return {
    id: m.id as string,
    role: m.role as 'user' | 'assistant',
    text: m.text,
    ...(typeof m.action === 'string' ? { action: m.action } : {}),
    ...(typeof m.sourceSurface === 'string'
      ? {
          sourceSurface: m.sourceSurface as 'Pulse' | 'Today' | 'Integrations' | 'Settings' | 'Chat'
        }
      : {}),
    ...(typeof m.ok === 'boolean' ? { ok: m.ok } : {}),
    ...(m.resultKind === 'plain' || m.resultKind === 'command-result'
      ? { resultKind: m.resultKind }
      : {}),
    ...(m.strip && typeof m.strip === 'object'
      ? {
          strip: {
            notes: Number((m.strip as { notes?: unknown }).notes) || 0,
            queue: Number((m.strip as { queue?: unknown }).queue) || 0,
            followUps: Number((m.strip as { followUps?: unknown }).followUps) || 0,
            opportunities: Number((m.strip as { opportunities?: unknown }).opportunities) || 0
          }
        }
      : {})
  };
};

const readChatThread = (): ChatMessage[] | null => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CHAT_THREAD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const rows = parsed
      .map((item) => normalizeStoredMessage(item))
      .filter((m): m is ChatMessage => Boolean(m));
    return rows.length > 0 ? rows.slice(-MAX_PERSISTED_MESSAGES) : null;
  } catch {
    return null;
  }
};

const writeChatThread = (rows: ChatMessage[]) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CHAT_THREAD_KEY, JSON.stringify(rows.slice(-MAX_PERSISTED_MESSAGES)));
  } catch {
    // ignore quota
  }
};

const readCommandChips = (): string[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMMAND_CHIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMMAND_CHIPS) : [];
  } catch {
    return [];
  }
};

const pushCommandChip = (cmd: string) => {
  if (typeof localStorage === 'undefined') return;
  const t = cmd.trim();
  if (!t) return;
  const next = [t, ...readCommandChips().filter((c) => c !== t)].slice(0, MAX_COMMAND_CHIPS);
  try {
    localStorage.setItem(COMMAND_CHIPS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
};

const needsDestructiveConfirm = (text: string) => {
  const lower = text.toLowerCase();
  return lower.includes('archive opportunity') || lower.includes('archive content');
};

const clearPersistedCommandChips = () => {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(COMMAND_CHIPS_KEY);
};

const buildStripFromWorkspace = (data: BrandOpsData) => ({
  notes: data.notes.length,
  queue: data.publishingQueue.length,
  followUps: data.followUps.filter((f) => !f.completed).length,
  opportunities: data.opportunities.filter((o) => !o.archivedAt).length
});

/** Max size for inlining text file contents into the command string (agent is text-only). */
const MAX_CHAT_TEXT_ATTACHMENT = 32_000;
const STRIPE_CHECKOUT_URL = import.meta.env.VITE_STRIPE_CHECKOUT_URL as string | undefined;
const STRIPE_BILLING_PORTAL_URL = import.meta.env.VITE_STRIPE_BILLING_PORTAL_URL as
  | string
  | undefined;

type ChatComposerAttachment = {
  name: string;
  size: number;
  kind: 'text' | 'binary';
  text?: string;
};

function buildOutgoingCommandLine(
  inputTrimmed: string,
  attachment: ChatComposerAttachment | null
): string | null {
  if (!attachment) {
    return inputTrimmed.length > 0 ? inputTrimmed : null;
  }
  if (attachment.kind === 'text' && attachment.text) {
    const block = `--- ${attachment.name} ---\n${attachment.text}`;
    if (inputTrimmed) return `${inputTrimmed}\n\n${block}`;
    return `add note:\n\n${block}`;
  }
  const bin = `(Attached: ${attachment.name}, ${attachment.size} bytes — not text; add what the agent should do.)`;
  if (inputTrimmed) return `${inputTrimmed}\n\n${bin}`;
  return `add note: ${bin}`;
}

function LaunchAuthGate({
  btnFocus,
  onSignInProvider
}: {
  btnFocus: string;
  onSignInProvider: (provider: AuthProviderId) => void;
}) {
  return (
    <section className="bo-flagship-surface bo-auth-surface p-4 text-sm text-textMuted">
      <h2 className="text-h2 text-text">Sign in to continue</h2>
      <p className="mt-1 text-[11px] text-textSoft">
        Launch setup uses one account across mobile and extension. Pick a provider:
      </p>
      <div className="bo-auth-actions mt-3">
        <GoogleSignInButton
          onClick={() => onSignInProvider('google')}
          variant="continue"
          className={btnFocus}
        />
        <AppleSignInButton
          onClick={() => onSignInProvider('apple')}
          variant="continue"
          className={btnFocus}
        />
        <EmailMagicLinkButton
          onClick={() => onSignInProvider('email')}
          variant="continue"
          className={btnFocus}
        />
        <LinkedInSignInButton
          onClick={() => onSignInProvider('linkedin')}
          variant="continue"
          className={btnFocus}
        />
        <GitHubSignInButton
          onClick={() => onSignInProvider('github')}
          variant="continue"
          className={btnFocus}
        />
      </div>
    </section>
  );
}

function MembershipGate({
  btnFocus,
  onStartCheckout,
  onOpenBillingPortal
}: {
  btnFocus: string;
  onStartCheckout: () => void;
  onOpenBillingPortal: () => void;
}) {
  return (
    <section className="bo-flagship-surface bo-auth-surface p-4 text-sm text-textMuted">
      <h2 className="text-h2 text-text">Activate membership</h2>
      <p className="mt-1 text-[11px] text-textSoft">
        One paid plan unlocks full workspace execution across app and extension.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={clsx('bo-link', btnFocus)} onClick={onStartCheckout}>
          Open Stripe checkout
        </button>
        <button type="button" className={clsx('bo-link', btnFocus)} onClick={onOpenBillingPortal}>
          Billing portal
        </button>
      </div>
      <p className="mt-2 text-[10px] text-textSoft">
        Set `VITE_STRIPE_CHECKOUT_URL` and `VITE_STRIPE_BILLING_PORTAL_URL` in env for production.
      </p>
    </section>
  );
}

function readInitialShellState(initialTab: MobileShellTabId): {
  tab: MobileShellTabId;
  workstream: DashboardSectionId;
} {
  if (typeof window === 'undefined' || !isAppShellWithSectionQuery()) {
    return { tab: initialTab, workstream: DEFAULT_DASHBOARD_SECTION };
  }
  const p = parseMobileShellFromSearchParams(
    new URLSearchParams(window.location.search),
    initialTab
  );
  return { tab: p.tab, workstream: p.workstream ?? DEFAULT_DASHBOARD_SECTION };
}

export const MobileApp = ({ initialTab = 'pulse', surfaceLabel = 'mobile' }: MobileAppProps) => {
  const dialogDestrId = useId();
  const dialogClearId = useId();
  const dialogResetId = useId();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const clearConfirmRef = useRef<HTMLButtonElement>(null);
  const resetConfirmRef = useRef<HTMLButtonElement>(null);
  const cockpitSectionScrollRef = useRef(false);
  const mountAtRef = useRef(performance.now());
  const shellReadyLoggedRef = useRef(false);
  const prevTabForUsageRef = useRef<MobileShellTabId | null>(null);

  const [initialShell] = useState(() => readInitialShellState(initialTab));
  const [activeTab, setActiveTab] = useState<MobileShellTabId>(() => initialShell.tab);
  const [cockpitWorkstream, setCockpitWorkstream] = useState<DashboardSectionId>(
    () => initialShell.workstream
  );
  const [input, setInput] = useState('');
  /** Agent command in flight (Chat send, quick commands from any tab). */
  const [commandLoading, setCommandLoading] = useState(false);
  /** Settings Preferences `configure:` apply in flight only. */
  const [settingsApplyLoading, setSettingsApplyLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<MobileWorkspaceSnapshot>(() =>
    buildWorkspaceSnapshot(createInMemorySeededWorkspace())
  );
  const [commandHistory, setCommandHistory] = useState<string[]>(() => readCommandChips());
  const [pendingDestructive, setPendingDestructive] = useState<string | null>(null);
  const [pendingClearChat, setPendingClearChat] = useState(false);
  const [pendingResetWorkspace, setPendingResetWorkspace] = useState(false);
  const [dataOpsHint, setDataOpsHint] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [chatAttachment, setChatAttachment] = useState<ChatComposerAttachment | null>(null);
  const [launchAccess, setLaunchAccess] = useState<LaunchAccessState>(() =>
    readLaunchAccessState()
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const persisted = readChatThread();
    if (persisted && persisted.length > 0) return persisted;
    return [defaultWelcomeMessage(surfaceLabel)];
  });
  const [firstRunJourneyVisible, setFirstRunJourneyVisible] = useState(
    () => !readFirstRunJourneyDismissed()
  );

  const refreshWorkspaceSnapshot = useCallback(async () => {
    try {
      const workspace = await storageService.getData();
      if (!shellReadyLoggedRef.current) {
        shellReadyLoggedRef.current = true;
        void recordInitialShellReady(performance.now() - mountAtRef.current);
      }
      applyDocumentThemeFromAppSettings(workspace.settings);
      setSnapshot(buildWorkspaceSnapshot(workspace));
    } catch (err) {
      console.error('BrandOps: failed to refresh workspace snapshot', err);
    }
    setCommandHistory(readCommandChips());
  }, []);

  useEffect(() => {
    void refreshWorkspaceSnapshot();
  }, [refreshWorkspaceSnapshot]);

  useEffect(() => {
    void recordLocalSessionDay();
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      setScrollProgress(Math.min(1, Math.max(0, window.scrollY / max)));
    };
    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [activeTab]);

  useEffect(() => {
    if (prevTabForUsageRef.current === null) {
      prevTabForUsageRef.current = activeTab;
      return;
    }
    if (prevTabForUsageRef.current !== activeTab) {
      void recordShellNavigation(prevTabForUsageRef.current, activeTab);
    }
    prevTabForUsageRef.current = activeTab;
  }, [activeTab]);

  const commitTab = useCallback(
    (next: MobileShellTabId) => {
      setActiveTab(next);
      if (isAppShellWithSectionQuery()) {
        replaceMobileShellQueryInUrl(next, cockpitWorkstream);
      }
    },
    [cockpitWorkstream]
  );

  const handleSelectWorkstream = useCallback((id: DashboardSectionId) => {
    setCockpitWorkstream(id);
    if (isAppShellWithSectionQuery()) {
      replaceMobileShellQueryInUrl('daily', id);
    }
  }, []);

  useEffect(() => {
    if (!isAppShellWithSectionQuery()) return;
    const onPopState = () => {
      const p = parseMobileShellFromSearchParams(
        new URLSearchParams(window.location.search),
        initialTab
      );
      setActiveTab(p.tab);
      setCockpitWorkstream(p.workstream ?? DEFAULT_DASHBOARD_SECTION);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [initialTab]);

  useEffect(() => {
    cockpitSectionScrollRef.current = false;
  }, [activeTab, cockpitWorkstream]);

  useEffect(() => {
    if (!isAppShellWithSectionQuery()) return;
    if (activeTab !== 'daily') return;
    if (cockpitSectionScrollRef.current) return;
    cockpitSectionScrollRef.current = true;
    const id = getCockpitMobileSectionHeadingId(cockpitWorkstream);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [activeTab, cockpitWorkstream]);

  useEffect(() => {
    writeChatThread(messages);
  }, [messages]);

  useEffect(() => {
    writeLaunchAccessState(launchAccess);
  }, [launchAccess]);

  useEffect(() => {
    if (pendingDestructive) {
      confirmBtnRef.current?.focus();
    }
  }, [pendingDestructive]);

  useEffect(() => {
    if (pendingClearChat) {
      clearConfirmRef.current?.focus();
    }
  }, [pendingClearChat]);

  useEffect(() => {
    if (pendingResetWorkspace) {
      resetConfirmRef.current?.focus();
    }
  }, [pendingResetWorkspace]);

  useEffect(() => {
    if (!dataOpsHint) return;
    const t = window.setTimeout(() => setDataOpsHint(null), 5200);
    return () => window.clearTimeout(t);
  }, [dataOpsHint]);

  useEffect(() => {
    if (activeTab !== 'chat') setChatAttachment(null);
  }, [activeTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || (e.key !== 'k' && e.key !== 'K')) return;
      e.preventDefault();
      setCommandPaletteOpen((open) => !open);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const agentCommandLock = getAgentCommandLock(launchAccess, activeTab);
  const canExecuteAgentCommandsFromPalette = agentCommandLock === null;

  const executeCommandFlow = async (
    trimmed: string,
    sourceSurface: 'Pulse' | 'Today' | 'Integrations' | 'Settings' | 'Chat' = 'Chat'
  ) => {
    if (!trimmed || commandLoading) return;
    setMessages((prev) => [...prev, { id: uid(), role: 'user', text: trimmed, sourceSurface }]);
    setCommandLoading(true);
    const t0 = performance.now();
    let commandOk = false;
    try {
      const result = await executeAgentWorkspaceCommand({
        text: trimmed,
        actorName: 'mobile-operator',
        source: mapDocumentSurfaceToAgentSource(surfaceLabel)
      });
      const data = await storageService.getData();
      const strip = buildStripFromWorkspace(data);
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          resultKind: 'command-result',
          text: result.summary,
          action: result.action,
          ok: result.ok,
          sourceSurface,
          strip
        }
      ]);
      pushCommandChip(trimmed);
      await refreshWorkspaceSnapshot();
      commandOk = result.ok;
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          resultKind: 'command-result',
          ok: false,
          action: 'error',
          sourceSurface,
          text: error instanceof Error ? error.message : 'Unknown error while processing command.'
        }
      ]);
    } finally {
      const durationMs = performance.now() - t0;
      void recordCommandOutcome({ ok: commandOk, durationMs });
      setCommandLoading(false);
    }
  };

  const startSend = (
    trimmed: string,
    sourceSurface: 'Pulse' | 'Today' | 'Integrations' | 'Settings' | 'Chat' = 'Chat'
  ) => {
    if (!trimmed || commandLoading) return;
    if (needsDestructiveConfirm(trimmed)) {
      setPendingDestructive(trimmed);
      return;
    }
    void executeCommandFlow(trimmed, sourceSurface);
  };

  /** Switches to Chat and runs the command immediately (same engine as Send). */
  const sendQuickCommand = (command: string) => {
    const trimmed = command.trim();
    if (!trimmed || commandLoading) return;
    setChatAttachment(null);
    commitTab('chat');
    setInput('');
    queueMicrotask(() => {
      startSend(trimmed, 'Chat');
    });
  };

  /**
   * Same as {@link sendQuickCommand}, but annotates origin so users can tell why they jumped to
   * Chat (prevents "button only navigated me" confusion).
   */
  const sendQuickCommandFrom = (source: 'Pulse' | 'Today' | 'Integrations' | 'Settings') => {
    return (command: string) => {
      const trimmed = command.trim();
      if (!trimmed || commandLoading) return;
      setDataOpsHint(`Running from ${source} in Chat...`);
      setChatAttachment(null);
      commitTab('chat');
      setInput('');
      queueMicrotask(() => {
        startSend(trimmed, source);
      });
    };
  };

  const onSignInProvider = useCallback((provider: AuthProviderId) => {
    const nextEmail =
      provider === 'google'
        ? 'google.user@brandops.app'
        : provider === 'apple'
          ? 'apple.user@brandops.app'
          : provider === 'github'
            ? 'github.user@brandops.app'
            : provider === 'linkedin'
              ? 'linkedin.user@brandops.app'
              : 'operator@brandops.app';
    setLaunchAccess((prev) => ({
      ...prev,
      auth: {
        isAuthenticated: true,
        provider,
        email: nextEmail,
        signedInAt: new Date().toISOString()
      }
    }));
    setDataOpsHint(`Signed in with ${authProviderLabel(provider)}.`);
  }, []);

  const onSignOut = useCallback(() => {
    setLaunchAccess((prev) => ({
      ...prev,
      auth: { isAuthenticated: false, provider: null, email: '' }
    }));
    setDataOpsHint('Signed out.');
  }, []);

  const onStartCheckout = useCallback(() => {
    if (STRIPE_CHECKOUT_URL) {
      window.open(STRIPE_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
    } else {
      setDataOpsHint('Set VITE_STRIPE_CHECKOUT_URL to open checkout.');
    }
  }, []);

  const onOpenBillingPortal = useCallback(() => {
    if (STRIPE_BILLING_PORTAL_URL) {
      window.open(STRIPE_BILLING_PORTAL_URL, '_blank', 'noopener,noreferrer');
    } else {
      setDataOpsHint('Set VITE_STRIPE_BILLING_PORTAL_URL to open billing portal.');
    }
  }, []);

  const onMarkMembershipActive = useCallback(() => {
    setLaunchAccess((prev) => ({
      ...prev,
      membership: {
        status: 'active',
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      }
    }));
    setDataOpsHint('Membership marked active for launch QA.');
  }, []);

  const onChatFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const extText = /\.(txt|md|json|csv|log|yml|yaml|xml)$/i.test(file.name);
    const asText = file.type.startsWith('text/') || file.type === 'application/json' || extText;
    if (asText && file.size > MAX_CHAT_TEXT_ATTACHMENT) {
      setDataOpsHint('Text attachment too large (max 32KB).');
      return;
    }
    if (asText && file.size <= MAX_CHAT_TEXT_ATTACHMENT) {
      const reader = new FileReader();
      reader.onload = () => {
        setChatAttachment({
          name: file.name,
          size: file.size,
          kind: 'text',
          text: String(reader.result ?? '')
        });
      };
      reader.onerror = () => setDataOpsHint('Could not read file.');
      reader.readAsText(file);
    } else {
      setChatAttachment({ name: file.name, size: file.size, kind: 'binary' });
    }
  };

  /** Same as {@link sendQuickCommand}: Today / Integrations / Settings chips must show Chat + thread results. */
  const runCommand = sendQuickCommand;

  const primeChat = useCallback(
    (line: string) => {
      commitTab('chat');
      setInput(line);
    },
    [commitTab]
  );

  const exportWorkspace = useCallback(async () => {
    try {
      const raw = await storageService.exportData();
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brandops-workspace-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataOpsHint('Export downloaded.');
    } catch (e) {
      setDataOpsHint(e instanceof Error ? e.message : 'Export failed.');
    }
  }, []);

  const importWorkspace = useCallback(
    async (raw: string) => {
      await storageService.importData(raw);
      await refreshWorkspaceSnapshot();
      setDataOpsHint('Workspace imported.');
    },
    [refreshWorkspaceSnapshot]
  );

  /** Same engine as Chat `configure:`, but does not append to the chat thread (use from Settings forms). */
  const applySettingsConfigure = useCallback(
    async (line: string): Promise<AgentWorkspaceResult | null> => {
      const full = line.trim();
      if (!full || settingsApplyLoading) return null;
      setSettingsApplyLoading(true);
      try {
        const result = await runSettingsConfigure(line, surfaceLabel, false);
        if (result?.ok) {
          await refreshWorkspaceSnapshot();
        }
        return result;
      } catch (err) {
        console.error('BrandOps: settings apply failed', err);
        return null;
      } finally {
        setSettingsApplyLoading(false);
      }
    },
    [settingsApplyLoading, refreshWorkspaceSnapshot, surfaceLabel]
  );

  const submitMessage = async () => {
    const line = buildOutgoingCommandLine(input.trim(), chatAttachment);
    if (!line?.trim() || commandLoading) return;
    setInput('');
    setChatAttachment(null);
    startSend(line.trim(), 'Chat');
  };

  const shellMeta = MOBILE_SHELL_NAV_TABS.find((t) => t.id === activeTab);

  return (
    <div className="bo-mobile-app relative isolate min-h-[100dvh] min-h-screen">
      <a href="#bo-mobile-main" className="bo-mobile-skip">
        Skip to main content
      </a>
      <header className="bo-mobile-header bo-mobile-header-bar sticky top-0 z-20 shadow-none">
        <div
          className="bo-scroll-progress"
          style={{ transform: `scaleX(${scrollProgress})` }}
          aria-hidden
        />
        <div className="mx-auto flex w-full max-w-md items-start justify-between gap-3 px-4">
          <div className="bo-mobile-brand flex min-w-0 flex-1 gap-3">
            <span className="bo-mobile-brand__mark bo-mobile-brand__mark--compact shrink-0" aria-hidden>
              <BrandOpsCrownMark className="bo-mobile-brand__logo" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="bo-mobile-brand__wordmark">BrandOps</p>
              <h1 className="bo-mobile-brand__title text-h1">{shellMeta?.label ?? 'Workspace'}</h1>
              <p className="bo-mobile-tagline text-label text-textSoft">{shellMeta?.tagline ?? ''}</p>
              {dataOpsHint ? <WorkspaceDataHint message={dataOpsHint} /> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => openExtensionSurface('help')}
            aria-label="Open Help"
            title="Knowledge Center — Help"
            className={clsx(
              'bo-mobile-help-btn rounded-xl border border-border/45 bg-surface/50 p-2.5 text-textMuted transition-colors duration-fast hover:border-borderStrong hover:bg-surfaceActive hover:text-text',
              btnFocus
            )}
          >
            <CircleHelp className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </header>

      <main
        id="bo-mobile-main"
        tabIndex={-1}
        className={clsx(
          'bo-mobile-main mx-auto w-full max-w-md pt-6 outline-none motion-safe:scroll-smooth',
          activeTab === 'chat'
            ? 'pb-[max(11.25rem,calc(9.5rem+env(safe-area-inset-bottom,0px)))]'
            : 'pb-[max(11rem,calc(9rem+env(safe-area-inset-bottom,0px)))]'
        )}
      >
        {shouldRequireLaunchAuth(launchAccess) ? (
          <div className="px-[max(1rem,env(safe-area-inset-left,0px))] pe-[max(1rem,env(safe-area-inset-right,0px))]">
            <LaunchAuthGate btnFocus={btnFocus} onSignInProvider={onSignInProvider} />
          </div>
        ) : shouldRequireLaunchMembership(launchAccess) && activeTab !== 'settings' ? (
          <div className="px-[max(1rem,env(safe-area-inset-left,0px))] pe-[max(1rem,env(safe-area-inset-right,0px))]">
            <MembershipGate
              btnFocus={btnFocus}
              onStartCheckout={onStartCheckout}
              onOpenBillingPortal={onOpenBillingPortal}
            />
          </div>
        ) : activeTab === 'chat' ? (
          <section
            className="bo-shell-page bo-shell-panel-enter space-y-4 px-[max(1rem,env(safe-area-inset-left,0px))] pe-[max(1rem,env(safe-area-inset-right,0px))] pb-4 motion-reduce:animate-none"
            aria-label="Chat conversation"
            key="shell-chat"
          >
            <MobileChatView
              messages={messages}
              loading={commandLoading}
              commandHistory={commandHistory}
              onQuickCommand={sendQuickCommand}
              onClearCommandHistory={() => {
                clearPersistedCommandChips();
                setCommandHistory([]);
              }}
              btnFocus={btnFocus}
              onOpenToday={() => commitTab('daily')}
            />
          </section>
        ) : (
          <section
            key={activeTab}
            className="bo-shell-tab-root bo-shell-page bo-shell-panel-enter space-y-6 px-[max(1rem,env(safe-area-inset-left,0px))] pe-[max(1rem,env(safe-area-inset-right,0px))] pb-8 text-sm text-textMuted motion-reduce:animate-none"
            aria-label={`${activeTab} tab`}
          >
            {activeTab === 'pulse' ? (
              <>
                {firstRunJourneyVisible ? (
                  <FirstRunJourneyCard
                    btnFocus={btnFocus}
                    onDismiss={() => setFirstRunJourneyVisible(false)}
                    onTryCommand={(line) => runCommand(line)}
                  />
                ) : null}
                <PulseTimelineView
                  snapshot={snapshot}
                  btnFocus={btnFocus}
                  commandBusy={commandLoading}
                  runCommand={sendQuickCommandFrom('Pulse')}
                  primeChat={primeChat}
                />
              </>
            ) : null}

            {activeTab === 'daily' ? (
              <CockpitDailyView
                snapshot={snapshot}
                btnFocus={btnFocus}
                commandBusy={commandLoading}
                runCommand={sendQuickCommandFrom('Today')}
                primeChat={primeChat}
                onOpenInAppSettings={() => commitTab('settings')}
                onOpenPulseTab={() => commitTab('pulse')}
                activeWorkstream={cockpitWorkstream}
                onSelectWorkstream={handleSelectWorkstream}
              />
            ) : null}

            {activeTab === 'integrations' ? (
              <MobileIntegrationsView
                snapshot={snapshot}
                btnFocus={btnFocus}
                commandBusy={commandLoading}
                runCommand={sendQuickCommandFrom('Integrations')}
                documentSurface={surfaceLabel}
              />
            ) : null}

            {activeTab === 'settings' ? (
              <MobileSettingsView
                snapshot={snapshot}
                btnFocus={btnFocus}
                runCommand={sendQuickCommandFrom('Settings')}
                applySettingsConfigure={applySettingsConfigure}
                applyBusy={settingsApplyLoading}
                commandBusy={commandLoading}
                onRequestClearChat={() => setPendingClearChat(true)}
                onExportWorkspace={exportWorkspace}
                onImportWorkspace={importWorkspace}
                onRequestResetWorkspace={() => setPendingResetWorkspace(true)}
                documentSurface={surfaceLabel}
                isAuthenticated={launchAccess.auth.isAuthenticated}
                authProvider={launchAccess.auth.provider}
                authEmail={launchAccess.auth.email}
                membership={launchAccess.membership}
                onSignInProvider={onSignInProvider}
                onSignOut={onSignOut}
                onStartCheckout={onStartCheckout}
                onOpenBillingPortal={onOpenBillingPortal}
              />
            ) : null}
          </section>
        )}
      </main>

      {activeTab === 'chat' && !shouldRequireLaunchAuth(launchAccess) ? (
        <ChatCommandBar
          value={input}
          onChange={setInput}
          onSubmit={() => void submitMessage()}
          onRunAndClear={(line) => {
            setChatAttachment(null);
            setInput('');
            queueMicrotask(() => startSend(line.trim()));
          }}
          commandLoading={commandLoading}
          recentCommandLines={commandHistory}
          onFileChange={onChatFileSelected}
          fileInputRef={chatFileInputRef}
          chatAttachment={chatAttachment}
          onRemoveAttachment={() => setChatAttachment(null)}
        />
      ) : null}

      {activeTab === 'settings' && shouldRequireLaunchMembership(launchAccess) ? (
        <div className="bo-mobile-main fixed inset-x-0 bottom-[calc(10.85rem+env(safe-area-inset-bottom,0px))] z-[32] mx-auto w-full max-w-md px-2 pe-14 ps-3">
          <button
            type="button"
            onClick={onMarkMembershipActive}
            className={clsx(
              'w-full rounded-lg border border-borderStrong bg-surfaceActive px-3 py-2 text-sm text-text',
              btnFocus
            )}
          >
            Mark membership active (QA)
          </button>
        </div>
      ) : null}

      {pendingDestructive ? (
        <div
          className="bo-system-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPendingDestructive(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogDestrId}
            className="bo-system-sheet w-full max-w-sm rounded-2xl border border-border/70 p-4 shadow-panel"
          >
            <h2 id={dialogDestrId} className="text-base font-semibold text-text">
              Archive workspace data?
            </h2>
            <p className="mt-2 text-sm text-textMuted">
              This command can archive an opportunity or content. It cannot be undone from the chat
              UI.
            </p>
            <p className="mt-2 rounded-lg border border-border/50 bg-bgSubtle/80 p-2 font-mono text-xs text-textMuted">
              {pendingDestructive}
            </p>
            <OnDeviceDialogTrustFooter />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={`rounded-lg border border-border px-3 py-2 text-sm text-textMuted ${btnFocus}`}
                onClick={() => setPendingDestructive(null)}
              >
                Cancel
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className={`rounded-lg bg-warning px-3 py-2 text-sm font-semibold text-text ${btnFocus}`}
                onClick={() => {
                  const cmd = pendingDestructive;
                  setPendingDestructive(null);
                  if (cmd) void executeCommandFlow(cmd);
                }}
              >
                Run command
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingClearChat ? (
        <div
          className="bo-system-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPendingClearChat(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogClearId}
            className="bo-system-sheet w-full max-w-sm rounded-2xl border border-border/70 p-4 shadow-panel"
          >
            <h2 id={dialogClearId} className="text-base font-semibold text-text">
              Clear chat transcript?
            </h2>
            <p className="mt-2 text-sm text-textMuted">
              This removes the on-device message history. Command chips are unchanged.
            </p>
            <OnDeviceDialogTrustFooter />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={`rounded-lg border border-border px-3 py-2 text-sm text-textMuted ${btnFocus}`}
                onClick={() => setPendingClearChat(false)}
              >
                Cancel
              </button>
              <button
                ref={clearConfirmRef}
                type="button"
                className={`rounded-lg border border-borderStrong bg-surfaceActive px-3 py-2 text-sm font-medium text-text ${btnFocus}`}
                onClick={() => {
                  setPendingClearChat(false);
                  setMessages([defaultWelcomeMessage(surfaceLabel)]);
                  if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem(CHAT_THREAD_KEY);
                  }
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingResetWorkspace ? (
        <div
          className="bo-system-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPendingResetWorkspace(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogResetId}
            className="bo-system-sheet w-full max-w-sm rounded-2xl border border-border/70 p-4 shadow-panel"
          >
            <h2 id={dialogResetId} className="text-base font-semibold text-text">
              Reset workspace to seed data?
            </h2>
            <p className="mt-2 text-sm text-textMuted">
              Replaces all BrandOps workspace data on this device with the default seed. Chat
              transcript and command chips are not cleared — use Settings session actions if you
              want those gone.
            </p>
            <OnDeviceDialogTrustFooter />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={`rounded-lg border border-border px-3 py-2 text-sm text-textMuted ${btnFocus}`}
                onClick={() => setPendingResetWorkspace(false)}
              >
                Cancel
              </button>
              <button
                ref={resetConfirmRef}
                type="button"
                className={`rounded-lg bg-warning px-3 py-2 text-sm font-semibold text-text ${btnFocus}`}
                onClick={() => {
                  setPendingResetWorkspace(false);
                  void (async () => {
                    try {
                      await storageService.resetToSeed();
                      await refreshWorkspaceSnapshot();
                      setDataOpsHint('Workspace reset to seed.');
                    } catch (e) {
                      setDataOpsHint(e instanceof Error ? e.message : 'Reset failed.');
                    }
                  })();
                }}
              >
                Reset workspace
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab !== 'chat' && !shouldRequireLaunchAuth(launchAccess) ? (
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Open workspace command palette"
          title="Commands & search (⌘K / Ctrl+K)"
          className={clsx('bo-command-handle', btnFocus)}
        >
          <BrandOpsCrownMark className="bo-command-handle__logo" aria-hidden />
        </button>
      ) : null}

      <MobileShellNav activeTab={activeTab} onSelect={commitTab} btnFocus={btnFocus} />

      <WorkspaceCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        canExecuteAgentCommands={canExecuteAgentCommandsFromPalette}
        agentLockReason={agentCommandLock}
        commandBusy={commandLoading}
        commandHistory={commandHistory}
        onNavigateTab={commitTab}
        onRunCommand={runCommand}
        onOpenHelp={() => openExtensionSurface('help')}
      />
    </div>
  );
};
