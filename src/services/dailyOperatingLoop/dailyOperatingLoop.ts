import { quoteContextValue } from '../../services/interop/validation';
import type { BrandOpsData, Contact, Opportunity } from '../../types/domain';
import type {
  ChiefOfStaffAlert,
  DailyBriefingMetric,
  DailyOperatingLoopReadout,
  DailyOperatingLoopTimeframe,
  EndOfDayReflection,
  RelationshipMemorySignal,
  StrategicGap,
  WorkspaceEvolutionEvent,
  WorkspaceHealthCategory,
  WorkspaceHealthScore
} from '../../types/dailyOperatingLoop';
import type {
  OperationalIntelligenceAction,
  OperationalIntelligenceCoreReadout,
  OperationalIntelligenceTone
} from '../../types/operationalIntelligence';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import { buildOperationalIntelligenceReadout } from '../operationalIntelligence/operationalIntelligence';

const DAILY_OPERATING_LOOP_SCHEMA_VERSION = '1.0.0';

const GOVERNANCE_POLICY =
  'Daily Operating Loop is a readout and planning layer. It can recommend priorities, ask clarifying questions, and prepare PLAN drafts, but external actions still require ASK -> PLAN -> approval -> receipt.';

function nowIso(): string {
  return new Date().toISOString();
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clean(value: unknown, max = 260): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
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

function scoreTone(value: number): OperationalIntelligenceTone {
  if (value >= 82) return 'success';
  if (value >= 64) return 'primary';
  if (value >= 42) return 'warning';
  return 'muted';
}

function alertCommand(title: string, detail: string, evidence: string[]): string {
  return `ask: Act as BrandOps AI Chief of Staff. Review this daily operating alert and turn it into a PLAN preview only. Do not execute externally. Include why it matters, source facts, risks, next steps, approval needs, and receipt expectations.\n\nAlert: ${quoteContextValue(title)}\nDetail: ${quoteContextValue(detail)}\nEvidence: ${quoteContextValue(evidence.join(' | ') || 'No evidence attached')}`;
}

function gapCommand(title: string, missing: string, why: string): string {
  return `ask: Help me close this BrandOps strategic gap without inventing facts. Create a PLAN-ready preview with questions, source facts needed, safe draft steps, and approval requirements.\n\nGap: ${quoteContextValue(title)}\nMissing: ${quoteContextValue(missing)}\nWhy it matters: ${quoteContextValue(why)}`;
}

function isActiveOpportunity(item: Opportunity): boolean {
  return !item.archivedAt && item.status !== 'won' && item.status !== 'lost';
}

function daysSince(value: string): number {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function isToday(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function timeframeFor(date = new Date()): DailyOperatingLoopTimeframe {
  const hour = date.getHours();
  if (hour < 11) return 'morning';
  if (hour < 17) return 'midday';
  return 'evening';
}

function metric(input: DailyBriefingMetric): DailyBriefingMetric {
  return input;
}

function buildMetrics(
  workspace: BrandOpsData,
  core: OperationalIntelligenceCoreReadout
): DailyBriefingMetric[] {
  const activeOpportunities = workspace.opportunities.filter(isActiveOpportunity);
  const pendingApprovals = (workspace.operatorTraces?.entries ?? []).filter(
    (trace) => trace.reviewStatus === 'pending'
  );
  const overdueFollowUps = workspace.followUps.filter(
    (item) => !item.completed && new Date(item.dueAt).getTime() < Date.now()
  );
  const stalledTasks = workspace.scheduler.tasks.filter((task) => task.status === 'missed');
  return [
    metric({
      id: 'opportunities',
      label: 'Opportunities detected',
      value: Math.max(core.opportunityRadar.length, activeOpportunities.length),
      detail:
        core.opportunityRadar[0]?.title ||
        activeOpportunities[0]?.nextAction ||
        'No high-signal opportunity yet.',
      tone: activeOpportunities.length || core.opportunityRadar.length ? 'success' : 'muted'
    }),
    metric({
      id: 'approvals',
      label: 'Approvals pending',
      value: pendingApprovals.length,
      detail:
        pendingApprovals[0]?.annotatorNote ||
        pendingApprovals[0]?.verb ||
        'No approval is blocking execution.',
      tone: pendingApprovals.length ? 'warning' : 'success'
    }),
    metric({
      id: 'stalled-workflows',
      label: 'Workflows stalled',
      value: overdueFollowUps.length + stalledTasks.length,
      detail:
        overdueFollowUps[0]?.reason || stalledTasks[0]?.title || 'No stalled workflow detected.',
      tone: overdueFollowUps.length + stalledTasks.length ? 'warning' : 'success'
    })
  ];
}

function category(input: WorkspaceHealthCategory): WorkspaceHealthCategory {
  return input;
}

function scoreFromCore(
  core: OperationalIntelligenceCoreReadout,
  id: string,
  fallback: number
): number {
  return core.scorecard.find((item) => item.id === id)?.value ?? fallback;
}

function buildWorkspaceHealth(
  workspace: BrandOpsData,
  core: OperationalIntelligenceCoreReadout
): WorkspaceHealthScore {
  const connectedCount =
    workspace.integrationHub.sources.filter((source) => source.status === 'connected').length +
    [
      workspace.settings.syncHub.google,
      workspace.settings.syncHub.github,
      workspace.settings.syncHub.linkedin
    ].filter((provider) => provider.connectionStatus === 'connected').length;
  const activeTwin = getActiveDigitalTwin(workspace);
  const categories: WorkspaceHealthCategory[] = [
    category({
      id: 'positioning',
      label: 'Positioning',
      score: scoreFromCore(core, 'positioning-strength', workspace.brand.positioning ? 66 : 28),
      detail: core.dna.positioning[0] || 'No approved positioning statement yet.',
      improvement: 'Approve a positioning statement and reuse it across ASK and PLAN.',
      tone: scoreTone(
        scoreFromCore(core, 'positioning-strength', workspace.brand.positioning ? 66 : 28)
      )
    }),
    category({
      id: 'audience',
      label: 'Audience',
      score: clampPercent(30 + core.dna.audience.length * 12 + workspace.contacts.length * 2),
      detail: core.dna.audience[0] || 'Audience memory is still thin.',
      improvement: 'Create buyer persona memory or add stronger audience segments.',
      tone: scoreTone(
        clampPercent(30 + core.dna.audience.length * 12 + workspace.contacts.length * 2)
      )
    }),
    category({
      id: 'content',
      label: 'Content',
      score: clampPercent(
        24 +
          workspace.contentLibrary.length * 7 +
          workspace.publishingQueue.length * 9 +
          workspace.brandVault.signatureThemes.length * 5
      ),
      detail:
        workspace.publishingQueue[0]?.title ||
        workspace.contentLibrary[0]?.title ||
        'No active content lane yet.',
      improvement: 'Turn one opportunity into a content series or approved content calendar.',
      tone: scoreTone(
        clampPercent(
          24 +
            workspace.contentLibrary.length * 7 +
            workspace.publishingQueue.length * 9 +
            workspace.brandVault.signatureThemes.length * 5
        )
      )
    }),
    category({
      id: 'outreach',
      label: 'Outreach',
      score: clampPercent(
        26 +
          workspace.outreachTemplates.length * 12 +
          workspace.outreachDrafts.length * 5 +
          workspace.opportunities.filter(isActiveOpportunity).length * 6
      ),
      detail:
        workspace.outreachDrafts[0]?.outreachGoal ||
        workspace.opportunities.find(isActiveOpportunity)?.nextAction ||
        'No outreach strategy yet.',
      improvement: 'Create an approval-gated outreach workflow for the highest-value relationship.',
      tone: scoreTone(
        clampPercent(
          26 +
            workspace.outreachTemplates.length * 12 +
            workspace.outreachDrafts.length * 5 +
            workspace.opportunities.filter(isActiveOpportunity).length * 6
        )
      )
    }),
    category({
      id: 'operations',
      label: 'Operations',
      score: scoreFromCore(core, 'operational-readiness', 50),
      detail: core.receiptContext.latestReceiptSummary,
      improvement: 'Clear approvals and convert repeat work into reusable PLANs.',
      tone: scoreTone(scoreFromCore(core, 'operational-readiness', 50))
    }),
    category({
      id: 'integrations',
      label: 'Integrations',
      score: clampPercent(22 + connectedCount * 18),
      detail: connectedCount
        ? `${connectedCount} connected context source${connectedCount === 1 ? '' : 's'}.`
        : 'No connected app context.',
      improvement: 'Connect only the tools BrandOps can truthfully use for context.',
      tone: scoreTone(clampPercent(22 + connectedCount * 18))
    }),
    category({
      id: 'memory',
      label: 'Memory',
      score: clampPercent(
        28 + core.decisionMemory.length * 4 + (activeTwin?.memory.approvedClaims.length ?? 0) * 5
      ),
      detail: core.decisionMemory[0]?.title || 'Decision memory is just starting.',
      improvement: 'Approve, reject, or save useful outputs so tomorrow gets smarter.',
      tone: scoreTone(
        clampPercent(
          28 + core.decisionMemory.length * 4 + (activeTwin?.memory.approvedClaims.length ?? 0) * 5
        )
      )
    })
  ];
  const score = clampPercent(
    categories.reduce((sum, item) => sum + item.score, 0) / categories.length
  );
  return {
    score,
    label:
      score >= 82
        ? 'Strong operating rhythm'
        : score >= 64
          ? 'Growing operating system'
          : 'Needs daily grounding',
    categories
  };
}

function buildStrategicGaps(
  workspace: BrandOpsData,
  core: OperationalIntelligenceCoreReadout
): StrategicGap[] {
  const artifacts = workspace.aiCore?.artifacts ?? [];
  const gaps: StrategicGap[] = [];
  const push = (gap: StrategicGap) => gaps.push(gap);
  if (
    !artifacts.some((artifact) => artifact.type === 'buyer persona') &&
    core.dna.audience.length < 2
  ) {
    push({
      id: 'gap-buyer-persona',
      title: 'Buyer Persona',
      missing: 'Approved buyer persona or audience memory',
      whyItMatters:
        'Priorities, content, and outreach need a clear audience to avoid generic recommendations.',
      recommendedFix: 'Generate a buyer persona from Workspace DNA and review it before saving.',
      command: gapCommand(
        'Buyer Persona',
        'Approved buyer persona or audience memory',
        'Audience clarity improves every daily recommendation.'
      )
    });
  }
  if (!workspace.outreachTemplates.length && !workspace.outreachDrafts.length) {
    push({
      id: 'gap-outreach-strategy',
      title: 'Outreach Strategy',
      missing: 'Reusable outreach template or approval-gated sequence',
      whyItMatters: 'Relationship opportunities stall when follow-up strategy is not explicit.',
      recommendedFix: 'Create a reusable outreach workflow in PLAN.',
      command: gapCommand(
        'Outreach Strategy',
        'Reusable outreach template or sequence',
        'Outreach needs a repeatable approval-gated path.'
      )
    });
  }
  if (!workspace.brandVault.signatureThemes.length && workspace.contentLibrary.length < 3) {
    push({
      id: 'gap-content-pillars',
      title: 'Content Pillars',
      missing: 'Signature themes or repeatable content lanes',
      whyItMatters: 'Daily content recommendations need stable pillars instead of one-off ideas.',
      recommendedFix: 'Turn the top opportunity into 3 content pillars.',
      command: gapCommand(
        'Content Pillars',
        'Signature themes or repeatable content lanes',
        'Content cadence compounds only when pillars are stable.'
      )
    });
  }
  if (!workspace.brand.positioning.trim() && !workspace.brandVault.positioningStatement.trim()) {
    push({
      id: 'gap-positioning-statement',
      title: 'Positioning Statement',
      missing: 'Reviewed positioning statement',
      whyItMatters:
        'The Chief of Staff layer should not make strong claims without approved positioning.',
      recommendedFix: 'Draft three positioning options, then approve one.',
      command: gapCommand(
        'Positioning Statement',
        'Reviewed positioning statement',
        'Approved positioning grounds ASK, PLAN, outreach, and content.'
      )
    });
  }
  for (const question of core.missingFactQuestions.slice(0, 2)) {
    push({
      id: `gap-${question.id}`,
      title: question.target.replace(/-/g, ' '),
      missing: question.question,
      whyItMatters: question.whyItMatters,
      recommendedFix: 'Answer the missing fact question before stronger automation.',
      command: question.command
    });
  }
  return gaps.slice(0, 6);
}

function buildChiefOfStaffAlerts(
  workspace: BrandOpsData,
  core: OperationalIntelligenceCoreReadout,
  health: WorkspaceHealthScore
): ChiefOfStaffAlert[] {
  const alerts: ChiefOfStaffAlert[] = [];
  const overdue = workspace.followUps.filter(
    (item) => !item.completed && new Date(item.dueAt).getTime() < Date.now()
  );
  const oldestOverdue = overdue
    .map((item) => ({ item, days: daysSince(item.dueAt) }))
    .sort((a, b) => b.days - a.days)[0];
  if (oldestOverdue) {
    const detail = `You have not cleared this follow-up for ${oldestOverdue.days || 1} day${oldestOverdue.days === 1 ? '' : 's'}.`;
    alerts.push({
      id: 'chief-follow-up-stalled',
      title: 'Relationship follow-up is stalled',
      detail,
      severity: oldestOverdue.days >= 7 ? 'high' : 'medium',
      evidence: [oldestOverdue.item.reason, oldestOverdue.item.dueAt],
      command: alertCommand('Relationship follow-up is stalled', detail, [
        oldestOverdue.item.reason,
        oldestOverdue.item.dueAt
      ])
    });
  }
  if (core.receiptContext.pendingApprovals) {
    const detail = `${core.receiptContext.pendingApprovals} approval${core.receiptContext.pendingApprovals === 1 ? '' : 's'} are waiting before BrandOps can operate.`;
    alerts.push({
      id: 'chief-approvals-pending',
      title: 'Execution is waiting on approvals',
      detail,
      severity: core.receiptContext.pendingApprovals > 2 ? 'high' : 'medium',
      evidence: core.attentionQueue.slice(0, 3).map((item) => item.title),
      command: alertCommand(
        'Execution is waiting on approvals',
        detail,
        core.attentionQueue.slice(0, 3).map((item) => item.title)
      )
    });
  }
  const lowHealth = health.categories.find((item) => item.score < 50);
  if (lowHealth) {
    const detail = `${lowHealth.label} health is ${lowHealth.score}/100. ${lowHealth.improvement}`;
    alerts.push({
      id: `chief-health-${lowHealth.id}`,
      title: `${lowHealth.label} needs attention`,
      detail,
      severity: 'medium',
      evidence: [lowHealth.detail],
      command: alertCommand(`${lowHealth.label} needs attention`, detail, [lowHealth.detail])
    });
  }
  if (workspace.publishingQueue.length === 0 && workspace.contentLibrary.length < 3) {
    const detail =
      'Content cadence is weak because there are no queued posts and limited reusable content.';
    alerts.push({
      id: 'chief-content-cadence',
      title: 'Content cadence is slipping',
      detail,
      severity: 'low',
      evidence: [
        `${workspace.contentLibrary.length} content item(s)`,
        `${workspace.publishingQueue.length} queued item(s)`
      ],
      command: alertCommand('Content cadence is slipping', detail, [
        `${workspace.contentLibrary.length} content item(s)`,
        `${workspace.publishingQueue.length} queued item(s)`
      ])
    });
  }
  return alerts.slice(0, 5);
}

function buildReflection(
  workspace: BrandOpsData,
  core: OperationalIntelligenceCoreReadout,
  priorities: OperationalIntelligenceAction[]
): EndOfDayReflection {
  const completedTasks = workspace.scheduler.tasks.filter(
    (task) => task.completedAt && isToday(task.completedAt)
  );
  const approvedTraces = (workspace.operatorTraces?.entries ?? []).filter(
    (trace) => trace.reviewStatus === 'approved' && isToday(trace.at)
  );
  const discoveredOpportunities = workspace.opportunities.filter((item) => isToday(item.createdAt));
  const completed = uniq(
    [
      completedTasks.length
        ? `${completedTasks.length} plan/task${completedTasks.length === 1 ? '' : 's'} completed`
        : '',
      approvedTraces.length
        ? `${approvedTraces.length} draft/action${approvedTraces.length === 1 ? '' : 's'} approved`
        : '',
      discoveredOpportunities.length
        ? `${discoveredOpportunities.length} opportunit${discoveredOpportunities.length === 1 ? 'y' : 'ies'} discovered`
        : '',
      core.receiptContext.latestReceiptSummary
    ],
    4
  );
  return {
    headline: completed.length
      ? 'Today created operating evidence.'
      : 'Today is ready to become operating evidence.',
    completed,
    tomorrow: buildTomorrowPreview(workspace, core, priorities)
  };
}

function buildTomorrowPreview(
  workspace: BrandOpsData,
  core: OperationalIntelligenceCoreReadout,
  priorities: OperationalIntelligenceAction[]
): string[] {
  return uniq(
    [
      ...priorities.slice(0, 2).map((item) => item.title),
      core.missingFactQuestions[0]?.question,
      workspace.followUps.find((item) => !item.completed)?.reason,
      workspace.scheduler.tasks.find(
        (task) => task.status === 'scheduled' || task.status === 'due-soon'
      )?.title
    ],
    4
  );
}

function buildEvolutionTimeline(
  workspace: BrandOpsData,
  core: OperationalIntelligenceCoreReadout
): WorkspaceEvolutionEvent[] {
  const rows: WorkspaceEvolutionEvent[] = [
    ...core.decisionMemory.slice(0, 4).map((decision) => ({
      id: `evolution-decision-${decision.id}`,
      label: decision.polarity === 'approved' ? 'Approved decision' : 'Rejected guardrail',
      detail: decision.title,
      at: decision.createdAt
    })),
    ...(workspace.aiCore?.artifacts ?? []).slice(0, 4).map((artifact) => ({
      id: `evolution-artifact-${artifact.id}`,
      label: `Created ${artifact.type}`,
      detail: artifact.title,
      at: artifact.createdAt
    })),
    ...(workspace.operatingTimeline?.events ?? []).slice(0, 4).map((event) => ({
      id: `evolution-event-${event.id}`,
      label: event.title,
      detail: event.detail,
      at: event.at
    }))
  ];
  return rows
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);
}

function relationshipName(contact: Contact | undefined, opportunity: Opportunity): string {
  return contact?.name || opportunity.name || opportunity.company;
}

function buildRelationshipMemory(workspace: BrandOpsData): RelationshipMemorySignal[] {
  return workspace.opportunities
    .filter(isActiveOpportunity)
    .slice(0, 5)
    .map((opportunity) => {
      const contact = opportunity.contactId
        ? workspace.contacts.find((item) => item.id === opportunity.contactId)
        : undefined;
      const name = relationshipName(contact, opportunity);
      return {
        id: `relationship-${opportunity.id}`,
        name,
        relationship: `${opportunity.relationshipStage} ${opportunity.opportunityType}`,
        nextAction: opportunity.nextAction,
        signal: `${opportunity.company} · ${opportunity.confidence}% confidence`,
        command: `ask: Prepare a Relationship Memory capsule for this relationship. Do not send messages or mutate records. Include context, opportunity, next action, missing facts, approval needs, and recommended PLAN path.\n\nName: ${quoteContextValue(name)}\nCompany: ${quoteContextValue(opportunity.company)}\nRole: ${quoteContextValue(opportunity.role)}\nNext action: ${quoteContextValue(opportunity.nextAction)}`
      };
    });
}

function greetingFor(workspace: BrandOpsData, timeframe: DailyOperatingLoopTimeframe): string {
  const name =
    clean(workspace.brand.operatorName, 80) ||
    getActiveDigitalTwin(workspace)?.displayName ||
    'operator';
  const lead =
    timeframe === 'evening'
      ? 'Good evening'
      : timeframe === 'midday'
        ? 'Good afternoon'
        : 'Good morning';
  return `${lead} ${name}.`;
}

export function buildDailyOperatingLoopReadout(workspace: BrandOpsData): DailyOperatingLoopReadout {
  const core = buildOperationalIntelligenceReadout(workspace);
  const timeframe = timeframeFor();
  const metrics = buildMetrics(workspace, core);
  const health = buildWorkspaceHealth(workspace, core);
  const priorities = core.recommendedActions.slice(0, 3);
  const strategicGaps = buildStrategicGaps(workspace, core);
  const alerts = buildChiefOfStaffAlerts(workspace, core, health);
  const reflection = buildReflection(workspace, core, priorities);
  const tomorrowPreview = buildTomorrowPreview(workspace, core, priorities);
  const topPriority =
    priorities[0]?.title || strategicGaps[0]?.title || 'Answer the next missing workspace fact';
  return {
    schemaVersion: DAILY_OPERATING_LOOP_SCHEMA_VERSION,
    updatedAt: nowIso(),
    timeframe,
    greeting: greetingFor(workspace, timeframe),
    headline: `${metrics[0]?.value ?? 0} opportunities · ${metrics[1]?.value ?? 0} approvals · Workspace Health ${health.score}/100`,
    morningBriefing: `Recommended priority: ${topPriority}`,
    recommendedPriorities: priorities,
    metrics,
    workspaceHealth: health,
    strategicGaps,
    chiefOfStaffAlerts: alerts,
    endOfDayReflection: reflection,
    tomorrowPreview,
    evolutionTimeline: buildEvolutionTimeline(workspace, core),
    relationshipMemory: buildRelationshipMemory(workspace),
    missingFactQuestions: core.missingFactQuestions,
    governancePolicy: GOVERNANCE_POLICY
  };
}
