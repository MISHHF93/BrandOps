import clsx from 'clsx';
import { useMemo, useState } from 'react';
import {
  BRANDOPS_CONNECTOR_LIBRARY,
  CONNECTOR_FAMILY_OPTIONS,
  filterConnectorLibrary,
  type ConnectorDefinition,
  type ConnectorState
} from './connectorCatalog';

function connectorStatusTone(status: ConnectorDefinition['status']) {
  switch (status) {
    case 'CONNECTED':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
    case 'AUTH_EXPIRED':
    case 'MISCONFIGURED':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
    case 'AVAILABLE':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-200';
    case 'NOT_CONNECTED':
      return 'border-border/40 bg-surface/50 text-textMuted';
    default:
      return 'border-border/40 bg-surface/45 text-textSoft';
  }
}

const STATUS_FILTERS = ['all', 'AVAILABLE', 'CONNECTED', 'MISCONFIGURED', 'NOT_CONNECTED', 'PLANNED'] as const;

export function ConnectorLibraryPanel({
  connectors = BRANDOPS_CONNECTOR_LIBRARY
}: {
  connectors?: readonly ConnectorDefinition[];
}) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<(typeof CONNECTOR_FAMILY_OPTIONS)[number]>('all');
  const [status, setStatus] = useState<'all' | ConnectorState | 'PLANNED'>('all');

  const visibleConnectors = useMemo(
    () => filterConnectorLibrary(connectors, query, family, status),
    [connectors, query, family, status]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-label font-medium text-text">Connector library</p>
          <p className="text-fine text-textMuted">GLANCE → INSPECT → ACT</p>
        </div>
        <span className="rounded-full border border-border/40 bg-surface/45 px-2 py-1 text-fine text-textMuted">
          {visibleConnectors.length} records
        </span>
      </div>

      <div className="border-y border-border/30 py-2 text-fine text-textMuted">
        Provider status reflects verified runtime support. Planned entries are not connectable yet.
      </div>

      <div className="space-y-2">
        <label htmlFor="connector-library-search" className="sr-only">
          Search connectors and capabilities
        </label>
        <input
          id="connector-library-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search connectors or capabilities"
          className="w-full rounded-lg border border-border/40 bg-bg/40 px-2.5 py-2 text-meta text-text placeholder:text-textMuted"
        />

        <div className="flex flex-wrap gap-1.5">
          {CONNECTOR_FAMILY_OPTIONS.map((filterName) => (
            <button
              key={filterName}
              type="button"
              onClick={() => setFamily(filterName)}
              className={clsx(
                'rounded-full border px-2 py-1 text-fine uppercase tracking-wide',
                family === filterName
                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                  : 'border-border/40 bg-surface/45 text-textMuted'
              )}
            >
              {filterName}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((filterName) => (
            <button
              key={filterName}
              type="button"
              onClick={() => setStatus(filterName)}
              className={clsx(
                'rounded-full border px-2 py-1 text-fine uppercase tracking-wide',
                status === filterName
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-border/40 bg-surface/45 text-textMuted'
              )}
            >
              {filterName}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {visibleConnectors.map((connector) => (
          <article
            key={connector.id}
            className="rounded-xl border border-border/30 bg-surface/45 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-label font-medium text-text">{connector.name}</p>
                <p className="text-fine text-textMuted">{connector.provider}</p>
              </div>
              <span className={clsx('rounded-full border px-2 py-0.5 text-overline uppercase', connectorStatusTone(connector.status))}>
                {connector.status}
              </span>
            </div>

            <p className="mt-2 text-meta leading-relaxed text-textMuted">{connector.description}</p>

            <div className="mt-3 flex flex-wrap gap-1">
              {connector.capabilities.slice(0, 3).map((capability) => (
                <span
                  key={`${connector.id}-${capability.id}`}
                  className="rounded-md border border-border/30 bg-bg/40 px-1.5 py-0.5 text-fine text-textSoft"
                >
                  {capability.id}
                </span>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 text-fine text-textMuted">
              <span>{connector.maturity}</span>
              <span>{connector.riskLevel}</span>
            </div>
          </article>
        ))}
      </div>

      {visibleConnectors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 bg-surface/35 p-3 text-meta text-textMuted">
          No connectors match this search or filter combination.
        </div>
      ) : null}
    </div>
  );
}
