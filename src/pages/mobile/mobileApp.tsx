import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Bolt, PlugZap, Settings } from 'lucide-react';
import { executeAgentWorkspaceCommand } from '../../services/agent/agentWorkspaceEngine';
import { storageService } from '../../services/storage/storage';

type TabId = 'chat' | 'automations' | 'integrations' | 'settings';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const TABS: Array<{ id: TabId; label: string; icon: typeof MessageCircle }> = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'automations', label: 'Automations', icon: Bolt },
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
  'configure: cadence balanced, remind before 20 min'
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
        reminderWindow: `${workspace.settings.notificationCenter.workdayStartHour}:00-${workspace.settings.notificationCenter.workdayEndHour}:00`
      });
    })();
  }, [messages.length]);

  const tabContent = useMemo(() => {
    if (activeTab === 'chat') return null;
    if (activeTab === 'automations') {
      return 'Automations will orchestrate campaigns, follow-ups, and scheduler actions from chat commands.';
    }
    if (activeTab === 'integrations') {
      return 'Integrations will manage WhatsApp, Telegram, LinkedIn, and bridge configuration.';
    }
    return 'Settings hosts account controls, notification preferences, governance rules, and migration toggles.';
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
                    onClick={() => setInput(command)}
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
