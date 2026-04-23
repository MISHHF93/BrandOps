import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { executeAgentWorkspaceCommand, type AgentWorkspaceResult } from '../../services/agent/agentWorkspaceEngine';
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
import { mapDocumentSurfaceToAgentSource } from '../../shared/navigation/appDocumentSurface';
import type { AppDocumentSurfaceId } from '../../shared/navigation/appDocumentSurface';
import { openExtensionSurface } from '../../shared/navigation/openExtensionSurface';
import { MOBILE_SHELL_NAV_TABS } from './mobileTabConfig';
import { SHELL_SECTIONS_LINE } from './shellSectionCopy';
import { runSettingsConfigure } from './runSettingsConfigure';
import { applyDocumentThemeFromAppSettings } from '../../shared/ui/theme';

const uid = () => `msg-${Math.random().toString(36).slice(2, 9)}`;

const btnFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950';

interface MobileAppProps {
  initialTab?: MobileShellTabId;
  /** Host HTML document: `mobile` for `mobile.html`; `renderChatbotSurface` passes welcome | dashboard | integrations (`help.html` is the Knowledge Center entry, not this shell). */
  surfaceLabel?: AppDocumentSurfaceId | 'chatbot';
}

const CHAT_THREAD_KEY = 'brandops:agent:chatThread';
const COMMAND_CHIPS_KEY = 'brandops:agent:commandChips';
const MAX_PERSISTED_MESSAGES = 50;
const MAX_COMMAND_CHIPS = 24;

const defaultWelcomeMessage = (surface: AppDocumentSurfaceId | 'chatbot' = 'mobile'): ChatMessage => {
  const base =
    'Use the bottom tabs: Chat (commands), Today (cockpit digest), Integrations (sources), Settings (workspace prefs). Expand Command starters for one-tap examples.';
  const welcomeFirstRun =
    'You opened on Today first — scan pipeline, brand, and connections. Switch to Chat to run commands (try pipeline health) or expand Command starters. Help in the header opens the full manual.';
  return {
    id: uid(),
    role: 'assistant',
    resultKind: 'plain',
    text:
      surface === 'welcome'
        ? `Welcome — ${welcomeFirstRun} ${base}`
        : `Agent ready — ${base}`
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

  const [initialShell] = useState(() => readInitialShellState(initialTab));
  const [activeTab, setActiveTab] = useState<MobileShellTabId>(() => initialShell.tab);
  const [cockpitWorkstream, setCockpitWorkstream] = useState<DashboardSectionId>(() => initialShell.workstream);
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
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const persisted = readChatThread();
    if (persisted && persisted.length > 0) return persisted;
    return [defaultWelcomeMessage(surfaceLabel)];
  });

  const refreshWorkspaceSnapshot = useCallback(async () => {
    try {
      const workspace = await storageService.getData();
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
      const p = parseMobileShellFromSearchParams(new URLSearchParams(window.location.search), initialTab);
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
    const t = window.setTimeout(() => setDataOpsHint(null), 4000);
    return () => window.clearTimeout(t);
  }, [dataOpsHint]);

  const executeCommandFlow = async (trimmed: string) => {
    if (!trimmed || commandLoading) return;
    setMessages((prev) => [...prev, { id: uid(), role: 'user', text: trimmed }]);
    setCommandLoading(true);
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
      setCommandLoading(false);
    }
  };

  const startSend = (trimmed: string) => {
    if (!trimmed || commandLoading) return;
    if (needsDestructiveConfirm(trimmed)) {
      setPendingDestructive(trimmed);
      return;
    }
    void executeCommandFlow(trimmed);
  };

  /** Switches to Chat and runs the command immediately (same engine as Send). */
  const sendQuickCommand = (command: string) => {
    const trimmed = command.trim();
    if (!trimmed || commandLoading) return;
    commitTab('chat');
    setInput('');
    queueMicrotask(() => {
      startSend(trimmed);
    });
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
    const trimmed = input.trim();
    if (!trimmed || commandLoading) return;
    setInput('');
    startSend(trimmed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900/80 to-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-gradient-to-r from-indigo-950/40 via-zinc-950/90 to-zinc-950/95 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">BrandOps Mobile</p>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-50">AI Agent</h1>
            <p className="text-[11px] text-zinc-500">
              <span className="text-zinc-400">
                {MOBILE_SHELL_NAV_TABS.find((t) => t.id === activeTab)?.label ?? activeTab} tab
              </span>
              {' · '}
              {SHELL_SECTIONS_LINE}
            </p>
            {dataOpsHint ? (
              <p className="mt-1 text-[10px] text-indigo-300/90" role="status">
                {dataOpsHint}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => openExtensionSurface('help')}
            className={`shrink-0 rounded-lg border border-white/10 bg-zinc-900/60 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:border-white/20 hover:bg-zinc-900/80 ${btnFocus}`}
          >
            Help
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-32 pt-4">
        {activeTab === 'chat' ? (
          <section className="space-y-3" aria-label="Chat conversation">
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
              shellDigest={{
                notes: snapshot.notes,
                publishingQueue: snapshot.publishingQueue,
                activeOpportunities: snapshot.activeOpportunities,
                weightedPipelineUsd: snapshot.pipelineProjection.weightedOpenValueUsd,
                pipelineOpenDeals: snapshot.pipelineProjection.activeDealCount
              }}
              onNavigateTab={commitTab}
            />
          </section>
        ) : (
          <section
            className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 text-sm text-zinc-300 shadow-xl shadow-black/20 backdrop-blur-sm"
            aria-label={`${activeTab} tab`}
          >
            {activeTab === 'pulse' ? (
              <PulseTimelineView
                snapshot={snapshot}
                btnFocus={btnFocus}
                commandBusy={commandLoading}
                runCommand={runCommand}
                primeChat={primeChat}
                onNavigateTab={commitTab}
              />
            ) : null}

            {activeTab === 'daily' ? (
              <CockpitDailyView
                snapshot={snapshot}
                btnFocus={btnFocus}
                commandBusy={commandLoading}
                runCommand={runCommand}
                goToChat={() => commitTab('chat')}
                primeChat={primeChat}
                onOpenInAppSettings={() => commitTab('settings')}
                activeWorkstream={cockpitWorkstream}
                onSelectWorkstream={handleSelectWorkstream}
              />
            ) : null}

            {activeTab === 'integrations' ? (
              <MobileIntegrationsView
                snapshot={snapshot}
                btnFocus={btnFocus}
                commandBusy={commandLoading}
                runCommand={runCommand}
                documentSurface={surfaceLabel}
              />
            ) : null}

            {activeTab === 'settings' ? (
              <MobileSettingsView
                snapshot={snapshot}
                btnFocus={btnFocus}
                runCommand={runCommand}
                applySettingsConfigure={applySettingsConfigure}
                applyBusy={settingsApplyLoading}
                commandBusy={commandLoading}
                onRequestClearChat={() => setPendingClearChat(true)}
                onExportWorkspace={exportWorkspace}
                onImportWorkspace={importWorkspace}
                onRequestResetWorkspace={() => setPendingResetWorkspace(true)}
                documentSurface={surfaceLabel}
              />
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
              disabled={commandLoading}
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPendingResetWorkspace(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogResetId}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-2xl"
          >
            <h2 id={dialogResetId} className="text-base font-semibold text-zinc-100">
              Reset workspace to seed data?
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Replaces all BrandOps workspace data on this device with the default seed. Chat transcript and command chips
              are not cleared — use Settings session actions if you want those gone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={`rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-300 ${btnFocus}`}
                onClick={() => setPendingResetWorkspace(false)}
              >
                Cancel
              </button>
              <button
                ref={resetConfirmRef}
                type="button"
                className={`rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white ${btnFocus}`}
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

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-white/5 bg-zinc-950/95 backdrop-blur-md"
        aria-label="Primary"
      >
        <ul className="mx-auto flex w-full max-w-md items-center justify-between gap-0.5 px-1 py-2">
          {MOBILE_SHELL_NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => commitTab(tab.id)}
                  className={`flex min-w-[3.25rem] flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] sm:min-w-14 sm:text-[11px] ${btnFocus} ${
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
