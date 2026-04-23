import { demoSampleData } from '../../src/modules/brandMemory/demoSeed';
import { seedData } from '../../src/modules/brandMemory/seed';
import { BrandOpsData, IntegrationSource, SshTarget } from '../../src/types/domain';

const shiftIso = (iso: string | undefined, minutes: number) =>
  iso ? new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString() : undefined;

const appendSuffix = (value: string, copy: number, index: number) =>
  `${value}-${copy + 1}-${index + 1}`;

export const cloneSeedData = (): BrandOpsData => structuredClone(seedData);

/** Rich dataset for scale/stress tests (matches former monolithic seed). */
export const cloneDemoSampleData = (): BrandOpsData => structuredClone(demoSampleData);

export const buildScaledData = (copies = 200): BrandOpsData => {
  const base = cloneDemoSampleData();
  const generatedAt = new Date().toISOString();

  const contentLibrary = Array.from({ length: copies }, (_, copy) =>
    base.contentLibrary.map((item, index) => ({
      ...structuredClone(item),
      id: appendSuffix(item.id, copy, index),
      title: `${item.title} ${copy + 1}`,
      createdAt: shiftIso(item.createdAt, copy + index) ?? item.createdAt,
      updatedAt: shiftIso(item.updatedAt, copy + index) ?? item.updatedAt
    }))
  ).flat();

  const publishingQueue = Array.from({ length: copies }, (_, copy) =>
    base.publishingQueue.map((item, index) => ({
      ...structuredClone(item),
      id: appendSuffix(item.id, copy, index),
      title: `${item.title} ${copy + 1}`,
      scheduledFor: shiftIso(item.scheduledFor, copy * 10 + index) ?? item.scheduledFor,
      reminderAt: shiftIso(item.reminderAt, copy * 10 + index) ?? item.reminderAt,
      createdAt: shiftIso(item.createdAt, copy + index) ?? item.createdAt,
      updatedAt: shiftIso(item.updatedAt, copy + index) ?? item.updatedAt
    }))
  ).flat();

  const followUps = Array.from({ length: copies }, (_, copy) =>
    base.followUps.map((item, index) => ({
      ...structuredClone(item),
      id: appendSuffix(item.id, copy, index),
      contactId: appendSuffix(item.contactId, copy, index),
      dueAt: shiftIso(item.dueAt, copy * 15 + index) ?? item.dueAt
    }))
  ).flat();

  const opportunities = Array.from({ length: copies }, (_, copy) =>
    base.opportunities.map((item, index) => ({
      ...structuredClone(item),
      id: appendSuffix(item.id, copy, index),
      name: `${item.name} ${copy + 1}`,
      company: `${item.company} ${copy + 1}`,
      contactId: item.contactId ? appendSuffix(item.contactId, copy, index) : undefined,
      followUpDate: shiftIso(item.followUpDate, copy * 15 + index) ?? item.followUpDate,
      createdAt: shiftIso(item.createdAt, copy + index) ?? item.createdAt,
      updatedAt: shiftIso(item.updatedAt, copy + index) ?? item.updatedAt
    }))
  ).flat();

  const outreachDrafts = Array.from({ length: copies }, (_, copy) =>
    base.outreachDrafts.map((item, index) => ({
      ...structuredClone(item),
      id: appendSuffix(item.id, copy, index),
      targetName: `${item.targetName} ${copy + 1}`,
      company: `${item.company} ${copy + 1}`,
      updatedAt: shiftIso(item.updatedAt, copy * 20 + index) ?? item.updatedAt,
      createdAt: shiftIso(item.createdAt, copy * 20 + index) ?? item.createdAt
    }))
  ).flat();

  const notes = Array.from({ length: copies }, (_, copy) =>
    base.notes.map((item, index) => ({
      ...structuredClone(item),
      id: appendSuffix(item.id, copy, index),
      entityId: appendSuffix(item.entityId, copy, index),
      createdAt: shiftIso(item.createdAt, copy + index) ?? item.createdAt
    }))
  ).flat();

  const sources = Array.from({ length: copies }, (_, copy) =>
    base.integrationHub.sources.map((item, index) => ({
      ...structuredClone(item),
      id: appendSuffix(item.id, copy, index),
      name: `${item.name} ${copy + 1}`,
      status: copy % 3 === 0 ? 'connected' : item.status,
      createdAt: shiftIso(item.createdAt, copy + index) ?? item.createdAt
    }))
  ).flat();

  const artifacts = sources
    .filter((_, index) => index % 2 === 0)
    .map((source, index) => ({
      id: `artifact-${index + 1}`,
      sourceId: source.id,
      title: `${source.name} snapshot`,
      artifactType: source.artifactTypes[0] ?? 'record',
      summary: `Artifact captured from ${source.name} for scaled performance coverage.`,
      externalUrl: source.baseUrl,
      externalId: `remote-${index + 1}`,
      tags: source.tags.slice(0, 3),
      syncedAt: generatedAt,
      createdAt: generatedAt,
      updatedAt: generatedAt
    }));

  const sshTargets: SshTarget[] = Array.from(
    { length: Math.max(8, Math.ceil(copies / 8)) },
    (_, index) => ({
      id: `ssh-${index + 1}`,
      name: `Ops node ${index + 1}`,
      host: `ops-${index + 1}.example.internal`,
      port: 22,
      username: 'deploy',
      authMode: 'ssh-key',
      description: 'Synthetic SSH target for performance smoke coverage.',
      tags: ['ops', 'deploy'],
      commandHints: ['ssh deploy@host', 'journalctl -u app'],
      createdAt: generatedAt
    })
  );

  return {
    ...base,
    contentLibrary,
    publishingQueue,
    followUps,
    opportunities,
    outreachDrafts,
    notes,
    integrationHub: {
      liveFeed: base.integrationHub.liveFeed,
      sshTargets,
      sources: sources as IntegrationSource[],
      artifacts
    }
  };
};
