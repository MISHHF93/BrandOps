/**
 * Workspace export → parallel JSON artifact graph for fusion strings + annotation-ready records.
 * Mirrors `BrandOpsData` in `src/types/domain.ts`. Excludes OAuth tokens and raw embedding vectors by default.
 */

import { asNonNullStr } from './nativeArtifactUtils.mjs';
import {
  extractNativeEmployeeContextFromWorkspaceExport,
  extractNativeProfileFromWorkspaceExport
} from './nativeProfileContext.mjs';
import { extractResumeArtifactRecord } from './nativeResumeArtifacts.mjs';
import { extractWorkContextSegments } from './nativeWorkContext.mjs';

export const STRUCTURED_ARTIFACT_SCHEMA_VERSION = 1;

/** @param {unknown} v */
function str(v) {
  return asNonNullStr(v);
}

/** @param {unknown[]} arr @param {number} max */
function arr(arrIn, max = 2000) {
  return Array.isArray(arrIn) ? arrIn.slice(0, max) : [];
}

/** @template T @param {unknown[]} xs @param {(x: T) => Record<string, unknown>|null} fn @param {number} max */
function mapEntities(xs, fn, max = 500) {
  const out = [];
  for (const x of arr(xs, max)) {
    if (!x || typeof x !== 'object') continue;
    const row = fn(/** @type {T} */ (x));
    if (row && typeof row === 'object') out.push(row);
  }
  return out;
}

function projectBrand(data) {
  const b = data.brand && typeof data.brand === 'object' ? data.brand : {};
  return {
    operatorName: str(b.operatorName),
    positioning: str(b.positioning),
    primaryOffer: str(b.primaryOffer),
    voiceGuide: str(b.voiceGuide),
    focusMetric: str(b.focusMetric)
  };
}

function projectBrandVault(data) {
  const bv = data.brandVault && typeof data.brandVault === 'object' ? data.brandVault : {};
  const list = (k) => arr(bv[k], 80).map((x) => str(x)).filter(Boolean);
  return {
    positioningStatement: str(bv.positioningStatement),
    shortBio: str(bv.shortBio),
    fullAboutSummary: str(bv.fullAboutSummary),
    headlineOptions: list('headlineOptions'),
    serviceOfferings: list('serviceOfferings'),
    collaborationModes: list('collaborationModes'),
    outreachAngles: list('outreachAngles'),
    audienceSegments: list('audienceSegments'),
    expertiseAreas: list('expertiseAreas'),
    industries: list('industries'),
    proofPoints: list('proofPoints'),
    signatureThemes: list('signatureThemes'),
    preferredVoiceNotes: list('preferredVoiceNotes'),
    bannedPhrases: list('bannedPhrases'),
    callsToAction: list('callsToAction'),
    reusableSnippets: list('reusableSnippets'),
    personalNotes: list('personalNotes')
  };
}

function projectModules(data) {
  return mapEntities(
    data.modules,
    (m) => ({
      id: str(m.id),
      title: str(m.title),
      route: str(m.route),
      status: str(m.status)
    }),
    80
  );
}

function projectPublishingQueue(data) {
  return mapEntities(
    data.publishingQueue,
    (p) => ({
      id: str(p.id),
      title: str(p.title),
      status: str(p.status),
      platforms: arr(p.platforms, 8),
      tags: arr(p.tags, 20).map((t) => str(t)),
      scheduledFor: str(p.scheduledFor),
      contentLibraryItemId: str(p.contentLibraryItemId)
    }),
    400
  );
}

function projectContentLibrary(data) {
  return mapEntities(
    data.contentLibrary,
    (c) => ({
      id: str(c.id),
      type: str(c.type),
      title: str(c.title),
      status: str(c.status),
      publishChannel: str(c.publishChannel),
      tags: arr(c.tags, 24).map((t) => str(t)),
      audience: str(c.audience),
      goal: str(c.goal),
      notes: str(c.notes).slice(0, 400)
    }),
    800
  );
}

function projectContacts(data) {
  return mapEntities(
    data.contacts,
    (c) => ({
      id: str(c.id),
      name: str(c.name),
      company: str(c.company),
      role: str(c.role),
      relationshipStage: str(c.relationshipStage),
      source: str(c.source)
    }),
    2000
  );
}

function projectCompanies(data) {
  return mapEntities(
    data.companies,
    (c) => ({
      id: str(c.id),
      name: str(c.name),
      status: str(c.status),
      relationshipStage: str(c.relationshipStage),
      nextAction: str(c.nextAction)
    }),
    2000
  );
}

function projectNotes(data) {
  return mapEntities(
    data.notes,
    (n) => ({
      id: str(n.id),
      entityType: str(n.entityType),
      entityId: str(n.entityId),
      title: str(n.title),
      detail: str(n.detail).slice(0, 500),
      status: str(n.status),
      nextAction: str(n.nextAction)
    }),
    2000
  );
}

function projectOutreachDrafts(data) {
  return mapEntities(
    data.outreachDrafts,
    (d) => ({
      id: str(d.id),
      category: str(d.category),
      targetName: str(d.targetName),
      company: str(d.company),
      role: str(d.role),
      status: str(d.status),
      outreachGoal: str(d.outreachGoal),
      tone: str(d.tone),
      linkedOpportunity: str(d.linkedOpportunity),
      messageBody: str(d.messageBody).slice(0, 600),
      notes: str(d.notes).slice(0, 300)
    }),
    800
  );
}

function projectOutreachTemplates(data) {
  return mapEntities(
    data.outreachTemplates,
    (t) => ({
      id: str(t.id),
      name: str(t.name),
      category: str(t.category)
    }),
    200
  );
}

function projectOutreachHistory(data) {
  return mapEntities(
    data.outreachHistory,
    (h) => ({
      id: str(h.id),
      draftId: str(h.draftId),
      targetName: str(h.targetName),
      company: str(h.company),
      status: str(h.status),
      summary: str(h.summary).slice(0, 400),
      loggedAt: str(h.loggedAt)
    }),
    1200
  );
}

function projectFollowUps(data) {
  return mapEntities(
    data.followUps,
    (f) => ({
      id: str(f.id),
      contactId: str(f.contactId),
      reason: str(f.reason),
      dueAt: str(f.dueAt),
      completed: Boolean(f.completed)
    }),
    1200
  );
}

function projectOpportunities(data) {
  return mapEntities(
    data.opportunities,
    (o) => ({
      id: str(o.id),
      name: str(o.name),
      company: str(o.company),
      role: str(o.role),
      status: str(o.status || o.stage),
      opportunityType: str(o.opportunityType),
      relationshipStage: str(o.relationshipStage),
      nextAction: str(o.nextAction),
      followUpDate: str(o.followUpDate),
      notes: str(o.notes).slice(0, 400),
      valueUsd: typeof o.valueUsd === 'number' ? o.valueUsd : 0,
      confidence: typeof o.confidence === 'number' ? o.confidence : 0,
      contactId: str(o.contactId),
      archivedAt: str(o.archivedAt),
      relatedOutreachDraftIds: arr(o.relatedOutreachDraftIds, 32).map((x) => str(x)),
      relatedContentTags: arr(o.relatedContentTags, 24).map((x) => str(x))
    }),
    1200
  );
}

function projectMessagingVault(data) {
  return mapEntities(
    data.messagingVault,
    (m) => ({
      id: str(m.id),
      category: str(m.category),
      title: str(m.title),
      content: str(m.content).slice(0, 600)
    }),
    600
  );
}

function projectScheduler(data) {
  const sch = data.scheduler && typeof data.scheduler === 'object' ? data.scheduler : {};
  const tasks = mapEntities(
    sch.tasks,
    (t) => ({
      id: str(t.id),
      title: str(t.title),
      detail: str(t.detail).slice(0, 300),
      dueAt: str(t.dueAt),
      status: str(t.status),
      sourceType: str(t.sourceType),
      sourceId: str(t.sourceId)
    }),
    1200
  );
  return {
    updatedAt: str(sch.updatedAt),
    lastHydratedAt: str(sch.lastHydratedAt),
    tasks
  };
}

/** Safe settings slice — never emits OAuth tokens or API keys. */
function projectSettings(data) {
  const s = data.settings && typeof data.settings === 'object' ? data.settings : {};
  const nc = s.notificationCenter && typeof s.notificationCenter === 'object' ? s.notificationCenter : {};
  const op = s.operatingProfile && typeof s.operatingProfile === 'object' ? s.operatingProfile : {};
  const cw =
    s.copilotWorkers && typeof s.copilotWorkers === 'object' ? s.copilotWorkers : {};

  const workers = mapEntities(
    cw.workers,
    (w) => ({
      id: str(w.id),
      name: str(w.name),
      description: str(w.description).slice(0, 280),
      allowedAgentCommands: arr(w.allowedAgentCommands, 40).map((x) => str(x))
    }),
    80
  );

  return {
    timezone: str(s.timezone),
    cockpitLayout: str(s.cockpitLayout),
    cockpitDensity: str(s.cockpitDensity),
    aiAdapterMode: str(s.aiAdapterMode),
    localModelEnabled: Boolean(s.localModelEnabled),
    debugMode: Boolean(s.debugMode),
    notificationCenter: {
      enabled: Boolean(nc.enabled),
      managerialWeight: typeof nc.managerialWeight === 'number' ? nc.managerialWeight : 0,
      workdayStartHour: typeof nc.workdayStartHour === 'number' ? nc.workdayStartHour : 0,
      workdayEndHour: typeof nc.workdayEndHour === 'number' ? nc.workdayEndHour : 24,
      maxDailyTasks: typeof nc.maxDailyTasks === 'number' ? nc.maxDailyTasks : 0,
      aiGuidanceMode: str(nc.aiGuidanceMode),
      preferredModel: str(nc.preferredModel),
      roleContext: str(nc.roleContext).slice(0, 400),
      promptTemplate: str(nc.promptTemplate).slice(0, 400),
      datasetReviewEnabled: Boolean(nc.datasetReviewEnabled)
    },
    operatingProfile: {
      lastAppliedPresetId: op.lastAppliedPresetId == null ? '' : str(op.lastAppliedPresetId)
    },
    copilotWorkers: {
      activeWorkerId: cw.activeWorkerId == null ? '' : str(cw.activeWorkerId),
      workers
    }
  };
}

function projectExternalSync(data) {
  const ex = data.externalSync && typeof data.externalSync === 'object' ? data.externalSync : {};
  const links = mapEntities(
    ex.links,
    (l) => ({
      id: str(l.id),
      provider: str(l.provider),
      resourceType: str(l.resourceType),
      sourceType: str(l.sourceType),
      sourceId: str(l.sourceId),
      lastSyncedAt: str(l.lastSyncedAt)
    }),
    800
  );
  return { updatedAt: str(ex.updatedAt), links };
}

function projectIntegrationHub(data) {
  const hub = data.integrationHub && typeof data.integrationHub === 'object' ? data.integrationHub : {};
  const sources = mapEntities(
    hub.sources,
    (s) => ({
      id: str(s.id),
      name: str(s.name),
      kind: str(s.kind),
      status: str(s.status),
      artifactTypes: arr(s.artifactTypes, 24).map((x) => str(x)),
      tags: arr(s.tags, 24).map((x) => str(x)),
      notes: str(s.notes).slice(0, 240)
    }),
    200
  );
  const artifacts = mapEntities(
    hub.artifacts,
    (a) => ({
      id: str(a.id),
      sourceId: str(a.sourceId),
      title: str(a.title),
      artifactType: str(a.artifactType),
      summary: str(a.summary).slice(0, 360),
      tags: arr(a.tags, 16).map((x) => str(x)),
      syncedAt: str(a.syncedAt)
    }),
    1200
  );
  const liveFeed = mapEntities(
    hub.liveFeed,
    (f) => ({
      source: str(f.source),
      title: str(f.title),
      detail: str(f.detail).slice(0, 240),
      level: str(f.level),
      happenedAt: str(f.happenedAt)
    }),
    200
  );
  const sshTargets = mapEntities(
    hub.sshTargets,
    (t) => ({
      id: str(t.id),
      name: str(t.name),
      host: str(t.host),
      port: typeof t.port === 'number' ? t.port : 0,
      username: str(t.username),
      authMode: str(t.authMode)
    }),
    120
  );
  return { sources, artifacts, liveFeed, sshTargets };
}

function projectSeed(data) {
  const sd = data.seed && typeof data.seed === 'object' ? data.seed : {};
  return {
    seededAt: str(sd.seededAt),
    source: str(sd.source),
    version: str(sd.version),
    onboardingVersion: str(sd.onboardingVersion),
    welcomeCompletedAt: str(sd.welcomeCompletedAt)
  };
}

function projectAgentAudit(data) {
  const a = data.agentAudit?.entries;
  return mapEntities(
    a,
    (e) => ({
      id: str(e.id),
      at: str(e.at),
      source: str(e.source),
      action: str(e.action),
      ok: Boolean(e.ok),
      summary: str(e.summary).slice(0, 320),
      commandPreview: str(e.commandPreview).slice(0, 200)
    }),
    1200
  );
}

function projectOperatorTraces(data) {
  const tr = data.operatorTraces?.entries;
  return mapEntities(
    tr,
    (t) => ({
      id: str(t.id),
      at: str(t.at),
      source: str(t.source),
      verb: str(t.verb),
      surface: str(t.surface),
      route: str(t.route),
      entityType: str(t.entityType),
      entityId: str(t.entityId),
      capabilityId: str(t.capabilityId),
      outcome: str(t.outcome),
      labels: arr(t.labels, 16).map((x) => str(x)),
      annotatorNote: str(t.annotatorNote).slice(0, 240)
    }),
    2400
  );
}

function projectEmbeddingIndex(data, includeVectors) {
  const entries = data.embeddingIndex?.entries;
  return mapEntities(
    entries,
    (e) => {
      const base = {
        id: str(e.id),
        contentLibraryItemId: str(e.contentLibraryItemId),
        modelId: str(e.modelId),
        dims: typeof e.dims === 'number' ? e.dims : 0,
        textFingerprint: str(e.textFingerprint),
        updatedAt: str(e.updatedAt)
      };
      if (includeVectors && Array.isArray(e.vector)) {
        return { ...base, vector: e.vector.map((n) => (typeof n === 'number' ? n : 0)) };
      }
      return base;
    },
    4000
  );
}

/**
 * Cross-entity edges for graph-style annotation (adjacent objects).
 * @param {Record<string, unknown>} structuredSubset expects keys opportunities, outreachDrafts, contacts...
 */
export function buildArtifactGraphEdges(structured) {
  /** @type {Array<{ relation: string, fromKind: string, fromId: string, toKind: string, toId: string }>} */
  const edges = [];

  const opps = Array.isArray(structured.opportunities) ? structured.opportunities : [];
  for (const o of opps) {
    const oid = str(o.id);
    if (!oid) continue;
    const cid = str(o.contactId);
    if (cid) {
      edges.push({
        relation: 'opportunity_contact',
        fromKind: 'opportunity',
        fromId: oid,
        toKind: 'contact',
        toId: cid
      });
    }
    const drafts = Array.isArray(o.relatedOutreachDraftIds) ? o.relatedOutreachDraftIds : [];
    for (const did of drafts) {
      const ds = str(did);
      if (ds)
        edges.push({
          relation: 'opportunity_outreachDraft',
          fromKind: 'opportunity',
          fromId: oid,
          toKind: 'outreachDraft',
          toId: ds
        });
    }
  }

  const fus = Array.isArray(structured.followUps) ? structured.followUps : [];
  for (const f of fus) {
    const fid = str(f.id);
    const cid = str(f.contactId);
    if (fid && cid)
      edges.push({
        relation: 'followUp_contact',
        fromKind: 'followUp',
        fromId: fid,
        toKind: 'contact',
        toId: cid
      });
  }

  const pub = Array.isArray(structured.publishingQueue) ? structured.publishingQueue : [];
  for (const p of pub) {
    const pid = str(p.id);
    const lid = str(p.contentLibraryItemId);
    if (pid && lid)
      edges.push({
        relation: 'publishing_contentLibrary',
        fromKind: 'publishingItem',
        fromId: pid,
        toKind: 'contentLibraryItem',
        toId: lid
      });
  }

  const notes = Array.isArray(structured.activityNotes) ? structured.activityNotes : [];
  for (const n of notes) {
    const nid = str(n.id);
    const et = str(n.entityType);
    const eid = str(n.entityId);
    if (nid && eid && et)
      edges.push({
        relation: 'note_entity',
        fromKind: 'activityNote',
        fromId: nid,
        toKind: et,
        toId: eid
      });
  }

  return edges;
}

/**
 * @param {Record<string, unknown>|null|undefined} workspaceExport
 * @param {{ resumeRaw?: string, resumeFusedText?: string, includeEmbeddingVectors?: boolean }} opts
 */
export function buildNativeStructuredArtifactPackage(workspaceExport, opts = {}) {
  const data = workspaceExport && typeof workspaceExport === 'object' ? workspaceExport : {};
  const resumeRaw = opts.resumeRaw != null ? String(opts.resumeRaw) : '';
  const resumeRec = extractResumeArtifactRecord(resumeRaw);
  const resumeFusedFromOpts = opts.resumeFusedText != null ? str(opts.resumeFusedText) : '';
  const includeVectors = Boolean(opts.includeEmbeddingVectors);

  const structured = {
    brand: projectBrand(data),
    brandVault: projectBrandVault(data),
    modules: projectModules(data),
    publishingQueue: projectPublishingQueue(data),
    contentLibrary: projectContentLibrary(data),
    contacts: projectContacts(data),
    companies: projectCompanies(data),
    activityNotes: projectNotes(data),
    outreachDrafts: projectOutreachDrafts(data),
    outreachTemplates: projectOutreachTemplates(data),
    outreachHistory: projectOutreachHistory(data),
    followUps: projectFollowUps(data),
    opportunities: projectOpportunities(data),
    messagingVault: projectMessagingVault(data),
    scheduler: projectScheduler(data),
    settings: projectSettings(data),
    externalSync: projectExternalSync(data),
    integrationHub: projectIntegrationHub(data),
    seed: projectSeed(data),
    agentAudit: projectAgentAudit(data),
    operatorTraces: projectOperatorTraces(data),
    embeddingIndex: projectEmbeddingIndex(data, includeVectors)
  };

  const graphEdges = buildArtifactGraphEdges(structured);

  const resumeArtifact = {
    ...resumeRec,
    fusedText: resumeFusedFromOpts || resumeRec.fusedText
  };

  const profileBlobFusion = extractNativeEmployeeContextFromWorkspaceExport(data, resumeArtifact.fusedText);
  const segmentTokens = extractWorkContextSegments(data);
  const profileBlobProfileOnly = extractNativeProfileFromWorkspaceExport(data, resumeArtifact.fusedText);

  return {
    schemaVersion: STRUCTURED_ARTIFACT_SCHEMA_VERSION,
    canonicalTypeRef: 'src/types/domain.ts#BrandOpsData',
    generatedAt: new Date().toISOString(),
    fusion: {
      profileBlobEmployeeContext: str(profileBlobFusion),
      profileBlobBrandOnly: str(profileBlobProfileOnly),
      segmentTokens
    },
    resume: resumeArtifact,
    structured,
    graphEdges,
    annotationHints: {
      idPrefixes: {
        opportunity: 'brandops:opportunity:',
        contact: 'brandops:contact:',
        contentLibraryItem: 'brandops:content:',
        publishingItem: 'brandops:publish:',
        activityNote: 'brandops:note:'
      },
      note: 'Attach labels on structured.* rows or graphEdges; fusion strings stay backward-compatible with native MLP.'
    }
  };
}
