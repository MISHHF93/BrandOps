import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, CalendarCheck2, PlugZap, Settings } from 'lucide-react';
import { executeAgentWorkspaceCommand } from '../../services/agent/agentWorkspaceEngine';
import { storageService } from '../../services/storage/storage';

type TabId = 'chat' | 'daily' | 'integrations' | 'settings';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const TABS: Array<{ id: TabId; label: string; icon: typeof MessageCircle }> = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'daily', label: 'Daily', icon: CalendarCheck2 },
  { id: 'integrations', label: 'Integrations', icon: PlugZap },
  { id: 'settings', label: 'Settings', icon: Settings }
];

const uid = () => `msg-${Math.random().toString(36).slice(2, 9)}`;

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

export const MobileApp = ({ initialTab = 'chat', surfaceLabel = 'chatbot' }: MobileAppProps) => {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: 'assistant',
      text:
        'BrandOps AI Agent is ready. Try: "add note: ...", "draft outreach: ...", "draft post: ...", "reschedule posts to friday 11am", or "update opportunity to proposal".'
    }
  ]);

  useEffect(() => {
    void (async () => {
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
        missedTasks: workspace.scheduler.tasks.filter((task) => task.status === 'missed').length
      });
    })();
  }, [messages.length]);

  const sendQuickCommand = (command: string) => {
    setInput(command);
    setActiveTab('chat');
  };

  const tabContent = useMemo(() => {
    if (activeTab === 'chat') return null;
    if (activeTab === 'daily') {
      return 'Daily briefing and execution controls for today.';
    }
    if (activeTab === 'integrations') {
      return 'Manage channels and provider connectivity from one chatbot-first integration panel.';
    }
    return 'Tune workspace behavior with configuration commands and live settings feedback.';
  }, [activeTab]);

  const submitMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { id: uid(), role: 'user', text: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const result = await executeAgentWorkspaceCommand({
        text: trimmed,
        actorName: 'mobile-operator',
        source: surfaceLabel === 'chatbot-web' ? 'chatbot-web' : 'chatbot-mobile'
      });
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', text: result.summary }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          text: error instanceof Error ? error.message : 'Unknown error while processing command.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">BrandOps Mobile</p>
        <h1 className="text-lg font-semibold">AI Agent Chatbot</h1>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
        {activeTab === 'chat' ? (
          <section className="space-y-3">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'ml-10 bg-blue-600 text-white'
                    : 'mr-10 border border-zinc-800 bg-zinc-900 text-zinc-100'
                }`}
              >
                {message.text}
              </article>
            ))}
            {loading ? (
              <p className="text-xs text-zinc-400">Agent is processing your command...</p>
            ) : null}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Quick commands</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_COMMANDS.map((command) => (
                  <button
                    key={command}
                    type="button"
                    onClick={() => sendQuickCommand(command)}
                    className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                  >
                    {command}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
            {tabContent}
            {snapshot ? (
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-zinc-800 p-2">
                  <dt className="text-zinc-500">Notes</dt>
                  <dd className="text-zinc-100">{snapshot.notes}</dd>
                </div>
                <div className="rounded-xl border border-zinc-800 p-2">
                  <dt className="text-zinc-500">Queue items</dt>
                  <dd className="text-zinc-100">{snapshot.publishingQueue}</dd>
                </div>
                <div className="rounded-xl border border-zinc-800 p-2">
                  <dt className="text-zinc-500">Outreach drafts</dt>
                  <dd className="text-zinc-100">{snapshot.outreachDrafts}</dd>
                </div>
                <div className="rounded-xl border border-zinc-800 p-2">
                  <dt className="text-zinc-500">Opportunities</dt>
                  <dd className="text-zinc-100">{snapshot.opportunities}</dd>
                </div>
                <div className="rounded-xl border border-zinc-800 p-2">
                  <dt className="text-zinc-500">Integrations</dt>
                  <dd className="text-zinc-100">{snapshot.integrationSources}</dd>
                </div>
                <div className="rounded-xl border border-zinc-800 p-2">
                  <dt className="text-zinc-500">Connected providers</dt>
                  <dd className="text-zinc-100">{snapshot.syncProvidersConnected}</dd>
                </div>
                <div className="rounded-xl border border-zinc-800 p-2">
                  <dt className="text-zinc-500">Cadence mode</dt>
                  <dd className="text-zinc-100">{snapshot.cadenceMode}</dd>
                </div>
                <div className="rounded-xl border border-zinc-800 p-2">
                  <dt className="text-zinc-500">Workday window</dt>
                  <dd className="text-zinc-100">{snapshot.reminderWindow}</dd>
                </div>
              </dl>
            ) : null}

            {activeTab === 'daily' && snapshot ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-zinc-800 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Daily dashboard</p>
                  <p className="mt-1 text-zinc-400">
                    Incomplete follow-ups: {snapshot.incompleteFollowUps} | Queued publishing:{' '}
                    {snapshot.queuedPublishing} | Active opportunities: {snapshot.activeOpportunities}
                  </p>
                  <p className="mt-1 text-zinc-400">
                    Due today: {snapshot.dueTodayTasks} | Missed: {snapshot.missedTasks}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Profile focus</p>
                  <p className="mt-1 text-zinc-300">Operator: {snapshot.operatorName || 'Not set'}</p>
                  <p className="mt-1 text-zinc-300">Offer: {snapshot.primaryOffer || 'Not set'}</p>
                  <p className="mt-1 text-zinc-300">Focus metric: {snapshot.focusMetric || 'Not set'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => sendQuickCommand('create follow up: check warm lead status')}
                    className="rounded-full border border-zinc-700 px-2 py-1 text-xs"
                  >
                    Create follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => sendQuickCommand('reschedule posts to friday 11am')}
                    className="rounded-full border border-zinc-700 px-2 py-1 text-xs"
                  >
                    Reschedule publishing
                  </button>
                  <button
                    type="button"
                    onClick={() => sendQuickCommand('update opportunity to proposal')}
                    className="rounded-full border border-zinc-700 px-2 py-1 text-xs"
                  >
                    Advance opportunity
                  </button>
                </div>
              </div>
            ) : null}

            {activeTab === 'integrations' && snapshot ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-zinc-800 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Provider status</p>
                  <ul className="mt-2 space-y-1 text-zinc-300">
                    {snapshot.providerStatuses.map((provider) => (
                      <li key={provider.id}>
                        {provider.id}: <span className="text-zinc-100">{provider.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-zinc-800 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Recent sources</p>
                  {snapshot.recentIntegrationSources.length > 0 ? (
                    <ul className="mt-2 list-disc pl-4 text-zinc-300">
                      {snapshot.recentIntegrationSources.map((source) => (
                        <li key={source}>{source}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-zinc-400">No integration sources yet.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => sendQuickCommand('connect notion source: Growth workspace')}
                    className="rounded-full border border-zinc-700 px-2 py-1 text-xs"
                  >
                    Add Notion source
                  </button>
                  <button
                    type="button"
                    onClick={() => sendQuickCommand('add source: webhook pipeline')}
                    className="rounded-full border border-zinc-700 px-2 py-1 text-xs"
                  >
                    Add webhook source
                  </button>
                </div>
              </div>
            ) : null}

            {activeTab === 'settings' && snapshot ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-zinc-800 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Configuration controls</p>
                  <p className="mt-1 text-zinc-400">
                    Cadence mode: {snapshot.cadenceMode} | Workday: {snapshot.reminderWindow}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Current preset state</p>
                  <ul className="mt-2 space-y-1 text-zinc-300">
                    <li>Visual mode: <span className="text-zinc-100">{snapshot.visualMode}</span></li>
                    <li>Motion mode: <span className="text-zinc-100">{snapshot.motionMode}</span></li>
                    <li>Ambient FX: <span className="text-zinc-100">{snapshot.ambientFxEnabled ? 'enabled' : 'disabled'}</span></li>
                    <li>Debug mode: <span className="text-zinc-100">{snapshot.debugMode ? 'enabled' : 'disabled'}</span></li>
                    <li>Business weight: <span className="text-zinc-100">{snapshot.managerialWeight}%</span></li>
                    <li>Max daily tasks: <span className="text-zinc-100">{snapshot.maxDailyTasks}</span></li>
                    <li>Reminder lead: <span className="text-zinc-100">{snapshot.remindBeforeMinutes} min</span></li>
                  </ul>
                </div>
                <div className="rounded-xl border border-zinc-800 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Profile controls</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        sendQuickCommand(
                          'configure: operator name is "BrandOps Operator", primary offer is "Growth systems", focus metric is "Qualified conversations per week"'
                        )
                      }
                      className="rounded-full border border-zinc-700 px-2 py-1 text-xs"
                    >
                      Set profile baseline
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        sendQuickCommand(
                          'configure: operator name is "Founder", primary offer is "AI GTM consulting", focus metric is "Revenue pipeline created"'
                        )
                      }
                      className="rounded-full border border-zinc-700 px-2 py-1 text-xs"
                    >
                      Founder profile preset
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => sendQuickCommand('configure: cadence balanced, remind before 20 min')}
                    className="rounded-full border border-zinc-700 px-2 py-1 text-xs"
                  >
                    Balanced cadence
                  </button>
                  <button
                    type="button"
                    onClick={() => sendQuickCommand('configure: workday 9 to 18, max tasks per lane 4')}
                    className="rounded-full border border-zinc-700 px-2 py-1 text-xs"
                  >
                    Set workday 9-18
                  </button>
                  <button
                    type="button"
                    onClick={() => sendQuickCommand('configure: enable debug')}
                    className="rounded-full border border-zinc-700 px-2 py-1 text-xs"
                  >
                    Enable debug
                  </button>
                </div>
                <div className="rounded-xl border border-zinc-800 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Legacy config presets</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CONFIG_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => sendQuickCommand(preset.command)}
                        className="rounded-full border border-zinc-700 px-2 py-1 text-xs"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800 p-3 text-xs">
                  <p className="font-semibold text-zinc-100">Operational presets</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {OPERATIONAL_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => sendQuickCommand(preset.command)}
                        className="rounded-full border border-zinc-700 px-2 py-1 text-xs"
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
        <div className="fixed inset-x-0 bottom-16 mx-auto w-full max-w-md px-4">
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void submitMessage();
                }
              }}
              className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-zinc-500"
              placeholder="Message BrandOps Agent..."
              aria-label="Chat command input"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => void submitMessage()}
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950">
        <ul className="mx-auto flex w-full max-w-md items-center justify-between px-2 py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-w-16 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[11px] ${
                    active ? 'text-blue-400' : 'text-zinc-400'
                  }`}
                >
                  <Icon size={16} />
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
