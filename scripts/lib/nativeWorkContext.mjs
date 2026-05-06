/**
 * Deterministic “employee AI” work snapshot from BrandOps workspace export JSON.
 * Covers all major BrandOpsData domains as prefixed segments (`pipeline:`, `vaultstmt:`, …).
 */

import { asNonNullStr, joinArtifactParts } from './nativeArtifactUtils.mjs';

/** Hard cap before join; segment attention reads first N slots from full blob (see nativeTinyMlp). */
const MAX_SEGMENTS = 80;

function slim(s, max) {
  return asNonNullStr(s).replace(/\s+/g, ' ').slice(0, max);
}

function takeListStrings(arr, maxItems) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => asNonNullStr(x)).filter(Boolean).slice(0, maxItems);
}

function pushBrandVaultSegments(data, out) {
  const bv = data.brandVault && typeof data.brandVault === 'object' ? data.brandVault : null;
  if (!bv) return;

  const stmt = slim(bv.positioningStatement, 220);
  if (stmt) out.push(`vaultstmt:${stmt}`);

  const about = slim(bv.fullAboutSummary, 180);
  if (about) out.push(`vaultabout:${about}`);

  const bio = slim(bv.shortBio, 160);
  if (bio) out.push(`vaultbio:${bio}`);

  const exp = takeListStrings(bv.expertiseAreas, 10).join('; ');
  if (exp) out.push(`vaultexpert:${slim(exp, 200)}`);

  const svc = takeListStrings(bv.serviceOfferings, 8).join('; ');
  if (svc) out.push(`vaultsvc:${slim(svc, 200)}`);

  const ind = takeListStrings(bv.industries, 8).join('; ');
  if (ind) out.push(`vaultindustry:${slim(ind, 180)}`);

  const proof = takeListStrings(bv.proofPoints, 5).join('; ');
  if (proof) out.push(`vaultproof:${slim(proof, 200)}`);

  const angles = takeListStrings(bv.outreachAngles, 6).join('; ');
  if (angles) out.push(`vaultangles:${slim(angles, 180)}`);

  const headlines = takeListStrings(bv.headlineOptions, 4).join(' | ');
  if (headlines) out.push(`vaultheadlines:${slim(headlines, 200)}`);

  const snippets = takeListStrings(bv.reusableSnippets, 3).join('; ');
  if (snippets) out.push(`vaultsnippet:${slim(snippets, 160)}`);
}

/** @param {Record<string, unknown>} data */
export function summarizeNativeWorkArtifacts(data) {
  const segments = extractWorkContextSegments(data);
  /** @type {Record<string, number>} */
  const byPrefix = {};
  for (const s of segments) {
    const px = (s.split(':')[0] || 'unknown').trim();
    byPrefix[px] = (byPrefix[px] || 0) + 1;
  }
  return { segmentCount: segments.length, byPrefix };
}

/**
 * @param {Record<string, unknown>} data workspace export root (`BrandOpsData`-shaped)
 * @returns {string[]} labeled snippets — always an array; entries are non-empty strings.
 */
export function extractWorkContextSegments(data) {
  if (!data || typeof data !== 'object') return [];

  /** @type {string[]} */
  const out = [];

  pushBrandVaultSegments(data, out);

  const mods = Array.isArray(data.modules) ? data.modules : [];
  const activeModIds = mods
    .filter((m) => m && typeof m === 'object' && m.status === 'active')
    .map((m) => asNonNullStr(m.id))
    .filter(Boolean);
  if (activeModIds.length)
    out.push(`modules:${slim(activeModIds.slice(0, 14).join(';'), 220)}`);

  const preset = data.settings?.operatingProfile?.lastAppliedPresetId;
  const presetStr = preset == null ? '' : asNonNullStr(preset);
  if (presetStr) out.push(`cadence:${slim(presetStr, 80)}`);

  const nc = data.settings?.notificationCenter;
  if (nc && typeof nc === 'object') {
    const guidance = asNonNullStr(nc.aiGuidanceMode);
    const mw = nc.managerialWeight;
    const hint = joinArtifactParts([
      guidance || undefined,
      typeof mw === 'number' && !Number.isNaN(mw) ? `weight ${mw}%` : ''
    ]);
    if (hint) out.push(`notifyctx:${slim(hint, 120)}`);
  }

  const workers = data.settings?.copilotWorkers?.workers;
  if (Array.isArray(workers)) {
    for (const w of workers.slice(0, 4)) {
      if (!w || typeof w !== 'object') continue;
      const line = joinArtifactParts([w.name, w.description]);
      if (line) out.push(`copilot:${slim(line, 160)}`);
    }
  }

  const opps = Array.isArray(data.opportunities) ? data.opportunities : [];
  const active = opps.filter((o) => o && typeof o === 'object' && !o.archivedAt).slice(0, 6);
  for (const o of active) {
    const bit = joinArtifactParts([
      o.name,
      o.company,
      o.role,
      o.status || o.stage,
      o.opportunityType,
      typeof o.valueUsd === 'number' && o.valueUsd > 0 ? `$${Math.round(o.valueUsd)}` : '',
      o.nextAction && slim(o.nextAction, 64)
    ]);
    if (bit) out.push(`pipeline:${slim(bit, 220)}`);
  }

  const contacts = Array.isArray(data.contacts) ? data.contacts : [];
  for (const c of contacts.slice(0, 6)) {
    if (!c || typeof c !== 'object') continue;
    const line = joinArtifactParts([c.name, c.company, c.role, c.relationshipStage]);
    if (line) out.push(`contact:${slim(line, 170)}`);
  }

  const companies = Array.isArray(data.companies) ? data.companies : [];
  for (const co of companies.filter((c) => c && c.status !== 'archived').slice(0, 6)) {
    const line = joinArtifactParts([co.name, co.status, co.nextAction]);
    if (line) out.push(`company:${slim(line, 170)}`);
  }

  const pub = Array.isArray(data.publishingQueue) ? data.publishingQueue : [];
  for (const p of pub.slice(0, 5)) {
    if (p?.title) {
      const extra = joinArtifactParts([p.status, Array.isArray(p.platforms) ? p.platforms.join(',') : '']);
      const line = extra ? `${slim(p.title, 100)} · ${extra}` : slim(p.title, 120);
      out.push(`publish:${slim(line, 140)}`);
    }
  }

  const lib = Array.isArray(data.contentLibrary) ? data.contentLibrary : [];
  for (const c of lib.slice(0, 6)) {
    const title = asNonNullStr(c?.title);
    if (title) {
      const tags = Array.isArray(c?.tags) ? takeListStrings(c.tags, 4).join(', ') : '';
      const tail = joinArtifactParts([c?.status, c?.type, tags]);
      const line = tail ? `${slim(title, 90)} · ${tail}` : slim(title, 130);
      out.push(`content:${slim(line, 150)}`);
    }
  }

  const follows = Array.isArray(data.followUps) ? data.followUps : [];
  const openFu = follows.filter((f) => f && !f.completed).slice(0, 5);
  for (const f of openFu) {
    const line = joinArtifactParts([f.reason, f.dueAt]);
    if (line) out.push(`followup:${slim(line, 120)}`);
  }

  const drafts = Array.isArray(data.outreachDrafts) ? data.outreachDrafts : [];
  for (const d of drafts.slice(0, 4)) {
    if (!d || typeof d !== 'object') continue;
    const line = joinArtifactParts([
      d.targetName,
      d.company,
      d.category,
      d.outreachGoal,
      d.status,
      d.role
    ]);
    if (line) out.push(`draft:${slim(line, 170)}`);
  }

  const templates = Array.isArray(data.outreachTemplates) ? data.outreachTemplates : [];
  for (const t of templates.slice(0, 5)) {
    if (!t?.name) continue;
    const line = joinArtifactParts([t.name, t.category]);
    if (line) out.push(`template:${slim(line, 130)}`);
  }

  const hist = Array.isArray(data.outreachHistory) ? data.outreachHistory : [];
  for (const h of hist.slice(-5)) {
    if (!h || typeof h !== 'object') continue;
    const line = joinArtifactParts([h.targetName, h.company, h.status, h.summary]);
    if (line) out.push(`outreach_hist:${slim(line, 180)}`);
  }

  const msgVault = Array.isArray(data.messagingVault) ? data.messagingVault : [];
  for (const m of msgVault.slice(0, 5)) {
    if (!m || typeof m !== 'object') continue;
    const line = joinArtifactParts([m.title, m.category]);
    if (line) out.push(`msgvault:${slim(line, 140)}`);
  }

  const tasks = data.scheduler?.tasks;
  if (Array.isArray(tasks)) {
    const open = tasks
      .filter(
        (t) =>
          t &&
          t.status !== 'completed' &&
          t.status !== 'cancelled'
      )
      .slice(0, 7);
    for (const t of open) {
      const line = joinArtifactParts([t.title, t.detail, t.status, t.sourceType, t.dueAt]);
      if (line) out.push(`scheduler:${slim(line, 170)}`);
    }
  }

  const hub = data.integrationHub;
  if (hub && typeof hub === 'object') {
    const sources = Array.isArray(hub.sources) ? hub.sources : [];
    for (const s of sources.slice(0, 6)) {
      if (!s || typeof s !== 'object') continue;
      const line = joinArtifactParts([s.name, s.kind, s.status]);
      if (line) out.push(`integrationsrc:${slim(line, 170)}`);
    }
    const arts = Array.isArray(hub.artifacts) ? hub.artifacts : [];
    for (const a of arts.slice(-6)) {
      if (!a || typeof a !== 'object') continue;
      const line = joinArtifactParts([a.title, a.artifactType, a.summary]);
      if (line) out.push(`integrationart:${slim(line, 180)}`);
    }
  }

  const syncLinks = data.externalSync?.links;
  if (Array.isArray(syncLinks) && syncLinks.length > 0) {
    out.push(`sync:${syncLinks.length} connected provider link(s)`);
  }

  const audit = data.agentAudit?.entries;
  if (Array.isArray(audit)) {
    for (const e of audit.slice(-6)) {
      if (!e || typeof e !== 'object') continue;
      const line = joinArtifactParts([
        e.action,
        e.summary,
        e.ok === false ? 'failed' : '',
        e.source
      ]);
      if (line) out.push(`audit:${slim(line, 180)}`);
    }
  }

  const traces = data.operatorTraces?.entries;
  if (Array.isArray(traces)) {
    for (const t of traces.slice(-8)) {
      if (!t || typeof t !== 'object') continue;
      const det =
        t.details && typeof t.details === 'object'
          ? Object.values(t.details)
              .slice(0, 2)
              .map((v) => (v == null ? '' : String(v)))
              .filter(Boolean)
              .join(' ')
          : '';
      const line = joinArtifactParts([t.verb, t.surface, t.entityType, det]);
      if (line) out.push(`trace:${slim(line, 150)}`);
    }
  }

  const notes = Array.isArray(data.notes) ? data.notes : [];
  for (const n of notes.slice(-5)) {
    if (!n || typeof n !== 'object') continue;
    const blob = slim(joinArtifactParts([n.title, n.detail, n.entityType]), 160);
    if (blob) out.push(`note:${blob}`);
  }

  const emb = data.embeddingIndex?.entries;
  if (Array.isArray(emb) && emb.length > 0) {
    const models = [
      ...new Set(emb.map((e) => asNonNullStr(e?.modelId)).filter(Boolean))
    ].slice(0, 5);
    const tail = models.length ? models.join(', ') : 'local index';
    out.push(`embeddings:${emb.length} entries · ${tail}`);
  }

  const filtered = out.filter((s) => typeof s === 'string' && s.length > 0);
  return filtered.slice(0, MAX_SEGMENTS);
}
