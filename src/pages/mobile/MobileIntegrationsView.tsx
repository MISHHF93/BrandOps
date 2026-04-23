import { PlugZap } from 'lucide-react';
import type { AppDocumentSurfaceId } from '../../shared/navigation/appDocumentSurface';
import { hrefExtensionIntegrationsPage } from '../../shared/navigation/navigationIntents';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import { MobileTabPageHeader, MobileTabSection, mobileChipClass } from './mobileTabPrimitives';
import { ShellSectionCallout } from './ShellSectionCallout';

const chipDisabled = 'disabled:cursor-not-allowed disabled:opacity-50';

export interface MobileIntegrationsViewProps {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  /** True while an agent command round-trip is in flight (disables command chips). */
  commandBusy?: boolean;
  runCommand: (command: string) => void | Promise<void>;
  documentSurface?: AppDocumentSurfaceId | 'chatbot';
}

/**
 * Integrations-only: provider health and command shortcuts. No Cockpit/Settings duplicates; no “recent” audit list.
 * Matches the in-tab density of {@link MobileSettingsView}.
 */
export const MobileIntegrationsView = ({
  snapshot,
  btnFocus,
  commandBusy = false,
  runCommand,
  documentSurface = 'mobile'
}: MobileIntegrationsViewProps) => {
  return (
    <div className="mt-2 space-y-5" aria-label="Integrations">
      <MobileTabPageHeader
        title="Integrations"
        subtitle="Connect tools and data — sources, sync, and provider health. Account and workspace rules live in Settings."
        icon={PlugZap}
        iconWrapperClassName="flex h-9 w-9 items-center justify-center rounded-lg border border-secondary/40 bg-secondarySoft/10"
        iconClassName="text-secondary"
      />

      <ShellSectionCallout tab="integrations" className="mt-3" />

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-border/50 bg-bgSubtle/40 p-2.5">
          <dt className="text-textSoft">Sources</dt>
          <dd className="text-sm font-medium text-text">{snapshot.integrationSources}</dd>
        </div>
        <div className="rounded-xl border border-border/50 bg-bgSubtle/40 p-2.5">
          <dt className="text-textSoft">Connections</dt>
          <dd className="text-sm font-medium text-text">{snapshot.syncProvidersConnected}</dd>
        </div>
      </dl>

      {documentSurface !== 'integrations' ? (
        <details className="rounded-lg border border-border/40 bg-bgSubtle/30 px-2.5 py-2 text-[11px] text-textMuted">
          <summary
            className={`cursor-pointer list-none text-textSoft [&::-webkit-details-marker]:hidden ${btnFocus}`}
          >
            <span className="font-medium text-text">Extension options (Chrome)</span>
          </summary>
          <p className="mt-1.5 leading-snug">
            <a
              href={hrefExtensionIntegrationsPage()}
              className={`font-medium text-info underline underline-offset-2 ${btnFocus}`}
            >
              Open integrations page
            </a>
            <span className="text-textMuted">
              {' '}
              — same shell; opens the packaged extension page.
            </span>
          </p>
        </details>
      ) : null}

      <MobileTabSection
        id="integrations-registered-sources"
        title="Registered sources"
        description="Connected sources from your workspace hub."
      >
        {snapshot.integrationHubSources.length === 0 ? (
          <p className="mt-2 text-[11px] text-textMuted">
            No sources yet. Use Quick add below or Chat for custom{' '}
            <code className="text-[10px]">connect</code> /{' '}
            <code className="text-[10px]">add source</code> lines.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {snapshot.integrationHubSources.slice(0, 20).map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-1.5 rounded-lg border border-border/30 bg-surface/45 px-2 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-text">{row.name}</p>
                  <p className="text-[10px] text-textMuted">
                    {row.kind} · <span className="text-textSoft">{row.status}</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => void runCommand(`add note: check integration source ${row.name}`)}
                  className={`${mobileChipClass(btnFocus)} ${chipDisabled}`}
                >
                  Open in Chat
                </button>
              </li>
            ))}
          </ul>
        )}
        {snapshot.integrationHubSources.length > 20 ? (
          <p className="mt-2 text-[10px] text-textMuted">
            Showing 20 of {snapshot.integrationSources}. More in Chat.
          </p>
        ) : null}
      </MobileTabSection>

      <MobileTabSection
        id="integrations-providers"
        title="Provider status"
        description="OAuth and sync health for each provider."
      >
        <ul className="mt-2 space-y-1.5 text-textMuted">
          {snapshot.providerStatuses.map((provider) => (
            <li key={provider.id} className="flex justify-between gap-2 text-[11px]">
              <span className="text-textSoft">{provider.id}</span>
              <span className="text-text">{provider.status}</span>
            </li>
          ))}
        </ul>
      </MobileTabSection>

      {snapshot.externalSyncLinksPeek.length > 0 ? (
        <MobileTabSection
          id="integrations-external-sync"
          title="External sync"
          description="Links between workspace entities and external calendars/tasks."
        >
          <ul className="mt-2 space-y-2">
            {snapshot.externalSyncLinksPeek.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-border/30 bg-surface/45 px-2 py-2 text-[11px] text-textMuted"
              >
                <p className="font-medium text-text">
                  {row.provider} · {row.resourceType}
                </p>
                <p className="mt-0.5 text-[10px] text-textMuted">
                  {row.sourceType} · synced {row.lastSyncedAt}
                </p>
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => void runCommand(`add note: review external sync ${row.id}`)}
                  className={`mt-2 ${mobileChipClass(btnFocus)} ${chipDisabled}`}
                >
                  Open in Chat
                </button>
              </li>
            ))}
          </ul>
        </MobileTabSection>
      ) : null}

      {snapshot.integrationLiveFeedPeek.length > 0 ? (
        <MobileTabSection
          id="integrations-live-feed"
          title="Hub activity"
          description="Recent events from the integrations hub."
        >
          <ul className="mt-2 space-y-2">
            {snapshot.integrationLiveFeedPeek.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-border/30 bg-surface/45 px-2 py-2 text-[11px] text-textMuted"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-medium text-text">{row.title}</p>
                  <span
                    className={`shrink-0 text-[10px] font-medium uppercase ${
                      row.level === 'warning'
                        ? 'text-warning'
                        : row.level === 'success'
                          ? 'text-success'
                          : 'text-info'
                    }`}
                  >
                    {row.level}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-textMuted">{row.source}</p>
                <p className="mt-1 text-[10px] leading-snug text-textSoft">{row.detail}</p>
                <p className="mt-1 text-[10px] text-textSoft">{row.happenedAt}</p>
              </li>
            ))}
          </ul>
        </MobileTabSection>
      ) : null}

      <MobileTabSection
        id="integrations-artifacts"
        title="Synced artifacts"
        description="Artifacts tracked by connected providers."
      >
        {snapshot.integrationArtifactsPeek.length === 0 ? (
          <p className="mt-2 text-[11px] text-textMuted">
            No artifacts yet. Total: {snapshot.integrationArtifactCount}.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {snapshot.integrationArtifactsPeek.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-border/30 bg-surface/45 px-2 py-2 text-[11px] text-textMuted"
              >
                <p className="font-medium text-text">{row.title}</p>
                <p className="text-[10px] text-textMuted">{row.artifactType}</p>
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() =>
                    void runCommand(`add note: review artifact ${row.title.replace(/"/g, "'")}`)
                  }
                  className={`mt-2 ${mobileChipClass(btnFocus)} ${chipDisabled}`}
                >
                  Open in Chat
                </button>
              </li>
            ))}
          </ul>
        )}
      </MobileTabSection>

      <MobileTabSection
        id="integrations-ssh"
        title="SSH targets"
        description="Infrastructure targets registered in the workspace."
      >
        {snapshot.sshTargetsPeek.length === 0 ? (
          <p className="mt-2 text-[11px] text-textMuted">
            No SSH targets. Total: {snapshot.sshTargetsCount}.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {snapshot.sshTargetsPeek.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-border/30 bg-surface/45 px-2 py-2 text-[11px] text-textMuted"
              >
                <p className="font-medium text-text">{row.name}</p>
                <p className="text-[10px] text-textMuted">{row.host}</p>
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => void runCommand(`add note: SSH target ${row.name} (${row.host})`)}
                  className={`mt-2 ${mobileChipClass(btnFocus)} ${chipDisabled}`}
                >
                  Open in Chat
                </button>
              </li>
            ))}
          </ul>
        )}
      </MobileTabSection>

      <MobileTabSection
        id="integrations-quick-add"
        title="Quick add"
        description="Fast setup commands for common integration tasks."
      >
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={commandBusy}
            onClick={() => void runCommand('connect notion source: Growth workspace')}
            className={`${mobileChipClass(btnFocus)} ${chipDisabled}`}
          >
            Add connection
          </button>
          <button
            type="button"
            disabled={commandBusy}
            onClick={() => void runCommand('add source: webhook pipeline')}
            className={`${mobileChipClass(btnFocus)} ${chipDisabled}`}
          >
            Add contact source
          </button>
          <button
            type="button"
            disabled={commandBusy}
            onClick={() => void runCommand('add integration artifact: weekly metrics rollup')}
            className={`${mobileChipClass(btnFocus)} ${chipDisabled}`}
          >
            Add artifact stub
          </button>
          <button
            type="button"
            disabled={commandBusy}
            onClick={() =>
              void runCommand('add ssh: name: staging host: staging.internal port: 22 user: deploy')
            }
            className={`${mobileChipClass(btnFocus)} ${chipDisabled}`}
          >
            Add SSH stub
          </button>
        </div>
      </MobileTabSection>
    </div>
  );
};
