import { useState } from 'react';
import type { BrandOpsData } from '../../types/domain';
import { InlineAlert } from '../../shared/ui/components';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const sourceDisplayName = (data: BrandOpsData, sourceId: string) =>
  data.integrationHub.sources.find((item) => item.id === sourceId)?.name ?? 'Unknown source';

const sshCommandForTarget = (target: BrandOpsData['integrationHub']['sshTargets'][number]) =>
  `ssh ${target.username}@${target.host} -p ${target.port}`;

const integrationTemplates: Array<{
  kind: BrandOpsData['integrationHub']['sources'][number]['kind'];
  title: string;
  artifactTypes: string[];
  detail: string;
}> = [
  {
    kind: 'google-workspace',
    title: 'Google Workspace',
    artifactTypes: ['calendar events', 'tasks', 'drive references'],
    detail: 'Calendar, Tasks, Drive-adjacent planning artifacts.'
  },
  {
    kind: 'notion',
    title: 'Notion',
    artifactTypes: ['docs', 'databases', 'meeting notes'],
    detail: 'Project docs, wikis, and operating playbooks.'
  },
  {
    kind: 'slack',
    title: 'Slack',
    artifactTypes: ['alerts', 'decision logs', 'handoff notes'],
    detail: 'Operational chatter and live handoff signals.'
  },
  {
    kind: 'rss',
    title: 'RSS / Atom',
    artifactTypes: ['news items', 'market signals', 'competitor updates'],
    detail: 'Inbound feeds for monitoring and signal capture.'
  },
  {
    kind: 'google-drive',
    title: 'Google Drive',
    artifactTypes: ['docs', 'sheets', 'slides'],
    detail: 'Cloud documents and working files.'
  },
  {
    kind: 'webhook',
    title: 'Webhook',
    artifactTypes: ['events', 'alerts', 'external state changes'],
    detail: 'Push-based integration from any system that can emit JSON.'
  },
  {
    kind: 'custom-api',
    title: 'Custom API',
    artifactTypes: ['records', 'jobs', 'tickets'],
    detail: 'Provider catch-all for anything domain-specific.'
  }
];

/**
 * Manual integration hub setup (sources, artifacts, SSH). Lives on Settings;
 * dashboard Systems stays read-only + deep link here.
 */
export function IntegrationHubSetupPanel() {
  const { data, addIntegrationSource, addExternalArtifact, addSshTarget } = useBrandOpsStore();

  const [sshDraft, setSshDraft] = useState({
    name: '',
    host: '',
    port: '22',
    username: '',
    authMode: 'ssh-key' as const,
    description: '',
    tags: '',
    commandHints: ''
  });
  const [sourceDraft, setSourceDraft] = useState({
    name: '',
    kind: 'notion' as BrandOpsData['integrationHub']['sources'][number]['kind'],
    status: 'planned' as BrandOpsData['integrationHub']['sources'][number]['status'],
    baseUrl: '',
    artifactTypes: 'docs, databases',
    tags: '',
    notes: ''
  });
  const [artifactDraft, setArtifactDraft] = useState({
    sourceId: '',
    title: '',
    artifactType: '',
    summary: '',
    externalUrl: '',
    externalId: '',
    tags: '',
    syncedAt: ''
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data) {
    return null;
  }

  return (
    <section className="bo-card space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Integration hub setup</h2>
        <p className="text-xs text-textMuted">
          Register external sources, manual artifacts, and SSH targets. The dashboard Systems area shows status only;
          make changes here.
        </p>
      </div>

      {error ? <InlineAlert tone="danger" title="Integration hub" message={error} /> : null}
      {notice ? <InlineAlert tone="success" title="Integration hub" message={notice} /> : null}

      <div className="grid gap-3 xl:grid-cols-3">
        <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs xl:col-span-1">
          <h3 className="text-sm font-semibold">Provider templates</h3>
          <div className="mt-3 space-y-2">
            {integrationTemplates.map((template) => (
              <article key={template.kind} className="rounded-xl border border-border/80 bg-bg/45 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-text">{template.title}</p>
                  <span className="bo-pill">{template.kind}</span>
                </div>
                <p className="mt-1 text-textMuted">{template.detail}</p>
                <p className="mt-2 text-[11px] text-textSoft">
                  Artifacts: {template.artifactTypes.join(', ')}
                </p>
              </article>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs xl:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Register external source</h3>
            <span className="text-textMuted">
              Add systems before connectors exist, or track manual integrations.
            </span>
          </div>
          <form
            className="mt-3 grid gap-2 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const sourceName = sourceDraft.name.trim();
              const baseUrl = sourceDraft.baseUrl.trim();
              const artifactTypes = sourceDraft.artifactTypes
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
              const tags = sourceDraft.tags
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);

              if (!sourceName) {
                setNotice(null);
                setError('Source name is required before adding a provider.');
                return;
              }

              if (baseUrl && !isHttpUrl(baseUrl)) {
                setNotice(null);
                setError('Base URL must start with http:// or https://.');
                return;
              }

              if (artifactTypes.length === 0) {
                setNotice(null);
                setError('Add at least one artifact type so this source is useful.');
                return;
              }

              void (async () => {
                try {
                  await addIntegrationSource({
                    name: sourceName,
                    kind: sourceDraft.kind,
                    status: sourceDraft.status,
                    baseUrl: baseUrl || undefined,
                    artifactTypes,
                    tags,
                    notes: sourceDraft.notes.trim()
                  });

                  setError(null);
                  setNotice(`Source "${sourceName}" added to the integration hub.`);
                  setSourceDraft({
                    name: '',
                    kind: 'notion',
                    status: 'planned',
                    baseUrl: '',
                    artifactTypes: 'docs, databases',
                    tags: '',
                    notes: ''
                  });
                } catch (submitError) {
                  setNotice(null);
                  setError(`Source save failed. ${(submitError as Error).message}`);
                }
              })();
            }}
          >
            <input
              value={sourceDraft.name}
              onChange={(event) => setSourceDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Source name"
              className="rounded-xl border border-border bg-bg/60 px-3 py-2"
            />
            <select
              value={sourceDraft.kind}
              onChange={(event) =>
                setSourceDraft((current) => ({
                  ...current,
                  kind: event.target.value as typeof current.kind
                }))
              }
              className="rounded-xl border border-border bg-bg/60 px-3 py-2"
            >
              {integrationTemplates.map((template) => (
                <option key={template.kind} value={template.kind}>
                  {template.title}
                </option>
              ))}
            </select>
            <select
              value={sourceDraft.status}
              onChange={(event) =>
                setSourceDraft((current) => ({
                  ...current,
                  status: event.target.value as typeof current.status
                }))
              }
              className="rounded-xl border border-border bg-bg/60 px-3 py-2"
            >
              <option value="planned">Planned</option>
              <option value="connected">Connected</option>
              <option value="monitoring">Monitoring</option>
            </select>
            <input
              value={sourceDraft.baseUrl}
              onChange={(event) =>
                setSourceDraft((current) => ({ ...current, baseUrl: event.target.value }))
              }
              placeholder="Base URL"
              className="rounded-xl border border-border bg-bg/60 px-3 py-2"
            />
            <input
              value={sourceDraft.artifactTypes}
              onChange={(event) =>
                setSourceDraft((current) => ({
                  ...current,
                  artifactTypes: event.target.value
                }))
              }
              placeholder="Artifact types, comma-separated"
              className="rounded-xl border border-border bg-bg/60 px-3 py-2"
            />
            <input
              value={sourceDraft.tags}
              onChange={(event) =>
                setSourceDraft((current) => ({ ...current, tags: event.target.value }))
              }
              placeholder="Tags, comma-separated"
              className="rounded-xl border border-border bg-bg/60 px-3 py-2"
            />
            <textarea
              value={sourceDraft.notes}
              onChange={(event) =>
                setSourceDraft((current) => ({ ...current, notes: event.target.value }))
              }
              rows={2}
              placeholder="Connection notes or context"
              className="rounded-xl border border-border bg-bg/60 px-3 py-2 md:col-span-2"
            />
            <button className="bo-link w-fit" type="submit">
              Add source
            </button>
          </form>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {data.integrationHub.sources.map((source) => (
              <article key={source.id} className="rounded-xl border border-border/80 bg-bg/45 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-text">{source.name}</p>
                  <span className="bo-pill">
                    {source.kind} · {source.status}
                  </span>
                </div>
                <p className="mt-1 text-textMuted">{source.notes || 'No notes yet.'}</p>
                {source.baseUrl ? (
                  <a
                    href={source.baseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-[11px] text-textMuted hover:text-textMuted"
                  >
                    Open source
                  </a>
                ) : null}
                {source.artifactTypes.length > 0 ? (
                  <p className="mt-2 text-[11px] text-textSoft">
                    Artifacts: {source.artifactTypes.join(', ')}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </article>
      </div>

      <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Manual artifacts</h3>
          <span className="text-textMuted">Capture records from any system.</span>
        </div>

        <form
          className="mt-3 grid gap-2 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const title = artifactDraft.title.trim();
            const artifactType = artifactDraft.artifactType.trim();
            const externalUrl = artifactDraft.externalUrl.trim();
            const syncedAt = artifactDraft.syncedAt.trim();

            if (!artifactDraft.sourceId || !title || !artifactType) {
              setNotice(null);
              setError('Source, artifact title, and artifact type are required.');
              return;
            }

            if (externalUrl && !isHttpUrl(externalUrl)) {
              setNotice(null);
              setError('External URL must start with http:// or https://.');
              return;
            }

            if (syncedAt && Number.isNaN(new Date(syncedAt).getTime())) {
              setNotice(null);
              setError('Synced timestamp must be a valid ISO date.');
              return;
            }

            void (async () => {
              try {
                await addExternalArtifact({
                  sourceId: artifactDraft.sourceId,
                  title,
                  artifactType,
                  summary: artifactDraft.summary.trim(),
                  externalUrl: externalUrl || undefined,
                  externalId: artifactDraft.externalId.trim() || undefined,
                  tags: artifactDraft.tags
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                  syncedAt: syncedAt || undefined
                });

                setError(null);
                setNotice(`Artifact "${title}" captured in the integration hub.`);
                setArtifactDraft({
                  sourceId: '',
                  title: '',
                  artifactType: '',
                  summary: '',
                  externalUrl: '',
                  externalId: '',
                  tags: '',
                  syncedAt: ''
                });
              } catch (submitError) {
                setNotice(null);
                setError(`Artifact save failed. ${(submitError as Error).message}`);
              }
            })();
          }}
        >
          <select
            value={artifactDraft.sourceId}
            onChange={(event) =>
              setArtifactDraft((current) => ({ ...current, sourceId: event.target.value }))
            }
            className="rounded-xl border border-border bg-bg/60 px-3 py-2"
          >
            <option value="">Choose a source</option>
            {data.integrationHub.sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
          <input
            value={artifactDraft.title}
            onChange={(event) =>
              setArtifactDraft((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="Artifact title"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2"
          />
          <input
            value={artifactDraft.artifactType}
            onChange={(event) =>
              setArtifactDraft((current) => ({
                ...current,
                artifactType: event.target.value
              }))
            }
            placeholder="Artifact type"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2"
          />
          <input
            value={artifactDraft.externalId}
            onChange={(event) =>
              setArtifactDraft((current) => ({
                ...current,
                externalId: event.target.value
              }))
            }
            placeholder="External ID"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2"
          />
          <input
            value={artifactDraft.externalUrl}
            onChange={(event) =>
              setArtifactDraft((current) => ({
                ...current,
                externalUrl: event.target.value
              }))
            }
            placeholder="External URL"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2"
          />
          <input
            value={artifactDraft.tags}
            onChange={(event) =>
              setArtifactDraft((current) => ({ ...current, tags: event.target.value }))
            }
            placeholder="Tags, comma-separated"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2"
          />
          <input
            value={artifactDraft.syncedAt}
            onChange={(event) =>
              setArtifactDraft((current) => ({ ...current, syncedAt: event.target.value }))
            }
            placeholder="Synced timestamp (optional ISO date)"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2 md:col-span-2"
          />
          <textarea
            value={artifactDraft.summary}
            onChange={(event) =>
              setArtifactDraft((current) => ({ ...current, summary: event.target.value }))
            }
            rows={2}
            placeholder="Artifact summary"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2 md:col-span-2"
          />
          <button className="bo-link w-fit" type="submit">
            Add artifact
          </button>
        </form>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {data.integrationHub.artifacts.length === 0 ? (
            <p className="rounded-xl border border-border/80 bg-bg/45 p-3 text-textMuted md:col-span-2">
              No manual artifacts stored yet.
            </p>
          ) : (
            data.integrationHub.artifacts.map((artifact) => (
              <article key={artifact.id} className="rounded-xl border border-border/80 bg-bg/45 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-text">{artifact.title}</p>
                  <span className="bo-pill">{artifact.artifactType}</span>
                </div>
                <p className="mt-1 text-textMuted">
                  {sourceDisplayName(data, artifact.sourceId)} · {artifact.summary || 'No summary yet.'}
                </p>
                <p className="mt-2 text-[11px] text-textSoft">
                  Updated {new Date(artifact.updatedAt).toLocaleString()}
                </p>
                {artifact.externalUrl ? (
                  <a
                    href={artifact.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-[11px] text-textMuted hover:text-textMuted"
                  >
                    Open external artifact
                  </a>
                ) : null}
              </article>
            ))
          )}
        </div>
      </article>

      <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">SSH targets</h3>
          <span className="text-textMuted">Operational entry points (no remote execution from BrandOps).</span>
        </div>

        <form
          className="mt-3 grid gap-2 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const name = sshDraft.name.trim();
            const host = sshDraft.host.trim();
            const username = sshDraft.username.trim();
            const parsedPort = Number(sshDraft.port);
            const validPort = Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535;

            if (!name || !host || !username) {
              setNotice(null);
              setError('Name, host, and username are required for SSH targets.');
              return;
            }

            if (/\s/.test(host)) {
              setNotice(null);
              setError('Host cannot contain spaces.');
              return;
            }

            if (!validPort) {
              setNotice(null);
              setError('Port must be an integer between 1 and 65535.');
              return;
            }

            void (async () => {
              try {
                await addSshTarget({
                  name,
                  host,
                  port: parsedPort,
                  username,
                  authMode: sshDraft.authMode,
                  description: sshDraft.description.trim(),
                  tags: sshDraft.tags
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                  commandHints: sshDraft.commandHints
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean)
                });

                setError(null);
                setNotice(`SSH target "${name}" saved.`);
                setSshDraft({
                  name: '',
                  host: '',
                  port: '22',
                  username: '',
                  authMode: 'ssh-key',
                  description: '',
                  tags: '',
                  commandHints: ''
                });
              } catch (submitError) {
                setNotice(null);
                setError(`SSH target save failed. ${(submitError as Error).message}`);
              }
            })();
          }}
        >
          <input
            value={sshDraft.name}
            onChange={(event) => setSshDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Target name"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2"
          />
          <input
            value={sshDraft.host}
            onChange={(event) => setSshDraft((current) => ({ ...current, host: event.target.value }))}
            placeholder="Host or IP"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2"
          />
          <input
            value={sshDraft.username}
            onChange={(event) =>
              setSshDraft((current) => ({ ...current, username: event.target.value }))
            }
            placeholder="SSH username"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2"
          />
          <input
            value={sshDraft.port}
            onChange={(event) => setSshDraft((current) => ({ ...current, port: event.target.value }))}
            placeholder="Port"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2"
          />
          <select
            value={sshDraft.authMode}
            onChange={(event) =>
              setSshDraft((current) => ({
                ...current,
                authMode: event.target.value as typeof current.authMode
              }))
            }
            className="rounded-xl border border-border bg-bg/60 px-3 py-2"
          >
            <option value="ssh-key">SSH key</option>
            <option value="agent">SSH agent</option>
            <option value="passwordless">Passwordless</option>
          </select>
          <input
            value={sshDraft.tags}
            onChange={(event) => setSshDraft((current) => ({ ...current, tags: event.target.value }))}
            placeholder="Tags, comma-separated"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2"
          />
          <textarea
            value={sshDraft.description}
            onChange={(event) =>
              setSshDraft((current) => ({ ...current, description: event.target.value }))
            }
            rows={2}
            placeholder="Operational description"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2 md:col-span-2"
          />
          <textarea
            value={sshDraft.commandHints}
            onChange={(event) =>
              setSshDraft((current) => ({ ...current, commandHints: event.target.value }))
            }
            rows={3}
            placeholder="Command hints, one per line"
            className="rounded-xl border border-border bg-bg/60 px-3 py-2 md:col-span-2"
          />
          <button className="bo-link w-fit" type="submit">
            Add SSH target
          </button>
        </form>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {data.integrationHub.sshTargets.length === 0 ? (
            <p className="rounded-xl border border-border/80 bg-bg/45 p-3 text-textMuted md:col-span-2">
              No SSH targets stored yet.
            </p>
          ) : (
            data.integrationHub.sshTargets.map((target) => (
              <article key={target.id} className="rounded-xl border border-border/80 bg-bg/45 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-text">{target.name}</p>
                  <span className="bo-pill">{target.authMode}</span>
                </div>
                <p className="mt-1 text-textMuted">{target.description || 'No description yet.'}</p>
                <code className="mt-2 block rounded-lg border border-border bg-bg px-2 py-1 text-[11px] text-textMuted">
                  {sshCommandForTarget(target)}
                </code>
                {target.tags.length > 0 ? (
                  <p className="mt-2 text-[11px] text-textSoft">Tags: {target.tags.join(', ')}</p>
                ) : null}
                {target.commandHints.length > 0 ? (
                  <div className="mt-2 space-y-1 text-[11px] text-textMuted">
                    {target.commandHints.map((hint, index) => (
                      <p key={`${target.id}-hint-${index}`}>{hint}</p>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
