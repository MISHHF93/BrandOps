import { CockpitWorkstreamCommandStrip } from './CockpitWorkstreamCommandStrip';
import {
  hrefExtensionIntegrationsPage,
  hrefPrimaryAppIntegrationsTab
} from '../../shared/navigation/navigationIntents';
import type { CockpitConnectionsSectionProps } from './cockpitSectionTypes';

const CONNECTIONS_STRIP_ITEMS = [
  { kind: 'prime' as const, label: 'Connect Notion', phrase: 'connect notion source: Growth workspace' },
  { kind: 'prime' as const, label: 'Add source', phrase: 'add source: webhook pipeline' },
  { kind: 'prime' as const, label: 'Add SSH target', phrase: 'add ssh target: staging deploy host example.com' }
] as const;

const rowChip = (btnFocus: string) =>
  `rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-0.5 text-[10px] ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`;

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
    className="scroll-mt-28 rounded-xl border border-sky-500/15 bg-sky-950/10 p-3 text-xs"
    aria-labelledby="cockpit-connections"
  >
    <h3 id="cockpit-connections" className="text-sm font-semibold text-zinc-100">
      {meta.label}
    </h3>
    <p className="mt-0.5 text-[11px] text-zinc-500">{meta.description}</p>
    <p className="mt-2 text-[10px] text-zinc-600">
      Counts and provider status are <strong className="text-zinc-500">read-only</strong>. Use the Integrations tab or
      link below for OAuth and sources — not Settings for connection edits.
    </p>
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
      <a
        href={hrefPrimaryAppIntegrationsTab()}
        className={`font-medium text-indigo-300/90 underline underline-offset-2 ${btnFocus}`}
      >
        Integrations (in app)
      </a>
      <span className="text-zinc-600">·</span>
      <a
        href={hrefExtensionIntegrationsPage()}
        className={`font-medium text-sky-400/90 underline underline-offset-2 ${btnFocus}`}
      >
        Integrations hub
      </a>
      <span className="text-zinc-500">— OAuth, packaged options page.</span>
    </p>
    <CockpitWorkstreamCommandStrip
      ariaLabel="Connections workstream Chat starters"
      btnFocus={btnFocus}
      commandBusy={commandBusy}
      runCommand={runCommand}
      primeChat={primeChat}
      items={CONNECTIONS_STRIP_ITEMS}
    />
    <ul className="mt-2 space-y-1 text-zinc-300">
      <li>
        Artifacts: <span className="text-zinc-100">{snapshot.integrationArtifactCount}</span>
      </li>
      <li>
        SSH targets: <span className="text-zinc-100">{snapshot.sshTargetsCount}</span>
      </li>
    </ul>
    <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Sync providers</p>
    <ul className="mt-1 space-y-1 text-[11px] text-zinc-400">
      {snapshot.providerStatuses.map((p) => (
        <li key={p.id} className="flex justify-between gap-2">
          <span className="text-zinc-500">{p.id}</span>
          <span className="text-zinc-200">{p.status}</span>
        </li>
      ))}
    </ul>
    {snapshot.integrationArtifactsPeek.length > 0 ? (
      <div className="mt-3 border-t border-white/5 pt-3">
        <p className="text-[11px] font-medium text-zinc-400">Integration artifacts (top)</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">Read-only digest.</p>
        <ul className="mt-2 space-y-1.5 text-[11px] text-zinc-400">
          {snapshot.integrationArtifactsPeek.map((row) => (
            <li key={row.id} className="flex justify-between gap-2">
              <span className="truncate text-zinc-300">{row.title}</span>
              <span className="shrink-0 text-zinc-500">{row.artifactType}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
    {snapshot.sshTargetsPeek.length > 0 ? (
      <div className="mt-3 border-t border-white/5 pt-3">
        <p className="text-[11px] font-medium text-zinc-400">SSH targets (top)</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">Read-only digest.</p>
        <ul className="mt-2 space-y-1.5 text-[11px] text-zinc-400">
          {snapshot.sshTargetsPeek.map((row) => (
            <li key={row.id} className="flex justify-between gap-2">
              <span className="truncate text-zinc-300">{row.name}</span>
              <span className="shrink-0 font-mono text-[10px] text-zinc-500">{row.host}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
    {snapshot.cockpitCompanyPeek.length > 0 ? (
      <div className="mt-3 border-t border-white/5 pt-3">
        <p className="text-[11px] font-medium text-zinc-400">Companies (active)</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">Read-only peek. No add/update company commands in the agent yet.</p>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitCompanyPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-white/5 bg-zinc-950/35 px-2 py-2 text-[11px] text-zinc-300"
            >
              <p className="font-medium text-zinc-100">{row.name}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">
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
