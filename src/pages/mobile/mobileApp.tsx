import { type ChangeEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  executeAgentWorkspaceCommand,
  type AgentWorkspaceResult
} from '../../services/agent/agentWorkspaceEngine';
import { runChatCompletion } from '../../services/ai/hostedNlp';
import { persistChatGatewayTrace } from '../../services/ai/aiGatewayTracing';
import { buildHostedAskMessages } from '../../services/ai/hostedAskTurn';
import { parseHostedAskResponse, sanitizeAiCitationChunks } from '../../services/ai/aiIoProvenance';
import {
  findOrphanInlineCitationMarkers,
  sanitizeOrphanInlineMarkers
} from '../../services/ai/aiInlineCitations';
import { prependAiAssistantTurnTrace } from '../../services/ai/aiAssistantTraceLog';
import {
  buildAssistantAskTraceBundle,
  toAssistantAskTraceSummaryUI
} from '../../services/ai/aiTraceBundleBuilder';
import {
  prependAITraceBundle,
  sanitizeAssistantAskTraceSummaryUI
} from '../../services/ai/aiTracePersistence';
import { resolveActiveCopilotWorker } from '../../services/ai/copilotWorkers';
import { resolveHostedAssistantRouting } from '../../services/ai/aiAskRouting';
import { isAllowedForWorker } from '../../services/ai/llmStructuredApply';
import {
  parseAiExecutablePayload,
  arePipelineCommandsAllowed,
  runSequentialAgentCommands,
  formatPipelineAutoRunSummary
} from '../../services/ai/actionPipeline';
import { storageService, createInMemorySeededWorkspace } from '../../services/storage/storage';
import { prependOperatorTrace } from '../../services/dataset/operatorTraces';
import type {
  BrandOpsData,
  DigitalTwinSourceType,
  OperatingPresetId,
  UiTheme
} from '../../types/domain';
import type { AiOperatorMode, PipelineRun } from '../../types/aiIntegrationSuite';
import {
  getCockpitMobileSectionHeadingId,
  type DashboardSectionId
} from '../../shared/config/dashboardNavigation';
import {
  SETTINGS_RESUME_PHASE_SECTION_ID,
  DEFAULT_DASHBOARD_SECTION,
  isAppShellWithSectionQuery,
  type MobileShellTabId,
  parseMobileShellFromSearchParams,
  replaceMobileShellQueryInUrl
} from './mobileShellQuery';
import { CockpitDailyView } from './CockpitDailyView';
import { MobileWorkspaceHubView } from './MobileWorkspaceHubView';
import { MobileChatView, type AskPlanConversionKind, type ChatMessage } from './MobileChatView';
import { MobileIntegrationsView } from './MobileIntegrationsView';
import { MobileSettingsView } from './MobileSettingsView';
import {
  buildWorkspaceSnapshot,
  type MobileWorkspaceSnapshot,
  type PlanExecutionReceipt
} from './buildWorkspaceSnapshot';
import { MOBILE_BTN_FOCUS, MobileShellNav } from './mobileTabPrimitives';
import { MOBILE_SHELL_EDGE_PAD_CLASS, MOBILE_SHELL_MAX_WIDTH_CLASS } from './shellLayoutTokens';
import {
  FirstRunJourneyCard,
  GETTING_STARTED_CONTENT_VERSION,
  readFirstRunJourneyDismissed
} from './FirstRunJourneyCard';
import { getAgentCommandLock } from './agentCommandAccess';
import { ChatCommandBar } from './ChatCommandBar';
import { AppearanceToggle } from './AppearanceToggle';
import { WorkspaceCommandPalette } from './WorkspaceCommandPalette';
import type { OperationalPlanCard } from './PlanOperationalStudio';
import type { PredictiveOpportunitySuggestion } from '../../services/plan/predictiveOpportunityLayer';
import type { ContentIdeationItem } from '../../services/plan/predictiveContentIdeationEngine';
import type { WorkflowPrediction } from '../../services/plan/workflowPredictionLayer';
import { buildOperationalPlanFromPredictiveSuggestion } from './predictivePlanConversion';
import { buildOperationalPlanFromContentIdeation } from './contentIdeationPlanConversion';
import { buildOperationalPlanFromWorkflowPrediction } from './workflowPredictionPlanConversion';
import { PlanSurfaceNav } from './PlanSurfaceNav';
import { requestExtensionSchedulerSync } from '../../services/messaging/requestExtensionSchedulerSync';
import { mapDocumentSurfaceToAgentSource } from '../../shared/navigation/appDocumentSurface';
import type { AppDocumentSurfaceId } from '../../shared/navigation/appDocumentSurface';
import { openExtensionSurface } from '../../shared/navigation/openExtensionSurface';
import { CircleHelp, Search } from 'lucide-react';
import {
  SHELL_SCREEN_TITLE,
  SHELL_TAB_SR_SUMMARY,
  shellPlanStackLandmarkLabel
} from './shellSectionCopy';
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
import {
  approveOperatorTraceEntry,
  rejectOperatorTraceEntry
} from '../../services/plan/reviewQueue';
import {
  buildDigitalTwinContextSummary,
  createDigitalTwinFromText,
  getActiveDigitalTwin,
  hydrateWorkspaceFromDigitalTwin,
  removeDigitalTwinWorkspaceArtifacts
} from '../../services/digitalTwin/digitalTwin';
import { evolveActiveTwinFromConnectedIdentity } from '../../services/connectedIdentity/connectedIdentityEngine';

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
  surface: AppDocumentSurfaceId | 'chatbot' = 'mobile',
  gettingStartedChecklistVisible = true
): ChatMessage => {
  const mobileLine = gettingStartedChecklistVisible
    ? 'ASK. PLAN. OPERATE. Your AI digital twin understands your profession, connects to your tools, and helps operate your workflows.'
    : 'ASK is twin-aware intelligence. PLAN creates AI planning artifacts. OPERATE keeps execution visible with approvals, timelines, receipts, and audit history.';
  const welcomeLine = gettingStartedChecklistVisible
    ? 'ASK. PLAN. OPERATE. Your AI digital twin understands your profession, connects to your tools, and helps operate your workflows.'
    : 'ASK handles twin-aware strategy. PLAN creates execution plans. OPERATE tracks approvals, receipts, and operating timelines.';
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
          sourceSurface: m.sourceSurface as
            | 'Workspace'
            | 'Today'
            | 'Integrations'
            | 'Settings'
            | 'Chat'
        }
      : {}),
    ...(typeof m.ok === 'boolean' ? { ok: m.ok } : {}),
    ...(m.resultKind === 'plain' ||
    m.resultKind === 'command-result' ||
    m.resultKind === 'ask-result'
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
      : {}),
    ...(Array.isArray(m.citations) ? { citations: sanitizeAiCitationChunks(m.citations) } : {}),
    ...((): Record<string, never> | { orphanInlineMarkers: string[] } => {
      const raw = Array.isArray(m.orphanInlineMarkers)
        ? m.orphanInlineMarkers
        : Array.isArray(m.orphan_inline_markers)
          ? m.orphan_inline_markers
          : null;
      if (!raw) return {};
      const cleaned = sanitizeOrphanInlineMarkers(
        raw.filter((x): x is string => typeof x === 'string')
      );
      return cleaned.length ? { orphanInlineMarkers: cleaned } : {};
    })(),
    ...(():
      | Record<string, never>
      | { traceSummary: NonNullable<ReturnType<typeof sanitizeAssistantAskTraceSummaryUI>> } => {
      const ts = sanitizeAssistantAskTraceSummaryUI(m.traceSummary ?? m.trace_summary);
      return ts ? { traceSummary: ts } : {};
    })()
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
const ALLOW_LOCAL_MEMBERSHIP_BYPASS = import.meta.env.DEV;

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
      <p className="mt-1 text-meta text-textMuted">
        BrandOps keeps your workspace local-first. Continue with a provider to unlock this device;
        production OAuth requires configured client IDs and provider redirects.
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
      <p className="mt-1 text-meta text-textMuted">
        Membership protects the operator workspace when billing is enforced. Stripe checkout opens
        only when production billing URLs are configured for this build.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={clsx('bo-btn-primary', btnFocus)}
          onClick={onStartCheckout}
        >
          Open Stripe checkout
        </button>
        <button
          type="button"
          className={clsx('bo-btn-ghost', btnFocus)}
          onClick={onOpenBillingPortal}
        >
          Billing portal
        </button>
      </div>
      <p className="mt-2 text-fine text-textMuted">
        If checkout is unavailable, the app is running without billing links and will explain that
        state instead of pretending a purchase completed.
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

export const MobileApp = ({ initialTab = 'chat', surfaceLabel = 'mobile' }: MobileAppProps) => {
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
  const [pendingDestructive, setPendingDestructive] = useState<{
    command: string;
    sourceSurface: 'Workspace' | 'Today' | 'Integrations' | 'Settings' | 'Chat';
  } | null>(null);
  const [convertedOperationalPlans, setConvertedOperationalPlans] = useState<OperationalPlanCard[]>(
    []
  );
  const [pendingClearChat, setPendingClearChat] = useState(false);
  const [pendingResetWorkspace, setPendingResetWorkspace] = useState(false);
  const [dataOpsHint, setDataOpsHint] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  /** Opens Unified workspace + scroll to operator twin résumé ingest when incremented (Assistant link / URL hash). */
  const [resumePhaseRevealKey, setResumePhaseRevealKey] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [chatAttachment, setChatAttachment] = useState<ChatComposerAttachment | null>(null);
  const [launchAccess, setLaunchAccess] = useState<LaunchAccessState>(() =>
    readLaunchAccessState()
  );
  const [firstRunJourneyVisible, setFirstRunJourneyVisible] = useState(
    () => !readFirstRunJourneyDismissed()
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const persisted = readChatThread();
    if (persisted && persisted.length > 0) return persisted;
    return [defaultWelcomeMessage(surfaceLabel, !readFirstRunJourneyDismissed())];
  });

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

  /** Records first Getting-started dismissal on workspace seed (Settings diagnostics + exports). */
  const persistGettingStartedCompletionToWorkspace = useCallback(async () => {
    try {
      const data = await storageService.getData();
      const now = new Date().toISOString();
      const prevWelcome = data.seed.welcomeCompletedAt?.trim();
      await storageService.setData({
        ...data,
        seed: {
          ...data.seed,
          welcomeCompletedAt: prevWelcome && prevWelcome.length > 0 ? prevWelcome : now,
          onboardingVersion: GETTING_STARTED_CONTENT_VERSION
        }
      });
      await refreshWorkspaceSnapshot();
    } catch (err) {
      console.error('BrandOps: failed to persist getting-started workspace completion', err);
    }
  }, [refreshWorkspaceSnapshot]);

  const selectCopilotWorker = useCallback(
    async (workerId: string) => {
      try {
        const data = await storageService.getData();
        const reg = data.settings.copilotWorkers;
        if (!reg.workers.some((w) => w.id === workerId)) return;
        if (reg.activeWorkerId === workerId) return;
        await storageService.setData({
          ...data,
          settings: {
            ...data.settings,
            copilotWorkers: { ...reg, activeWorkerId: workerId }
          }
        });
        await refreshWorkspaceSnapshot();
      } catch (err) {
        console.error('BrandOps: failed to select copilot worker', err);
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const setAppearanceTheme = useCallback(async (next: UiTheme) => {
    try {
      const data = await storageService.getData();
      if (data.settings.theme === next) return;
      const updated: BrandOpsData = {
        ...data,
        settings: { ...data.settings, theme: next }
      };
      const withTrace = prependOperatorTrace(updated, {
        source: 'user',
        verb: 'settings.theme_change',
        surface: 'mobile',
        outcome: 'success',
        details: { theme: next }
      });
      await storageService.setData(withTrace);
      applyDocumentThemeFromAppSettings(withTrace.settings);
      setSnapshot(buildWorkspaceSnapshot(withTrace));
    } catch (err) {
      console.error('BrandOps: appearance update failed', err);
    }
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

  const openSettingsResumePhase = useCallback(() => {
    setResumePhaseRevealKey((k) => k + 1);
    commitTab('settings');
    if (isAppShellWithSectionQuery()) {
      const url = new URL(window.location.href);
      url.hash = SETTINGS_RESUME_PHASE_SECTION_ID;
      window.history.replaceState(null, '', url.toString());
    }
  }, [commitTab]);

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
    if (activeTab !== 'chat') return;
    const el = transcriptEndRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({
        block: 'end',
        behavior: messages.length <= 1 ? 'auto' : 'smooth'
      });
    });
  }, [messages, commandLoading, activeTab]);

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
    if (typeof window === 'undefined') return;
    if (!isAppShellWithSectionQuery()) return;
    if (window.location.hash.slice(1) !== SETTINGS_RESUME_PHASE_SECTION_ID) return;
    const p = parseMobileShellFromSearchParams(
      new URLSearchParams(window.location.search),
      initialTab
    );
    if (p.tab !== 'settings') return;
    setResumePhaseRevealKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bookmark deep-link once per mount
  }, []);

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
    sourceSurface: 'Workspace' | 'Today' | 'Integrations' | 'Settings' | 'Chat' = 'Chat'
  ) => {
    if (!trimmed || commandLoading) return;
    setMessages((prev) => [...prev, { id: uid(), role: 'user', text: trimmed, sourceSurface }]);
    setCommandLoading(true);
    const t0 = performance.now();
    let commandOk = false;
    try {
      const askMatch = trimmed.match(/^ask\s*:\s*([\s\S]*)$/i);
      if (askMatch) {
        pushCommandChip(trimmed);
        const question = askMatch[1].trim();
        if (!question) {
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: 'assistant',
              resultKind: 'ask-result',
              ok: false,
              text: 'Add your question after ask: — example: ask: What should I prioritize on the pipeline?'
            }
          ]);
        } else {
          const data = await storageService.getData();
          const settings = data.settings;
          const workerResolved = resolveActiveCopilotWorker(settings);
          const routing = resolveHostedAssistantRouting({
            settings,
            workerModelId: workerResolved?.chatModelId ?? null
          });
          const twinContext = buildDigitalTwinContextSummary(getActiveDigitalTwin(data));
          const routingAugment = [routing.behaviorHint, routing.diagnosticsDetail, twinContext]
            .filter(Boolean)
            .join('\n\n');
          const completionMessages = buildHostedAskMessages(
            data,
            question,
            workerResolved,
            routingAugment.length ? routingAugment : undefined
          );
          const tHttp = performance.now();
          const workerCap = workerResolved?.maxCompletionTokens;
          const routedMax = routing.maxTokens;
          const effectiveMaxTokens =
            typeof workerCap === 'number' &&
            workerCap > 0 &&
            typeof routedMax === 'number' &&
            routedMax > 0
              ? Math.min(workerCap, routedMax)
              : typeof workerCap === 'number' && workerCap > 0
                ? workerCap
                : routedMax;
          const result = await runChatCompletion(settings, {
            messages: completionMessages,
            model: routing.modelId,
            ...(typeof effectiveMaxTokens === 'number' && effectiveMaxTokens > 0
              ? { maxTokens: effectiveMaxTokens }
              : {}),
            ...(routing.temperature !== undefined ? { temperature: routing.temperature } : {})
          });
          const durationMs = Math.round(performance.now() - tHttp);
          const effectiveModel = routing.modelId;
          let citationCount = 0;
          let parsedAsk: ReturnType<typeof parseHostedAskResponse> | null = null;
          if (result.ok) {
            parsedAsk = parseHostedAskResponse(result.text);
            citationCount = parsedAsk.citations.length;
          }
          await persistChatGatewayTrace(
            () => storageService.getData(),
            async (next) => {
              await storageService.setData(next);
            },
            {
              messages: completionMessages,
              result,
              durationMs,
              modelId: effectiveModel,
              workerId: workerResolved?.id ?? null,
              surface: 'chat',
              route: mapDocumentSurfaceToAgentSource(surfaceLabel),
              citationCount
            }
          );
          if (!result.ok) {
            const failureMsgId = uid();
            const failureText = `Hosted model unavailable (${result.code}): ${result.message}`;
            setMessages((prev) => [
              ...prev,
              {
                id: failureMsgId,
                role: 'assistant',
                resultKind: 'ask-result',
                ok: false,
                text: failureText
              }
            ]);
            const tracedFail = prependAiAssistantTurnTrace(await storageService.getData(), {
              surface: 'assistant_chat',
              outcome: 'failure',
              user_turn_preview: question,
              assistant_preview: failureText,
              citations: [],
              model_id: effectiveModel,
              worker_id: workerResolved?.id,
              duration_ms: durationMs,
              message_id: failureMsgId
            });
            await storageService.setData(tracedFail);
            commandOk = false;
          } else {
            const assistantMsgId = uid();
            const parsed = parsedAsk!;
            const orphans = sanitizeOrphanInlineMarkers(
              findOrphanInlineCitationMarkers(parsed.displayText, parsed.citations)
            );
            let nextWorkspace = prependAiAssistantTurnTrace(data, {
              surface: 'assistant_chat',
              outcome: 'success',
              user_turn_preview: question,
              assistant_preview: parsed.displayText,
              citations: parsed.citations,
              ...(orphans.length ? { orphan_inline_markers: orphans } : {}),
              model_id: effectiveModel,
              worker_id: workerResolved?.id,
              duration_ms: durationMs,
              message_id: assistantMsgId
            });
            const providerHint = (() => {
              try {
                const u = new URL(settings.aiBridge.inferenceBaseUrl.trim().replace(/\/?$/, '/'));
                return u.hostname.replace(/^www\./, '').slice(0, 120);
              } catch {
                return undefined;
              }
            })();
            const traceBundle = buildAssistantAskTraceBundle({
              brandData: nextWorkspace,
              question,
              assistantMessageId: assistantMsgId,
              displayText: parsed.displayText,
              citations: parsed.citations,
              governanceMeta: parsed.governanceMeta,
              orphanInlineMarkers: orphans,
              modelId: effectiveModel,
              providerHint,
              workerId: workerResolved?.id ?? null,
              durationMs
            });
            nextWorkspace = prependAITraceBundle(nextWorkspace, traceBundle);
            const traceSummary = toAssistantAskTraceSummaryUI(traceBundle);
            await storageService.setData(nextWorkspace);
            setMessages((prev) => [
              ...prev,
              {
                id: assistantMsgId,
                role: 'assistant',
                resultKind: 'ask-result',
                ok: true,
                text: parsed.displayText,
                ...(parsed.citations.length ? { citations: parsed.citations } : {}),
                ...(orphans.length ? { orphanInlineMarkers: orphans } : {}),
                traceSummary
              }
            ]);
            const executable = parseAiExecutablePayload(result.text);
            const agentSource = mapDocumentSurfaceToAgentSource(surfaceLabel);
            const runAgentCmd = (text: string) =>
              executeAgentWorkspaceCommand({
                text,
                actorName: 'mobile-operator',
                source: agentSource
              });

            if (
              executable.kind === 'single' &&
              isAllowedForWorker(workerResolved, executable.commandText)
            ) {
              const cmdResult = await runAgentCmd(executable.commandText);
              const dataAfter = await storageService.getData();
              const strip = buildStripFromWorkspace(dataAfter);
              setMessages((prev) => [
                ...prev,
                {
                  id: uid(),
                  role: 'assistant',
                  resultKind: 'command-result',
                  text: `(Auto-run) ${cmdResult.summary}`,
                  action: cmdResult.action,
                  ok: cmdResult.ok,
                  sourceSurface,
                  strip
                }
              ]);
              commandOk = cmdResult.ok;
            } else if (
              executable.kind === 'pipeline' &&
              arePipelineCommandsAllowed(workerResolved, executable.commands)
            ) {
              const { results, stoppedAfterIndex } = await runSequentialAgentCommands(
                executable.commands,
                runAgentCmd,
                { stopOnError: executable.stopOnError }
              );
              const dataAfter = await storageService.getData();
              const strip = buildStripFromWorkspace(dataAfter);
              const allOk = results.every((r) => r.ok);
              setMessages((prev) => [
                ...prev,
                {
                  id: uid(),
                  role: 'assistant',
                  resultKind: 'command-result',
                  text: formatPipelineAutoRunSummary(results, stoppedAfterIndex),
                  action: results[results.length - 1]?.action ?? 'unsupported',
                  ok: allOk,
                  sourceSurface,
                  strip
                }
              ]);
              commandOk = allOk;
            } else {
              commandOk = true;
            }
          }
        }
        await refreshWorkspaceSnapshot();
      } else {
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
      }
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
      requestExtensionSchedulerSync();
      const durationMs = performance.now() - t0;
      void recordCommandOutcome({ ok: commandOk, durationMs });
      setCommandLoading(false);
    }
  };

  const startSend = (
    trimmed: string,
    sourceSurface: 'Workspace' | 'Today' | 'Integrations' | 'Settings' | 'Chat' = 'Chat'
  ) => {
    if (!trimmed || commandLoading) return;
    if (needsDestructiveConfirm(trimmed)) {
      setPendingDestructive({ command: trimmed, sourceSurface });
      return;
    }
    void executeCommandFlow(trimmed, sourceSurface);
  };

  /**
   * Enqueue an agent command from quick actions or the palette.
   * Plan can keep the user on the workspace tab; other surfaces still jump to ASK for the transcript.
   */
  const runAgentQuick = (
    command: string,
    source: 'Workspace' | 'Today' | 'Integrations' | 'Settings' | 'Chat',
    navigateToChat: boolean
  ) => {
    const trimmed = command.trim();
    if (!trimmed || commandLoading) return;

    const stayOnPlan = source === 'Workspace' && !navigateToChat;

    if (stayOnPlan) {
      setDataOpsHint('Running from Plan… Open ASK for the transcript.');
    } else if (source !== 'Chat') {
      const surfaceLabel =
        source === 'Today'
          ? 'Today'
          : source === 'Integrations'
            ? 'Integrations'
            : source === 'Settings'
              ? 'Settings'
              : 'Workspace';
      setDataOpsHint(`Running from ${surfaceLabel} in Chat…`);
    }

    setChatAttachment(null);

    if (!stayOnPlan) {
      commitTab('chat');
      setInput('');
    }

    queueMicrotask(() => {
      startSend(trimmed, source);
    });
  };

  /** Switches to Chat and runs the command immediately (same engine as Send). */
  const sendQuickCommand = (command: string) => {
    runAgentQuick(command, 'Chat', true);
  };

  /**
   * Same engine as {@link sendQuickCommand}; by default switches to Chat so the thread is visible.
   * Use `{ navigateToChat: false }` with source `Workspace` to run from Plan without leaving the tab.
   */
  const sendQuickCommandFrom = (
    source: 'Workspace' | 'Today' | 'Integrations' | 'Settings',
    opts?: { navigateToChat?: boolean }
  ) => {
    const navigateToChat = opts?.navigateToChat !== false;
    return (command: string) => runAgentQuick(command, source, navigateToChat);
  };

  const paletteOnRunCommand = (command: string) => {
    if (activeTab === 'workspace') {
      runAgentQuick(command, 'Workspace', false);
      return;
    }
    sendQuickCommand(command);
  };

  const convertAskOutputToPlan = useCallback(
    (kind: AskPlanConversionKind, askOutput: string, messageId: string) => {
      const excerpt = askOutput.replace(/\s+/g, ' ').trim().slice(0, 1200);
      if (!excerpt) return;
      const nowIso = new Date().toISOString();
      const id = `ask-plan-${kind}-${messageId}-${Math.random().toString(36).slice(2, 7)}`;
      const labelByKind: Record<AskPlanConversionKind, string> = {
        'execution-plan': 'Converted Execution Plan',
        workflow: 'Converted Workflow',
        'action-queue': 'Converted Action Queue',
        'content-schedule': 'Converted Content Schedule',
        'outreach-draft': 'Converted Outreach Draft',
        'follow-up-sequence': 'Converted Follow-up Sequence'
      };
      const approveCommandByKind: Record<AskPlanConversionKind, string> = {
        'execution-plan': `add note: PLAN conversion — ${excerpt.slice(0, 420)}`,
        workflow: `add note: Workflow plan — ${excerpt.slice(0, 420)}`,
        'action-queue': `add note: Action queue — ${excerpt.slice(0, 420)}`,
        'content-schedule': `draft post: Content schedule from ASK — ${excerpt.slice(0, 420)}`,
        'outreach-draft': `draft outreach: ${excerpt.slice(0, 420)}`,
        'follow-up-sequence': `create follow up: ${excerpt.slice(0, 220)}`
      };
      const twin = snapshot.activeDigitalTwin;
      const twinContext = twin
        ? `Active twin: ${twin.displayName}. Voice: ${twin.identity.toneOfVoice}. Positioning: ${twin.identity.professionalPositioning || twin.identity.summary}. Confidence: ${twin.confidenceScore}%. Missing facts: ${twin.memory.missingInfo.join('; ') || 'none'}; ask for clarification instead of inventing.`
        : 'No active twin is available; ask for missing voice, positioning, and proof before making unsupported claims.';
      const previewCommandByKind: Record<AskPlanConversionKind, string> = {
        'execution-plan': `ask: ${twinContext}\n\nConvert this ASK output into an executable PLAN with status, timeline, progress, approvals, retry path, and export summary:\n${excerpt}`,
        workflow: `ask: ${twinContext}\n\nTurn this ASK output into a workflow with stages, dependencies, risks, and execution checkpoints:\n${excerpt}`,
        'action-queue': `ask: ${twinContext}\n\nConvert this ASK output into a prioritized action queue with sequence, status, owners, and next actions:\n${excerpt}`,
        'content-schedule': `ask: ${twinContext}\n\nBuild a content schedule from this ASK output with weekly themes, drafts, approvals, publishing sequence, and twin-aligned content direction:\n${excerpt}`,
        'outreach-draft': `ask: ${twinContext}\n\nConvert this ASK output into an outreach plan with message preview, approval gate, follow-up timing, outreach style, and no invented claims:\n${excerpt}`,
        'follow-up-sequence': `ask: ${twinContext}\n\nBuild a follow-up sequence from this ASK output with timing, message intent, approval gate, retry criteria, and twin-aligned voice:\n${excerpt}`
      };
      const card: OperationalPlanCard = {
        id,
        title: labelByKind[kind],
        kind:
          kind === 'content-schedule'
            ? 'content-calendar'
            : kind === 'follow-up-sequence'
              ? 'execution-sequence'
              : kind === 'outreach-draft'
                ? 'outreach'
                : kind === 'action-queue'
                  ? 'action-queue'
                  : 'workflow',
        promise:
          'Created from an ASK output. Preview, edit, approve, execute, retry, or export from PLAN.',
        previewCommand: previewCommandByKind[kind],
        approveCommand: approveCommandByKind[kind],
        editTarget:
          kind === 'outreach-draft'
            ? 'settings'
            : kind === 'follow-up-sequence'
              ? 'today'
              : 'palette',
        status: 'needs-input',
        progress: 15,
        timeline: ['ASK output', 'PLAN preview', 'Human approval', 'Execute in workspace'],
        sourceLabel: 'Converted from ASK',
        exportPayload: {
          type: kind,
          convertedFromMessageId: messageId,
          convertedAt: nowIso,
          activeTwinId: twin?.id ?? null,
          activeTwinConfidence: twin?.confidenceScore ?? null,
          askOutputExcerpt: excerpt
        }
      };
      setConvertedOperationalPlans((prev) => [card, ...prev].slice(0, 6));
      commitTab('workspace');
      setDataOpsHint('ASK output converted to PLAN. Preview, approve, edit, retry, or export it.');
    },
    [commitTab, snapshot.activeDigitalTwin]
  );

  const convertPredictiveOpportunityToPlan = useCallback(
    (suggestion: PredictiveOpportunitySuggestion) => {
      const card = buildOperationalPlanFromPredictiveSuggestion(suggestion);
      setConvertedOperationalPlans((prev) => [card, ...prev].slice(0, 6));
      commitTab('workspace');
      setDataOpsHint('Predictive opportunity converted to PLAN. Preview, approve, edit, retry, or export it.');
    },
    [commitTab]
  );

  const convertContentIdeationToPlan = useCallback(
    (item: ContentIdeationItem) => {
      const card = buildOperationalPlanFromContentIdeation(item);
      setConvertedOperationalPlans((prev) => [card, ...prev].slice(0, 6));
      commitTab('workspace');
      setDataOpsHint('Content ideation converted to PLAN. Preview, approve, edit, retry, or export it.');
    },
    [commitTab]
  );

  const convertWorkflowPredictionToPlan = useCallback(
    (prediction: WorkflowPrediction) => {
      const card = buildOperationalPlanFromWorkflowPrediction(prediction);
      setConvertedOperationalPlans((prev) => [card, ...prev].slice(0, 6));
      commitTab('workspace');
      setDataOpsHint('Workflow prediction converted to PLAN. Save, edit, reuse, template, or automate only after approval.');
    },
    [commitTab]
  );

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
      setDataOpsHint('Checkout is not configured for this build.');
    }
  }, []);

  const onOpenBillingPortal = useCallback(() => {
    if (STRIPE_BILLING_PORTAL_URL) {
      window.open(STRIPE_BILLING_PORTAL_URL, '_blank', 'noopener,noreferrer');
    } else {
      setDataOpsHint('Billing portal is not configured for this build.');
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
    setDataOpsHint('Local demo membership enabled.');
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

  const exportOperatorTracesJsonl = useCallback(async () => {
    try {
      const raw = await storageService.exportOperatorTracesJsonl();
      const blob = new Blob([raw], { type: 'application/x-ndjson' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brandops-operator-traces-${new Date().toISOString().slice(0, 10)}.jsonl`;
      a.click();
      URL.revokeObjectURL(url);
      setDataOpsHint('Operator traces export downloaded.');
    } catch (e) {
      setDataOpsHint(e instanceof Error ? e.message : 'Export failed.');
    }
  }, []);

  const downloadPipelineRunJson = useCallback((run: PipelineRun) => {
    try {
      const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeId = run.run_id.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80);
      a.download = `brandops-pipeline-run-${safeId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataOpsHint('Pipeline run JSON downloaded.');
    } catch (e) {
      setDataOpsHint(e instanceof Error ? e.message : 'Download failed.');
    }
  }, []);

  const exportOperationalPlanJson = useCallback((plan: OperationalPlanCard) => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        productSurface: 'PLAN',
        lifecycle: [
          'preview',
          'approval',
          'edit',
          'status',
          'timeline',
          'progress',
          'retry',
          'export'
        ],
        plan
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeId = plan.id.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80);
      a.href = url;
      a.download = `brandops-operational-plan-${safeId || 'plan'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataOpsHint('Operational plan JSON downloaded.');
    } catch (e) {
      setDataOpsHint(e instanceof Error ? e.message : 'Operational plan export failed.');
    }
  }, []);

  const exportExecutionReceiptJson = useCallback((receipt: PlanExecutionReceipt) => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        productSurface: 'PLAN',
        guarantee:
          'Receipt explains what happened, why it happened, what data was used, approvals, status, and warnings/errors.',
        receipt
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeId = receipt.id.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80);
      a.href = url;
      a.download = `brandops-plan-receipt-${safeId || 'receipt'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataOpsHint('PLAN execution receipt JSON downloaded.');
    } catch (e) {
      setDataOpsHint(e instanceof Error ? e.message : 'Execution receipt export failed.');
    }
  }, []);

  const approveOperatorTraceReview = useCallback(
    async (traceId: string) => {
      try {
        const data = await storageService.getData();
        const next = approveOperatorTraceEntry(data, traceId);
        if (next === null) {
          setDataOpsHint('Trace not found.');
          return;
        }
        if (next === data) {
          setDataOpsHint('That trace was not awaiting review.');
          return;
        }
        await storageService.setData(next);
        await refreshWorkspaceSnapshot();
        setDataOpsHint('Review approved.');
      } catch (e) {
        console.error('BrandOps: approve operator trace failed', e);
        setDataOpsHint(e instanceof Error ? e.message : 'Could not approve trace.');
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const rejectOperatorTraceReview = useCallback(
    async (traceId: string) => {
      try {
        const data = await storageService.getData();
        const next = rejectOperatorTraceEntry(data, traceId);
        if (next === null) {
          setDataOpsHint('Trace not found.');
          return;
        }
        if (next === data) {
          setDataOpsHint('That trace was not awaiting review.');
          return;
        }
        await storageService.setData(next);
        await refreshWorkspaceSnapshot();
        setDataOpsHint('Review rejected. No external action executed.');
      } catch (e) {
        console.error('BrandOps: reject operator trace failed', e);
        setDataOpsHint(e instanceof Error ? e.message : 'Could not reject trace.');
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const setOperatorTraceCollection = useCallback(
    async (enabled: boolean) => {
      try {
        const data = await storageService.getData();
        if (data.settings.operatorTraceCollectionEnabled === enabled) return;
        await storageService.setData({
          ...data,
          settings: { ...data.settings, operatorTraceCollectionEnabled: enabled }
        });
        await refreshWorkspaceSnapshot();
        setDataOpsHint(
          enabled ? 'Operator trace collection on.' : 'Operator trace collection off.'
        );
      } catch (err) {
        console.error('BrandOps: operator trace preference update failed', err);
        setDataOpsHint('Could not update trace setting.');
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const setConnectedIdentityLearning = useCallback(
    async (enabled: boolean) => {
      try {
        const data = await storageService.getData();
        if (data.settings.connectedIdentityLearningEnabled === enabled) return;
        const updated: BrandOpsData = {
          ...data,
          settings: { ...data.settings, connectedIdentityLearningEnabled: enabled },
          connectedIdentityEngine: {
            ...(data.connectedIdentityEngine ?? {
              schemaVersion: 1,
              consentGranted: false,
              lastUpdatedAt: null,
              signals: [],
              sensitiveDataPolicy:
                'Connected Identity Engine is opt-in. It may derive identity signals from local metadata, summaries, and approved traces, but it must not automatically ingest raw private messages, files, or calendar details.',
              blockedPrivateSources: ['gmail', 'google-calendar', 'slack', 'notion']
            }),
            consentGranted: enabled
          }
        };
        const evolved = enabled ? evolveActiveTwinFromConnectedIdentity(updated) : null;
        await storageService.setData(evolved?.workspace ?? updated);
        await refreshWorkspaceSnapshot();
        setDataOpsHint(
          enabled
            ? evolved?.applied
              ? `Connected Identity Engine on; evolved twin from ${evolved.signalCount} consented signals.`
              : 'Connected Identity Engine on; waiting for an active twin or approved platform signals.'
            : 'Connected Identity Engine off. Platform data will not evolve the twin.'
        );
      } catch (err) {
        console.error('BrandOps: connected identity preference update failed', err);
        setDataOpsHint('Could not update Connected Identity Engine setting.');
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const patchAiOperatorMode = useCallback(
    async (mode: AiOperatorMode) => {
      try {
        const data = await storageService.getData();
        if (data.settings.aiOperatorMode === mode) return;
        await storageService.setData({
          ...data,
          settings: { ...data.settings, aiOperatorMode: mode }
        });
        await refreshWorkspaceSnapshot();
        setDataOpsHint(`AI routing mode: ${mode}`);
      } catch (err) {
        console.error('BrandOps: AI operator mode update failed', err);
        setDataOpsHint('Could not update AI routing mode.');
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const patchAiRoutingDiagnostics = useCallback(
    async (enabled: boolean) => {
      try {
        const data = await storageService.getData();
        if (data.settings.aiRoutingDiagnosticsEnabled === enabled) return;
        await storageService.setData({
          ...data,
          settings: { ...data.settings, aiRoutingDiagnosticsEnabled: enabled }
        });
        await refreshWorkspaceSnapshot();
        setDataOpsHint(enabled ? 'Routing diagnostics on.' : 'Routing diagnostics off.');
      } catch (err) {
        console.error('BrandOps: routing diagnostics toggle failed', err);
        setDataOpsHint('Could not update diagnostics preference.');
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const importWorkspace = useCallback(
    async (raw: string) => {
      await storageService.importData(raw);
      await refreshWorkspaceSnapshot();
      requestExtensionSchedulerSync();
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
          requestExtensionSchedulerSync();
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

  const persistOperatingProfileApply = useCallback(
    async (presetId: OperatingPresetId | 'custom') => {
      try {
        const data = await storageService.getData();
        await storageService.setData({
          ...data,
          settings: {
            ...data.settings,
            operatingProfile: { lastAppliedPresetId: presetId }
          }
        });
        await refreshWorkspaceSnapshot();
      } catch (err) {
        console.error('BrandOps: operating profile persist failed', err);
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const persistResumeNeuralPhaseContext = useCallback(
    async (compressed: string) => {
      try {
        const data = await storageService.getData();
        const next = compressed.trim().slice(0, 12_000);
        const ot = data.settings.operatorTwin;
        if (ot.resumeArtifact === next) return;
        await storageService.setData({
          ...data,
          settings: {
            ...data.settings,
            operatorTwin: {
              ...ot,
              resumeArtifact: next,
              version: next.length ? ot.version + 1 : 0,
              lastIngestAt: next.length ? new Date().toISOString() : undefined,
              sourceSummary: next.length ? ot.sourceSummary : undefined
            }
          }
        });
        await refreshWorkspaceSnapshot();
        setDataOpsHint(
          next.length > 0
            ? 'Operator twin: résumé artifact saved for hosted Ask.'
            : 'Operator twin: résumé artifact cleared.'
        );
      } catch (err) {
        console.error('BrandOps: operator twin résumé persist failed', err);
        setDataOpsHint('Could not update operator twin ingest.');
        throw err;
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const createDigitalTwinFromProfile = useCallback(
    async (input: {
      rawText: string;
      sourceType: DigitalTwinSourceType;
      sourceSummary?: string;
      reviewOverrides?: {
        displayName?: string;
        headline?: string;
        summary?: string;
        professionalPositioning?: string;
      };
    }) => {
      try {
        const data = await storageService.getData();
        const { twin, resumeArtifact } = createDigitalTwinFromText({
          workspace: data,
          rawText: input.rawText,
          sourceType: input.sourceType,
          sourceSummary: input.sourceSummary,
          reviewOverrides: input.reviewOverrides
        });
        const ot = data.settings.operatorTwin;
        const baseWorkspace = {
          ...data,
          settings: {
            ...data.settings,
            operatorTwin: {
              ...ot,
              resumeArtifact,
              version: resumeArtifact.length ? ot.version + 1 : ot.version,
              lastIngestAt: new Date().toISOString(),
              sourceSummary: input.sourceSummary ?? 'Digital twin profile ingest'
            }
          }
        };
        const hydrated = hydrateWorkspaceFromDigitalTwin({
          workspace: baseWorkspace,
          twin,
          resumeArtifact
        });
        await storageService.setData(hydrated.workspace);
        await refreshWorkspaceSnapshot();
        setDataOpsHint(
          `Digital twin ready for ${twin.displayName}; captured ${hydrated.capturedArtifactCount} profile artifacts.`
        );
      } catch (err) {
        console.error('BrandOps: digital twin create failed', err);
        setDataOpsHint('Could not create digital twin from profile text.');
        throw err;
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const deleteActiveDigitalTwin = useCallback(async () => {
    try {
      const data = await storageService.getData();
      const active = getActiveDigitalTwin(data);
      if (!active) return;
      await storageService.setData(removeDigitalTwinWorkspaceArtifacts(data, active));
      await refreshWorkspaceSnapshot();
      setDataOpsHint('Digital twin and generated workspace artifacts deleted from this workspace.');
    } catch (err) {
      console.error('BrandOps: digital twin delete failed', err);
      setDataOpsHint('Could not delete digital twin.');
      throw err;
    }
  }, [refreshWorkspaceSnapshot]);

  const disableMemoryContext = useCallback(async () => {
    try {
      const data = await storageService.getData();
      await storageService.setData({
        ...data,
        settings: {
          ...data.settings,
          operatorTraceCollectionEnabled: false,
          connectedIdentityLearningEnabled: false
        },
        connectedIdentityEngine: data.connectedIdentityEngine
          ? { ...data.connectedIdentityEngine, consentGranted: false }
          : data.connectedIdentityEngine
      });
      await refreshWorkspaceSnapshot();
      setDataOpsHint('Memory learning disabled. Existing memory remains local until deleted.');
    } catch (err) {
      console.error('BrandOps: disable memory context failed', err);
      setDataOpsHint('Could not disable memory learning.');
    }
  }, [refreshWorkspaceSnapshot]);

  const deleteMemoryContext = useCallback(async () => {
    try {
      const data = await storageService.getData();
      const twins = data.digitalTwins?.twins ?? [];
      const withoutTwins = twins.reduce<BrandOpsData>(
        (workspace, twin) => removeDigitalTwinWorkspaceArtifacts(workspace, twin),
        data
      );
      await storageService.setData({
        ...withoutTwins,
        operatorTraces: { entries: [] },
        aiAssistantTraces: { entries: [] },
        aiTraceGraph: { schema_version: '1.0.0', bundles: [] },
        settings: {
          ...withoutTwins.settings,
          operatorTraceCollectionEnabled: false,
          connectedIdentityLearningEnabled: false
        },
        connectedIdentityEngine: withoutTwins.connectedIdentityEngine
          ? { ...withoutTwins.connectedIdentityEngine, consentGranted: false, signals: [] }
          : withoutTwins.connectedIdentityEngine
      });
      await refreshWorkspaceSnapshot();
      setDataOpsHint('Memory context deleted. Twin memory, local traces, ASK trace memory, and connected identity signals were cleared.');
    } catch (err) {
      console.error('BrandOps: delete memory context failed', err);
      setDataOpsHint('Could not delete memory context.');
    }
  }, [refreshWorkspaceSnapshot]);

  const persistKpiSelfCheck = useCallback(
    async (score: 1 | 2 | 3 | 4 | 5, note: string) => {
      try {
        const data = await storageService.getData();
        const ot = data.settings.operatorTwin;
        const row = {
          score,
          note: note.trim().slice(0, 400),
          recordedAt: new Date().toISOString()
        };
        const prev = ot.kpiSelfChecks ?? [];
        const kpiSelfChecks = [row, ...prev].slice(0, 24);
        await storageService.setData({
          ...data,
          settings: {
            ...data.settings,
            operatorTwin: {
              ...ot,
              kpiSelfChecks
            }
          }
        });
        await refreshWorkspaceSnapshot();
        setDataOpsHint('Focus metric check-in saved.');
      } catch (err) {
        console.error('BrandOps: KPI self-check persist failed', err);
        setDataOpsHint('Could not save check-in.');
        throw err;
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const submitMessage = async () => {
    const line = buildOutgoingCommandLine(input.trim(), chatAttachment);
    if (!line?.trim() || commandLoading) return;
    setInput('');
    setChatAttachment(null);
    startSend(line.trim(), 'Chat');
  };

  const shellTitleDescId = useId();
  const shellScreenTitle = SHELL_SCREEN_TITLE[activeTab];
  const shellSrSummary = SHELL_TAB_SR_SUMMARY[activeTab];

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
        <div
          className={clsx(
            'mx-auto flex w-full items-start justify-between gap-3',
            MOBILE_SHELL_MAX_WIDTH_CLASS,
            MOBILE_SHELL_EDGE_PAD_CLASS
          )}
        >
          <div className="bo-mobile-brand flex min-w-0 flex-1 gap-3">
            <span
              className="bo-mobile-brand__mark bo-mobile-brand__mark--compact shrink-0"
              aria-hidden
            >
              <BrandOpsCrownMark className="bo-mobile-brand__logo" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="bo-mobile-brand__wordmark">BrandOps</p>
              <span id={shellTitleDescId} className="sr-only">
                {shellSrSummary}
              </span>
              <h1 className="bo-mobile-brand__title text-h1" aria-describedby={shellTitleDescId}>
                {shellScreenTitle}
              </h1>
              {dataOpsHint ? <WorkspaceDataHint message={dataOpsHint} /> : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-start justify-end gap-1.5">
            {!shouldRequireLaunchAuth(launchAccess) ? (
              <AppearanceToggle
                activeTheme={snapshot.settingsFullReadout.theme === 'light' ? 'light' : 'dark'}
                onChange={setAppearanceTheme}
                btnFocus={btnFocus}
                className="bo-theme-seg--header"
              />
            ) : null}
            {!shouldRequireLaunchAuth(launchAccess) ? (
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                aria-label="Open command palette"
                title="Commands & search (⌘K / Ctrl+K)"
                className={clsx(
                  'bo-mobile-help-btn rounded-xl border border-border/45 bg-surface/50 p-2.5 text-textMuted transition-colors duration-fast hover:border-borderStrong hover:bg-surfaceActive hover:text-text',
                  btnFocus
                )}
              >
                <Search className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
              </button>
            ) : null}
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
        </div>
      </header>

      <main
        id="bo-mobile-main"
        tabIndex={-1}
        className={clsx(
          'bo-mobile-main mx-auto w-full pt-5 outline-none motion-safe:scroll-smooth sm:pt-6',
          MOBILE_SHELL_MAX_WIDTH_CLASS,
          activeTab === 'chat'
            ? 'pb-[max(11.85rem,calc(10rem+env(safe-area-inset-bottom,0px)))]'
            : 'pb-[max(11.5rem,calc(9.5rem+env(safe-area-inset-bottom,0px)))]'
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
            className={clsx(
              'bo-shell-tab-root bo-shell-page bo-shell-panel-enter space-y-4 pb-6 text-sm text-textMuted motion-reduce:animate-none',
              MOBILE_SHELL_EDGE_PAD_CLASS
            )}
            aria-label="ASK conversational intelligence"
            key="shell-chat"
          >
            <MobileChatView
              messages={messages}
              loading={commandLoading}
              commandHistory={commandHistory}
              onQuickCommand={sendQuickCommand}
              activeDigitalTwin={snapshot.activeDigitalTwin}
              platformAwareAsk={snapshot.platformAwareAsk}
              behavioralIntelligenceEngine={snapshot.behavioralIntelligenceEngine}
              predictiveOpportunityLayer={snapshot.predictiveOpportunityLayer}
              predictiveContentIdeationEngine={snapshot.predictiveContentIdeationEngine}
              workflowPredictionLayer={snapshot.workflowPredictionLayer}
              memoryContextEngine={snapshot.memoryContextEngine}
              onConvertPredictiveOpportunityToPlan={convertPredictiveOpportunityToPlan}
              onConvertContentIdeationToPlan={convertContentIdeationToPlan}
              onConvertWorkflowPredictionToPlan={convertWorkflowPredictionToPlan}
              onTwinAction={(_actionType, prompt) => {
                setInput(prompt);
                commitTab('chat');
              }}
              copilotWorkerRegistry={snapshot.copilotWorkerRegistry}
              onSelectCopilotWorker={selectCopilotWorker}
              onClearCommandHistory={() => {
                clearPersistedCommandChips();
                setCommandHistory([]);
              }}
              btnFocus={btnFocus}
              transcriptEndRef={transcriptEndRef}
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              onOpenResumeGrounding={openSettingsResumePhase}
              assistantRoutingCaption={snapshot.aiAssistantRoutingCaption}
              onConvertAskToPlan={convertAskOutputToPlan}
            />
          </section>
        ) : (
          <section
            key={activeTab}
            className={clsx(
              'bo-shell-tab-root bo-shell-page bo-shell-panel-enter space-y-4 pb-6 text-sm text-textMuted motion-reduce:animate-none',
              MOBILE_SHELL_EDGE_PAD_CLASS
            )}
            aria-label={shellPlanStackLandmarkLabel(activeTab)}
          >
            <PlanSurfaceNav activeTab={activeTab} onSelect={commitTab} btnFocus={btnFocus} />
            {activeTab === 'workspace' ? (
              <>
                {firstRunJourneyVisible ? (
                  <FirstRunJourneyCard
                    btnFocus={btnFocus}
                    onDismiss={() => {
                      setFirstRunJourneyVisible(false);
                      void persistGettingStartedCompletionToWorkspace();
                    }}
                    onTryCommand={sendQuickCommand}
                    onOpenAsk={() => commitTab('chat')}
                    onOpenSettings={() => commitTab('settings')}
                    onOpenHelp={() => openExtensionSurface('help')}
                  />
                ) : null}
                <MobileWorkspaceHubView
                  snapshot={snapshot}
                  btnFocus={btnFocus}
                  commandBusy={commandLoading}
                  runCommand={sendQuickCommandFrom('Workspace', { navigateToChat: false })}
                  onOpenToday={() => commitTab('daily')}
                  launchAccess={launchAccess}
                  onOpenSettings={() => commitTab('settings')}
                  onOpenIntegrations={() => commitTab('integrations')}
                  onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                  firstRunJourneyVisible={firstRunJourneyVisible}
                  canRunWorkspaceCommands={agentCommandLock === null}
                  workspaceCommandLockReason={agentCommandLock}
                  onDownloadPipelineRun={downloadPipelineRunJson}
                  onApproveOperatorTrace={approveOperatorTraceReview}
                  onRejectOperatorTrace={rejectOperatorTraceReview}
                  onConvertPredictiveOpportunityToPlan={convertPredictiveOpportunityToPlan}
                  onConvertContentIdeationToPlan={convertContentIdeationToPlan}
                  onConvertWorkflowPredictionToPlan={convertWorkflowPredictionToPlan}
                  onDeleteMemoryContext={deleteMemoryContext}
                  onDisableMemoryContext={disableMemoryContext}
                  onExportOperationalPlan={exportOperationalPlanJson}
                  onExportExecutionReceipt={exportExecutionReceiptJson}
                  convertedOperationalPlans={convertedOperationalPlans}
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
                activeWorkstream={cockpitWorkstream}
                onSelectWorkstream={handleSelectWorkstream}
                onRecordKpiSelfCheck={persistKpiSelfCheck}
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
                onExportOperatorTraces={exportOperatorTracesJsonl}
                onImportWorkspace={importWorkspace}
                onRequestResetWorkspace={() => setPendingResetWorkspace(true)}
                onOperatorTraceCollectionChange={(enabled) =>
                  void setOperatorTraceCollection(enabled)
                }
                onConnectedIdentityLearningChange={(enabled) =>
                  void setConnectedIdentityLearning(enabled)
                }
                documentSurface={surfaceLabel}
                isAuthenticated={launchAccess.auth.isAuthenticated}
                authProvider={launchAccess.auth.provider}
                authEmail={launchAccess.auth.email}
                membership={launchAccess.membership}
                onSignInProvider={onSignInProvider}
                onSignOut={onSignOut}
                onStartCheckout={onStartCheckout}
                onOpenBillingPortal={onOpenBillingPortal}
                onOperatingProfileApplied={persistOperatingProfileApply}
                onPersistResumeNeuralPhaseContext={persistResumeNeuralPhaseContext}
                onCreateDigitalTwinFromText={createDigitalTwinFromProfile}
                onDeleteActiveDigitalTwin={deleteActiveDigitalTwin}
                resumePhaseRevealKey={resumePhaseRevealKey}
                onAiOperatorModeChange={patchAiOperatorMode}
                onAiRoutingDiagnosticsChange={patchAiRoutingDiagnostics}
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
          hideSmartChips
          assistantChrome
        />
      ) : null}

      {activeTab === 'settings' &&
      shouldRequireLaunchMembership(launchAccess) &&
      ALLOW_LOCAL_MEMBERSHIP_BYPASS ? (
        <div
          className={clsx(
            'bo-mobile-main fixed inset-x-0 bottom-[calc(10.85rem+env(safe-area-inset-bottom,0px))] z-[32] mx-auto w-full px-2 pe-14 ps-3',
            MOBILE_SHELL_MAX_WIDTH_CLASS
          )}
        >
          <button
            type="button"
            onClick={onMarkMembershipActive}
            className={clsx('bo-btn-ghost w-full', btnFocus)}
          >
            Unlock local demo access
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
              {pendingDestructive.command}
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
                  const pending = pendingDestructive;
                  setPendingDestructive(null);
                  if (pending) void executeCommandFlow(pending.command, pending.sourceSurface);
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
                  setMessages([defaultWelcomeMessage(surfaceLabel, firstRunJourneyVisible)]);
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
                      requestExtensionSchedulerSync();
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

      <MobileShellNav activeTab={activeTab} onSelect={commitTab} btnFocus={btnFocus} />

      <WorkspaceCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        canExecuteAgentCommands={canExecuteAgentCommandsFromPalette}
        agentLockReason={agentCommandLock}
        commandBusy={commandLoading}
        commandHistory={commandHistory}
        onNavigateTab={commitTab}
        onRunCommand={paletteOnRunCommand}
        commandRunContext={activeTab === 'workspace' ? 'plan' : 'chat'}
        onOpenHelp={() => openExtensionSurface('help')}
      />
    </div>
  );
};
