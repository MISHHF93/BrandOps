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
import { MOBILE_BTN_FOCUS, MobileShellNav } from './mobileTabPrimitives';
import { mapDocumentSurfaceToAgentSource } from '../../shared/navigation/appDocumentSurface';
import type { AppDocumentSurfaceId } from '../../shared/navigation/appDocumentSurface';
import { openExtensionSurface } from '../../shared/navigation/openExtensionSurface';
import { MOBILE_SHELL_NAV_TABS } from './mobileTabConfig';
import { SHELL_SECTIONS_LINE } from './shellSectionCopy';
import { runSettingsConfigure } from './runSettingsConfigure';
import { applyDocumentThemeFromAppSettings } from '../../shared/ui/theme';

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

  /** Pulse jump bar: open Today with a specific Cockpit workstream (URL + scroll). */
  const openCockpitWorkstream = useCallback((id: DashboardSectionId) => {
    setActiveTab('daily');
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
    <div className="bo-mobile-app relative isolate min-h-[100dvh] min-h-screen">
      <a href="#bo-mobile-main" className="bo-mobile-skip">
        Skip to main content
      </a>
      <header className="bo-mobile-header sticky top-0 z-20">
        <div className="mx-auto flex max-w-md items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-micro uppercase tracking-[0.18em] text-textSoft">BrandOps</p>
            <h1 className="text-h1 text-text">Workspace</h1>
            <p className="text-[11px] text-textSoft">
              <span className="text-textMuted">
                {MOBILE_SHELL_NAV_TABS.find((t) => t.id === activeTab)?.label ?? activeTab}
              </span>
              <span className="text-textSoft"> · </span>
              {SHELL_SECTIONS_LINE}
            </p>
            {dataOpsHint ? (
              <p className="mt-1 text-[10px] text-info" role="status">
                {dataOpsHint}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => openExtensionSurface('help')}
            className={`bo-link bo-link--sm shrink-0 !normal-case ${btnFocus}`}
          >
            Help
          </button>
        </div>
      </header>

      <main
        id="bo-mobile-main"
        tabIndex={-1}
        className={`bo-mobile-main mx-auto w-full max-w-md pt-4 outline-none ${
          activeTab === 'chat'
            ? 'pb-[max(10.5rem,calc(9rem+env(safe-area-inset-bottom,0px)))]'
            : 'pb-[max(7.5rem,calc(6.25rem+env(safe-area-inset-bottom,0px)))]'
        }`}
      >
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
            className="bo-glass-panel rounded-2xl border border-border/60 p-4 text-sm text-textMuted shadow-panel"
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
                onOpenCockpitWorkstream={openCockpitWorkstream}
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
                onOpenTodayTab={() => commitTab('daily')}
              />
            ) : null}
          </section>
        )}
      </main>

      {activeTab === 'chat' ? (
        <div className="bo-mobile-main fixed inset-x-0 z-40 mx-auto w-full max-w-md px-0 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-bgElevated/95 p-2 shadow-panel backdrop-blur-md">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void submitMessage();
                }
              }}
              className="flex-1 bg-transparent px-2 py-2 text-sm text-text outline-none placeholder:text-textSoft"
              placeholder="Message the agent…"
              aria-label="Chat command input"
            />
            <button
              type="button"
              disabled={commandLoading}
              onClick={() => void submitMessage()}
              className={`rounded-xl border border-borderStrong/60 bg-surfaceActive px-3 py-2 text-xs font-semibold text-text shadow-sm disabled:opacity-50 ${btnFocus}`}
            >
              Send
            </button>
          </div>
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
              This command can archive an opportunity or content. It cannot be undone from the chat UI.
            </p>
            <p className="mt-2 rounded-lg border border-border/50 bg-bgSubtle/80 p-2 font-mono text-xs text-textMuted">
              {pendingDestructive}
            </p>
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
                className={`rounded-lg bg-warning px-3 py-2 text-sm font-semibold text-zinc-950 ${btnFocus}`}
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
            <p className="mt-2 text-sm text-textMuted">This removes the on-device message history. Command chips are unchanged.</p>
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
              Replaces all BrandOps workspace data on this device with the default seed. Chat transcript and command chips
              are not cleared — use Settings session actions if you want those gone.
            </p>
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
                className={`rounded-lg bg-warning px-3 py-2 text-sm font-semibold text-zinc-950 ${btnFocus}`}
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

      <MobileShellNav activeTab={activeTab} onSelect={commitTab} btnFocus={btnFocus} />
    </div>
  );
};
