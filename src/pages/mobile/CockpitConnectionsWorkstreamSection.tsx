import { PlugZap } from 'lucide-react';
import { CockpitWorkstreamCommandStrip } from './CockpitWorkstreamCommandStrip';
import {
  hrefExtensionIntegrationsPage,
  hrefPrimaryAppIntegrationsTab
} from '../../shared/navigation/navigationIntents';
import type { CockpitConnectionsSectionProps } from './cockpitSectionTypes';

const CONNECTIONS_STRIP_ITEMS = [
  {
    kind: 'prime' as const,
    label: 'Connect Notion',
    phrase: 'connect notion source: Growth workspace'
  },
  { kind: 'prime' as const, label: 'Add source', phrase: 'add source: webhook pipeline' },
  {
    kind: 'prime' as const,
    label: 'Add SSH target',
    phrase: 'add ssh target: staging deploy host example.com'
  }
] as const;

const rowChip = (btnFocus: string) =>
  `rounded-full border border-borderStrong/50 bg-surface/70 px-2 py-0.5 text-[10px] text-text ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`;

/**
 * `id="cockpit-connections"` must stay stable for `?section=connections` and scroll targets.
 */
export const CockpitConnectionsWorkstreamSection = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  primeChat,
  meta
}: CockpitConnectionsSectionProps) => (
  <section
    className="scroll-mt-28 rounded-xl border border-info/25 bg-info/5 p-3 text-xs"
    aria-labelledby="cockpit-connections"
  >
    <div className="flex items-center justify-between gap-2">
      <h3
        id="cockpit-connections"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-text"
      >
        <PlugZap className="h-4 w-4 shrink-0 text-info" strokeWidth={2.25} aria-hidden />
        {meta.label}
      </h3>
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <a
          href={hrefPrimaryAppIntegrationsTab()}
          className={`rounded-full border border-info/40 bg-surface/70 px-2 py-0.5 text-[10px] font-medium text-info ${btnFocus}`}
          title="Open Integrations tab"
        >
          Integrations
        </a>
        <a
          href={hrefExtensionIntegrationsPage()}
          className={`rounded-full border border-borderStrong/50 bg-surface/70 px-2 py-0.5 text-[10px] font-medium text-textMuted ${btnFocus}`}
          title="Open full Integrations page"
        >
          Page
        </a>
      </span>
    </div>
    <span className="sr-only">
      {meta.description} Counts and provider status are read-only. Use Integrations for connection
      changes.
    </span>
    <CockpitWorkstreamCommandStrip
      ariaLabel="Connections workstream Chat starters"
      btnFocus={btnFocus}
      commandBusy={commandBusy}
      runCommand={runCommand}
      primeChat={primeChat}
      items={CONNECTIONS_STRIP_ITEMS}
    />
    <ul className="mt-2 space-y-1 text-textMuted">
      <li>
        Artifacts: <span className="text-text">{snapshot.integrationArtifactCount}</span>
      </li>
      <li>
        SSH targets: <span className="text-text">{snapshot.sshTargetsCount}</span>
      </li>
    </ul>
    <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-textMuted">
      Sync providers
    </p>
    <ul className="mt-1 space-y-1 text-[11px] text-textSoft">
      {snapshot.providerStatuses.map((p) => (
        <li key={p.id} className="flex justify-between gap-2">
          <span className="text-textMuted">{p.id}</span>
          <span className="text-text">{p.status}</span>
        </li>
      ))}
    </ul>
    {snapshot.integrationArtifactsPeek.length > 0 ? (
      <div className="mt-3 border-t border-border/25 pt-3">
        <p className="text-[11px] font-medium text-textSoft">Integration artifacts (top)</p>
        <ul className="mt-2 space-y-1.5 text-[11px] text-textSoft">
          {snapshot.integrationArtifactsPeek.map((row) => (
            <li key={row.id} className="flex justify-between gap-2">
              <span className="truncate text-textMuted">{row.title}</span>
              <span className="shrink-0 text-textSoft">{row.artifactType}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
    {snapshot.sshTargetsPeek.length > 0 ? (
      <div className="mt-3 border-t border-border/25 pt-3">
        <p className="text-[11px] font-medium text-textSoft">SSH targets (top)</p>
        <ul className="mt-2 space-y-1.5 text-[11px] text-textSoft">
          {snapshot.sshTargetsPeek.map((row) => (
            <li key={row.id} className="flex justify-between gap-2">
              <span className="truncate text-textMuted">{row.name}</span>
              <span className="shrink-0 font-mono text-[10px] text-textMuted">{row.host}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
    {snapshot.cockpitCompanyPeek.length > 0 ? (
      <div className="mt-3 border-t border-border/25 pt-3">
        <p className="text-[11px] font-medium text-textSoft">Companies (active)</p>
        <span className="sr-only">
          Read-only peek. No add/update company commands in the agent yet.
        </span>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitCompanyPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border/30 bg-surface/50 px-2 py-2 text-[11px] text-textMuted"
            >
              <p className="font-medium text-text">{row.name}</p>
              <p className="mt-0.5 text-[10px] text-textMuted">
                {row.status}
                {row.nextAction ? ` · ${row.nextAction}` : ''}
              </p>
              <button
                type="button"
                disabled={commandBusy}
                onClick={() => primeChat(`add note: company ${row.name} — ${row.nextAction}`)}
                className={`mt-2 ${rowChip(btnFocus)}`}
              >
                Open in Chat (company note)
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
  </section>
);
