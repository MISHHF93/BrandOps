import type {
  BrandOpsData,
  ConnectedIdentityEngineState,
  ConnectedIdentitySignal,
  ConnectedIdentitySignalKind,
  ConnectedIdentitySignalSource,
  DigitalTwin
} from '../../types/domain';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';

export interface ConnectedIdentityEngineReadout extends ConnectedIdentityEngineState {
  signalCount: number;
  platformCoverage: string[];
  evolutionSummary: string;
  activeTwinId: string | null;
}

const SENSITIVE_POLICY =
  'Connected Identity Engine is opt-in. BrandOps may derive identity signals from local metadata, summaries, and approved traces, but it must not automatically ingest raw private messages, files, Slack threads, Notion pages, or calendar details.';

const PRIVATE_SOURCES: ConnectedIdentitySignalSource[] = [
  'gmail',
  'google-calendar',
  'slack',
  'notion'
];

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function uniq(items: string[], cap = 24): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = compact(item);
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t.slice(0, 220));
    if (out.length >= cap) break;
  }
  return out;
}

function signal(input: {
  source: ConnectedIdentitySignalSource;
  kind: ConnectedIdentitySignalKind;
  summary: string;
  evidence: string[];
  confidence: number;
  sensitivity?: ConnectedIdentitySignal['sensitivity'];
  lastObservedAt: string;
}): ConnectedIdentitySignal {
  return {
    id: `cis-${input.source}-${input.kind}`,
    source: input.source,
    kind: input.kind,
    summary: compact(input.summary).slice(0, 500),
    evidence: uniq(input.evidence, 8),
    confidence: Math.max(0, Math.min(100, Math.round(input.confidence))),
    sensitivity: input.sensitivity ?? 'metadata_only',
    lastObservedAt: input.lastObservedAt
  };
}

function sourceNames(workspace: BrandOpsData, match: (text: string) => boolean): string[] {
  return workspace.integrationHub.sources
    .filter((source) =>
      match(`${source.kind} ${source.name} ${source.tags.join(' ')}`.toLowerCase())
    )
    .map((source) => source.name);
}

function artifactSummaries(workspace: BrandOpsData, match: (text: string) => boolean): string[] {
  return workspace.integrationHub.artifacts
    .filter((artifact) =>
      match(
        `${artifact.artifactType} ${artifact.title} ${artifact.tags.join(' ')} ${artifact.summary}`.toLowerCase()
      )
    )
    .map((artifact) => `${artifact.title}: ${artifact.summary}`)
    .slice(0, 6);
}

function latestWorkspaceTime(workspace: BrandOpsData): string {
  const candidates = [
    ...workspace.integrationHub.sources.map((source) => source.createdAt),
    ...workspace.integrationHub.artifacts.map((artifact) => artifact.updatedAt),
    ...workspace.contentLibrary.map((item) => item.updatedAt),
    ...workspace.scheduler.tasks.map((task) => task.updatedAt),
    ...(workspace.operatorTraces?.entries ?? []).map((trace) => trace.at)
  ];
  const latest = candidates
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  return latest ? new Date(latest).toISOString() : new Date().toISOString();
}

export function buildConnectedIdentityEngineReadout(
  workspace: BrandOpsData
): ConnectedIdentityEngineReadout {
  const consentGranted = Boolean(workspace.settings.connectedIdentityLearningEnabled);
  const activeTwin = getActiveDigitalTwin(workspace);
  const lastObservedAt = latestWorkspaceTime(workspace);

  if (!consentGranted) {
    return {
      schemaVersion: 1,
      consentGranted: false,
      lastUpdatedAt: workspace.connectedIdentityEngine?.lastUpdatedAt ?? null,
      signals: [],
      signalCount: 0,
      platformCoverage: [],
      evolutionSummary:
        'Connected Identity Engine is off. No platform metadata, communication history, content patterns, calendar patterns, or operational habits are used to evolve the digital twin.',
      activeTwinId: activeTwin?.id ?? null,
      sensitiveDataPolicy: SENSITIVE_POLICY,
      blockedPrivateSources: PRIVATE_SOURCES
    };
  }

  const signals: ConnectedIdentitySignal[] = [];
  const linkedinEvidence = [
    ...sourceNames(workspace, (text) => text.includes('linkedin')),
    ...artifactSummaries(workspace, (text) => text.includes('linkedin')),
    workspace.brand.positioning
  ];
  if (linkedinEvidence.some(Boolean)) {
    signals.push(
      signal({
        source: 'linkedin',
        kind: 'professional_positioning',
        summary: 'LinkedIn-facing positioning should reinforce the active professional identity.',
        evidence: linkedinEvidence,
        confidence: 72,
        sensitivity: 'metadata_only',
        lastObservedAt
      })
    );
  }

  const gmailEvidence = [
    ...artifactSummaries(workspace, (text) => text.includes('email') || text.includes('gmail')),
    ...workspace.outreachTemplates.map((template) => template.name),
    ...workspace.outreachDrafts.map((draft) => `${draft.tone} ${draft.outreachGoal}`)
  ];
  if (gmailEvidence.length) {
    signals.push(
      signal({
        source: 'gmail',
        kind: 'communication_tone',
        summary:
          'Communication tone can be inferred from approved outreach templates, draft goals, and email summaries only.',
        evidence: gmailEvidence,
        confidence: 68,
        sensitivity: 'user_approved_summary',
        lastObservedAt
      })
    );
  }

  const calendarEvidence = [
    ...workspace.scheduler.tasks.map((task) => `${task.sourceType} ${task.status} ${task.title}`),
    `workday ${workspace.settings.notificationCenter.workdayStartHour}:00-${workspace.settings.notificationCenter.workdayEndHour}:00`,
    `${workspace.settings.cadenceFlow.deepWorkBlockCount} deep-work blocks`
  ];
  if (calendarEvidence.length) {
    signals.push(
      signal({
        source: 'google-calendar',
        kind: 'operational_schedule',
        summary:
          'Operational schedule is derived from local scheduler metadata, workday settings, and cadence preferences.',
        evidence: calendarEvidence,
        confidence: 74,
        sensitivity: 'metadata_only',
        lastObservedAt
      })
    );
  }

  const notionEvidence = [
    ...sourceNames(workspace, (text) => text.includes('notion')),
    ...artifactSummaries(workspace, (text) => text.includes('notion') || text.includes('doc')),
    ...workspace.notes.map((note) => `${note.entityType}: ${note.title}`)
  ];
  if (notionEvidence.length) {
    signals.push(
      signal({
        source: 'notion',
        kind: 'knowledge_memory',
        summary:
          'Knowledge and memory should be grounded in approved notes, registered Notion sources, and summarized docs.',
        evidence: notionEvidence,
        confidence: 70,
        sensitivity: 'user_approved_summary',
        lastObservedAt
      })
    );
  }

  const slackEvidence = [
    ...sourceNames(workspace, (text) => text.includes('slack')),
    ...artifactSummaries(workspace, (text) => text.includes('slack') || text.includes('thread')),
    ...(workspace.operatorTraces?.entries ?? [])
      .filter((trace) => trace.surface === 'workspace')
      .map((trace) => trace.verb)
      .slice(0, 8)
  ];
  if (slackEvidence.length) {
    signals.push(
      signal({
        source: 'slack',
        kind: 'team_collaboration_style',
        summary:
          'Collaboration style can be inferred from approved Slack summaries and workspace behavior, not raw team messages.',
        evidence: slackEvidence,
        confidence: 64,
        sensitivity: 'user_approved_summary',
        lastObservedAt
      })
    );
  }

  if (workspace.contentLibrary.length || workspace.publishingQueue.length) {
    signals.push(
      signal({
        source: 'content',
        kind: 'content_pattern',
        summary:
          'Content patterns reflect local content library status, publishing queue, goals, and tags.',
        evidence: [
          ...workspace.contentLibrary.map((item) => `${item.status}: ${item.title}`),
          ...workspace.publishingQueue.map((item) => `${item.status}: ${item.title}`)
        ],
        confidence: 78,
        sensitivity: 'metadata_only',
        lastObservedAt
      })
    );
  }

  if (
    workspace.operatorTraces?.entries?.length &&
    workspace.settings.operatorTraceCollectionEnabled
  ) {
    signals.push(
      signal({
        source: 'workflow',
        kind: 'workflow_behavior',
        summary:
          'Workflow behavior is learned from local operator traces when trace collection remains enabled.',
        evidence: workspace.operatorTraces.entries
          .slice(0, 10)
          .map((trace) => `${trace.verb}${trace.outcome ? ` (${trace.outcome})` : ''}`),
        confidence: 76,
        sensitivity: 'metadata_only',
        lastObservedAt
      })
    );
  }

  const mergedSignals = uniqSignals([
    ...signals,
    ...(workspace.connectedIdentityEngine?.signals ?? [])
  ]);
  return {
    schemaVersion: 1,
    consentGranted: true,
    lastUpdatedAt: lastObservedAt,
    signals: mergedSignals,
    signalCount: mergedSignals.length,
    platformCoverage: uniq(
      mergedSignals.map((item) => item.source),
      12
    ),
    evolutionSummary: mergedSignals.length
      ? `Connected Identity Engine found ${mergedSignals.length} consented signal${mergedSignals.length === 1 ? '' : 's'} that can inform the active digital twin.`
      : 'Connected Identity Engine is enabled, but no approved platform metadata or summaries are available yet.',
    activeTwinId: activeTwin?.id ?? null,
    sensitiveDataPolicy: SENSITIVE_POLICY,
    blockedPrivateSources: PRIVATE_SOURCES
  };
}

function uniqSignals(signals: ConnectedIdentitySignal[]): ConnectedIdentitySignal[] {
  const seen = new Set<string>();
  const out: ConnectedIdentitySignal[] = [];
  for (const item of signals) {
    const key = `${item.source}:${item.kind}:${item.summary.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= 80) break;
  }
  return out;
}

export function evolveActiveTwinFromConnectedIdentity(
  workspace: BrandOpsData,
  now = new Date()
): { workspace: BrandOpsData; signalCount: number; applied: boolean } {
  const readout = buildConnectedIdentityEngineReadout(workspace);
  const twin = getActiveDigitalTwin(workspace);
  if (!readout.consentGranted || !twin || readout.signals.length === 0) {
    return { workspace, signalCount: readout.signals.length, applied: false };
  }

  const signalSummaries = readout.signals.map((item) => `${item.source}: ${item.summary}`);
  const voiceExamples = readout.signals
    .filter(
      (item) => item.kind === 'communication_tone' || item.kind === 'team_collaboration_style'
    )
    .map((item) => item.summary);
  const preferences = readout.signals
    .filter(
      (item) =>
        item.kind === 'operational_schedule' ||
        item.kind === 'workflow_behavior' ||
        item.kind === 'operational_habit'
    )
    .map((item) => item.summary);
  const positioning = readout.signals.find((item) => item.kind === 'professional_positioning');
  const evolvedTwin: DigitalTwin = {
    ...twin,
    updatedAt: now.toISOString(),
    identity: {
      ...twin.identity,
      professionalPositioning:
        twin.identity.professionalPositioning || positioning?.summary || twin.identity.summary
    },
    memory: {
      ...twin.memory,
      facts: uniq([...signalSummaries, ...twin.memory.facts], 100),
      preferences: uniq([...preferences, ...twin.memory.preferences], 60),
      voiceExamples: uniq([...voiceExamples, ...twin.memory.voiceExamples], 30),
      approvedClaims: uniq([...twin.memory.approvedClaims], 80)
    },
    actions: {
      ...twin.actions,
      auditTrail: [
        {
          id: `cie-${Date.now()}`,
          at: now.toISOString(),
          action: 'connected_identity_engine_evolve_twin',
          summary:
            'Applied consented connected-platform metadata and approved summaries to digital twin memory. Raw private data was not ingested automatically.'
        },
        ...twin.actions.auditTrail
      ].slice(0, 120)
    }
  };

  return {
    applied: true,
    signalCount: readout.signals.length,
    workspace: {
      ...workspace,
      connectedIdentityEngine: {
        schemaVersion: 1,
        consentGranted: true,
        lastUpdatedAt: now.toISOString(),
        signals: readout.signals,
        sensitiveDataPolicy: readout.sensitiveDataPolicy,
        blockedPrivateSources: readout.blockedPrivateSources
      },
      digitalTwins: {
        activeTwinId: evolvedTwin.id,
        twins: (workspace.digitalTwins?.twins ?? []).map((item) =>
          item.id === evolvedTwin.id ? evolvedTwin : item
        )
      }
    }
  };
}
