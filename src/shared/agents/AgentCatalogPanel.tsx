import {
  BRANDOPS_AGENT_CATALOG,
  BRANDOPS_SYSTEM_AGENT_CATALOG,
  DEFAULT_BRANDOPS_MODEL_ROUTER,
  modelIdForAgent
} from './agentCatalog';

export function AgentCatalogPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-label font-medium text-text">Capability agents</p>
          <p className="text-fine text-textMuted">One BrandOps experience, specialist routing underneath</p>
        </div>
        <span className="rounded-full border border-border/40 bg-surface/45 px-2 py-1 text-fine text-textMuted">
          {BRANDOPS_AGENT_CATALOG.length} active roles
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {BRANDOPS_AGENT_CATALOG.map((agent) => (
          <article key={agent.id} className="rounded-xl border border-border/30 bg-surface/45 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-label font-medium text-text">{agent.name}</p>
                <p className="mt-0.5 text-fine text-textMuted">{agent.capabilities.join(' · ')}</p>
              </div>
              <span className="shrink-0 rounded-md border border-info/30 bg-info/10 px-1.5 py-0.5 text-fine text-info">
                {modelIdForAgent(agent.id, DEFAULT_BRANDOPS_MODEL_ROUTER)}
              </span>
            </div>
            <p className="mt-2 text-meta leading-relaxed text-textMuted">{agent.description}</p>
            <p className="mt-2 text-fine text-textSoft">Connectors: {agent.connectorFamilies.join(', ')}</p>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-border/30 bg-bg/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-label font-medium text-text">System control plane</p>
          <span className="text-fine text-textMuted">{BRANDOPS_SYSTEM_AGENT_CATALOG.length} internal roles</span>
        </div>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {BRANDOPS_SYSTEM_AGENT_CATALOG.map((agent) => (
            <div key={agent.id} className="border-l border-info/40 pl-2 text-fine">
              <span className="font-medium text-textSoft">{agent.name}</span>
              <span className="text-textMuted">: {agent.responsibility}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}