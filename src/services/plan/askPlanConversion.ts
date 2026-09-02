import type {
  BrandOpsData,
  Plan,
  PlanDraft,
  PlanNextAction,
  PlanOutputAsset,
  PlanPreset,
  PlanReceipt,
  PlanRisk,
  PlanSourceMetadata,
  PlanSourceSurface,
  PlanStep,
  PlanStepStatus,
  PlanTimelineItem,
  SavedPlanStatus
} from '../../types/domain';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import { prependOperatorTrace } from '../dataset/operatorTraces';

export const PLAN_PRESET_LABELS: Record<PlanPreset, string> = {
  'outreach-plan': 'Outreach Plan',
  'content-plan': 'Content Plan',
  'positioning-plan': 'Positioning Plan',
  'buyer-persona-plan': 'Buyer Persona Plan',
  'opportunity-analysis-plan': 'Opportunity Analysis Plan',
  'workflow-plan': 'Workflow Plan',
  'resume-profile-improvement-plan': 'Resume/Profile Improvement Plan',
  'integration-setup-plan': 'Integration Setup Plan',
  'weekly-execution-plan': 'Weekly Execution Plan',
  'custom-plan': 'Custom Plan'
};

export const PLAN_PRESETS = Object.keys(PLAN_PRESET_LABELS) as PlanPreset[];

export interface ConvertAskResponseToPlanInput {
  conversationId: string;
  messageId: string;
  responseText: string;
  userIntent: string;
  activeTwinId?: string | null;
  planPreset: PlanPreset;
  workspaceContext: BrandOpsData;
  sourceSurface?: PlanSourceSurface;
  verifiedFactsUsed?: string[];
  unverifiedMissingFacts?: string[];
}

export type PlanDraftResult =
  | { ok: true; draft: PlanDraft }
  | { ok: false; error: string; issues: string[] };

export interface SavePlanDraftInput {
  workspace: BrandOpsData;
  draft: PlanDraft;
  userAction: PlanReceipt['userAction'];
  convertedFromLabel?: string;
}

export interface SavePlanDraftResult {
  workspace: BrandOpsData;
  plan: Plan;
  receipt: PlanReceipt;
}

const MAX_TEXT = 1200;

function compactText(text: string, max = MAX_TEXT): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function sentence(text: string, fallback: string, max = 180): string {
  const first = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/u)
    .find((part) => part.trim().length > 24);
  return compactText(first || text || fallback, max);
}

function listFromText(text: string, fallback: string, count = 4): string[] {
  const bullets = text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*0-9.)\s]+/, '').trim())
    .filter((line) => line.length > 18)
    .slice(0, count);
  if (bullets.length) return bullets.map((line) => compactText(line, 180));
  return [fallback];
}

function uniqueStrings(items: Array<string | undefined | null>, max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const clean = item?.replace(/\s+/g, ' ').trim();
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    out.push(clean);
    if (out.length >= max) break;
  }
  return out;
}

function activeTwinFor(workspace: BrandOpsData, id?: string | null) {
  const twins = workspace.digitalTwins?.twins ?? [];
  return twins.find((twin) => twin.id === id) ?? getActiveDigitalTwin(workspace);
}

function professionContext(workspace: BrandOpsData, activeTwinId?: string | null): string {
  const twin = activeTwinFor(workspace, activeTwinId);
  return compactText(
    [
      twin?.identity.professionalPositioning,
      twin?.identity.headline,
      workspace.brand.positioning,
      workspace.brand.primaryOffer
    ]
      .filter(Boolean)
      .join(' | ') || 'BrandOps operator workspace'
  );
}

function verifiedFacts(workspace: BrandOpsData, input: ConvertAskResponseToPlanInput): string[] {
  const twin = activeTwinFor(workspace, input.activeTwinId);
  return uniqueStrings(
    [
      ...(input.verifiedFactsUsed ?? []),
      twin?.identity.professionalPositioning,
      twin?.identity.headline,
      ...(twin?.memory.approvedClaims ?? []),
      workspace.brand.primaryOffer,
      workspace.brand.focusMetric
    ],
    8
  );
}

function missingFacts(workspace: BrandOpsData, input: ConvertAskResponseToPlanInput): string[] {
  const twin = activeTwinFor(workspace, input.activeTwinId);
  const presetMissing: Partial<Record<PlanPreset, string[]>> = {
    'outreach-plan': ['Target audience or named recipient', 'Approved proof point'],
    'content-plan': ['Preferred platform or cadence'],
    'buyer-persona-plan': ['Persona evidence from calls, CRM, or interviews'],
    'integration-setup-plan': ['Target platform and permission scope'],
    'resume-profile-improvement-plan': ['Current resume/profile section to improve']
  };
  return uniqueStrings(
    [
      ...(input.unverifiedMissingFacts ?? []),
      ...(twin?.memory.missingInfo ?? []),
      ...(presetMissing[input.planPreset] ?? [])
    ],
    8
  );
}

const PLATFORM_KEYWORDS = [
  'linkedin',
  'github',
  'google',
  'newsletter',
  'x',
  'slack',
  'notion',
  'gmail'
];

/**
 * Whole-word match only. A plain `.includes()` scan false-positives the
 * single-letter `'x'` keyword (X/Twitter) against any text containing that
 * letter sequence — "context", "expertise", "example" — which silently
 * marked those plans' steps as targeting an unsupported platform and BLOCKED
 * them even though the user never mentioned a platform at all.
 */
function platformFromText(text: string): string | undefined {
  const lower = text.toLowerCase();
  return PLATFORM_KEYWORDS.find((platform) => {
    const escaped = platform.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`).test(lower);
  });
}

function platformSupportStatus(workspace: BrandOpsData, platform?: string) {
  if (!platform) return { label: undefined, supported: true };
  const lower = platform.toLowerCase();
  const source = workspace.integrationHub.sources.find(
    (item) => item.name.toLowerCase().includes(lower) || item.kind.toLowerCase().includes(lower)
  );
  const syncHub = workspace.settings.syncHub;
  const syncConnected =
    (lower === 'linkedin' && syncHub.linkedin.connectionStatus === 'connected') ||
    (lower === 'github' && syncHub.github.connectionStatus === 'connected') ||
    (lower === 'google' && syncHub.google.connectionStatus === 'connected');
  if (source?.status === 'connected' || syncConnected) {
    return { label: platform, supported: true };
  }
  return { label: platform, supported: false };
}

function presetObjective(preset: PlanPreset, intent: string, response: string): string {
  const basis = sentence(
    intent || response,
    'Turn the selected Ask response into an execution plan.'
  );
  switch (preset) {
    case 'outreach-plan':
      return `Turn the insight into an approval-gated outreach sequence for: ${basis}`;
    case 'content-plan':
      return `Turn the insight into a content plan with platforms, cadence, drafts, and review gates for: ${basis}`;
    case 'positioning-plan':
      return `Clarify positioning, differentiation, proof points, and evidence gaps for: ${basis}`;
    case 'buyer-persona-plan':
      return `Structure persona segments, pain points, triggers, objections, and messaging angles for: ${basis}`;
    case 'opportunity-analysis-plan':
      return `Evaluate the opportunity, why now, expected impact, experiments, and risks for: ${basis}`;
    case 'workflow-plan':
      return `Convert the insight into repeatable workflow steps, owners, platforms, and approval checkpoints for: ${basis}`;
    case 'resume-profile-improvement-plan':
      return `Improve the resume/profile narrative while flagging claims that need verification for: ${basis}`;
    case 'integration-setup-plan':
      return `Plan the integration setup, permissions, unsupported states, and review gates for: ${basis}`;
    case 'weekly-execution-plan':
      return `Turn the insight into weekly priorities, schedule, approvals, and deliverables for: ${basis}`;
    case 'custom-plan':
    default:
      return `Convert the insight into a structured, approval-gated operational plan for: ${basis}`;
  }
}

function requiredApprovals(preset: PlanPreset, unsupportedPlatform?: string): string[] {
  const approvals: Partial<Record<PlanPreset, string[]>> = {
    'outreach-plan': ['Approve recipient list, claims, and message copy before sending.'],
    'content-plan': ['Approve content angle, claims, and publishing schedule before posting.'],
    'positioning-plan': ['Approve proof points before using them in public-facing copy.'],
    'workflow-plan': ['Approve any workspace or external-state changes before execution.'],
    'resume-profile-improvement-plan': [
      'Approve every rewritten claim before using it externally.'
    ],
    'integration-setup-plan': [
      'Approve permission scope before connecting or syncing any platform.'
    ],
    'weekly-execution-plan': [
      'Approve deliverables that publish, send, schedule, or modify workspace data.'
    ],
    'buyer-persona-plan': ['Approve persona assumptions before using them in outreach or content.'],
    'opportunity-analysis-plan': [
      'Approve experiments before they contact people or change records.'
    ],
    'custom-plan': [
      'Approve external actions before sending, publishing, scheduling, syncing, or modifying records.'
    ]
  };
  return uniqueStrings(
    [
      ...(approvals[preset] ?? []),
      unsupportedPlatform
        ? `${unsupportedPlatform} integration is unsupported or not connected; needs setup.`
        : null
    ],
    6
  );
}

function presetOutputs(preset: PlanPreset, platform?: string): PlanOutputAsset[] {
  const base: Record<PlanPreset, string[]> = {
    'outreach-plan': ['Target audience', 'Message angle', 'Draft sequence', 'Follow-up timing'],
    'content-plan': [
      'Content pillars',
      'Post ideas',
      'Publishing timeline',
      'Platform suggestions'
    ],
    'positioning-plan': [
      'Current positioning',
      'Suggested positioning',
      'Differentiation',
      'Proof points'
    ],
    'buyer-persona-plan': ['Persona segments', 'Pain points', 'Triggers', 'Messaging angles'],
    'opportunity-analysis-plan': [
      'Opportunity brief',
      'Why now',
      'Expected impact',
      'Next experiments'
    ],
    'workflow-plan': [
      'Repeatable steps',
      'Owner/platform map',
      'Automation potential',
      'Approval checkpoints'
    ],
    'resume-profile-improvement-plan': [
      'Profile gaps',
      'Improvements',
      'Rewritten sections',
      'Claims to verify'
    ],
    'integration-setup-plan': [
      'Platform setup steps',
      'Permission scope',
      'Unsupported states',
      'Review checklist'
    ],
    'weekly-execution-plan': ['Priorities', 'Weekly schedule', 'Approvals', 'Deliverables'],
    'custom-plan': ['Structured plan draft', 'Approval gates', 'Missing inputs', 'Expected output']
  };
  return base[preset].map((title, index) => ({
    id: `asset-${index + 1}`,
    title,
    description: `${title} produced as a draft. Review before use.`,
    platform,
    approvalRequired: true
  }));
}

function presetSteps(
  preset: PlanPreset,
  objective: string,
  missingInputs: string[],
  unsupportedPlatform?: string,
  platform?: string
): PlanStep[] {
  const blocked = missingInputs.length > 0 || Boolean(unsupportedPlatform);
  const setupDescription = unsupportedPlatform
    ? `Confirm whether ${unsupportedPlatform} is supported, connected, and approved before any external action.`
    : 'Confirm required context and success criteria before execution.';
  const steps: PlanStep[] = [
    {
      id: 'step-1',
      title: 'Confirm source context',
      description: compactText(objective, 220),
      owner: 'User',
      platform,
      requiredInput: missingInputs[0] ?? 'Confirmed objective and source response',
      approvalRequired: false,
      status: blocked ? 'blocked' : 'ready'
    },
    {
      id: 'step-2',
      title: 'Resolve missing inputs',
      description: setupDescription,
      owner: 'User',
      platform,
      requiredInput: missingInputs.join('; ') || 'No missing inputs identified',
      approvalRequired: false,
      status: blocked ? 'blocked' : 'ready'
    },
    {
      id: 'step-3',
      title: `Draft ${PLAN_PRESET_LABELS[preset].toLowerCase()} assets`,
      description:
        'Create only draft assets and internal work items. Do not send, publish, sync, delete, or modify external systems.',
      owner: 'BrandOps',
      platform,
      requiredInput: 'Approved objective and verified facts',
      approvalRequired: true,
      status: blocked ? 'todo' : 'ready'
    },
    {
      id: 'step-4',
      title: 'Human approval checkpoint',
      description:
        'Review claims, target audience, platform support, timeline, and required approvals.',
      owner: 'User',
      platform,
      requiredInput: 'Draft review',
      approvalRequired: true,
      status: 'todo'
    },
    {
      id: 'step-5',
      title: 'Execute only after explicit approval',
      description:
        'Move approved tasks into the PLAN workspace. External actions remain draft-only until supported integrations and user approval exist.',
      owner: 'User',
      platform,
      requiredInput: 'Explicit approval and supported integration state',
      approvalRequired: true,
      status: 'todo'
    }
  ];
  return steps;
}

function timelineFor(missingInputs: string[], unsupportedPlatform?: string): PlanTimelineItem[] {
  return [
    {
      id: 'timeline-1',
      title: 'Preview draft',
      description: 'Review the structured plan generated from Ask.',
      timing: 'Now'
    },
    {
      id: 'timeline-2',
      title: 'Fill gaps',
      description: missingInputs.length
        ? missingInputs.slice(0, 3).join('; ')
        : 'No required missing inputs detected.',
      timing: missingInputs.length || unsupportedPlatform ? 'Before activation' : 'Same day'
    },
    {
      id: 'timeline-3',
      title: 'Approval gate',
      description: 'Approve draft assets and external-action gates.',
      timing: 'Before execution'
    },
    {
      id: 'timeline-4',
      title: 'PLAN execution',
      description: 'Track steps, outputs, approvals, risks, and receipts in PLAN.',
      timing: 'After approval'
    }
  ];
}

function risksFor(
  preset: PlanPreset,
  missingInputs: string[],
  unsupportedPlatform?: string
): PlanRisk[] {
  const risks: PlanRisk[] = [
    {
      id: 'risk-1',
      title: 'Unsupported or unapproved external action',
      mitigation:
        'Keep actions as drafts until the user approves and the integration is supported.',
      severity: 'high'
    },
    {
      id: 'risk-2',
      title: 'Unverified claim',
      mitigation: 'Use only verified facts or mark missing evidence before public use.',
      severity: missingInputs.length ? 'high' : 'medium'
    }
  ];
  if (unsupportedPlatform) {
    risks.unshift({
      id: 'risk-platform',
      title: `${unsupportedPlatform} needs setup or is unsupported`,
      mitigation:
        'Show needs setup or unsupported integration instead of reporting fake execution.',
      severity: 'high'
    });
  }
  if (preset === 'opportunity-analysis-plan') {
    risks.push({
      id: 'risk-experiment',
      title: 'Experiment impact is uncertain',
      mitigation: 'Start with a small, reversible test and capture receipts.',
      severity: 'medium'
    });
  }
  return risks;
}

function nextActions(steps: PlanStep[]): PlanNextAction[] {
  return steps.slice(0, 4).map((step, index) => ({
    id: `next-${index + 1}`,
    label: step.status === 'blocked' ? `Unblock: ${step.requiredInput}` : step.title,
    approvalRequired: step.approvalRequired,
    status: step.status
  }));
}

function classifySavedPlan(draft: PlanDraft): SavedPlanStatus {
  if (draft.planType === 'opportunity-analysis-plan') return 'opportunity';
  if (draft.missingInputs.length > 0 || draft.steps.some((step) => step.status === 'blocked')) {
    return 'draft';
  }
  if (draft.requiredApprovals.length > 0 || draft.steps.some((step) => step.approvalRequired)) {
    return 'pending-approval';
  }
  return 'active';
}

function validatePlanStep(step: unknown): step is PlanStep {
  if (!step || typeof step !== 'object') return false;
  const s = step as Record<string, unknown>;
  const statuses: PlanStepStatus[] = ['todo', 'blocked', 'ready', 'approved', 'done', 'failed'];
  return (
    typeof s.id === 'string' &&
    typeof s.title === 'string' &&
    typeof s.description === 'string' &&
    typeof s.owner === 'string' &&
    typeof s.requiredInput === 'string' &&
    typeof s.approvalRequired === 'boolean' &&
    typeof s.status === 'string' &&
    statuses.includes(s.status as PlanStepStatus)
  );
}

function validateStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function validatePlanDraft(
  value: unknown
): { ok: true; draft: PlanDraft } | { ok: false; issues: string[] } {
  if (!value || typeof value !== 'object')
    return { ok: false, issues: ['Draft is not an object.'] };
  const draft = value as Record<string, unknown>;
  const issues: string[] = [];
  for (const key of [
    'id',
    'title',
    'summary',
    'objective',
    'sourceResponseId',
    'estimatedEffort',
    'expectedOutput'
  ]) {
    if (typeof draft[key] !== 'string' || !draft[key]) issues.push(`${key} is required.`);
  }
  if (!PLAN_PRESETS.includes(draft.planType as PlanPreset)) issues.push('planType is invalid.');
  if (typeof draft.confidenceScore !== 'number') issues.push('confidenceScore is required.');
  for (const key of ['assumptions', 'missingInputs', 'requiredApprovals']) {
    if (!validateStringArray(draft[key])) issues.push(`${key} must be a string array.`);
  }
  if (!Array.isArray(draft.steps) || !draft.steps.every(validatePlanStep)) {
    issues.push('steps must match the PlanStep schema.');
  }
  if (!Array.isArray(draft.timeline)) issues.push('timeline is required.');
  if (!Array.isArray(draft.outputsAssets)) issues.push('outputsAssets is required.');
  if (!Array.isArray(draft.risks)) issues.push('risks is required.');
  if (!Array.isArray(draft.nextActions)) issues.push('nextActions is required.');
  if (draft.status !== 'draft') issues.push('status must be draft.');
  if (!draft.source || typeof draft.source !== 'object')
    issues.push('source metadata is required.');
  return issues.length ? { ok: false, issues } : { ok: true, draft: value as PlanDraft };
}

export function convertAskResponseToPlan(input: ConvertAskResponseToPlanInput): PlanDraftResult {
  const response = compactText(input.responseText);
  const intent = compactText(input.userIntent, 500);
  const issues: string[] = [];
  if (!input.conversationId.trim()) issues.push('conversationId is required.');
  if (!input.messageId.trim()) issues.push('messageId is required.');
  if (!response) issues.push('responseText is required.');
  if (!PLAN_PRESETS.includes(input.planPreset)) issues.push('planPreset is invalid.');
  if (issues.length) return { ok: false, error: 'Cannot convert Ask response to Plan.', issues };

  const nowIso = new Date().toISOString();
  const twin = activeTwinFor(input.workspaceContext, input.activeTwinId);
  const platform = platformFromText(`${intent} ${response}`);
  const support = platformSupportStatus(input.workspaceContext, platform);
  const unsupportedPlatform = support.supported ? undefined : support.label;
  const missingInputs = missingFacts(input.workspaceContext, input);
  const objective = presetObjective(input.planPreset, intent, response);
  const steps = presetSteps(
    input.planPreset,
    objective,
    missingInputs,
    unsupportedPlatform,
    platform
  );
  const approvals = requiredApprovals(input.planPreset, unsupportedPlatform);
  const assumptions = uniqueStrings(
    [
      'Draft created from an Ask My Twin response; no external action has executed.',
      'PLAN owns execution, approvals, timelines, receipts, and status tracking.',
      platform ? `Platform context detected: ${platform}.` : 'No specific platform was required.',
      unsupportedPlatform
        ? `${unsupportedPlatform} is not connected or supported in this workspace.`
        : null
    ],
    6
  );
  const outputs = presetOutputs(input.planPreset, platform);
  const risks = risksFor(input.planPreset, missingInputs, unsupportedPlatform);
  const source: PlanSourceMetadata = {
    sourceSurface: input.sourceSurface ?? 'ask-my-twin',
    originalUserMessage: intent,
    aiResponse: response,
    activeTwinId: twin?.id ?? null,
    activeTwinName: twin?.displayName,
    professionContext: professionContext(input.workspaceContext, input.activeTwinId),
    verifiedFactsUsed: verifiedFacts(input.workspaceContext, input),
    unverifiedMissingFacts: missingInputs,
    timestamp: nowIso,
    conversationId: input.conversationId,
    messageId: input.messageId
  };
  const label = PLAN_PRESET_LABELS[input.planPreset];
  const draft: PlanDraft = {
    id: `plan-draft-${input.messageId}-${Date.now().toString(36)}`,
    title: `${label}: ${sentence(intent || response, 'Converted Ask response', 72)}`,
    summary: sentence(response, 'Structured plan generated from Ask response.', 240),
    objective,
    planType: input.planPreset,
    confidenceScore: Math.max(
      45,
      Math.min(92, 82 - missingInputs.length * 5 - (unsupportedPlatform ? 12 : 0))
    ),
    sourceResponseId: input.messageId,
    assumptions,
    missingInputs,
    requiredApprovals: approvals,
    steps,
    timeline: timelineFor(missingInputs, unsupportedPlatform),
    outputsAssets: outputs,
    risks,
    nextActions: nextActions(steps),
    status: 'draft',
    source,
    estimatedEffort:
      missingInputs.length || unsupportedPlatform
        ? 'Needs input before activation'
        : '1-2 focused work sessions',
    expectedOutput: outputs
      .map((asset) => asset.title)
      .slice(0, 4)
      .join(', '),
    thoughtTree: {
      originalQuestion: intent || 'Ask My Twin response',
      insight: sentence(
        response,
        'The Ask response contains an operationally useful insight.',
        180
      ),
      planObjective: objective,
      branchesOptions: listFromText(
        response,
        'Convert insight into a reviewable PLAN workflow.',
        4
      ),
      chosenPath: `${label} with approval gates and receipts.`,
      steps: steps.map((step) => step.title),
      approvals,
      risks: risks.map((risk) => risk.title)
    }
  };
  const validation = validatePlanDraft(draft);
  if (!validation.ok) {
    return {
      ok: false,
      error: 'Plan draft failed schema validation. Nothing was saved.',
      issues: validation.issues
    };
  }
  return { ok: true, draft: validation.draft };
}

export function savePlanDraftToWorkspace(input: SavePlanDraftInput): SavePlanDraftResult {
  const validation = validatePlanDraft(input.draft);
  if (!validation.ok) {
    throw new Error(`Plan draft failed schema validation: ${validation.issues.join(' ')}`);
  }
  const nowIso = new Date().toISOString();
  const status = classifySavedPlan(validation.draft);
  const convertedFromLabel = input.convertedFromLabel ?? 'Ask';
  const receipt: PlanReceipt = {
    id: `plan-receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    planId: validation.draft.id,
    convertedFrom: convertedFromLabel,
    planType: validation.draft.planType,
    sourceMessageId: validation.draft.sourceResponseId,
    generatedSteps: validation.draft.steps.map((step) => step.title),
    userAction: input.userAction,
    timestamp: nowIso,
    summary: `Converted ${convertedFromLabel} response ${validation.draft.sourceResponseId} into ${PLAN_PRESET_LABELS[validation.draft.planType]}.`
  };
  const plan: Plan = {
    ...validation.draft,
    status,
    savedAt: nowIso,
    receiptId: receipt.id
  };
  const prior = input.workspace.planWorkspace ?? { plans: [], receipts: [], updatedAt: nowIso };
  const workspaceWithPlan: BrandOpsData = {
    ...input.workspace,
    planWorkspace: {
      plans: [plan, ...prior.plans.filter((item) => item.id !== plan.id)].slice(0, 40),
      receipts: [receipt, ...prior.receipts].slice(0, 80),
      updatedAt: nowIso
    }
  };
  const withTrace = prependOperatorTrace(workspaceWithPlan, {
    source: 'assistant',
    verb: 'ask.convert_to_plan',
    surface: 'plan',
    route: 'plan-workspace',
    entityType: 'plan',
    entityId: plan.id,
    outcome: 'success',
    /**
     * The same capability the MCP path already records for this operation.
     *
     * `convertToPlan.ts` writes `capabilityId: 'plan.convert'` for the identical
     * conversion; this path — the one a person actually goes through — recorded
     * no capability at all. That is why an approval row could say who was asking
     * and what for, but never what approving would do: the trace did not say
     * which capability it was, so there was nothing to look the consequence up
     * against.
     */
    capabilityId: 'plan.convert',
    reviewStatus: status === 'pending-approval' ? 'pending' : undefined,
    labels: ['converted-from-ask', 'human-gated', PLAN_PRESET_LABELS[plan.planType]],
    annotatorNote:
      'Converted from Ask My Twin. External actions remain drafts until explicit approval.',
    details: {
      planType: PLAN_PRESET_LABELS[plan.planType],
      sourceMessageId: plan.sourceResponseId,
      generatedSteps: plan.steps.length,
      userAction: input.userAction
    }
  });
  return { workspace: withTrace, plan, receipt };
}
