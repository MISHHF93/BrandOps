import { useMemo } from 'react';
import type { BrandOpsData } from '../../../types/domain';
import { StatCard } from './StatCard';
import {
  OPEN_CONTROL_DECK_LABEL
} from '../../../shared/navigation/extensionSurfaceCopy';
import { openExtensionSurface } from '../../../shared/navigation/openExtensionSurface';

const urlHostname = (value: string) => {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
};

const parseCadenceSourceId = (value: string) => {
  const separatorIndex = value.indexOf('::');
  if (separatorIndex === -1) return null;
  return {
    dateKey: value.slice(0, separatorIndex),
    blockTitle: value.slice(separatorIndex + 2)
  };
};

const sourceDisplayName = (data: BrandOpsData, sourceId: string) =>
  data.integrationHub.sources.find((item) => item.id === sourceId)?.name ?? 'Unknown source';

const artifactLabelForLink = (
  data: BrandOpsData,
  link: BrandOpsData['externalSync']['links'][number]
) => {
  if (link.sourceType === 'daily-cadence-block') {
    const cadenceSource = parseCadenceSourceId(link.sourceId);
    return cadenceSource
      ? `${cadenceSource.blockTitle} · ${cadenceSource.dateKey}`
      : `Cadence block ${link.sourceId}`;
  }
  if (link.sourceType === 'publishing-item') {
    return (
      data.publishingQueue.find((item) => item.id === link.sourceId)?.title ??
      `Publishing item ${link.sourceId}`
    );
  }
  if (link.sourceType === 'follow-up') {
    const followUp = data.followUps.find((item) => item.id === link.sourceId);
    return followUp?.reason ?? `Follow-up ${link.sourceId}`;
  }
  return (
    data.opportunities.find((item) => item.id === link.sourceId)?.name ??
    `Opportunity ${link.sourceId}`
  );
};

const artifactDescriptionForLink = (
  data: BrandOpsData,
  link: BrandOpsData['externalSync']['links'][number]
) => {
  if (link.sourceType === 'daily-cadence-block') {
    const cadenceSource = parseCadenceSourceId(link.sourceId);
    return cadenceSource
      ? `Cadence block linked for external sync (${cadenceSource.dateKey}).`
      : 'Cadence block linked for external sync.';
  }
  if (link.sourceType === 'publishing-item') {
    const item = data.publishingQueue.find((entry) => entry.id === link.sourceId);
    return item?.scheduledFor
      ? `Scheduled for ${new Date(item.scheduledFor).toLocaleString()}`
      : 'Publishing queue artifact';
  }
  if (link.sourceType === 'follow-up') {
    const task = data.followUps.find((entry) => entry.id === link.sourceId);
    return task ? `Due ${new Date(task.dueAt).toLocaleString()}` : 'Follow-up artifact';
  }
  const opportunity = data.opportunities.find((entry) => entry.id === link.sourceId);
  return opportunity ? `Next action: ${opportunity.nextAction}` : 'Pipeline artifact';
};

const sshCommandForTarget = (target: BrandOpsData['integrationHub']['sshTargets'][number]) =>
  `ssh ${target.username}@${target.host} -p ${target.port}`;

interface DashboardSystemsLeanProps {
  data: BrandOpsData;
}

/** Read-only connections pulse + deep link to Settings for setup (no duplicate forms). */
const providerDetail = (name?: string, email?: string, fallback?: string) => {
  if (name?.trim() && email?.trim()) return `${name.trim()} (${email.trim()})`;
  return name?.trim() || email?.trim() || fallback || 'Profile after connect';
};

export function DashboardSystemsLean({ data }: DashboardSystemsLeanProps) {
  const hub = data.settings.syncHub;

  const providerCards = useMemo(
    () => [
      {
        id: 'google',
        title: 'Google',
        enabled: Boolean(hub.google.clientId.trim()),
        detail: providerDetail(hub.google.profile?.name, hub.google.profile?.email, 'OpenID'),
        status: hub.google.connectionStatus,
        lastAt: hub.google.lastConnectedAt
      },
      {
        id: 'github',
        title: 'GitHub',
        enabled: Boolean(hub.github.clientId.trim()),
        detail: providerDetail(hub.github.profile?.name, hub.github.profile?.email, 'OAuth'),
        status: hub.github.connectionStatus,
        lastAt: hub.github.lastConnectedAt
      },
      {
        id: 'linkedin',
        title: 'LinkedIn',
        enabled: Boolean(hub.linkedin.clientId.trim()),
        detail: providerDetail(hub.linkedin.profile?.name, hub.linkedin.profile?.email, 'OpenID'),
        status: hub.linkedin.connectionStatus,
        lastAt: hub.linkedin.lastConnectedAt
      }
    ],
    [hub.google, hub.github, hub.linkedin]
  );

  const syncedArtifactsPreview = useMemo(
    () =>
      [...data.externalSync.links]
        .sort(
          (left, right) =>
            new Date(right.lastSyncedAt).getTime() - new Date(left.lastSyncedAt).getTime()
        )
        .slice(0, 6),
    [data.externalSync.links]
  );

  const liveFeedPreview = useMemo(
    () =>
      [...data.integrationHub.liveFeed]
        .sort(
          (left, right) =>
            new Date(right.happenedAt).getTime() - new Date(left.happenedAt).getTime()
        )
        .slice(0, 6),
    [data.integrationHub.liveFeed]
  );

  const artifactVaultPreview = useMemo(
    () =>
      [...data.integrationHub.artifacts]
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        )
        .slice(0, 6),
    [data.integrationHub.artifacts]
  );

  const hubExternalLinks = useMemo(() => {
    const synced = syncedArtifactsPreview;
    const links = [
      ...data.integrationHub.sources
        .filter((source) => Boolean(source.baseUrl))
        .map((source) => ({
          id: `source-${source.id}`,
          label: source.name,
          detail: `${source.kind} source`,
          href: source.baseUrl as string
        })),
      ...synced
        .filter((artifact) => Boolean(artifact.remoteUrl))
        .map((artifact) => ({
          id: `sync-${artifact.id}`,
          label: artifactLabelForLink(data, artifact),
          detail: `${artifact.provider} ${artifact.resourceType}`,
          href: artifact.remoteUrl as string
        })),
      ...artifactVaultPreview
        .filter((artifact) => Boolean(artifact.externalUrl))
        .map((artifact) => ({
          id: `artifact-${artifact.id}`,
          label: artifact.title,
          detail: `${sourceDisplayName(data, artifact.sourceId)} ${artifact.artifactType}`,
          href: artifact.externalUrl as string
        }))
    ]
      .filter(
        (link, index, collection) =>
          collection.findIndex((candidate) => candidate.href === link.href) === index
      )
      .slice(0, 10);
    return links;
  }, [artifactVaultPreview, data, syncedArtifactsPreview]);

  return (
    <section className="bo-card space-y-4" id="connections" aria-label="Connections">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Connections at a glance</h2>
          <p className="text-xs text-textMuted">
            Status and links only. Add sources, manual artifacts, and SSH targets in Settings → Integration hub.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="bo-pill">{providerCards.filter((item) => item.enabled).length} active providers</span>
          <span className="bo-pill">{data.externalSync.links.length} synced records</span>
          <span className="bo-pill">{data.integrationHub.sshTargets.length} SSH targets</span>
        </div>
      </header>

      <article className="rounded-xl border border-border bg-bg/40 p-4 text-xs">
        <p className="font-medium text-text">Configure integrations</p>
        <p className="mt-1 text-textMuted">
          LinkedIn sign-in, integration hub sources, artifacts, and SSH nodes are managed in Settings so this dashboard
          stays focused on execution.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="bo-link" onClick={() => openExtensionSurface('options')}>
            {OPEN_CONTROL_DECK_LABEL}
          </button>
        </div>
      </article>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Connected providers"
          value={providerCards.filter((item) => item.status === 'connected').length}
          hint="LinkedIn identity status"
        />
        <StatCard
          label="Synced artifacts"
          value={data.externalSync.links.length}
          hint="Remote items mapped into your cockpit"
        />
        <StatCard
          label="System signals"
          value={data.integrationHub.liveFeed.length}
          hint="Recent integration activity"
        />
        <StatCard
          label="SSH targets"
          value={data.integrationHub.sshTargets.length}
          hint="Stored operational entry points"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">External links</h3>
            <span className="text-textMuted">{hubExternalLinks.length} links</span>
          </div>
          <div className="mt-3 grid gap-2">
            {hubExternalLinks.length === 0 ? (
              <p className="rounded-xl border border-border/80 bg-bg/45 p-3 text-textMuted">
                No links yet. Connect LinkedIn or add sources in Settings.
              </p>
            ) : (
              hubExternalLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block min-w-0 rounded-xl border border-border/80 bg-bg/45 p-3 transition hover:border-border"
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-medium text-text">{link.label}</p>
                    <span className="shrink-0 bo-pill">Open</span>
                  </div>
                  <p className="mt-1 break-words text-textMuted">{link.detail}</p>
                  <p className="mt-2 break-all text-[11px] text-textSoft">{urlHostname(link.href)}</p>
                </a>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
          <h3 className="text-sm font-semibold">OAuth identities</h3>
          <div className="mt-3 space-y-2">
            {providerCards.map((provider) => (
              <div key={provider.id} className="rounded-xl border border-border/80 bg-bg/45 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-text">{provider.title}</p>
                  <span className="bo-pill">
                    {provider.enabled ? 'Client configured' : 'No client ID'} · {provider.status}
                  </span>
                </div>
                <p className="mt-1 text-textMuted">{provider.detail}</p>
                {provider.lastAt ? (
                  <p className="mt-2 text-[11px] text-textSoft">
                    Last connected: {new Date(provider.lastAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
          <h3 className="text-sm font-semibold">System signals</h3>
          <div className="mt-3 space-y-2">
            {liveFeedPreview.length === 0 ? (
              <p className="rounded-xl border border-border/80 bg-bg/45 p-3 text-textMuted">
                No live feed events yet.
              </p>
            ) : (
              liveFeedPreview.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-border/80 bg-bg/45 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-text">{entry.title}</p>
                    <span className="bo-pill">{entry.level}</span>
                  </div>
                  <p className="mt-1 text-textMuted">{entry.detail}</p>
                  <p className="mt-2 text-[11px] text-textSoft">
                    {entry.source} · {new Date(entry.happenedAt).toLocaleString()}
                  </p>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
          <h3 className="text-sm font-semibold">Synced artifacts (recent)</h3>
          <div className="mt-3 grid gap-2">
            {syncedArtifactsPreview.length === 0 ? (
              <p className="rounded-xl border border-border/80 bg-bg/45 p-3 text-textMuted">
                No external artifacts yet. Connect providers and add records from Settings.
              </p>
            ) : (
              syncedArtifactsPreview.map((artifact) => (
                <article key={artifact.id} className="rounded-xl border border-border/80 bg-bg/45 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-text">{artifactLabelForLink(data, artifact)}</p>
                    <span className="bo-pill">
                      {artifact.provider} · {artifact.resourceType}
                    </span>
                  </div>
                  <p className="mt-1 text-textMuted">{artifactDescriptionForLink(data, artifact)}</p>
                  <p className="mt-2 text-[11px] text-textSoft">
                    Synced {new Date(artifact.lastSyncedAt).toLocaleString()}
                  </p>
                  {artifact.remoteUrl ? (
                    <a
                      href={artifact.remoteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-[11px] text-textMuted hover:text-textMuted"
                    >
                      Open remote artifact
                    </a>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
          <h3 className="text-sm font-semibold">Registered sources</h3>
          <ul className="mt-2 space-y-1 text-textMuted">
            {data.integrationHub.sources.length === 0 ? (
              <li>None yet — add in Settings.</li>
            ) : (
              data.integrationHub.sources.slice(0, 12).map((source) => (
                <li key={source.id}>
                  <span className="font-medium text-text">{source.name}</span> · {source.kind} · {source.status}
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
          <h3 className="text-sm font-semibold">SSH targets (preview)</h3>
          <div className="mt-3 space-y-2">
            {data.integrationHub.sshTargets.length === 0 ? (
              <p className="text-textMuted">None stored — add in Settings.</p>
            ) : (
              data.integrationHub.sshTargets.slice(0, 6).map((target) => (
                <div key={target.id} className="rounded-xl border border-border/80 bg-bg/45 p-3">
                  <p className="font-medium text-text">{target.name}</p>
                  <code className="mt-2 block rounded-lg border border-border bg-bg px-2 py-1 text-[11px] text-textMuted">
                    {sshCommandForTarget(target)}
                  </code>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
