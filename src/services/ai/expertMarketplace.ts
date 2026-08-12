import type {
  ExpertContextKey,
  ExpertIoSchema,
  ExpertRoutingCondition,
  OperationalExpertTask,
  OperationalMode
} from './expertRegistry';
import type { ExpertProfessionPath, ExpertWorkflowType } from './expertRoutingEngine';

export type MarketplaceExpertId = `marketplace:${string}/${string}`;
export type MarketplaceExpertTask = OperationalExpertTask | `custom:${string}`;
export type MarketplaceContextKey = ExpertContextKey | `integration:${string}` | `custom:${string}`;
export type MarketplaceWorkflowType = ExpertWorkflowType | `custom:${string}`;
export type MarketplaceProfessionPath = ExpertProfessionPath | `custom:${string}`;

export type MarketplaceExpertRuntime =
  | 'declarative_playbook'
  | 'hosted_connector'
  | 'local_rule'
  | 'remote_tool';

export type MarketplaceTrustLevel = 'first_party' | 'verified_partner' | 'community' | 'private';

export interface MarketplaceIntegrationRequirement {
  provider: string;
  required: boolean;
  scopes: readonly string[];
  description: string;
}

export interface MarketplaceOperationalLogic {
  runtime: MarketplaceExpertRuntime;
  entrypoint?: string;
  timeoutMs: number;
  approvalRequired: true;
  permissions: readonly (
    | 'read_workspace'
    | 'write_draft'
    | 'propose_action'
    | 'call_integration'
  )[];
  failureMode: 'deactivate_expert' | 'fallback_to_core_expert' | 'ask_for_human_review';
}

export interface MarketplaceSpecialization {
  id: string;
  label: string;
  keywords: readonly string[];
  tasks: readonly MarketplaceExpertTask[];
}

export interface MarketplaceExpertManifest {
  schemaVersion: '1.0.0';
  id: MarketplaceExpertId;
  packageName: string;
  version: string;
  name: string;
  description: string;
  publisher: {
    id: string;
    name: string;
    trustLevel: MarketplaceTrustLevel;
  };
  professions: readonly MarketplaceSpecialization[];
  workflows: readonly (MarketplaceSpecialization & { workflowType: MarketplaceWorkflowType })[];
  integrations: readonly MarketplaceIntegrationRequirement[];
  requiredContext: readonly MarketplaceContextKey[];
  supportedModes: readonly OperationalMode[];
  inputSchema: ExpertIoSchema;
  outputSchema: ExpertIoSchema;
  routing: {
    baseConfidence: number;
    minimumRoutableConfidence: number;
    conditions: readonly Omit<ExpertRoutingCondition, 'taskHints' | 'requiredContext'>[] & {
      readonly [index: number]: Omit<ExpertRoutingCondition, 'taskHints' | 'requiredContext'> & {
        taskHints: readonly MarketplaceExpertTask[];
        requiredContext: readonly MarketplaceContextKey[];
      };
    };
  };
  logic: MarketplaceOperationalLogic;
  observability: {
    emitsUserReceipt: true;
    developerTraceInternalOnly: true;
    qualitySignals: readonly string[];
  };
}

export interface MarketplaceExpertRouteInput {
  text?: string;
  mode?: OperationalMode;
  professionPath?: MarketplaceProfessionPath;
  workflowType?: MarketplaceWorkflowType;
  taskHints?: readonly MarketplaceExpertTask[];
  availableContext?: readonly MarketplaceContextKey[];
  connectedIntegrations?: readonly string[];
  maxExperts?: number;
}

export interface MarketplaceExpertCandidate {
  manifest: MarketplaceExpertManifest;
  score: number;
  reasons: string[];
  missingContext: MarketplaceContextKey[];
  missingIntegrations: string[];
}

export interface MarketplaceValidationIssue {
  manifestId: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface MarketplaceRegistrationResult {
  accepted: MarketplaceExpertManifest[];
  rejected: Array<{
    manifest: MarketplaceExpertManifest;
    issues: MarketplaceValidationIssue[];
  }>;
  issues: MarketplaceValidationIssue[];
}

function clean(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function normalized(value: string | undefined): string {
  return clean(value).toLowerCase();
}

function uniq<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function keywordMatches(text: string, keywords: readonly string[]): number {
  if (!text) return 0;
  return keywords.reduce((sum, keyword) => {
    const term = normalized(keyword);
    return sum + (term && text.includes(term) ? 1 : 0);
  }, 0);
}

function hasAny<T>(values: readonly T[], selected: ReadonlySet<T>): boolean {
  return values.some((value) => selected.has(value));
}

export function validateMarketplaceExpertManifest(
  manifest: MarketplaceExpertManifest
): MarketplaceValidationIssue[] {
  const issues: MarketplaceValidationIssue[] = [];
  const id = manifest.id || 'unknown';

  if (!manifest.id.startsWith('marketplace:')) {
    issues.push({
      manifestId: id,
      severity: 'error',
      message: 'Expert id must use marketplace: scope.'
    });
  }
  if (!clean(manifest.name) || !clean(manifest.description)) {
    issues.push({
      manifestId: id,
      severity: 'error',
      message: 'Expert name and description are required.'
    });
  }
  if (!manifest.professions.length && !manifest.workflows.length) {
    issues.push({
      manifestId: id,
      severity: 'error',
      message: 'At least one profession or workflow specialization is required.'
    });
  }
  if (!manifest.supportedModes.length) {
    issues.push({
      manifestId: id,
      severity: 'error',
      message: 'At least one supported mode is required.'
    });
  }
  if (!manifest.inputSchema?.fields || !manifest.outputSchema?.fields) {
    issues.push({
      manifestId: id,
      severity: 'error',
      message: 'Input and output schemas are required.'
    });
  }
  if (manifest.routing.baseConfidence < 0 || manifest.routing.baseConfidence > 1) {
    issues.push({
      manifestId: id,
      severity: 'error',
      message: 'Base confidence must be between 0 and 1.'
    });
  }
  if (
    manifest.routing.minimumRoutableConfidence < 0 ||
    manifest.routing.minimumRoutableConfidence > 1
  ) {
    issues.push({
      manifestId: id,
      severity: 'error',
      message: 'Minimum routable confidence must be between 0 and 1.'
    });
  }
  if (!manifest.logic.approvalRequired) {
    issues.push({
      manifestId: id,
      severity: 'error',
      message: 'Marketplace experts must require approval for operational logic.'
    });
  }
  if (
    !manifest.observability.emitsUserReceipt ||
    !manifest.observability.developerTraceInternalOnly
  ) {
    issues.push({
      manifestId: id,
      severity: 'error',
      message: 'Marketplace experts must emit user receipts and keep developer traces internal.'
    });
  }
  if (manifest.logic.runtime === 'remote_tool' && !manifest.integrations.length) {
    issues.push({
      manifestId: id,
      severity: 'warning',
      message: 'Remote tool experts should declare integration requirements.'
    });
  }

  return issues;
}

export function registerMarketplaceExperts(
  manifests: readonly MarketplaceExpertManifest[]
): MarketplaceRegistrationResult {
  const seen = new Set<MarketplaceExpertId>();
  const accepted: MarketplaceExpertManifest[] = [];
  const rejected: MarketplaceRegistrationResult['rejected'] = [];
  const issues: MarketplaceValidationIssue[] = [];

  for (const manifest of manifests) {
    const manifestIssues = [...validateMarketplaceExpertManifest(manifest)];
    if (seen.has(manifest.id)) {
      manifestIssues.push({
        manifestId: manifest.id,
        severity: 'error',
        message: 'Duplicate marketplace expert id.'
      });
    }
    seen.add(manifest.id);
    issues.push(...manifestIssues);

    if (manifestIssues.some((issue) => issue.severity === 'error')) {
      rejected.push({ manifest, issues: manifestIssues });
    } else {
      accepted.push(manifest);
    }
  }

  return { accepted, rejected, issues };
}

function scoreMarketplaceExpert(
  manifest: MarketplaceExpertManifest,
  input: MarketplaceExpertRouteInput
): MarketplaceExpertCandidate {
  const text = normalized(input.text);
  const taskHints = new Set(input.taskHints ?? []);
  const availableContext = new Set(input.availableContext ?? []);
  const connectedIntegrations = new Set(
    (input.connectedIntegrations ?? []).map((item) => normalized(item))
  );
  const reasons: string[] = [];
  const missingContext = manifest.requiredContext.filter(
    (context) => !availableContext.has(context)
  );
  const missingIntegrations = manifest.integrations
    .filter(
      (integration) =>
        integration.required && !connectedIntegrations.has(normalized(integration.provider))
    )
    .map((integration) => integration.provider);

  let score = manifest.routing.baseConfidence * 0.25;

  if (input.mode && manifest.supportedModes.includes(input.mode)) {
    score += 0.12;
    reasons.push(`mode:${input.mode}`);
  }

  const profession = input.professionPath;
  if (
    profession &&
    manifest.professions.some(
      (specialization) =>
        specialization.id === profession || specialization.id === `custom:${profession}`
    )
  ) {
    score += 0.18;
    reasons.push(`profession:${profession}`);
  }

  if (
    input.workflowType &&
    manifest.workflows.some((specialization) => specialization.workflowType === input.workflowType)
  ) {
    score += 0.18;
    reasons.push(`workflow:${input.workflowType}`);
  }

  const taskMatched =
    manifest.professions.some((specialization) => hasAny(specialization.tasks, taskHints)) ||
    manifest.workflows.some((specialization) => hasAny(specialization.tasks, taskHints));
  if (taskMatched) {
    score += 0.16;
    reasons.push('task_match');
  }

  const keywordCount =
    manifest.professions.reduce(
      (sum, specialization) => sum + keywordMatches(text, specialization.keywords),
      0
    ) +
    manifest.workflows.reduce(
      (sum, specialization) => sum + keywordMatches(text, specialization.keywords),
      0
    ) +
    manifest.routing.conditions.reduce(
      (sum, condition) => sum + keywordMatches(text, condition.keywords),
      0
    );
  if (keywordCount > 0) {
    score += Math.min(0.22, keywordCount * 0.04);
    reasons.push(`keyword_match:${keywordCount}`);
  }

  if (manifest.requiredContext.length && missingContext.length === 0) {
    score += 0.08;
    reasons.push('context_ready');
  }
  if (manifest.integrations.length && missingIntegrations.length === 0) {
    score += 0.08;
    reasons.push('integrations_ready');
  }
  if (missingContext.length) score -= Math.min(0.16, missingContext.length * 0.04);
  if (missingIntegrations.length) score -= Math.min(0.18, missingIntegrations.length * 0.06);

  return {
    manifest,
    score: Number(Math.max(0, Math.min(1, score)).toFixed(3)),
    reasons: uniq(reasons),
    missingContext,
    missingIntegrations
  };
}

export function routeMarketplaceExperts(
  manifests: readonly MarketplaceExpertManifest[],
  input: MarketplaceExpertRouteInput
): MarketplaceExpertCandidate[] {
  const registration = registerMarketplaceExperts(manifests);
  const maxExperts = input.maxExperts ?? registration.accepted.length;
  return registration.accepted
    .map((manifest) => scoreMarketplaceExpert(manifest, input))
    .filter((candidate) => candidate.score >= candidate.manifest.routing.minimumRoutableConfidence)
    .sort((a, b) => b.score - a.score || a.manifest.name.localeCompare(b.manifest.name))
    .slice(0, maxExperts);
}

const simpleSchema = (description: string): ExpertIoSchema => ({
  schemaVersion: '1.0.0',
  description,
  fields: {
    userIntent: { type: 'string', description: 'User request.', required: true },
    recommendation: { type: 'string', description: 'Expert recommendation.', required: true },
    confidence: { type: 'number', description: 'Confidence from 0 to 1.', required: true }
  }
});

function marketplaceCondition(
  id: string,
  routeWhen: string,
  keywords: readonly string[],
  taskHints: readonly MarketplaceExpertTask[],
  requiredContext: readonly MarketplaceContextKey[]
): MarketplaceExpertManifest['routing']['conditions'][number] {
  return {
    id,
    routeWhen,
    modes: ['ask', 'plan', 'operate'],
    taskHints,
    keywords,
    requiredContext
  };
}

export const MARKETPLACE_EXPERT_EXAMPLES: readonly MarketplaceExpertManifest[] = [
  {
    schemaVersion: '1.0.0',
    id: 'marketplace:brandops/sales-expert',
    packageName: '@brandops/marketplace-sales-expert',
    version: '0.1.0',
    name: 'Sales Expert',
    description:
      'Specializes in pipeline strategy, sales messaging, deal movement, and CRM-aware workflows.',
    publisher: { id: 'brandops', name: 'BrandOps', trustLevel: 'first_party' },
    professions: [
      {
        id: 'custom:sales',
        label: 'Sales',
        keywords: ['sales', 'account executive', 'revops', 'pipeline'],
        tasks: ['opportunity_scoring', 'pipeline_movement', 'outreach_drafting']
      }
    ],
    workflows: [
      {
        id: 'sales-pipeline',
        label: 'Sales pipeline',
        workflowType: 'custom:sales_pipeline',
        keywords: ['deal', 'crm', 'pipeline', 'proposal', 'close'],
        tasks: ['opportunity_scoring', 'pipeline_movement', 'relationship_follow_up']
      }
    ],
    integrations: [
      {
        provider: 'crm',
        required: false,
        scopes: ['read_deals', 'write_drafts'],
        description: 'Optional CRM context for deal stages and account notes.'
      }
    ],
    requiredContext: ['opportunities', 'contacts'],
    supportedModes: ['ask', 'plan', 'operate'],
    inputSchema: simpleSchema('Sales expert input contract.'),
    outputSchema: simpleSchema('Sales expert output contract.'),
    routing: {
      baseConfidence: 0.62,
      minimumRoutableConfidence: 0.42,
      conditions: [
        marketplaceCondition(
          'sales-pipeline-keywords',
          'Sales or CRM workflow is requested.',
          ['sales', 'pipeline', 'deal'],
          ['pipeline_movement'],
          ['opportunities']
        )
      ]
    },
    logic: {
      runtime: 'declarative_playbook',
      timeoutMs: 3000,
      approvalRequired: true,
      permissions: ['read_workspace', 'write_draft', 'propose_action'],
      failureMode: 'fallback_to_core_expert'
    },
    observability: {
      emitsUserReceipt: true,
      developerTraceInternalOnly: true,
      qualitySignals: ['deal_stage_grounding', 'next_action_specificity']
    }
  },
  {
    schemaVersion: '1.0.0',
    id: 'marketplace:brandops/legal-expert',
    packageName: '@brandops/marketplace-legal-expert',
    version: '0.1.0',
    name: 'Legal Expert',
    description:
      'Reviews operational plans for legal-sensitive language, claims, approvals, and risk flags.',
    publisher: { id: 'brandops', name: 'BrandOps', trustLevel: 'verified_partner' },
    professions: [
      {
        id: 'custom:legal',
        label: 'Legal',
        keywords: ['legal', 'counsel', 'contract', 'compliance'],
        tasks: ['custom:legal_review', 'missing_info_detection']
      }
    ],
    workflows: [
      {
        id: 'legal-review',
        label: 'Legal review',
        workflowType: 'custom:legal_review',
        keywords: ['contract', 'terms', 'claim', 'compliance', 'risk'],
        tasks: ['custom:legal_review', 'missing_info_detection']
      }
    ],
    integrations: [],
    requiredContext: ['external_artifacts', 'memory_context'],
    supportedModes: ['ask', 'plan'],
    inputSchema: simpleSchema('Legal expert input contract.'),
    outputSchema: simpleSchema('Legal expert output contract.'),
    routing: {
      baseConfidence: 0.58,
      minimumRoutableConfidence: 0.44,
      conditions: [
        marketplaceCondition(
          'legal-risk-keywords',
          'Legal-sensitive or compliance language is present.',
          ['legal', 'contract', 'compliance', 'risk'],
          ['custom:legal_review'],
          ['external_artifacts']
        )
      ]
    },
    logic: {
      runtime: 'local_rule',
      timeoutMs: 2000,
      approvalRequired: true,
      permissions: ['read_workspace', 'propose_action'],
      failureMode: 'ask_for_human_review'
    },
    observability: {
      emitsUserReceipt: true,
      developerTraceInternalOnly: true,
      qualitySignals: ['risk_flags', 'missing_terms', 'approval_required']
    }
  },
  {
    schemaVersion: '1.0.0',
    id: 'marketplace:brandops/creator-monetization-expert',
    packageName: '@brandops/marketplace-creator-monetization-expert',
    version: '0.1.0',
    name: 'Creator Monetization Expert',
    description:
      'Specializes in offers, sponsorships, audience products, creator funnels, and monetization workflows.',
    publisher: { id: 'brandops', name: 'BrandOps', trustLevel: 'first_party' },
    professions: [
      {
        id: 'creator',
        label: 'Creator',
        keywords: ['creator', 'audience', 'newsletter', 'community'],
        tasks: ['content_ideation', 'opportunity_scoring', 'behavior_prediction']
      }
    ],
    workflows: [
      {
        id: 'creator-monetization',
        label: 'Creator monetization',
        workflowType: 'custom:creator_monetization',
        keywords: ['monetization', 'sponsor', 'offer', 'course', 'membership'],
        tasks: ['content_ideation', 'opportunity_scoring', 'custom:offer_design']
      }
    ],
    integrations: [
      {
        provider: 'linkedin',
        required: false,
        scopes: ['read_posts', 'write_drafts'],
        description: 'Optional audience and publishing context.'
      }
    ],
    requiredContext: ['content_library', 'publishing_queue', 'operator_traces'],
    supportedModes: ['ask', 'plan', 'operate'],
    inputSchema: simpleSchema('Creator monetization expert input contract.'),
    outputSchema: simpleSchema('Creator monetization expert output contract.'),
    routing: {
      baseConfidence: 0.64,
      minimumRoutableConfidence: 0.42,
      conditions: [
        marketplaceCondition(
          'creator-monetization-keywords',
          'Creator monetization workflow is requested.',
          ['monetization', 'sponsor', 'offer'],
          ['opportunity_scoring'],
          ['content_library']
        )
      ]
    },
    logic: {
      runtime: 'declarative_playbook',
      timeoutMs: 3000,
      approvalRequired: true,
      permissions: ['read_workspace', 'write_draft', 'propose_action'],
      failureMode: 'fallback_to_core_expert'
    },
    observability: {
      emitsUserReceipt: true,
      developerTraceInternalOnly: true,
      qualitySignals: ['audience_fit', 'offer_specificity', 'approval_gate_present']
    }
  },
  {
    schemaVersion: '1.0.0',
    id: 'marketplace:brandops/recruiting-expert',
    packageName: '@brandops/marketplace-recruiting-expert',
    version: '0.1.0',
    name: 'Recruiting Expert',
    description:
      'Specializes in candidate sourcing, hiring workflows, recruiter outreach, and ATS-aware plans.',
    publisher: { id: 'brandops', name: 'BrandOps', trustLevel: 'first_party' },
    professions: [
      {
        id: 'recruiter',
        label: 'Recruiter',
        keywords: ['recruiter', 'candidate', 'hiring', 'talent'],
        tasks: ['outreach_drafting', 'relationship_follow_up', 'integration_mapping']
      }
    ],
    workflows: [
      {
        id: 'candidate-pipeline',
        label: 'Candidate pipeline',
        workflowType: 'recruiter_ops',
        keywords: ['candidate', 'sourcing', 'interview', 'ats'],
        tasks: ['outreach_drafting', 'plan_generation', 'integration_mapping']
      }
    ],
    integrations: [
      {
        provider: 'ats',
        required: false,
        scopes: ['read_candidates', 'write_drafts'],
        description: 'Optional ATS context for candidate stage and source tracking.'
      }
    ],
    requiredContext: ['contacts', 'integration_hub'],
    supportedModes: ['ask', 'plan', 'operate'],
    inputSchema: simpleSchema('Recruiting expert input contract.'),
    outputSchema: simpleSchema('Recruiting expert output contract.'),
    routing: {
      baseConfidence: 0.64,
      minimumRoutableConfidence: 0.42,
      conditions: [
        marketplaceCondition(
          'recruiting-keywords',
          'Recruiting or candidate workflow is requested.',
          ['candidate', 'hiring', 'sourcing'],
          ['outreach_drafting'],
          ['contacts']
        )
      ]
    },
    logic: {
      runtime: 'hosted_connector',
      timeoutMs: 4000,
      approvalRequired: true,
      permissions: ['read_workspace', 'write_draft', 'propose_action', 'call_integration'],
      failureMode: 'fallback_to_core_expert'
    },
    observability: {
      emitsUserReceipt: true,
      developerTraceInternalOnly: true,
      qualitySignals: ['candidate_stage_grounding', 'outreach_specificity', 'integration_status']
    }
  }
];

export function summarizeMarketplaceArchitecture(
  manifests: readonly MarketplaceExpertManifest[] = MARKETPLACE_EXPERT_EXAMPLES
): string[] {
  return manifests.map((manifest) => {
    const professions = manifest.professions.map((item) => item.label).join(', ') || 'general';
    const workflows = manifest.workflows.map((item) => item.label).join(', ') || 'general';
    const integrations = manifest.integrations.map((item) => item.provider).join(', ') || 'none';
    return `${manifest.name}: professions=${professions}; workflows=${workflows}; integrations=${integrations}; runtime=${manifest.logic.runtime}.`;
  });
}
