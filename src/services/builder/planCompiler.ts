/**
 * Plan Compiler — strengthens Convert to Plan by compiling eligible Ask/Artifact/
 * Opportunity inputs into typed PlanDrafts with 10 plan templates.
 */

import type {
  Achievement,
  OpportunityRecommendation
} from '../../types/builder';
import type { BrandOpsData, PlanPreset, PlanDraft } from '../../types/domain';
import {
  convertAskResponseToPlan,
  type ConvertAskResponseToPlanInput
} from '../../services/plan/askPlanConversion';

// ---------------------------------------------------------------------------
// Plan templates
// ---------------------------------------------------------------------------

export type ExtendedPlanPreset =
  | PlanPreset
  | 'content-plan-extended'
  | 'outreach-plan-extended'
  | 'positioning-plan-extended'
  | 'launch-plan'
  | 'portfolio-plan'
  | 'project-documentation-plan'
  | 'networking-plan'
  | 'integration-setup-plan-extended'
  | 'professional-growth-plan'
  | 'custom-plan-extended';

export const EXTENDED_PLAN_PRESETS: ExtendedPlanPreset[] = [
  'content-plan',
  'outreach-plan',
  'positioning-plan',
  'content-plan-extended',
  'outreach-plan-extended',
  'positioning-plan-extended',
  'launch-plan',
  'portfolio-plan',
  'project-documentation-plan',
  'networking-plan',
  'integration-setup-plan',
  'integration-setup-plan-extended',
  'professional-growth-plan',
  'custom-plan',
  'custom-plan-extended'
];

export interface PlanTemplate {
  preset: ExtendedPlanPreset;
  name: string;
  description: string;
  requiredInputs: string[];
  optionalInputs: string[];
  estimatedSteps: number;
  expectedArtifacts: string[];
  permissionRequirements: string[];
  successCriteria: string[];
  verificationStrategy: string;
}

export const PLAN_TEMPLATES: Record<ExtendedPlanPreset, PlanTemplate> = {
  'content-plan': {
    preset: 'content-plan',
    name: 'Content Plan',
    description: 'Plan content creation from a verified achievement or opportunity.',
    requiredInputs: ['Source achievement or opportunity title', 'Content angle or topic'],
    optionalInputs: ['Target platform(s)', 'Preferred tone', 'Suggested headline'],
    estimatedSteps: 5,
    expectedArtifacts: ['Content brief', 'Draft post(s)', 'Publishing timeline', 'Platform suggestions'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Draft content is grounded in verified achievement', 'Platform support confirmed'],
    verificationStrategy: 'User reviews drafts before publishing.'
  },
  'content-plan-extended': {
    preset: 'content-plan-extended',
    name: 'Extended Content Plan',
    description: 'Multi-platform content plan with repurposing strategy.',
    requiredInputs: ['Source achievement or opportunity title', 'Primary content angle'],
    optionalInputs: ['All target platforms', 'Content series scope', 'Repurposing targets'],
    estimatedSteps: 7,
    expectedArtifacts: ['Master content brief', 'Platform-specific drafts', 'Repurposing map', 'Publishing calendar'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Multi-platform coverage confirmed', 'Repurposing strategy clear'],
    verificationStrategy: 'User reviews each platform draft before scheduling.'
  },
  'outreach-plan': {
    preset: 'outreach-plan',
    name: 'Outreach Plan',
    description: 'Plan targeted outreach based on a verified achievement or opportunity.',
    requiredInputs: ['Source achievement or opportunity', 'Target audience or recipient'],
    optionalInputs: ['Message angle', 'Follow-up cadence', 'Call to action'],
    estimatedSteps: 5,
    expectedArtifacts: ['Target list', 'Message draft', 'Follow-up timing', 'Call to action'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Recipient list is specific and relevant', 'Message is personalized'],
    verificationStrategy: 'User approves recipient list and message copy before sending.'
  },
  'outreach-plan-extended': {
    preset: 'outreach-plan-extended',
    name: 'Extended Outreach Plan',
    description: 'Multi-channel outreach sequence with relationship tracking.',
    requiredInputs: ['Source achievement or opportunity', 'Target audience segments'],
    optionalInputs: ['Channel mix', 'Sequence length', 'Relationship goals'],
    estimatedSteps: 7,
    expectedArtifacts: ['Segmented target list', 'Channel-specific drafts', 'Sequence map', 'Response handling plan'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Multi-channel coverage confirmed', 'Sequence is trackable'],
    verificationStrategy: 'User approves each channel draft and sequence before activation.'
  },
  'positioning-plan': {
    preset: 'positioning-plan',
    name: 'Positioning Plan',
    description: 'Clarify positioning, differentiation, proof points, and evidence gaps.',
    requiredInputs: ['Current positioning statement', 'Recent verified achievements'],
    optionalInputs: ['Target audience', 'Competitive context', 'Desired positioning shift'],
    estimatedSteps: 5,
    expectedArtifacts: ['Current positioning assessment', 'Suggested positioning', 'Differentiation map', 'Proof points list'],
    permissionRequirements: ['CAN_CREATE_DRAFT', 'CAN_PROPOSE_TWIN_CHANGE'],
    successCriteria: ['Positioning is grounded in verified evidence', 'Proof points are specific and verifiable'],
    verificationStrategy: 'User approves every positioning claim before it is used externally.'
  },
  'positioning-plan-extended': {
    preset: 'positioning-plan-extended',
    name: 'Extended Positioning Plan',
    description: 'Full positioning review with audience analysis and messaging architecture.',
    requiredInputs: ['Current positioning', 'Verified achievements', 'Target audience definition'],
    optionalInputs: ['Competitive landscape', 'Brand voice guidelines', 'Messaging pillars'],
    estimatedSteps: 8,
    expectedArtifacts: ['Positioning audit', 'Audience alignment map', 'Messaging architecture', 'Proof point matrix', 'Gap analysis'],
    permissionRequirements: ['CAN_CREATE_DRAFT', 'CAN_PROPOSE_TWIN_CHANGE'],
    successCriteria: ['Positioning is evidence-based and audience-aligned', 'Every claim has a verification path'],
    verificationStrategy: 'User reviews the full positioning architecture and approves each element.'
  },
  'launch-plan': {
    preset: 'launch-plan',
    name: 'Launch Plan',
    description: 'Plan a product or project launch with milestones, content, and outreach.',
    requiredInputs: ['Product/project name', 'Launch date or window', 'Launch goal'],
    optionalInputs: ['Target audience', 'Key features to highlight', 'Content assets to create', 'Outreach targets'],
    estimatedSteps: 8,
    expectedArtifacts: ['Launch timeline', 'Milestone checklist', 'Content calendar', 'Outreach sequence', 'Launch-day checklist'],
    permissionRequirements: ['CAN_CREATE_DRAFT', 'CAN_CREATE_PLAN'],
    successCriteria: ['Launch date is realistic', 'All milestone owners are identified', 'Content and outreach are coordinated'],
    verificationStrategy: 'User approves the launch timeline, milestone owners, and content before execution.'
  },
  'portfolio-plan': {
    preset: 'portfolio-plan',
    name: 'Portfolio Plan',
    description: 'Plan a portfolio entry or update based on verified achievements.',
    requiredInputs: ['Achievement or project to feature', 'Desired portfolio impact'],
    optionalInputs: ['Supporting artifacts', 'Visual assets', 'Metrics or outcomes', 'Related work'],
    estimatedSteps: 5,
    expectedArtifacts: ['Portfolio entry draft', 'Evidence links', 'Impact summary', 'Visual asset list'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Entry is grounded in verified achievement', 'External links are valid'],
    verificationStrategy: 'User reviews the portfolio entry and approves all claims before publishing.'
  },
  'project-documentation-plan': {
    preset: 'project-documentation-plan',
    name: 'Project Documentation Plan',
    description: 'Plan documentation for a project based on its achievements and gaps.',
    requiredInputs: ['Project name', 'Known documentation gaps'],
    optionalInputs: ['Target documentation types', 'Audience for documentation', 'Existing source material'],
    estimatedSteps: 6,
    expectedArtifacts: ['Documentation outline', 'Gap analysis', 'Writing plan', 'Review schedule'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Documentation covers key project areas', 'Gaps are explicitly identified'],
    verificationStrategy: 'User reviews the documentation outline and approves the gap analysis.'
  },
  'networking-plan': {
    preset: 'networking-plan',
    name: 'Networking Plan',
    description: 'Plan strategic networking based on recent work and opportunities.',
    requiredInputs: ['Networking goal', 'Recent relevant work or achievement'],
    optionalInputs: ['Target communities', 'Event attendance', 'Outreach targets', 'Follow-up cadence'],
    estimatedSteps: 5,
    expectedArtifacts: ['Target community list', 'Outreach templates', 'Event calendar', 'Follow-up plan'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Networking goals are specific', 'Targets are relevant to recent work'],
    verificationStrategy: 'User approves outreach templates and target list before activation.'
  },
  'integration-setup-plan': {
    preset: 'integration-setup-plan',
    name: 'Integration Setup Plan',
    description: 'Plan integration setup, permissions, and review gates.',
    requiredInputs: ['Target platform', 'Integration goal'],
    optionalInputs: ['Permission scope', 'Existing connection state', 'Required approvals'],
    estimatedSteps: 5,
    expectedArtifacts: ['Setup steps', 'Permission scope document', 'Unsupported states list', 'Review checklist'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Platform support confirmed', 'Permission scope is explicit'],
    verificationStrategy: 'User approves permission scope before connecting or syncing any platform.'
  },
  'integration-setup-plan-extended': {
    preset: 'integration-setup-plan-extended',
    name: 'Extended Integration Setup Plan',
    description: 'Full integration plan with multi-platform setup, rollback, and monitoring.',
    requiredInputs: ['Target platforms', 'Integration goals', 'Current connection state'],
    optionalInputs: ['Rollback plan', 'Monitoring setup', 'Team members involved', 'SLA or uptime requirements'],
    estimatedSteps: 8,
    expectedArtifacts: ['Multi-platform setup plan', 'Permission matrix', 'Rollback procedure', 'Monitoring plan', 'Team assignments'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['All platforms confirmed supported or flagged unsupported', 'Rollback plan is explicit'],
    verificationStrategy: 'User approves permission scope and rollback plan before execution.'
  },
  'professional-growth-plan': {
    preset: 'professional-growth-plan',
    name: 'Professional Growth Plan',
    description: 'Plan professional growth based on verified achievements and positioning.',
    requiredInputs: ['Current professional profile', 'Verified achievements and signals'],
    optionalInputs: ['Target growth areas', 'Desired positioning', 'Time commitment', 'Learning resources'],
    estimatedSteps: 6,
    expectedArtifacts: ['Growth areas analysis', 'Skill development plan', 'Milestone targets', 'Resource list', 'Timeline'],
    permissionRequirements: ['CAN_CREATE_DRAFT', 'CAN_PROPOSE_TWIN_CHANGE'],
    successCriteria: ['Growth areas are grounded in verified evidence', 'Milestones are achievable'],
    verificationStrategy: 'User reviews growth areas and approves the development plan before execution.'
  },
  'custom-plan': {
    preset: 'custom-plan',
    name: 'Custom Plan',
    description: 'Flexible plan for any structured workflow not covered by other templates.',
    requiredInputs: ['Objective', 'Source context'],
    optionalInputs: ['Steps', 'Required approvals', 'Success criteria', 'Timeline'],
    estimatedSteps: 5,
    expectedArtifacts: ['Structured plan draft', 'Approval gates', 'Missing inputs', 'Expected output'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Objective is clear and achievable', 'Steps are actionable'],
    verificationStrategy: 'User reviews the structured plan and approves before execution.'
  },
  'custom-plan-extended': {
    preset: 'custom-plan-extended',
    name: 'Extended Custom Plan',
    description: 'Full-featured custom plan with dependencies, risks, and detailed outputs.',
    requiredInputs: ['Objective', 'Source context', 'Key constraints'],
    optionalInputs: ['Detailed steps with dependencies', 'Risk register', 'Resource requirements', 'Success metrics'],
    estimatedSteps: 8,
    expectedArtifacts: ['Detailed plan with dependencies', 'Risk register', 'Resource plan', 'Success metrics', 'Timeline'],
    permissionRequirements: ['CAN_CREATE_DRAFT', 'CAN_CREATE_PLAN'],
    successCriteria: ['All steps have clear owners and inputs', 'Risks are identified and mitigated'],
    verificationStrategy: 'User reviews the full plan, dependencies, and risks before execution.'
  },
  'buyer-persona-plan': {
    preset: 'buyer-persona-plan',
    name: 'Buyer Persona Plan',
    description: 'Plan development of a buyer persona grounded in verified audience data.',
    requiredInputs: ['Audience signal or profile data'],
    optionalInputs: ['Target segment', 'Pain points', 'Decision criteria'],
    estimatedSteps: 5,
    expectedArtifacts: ['Persona draft', 'Empathy map', 'Gap analysis'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Persona is grounded in verified signals', 'Gaps are explicit'],
    verificationStrategy: 'User reviews persona claims and approves before use.'
  },
  'opportunity-analysis-plan': {
    preset: 'opportunity-analysis-plan',
    name: 'Opportunity Analysis Plan',
    description: 'Plan structured analysis of a detected opportunity.',
    requiredInputs: ['Opportunity signal'],
    optionalInputs: ['Impact criteria', 'Decision owner'],
    estimatedSteps: 4,
    expectedArtifacts: ['Analysis brief', 'Recommendation', 'Evidence links'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Opportunity is grounded in evidence', 'Recommendation is actionable'],
    verificationStrategy: 'User reviews the analysis and recommendation before acting.'
  },
  'workflow-plan': {
    preset: 'workflow-plan',
    name: 'Workflow Plan',
    description: 'Plan a repeatable workflow from existing recurring activity.',
    requiredInputs: ['Workflow goal', 'Recurring activity context'],
    optionalInputs: ['Step owner', 'Automation targets'],
    estimatedSteps: 5,
    expectedArtifacts: ['Workflow steps', 'Trigger map', 'Handoff checklist'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Workflow is grounded in recurring activity', 'Steps are actionable'],
    verificationStrategy: 'User reviews workflow steps before activation.'
  },
  'resume-profile-improvement-plan': {
    preset: 'resume-profile-improvement-plan',
    name: 'Resume & Profile Improvement Plan',
    description: 'Plan resume or profile improvements grounded in verified achievements.',
    requiredInputs: ['Current resume or profile'],
    optionalInputs: ['Target roles', 'Achievements to feature'],
    estimatedSteps: 6,
    expectedArtifacts: ['Suggestion list', 'Achievement-backed edits', 'Review schedule'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Edits are grounded in verified achievements', 'Suggestions are actionable'],
    verificationStrategy: 'User reviews each edit and approves before publishing.'
  },
  'weekly-execution-plan': {
    preset: 'weekly-execution-plan',
    name: 'Weekly Execution Plan',
    description: 'Plan weekly execution priorities from recent activity and goals.',
    requiredInputs: ['Weekly goal', 'Recent activity summary'],
    optionalInputs: ['Time budget', 'Priority ranking'],
    estimatedSteps: 4,
    expectedArtifacts: ['Priority list', 'Time allocation', 'Check-in schedule'],
    permissionRequirements: ['CAN_CREATE_DRAFT'],
    successCriteria: ['Priorities are grounded in goals', 'Timeline is realistic'],
    verificationStrategy: 'User reviews weekly priorities before execution.'
  }
};

// ---------------------------------------------------------------------------
// Compile plan draft from achievement
// ---------------------------------------------------------------------------

export interface CompilePlanFromAchievementInput {
  workspace: BrandOpsData;
  achievement: Achievement;
  preset: ExtendedPlanPreset;
  userIntent?: string;
  conversationId?: string;
}

export interface CompilePlanFromAchievementResult {
  draft: PlanDraft;
  template: PlanTemplate;
}

export function compilePlanFromAchievement(input: CompilePlanFromAchievementInput): CompilePlanFromAchievementResult {
  const template = PLAN_TEMPLATES[input.preset];
  if (!template) throw new Error(`Unknown plan preset: ${input.preset}`);

  const intent = input.userIntent ?? `Create a ${template.name} from achievement "${input.achievement.title}".`;
  const conversationId = input.conversationId ?? input.achievement.id;

  const askInput: ConvertAskResponseToPlanInput = {
    conversationId,
    messageId: `achievement-${input.achievement.id}`,
    responseText: `Achievement: ${input.achievement.title}. Kind: ${input.achievement.kind.replace(/-/g, ' ')}. ${input.achievement.detail.slice(0, 500)}`,
    userIntent: intent,
    activeTwinId: undefined,
    planPreset: input.preset as PlanPreset,
    workspaceContext: input.workspace,
    sourceSurface: 'agent-event',
    verifiedFactsUsed: [],
    unverifiedMissingFacts: []
  };

  const draftResult = convertAskResponseToPlan(askInput);
  if (!draftResult.ok) {
    throw new Error(`Plan compilation failed: ${draftResult.error}`);
  }

  // Override the draft with template-specific fields
  const draft = {
    ...draftResult.draft,
    planType: input.preset as PlanPreset,
    missingInputs: template.requiredInputs,
    expectedOutput: template.expectedArtifacts.join('; '),
    estimatedEffort: estimateEffortFromTemplate(template)
  };

  return { draft, template };
}

function estimateEffortFromTemplate(template: PlanTemplate): string {
  if (template.estimatedSteps <= 5) return 'short';
  if (template.estimatedSteps <= 7) return 'medium';
  return 'long';
}

// ---------------------------------------------------------------------------
// Compile plan from opportunity
// ---------------------------------------------------------------------------

export interface CompilePlanFromOpportunityInput {
  workspace: BrandOpsData;
  opportunity: OpportunityRecommendation;
  preset: ExtendedPlanPreset;
  userIntent?: string;
  conversationId?: string;
}

export function compilePlanFromOpportunity(input: CompilePlanFromOpportunityInput): CompilePlanFromAchievementResult {
  const template = PLAN_TEMPLATES[input.preset];
  if (!template) throw new Error(`Unknown plan preset: ${input.preset}`);

  const intent = input.userIntent ?? `Create a ${template.name} from opportunity "${input.opportunity.title}".`;
  const conversationId = input.conversationId ?? input.opportunity.id;

  const askInput: ConvertAskResponseToPlanInput = {
    conversationId,
    messageId: `opportunity-${input.opportunity.id}`,
    responseText: `Opportunity: ${input.opportunity.title}. Category: ${input.opportunity.category}. ${input.opportunity.description.slice(0, 500)}`,
    userIntent: intent,
    activeTwinId: undefined,
    planPreset: input.preset as PlanPreset,
    workspaceContext: input.workspace,
    sourceSurface: 'agent-proposal',
    verifiedFactsUsed: [],
    unverifiedMissingFacts: []
  };

  const draftResult = convertAskResponseToPlan(askInput);
  if (!draftResult.ok) {
    throw new Error(`Plan compilation failed: ${draftResult.error}`);
  }

  const draft = {
    ...draftResult.draft,
    planType: input.preset as PlanPreset,
    missingInputs: template.requiredInputs,
    expectedOutput: template.expectedArtifacts.join('; '),
    estimatedEffort: estimateEffortFromTemplate(template)
  };

  return { draft, template };
}

// ---------------------------------------------------------------------------
// Validate plan inputs
// ---------------------------------------------------------------------------

export interface ValidatePlanInputsInput {
  template: PlanTemplate;
  providedInputs: Record<string, unknown>;
}

export interface ValidatePlanInputsResult {
  valid: boolean;
  missingRequired: string[];
  warnings: string[];
}

export function validatePlanInputs(input: ValidatePlanInputsInput): ValidatePlanInputsResult {
  const missingRequired: string[] = [];
  const warnings: string[] = [];

  for (const required of input.template.requiredInputs) {
    const found = Object.keys(input.providedInputs).some((key) =>
      key.toLowerCase().includes(required.toLowerCase().split(' ')[0].toLowerCase())
    );
    if (!found) {
      missingRequired.push(required);
    }
  }

  if (input.template.requiredInputs.length > 0 && missingRequired.length === input.template.requiredInputs.length) {
    warnings.push('No required inputs detected — plan will need significant user input.');
  }

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    warnings
  };
}
