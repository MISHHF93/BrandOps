import type { BrandOpsData } from '../../types/domain';
import type {
  OperationalIntelligenceAction,
  OperationalIntelligenceBriefingItem,
  OperationalIntelligenceCoreReadout,
  OperationalIntelligenceGapQuestion,
  OperationalIntelligenceReceiptContext,
  OperationalIntelligenceTone
} from '../../types/operationalIntelligence';
import type {
  WorkspaceDecisionMemoryEntry,
  WorkspaceOpportunitySignal,
  WorkspaceScorecardMetric
} from '../../types/workspaceIntelligence';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import { buildWorkspaceIntelligenceState } from '../workspaceIntelligence/workspaceIntelligence';

export const OPERATIONAL_INTELLIGENCE_SCHEMA_VERSION = '1.0.0';

const GOVERNANCE_POLICY =
  'Operational Intelligence Core can recommend, draft, and prepare plans. It must not save identity-level facts, send messages, publish content, schedule work, sync tools, or mutate external systems without explicit human approval.';

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown, max = 320): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function uniq(values: unknown[], cap = 8): string[] {
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

function toneForScore(value: number): OperationalIntelligenceTone {
  if (value >= 82) return 'success';
  if (value >= 64) return 'primary';
  if (value >= 42) return 'warning';
  return 'muted';
}

function commandFor(input: {
  title: string;
  detail: string;
  why: string;
  evidence: string[];
  source: string;
}): string {
  return `ask: Turn this Operational Intelligence Core recommendation into a PLAN preview only. Do not execute externally or mutate workspace records. Include why it matters, source facts, missing facts, approval needs, risks, next steps, and receipt expectations.\n\nSource: ${input.source}\nTitle: ${input.title}\nDetail: ${input.detail}\nWhy now: ${input.why}\nEvidence: ${input.evidence.join(' | ') || 'No supporting evidence yet'}`;
}

function actionFromOpportunity(signal: WorkspaceOpportunitySignal): OperationalIntelligenceAction {
  return {
    id: `core-${signal.id}`,
    source: 'opportunity-radar',
    title: signal.title,
    detail: signal.detail,
    why: 'Opportunity Radar found a gap or opening in the current workspace state.',
    confidence: signal.confidence,
    expectedImpact: signal.expectedImpact,
    evidence: signal.evidence,
    command: signal.suggestedAction || commandFor({
      title: signal.title,
      detail: signal.detail,
      why: 'Opportunity Radar found a gap or opening in the current workspace state.',
      evidence: signal.evidence,
      source: 'Opportunity Radar'
    }),
    primaryLabel: 'Convert to plan',
    approvalRequired: true,
    tone: signal.expectedImpact === 'high' ? 'success' : 'primary'
  };
}

function lowScoreAction(metric: WorkspaceScorecardMetric): OperationalIntelligenceAction {
  const source = metric.id === 'identity-completeness' ? 'workspace-dna' : 'decision-memory';
  const title =
    metric.id === 'identity-completeness'
      ? 'Strengthen Workspace DNA'
      : metric.id === 'positioning-strength'
        ? 'Approve clearer positioning'
        : metric.id === 'workflow-maturity'
          ? 'Turn repeat work into a reusable PLAN'
          : 'Improve operational readiness';
  const detail = metric.detail || `${metric.label} needs more reviewed workspace evidence.`;
  const why = `${metric.label} is ${metric.value}%, so BrandOps should ask for verified facts before making stronger recommendations.`;
  return {
    id: `core-score-${metric.id}`,
    source,
    title,
    detail,
    why,
    confidence: clampPercent(100 - metric.value),
    expectedImpact: metric.value < 45 ? 'high' : 'medium',
    evidence: [metric.label, detail],
    command: commandFor({
      title,
      detail,
      why,
      evidence: [metric.label, detail],
      source: 'Workspace DNA scorecard'
    }),
    primaryLabel: 'Ask to refine',
    approvalRequired: false,
    tone: toneForScore(metric.value)
  };
}

function buildActions(
  workspace: BrandOpsData,
  opportunities: WorkspaceOpportunitySignal[],
  scorecard: WorkspaceScorecardMetric[],
  decisions: WorkspaceDecisionMemoryEntry[]
): OperationalIntelligenceAction[] {
  const actions: OperationalIntelligenceAction[] = [];
  const pendingApprovals = (workspace.operatorTraces?.entries ?? []).filter(
    (trace) => trace.reviewStatus === 'pending'
  );
  if (pendingApprovals.length) {
    const evidence = pendingApprovals.slice(0, 3).map((trace) => trace.annotatorNote || trace.verb);
    actions.push({
      id: 'core-review-pending-approvals',
      source: 'approval-queue',
      title: 'Clear the approval queue',
      detail: `${pendingApprovals.length} item${pendingApprovals.length === 1 ? '' : 's'} need human review before BrandOps can operate safely.`,
      why: 'PLAN -> OPERATE requires explicit approval before external or state-changing actions.',
      confidence: 94,
      expectedImpact: 'high',
      evidence,
      command: commandFor({
        title: 'Clear the approval queue',
        detail: `${pendingApprovals.length} item${pendingApprovals.length === 1 ? '' : 's'} need human review.`,
        why: 'Execution is blocked until pending approval decisions are reviewed.',
        evidence,
        source: 'Approval Queue'
      }),
      primaryLabel: 'Review queue',
      approvalRequired: true,
      tone: 'warning'
    });
  }

  actions.push(...opportunities.slice(0, 4).map(actionFromOpportunity));

  const weakScores = scorecard
    .filter((metric) => metric.value < 72)
    .sort((a, b) => a.value - b.value)
    .slice(0, 2)
    .map(lowScoreAction);
  actions.push(...weakScores);

  const rejected = decisions.find((decision) => decision.polarity === 'rejected');
  if (rejected) {
    actions.push({
      id: `core-guardrail-${rejected.id}`,
      source: 'decision-memory',
      title: 'Apply rejected decisions as guardrails',
      detail: rejected.title,
      why: 'Rejected memory should constrain future ASK and PLAN outputs instead of being repeated.',
      confidence: rejected.confidence,
      expectedImpact: 'medium',
      evidence: [rejected.reason, rejected.source],
      command: commandFor({
        title: 'Apply rejected decisions as guardrails',
        detail: rejected.title,
        why: 'A rejected decision exists and should steer future outputs away from that pattern.',
        evidence: [rejected.reason, rejected.source],
        source: 'Decision Memory'
      }),
      primaryLabel: 'Ask with guardrail',
      approvalRequired: false,
      tone: 'warning'
    });
  }

  const draftArtifacts = (workspace.aiCore?.artifacts ?? []).filter((artifact) => artifact.status === 'draft');
  if (draftArtifacts.length) {
    const artifact = draftArtifacts[0];
    actions.push({
      id: `core-ai-artifact-${artifact.id}`,
      source: 'ai-core',
      title: 'Review AI Core draft output',
      detail: `${artifact.type}: ${artifact.title}`,
      why: 'Draft artifacts become more useful after a user approves, rejects, or converts them into PLAN.',
      confidence: artifact.confidenceScore,
      expectedImpact: 'medium',
      evidence: artifact.sourceFactsUsed.slice(0, 4),
      command: commandFor({
        title: 'Review AI Core draft output',
        detail: `${artifact.type}: ${artifact.title}`,
        why: 'Draft artifacts need a user decision before becoming durable workspace memory.',
        evidence: artifact.sourceFactsUsed.slice(0, 4),
        source: 'BrandOps AI Core'
      }),
      primaryLabel: 'Review draft',
      approvalRequired: true,
      tone: 'info'
    });
  }

  return actions
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => {
      const impactScore = { high: 3, medium: 2, low: 1 };
      return impactScore[b.expectedImpact] - impactScore[a.expectedImpact] || b.confidence - a.confidence;
    })
    .slice(0, 8);
}

function buildBriefing(
  workspace: BrandOpsData,
  scorecard: WorkspaceScorecardMetric[],
  decisions: WorkspaceDecisionMemoryEntry[],
  opportunities: WorkspaceOpportunitySignal[]
): OperationalIntelligenceBriefingItem[] {
  const activeTwin = getActiveDigitalTwin(workspace);
  const approvedCount = decisions.filter((decision) => decision.polarity === 'approved').length;
  const rejectedCount = decisions.filter((decision) => decision.polarity === 'rejected').length;
  const primaryScore = scorecard[0];
  return [
    {
      id: 'core-briefing-dna',
      label: 'Workspace DNA',
      detail: activeTwin
        ? `${activeTwin.displayName} is the active twin.`
        : primaryScore?.detail || 'Digital twin identity is still being built.',
      evidence: uniq([workspace.brand.positioning, workspace.brand.primaryOffer, activeTwin?.identity.headline], 3),
      tone: primaryScore ? toneForScore(primaryScore.value) : 'muted'
    },
    {
      id: 'core-briefing-decisions',
      label: 'Decision Memory',
      detail: `${approvedCount} approved decision${approvedCount === 1 ? '' : 's'} and ${rejectedCount} rejected guardrail${rejectedCount === 1 ? '' : 's'}.`,
      evidence: decisions.slice(0, 3).map((decision) => decision.title),
      tone: approvedCount || rejectedCount ? 'primary' : 'muted'
    },
    {
      id: 'core-briefing-radar',
      label: 'Opportunity Radar',
      detail: opportunities[0]?.title || 'No high-signal opportunity has enough evidence yet.',
      evidence: opportunities[0]?.evidence ?? [],
      tone: opportunities.length ? 'success' : 'muted'
    }
  ];
}

function buildMissingFactQuestions(workspace: BrandOpsData): OperationalIntelligenceGapQuestion[] {
  const twin = getActiveDigitalTwin(workspace);
  const questions: OperationalIntelligenceGapQuestion[] = [];
  const push = (input: Omit<OperationalIntelligenceGapQuestion, 'command'>) => {
    questions.push({
      ...input,
      command: `ask: Help me answer this missing Operational Intelligence Core question without inventing facts. Tell me why it matters, what evidence is needed, and how it should affect ASK and PLAN.\n\nQuestion: ${input.question}\nWhy it matters: ${input.whyItMatters}`
    });
  };
  if (!twin) {
    push({
      id: 'core-gap-active-twin',
      question: 'Who should BrandOps model as the active digital twin?',
      whyItMatters: 'ASK and PLAN need reviewed identity facts before making professional claims.',
      target: 'digital-twin'
    });
  }
  if (!workspace.brand.primaryOffer.trim()) {
    push({
      id: 'core-gap-primary-offer',
      question: 'What offer should the workspace optimize around?',
      whyItMatters: 'Opportunity Radar needs a concrete offer to rank growth, content, and outreach suggestions.',
      target: 'workspace-dna'
    });
  }
  if (!workspace.brand.positioning.trim()) {
    push({
      id: 'core-gap-positioning',
      question: 'What positioning statement is approved for this workspace?',
      whyItMatters: 'Decision Memory should distinguish approved claims from speculative positioning.',
      target: 'decision-memory'
    });
  }
  if (!workspace.integrationHub.sources.some((source) => source.status === 'connected')) {
    push({
      id: 'core-gap-platform-context',
      question: 'Which connected platforms can BrandOps truthfully use as context?',
      whyItMatters: 'The system must not claim Gmail, LinkedIn, Slack, Notion, Calendar, or CRM access without a connected source.',
      target: 'platform-context'
    });
  }
  return questions.slice(0, 6);
}

function buildReceiptContext(
  workspace: BrandOpsData,
  decisions: WorkspaceDecisionMemoryEntry[]
): OperationalIntelligenceReceiptContext {
  const traces = workspace.operatorTraces?.entries ?? [];
  const audits = workspace.agentAudit?.entries ?? [];
  const latestTrace = traces[0];
  const latestAudit = audits[0];
  return {
    totalReceipts:
      (workspace.aiCore?.artifacts ?? []).filter((artifact) => artifact.auditReceipt).length +
      traces.length +
      audits.length,
    pendingApprovals: traces.filter((trace) => trace.reviewStatus === 'pending').length,
    approvedDecisions: decisions.filter((decision) => decision.polarity === 'approved').length,
    rejectedDecisions: decisions.filter((decision) => decision.polarity === 'rejected').length,
    latestReceiptSummary:
      latestTrace?.annotatorNote ||
      latestTrace?.verb ||
      latestAudit?.summary ||
      'No execution receipt has been recorded yet.'
  };
}

export function buildOperationalIntelligenceReadout(
  workspace: BrandOpsData
): OperationalIntelligenceCoreReadout {
  const intelligence = buildWorkspaceIntelligenceState(workspace);
  const actions = buildActions(
    workspace,
    intelligence.opportunityRadar,
    intelligence.scorecard,
    intelligence.decisionMemory
  );
  const attentionQueue = actions.filter(
    (action) => action.tone === 'warning' || action.tone === 'danger' || action.approvalRequired
  );
  const averageScore = intelligence.scorecard.length
    ? Math.round(intelligence.scorecard.reduce((sum, metric) => sum + metric.value, 0) / intelligence.scorecard.length)
    : 0;
  const nextAction = actions[0]?.title || 'Answer the next missing workspace question';
  return {
    schemaVersion: OPERATIONAL_INTELLIGENCE_SCHEMA_VERSION,
    updatedAt: nowIso(),
    headline: `${averageScore}% operating clarity · ${nextAction}`,
    operatingStance:
      'BrandOps reads Workspace DNA, Decision Memory, Opportunity Radar, approvals, receipts, and AI Core artifacts as one operating layer.',
    dna: intelligence.dna,
    scorecard: intelligence.scorecard,
    decisionMemory: intelligence.decisionMemory,
    opportunityRadar: intelligence.opportunityRadar,
    briefing: buildBriefing(
      workspace,
      intelligence.scorecard,
      intelligence.decisionMemory,
      intelligence.opportunityRadar
    ),
    recommendedActions: actions,
    attentionQueue,
    missingFactQuestions: buildMissingFactQuestions(workspace),
    receiptContext: buildReceiptContext(workspace, intelligence.decisionMemory),
    governancePolicy: GOVERNANCE_POLICY
  };
}
