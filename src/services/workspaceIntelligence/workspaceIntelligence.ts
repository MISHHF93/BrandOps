import type { BrandOpsData, DigitalTwin } from '../../types/domain';
import type {
  WorkspaceDecisionMemoryEntry,
  WorkspaceDNA,
  WorkspaceIntelligenceState,
  WorkspaceOperatingManualSection,
  WorkspaceOpportunitySignal,
  WorkspaceScorecardMetric
} from '../../types/workspaceIntelligence';

export const WORKSPACE_INTELLIGENCE_SCHEMA_VERSION = '1.0.0';
export const MAX_WORKSPACE_DECISION_MEMORY = 80;
export const MAX_WORKSPACE_OPPORTUNITIES = 12;

const nowIso = () => new Date().toISOString();

function clean(value: unknown, max = 280): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stableId(prefix: string, value: string): string {
  return `${prefix}-${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item'}`;
}

function uniq(values: unknown[], cap = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const text = clean(value);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= cap) break;
  }
  return out;
}

function activeTwin(workspace: BrandOpsData): DigitalTwin | null {
  const twins = workspace.digitalTwins?.twins ?? [];
  if (!twins.length) return null;
  return twins.find((twin) => twin.id === workspace.digitalTwins?.activeTwinId) ?? twins[0] ?? null;
}

function emptyDna(): WorkspaceDNA {
  return {
    profession: 'Professional operator',
    goals: [],
    audience: [],
    positioning: [],
    workflows: [],
    preferredTone: [],
    strengths: [],
    recurringActivities: [],
    connectedPlatforms: [],
    approvedOutputs: []
  };
}

function normalizeDna(value: unknown): WorkspaceDNA {
  if (!value || typeof value !== 'object') return emptyDna();
  const dna = value as Partial<WorkspaceDNA>;
  return {
    profession: clean(dna.profession, 160) || 'Professional operator',
    goals: uniq(dna.goals ?? [], 16),
    audience: uniq(dna.audience ?? [], 16),
    positioning: uniq(dna.positioning ?? [], 16),
    workflows: uniq(dna.workflows ?? [], 16),
    preferredTone: uniq(dna.preferredTone ?? [], 12),
    strengths: uniq(dna.strengths ?? [], 16),
    recurringActivities: uniq(dna.recurringActivities ?? [], 16),
    connectedPlatforms: uniq(dna.connectedPlatforms ?? [], 16),
    approvedOutputs: uniq(dna.approvedOutputs ?? [], 20)
  };
}

function mergeDna(base: WorkspaceDNA, derived: WorkspaceDNA): WorkspaceDNA {
  return {
    profession:
      derived.profession !== 'Professional operator' ? derived.profession : base.profession,
    goals: uniq([...derived.goals, ...base.goals], 16),
    audience: uniq([...derived.audience, ...base.audience], 16),
    positioning: uniq([...derived.positioning, ...base.positioning], 16),
    workflows: uniq([...derived.workflows, ...base.workflows], 16),
    preferredTone: uniq([...derived.preferredTone, ...base.preferredTone], 12),
    strengths: uniq([...derived.strengths, ...base.strengths], 16),
    recurringActivities: uniq([...derived.recurringActivities, ...base.recurringActivities], 16),
    connectedPlatforms: uniq([...derived.connectedPlatforms, ...base.connectedPlatforms], 16),
    approvedOutputs: uniq([...derived.approvedOutputs, ...base.approvedOutputs], 20)
  };
}

function connectedPlatforms(workspace: BrandOpsData): string[] {
  const sync = workspace.settings.syncHub;
  return uniq(
    [
      ...workspace.integrationHub.sources.map((source) => source.name || source.kind),
      sync.google.connectionStatus === 'connected' ? 'Google' : '',
      sync.github.connectionStatus === 'connected' ? 'GitHub' : '',
      sync.linkedin.connectionStatus === 'connected' ? 'LinkedIn' : ''
    ],
    16
  );
}

function buildDerivedDna(workspace: BrandOpsData): WorkspaceDNA {
  const twin = activeTwin(workspace);
  const approvedArtifacts = (workspace.aiCore?.artifacts ?? [])
    .filter((artifact) => artifact.status === 'approved')
    .map((artifact) => `${artifact.type}: ${artifact.title}`);
  const planArtifactTitles = (workspace.aiCore?.artifacts ?? [])
    .filter((artifact) => artifact.type.includes('plan'))
    .map((artifact) => artifact.title);
  return {
    profession:
      clean(twin?.identity.headline, 160) ||
      clean(workspace.brand.positioning, 160) ||
      'Professional operator',
    goals: uniq(
      [
        ...(twin?.identity.goals ?? []),
        workspace.brand.focusMetric,
        ...workspace.opportunities.slice(0, 4).map((item) => item.nextAction)
      ],
      16
    ),
    audience: uniq(
      [
        twin?.identity.targetAudience,
        workspace.brand.primaryOffer,
        ...workspace.brandVault.audienceSegments,
        ...workspace.contacts.slice(0, 4).map((contact) => `${contact.role} at ${contact.company}`)
      ],
      16
    ),
    positioning: uniq(
      [
        workspace.brand.positioning,
        workspace.brandVault.positioningStatement,
        twin?.identity.professionalPositioning,
        twin?.identity.summary
      ],
      16
    ),
    workflows: uniq(
      [
        ...workspace.outreachTemplates.map((template) => `${template.category} outreach`),
        ...workspace.scheduler.tasks.map((task) => task.sourceType),
        ...planArtifactTitles
      ],
      16
    ),
    preferredTone: uniq(
      [
        workspace.brand.voiceGuide,
        twin?.identity.toneOfVoice,
        ...(twin?.memory.preferences ?? []),
        ...workspace.brandVault.preferredVoiceNotes
      ],
      12
    ),
    strengths: uniq(
      [
        ...(twin?.identity.strengths ?? []),
        ...(twin?.resumeProfile.skills ?? []),
        ...(twin?.identity.differentiators ?? []),
        ...workspace.brandVault.expertiseAreas
      ],
      16
    ),
    recurringActivities: uniq(
      [
        ...workspace.outreachDrafts.map((draft) => `${draft.category} outreach`),
        ...workspace.publishingQueue.map((item) => `${item.platforms.join('/')} publishing`),
        ...workspace.followUps.map(() => 'follow-up management'),
        ...workspace.scheduler.tasks.map((task) => `${task.sourceType} scheduling`)
      ],
      16
    ),
    connectedPlatforms: connectedPlatforms(workspace),
    approvedOutputs: uniq(
      [
        ...approvedArtifacts,
        ...(twin?.actions.generatedAssets ?? []).map((asset) => asset.title),
        ...(twin?.memory.approvedClaims ?? []).slice(0, 8)
      ],
      20
    )
  };
}

function normalizeDecision(value: unknown): WorkspaceDecisionMemoryEntry | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<WorkspaceDecisionMemoryEntry>;
  if (!item.id || !item.title || (item.polarity !== 'approved' && item.polarity !== 'rejected')) {
    return null;
  }
  return {
    id: clean(item.id, 160),
    polarity: item.polarity,
    title: clean(item.title, 220),
    source: clean(item.source, 160) || 'Workspace',
    reason: clean(item.reason, 420),
    confidence: clampPercent(Number(item.confidence ?? 0)),
    createdAt: clean(item.createdAt, 80) || nowIso()
  };
}

function decisionMemoryFromWorkspace(workspace: BrandOpsData): WorkspaceDecisionMemoryEntry[] {
  const rows: WorkspaceDecisionMemoryEntry[] = [];
  const twin = activeTwin(workspace);
  for (const claim of twin?.memory.approvedClaims ?? []) {
    rows.push({
      id: stableId('decision-approved-claim', claim),
      polarity: 'approved',
      title: claim,
      source: 'Digital twin memory',
      reason: 'Approved claim available for future BrandOps outputs.',
      confidence: twin?.confidenceScore ?? 70,
      createdAt: twin?.updatedAt ?? nowIso()
    });
  }
  for (const claim of twin?.memory.rejectedClaims ?? []) {
    rows.push({
      id: stableId('decision-rejected-claim', claim),
      polarity: 'rejected',
      title: claim,
      source: 'Digital twin memory',
      reason: 'Rejected claim should not be repeated in future outputs.',
      confidence: twin?.confidenceScore ?? 70,
      createdAt: twin?.updatedAt ?? nowIso()
    });
  }
  for (const artifact of workspace.aiCore?.artifacts ?? []) {
    if (artifact.status !== 'approved' && artifact.status !== 'rejected') continue;
    rows.push({
      id: stableId(`decision-${artifact.status}`, artifact.id),
      polarity: artifact.status,
      title: `${artifact.type}: ${artifact.title}`,
      source: 'BrandOps AI Core',
      reason:
        artifact.status === 'approved'
          ? 'AI Core artifact approved for future workspace grounding.'
          : 'AI Core artifact rejected and should constrain future output.',
      confidence: artifact.confidenceScore,
      createdAt: artifact.createdAt
    });
  }
  for (const trace of workspace.operatorTraces?.entries ?? []) {
    if (trace.reviewStatus !== 'approved' && trace.reviewStatus !== 'rejected') continue;
    rows.push({
      id: stableId(`decision-trace-${trace.reviewStatus}`, trace.id),
      polarity: trace.reviewStatus,
      title: trace.annotatorNote || trace.verb,
      source: 'Human approval queue',
      reason:
        trace.reviewStatus === 'approved'
          ? 'Human reviewer approved this operating decision.'
          : 'Human reviewer rejected this operating decision.',
      confidence: 88,
      createdAt: trace.at
    });
  }
  return rows;
}

function mergeDecisions(
  persisted: WorkspaceDecisionMemoryEntry[],
  derived: WorkspaceDecisionMemoryEntry[]
): WorkspaceDecisionMemoryEntry[] {
  const byId = new Map<string, WorkspaceDecisionMemoryEntry>();
  for (const item of [...derived, ...persisted]) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_WORKSPACE_DECISION_MEMORY);
}

function scorecard(workspace: BrandOpsData, dna: WorkspaceDNA): WorkspaceScorecardMetric[] {
  const twin = activeTwin(workspace);
  const planArtifactCount =
    workspace.aiCore?.artifacts.filter((artifact) => artifact.type.includes('plan')).length ?? 0;
  const identityCompleteness = clampPercent(
    (workspace.brand.operatorName ? 15 : 0) +
      (workspace.brand.primaryOffer ? 15 : 0) +
      (workspace.brand.voiceGuide ? 15 : 0) +
      (workspace.brand.focusMetric ? 10 : 0) +
      (twin ? 25 : 0) +
      Math.min(20, dna.strengths.length * 3)
  );
  const positioningStrength = clampPercent(
    (workspace.brand.positioning ? 30 : 0) +
      (workspace.brandVault.positioningStatement ? 20 : 0) +
      Math.min(20, dna.audience.length * 4) +
      Math.min(20, dna.approvedOutputs.length * 3) +
      Math.min(10, workspace.aiCore?.artifacts.filter((artifact) => artifact.type === 'positioning statement').length ?? 0)
  );
  const workflowMaturity = clampPercent(
    Math.min(25, dna.workflows.length * 5) +
      Math.min(20, workspace.outreachTemplates.length * 4) +
      Math.min(20, workspace.scheduler.tasks.length * 2) +
      Math.min(20, planArtifactCount * 4) +
      (workspace.operatorTraces?.entries.some((trace) => trace.reviewStatus === 'approved') ? 15 : 0)
  );
  const operationalReadiness = clampPercent(
    (twin ? 20 : 0) +
      Math.min(20, dna.connectedPlatforms.length * 5) +
      Math.min(20, workspace.operatingTimeline?.events.length ?? 0) +
      Math.min(20, workspace.aiCore?.artifacts.length ?? 0) +
      (workspace.operatorTraces?.entries.some((trace) => trace.reviewStatus === 'pending') ? 10 : 20)
  );
  return [
    {
      id: 'identity-completeness',
      label: 'Identity Completeness',
      value: identityCompleteness,
      detail: twin ? `${twin.displayName} is active.` : 'Create a digital twin to strengthen identity.'
    },
    {
      id: 'positioning-strength',
      label: 'Positioning Strength',
      value: positioningStrength,
      detail: dna.positioning[0] || 'Approve a positioning statement to improve future outputs.'
    },
    {
      id: 'workflow-maturity',
      label: 'Workflow Maturity',
      value: workflowMaturity,
      detail: dna.workflows.length
        ? `${dna.workflows.length} reusable workflow signal(s).`
        : 'Convert ASK output into PLAN to establish workflows.'
    },
    {
      id: 'operational-readiness',
      label: 'Operational Readiness',
      value: operationalReadiness,
      detail: dna.connectedPlatforms.length
        ? `${dna.connectedPlatforms.length} platform context signal(s).`
        : 'Connect tools or approve local outputs to improve readiness.'
    }
  ];
}

function opportunityRadar(
  workspace: BrandOpsData,
  dna: WorkspaceDNA,
  decisions: WorkspaceDecisionMemoryEntry[]
): WorkspaceOpportunitySignal[] {
  const signals: WorkspaceOpportunitySignal[] = [];
  const createdAt = nowIso();
  if (dna.positioning.length < 2) {
    signals.push({
      id: 'opp-strengthen-positioning',
      title: 'Clarify the workspace positioning',
      detail: 'BrandOps has limited approved positioning memory. A sharper statement will improve ASK, PLAN, and outreach.',
      expectedImpact: 'high',
      confidence: 78,
      evidence: dna.positioning.slice(0, 3),
      suggestedAction: 'ask: Draft three positioning options using approved workspace DNA and decision memory.',
      createdAt
    });
  }
  if (workspace.publishingQueue.length + workspace.contentLibrary.length < 4 && dna.strengths.length) {
    signals.push({
      id: 'opp-founder-content-series',
      title: 'Create a founder content series',
      detail: 'Strengths exist, but content inventory is thin. Turn approved expertise into a reusable content lane.',
      expectedImpact: 'high',
      confidence: 74,
      evidence: dna.strengths.slice(0, 4),
      suggestedAction: 'ask: Build a founder content series from my Workspace DNA and approved strengths.',
      createdAt
    });
  }
  if (workspace.opportunities.some((item) => item.status !== 'won' && item.status !== 'lost')) {
    signals.push({
      id: 'opp-outreach-cadence',
      title: 'Tighten outreach cadence',
      detail: 'Open opportunities and follow-up signals can become an approval-gated outreach workflow.',
      expectedImpact: 'high',
      confidence: 81,
      evidence: workspace.opportunities.slice(0, 4).map((item) => `${item.company}: ${item.nextAction}`),
      suggestedAction: 'ask: Build an approval-gated outreach cadence from open opportunities and rejected tone constraints.',
      createdAt
    });
  }
  if (dna.connectedPlatforms.length && workspace.operatorTraces?.entries.length) {
    signals.push({
      id: 'opp-operating-playbook',
      title: 'Turn behavior into an operating playbook',
      detail: 'Platform context and operator traces are available. Consolidate recurring behavior into rules the twin can reuse.',
      expectedImpact: 'medium',
      confidence: 72,
      evidence: [...dna.connectedPlatforms.slice(0, 3), `${workspace.operatorTraces.entries.length} trace(s)`],
      suggestedAction: 'ask: Generate my BrandOps Playbook from Workspace DNA, decisions, receipts, and platform context.',
      createdAt
    });
  }
  if (decisions.some((decision) => decision.polarity === 'rejected')) {
    signals.push({
      id: 'opp-avoid-rejected-patterns',
      title: 'Use rejected decisions as guardrails',
      detail: 'Rejected memory exists. Future outputs should explicitly avoid those patterns.',
      expectedImpact: 'medium',
      confidence: 86,
      evidence: decisions.filter((decision) => decision.polarity === 'rejected').slice(0, 4).map((decision) => decision.title),
      suggestedAction: 'ask: Rewrite the next plan while respecting rejected decision memory.',
      createdAt
    });
  }
  return signals.slice(0, MAX_WORKSPACE_OPPORTUNITIES);
}

function operatingManual(
  workspace: BrandOpsData,
  dna: WorkspaceDNA,
  decisions: WorkspaceDecisionMemoryEntry[]
): WorkspaceOperatingManualSection[] {
  const updatedAt = nowIso();
  const approved = decisions.filter((decision) => decision.polarity === 'approved');
  const rejected = decisions.filter((decision) => decision.polarity === 'rejected');
  const sections: WorkspaceOperatingManualSection[] = [
    {
      id: 'positioning',
      title: 'Positioning',
      body:
        dna.positioning[0] ||
        'Positioning is not approved yet. Keep claims conservative until a positioning statement is reviewed.',
      evidenceCount: dna.positioning.length,
      updatedAt
    },
    {
      id: 'audience',
      title: 'Audience',
      body: dna.audience.length
        ? `Primary audience signals: ${dna.audience.slice(0, 4).join('; ')}.`
        : 'Audience definition is still weak. Buyer persona approval should be prioritized.',
      evidenceCount: dna.audience.length,
      updatedAt
    },
    {
      id: 'workflows',
      title: 'Workflows',
      body: dna.workflows.length
        ? `Recurring operating patterns: ${dna.workflows.slice(0, 5).join('; ')}.`
        : 'No reusable workflow has enough evidence yet. Convert a PLAN into an approved workflow.',
      evidenceCount: dna.workflows.length,
      updatedAt
    },
    {
      id: 'voice-rules',
      title: 'Voice and Decision Rules',
      body: [
        dna.preferredTone[0] ? `Preferred tone: ${dna.preferredTone[0]}.` : '',
        approved.length ? `Approved decisions: ${approved.slice(0, 3).map((item) => item.title).join('; ')}.` : '',
        rejected.length ? `Avoid: ${rejected.slice(0, 3).map((item) => item.title).join('; ')}.` : ''
      ]
        .filter(Boolean)
        .join(' ') || 'Voice rules become stronger as outputs are approved or rejected.',
      evidenceCount: dna.preferredTone.length + decisions.length,
      updatedAt
    },
    {
      id: 'operating-context',
      title: 'Operating Context',
      body: dna.connectedPlatforms.length
        ? `Connected context: ${dna.connectedPlatforms.join(', ')}. External execution remains approval-gated.`
        : 'No connected platform context is active yet. BrandOps will operate from local workspace memory.',
      evidenceCount: dna.connectedPlatforms.length + (workspace.operatingTimeline?.events.length ?? 0),
      updatedAt
    }
  ];
  return sections;
}

export function normalizeWorkspaceIntelligenceState(value: unknown): WorkspaceIntelligenceState {
  const fallback: WorkspaceIntelligenceState = {
    schemaVersion: WORKSPACE_INTELLIGENCE_SCHEMA_VERSION,
    updatedAt: nowIso(),
    dna: emptyDna(),
    decisionMemory: [],
    opportunityRadar: [],
    scorecard: [
      {
        id: 'identity-completeness',
        label: 'Identity Completeness',
        value: 0,
        detail: 'Create a digital twin to strengthen identity.'
      },
      {
        id: 'positioning-strength',
        label: 'Positioning Strength',
        value: 0,
        detail: 'Approve a positioning statement to improve future outputs.'
      },
      {
        id: 'workflow-maturity',
        label: 'Workflow Maturity',
        value: 0,
        detail: 'Convert ASK output into PLAN to establish workflows.'
      },
      {
        id: 'operational-readiness',
        label: 'Operational Readiness',
        value: 0,
        detail: 'Connect tools or approve local outputs to improve readiness.'
      }
    ],
    operatingManual: []
  };
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as Partial<WorkspaceIntelligenceState>;
  const decisionMemory = Array.isArray(raw.decisionMemory)
    ? raw.decisionMemory.map(normalizeDecision).filter((item): item is WorkspaceDecisionMemoryEntry => Boolean(item))
    : [];
  const opportunityRadar = Array.isArray(raw.opportunityRadar)
    ? raw.opportunityRadar
        .map((item): WorkspaceOpportunitySignal | null => {
          if (!item || typeof item !== 'object') return null;
          const rawItem = item as Partial<WorkspaceOpportunitySignal>;
          if (!rawItem.id || !rawItem.title) return null;
          return {
            id: clean(rawItem.id, 160),
            title: clean(rawItem.title, 220),
            detail: clean(rawItem.detail, 700),
            expectedImpact:
              rawItem.expectedImpact === 'low' || rawItem.expectedImpact === 'medium'
                ? rawItem.expectedImpact
                : 'high',
            confidence: clampPercent(Number(rawItem.confidence ?? 0)),
            evidence: uniq(rawItem.evidence ?? [], 8),
            suggestedAction: clean(rawItem.suggestedAction, 600),
            createdAt: clean(rawItem.createdAt, 80) || nowIso()
          };
        })
        .filter((item): item is WorkspaceOpportunitySignal => Boolean(item))
    : [];
  const scorecardRows = Array.isArray(raw.scorecard)
    ? raw.scorecard
        .map((item): WorkspaceScorecardMetric | null => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Partial<WorkspaceScorecardMetric>;
          if (
            row.id !== 'identity-completeness' &&
            row.id !== 'positioning-strength' &&
            row.id !== 'workflow-maturity' &&
            row.id !== 'operational-readiness'
          ) {
            return null;
          }
          return {
            id: row.id,
            label: clean(row.label, 120),
            value: clampPercent(Number(row.value ?? 0)),
            detail: clean(row.detail, 320)
          };
        })
        .filter((item): item is WorkspaceScorecardMetric => Boolean(item))
    : [];
  const operatingManualRows = Array.isArray(raw.operatingManual)
    ? raw.operatingManual
        .map((item): WorkspaceOperatingManualSection | null => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Partial<WorkspaceOperatingManualSection>;
          if (!row.id || !row.title) return null;
          return {
            id: clean(row.id, 120),
            title: clean(row.title, 180),
            body: clean(row.body, 900),
            evidenceCount: Math.max(0, Math.round(Number(row.evidenceCount ?? 0))),
            updatedAt: clean(row.updatedAt, 80) || nowIso()
          };
        })
        .filter((item): item is WorkspaceOperatingManualSection => Boolean(item))
    : [];
  return {
    schemaVersion: WORKSPACE_INTELLIGENCE_SCHEMA_VERSION,
    updatedAt: clean(raw.updatedAt, 80) || nowIso(),
    dna: normalizeDna(raw.dna),
    decisionMemory: decisionMemory.slice(0, MAX_WORKSPACE_DECISION_MEMORY),
    opportunityRadar: opportunityRadar.slice(0, MAX_WORKSPACE_OPPORTUNITIES),
    scorecard: scorecardRows,
    operatingManual: operatingManualRows
  };
}

export function buildWorkspaceIntelligenceState(workspace: BrandOpsData): WorkspaceIntelligenceState {
  const persisted = normalizeWorkspaceIntelligenceState(workspace.workspaceIntelligence);
  const dna = mergeDna(persisted.dna, buildDerivedDna(workspace));
  const decisions = mergeDecisions(persisted.decisionMemory, decisionMemoryFromWorkspace(workspace));
  return {
    schemaVersion: WORKSPACE_INTELLIGENCE_SCHEMA_VERSION,
    updatedAt: nowIso(),
    dna,
    decisionMemory: decisions,
    opportunityRadar: opportunityRadar(workspace, dna, decisions),
    scorecard: scorecard(workspace, dna),
    operatingManual: operatingManual(workspace, dna, decisions)
  };
}

export function refreshWorkspaceIntelligence(workspace: BrandOpsData): BrandOpsData {
  return {
    ...workspace,
    workspaceIntelligence: buildWorkspaceIntelligenceState(workspace)
  };
}
