import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  MessageCircle,
  CalendarCheck2,
  PlugZap,
  History,
  Settings,
  Copy,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { executeAgentWorkspaceCommand } from '../../services/agent/agentWorkspaceEngine';
import { storageService } from '../../services/storage/storage';
import type { AgentAuditEntry, BrandOpsData } from '../../types/domain';

type TabId = 'chat' | 'daily' | 'integrations' | 'settings';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Present for command results from the workspace engine */
  action?: string;
  ok?: boolean;
  resultKind?: 'plain' | 'command-result';
  strip?: {
    notes: number;
    queue: number;
    followUps: number;
    opportunities: number;
  };
}

const TABS: Array<{ id: TabId; label: string; icon: typeof MessageCircle }> = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'daily', label: 'Daily', icon: CalendarCheck2 },
  { id: 'integrations', label: 'Integrations', icon: PlugZap },
  { id: 'settings', label: 'Settings', icon: Settings }
];

const uid = () => `msg-${Math.random().toString(36).slice(2, 9)}`;

const btnFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950';

interface MobileAppProps {
  initialTab?: TabId;
  surfaceLabel?: string;
}

interface WorkspaceSnapshot {
  notes: number;
  publishingQueue: number;
  outreachDrafts: number;
  opportunities: number;
  integrationSources: number;
  syncProvidersConnected: number;
  cadenceMode: string;
  reminderWindow: string;
  incompleteFollowUps: number;
  activeOpportunities: number;
  queuedPublishing: number;
  providerStatuses: Array<{ id: string; status: string }>;
  recentIntegrationSources: string[];
  visualMode: string;
  motionMode: string;
  ambientFxEnabled: boolean;
  debugMode: boolean;
  managerialWeight: number;
  maxDailyTasks: number;
  remindBeforeMinutes: number;
  operatorName: string;
  focusMetric: string;
  primaryOffer: string;
  dueTodayTasks: number;
  missedTasks: number;
  recentAudit: AgentAuditEntry[];
}

const QUICK_COMMANDS = [
  'add note: prep growth sprint summary for Monday',
  'draft outreach: quick follow-up with warm lead from demo',
  'draft post: three lessons from building an AI growth system',
  'reschedule posts to friday 11am',
  'connect notion source: Growth workspace',
  'update opportunity to proposal',
  'add contact: Jane Doe, Acme, Founder',
  'add content: AI-first growth playbook draft',
  'configure: cadence balanced, remind before 20 min',
  'update contact: John Roe, Apex Labs, CTO',
  'update content: revised growth strategy memo',
  'duplicate content',
  'update publishing ready: checklist finalize copy and publish'
];

const CONFIG_PRESETS: Array<{ label: string; command: string }> = [
  { label: 'Classic visual', command: 'configure: classic' },
  { label: 'Retro visual', command: 'configure: retro' },
  { label: 'Motion off', command: 'configure: motion off' },
  { label: 'Motion balanced', command: 'configure: motion balanced' },
  { label: 'Ambient on', command: 'configure: enable ambient' },
  { label: 'Ambient off', command: 'configure: disable ambient' },
  { label: 'Debug on', command: 'configure: enable debug' },
  { label: 'Debug off', command: 'configure: disable debug' },
  { label: 'Cadence balanced', command: 'configure: cadence balanced' },
  { label: 'Cadence maker-heavy', command: 'configure: cadence maker-heavy' },
  { label: 'Cadence client-heavy', command: 'configure: cadence client-heavy' },
  { label: 'Launch-day cadence', command: 'configure: cadence launch-day' },
  { label: 'Workday 9-18', command: 'configure: workday 9 to 18' },
  { label: 'Max daily tasks 4', command: 'configure: max tasks per lane 4' },
  { label: 'Reminder 20 min', command: 'configure: remind before 20 min' }
];

const OPERATIONAL_PRESETS: Array<{ label: string; command: string }> = [
  {
    label: 'Focus mode preset',
    command:
      'configure: motion off, disable ambient, cadence maker-heavy, workday 9 to 17, max tasks per lane 3'
  },
  {
    label: 'Launch mode preset',
    command:
      'configure: motion balanced, enable ambient, cadence launch-day, workday 8 to 20, max tasks per lane 6'
  },
  {
    label: 'Client delivery preset',
    command:
      'configure: cadence client-heavy, remind before 30 min, workday 9 to 18, max tasks per lane 5'
  }
];

const CHAT_THREAD_KEY = 'brandops:agent:chatThread';
const COMMAND_CHIPS_KEY = 'brandops:agent:commandChips';
const MAX_PERSISTED_MESSAGES = 50;
const MAX_COMMAND_CHIPS = 24;

const TAB_INTROS: Record<
  Exclude<TabId, 'chat'>,
  { title: string; body: string }
> = {
  daily: {
    title: 'Daily command center',
    body:
      'See today’s load at a glance: follow-ups, publishing, opportunities, and scheduler pressure. Use the quick actions to run real commands—everything here goes through the same agent engine as Chat.'
  },
  integrations: {
    title: 'Integrations and sources',
    body:
      'Track OAuth provider status and recent integration sources. Add sources with natural commands (for example Notion or webhook). External channels (Telegram/WhatsApp) reach the same engine via the bridge when configured.'
  },
  settings: {
    title: 'Workspace configuration',
    body:
      'Apply cadence, workday, visuals, and profile presets via chat-native commands. Recent command activity shows audited execution. Destructive archive commands require confirmation in Chat.'
  }
};

const defaultWelcomeMessage = (): ChatMessage => ({
  id: uid(),
  role: 'assistant',
  resultKind: 'plain',
  text:
    'BrandOps AI Agent is ready. Try: "add note: ...", "draft outreach: ...", "draft post: ...", "reschedule posts to friday 11am", or "update opportunity to proposal".'
});

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

export const MobileApp = ({ initialTab = 'chat', surfaceLabel = 'chatbot' }: MobileAppProps) => {
  const dialogDestrId = useId();
  const dialogClearId = useId();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const clearConfirmRef = useRef<HTMLButtonElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>(() => readCommandChips());
  const [pendingDestructive, setPendingDestructive] = useState<string | null>(null);
  const [pendingClearChat, setPendingClearChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const persisted = readChatThread();
    if (persisted && persisted.length > 0) return persisted;
    return [defaultWelcomeMessage()];
  });

  const refreshWorkspaceSnapshot = useCallback(async () => {
    const workspace = await storageService.getData();
    setSnapshot({
      notes: workspace.notes.length,
      publishingQueue: workspace.publishingQueue.length,
      outreachDrafts: workspace.outreachDrafts.length,
      opportunities: workspace.opportunities.length,
      integrationSources: workspace.integrationHub.sources.length,
      syncProvidersConnected: [
        workspace.settings.syncHub.google,
        workspace.settings.syncHub.github,
        workspace.settings.syncHub.linkedin
      ].filter((provider) => provider.connectionStatus === 'connected').length,
      cadenceMode: workspace.settings.cadenceFlow.mode,
      reminderWindow: `${workspace.settings.notificationCenter.workdayStartHour}:00-${workspace.settings.notificationCenter.workdayEndHour}:00`,
      incompleteFollowUps: workspace.followUps.filter((item) => !item.completed).length,
      activeOpportunities: workspace.opportunities.filter((item) => !item.archivedAt).length,
      queuedPublishing: workspace.publishingQueue.filter(
        (item) => item.status === 'queued' || item.status === 'due-soon'
      ).length,
      providerStatuses: [
        { id: 'google', status: workspace.settings.syncHub.google.connectionStatus },
        { id: 'github', status: workspace.settings.syncHub.github.connectionStatus },
        { id: 'linkedin', status: workspace.settings.syncHub.linkedin.connectionStatus }
      ],
      recentIntegrationSources: workspace.integrationHub.sources.slice(0, 5).map((source) => source.name),
      visualMode: workspace.settings.visualMode,
      motionMode: workspace.settings.motionMode,
      ambientFxEnabled: workspace.settings.ambientFxEnabled,
      debugMode: workspace.settings.debugMode,
      managerialWeight: workspace.settings.notificationCenter.managerialWeight,
      maxDailyTasks: workspace.settings.notificationCenter.maxDailyTasks,
      remindBeforeMinutes: workspace.settings.cadenceFlow.remindBeforeMinutes,
      operatorName: workspace.brand.operatorName,
      focusMetric: workspace.brand.focusMetric,
      primaryOffer: workspace.brand.primaryOffer,
      dueTodayTasks: workspace.scheduler.tasks.filter(
        (task) => task.status === 'due' || task.status === 'due-soon'
      ).length,
      missedTasks: workspace.scheduler.tasks.filter((task) => task.status === 'missed').length,
      recentAudit: (workspace.agentAudit?.entries ?? []).slice(0, 8)
    });
    setCommandHistory(readCommandChips());
  }, []);

  useEffect(() => {
    void refreshWorkspaceSnapshot();
  }, [refreshWorkspaceSnapshot]);

  useEffect(() => {
    writeChatThread(messages);
  }, [messages]);

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

  const sendQuickCommand = (command: string) => {
    setInput(command);
    setActiveTab('chat');
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(text).catch(() => {
      // ignore
    });
  };

  const executeCommandFlow = async (trimmed: string) => {
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { id: uid(), role: 'user', text: trimmed }]);
    setLoading(true);
    try {
      const result = await executeAgentWorkspaceCommand({
        text: trimmed,
        actorName: 'mobile-operator',
        source: surfaceLabel === 'chatbot-web' ? 'chatbot-web' : 'chatbot-mobile'
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
          strip
        }
      ]);
      pushCommandChip(trimmed);
      await refreshWorkspaceSnapshot();
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          resultKind: 'command-result',
          ok: false,
          action: 'error',
          text: error instanceof Error ? error.message : 'Unknown error while processing command.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startSend = (trimmed: string) => {
    if (!trimmed || loading) return;
    if (needsDestructiveConfirm(trimmed)) {
      setPendingDestructive(trimmed);
      return;
    }
    void executeCommandFlow(trimmed);
  };

  const runCommand = async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed || loading) return;
    if (needsDestructiveConfirm(trimmed)) {
      setPendingDestructive(trimmed);
      return;
    }
    await executeCommandFlow(trimmed);
  };

  const tabIntro = useMemo(() => {
    if (activeTab === 'chat') return null;
    return TAB_INTROS[activeTab];
  }, [activeTab]);

  const submitMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput('');
    startSend(trimmed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900/80 to-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-gradient-to-r from-indigo-950/40 via-zinc-950/90 to-zinc-950/95 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-md">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">BrandOps Mobile</p>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-50">AI Agent</h1>
        <p className="text-[11px] text-zinc-500">Command-first workspace; local execution</p>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-32 pt-4">
        {activeTab === 'chat' ? (
          <section className="space-y-3" aria-label="Chat conversation">
            <div
              className="space-y-3"
              role="log"
              aria-relevant="additions"
              aria-live="polite"
              aria-atomic="false"
            >
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={
                    message.role === 'user'
                      ? 'ml-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 px-3 py-2.5 text-sm leading-relaxed text-white shadow-md shadow-blue-900/30'
                      : 'mr-6'
                  }
                >
                  {message.role === 'user' ? (
                    message.text
                  ) : message.resultKind === 'command-result' && message.action ? (
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm shadow-inner shadow-black/20 backdrop-blur-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        {message.ok ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                            <CheckCircle2 size={12} aria-hidden />
                            Ok
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
                            <AlertCircle size={12} aria-hidden />
                            Issue
                          </span>
                        )}
                        <code className="rounded bg-zinc-950/80 px-1.5 py-0.5 text-[11px] text-indigo-200">
                          {message.action}
                        </code>
                        <button
                          type="button"
                          className={`ml-auto inline-flex items-center gap-1 rounded-md border border-zinc-600/60 px-2 py-0.5 text-[10px] text-zinc-400 ${btnFocus}`}
                          onClick={() =>
                            copyToClipboard(
                              `${message.action}\n${message.text}${message.strip ? `\n${JSON.stringify(message.strip)}` : ''}`
                            )
                          }
                        >
                          <Copy size={12} aria-hidden />
                          Copy
                        </button>
                      </div>
                      <p className="text-zinc-200 leading-relaxed">{message.text}</p>
                      {message.strip ? (
                        <div className="rounded-lg border border-white/5 bg-zinc-950/50 px-2 py-1.5 text-[10px] text-zinc-500">
                          <span className="font-medium text-zinc-400">Workspace</span>
                          <span className="mx-1.5">·</span>
                          notes {message.strip.notes} · queue {message.strip.queue} · follow-ups{' '}
                          {message.strip.followUps} · opps {message.strip.opportunities}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/90 px-3 py-2.5 text-sm leading-relaxed text-zinc-100">
                      {message.text}
                    </div>
                  )}
                </article>
              ))}
            </div>
            {loading ? (
              <div
                className="mx-6 space-y-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3 motion-reduce:animate-none animate-pulse"
                role="status"
                aria-live="polite"
              >
                <div className="h-2 w-1/3 rounded bg-zinc-700/80" />
                <div className="h-2 w-5/6 rounded bg-zinc-800/80" />
                <div className="h-2 w-2/3 rounded bg-zinc-800/60" />
                <p className="text-xs text-zinc-500">Running command…</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-3 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Quick commands</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_COMMANDS.map((command) => (
                  <button
                    key={command}
                    type="button"
                    onClick={() => sendQuickCommand(command)}
                    className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-left text-xs text-zinc-300 ${btnFocus}`}
                  >
                    {command}
                  </button>
                ))}
              </div>
            </div>

            {commandHistory.length > 0 ? (
              <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <History size={14} aria-hidden />
                    Recent commands
                  </p>
                  <button
                    type="button"
                    className={`text-[10px] text-zinc-500 hover:text-zinc-300 ${btnFocus}`}
                    onClick={() => {
                      clearPersistedCommandChips();
                      setCommandHistory([]);
                    }}
                  >
                    Clear list
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {commandHistory.map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => sendQuickCommand(cmd)}
                      className={`max-w-full truncate rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-left text-[11px] text-zinc-300 ${btnFocus}`}
                      title={cmd}
                    >
                      {cmd.length > 42 ? `${cmd.slice(0, 40)}…` : cmd}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <section
            className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 text-sm text-zinc-300 shadow-xl shadow-black/20 backdrop-blur-sm"
            aria-label={`${activeTab} tab`}
          >
            {tabIntro ? (
              <div className="border-b border-white/5 pb-3">
                <h2 className="text-base font-semibold text-zinc-100">{tabIntro.title}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">{tabIntro.body}</p>
              </div>
            ) : null}
            {snapshot ? (
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/5 bg-zinc-950/30 p-2">
                  <dt className="text-zinc-500">Notes</dt>
                  <dd className="text-zinc-100">{snapshot.notes}</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-zinc-950/30 p-2">
                  <dt className="text-zinc-500">Queue items</dt>
                  <dd className="text-zinc-100">{snapshot.publishingQueue}</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-zinc-950/30 p-2">
                  <dt className="text-zinc-500">Outreach drafts</dt>
                  <dd className="text-zinc-100">{snapshot.outreachDrafts}</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-zinc-950/30 p-2">
                  <dt className="text-zinc-500">Opportunities</dt>
                  <dd className="text-zinc-100">{snapshot.opportunities}</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-zinc-950/30 p-2">
                  <dt className="text-zinc-500">Integrations</dt>
                  <dd className="text-zinc-100">{snapshot.integrationSources}</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-zinc-950/30 p-2">
                  <dt className="text-zinc-500">Connected providers</dt>
                  <dd className="text-zinc-100">{snapshot.syncProvidersConnected}</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-zinc-950/30 p-2">
                  <dt className="text-zinc-500">Cadence mode</dt>
                  <dd className="text-zinc-100">{snapshot.cadenceMode}</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-zinc-950/30 p-2">
                  <dt className="text-zinc-500">Workday window</dt>
                  <dd className="text-zinc-100">{snapshot.reminderWindow}</dd>
                </div>
              </dl>
            ) : null}

            {activeTab === 'daily' && snapshot ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Daily dashboard</p>
                  <p className="mt-1 text-zinc-400">
                    Incomplete follow-ups: {snapshot.incompleteFollowUps} · Queued publishing:{' '}
                    {snapshot.queuedPublishing} · Active opportunities: {snapshot.activeOpportunities}
                  </p>
                  <p className="mt-1 text-zinc-400">
                    Due today: {snapshot.dueTodayTasks} · Missed: {snapshot.missedTasks}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Profile focus</p>
                  <p className="mt-1 text-zinc-300">Operator: {snapshot.operatorName || 'Not set'}</p>
                  <p className="mt-1 text-zinc-300">Offer: {snapshot.primaryOffer || 'Not set'}</p>
                  <p className="mt-1 text-zinc-300">Focus metric: {snapshot.focusMetric || 'Not set'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void runCommand('create follow up: check warm lead status')}
                    className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-xs ${btnFocus}`}
                  >
                    Create follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => void runCommand('reschedule posts to friday 11am')}
                    className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-xs ${btnFocus}`}
                  >
                    Reschedule publishing
                  </button>
                  <button
                    type="button"
                    onClick={() => void runCommand('update opportunity to proposal')}
                    className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-xs ${btnFocus}`}
                  >
                    Advance opportunity
                  </button>
                </div>
              </div>
            ) : null}

            {activeTab === 'integrations' && snapshot ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Provider status</p>
                  <ul className="mt-2 space-y-1 text-zinc-300">
                    {snapshot.providerStatuses.map((provider) => (
                      <li key={provider.id}>
                        {provider.id}: <span className="text-zinc-100">{provider.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Recent sources</p>
                  {snapshot.recentIntegrationSources.length > 0 ? (
                    <ul className="mt-2 list-disc pl-4 text-zinc-300">
                      {snapshot.recentIntegrationSources.map((source) => (
                        <li key={source}>{source}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-zinc-500">No integration sources yet. Add one from Chat or below.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void runCommand('connect notion source: Growth workspace')}
                    className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-xs ${btnFocus}`}
                  >
                    Add Notion source
                  </button>
                  <button
                    type="button"
                    onClick={() => void runCommand('add source: webhook pipeline')}
                    className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-xs ${btnFocus}`}
                  >
                    Add webhook source
                  </button>
                </div>
              </div>
            ) : null}

            {activeTab === 'settings' && snapshot ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Session and history</p>
                  <p className="mt-1 text-zinc-500">
                    Chat is saved in this browser. Destructive commands use a confirmation dialog in Chat.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-xs ${btnFocus}`}
                      onClick={() => setPendingClearChat(true)}
                    >
                      Clear chat transcript
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Recent command activity</p>
                  {snapshot.recentAudit.length > 0 ? (
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-zinc-500">
                      {snapshot.recentAudit.map((line) => (
                        <li key={line.id} className="border-b border-zinc-800/80 pb-1">
                          <span className={line.ok ? 'text-emerald-400' : 'text-amber-400'}>
                            {line.ok ? 'ok' : 'no'}
                          </span>{' '}
                          <span className="text-zinc-300">{line.action}</span> — {line.summary}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-zinc-500">No audit entries yet — run a command in Chat.</p>
                  )}
                </div>
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Configuration controls</p>
                  <p className="mt-1 text-zinc-500">
                    Cadence mode: {snapshot.cadenceMode} · Workday: {snapshot.reminderWindow}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Current preset state</p>
                  <ul className="mt-2 space-y-1 text-zinc-300">
                    <li>
                      Visual mode: <span className="text-zinc-100">{snapshot.visualMode}</span>
                    </li>
                    <li>
                      Motion mode: <span className="text-zinc-100">{snapshot.motionMode}</span>
                    </li>
                    <li>
                      Ambient FX:{' '}
                      <span className="text-zinc-100">{snapshot.ambientFxEnabled ? 'enabled' : 'disabled'}</span>
                    </li>
                    <li>
                      Debug mode: <span className="text-zinc-100">{snapshot.debugMode ? 'enabled' : 'disabled'}</span>
                    </li>
                    <li>
                      Business weight: <span className="text-zinc-100">{snapshot.managerialWeight}%</span>
                    </li>
                    <li>
                      Max daily tasks: <span className="text-zinc-100">{snapshot.maxDailyTasks}</span>
                    </li>
                    <li>
                      Reminder lead: <span className="text-zinc-100">{snapshot.remindBeforeMinutes} min</span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Profile controls</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void runCommand(
                          'configure: operator name is "BrandOps Operator", primary offer is "Growth systems", focus metric is "Qualified conversations per week"'
                        )
                      }
                      className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-xs ${btnFocus}`}
                    >
                      Set profile baseline
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void runCommand(
                          'configure: operator name is "Founder", primary offer is "AI GTM consulting", focus metric is "Revenue pipeline created"'
                        )
                      }
                      className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-xs ${btnFocus}`}
                    >
                      Founder profile preset
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void runCommand('configure: cadence balanced, remind before 20 min')}
                    className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-xs ${btnFocus}`}
                  >
                    Balanced cadence
                  </button>
                  <button
                    type="button"
                    onClick={() => void runCommand('configure: workday 9 to 18, max tasks per lane 4')}
                    className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-xs ${btnFocus}`}
                  >
                    Set workday 9-18
                  </button>
                  <button
                    type="button"
                    onClick={() => void runCommand('configure: enable debug')}
                    className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-xs ${btnFocus}`}
                  >
                    Enable debug
                  </button>
                </div>
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Legacy config presets</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CONFIG_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => void runCommand(preset.command)}
                        className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-xs ${btnFocus}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Operational presets</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {OPERATIONAL_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => void runCommand(preset.command)}
                        className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-xs ${btnFocus}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        )}
      </main>

      {activeTab === 'chat' ? (
        <div className="fixed inset-x-0 bottom-16 z-20 mx-auto w-full max-w-md px-4">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/90 p-2 shadow-2xl shadow-black/30 backdrop-blur-md">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void submitMessage();
                }
              }}
              className="flex-1 bg-transparent px-2 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
              placeholder="Message BrandOps Agent…"
              aria-label="Chat command input"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => void submitMessage()}
              className={`rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-md disabled:opacity-50 ${btnFocus}`}
            >
              Send
            </button>
          </div>
        </div>
      ) : null}

      {pendingDestructive ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPendingDestructive(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogDestrId}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-2xl"
          >
            <h2 id={dialogDestrId} className="text-base font-semibold text-zinc-100">
              Archive workspace data?
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              This command can archive an opportunity or content. It cannot be undone from the chat UI.
            </p>
            <p className="mt-2 rounded-lg bg-zinc-950/80 p-2 font-mono text-xs text-zinc-300">{pendingDestructive}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={`rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-300 ${btnFocus}`}
                onClick={() => setPendingDestructive(null)}
              >
                Cancel
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className={`rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white ${btnFocus}`}
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPendingClearChat(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogClearId}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-2xl"
          >
            <h2 id={dialogClearId} className="text-base font-semibold text-zinc-100">
              Clear chat transcript?
            </h2>
            <p className="mt-2 text-sm text-zinc-400">This removes the on-device message history. Command chips are unchanged.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={`rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-300 ${btnFocus}`}
                onClick={() => setPendingClearChat(false)}
              >
                Cancel
              </button>
              <button
                ref={clearConfirmRef}
                type="button"
                className={`rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white ${btnFocus}`}
                onClick={() => {
                  setPendingClearChat(false);
                  setMessages([defaultWelcomeMessage()]);
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

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-white/5 bg-zinc-950/95 backdrop-blur-md"
        aria-label="Primary"
      >
        <ul className="mx-auto flex w-full max-w-md items-center justify-between px-2 py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-w-16 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[11px] ${btnFocus} ${
                    active ? 'text-indigo-400' : 'text-zinc-500'
                  }`}
                >
                  <Icon size={16} aria-hidden />
                  <span>{tab.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
