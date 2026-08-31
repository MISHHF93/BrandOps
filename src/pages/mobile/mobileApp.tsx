import { type ChangeEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  executeAgentWorkspaceCommand,
  type AgentWorkspaceResult
} from '../../services/agent/agentWorkspaceEngine';
import { runChatCompletion } from '../../services/ai/hostedNlp';
import { describeAiSetupState } from '../../services/ai/aiSetupState';
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
import { prependBrandOpsAICoreResult, runBrandOpsAI } from '../../services/ai/brandOpsAiCore';
import { resolveActiveCopilotWorker } from '../../services/ai/copilotWorkers';
import { resolveHostedAssistantRouting } from '../../services/ai/aiAskRouting';
import {
  clearOpenAiCompatibleApiKey,
  configureOpenAiCompatibleCredentials,
  normalizeOpenAiCompatibleEndpointOrigin
} from '../../services/ai/aiSecretsAccess';
import { ensureAiEndpointAccess } from '../../services/ai/aiEndpointAccess';
import { storageService, createInMemorySeededWorkspace } from '../../services/storage/storage';
import { prependOperatorTrace } from '../../services/dataset/operatorTraces';
import { buildExpertOperatorIntegrationReadout } from '../../services/ai/expertOperatorIntegration';
import {
  findActiveCheckpoints,
  findCheckpointChainRoot,
  findCheckpointsByConversation,
  findPendingApprovalCheckpoints,
  prependCheckpoint
} from '../../services/execution/checkpointStore';
import {
  approveCheckpointForPlan,
  rejectCheckpointForPlan
} from '../../services/execution/checkpointActions';
import { resolveExecutionReceipt } from '../../services/execution/resolveExecutionReceipt';
import {
  artifactGeneratedCheckpoint,
  beginAskCheckpoint,
  commandCheckpoint,
  completeAskCheckpoint,
  expertConsultationCheckpoint,
  failAskCheckpoint
} from '../../services/execution/askExecutionCheckpoints';
import { planConversionCheckpointChain } from '../../services/execution/planExecutionCheckpoints';
import type { ActiveExecution, Checkpoint } from '../../types/executionState';
import { isValidExecutionTransition } from '../../types/executionState';
import { BackgroundOperationsIndicator } from '../../shared/ui/execution/BackgroundOperationsIndicator';
import type {
  BrandOpsData,
  DigitalTwinSourceType,
  OperatingPresetId,
  PlanDraft,
  PlanPreset,
  UiTheme
} from '../../types/domain';
import type { BrandOpsAIArtifactType } from '../../types/brandOpsAiCore';
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
import {
  MobileChatView,
  CHAT_STICK_TO_BOTTOM_TOLERANCE_PX,
  scrollChatTranscriptEndIntoView,
  type AskMemorySaveRequest,
  type AskPlanConversionRequest,
  type AskPlanConversionKind,
  type ChatMessage
} from './MobileChatView';
import { MobileIntegrationsView } from './MobileIntegrationsView';
import { MobileSettingsView } from './MobileSettingsView';
import type { AiBridgeConfigurationInput } from './SettingsAiBridgePanel';
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
import { hrefPrimaryAppDefault } from '../../shared/navigation/navigationIntents';
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
  approveCheckpointForTrace,
  rejectCheckpointForTrace
} from '../../services/execution/checkpointActions';
import { executePlan } from '../../services/execution/planExecutor';
import { verifyPlanOutcomes, type VerifyStepOutcome } from '../../services/execution/planVerifier';
import {
  convertAskResponseToPlan,
  savePlanDraftToWorkspace
} from '../../services/plan/askPlanConversion';
import {
  persistConvertedPlan,
  planPresetForOperationalKind
} from '../../services/plan/persistConvertedPlan';
import { ConvertAskToPlanDrawer } from './ConvertAskToPlanDrawer';
import { VerifyPlanOutcomesDrawer } from './VerifyPlanOutcomesDrawer';
import {
  buildDigitalTwinContextSummary,
  createDigitalTwinFromText,
  getActiveDigitalTwin,
  hydrateWorkspaceFromDigitalTwin,
  removeDigitalTwinWorkspaceArtifacts,
  updateTwinFactVerificationStatus,
  updateTwinIdentityGoals
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
const CHAT_CONVERSATION_ID_KEY = 'brandops:agent:chatConversationId';
const COMMAND_CHIPS_KEY = 'brandops:agent:commandChips';
const ASK_PLAN_CONVERSION_KEY = 'brandops:agent:askPlanConversion';
const MAX_PERSISTED_MESSAGES = 50;
const MAX_COMMAND_CHIPS = 24;
const HELLO_ASK_RESPONSE =
  "Hello — I'm your BrandOps twin. Ask me anything grounded in your professional identity, skills, and goals. I route questions to specialized experts, turn useful responses into structured plans, and feed verified results back to improve future thinking — so every conversation compounds.";

function isHelloAskPrompt(input: string): boolean {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ');
  return /^(hello|hi|hey|greetings|yo)\b/.test(normalized);
}

const defaultWelcomeMessage = (
  surface: AppDocumentSurfaceId | 'chatbot' = 'mobile',
  gettingStartedChecklistVisible = true
): ChatMessage => {
  const mobileLine = gettingStartedChecklistVisible
    ? 'Ask your twin anything about your professional context. I route questions to specialized experts and convert useful responses into structured plans for execution, approval, and verification.'
    : 'Ask your twin for strategic thinking. Every response is grounded in your identity, goals, and verified activity. Plans flow through approvals, execution, verification, and learning.';
  const welcomeLine = gettingStartedChecklistVisible
    ? 'Ask your twin anything about your professional context. I route questions to specialized experts and convert useful responses into structured plans for execution, approval, and verification.'
    : 'Ask your twin for strategic thinking. Every response is grounded in your identity, goals, and verified activity. Plans flow through approvals, execution, verification, and learning.';
  return {
    id: uid(),
    role: 'assistant',
    resultKind: 'plain',
    text: surface === 'welcome' ? `Welcome to BrandOps. ${welcomeLine}` : mobileLine
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
    ...(m.planConversion && typeof m.planConversion === 'object'
      ? (() => {
          const plan = m.planConversion as Record<string, unknown>;
          if (
            typeof plan.planId !== 'string' ||
            typeof plan.planTitle !== 'string' ||
            typeof plan.convertedAt !== 'string'
          ) {
            return {};
          }
          return {
            planConversion: {
              planId: plan.planId,
              planTitle: plan.planTitle,
              convertedAt: plan.convertedAt
            }
          };
        })()
      : {}),
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

interface StoredAskPlanConversion {
  preset: PlanPreset;
  request: AskPlanConversionRequest;
  draft: PlanDraft | null;
}

const readStoredAskPlanConversion = (): StoredAskPlanConversion | null => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ASK_PLAN_CONVERSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAskPlanConversion;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.preset !== 'string') return null;
    if (!parsed.request || typeof parsed.request.askOutput !== 'string') return null;
    return {
      preset: parsed.preset as PlanPreset,
      request: parsed.request,
      draft: parsed.draft ?? null
    };
  } catch {
    return null;
  }
};

const writeStoredAskPlanConversion = (state: StoredAskPlanConversion) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ASK_PLAN_CONVERSION_KEY, JSON.stringify(state));
  } catch {
    // ignore quota
  }
};

const clearStoredAskPlanConversion = () => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(ASK_PLAN_CONVERSION_KEY);
  } catch {
    // ignore quota
  }
};

const readChatConversationId = (): string => {
  const fallback = `ask-conversation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const existing = localStorage.getItem(CHAT_CONVERSATION_ID_KEY);
    if (existing?.trim()) return existing;
    localStorage.setItem(CHAT_CONVERSATION_ID_KEY, fallback);
    return fallback;
  } catch {
    return fallback;
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

const buildStripFromWorkspace = (data: BrandOpsData) => ({
  notes: data.notes.length,
  queue: data.publishingQueue.length,
  followUps: data.followUps.filter((f) => !f.completed).length,
  opportunities: data.opportunities.filter((o) => !o.archivedAt).length
});

function aiCoreOutputsForAskPlanKind(kind: AskPlanConversionKind): BrandOpsAIArtifactType[] {
  switch (kind) {
    case 'content-schedule':
      return ['content plan'];
    case 'outreach-draft':
      return ['outreach draft'];
    case 'workflow':
    case 'follow-up-sequence':
      return ['workflow plan'];
    case 'action-queue':
    case 'execution-plan':
    default:
      return ['operational plan'];
  }
}

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
      <h2 className="text-h2 text-text">Unlock this local workspace</h2>
      <p className="mt-1 text-meta text-textMuted">
        Choose a provider to unlock this device. This version does not
        contact the provider, verify an email address, or create a server sign-in session.
      </p>
      <div className="bo-auth-actions mt-3">
        <GoogleSignInButton
          onClick={() => onSignInProvider('google')}
          variant="preview"
          className={btnFocus}
        />
        <AppleSignInButton
          onClick={() => onSignInProvider('apple')}
          variant="preview"
          className={btnFocus}
        />
        <EmailMagicLinkButton
          onClick={() => onSignInProvider('email')}
          variant="preview"
          className={btnFocus}
        />
        <LinkedInSignInButton
          onClick={() => onSignInProvider('linkedin')}
          variant="preview"
          className={btnFocus}
        />
        <GitHubSignInButton
          onClick={() => onSignInProvider('github')}
          variant="preview"
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
      <h2 className="text-h2 text-text">Local membership</h2>
      <p className="mt-1 text-meta text-textMuted">
        Manage your local workspace membership. Checkout and portal controls are
        navigation links; membership is verified locally on this device.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={clsx('bo-btn-primary', btnFocus)}
          onClick={onStartCheckout}
        >
          Open checkout link
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
        Production builds ignore this gate until a server-verified entitlement flow is implemented.
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
  const dialogAskMemoryId = useId();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const clearConfirmRef = useRef<HTMLButtonElement>(null);
  const resetConfirmRef = useRef<HTMLButtonElement>(null);
  const askMemoryConfirmRef = useRef<HTMLButtonElement>(null);
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
  /** Observable execution state for the turn in flight — additive to `commandLoading`, drives ActivityIndicator/StreamingStatus. */
  const [activeExecution, setActiveExecution] = useState<ActiveExecution | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ActiveExecution[]>([]);
  const pushExecutionStage = useCallback((stage: ActiveExecution) => {
    setActiveExecution((prev) => {
      /** No prior stage this turn (turn just started) — any starting state is turn-kind-dependent, not a real transition to validate. */
      if (prev && !isValidExecutionTransition(prev.state, stage.state)) {
        if (import.meta.env.DEV) {
          console.warn(
            `BrandOps: unexpected execution transition ${prev.state} -> ${stage.state}. Non-fatal — check the emission site.`
          );
        }
      }
      return stage;
    });
    setExecutionHistory((prev) => [...prev, stage]);
  }, []);
  const clearExecutionStage = useCallback(() => {
    setActiveExecution(null);
    setExecutionHistory([]);
  }, []);
  /** Persisted checkpoint chain for the current conversation — most recent first, capped for the timeline UI. */
  const [recentCheckpoints, setRecentCheckpoints] = useState<Checkpoint[]>([]);
  /** Workspace-wide in-flight / pending-approval counts for BackgroundOperationsIndicator. */
  const [operationsSummary, setOperationsSummary] = useState({ active: 0, pendingApproval: 0 });
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
  const [pendingAskMemorySave, setPendingAskMemorySave] = useState<AskMemorySaveRequest | null>(
    null
  );
  const [pendingAskPlanConversion, setPendingAskPlanConversion] =
    useState<AskPlanConversionRequest | null>(null);
  const [restoredAskPlanConversion] = useState(readStoredAskPlanConversion);
  const [askPlanPreset, setAskPlanPreset] = useState<PlanPreset>(
    restoredAskPlanConversion?.preset ?? 'custom-plan'
  );
  const [askPlanDraft, setAskPlanDraft] = useState<PlanDraft | null>(
    restoredAskPlanConversion?.draft ?? null
  );

  useEffect(() => {
    if (restoredAskPlanConversion?.request) {
      setPendingAskPlanConversion(restoredAskPlanConversion.request);
    }
  }, [restoredAskPlanConversion]);

  useEffect(() => {
    if (pendingAskPlanConversion) {
      writeStoredAskPlanConversion({
        preset: askPlanPreset,
        request: pendingAskPlanConversion,
        draft: askPlanDraft
      });
    } else {
      clearStoredAskPlanConversion();
    }
  }, [pendingAskPlanConversion, askPlanPreset, askPlanDraft]);
  const [askPlanBusy, setAskPlanBusy] = useState(false);
  const [askPlanError, setAskPlanError] = useState<string | null>(null);
  /** Which `executed` plan the "Confirm outcomes" drawer is open for (VERIFY stage of Ask -> Plan -> Approve -> Execute -> Verify). */
  const [verifyPlanId, setVerifyPlanId] = useState<string | null>(null);
  const [verifyPlanBusy, setVerifyPlanBusy] = useState(false);
  const [verifyPlanError, setVerifyPlanError] = useState<string | null>(null);
  const [dataOpsHint, setDataOpsHint] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  /** Opens Unified workspace + scroll to operator twin résumé ingest when incremented (Assistant link / URL hash). */
  const [resumePhaseRevealKey, setResumePhaseRevealKey] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [chatAttachment, setChatAttachment] = useState<ChatComposerAttachment | null>(null);
  const [launchAccess, setLaunchAccess] = useState<LaunchAccessState>(() =>
    readLaunchAccessState()
  );
  /** `welcome.html` is the local preview-access gateway; once unlocked, hand off to the canonical app shell. */
  useEffect(() => {
    if (surfaceLabel !== 'welcome') return;
    if (shouldRequireLaunchAuth(launchAccess)) return;
    window.location.href = hrefPrimaryAppDefault();
  }, [surfaceLabel, launchAccess]);
  const [firstRunJourneyVisible, setFirstRunJourneyVisible] = useState(
    () => !readFirstRunJourneyDismissed()
  );
  const [conversationId] = useState(readChatConversationId);
  /** Synchronous cache of the last-read workspace — feeds receipt resolution for the checkpoint timeline without an extra async round trip per row. */
  const workspaceDataRef = useRef<BrandOpsData | null>(null);
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
      workspaceDataRef.current = workspace;
      setSnapshot(buildWorkspaceSnapshot(workspace));
      setRecentCheckpoints(findCheckpointsByConversation(workspace, conversationId).slice(0, 20));
      setOperationsSummary({
        active: findActiveCheckpoints(workspace).length,
        pendingApproval: findPendingApprovalCheckpoints(workspace).length
      });
    } catch (err) {
      console.error('BrandOps: failed to refresh workspace snapshot', err);
    }
    setCommandHistory(readCommandChips());
  }, [conversationId]);

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
    const computeProgress = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      setScrollProgress(Math.min(1, Math.max(0, window.scrollY / max)));
    };
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      if (
        window.innerHeight + window.scrollY <
        doc.scrollHeight - CHAT_STICK_TO_BOTTOM_TOLERANCE_PX
      ) {
        stickToBottomRef.current = false;
      }
      computeProgress();
    };
    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    computeProgress();
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
      if (next === 'chat') stickToBottomRef.current = true;
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
      if (p.tab === 'chat') stickToBottomRef.current = true;
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
    if (!stickToBottomRef.current) return;
    const hasConversation = messages.some(
      (message) =>
        message.resultKind !== 'command-result' && (message.sourceSurface ?? 'Chat') === 'Chat'
    );
    if (!hasConversation) return;
    const el = transcriptEndRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      scrollChatTranscriptEndIntoView(el);
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

  /** Set by "Open in Plan" (Ask message / checkpoint card) — the feed item carries a matching `id` (MobileWorkspaceHubView.tsx's `FeedItemRow`), scrolled to once the workspace tab has actually rendered it rather than just switching tabs and leaving the user to search. */
  const [pendingPlanScrollId, setPendingPlanScrollId] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingPlanScrollId) return;
    if (activeTab !== 'workspace') return;
    const id = pendingPlanScrollId;
    setPendingPlanScrollId(null);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [activeTab, pendingPlanScrollId]);

  const openPlanInWorkspace = useCallback(
    (planId: string) => {
      setPendingPlanScrollId(`saved-plan-${planId}`);
      commitTab('workspace');
    },
    [commitTab]
  );

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
    if (pendingAskMemorySave) {
      askMemoryConfirmRef.current?.focus();
    }
  }, [pendingAskMemorySave]);

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
    const userMessageId = uid();
    stickToBottomRef.current = true;
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: 'user', text: trimmed, sourceSurface }
    ]);
    setCommandLoading(true);
    const t0 = performance.now();
    let commandOk = false;
    try {
      const askMatch = trimmed.match(/^ask\s*:\s*([\s\S]*)$/i);
      const isAskSurface = sourceSurface === 'Chat';
      const askQuestion = askMatch ? askMatch[1].trim() : isAskSurface ? trimmed : null;
      if (askQuestion !== null) {
        pushCommandChip(askMatch ? trimmed : `ask: ${askQuestion}`);
        const question = askQuestion;
        if (!question) {
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: 'assistant',
              resultKind: 'ask-result',
              ok: false,
              text: 'Ask My Twin a question — example: What should I prioritize today?'
            }
          ]);
        } else if (isHelloAskPrompt(question)) {
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: 'assistant',
              resultKind: 'ask-result',
              ok: true,
              text: HELLO_ASK_RESPONSE
            }
          ]);
          commandOk = true;
        } else {
          const askCheckpoint = beginAskCheckpoint({
            conversationId,
            questionText: question,
            sourceMessageId: userMessageId
          });
          pushExecutionStage({
            checkpointId: askCheckpoint.id,
            state: 'UNDERSTANDING',
            label: 'Understanding your question'
          });
          const data = await storageService.getData();
          const settings = data.settings;
          const setupState = await describeAiSetupState(settings);
          if (setupState.needsSetup) {
            const failureMsgId = uid();
            setMessages((prev) => [
              ...prev,
              {
                id: failureMsgId,
                role: 'assistant',
                resultKind: 'ask-result',
                ok: false,
                text: `Ask My Twin needs AI setup first. ${setupState.guidance}`
              }
            ]);
            const setupFailCheckpoint = failAskCheckpoint({
              conversationId,
              parentCheckpointId: askCheckpoint.id,
              code: setupState.reason ?? 'adapter_disabled',
              message: setupState.guidance ?? 'AI is not configured.'
            });
            let setupTraced = prependCheckpoint(data, askCheckpoint);
            setupTraced = prependCheckpoint(setupTraced, setupFailCheckpoint);
            await storageService.setData(setupTraced);
            commandOk = false;
            return;
          }
          /** Captured once and threaded into every checkpoint this turn creates below (Checkpoint.associatedTwinId) — the root ask.question checkpoint predates this read, so it alone stays untagged. */
          const activeTwin = getActiveDigitalTwin(data);
          const workerResolved = resolveActiveCopilotWorker(settings);
          const routing = resolveHostedAssistantRouting({
            settings,
            workerModelId: workerResolved?.chatModelId ?? null
          });
          const twinContext = buildDigitalTwinContextSummary(activeTwin);
          const routingAugment = [routing.behaviorHint, routing.diagnosticsDetail, twinContext]
            .filter(Boolean)
            .join('\n\n');
          /** Computed once and threaded into `buildHostedAskMessages` below — avoids running expert composition (ASK+PLAN+OPERATE) twice for the same turn. */
          const expertReadout = buildExpertOperatorIntegrationReadout(data, question);
          const completionMessages = buildHostedAskMessages(
            data,
            question,
            workerResolved,
            routingAugment.length ? routingAugment : undefined,
            expertReadout
          );
          const expertCheckpoint = expertConsultationCheckpoint({
            conversationId,
            parentCheckpointId: askCheckpoint.id,
            expertNames: expertReadout.ask.expertNames,
            expertIds: expertReadout.ask.expertIds,
            associatedTwinId: activeTwin?.id
          });
          pushExecutionStage({
            checkpointId: expertCheckpoint.id,
            state: 'WORKING',
            label: 'Consulting experts and drafting a response'
          });
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
          /**
           * The gateway trace above is persisted against a fresh workspace snapshot. Re-read before
           * adding the assistant result so a long hosted request cannot overwrite that trace (or a
           * background/second-tab update) with the pre-request snapshot captured at line 916.
           */
          const postGatewayData = await storageService.getData();
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
            let tracedFail = prependAiAssistantTurnTrace(postGatewayData, {
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
            const failCheckpoint = failAskCheckpoint({
              conversationId,
              parentCheckpointId: expertCheckpoint.id,
              code: result.code,
              message: result.message,
              associatedTwinId: activeTwin?.id
            });
            tracedFail = prependCheckpoint(tracedFail, askCheckpoint);
            tracedFail = prependCheckpoint(tracedFail, expertCheckpoint);
            tracedFail = prependCheckpoint(tracedFail, failCheckpoint);
            await storageService.setData(tracedFail);
            commandOk = false;
          } else {
            const assistantMsgId = uid();
            const parsed = parsedAsk!;
            const orphans = sanitizeOrphanInlineMarkers(
              findOrphanInlineCitationMarkers(parsed.displayText, parsed.citations)
            );
            let nextWorkspace = prependAiAssistantTurnTrace(postGatewayData, {
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
            const activeTwinForCore = getActiveDigitalTwin(nextWorkspace);
            const aiCoreResponse = await runBrandOpsAI({
              workspace: nextWorkspace,
              request: {
                intent: question,
                mode: 'ask',
                twinId: activeTwinForCore?.id,
                workspaceId: activeTwinForCore?.workspaceId,
                userInput: question,
                requiredOutputs: ['opportunity analysis'],
                safetyLevel: 'review',
                approvalRequired: false
              },
              generatedText: parsed.displayText
            });
            nextWorkspace = prependBrandOpsAICoreResult(nextWorkspace, aiCoreResponse);
            const traceSummary = toAssistantAskTraceSummaryUI(traceBundle);
            const completeCheckpoint = completeAskCheckpoint({
              conversationId,
              parentCheckpointId: expertCheckpoint.id,
              responseSummary: parsed.displayText,
              generatedArtifactRef: { kind: 'trace_bundle', id: traceBundle.trace_id },
              associatedTwinId: activeTwinForCore?.id
            });
            nextWorkspace = prependCheckpoint(nextWorkspace, askCheckpoint);
            nextWorkspace = prependCheckpoint(nextWorkspace, expertCheckpoint);
            if (aiCoreResponse.artifacts.length > 0) {
              const mintedArtifact = aiCoreResponse.artifacts[0];
              nextWorkspace = prependCheckpoint(
                nextWorkspace,
                artifactGeneratedCheckpoint({
                  conversationId,
                  parentCheckpointId: completeCheckpoint.id,
                  artifactId: mintedArtifact.id,
                  artifactTitle: mintedArtifact.title,
                  associatedTwinId: activeTwinForCore?.id
                })
              );
            }
            nextWorkspace = prependCheckpoint(nextWorkspace, completeCheckpoint);
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
            commandOk = true;
          }
        }
        await refreshWorkspaceSnapshot();
      } else {
        pushExecutionStage({ state: 'WORKING', label: 'Running workspace command' });
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
        await storageService.setData(
          prependCheckpoint(
            data,
            commandCheckpoint({ conversationId, commandText: trimmed, ok: result.ok })
          )
        );
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
      clearExecutionStage();
    }
  };

  const startSend = (
    trimmed: string,
    sourceSurface: 'Workspace' | 'Today' | 'Integrations' | 'Settings' | 'Chat' = 'Chat'
  ) => {
    if (!trimmed || commandLoading) return;
    if (sourceSurface !== 'Chat' && needsDestructiveConfirm(trimmed)) {
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
      setDataOpsHint('Executing command from Workspace — twin reasoning in progress...');
    } else if (source !== 'Chat') {
      const surfaceLabel =
        source === 'Today'
          ? 'Today'
          : source === 'Integrations'
            ? 'Integrations'
            : source === 'Settings'
              ? 'Settings'
              : 'Workspace';
      setDataOpsHint(`Executing from ${surfaceLabel} — routing to Ask My Twin...`);
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

  const capturePlanArtifactInAiCore = useCallback(
    async (args: {
      intent: string;
      userInput: string;
      generatedText: string;
      requiredOutputs: BrandOpsAIArtifactType[];
      approvalRequired?: boolean;
    }) => {
      try {
        const data = await storageService.getData();
        const activeTwin = getActiveDigitalTwin(data);
        const response = await runBrandOpsAI({
          workspace: data,
          request: {
            intent: args.intent,
            mode: 'plan',
            twinId: activeTwin?.id,
            workspaceId: activeTwin?.workspaceId,
            userInput: args.userInput,
            requiredOutputs: args.requiredOutputs,
            safetyLevel: 'review',
            approvalRequired: args.approvalRequired ?? true
          },
          generatedText: args.generatedText
        });
        await storageService.setData(prependBrandOpsAICoreResult(data, response));
        await refreshWorkspaceSnapshot();
      } catch (err) {
        console.error('BrandOps: AI Core PLAN artifact capture failed', err);
        setDataOpsHint('Plan draft created, but artifact capture failed.');
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const persistAskMemorySave = useCallback(
    async (request: AskMemorySaveRequest) => {
      const claim = `${request.title}: ${request.summary}`
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 520);
      if (!claim) return;
      try {
        const data = await storageService.getData();
        const activeTwin = getActiveDigitalTwin(data);
        if (!activeTwin || !data.digitalTwins) {
          setDataOpsHint('Create a Digital Twin in Settings first — then save Ask outputs into twin memory.');
          return;
        }
        const nowIso = new Date().toISOString();
        const nextTwins = data.digitalTwins.twins.map((twin) => {
          if (twin.id !== activeTwin.id) return twin;
          return {
            ...twin,
            updatedAt: nowIso,
            memory: {
              ...twin.memory,
              approvedClaims: Array.from(
                new Set([claim, ...twin.memory.approvedClaims].filter(Boolean))
              ).slice(0, 40)
            },
            actions: {
              ...twin.actions,
              auditTrail: [
                {
                  id: `ask-memory-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  at: nowIso,
                  action: 'ask-memory-save',
                  summary: `Saved Ask output into approved twin memory: ${request.title}`
                },
                ...twin.actions.auditTrail
              ].slice(0, 80)
            }
          };
        });
        await storageService.setData({
          ...data,
          digitalTwins: {
            ...data.digitalTwins,
            twins: nextTwins
          }
        });
        await refreshWorkspaceSnapshot();
        setDataOpsHint('Ask output saved to twin memory — workspace context refreshed.');
      } catch (err) {
        console.error('BrandOps: ASK memory save failed', err);
        setDataOpsHint('Could not save ASK output to memory. Nothing was changed.');
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const convertAskOutputToPlan = useCallback((request: AskPlanConversionRequest) => {
    setPendingAskPlanConversion(request);
    setAskPlanPreset('custom-plan');
    setAskPlanDraft(null);
    setAskPlanError(null);
  }, []);

  const generateAskPlanDraft = useCallback(
    async (preset: PlanPreset) => {
      if (!pendingAskPlanConversion) return;
      setAskPlanBusy(true);
      setAskPlanError(null);
      setAskPlanPreset(preset);
      try {
        const data = await storageService.getData();
        const result = convertAskResponseToPlan({
          conversationId,
          messageId: pendingAskPlanConversion.messageId,
          responseText: pendingAskPlanConversion.askOutput,
          userIntent: pendingAskPlanConversion.originalUserMessage,
          activeTwinId: snapshot.activeDigitalTwin?.id ?? null,
          planPreset: preset,
          workspaceContext: data,
          verifiedFactsUsed: pendingAskPlanConversion.verifiedFactsUsed,
          unverifiedMissingFacts: pendingAskPlanConversion.unverifiedMissingFacts
        });
        if (!result.ok) {
          setAskPlanError(`${result.error} ${result.issues.join(' ')}`.trim());
          setAskPlanDraft(null);
          return;
        }
        setAskPlanDraft(result.draft);
      } catch (err) {
        console.error('BrandOps: ASK to PLAN preview failed', err);
        setAskPlanError('Could not generate a structured plan draft. Nothing was saved.');
      } finally {
        setAskPlanBusy(false);
      }
    },
    [conversationId, pendingAskPlanConversion, snapshot.activeDigitalTwin]
  );

  const saveAskPlanDraft = useCallback(
    async (draft: PlanDraft) => {
      if (!pendingAskPlanConversion) return;
      setAskPlanBusy(true);
      setAskPlanError(null);
      try {
        const data = await storageService.getData();
        const saved = savePlanDraftToWorkspace({
          workspace: data,
          draft,
          userAction: 'save-plan'
        });
        const checkpoints = planConversionCheckpointChain({
          conversationId,
          planId: saved.plan.id,
          planTitle: saved.plan.title,
          requiresApproval: saved.plan.status === 'pending-approval',
          receiptId: saved.receipt.id
        });
        let workspaceWithCheckpoints = saved.workspace;
        for (const checkpoint of checkpoints) {
          workspaceWithCheckpoints = prependCheckpoint(workspaceWithCheckpoints, checkpoint);
        }
        await storageService.setData(workspaceWithCheckpoints);
        await refreshWorkspaceSnapshot();
        setMessages((prev) =>
          prev.map((message) =>
            message.id === pendingAskPlanConversion.messageId
              ? {
                  ...message,
                  planConversion: {
                    planId: saved.plan.id,
                    planTitle: saved.plan.title,
                    convertedAt: saved.plan.savedAt
                  }
                }
              : message
          )
        );
        await capturePlanArtifactInAiCore({
          intent: `Convert ASK output to ${saved.plan.title}`,
          userInput: pendingAskPlanConversion.askOutput,
          generatedText: JSON.stringify(saved.plan, null, 2),
          requiredOutputs: aiCoreOutputsForAskPlanKind(pendingAskPlanConversion.kind),
          approvalRequired: true
        });
        setConvertedOperationalPlans([]);
        setPendingAskPlanConversion(null);
        setAskPlanDraft(null);
        commitTab('workspace');
        setDataOpsHint(
          'ASK response saved as a PLAN draft with approvals, source link, and receipt.'
        );
      } catch (err) {
        console.error('BrandOps: ASK to PLAN save failed', err);
        setAskPlanError(
          err instanceof Error
            ? err.message
            : 'Plan draft failed validation or could not be saved. Nothing changed.'
        );
      } finally {
        setAskPlanBusy(false);
      }
    },
    [
      capturePlanArtifactInAiCore,
      commitTab,
      conversationId,
      pendingAskPlanConversion,
      refreshWorkspaceSnapshot
    ]
  );

  const convertPredictiveOpportunityToPlan = useCallback(
    async (suggestion: PredictiveOpportunitySuggestion) => {
      const card = buildOperationalPlanFromPredictiveSuggestion(suggestion);
      try {
        const data = await storageService.getData();
        const saved = persistConvertedPlan({
          workspace: data,
          conversationId,
          messageId: `predictive-opportunity-${suggestion.id}`,
          responseText: [
            `Opportunity: ${suggestion.title}.`,
            `Suggestion: ${suggestion.suggestion}`,
            `Why this appeared: ${suggestion.whyThisAppeared}`,
            `Expected impact: ${suggestion.expectedImpact}`,
            `Supporting signals: ${suggestion.supportingSignals.join(' | ')}`,
            `Confidence: ${suggestion.confidence}%`
          ].join(' '),
          userIntent: `Convert predictive opportunity "${suggestion.title}" to PLAN`,
          activeTwinId: snapshot.activeDigitalTwin?.id ?? null,
          planPreset: planPresetForOperationalKind(card.kind),
          sourceSurface: 'predictive-opportunity',
          convertedFromLabel: 'Predictive opportunity'
        });
        setConvertedOperationalPlans((prev) => [card, ...prev].slice(0, 6));
        await storageService.setData(saved.workspace);
        await refreshWorkspaceSnapshot();
        await capturePlanArtifactInAiCore({
          intent: `Convert predictive opportunity "${suggestion.title}" to PLAN`,
          userInput: `${suggestion.title}\n${suggestion.whyThisAppeared}\n${suggestion.expectedImpact}`,
          generatedText: JSON.stringify(saved.plan, null, 2),
          requiredOutputs: ['opportunity analysis', 'operational plan'],
          approvalRequired: true
        });
        commitTab('workspace');
        setDataOpsHint(
          `Predictive opportunity converted and saved to PLAN as "${saved.plan.title}". Review, approve, edit, retry, or export it.`
        );
      } catch (err) {
        console.error('BrandOps: predictive opportunity to PLAN save failed', err);
        setDataOpsHint(
          'Could not convert the predictive opportunity to PLAN. Nothing was changed.'
        );
      }
    },
    [
      capturePlanArtifactInAiCore,
      commitTab,
      conversationId,
      refreshWorkspaceSnapshot,
      snapshot.activeDigitalTwin
    ]
  );

  const convertContentIdeationToPlan = useCallback(
    async (item: ContentIdeationItem) => {
      const card = buildOperationalPlanFromContentIdeation(item);
      try {
        const data = await storageService.getData();
        const saved = persistConvertedPlan({
          workspace: data,
          conversationId,
          messageId: `predictive-content-ideation-${item.id}`,
          responseText: [
            `Content idea: ${item.title}.`,
            item.idea,
            `Why now: ${item.whyNow}`,
            `Suggested format: ${item.suggestedFormat}`,
            `Expected impact: ${item.expectedImpact}`
          ].join(' '),
          userIntent: `Convert content idea "${item.title}" to PLAN`,
          activeTwinId: snapshot.activeDigitalTwin?.id ?? null,
          planPreset: planPresetForOperationalKind(card.kind),
          sourceSurface: 'predictive-content-ideation',
          convertedFromLabel: 'Content ideation'
        });
        setConvertedOperationalPlans((prev) => [card, ...prev].slice(0, 6));
        await storageService.setData(saved.workspace);
        await refreshWorkspaceSnapshot();
        await capturePlanArtifactInAiCore({
          intent: `Convert content idea "${item.title}" to PLAN`,
          userInput: `${item.title}\n${item.idea}\n${item.whyNow}`,
          generatedText: JSON.stringify(saved.plan, null, 2),
          requiredOutputs: ['content idea', 'content plan'],
          approvalRequired: true
        });
        commitTab('workspace');
        setDataOpsHint(
          `Content ideation converted and saved to PLAN as "${saved.plan.title}". Review, approve, edit, retry, or export it.`
        );
      } catch (err) {
        console.error('BrandOps: content ideation to PLAN save failed', err);
        setDataOpsHint('Could not convert the content idea to PLAN. Nothing was changed.');
      }
    },
    [
      capturePlanArtifactInAiCore,
      commitTab,
      conversationId,
      refreshWorkspaceSnapshot,
      snapshot.activeDigitalTwin
    ]
  );

  const convertWorkflowPredictionToPlan = useCallback(
    async (prediction: WorkflowPrediction) => {
      const card = buildOperationalPlanFromWorkflowPrediction(prediction);
      try {
        const data = await storageService.getData();
        const saved = persistConvertedPlan({
          workspace: data,
          conversationId,
          messageId: `workflow-prediction-${prediction.id}`,
          responseText: [
            `Workflow: ${prediction.title}.`,
            prediction.repeatedPattern,
            `Suggestion: ${prediction.suggestion}`,
            `Reusable template: ${prediction.reusableTemplateName}`,
            `Recommended steps: ${prediction.recommendedSteps.join(' → ')}`,
            `Approval gate: ${prediction.approvalGate}`
          ].join(' '),
          userIntent: `Convert workflow prediction "${prediction.title}" to PLAN`,
          activeTwinId: snapshot.activeDigitalTwin?.id ?? null,
          planPreset: planPresetForOperationalKind(card.kind),
          sourceSurface: 'workflow-prediction',
          convertedFromLabel: 'Workflow prediction'
        });
        setConvertedOperationalPlans((prev) => [card, ...prev].slice(0, 6));
        await storageService.setData(saved.workspace);
        await refreshWorkspaceSnapshot();
        await capturePlanArtifactInAiCore({
          intent: `Convert workflow prediction "${prediction.title}" to PLAN`,
          userInput: `${prediction.title}\n${prediction.repeatedPattern}`,
          generatedText: JSON.stringify(saved.plan, null, 2),
          requiredOutputs: ['workflow plan'],
          approvalRequired: true
        });
        commitTab('workspace');
        setDataOpsHint(
          `Workflow prediction converted and saved to PLAN as "${saved.plan.title}". Save, edit, reuse, template, or automate only after approval.`
        );
      } catch (err) {
        console.error('BrandOps: workflow prediction to PLAN save failed', err);
        setDataOpsHint('Could not convert the workflow prediction to PLAN. Nothing was changed.');
      }
    },
    [
      capturePlanArtifactInAiCore,
      commitTab,
      conversationId,
      refreshWorkspaceSnapshot,
      snapshot.activeDigitalTwin
    ]
  );

  const onSignInProvider = useCallback((provider: AuthProviderId) => {
    const nextEmail =
      provider === 'google'
        ? 'google.preview@brandops.invalid'
        : provider === 'apple'
          ? 'apple.preview@brandops.invalid'
          : provider === 'github'
            ? 'github.preview@brandops.invalid'
            : provider === 'linkedin'
              ? 'linkedin.preview@brandops.invalid'
              : 'operator.preview@brandops.invalid';
    setLaunchAccess((prev) => ({
      ...prev,
      auth: {
        isAuthenticated: true,
        provider,
        email: nextEmail,
        signedInAt: new Date().toISOString()
      }
    }));
    setDataOpsHint(`${authProviderLabel(provider)} local account selected.`);
  }, []);

  const onSignOut = useCallback(() => {
    setLaunchAccess((prev) => ({
      ...prev,
      auth: { isAuthenticated: false, provider: null, email: '' }
    }));
    setDataOpsHint('Local access cleared.');
  }, []);

  const onStartCheckout = useCallback(() => {
    if (STRIPE_CHECKOUT_URL) {
      window.open(STRIPE_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
    } else {
      setDataOpsHint('Checkout is not available in this version of BrandOps.');
    }
  }, []);

  const onOpenBillingPortal = useCallback(() => {
    if (STRIPE_BILLING_PORTAL_URL) {
      window.open(STRIPE_BILLING_PORTAL_URL, '_blank', 'noopener,noreferrer');
    } else {
      setDataOpsHint('Billing portal is not available in this version of BrandOps.');
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

  const openCreateTwinSetup = useCallback(() => {
    commitTab('settings');
    setResumePhaseRevealKey((key) => key + 1);
  }, [commitTab]);

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
      setDataOpsHint('Workspace JSON downloaded.');
    } catch (e) {
      setDataOpsHint(e instanceof Error ? e.message : 'Workspace export failed.');
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
      setDataOpsHint('Operator traces JSONL downloaded.');
    } catch (e) {
      setDataOpsHint(e instanceof Error ? e.message : 'Traces export failed.');
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
      setDataOpsHint(e instanceof Error ? e.message : 'Pipeline run download failed.');
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
        const next = approveCheckpointForTrace(data, traceId);
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
        setDataOpsHint('Trace approved — recorded in the execution audit.');
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
        const next = rejectCheckpointForTrace(data, traceId);
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
        setDataOpsHint('Trace rejected — no external action was executed.');
      } catch (e) {
        console.error('BrandOps: reject operator trace failed', e);
        setDataOpsHint(e instanceof Error ? e.message : 'Could not reject trace.');
      }
    },
    [refreshWorkspaceSnapshot]
  );

  /** Disables the approve/reject buttons on `ApprovalCheckpoint` cards for the duration of an in-flight decision — prevents a double-click firing two concurrent approve/reject calls. */
  const [checkpointActionBusy, setCheckpointActionBusy] = useState(false);

  /** Approve/reject wired directly from a `plan.approval_requested` checkpoint rendered in Ask's own timeline (not just Plan's review queue) — same underlying source of truth, keyed by plan id instead of trace id. */
  const approvePlanFromCheckpoint = useCallback(
    async (checkpoint: Checkpoint) => {
      const planId = checkpoint.associatedPlanRef?.id;
      if (!planId) return;
      setCheckpointActionBusy(true);
      try {
        const data = await storageService.getData();
        const next = approveCheckpointForPlan(data, planId);
        if (!next) {
          setDataOpsHint('No pending review found for that plan.');
          return;
        }
        await storageService.setData(next);
        await refreshWorkspaceSnapshot();
        setDataOpsHint('Checkpoint approved — plan can proceed to the next step.');
      } catch (e) {
        console.error('BrandOps: approve plan checkpoint failed', e);
        setDataOpsHint(e instanceof Error ? e.message : 'Could not approve.');
      } finally {
        setCheckpointActionBusy(false);
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const rejectPlanFromCheckpoint = useCallback(
    async (checkpoint: Checkpoint) => {
      const planId = checkpoint.associatedPlanRef?.id;
      if (!planId) return;
      setCheckpointActionBusy(true);
      try {
        const data = await storageService.getData();
        const next = rejectCheckpointForPlan(data, planId);
        if (!next) {
          setDataOpsHint('No pending review found for that plan.');
          return;
        }
        await storageService.setData(next);
        await refreshWorkspaceSnapshot();
        setDataOpsHint('Checkpoint rejected — no action was executed.');
      } catch (e) {
        console.error('BrandOps: reject plan checkpoint failed', e);
        setDataOpsHint(e instanceof Error ? e.message : 'Could not reject.');
      } finally {
        setCheckpointActionBusy(false);
      }
    },
    [refreshWorkspaceSnapshot]
  );

  /**
   * Executes an approved plan via the P0-1 executor. Execution is recorded —
   * steps requiring a platform/approval/external action are reported as
   * blocked, never performed. Persists the mutated workspace and surfaces
   * `result.summary` (honest: 'executed' means recorded, not successful).
   */
  const executeApprovedPlan = useCallback(
    async (planId: string) => {
      try {
        const data = await storageService.getData();
        const result = executePlan(data, planId);
        if (result.workspace === data) {
          setDataOpsHint(result.summary);
          return;
        }
        await storageService.setData(result.workspace);
        await refreshWorkspaceSnapshot();
        const blocked = result.blockedSteps.length
          ? ` ${result.blockedSteps.length} step(s) blocked (external action required).`
          : '';
        setDataOpsHint(`${result.summary}${blocked}`);
      } catch (e) {
        console.error('BrandOps: execute plan failed', e);
        setDataOpsHint(e instanceof Error ? e.message : 'Could not execute plan.');
      }
    },
    [refreshWorkspaceSnapshot]
  );

  /**
   * The VERIFY stage: records the operator's own confirmation of what an
   * `executed` plan's steps actually achieved. BrandOps performed no external
   * side effects and cannot observe real-world outcomes itself, so this never
   * auto-marks anything achieved — it only records what the human confirms.
   * `verifyPlanOutcomes` refuses anything not in `executed` status.
   */
  const recordPlanVerification = useCallback(
    async (planId: string, outcomes: VerifyStepOutcome[]) => {
      setVerifyPlanBusy(true);
      setVerifyPlanError(null);
      try {
        const data = await storageService.getData();
        const result = verifyPlanOutcomes(data, planId, { outcomes });
        if (!result.verified) {
          setVerifyPlanError(result.summary);
          return;
        }
        await storageService.setData(result.workspace);
        await refreshWorkspaceSnapshot();
        setDataOpsHint(result.summary);
        setVerifyPlanId(null);
      } catch (e) {
        console.error('BrandOps: verify plan outcomes failed', e);
        setVerifyPlanError(e instanceof Error ? e.message : 'Could not record verification.');
      } finally {
        setVerifyPlanBusy(false);
      }
    },
    [refreshWorkspaceSnapshot]
  );

  /** Recovers the original question from a FAILED checkpoint's chain root and resends it — real retry, not a button that just hides the error. */
  const retryAskFromCheckpoint = async (checkpoint: Checkpoint) => {
    try {
      const data = await storageService.getData();
      const root = findCheckpointChainRoot(data, checkpoint.id);
      if (!root || root.type !== 'ask.question') {
        setDataOpsHint('Could not find the original question to retry.');
        return;
      }
      /** `root.summary` is display-clamped (MAX_SUMMARY_LEN) — recover the full, untruncated question from the source message when available so a long question doesn't get silently cut off on retry. */
      const sourceMessage = root.sourceMessageId
        ? messages.find((m) => m.id === root.sourceMessageId)
        : undefined;
      const questionText = sourceMessage?.text || root.summary;
      await executeCommandFlow(`ask: ${questionText}`, 'Chat');
    } catch (e) {
      console.error('BrandOps: retry ask checkpoint failed', e);
      setDataOpsHint(e instanceof Error ? e.message : 'Could not retry.');
    }
  };

  /** Structured-command failures have no retry (no original question to resend) — `inspect` is their only recovery action, matching the "ask: explain this JSON" pattern used elsewhere (e.g. Preview PLAN/opportunity cards) rather than leaving the failure card with no action at all. */
  const inspectFailedCheckpoint = (checkpoint: Checkpoint) => {
    sendQuickCommand(
      `ask: Explain this failed checkpoint in plain language — what happened, the likely cause, and what I can safely try next. Do not execute anything.\n\n${JSON.stringify(checkpoint, null, 2)}`
    );
  };

  const resolveCheckpointReceipt = useCallback((checkpoint: Checkpoint) => {
    if (!workspaceDataRef.current) return null;
    return resolveExecutionReceipt(workspaceDataRef.current, checkpoint);
  }, []);

  /** A workspace can hold several named twins — resolve which one this checkpoint's turn actually ran against, not just the currently active one. */
  const resolveCheckpointTwinName = useCallback((checkpoint: Checkpoint) => {
    if (!checkpoint.associatedTwinId) return null;
    const twins = workspaceDataRef.current?.digitalTwins?.twins ?? [];
    return twins.find((twin) => twin.id === checkpoint.associatedTwinId)?.displayName ?? null;
  }, []);

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

  const saveAiBridgeConfiguration = useCallback(
    async (input: AiBridgeConfigurationInput) => {
      const inferenceBaseUrl = input.bridge.inferenceBaseUrl.trim().replace(/\/+$/, '');
      const embeddingBaseUrl = input.bridge.embeddingBaseUrl.trim().replace(/\/+$/, '');
      const chatModelId = input.bridge.chatModelId.trim();
      const embeddingModelId = input.bridge.embeddingModelId.trim();
      const endpointBaseUrls = [inferenceBaseUrl, embeddingBaseUrl].filter(Boolean);

      if (input.adapterMode === 'external-opt-in' && !inferenceBaseUrl) {
        throw new Error('Inference base URL is required for hosted mode.');
      }
      if (!chatModelId) throw new Error('Chat model ID is required.');
      if (!embeddingModelId) throw new Error('Embedding model ID is required.');
      endpointBaseUrls.forEach(normalizeOpenAiCompatibleEndpointOrigin);

      // Must remain in the direct Save click path so Chrome can show an optional-origin prompt.
      const endpointAccess = await ensureAiEndpointAccess(endpointBaseUrls);
      if (!endpointAccess.granted) {
        throw new Error(
          'Endpoint access was not granted. The hosted AI settings were not changed.'
        );
      }

      if (input.adapterMode === 'external-opt-in' || input.apiKey) {
        await configureOpenAiCompatibleCredentials({
          endpointBaseUrls,
          ...(input.apiKey ? { apiKey: input.apiKey } : {})
        });
      }

      const data = await storageService.getData();
      await storageService.setData({
        ...data,
        settings: {
          ...data.settings,
          aiAdapterMode: input.adapterMode,
          aiBridge: {
            inferenceBaseUrl,
            embeddingBaseUrl,
            chatModelId,
            embeddingModelId
          }
        }
      });
      await refreshWorkspaceSnapshot();
      setDataOpsHint('Hosted AI settings saved.');
    },
    [refreshWorkspaceSnapshot]
  );

  const clearAiBridgeApiKey = useCallback(async () => {
    await clearOpenAiCompatibleApiKey();
    setDataOpsHint('Hosted AI API key removed from this device.');
  }, []);

  const testAiBridgeConnection = useCallback(async (): Promise<string> => {
    const data = await storageService.getData();
    const startedAt = performance.now();
    const result = await runChatCompletion(data.settings, {
      messages: [
        { role: 'system', content: 'You are a connectivity probe. Reply with the single word OK.' },
        { role: 'user', content: 'Connectivity check.' }
      ],
      temperature: 0,
      maxTokens: 8
    });
    if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
    const durationMs = Math.round(performance.now() - startedAt);
    return `Connection succeeded with ${data.settings.aiBridge.chatModelId} (${durationMs} ms).`;
  }, []);

  const importWorkspace = useCallback(
    async (raw: string) => {
      await storageService.importData(raw);
      await refreshWorkspaceSnapshot();
      requestExtensionSchedulerSync();
      setDataOpsHint('Workspace imported — snapshot refreshed.');
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
        const aiCoreResponse = await runBrandOpsAI({
          workspace: hydrated.workspace,
          request: {
            intent: `Generate BrandOps AI Core launch kit for ${twin.displayName}`,
            mode: 'batch',
            twinId: twin.id,
            workspaceId: twin.workspaceId,
            userInput: input.rawText.slice(0, MAX_CHAT_TEXT_ATTACHMENT),
            safetyLevel: 'review',
            approvalRequired: true
          },
          generatedText: resumeArtifact
        });
        const nextWorkspace = prependBrandOpsAICoreResult(hydrated.workspace, aiCoreResponse);
        await storageService.setData(nextWorkspace);
        await refreshWorkspaceSnapshot();
        setDataOpsHint(
          `Digital twin ready for ${twin.displayName}; captured ${hydrated.capturedArtifactCount} profile artifacts and ${aiCoreResponse.artifacts.length} AI Core artifacts.`
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

  const updateTwinFactStatus = useCallback(
    async (input: {
      twinId: string;
      itemKind: 'experience' | 'education' | 'project';
      itemId: string;
      status: 'verified' | 'rejected';
    }) => {
      try {
        const data = await storageService.getData();
        const next = updateTwinFactVerificationStatus(data, input);
        if (next === data) {
          setDataOpsHint('Twin fact not found — nothing changed.');
          return;
        }
        await storageService.setData(next);
        await refreshWorkspaceSnapshot();
        setDataOpsHint(`Twin fact marked ${input.status}.`);
      } catch (err) {
        console.error('BrandOps: update twin fact status failed', err);
        setDataOpsHint('Could not update twin fact verification status.');
      }
    },
    [refreshWorkspaceSnapshot]
  );

  const updateTwinGoals = useCallback(
    async (input: { twinId: string; goals: string[] }) => {
      try {
        const data = await storageService.getData();
        const next = updateTwinIdentityGoals(data, input.twinId, input.goals);
        if (next === data) {
          setDataOpsHint('Twin not found — nothing changed.');
          return;
        }
        await storageService.setData(next);
        await refreshWorkspaceSnapshot();
        setDataOpsHint(
          input.goals.length === 0
            ? 'Twin goals cleared.'
            : `Twin goals updated (${input.goals.length} total).`
        );
      } catch (err) {
        console.error('BrandOps: update twin goals failed', err);
        setDataOpsHint('Could not update twin goals.');
      }
    },
    [refreshWorkspaceSnapshot]
  );

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
      setDataOpsHint(
        'Memory context deleted. Twin memory, local traces, ASK trace memory, and connected identity signals were cleared.'
      );
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
            'mx-auto flex w-full items-center justify-between gap-3',
            MOBILE_SHELL_MAX_WIDTH_CLASS,
            MOBILE_SHELL_EDGE_PAD_CLASS
          )}
        >
          <div className="bo-mobile-brand flex min-w-0 flex-1 gap-2.5">
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
              <h1
                className="bo-mobile-brand__title min-w-0 truncate text-lg font-semibold leading-tight tracking-tight"
                aria-describedby={shellTitleDescId}
              >
                {shellScreenTitle}
              </h1>
              {dataOpsHint ? <WorkspaceDataHint message={dataOpsHint} /> : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-start justify-end gap-1.5">
            {!shouldRequireLaunchAuth(launchAccess) ? (
              <BackgroundOperationsIndicator
                activeCount={operationsSummary.active}
                pendingApprovalCount={operationsSummary.pendingApproval}
                onClick={() => commitTab('workspace')}
              />
            ) : null}
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
                aria-label="Quick actions"
                title="Quick actions (⌘K / Ctrl+K)"
                className={clsx(
                  'bo-mobile-help-btn rounded-lg border border-border/40 bg-surface/35 p-2 text-textMuted transition-colors duration-fast hover:border-borderStrong hover:bg-surfaceActive hover:text-text',
                  btnFocus
                )}
              >
                <Search className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => openExtensionSurface('help')}
              aria-label="Open Help"
              title="Knowledge Center — Help"
              className={clsx(
                'bo-mobile-help-btn rounded-lg border border-border/40 bg-surface/35 p-2 text-textMuted transition-colors duration-fast hover:border-borderStrong hover:bg-surfaceActive hover:text-text',
                btnFocus
              )}
            >
              <CircleHelp className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
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
            aria-label="Ask My Twin conversational intelligence"
            key="shell-chat"
          >
            <MobileChatView
              messages={messages}
              loading={commandLoading}
              activeExecution={activeExecution}
              executionHistory={executionHistory}
              checkpoints={recentCheckpoints}
              onApprovePlanCheckpoint={approvePlanFromCheckpoint}
              onRejectPlanCheckpoint={rejectPlanFromCheckpoint}
              checkpointActionBusy={checkpointActionBusy}
              onRetryAskCheckpoint={retryAskFromCheckpoint}
              onInspectCheckpoint={inspectFailedCheckpoint}
              resolveCheckpointReceipt={resolveCheckpointReceipt}
              resolveCheckpointTwinName={resolveCheckpointTwinName}
              onQuickCommand={sendQuickCommand}
              activeDigitalTwin={snapshot.activeDigitalTwin}
              btnFocus={btnFocus}
              transcriptEndRef={transcriptEndRef}
              stickToBottomRef={stickToBottomRef}
              assistantRoutingCaption={snapshot.aiAssistantRoutingCaption}
              onConvertAskToPlan={convertAskOutputToPlan}
              convertingPlanMessageId={askPlanBusy ? pendingAskPlanConversion?.messageId : null}
              onOpenConvertedPlan={openPlanInWorkspace}
              onOpenPlanCheckpoint={(checkpoint) => {
                if (checkpoint.associatedPlanRef?.id)
                  openPlanInWorkspace(checkpoint.associatedPlanRef.id);
              }}
              onRequestSaveToMemory={setPendingAskMemorySave}
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
                <MobileWorkspaceHubView
                  snapshot={snapshot}
                  btnFocus={btnFocus}
                  commandBusy={commandLoading}
                  runCommand={sendQuickCommandFrom('Workspace', { navigateToChat: false })}
                  onOpenToday={() => commitTab('daily')}
                  launchAccess={launchAccess}
                  onOpenSettings={openCreateTwinSetup}
                  onOpenIntegrations={() => commitTab('integrations')}
                  onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                  firstRunJourneyVisible={firstRunJourneyVisible}
                  canRunWorkspaceCommands={agentCommandLock === null}
                  workspaceCommandLockReason={agentCommandLock}
                  onDownloadPipelineRun={downloadPipelineRunJson}
                  onApproveOperatorTrace={approveOperatorTraceReview}
                  onRejectOperatorTrace={rejectOperatorTraceReview}
                  onExecutePlan={executeApprovedPlan}
                  onVerifyPlan={setVerifyPlanId}
                  onConvertPredictiveOpportunityToPlan={convertPredictiveOpportunityToPlan}
                  onConvertContentIdeationToPlan={convertContentIdeationToPlan}
                  onConvertWorkflowPredictionToPlan={convertWorkflowPredictionToPlan}
                  onDeleteMemoryContext={deleteMemoryContext}
                  onDisableMemoryContext={disableMemoryContext}
                  onExportOperationalPlan={exportOperationalPlanJson}
                  onExportExecutionReceipt={exportExecutionReceiptJson}
                  convertedOperationalPlans={convertedOperationalPlans}
                />
                {firstRunJourneyVisible ? (
                  <FirstRunJourneyCard
                    btnFocus={btnFocus}
                    onDismiss={() => {
                      setFirstRunJourneyVisible(false);
                      void persistGettingStartedCompletionToWorkspace();
                    }}
                    onTryCommand={sendQuickCommand}
                    onOpenAsk={() => commitTab('chat')}
                    onOpenSettings={openCreateTwinSetup}
                    onOpenHelp={() => openExtensionSurface('help')}
                  />
                ) : null}
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
                loadWorkspace={() => storageService.getData()}
                applyWorkspace={async (next) => {
                  await storageService.setData(next);
                  await refreshWorkspaceSnapshot();
                }}
                onExportWorkspace={exportWorkspace}
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
                onUpdateTwinFactStatus={updateTwinFactStatus}
                onUpdateTwinGoals={updateTwinGoals}
                resumePhaseRevealKey={resumePhaseRevealKey}
                onAiOperatorModeChange={patchAiOperatorMode}
                onAiRoutingDiagnosticsChange={patchAiRoutingDiagnostics}
                onSaveAiBridgeConfiguration={saveAiBridgeConfiguration}
                onClearAiBridgeApiKey={clearAiBridgeApiKey}
                onTestAiBridgeConnection={testAiBridgeConnection}
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

      {pendingAskMemorySave ? (
        <div
          className="bo-system-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPendingAskMemorySave(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogAskMemoryId}
            className="bo-system-sheet w-full max-w-sm rounded-2xl border border-border/70 p-4 shadow-panel"
          >
            <h2 id={dialogAskMemoryId} className="text-base font-semibold text-text">
              Save ASK output to memory?
            </h2>
            <p className="mt-2 text-sm text-textMuted">
              This will add the item to the active digital twin&apos;s approved memory. Workspace
              DNA will refresh from that memory. Review before saving identity-level facts.
            </p>
            <div className="mt-2 rounded-lg border border-border/50 bg-bgSubtle/80 p-2 text-xs text-textMuted">
              <p className="font-semibold text-text">{pendingAskMemorySave.title}</p>
              <p className="mt-1 leading-snug">{pendingAskMemorySave.summary}</p>
              {pendingAskMemorySave.sourceFacts.length ? (
                <p className="mt-2 leading-snug">
                  Source facts: {pendingAskMemorySave.sourceFacts.slice(0, 3).join(' · ')}
                </p>
              ) : (
                <p className="mt-2 leading-snug text-warning">
                  No source facts attached. Save only if you have reviewed this claim.
                </p>
              )}
            </div>
            <OnDeviceDialogTrustFooter />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={`rounded-lg border border-border px-3 py-2 text-sm text-textMuted ${btnFocus}`}
                onClick={() => setPendingAskMemorySave(null)}
              >
                Cancel
              </button>
              <button
                ref={askMemoryConfirmRef}
                type="button"
                className={`rounded-lg border border-success/50 bg-successSoft/20 px-3 py-2 text-sm font-semibold text-success ${btnFocus}`}
                onClick={() => {
                  const pending = pendingAskMemorySave;
                  setPendingAskMemorySave(null);
                  if (pending) void persistAskMemorySave(pending);
                }}
              >
                Save to memory
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
                      setDataOpsHint(e instanceof Error ? e.message : 'Workspace reset failed.');
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

      <ConvertAskToPlanDrawer
        open={Boolean(pendingAskPlanConversion)}
        draft={askPlanDraft}
        selectedPreset={askPlanPreset}
        busy={askPlanBusy}
        error={askPlanError}
        btnFocus={btnFocus}
        onSelectPreset={setAskPlanPreset}
        onGenerate={(preset) => void generateAskPlanDraft(preset)}
        onQuickConvert={() => void generateAskPlanDraft('custom-plan')}
        onUpdateDraft={setAskPlanDraft}
        onSave={(draft) => void saveAskPlanDraft(draft)}
        onRegenerate={() => void generateAskPlanDraft(askPlanPreset)}
        onCancel={() => {
          if (askPlanBusy) return;
          setPendingAskPlanConversion(null);
          setAskPlanDraft(null);
          setAskPlanError(null);
        }}
      />

      <VerifyPlanOutcomesDrawer
        open={verifyPlanId !== null}
        plan={snapshot.convertedAskPlans.find((plan) => plan.id === verifyPlanId) ?? null}
        busy={verifyPlanBusy}
        error={verifyPlanError}
        btnFocus={btnFocus}
        onCancel={() => {
          if (verifyPlanBusy) return;
          setVerifyPlanId(null);
          setVerifyPlanError(null);
        }}
        onSubmit={(planId, outcomes) => void recordPlanVerification(planId, outcomes)}
      />

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
