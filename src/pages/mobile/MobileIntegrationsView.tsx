import { PlugZap } from 'lucide-react';
import type { AppDocumentSurfaceId } from '../../shared/navigation/appDocumentSurface';
import { hrefExtensionIntegrationsPage } from '../../shared/navigation/navigationIntents';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import { MobileTabPageHeader, MobileTabSection, mobileChipClass } from './mobileTabPrimitives';
import { ShellSectionCallout } from './ShellSectionCallout';

/**
 * Integrations-only: provider health and command shortcuts. No Cockpit/Settings duplicates; no “recent” audit list.
 * Matches the in-tab density of {@link MobileSettingsView}.
 */
export const MobileIntegrationsView = ({
  snapshot,
  btnFocus,
  runCommand,
  documentSurface = 'mobile'
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  runCommand: (command: string) => void | Promise<void>;
  documentSurface?: AppDocumentSurfaceId | 'chatbot';
}) => {
  return (
    <div className="mt-2 space-y-5" aria-label="Integrations">
      <MobileTabPageHeader
        title="Integrations"
        subtitle="Sources, OAuth, artifacts, and SSH — pipeline metrics live on Today"
        icon={PlugZap}
        iconWrapperClassName="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-950/30"
        iconClassName="text-sky-300"
      />

      <ShellSectionCallout tab="integrations" className="mt-3" />

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-white/5 bg-zinc-950/30 p-2.5">
          <dt className="text-zinc-500">Sources</dt>
          <dd className="text-sm font-medium text-zinc-100">{snapshot.integrationSources}</dd>
        </div>
        <div className="rounded-xl border border-white/5 bg-zinc-950/30 p-2.5">
          <dt className="text-zinc-500">Connections</dt>
          <dd className="text-sm font-medium text-zinc-100">{snapshot.syncProvidersConnected}</dd>
        </div>
      </dl>

      {documentSurface !== 'integrations' ? (
        <p className="text-[11px] text-zinc-500">
          <a
            href={hrefExtensionIntegrationsPage()}
            className={`font-medium text-sky-400/90 underline underline-offset-2 ${btnFocus}`}
          >
            Open packaged integrations page
          </a>{' '}
          <span className="text-zinc-500">for the same shell in the extension options UI.</span>
        </p>
      ) : null}

      <MobileTabSection
        id="integrations-registered-sources"
        title="Registered sources"
        description="From your workspace hub; use Quick add or Chat for new connections."
      >
        {snapshot.integrationHubSources.length === 0 ? (
          <div className="mt-2 space-y-2 text-[11px] text-zinc-500">
            <p>No sources in this workspace yet.</p>
            <p>
              Use <strong className="text-zinc-400">Quick add</strong> below, or in{' '}
              <strong className="text-zinc-400">Chat</strong> try something like{' '}
              <code className="rounded bg-zinc-900/80 px-1 text-[10px] text-zinc-300">
                connect notion source: Growth workspace
              </code>
              .
            </p>
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {snapshot.integrationHubSources.slice(0, 20).map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-1.5 rounded-lg border border-white/5 bg-zinc-950/30 px-2 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-zinc-100">{row.name}</p>
                  <p className="text-[10px] text-zinc-500">
                    {row.kind} · <span className="text-zinc-400">{row.status}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void runCommand(`add note: check integration source ${row.name}`)}
                  className={mobileChipClass(btnFocus)}
                >
                  Log note in Chat
                </button>
              </li>
            ))}
          </ul>
        )}
        {snapshot.integrationHubSources.length > 20 ? (
          <p className="mt-2 text-[10px] text-zinc-500">
            Showing 20 of {snapshot.integrationSources}. More in Chat.
          </p>
        ) : null}
      </MobileTabSection>

      <MobileTabSection
        id="integrations-providers"
        title="Provider status"
        description="OAuth and sync; detailed tuning in Chat if you need a specific provider."
      >
        <ul className="mt-2 space-y-1.5 text-zinc-300">
          {snapshot.providerStatuses.map((provider) => (
            <li key={provider.id} className="flex justify-between gap-2 text-[11px]">
              <span className="text-zinc-400">{provider.id}</span>
              <span className="text-zinc-100">{provider.status}</span>
            </li>
          ))}
        </ul>
      </MobileTabSection>

      <MobileTabSection
        id="integrations-artifacts"
        title="Synced artifacts"
        description="Registered integration artifacts; add more from Chat with add artifact or add integration artifact."
      >
        {snapshot.integrationArtifactsPeek.length === 0 ? (
          <p className="mt-2 text-[11px] text-zinc-500">No artifacts yet. Total: {snapshot.integrationArtifactCount}.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {snapshot.integrationArtifactsPeek.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-white/5 bg-zinc-950/30 px-2 py-2 text-[11px] text-zinc-300"
              >
                <p className="font-medium text-zinc-100">{row.title}</p>
                <p className="text-[10px] text-zinc-500">{row.artifactType}</p>
                <button
                  type="button"
                  onClick={() =>
                    void runCommand(`add note: review artifact ${row.title.replace(/"/g, "'")}`)
                  }
                  className={`mt-2 ${mobileChipClass(btnFocus)}`}
                >
                  Log note in Chat
                </button>
              </li>
            ))}
          </ul>
        )}
      </MobileTabSection>

      <MobileTabSection
        id="integrations-ssh"
        title="SSH targets"
        description="Infrastructure nodes in the hub; register new targets from Chat."
      >
        {snapshot.sshTargetsPeek.length === 0 ? (
          <p className="mt-2 text-[11px] text-zinc-500">No SSH targets. Total: {snapshot.sshTargetsCount}.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {snapshot.sshTargetsPeek.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-white/5 bg-zinc-950/30 px-2 py-2 text-[11px] text-zinc-300"
              >
                <p className="font-medium text-zinc-100">{row.name}</p>
                <p className="text-[10px] text-zinc-500">{row.host}</p>
                <button
                  type="button"
                  onClick={() =>
                    void runCommand(`add note: SSH target ${row.name} (${row.host})`)
                  }
                  className={`mt-2 ${mobileChipClass(btnFocus)}`}
                >
                  Log note in Chat
                </button>
              </li>
            ))}
          </ul>
        )}
      </MobileTabSection>

      <MobileTabSection
        id="integrations-quick-add"
        title="Quick add"
        description="Sends a command like Chat — use Chat for ad-hoc phrasing."
      >
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => void runCommand('connect notion source: Growth workspace')}
            className={mobileChipClass(btnFocus)}
          >
            Add connection
          </button>
          <button
            type="button"
            onClick={() => void runCommand('add source: webhook pipeline')}
            className={mobileChipClass(btnFocus)}
          >
            Add contact source
          </button>
          <button
            type="button"
            onClick={() => void runCommand('add integration artifact: weekly metrics rollup')}
            className={mobileChipClass(btnFocus)}
          >
            Add artifact stub
          </button>
          <button
            type="button"
            onClick={() =>
              void runCommand('add ssh: name: staging host: staging.internal port: 22 user: deploy')
            }
            className={mobileChipClass(btnFocus)}
          >
            Add SSH stub
          </button>
        </div>
      </MobileTabSection>
    </div>
  );
};
