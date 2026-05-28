/**
 * BrandOps Operational Expert Registry.
 *
 * This is a deterministic registry for routing ASK / PLAN / OPERATE work to
 * operational experts. It is not a transformer MoE implementation; experts are
 * typed capability cards that describe context needs, IO contracts, confidence
 * scoring, and routing conditions.
 */

export type OperationalMode = 'ask' | 'plan' | 'operate';

export type OperationalExpertId =
  | 'positioning-expert'
  | 'outreach-expert'
  | 'content-expert'
  | 'planning-expert'
  | 'opportunity-expert'
  | 'behavioral-expert'
  | 'integration-expert'
  | 'twin-memory-expert';

export type OperationalExpertTask =
  | 'positioning_strategy'
  | 'message_refinement'
  | 'audience_definition'
  | 'outreach_drafting'
  | 'relationship_follow_up'
  | 'reply_strategy'
  | 'content_ideation'
  | 'content_drafting'
  | 'content_repurposing'
  | 'plan_generation'
  | 'plan_prioritization'
  | 'execution_readiness'
  | 'opportunity_scoring'
  | 'pipeline_movement'
  | 'deal_risk_review'
  | 'behavior_prediction'
  | 'cadence_optimization'
  | 'habit_signal_review'
  | 'integration_mapping'
  | 'artifact_sync_review'
  | 'source_health_review'
  | 'memory_retrieval'
  | 'twin_grounding'
  | 'missing_info_detection';

export type ExpertContextKey =
  | 'brand_profile'
  | 'brand_vault'
  | 'content_library'
  | 'publishing_queue'
  | 'outreach_drafts'
  | 'contacts'
  | 'opportunities'
  | 'follow_ups'
  | 'scheduler'
  | 'integration_hub'
  | 'external_artifacts'
  | 'operator_traces'
  | 'ai_assistant_traces'
  | 'digital_twins'
  | 'connected_identity'
  | 'memory_context'
  | 'app_settings';

export type ExpertSchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'enum';

export interface ExpertSchemaField {
  type: ExpertSchemaFieldType;
  description: string;
  required?: boolean;
  allowedValues?: readonly string[];
  items?: ExpertSchemaField;
}

export interface ExpertIoSchema {
  schemaVersion: '1.0.0';
  description: string;
  fields: Record<string, ExpertSchemaField>;
}

export interface ExpertConfidenceSignal {
  id: string;
  label: string;
  context: ExpertContextKey;
  weight: number;
  description: string;
}

export interface ExpertConfidencePenalty {
  id: string;
  label: string;
  weight: number;
  description: string;
}

export interface ExpertConfidenceScoring {
  baseScore: number;
  minimumRoutableScore: number;
  humanReviewBelowScore: number;
  signals: readonly ExpertConfidenceSignal[];
  penalties: readonly ExpertConfidencePenalty[];
}

export interface ExpertRoutingCondition {
  id: string;
  routeWhen: string;
  modes: readonly OperationalMode[];
  taskHints: readonly OperationalExpertTask[];
  keywords: readonly string[];
  requiredContext: readonly ExpertContextKey[];
  avoidWhen?: string;
}

export interface OperationalExpertDefinition {
  id: OperationalExpertId;
  name: string;
  purpose: string;
  supportedTasks: readonly OperationalExpertTask[];
  requiredContext: readonly ExpertContextKey[];
  inputSchema: ExpertIoSchema;
  outputSchema: ExpertIoSchema;
  confidenceScoring: ExpertConfidenceScoring;
  routingConditions: readonly ExpertRoutingCondition[];
}

export interface ExpertRoutingInput {
  text?: string;
  mode?: OperationalMode;
  taskHints?: readonly OperationalExpertTask[];
  availableContext?: readonly ExpertContextKey[];
  maxExperts?: number;
}

export interface ExpertRouteCandidate {
  expert: OperationalExpertDefinition;
  score: number;
  reasons: string[];
  matchedRoutingConditions: string[];
  missingContext: ExpertContextKey[];
}

const field = (
  type: ExpertSchemaFieldType,
  description: string,
  required = true,
  extra?: Pick<ExpertSchemaField, 'allowedValues' | 'items'>
): ExpertSchemaField => ({
  type,
  description,
  required,
  ...extra
});

const commonInputFields = {
  userIntent: field('string', 'Natural-language user request or command.'),
  mode: field('enum', 'Requested BrandOps execution mode.', true, {
    allowedValues: ['ask', 'plan', 'operate']
  }),
  workspaceRefs: field('array', 'Bounded references to relevant workspace entities.', false, {
    items: field('string', 'Workspace entity id or logical reference.')
  })
} satisfies Record<string, ExpertSchemaField>;

const commonOutputFields = {
  recommendation: field('string', 'Primary expert recommendation.'),
  confidence: field('number', 'Expert confidence from 0 to 1.'),
  evidenceRefs: field('array', 'Evidence ids or context slices used by the expert.', false, {
    items: field('string', 'Evidence reference.')
  }),
  blockers: field('array', 'Missing inputs or governance blockers.', false, {
    items: field('string', 'Blocker description.')
  })
} satisfies Record<string, ExpertSchemaField>;

const schema = (
  description: string,
  fields: Record<string, ExpertSchemaField>
): ExpertIoSchema => ({
  schemaVersion: '1.0.0',
  description,
  fields: {
    ...commonInputFields,
    ...fields
  }
});

const outputSchema = (
  description: string,
  fields: Record<string, ExpertSchemaField>
): ExpertIoSchema => ({
  schemaVersion: '1.0.0',
  description,
  fields: {
    ...commonOutputFields,
    ...fields
  }
});

const confidence = (
  baseScore: number,
  signals: readonly ExpertConfidenceSignal[],
  penalties: readonly ExpertConfidencePenalty[] = []
): ExpertConfidenceScoring => ({
  baseScore,
  minimumRoutableScore: 0.42,
  humanReviewBelowScore: 0.62,
  signals,
  penalties
});

const signal = (
  id: string,
  label: string,
  context: ExpertContextKey,
  weight: number,
  description: string
): ExpertConfidenceSignal => ({ id, label, context, weight, description });

const penalty = (
  id: string,
  label: string,
  weight: number,
  description: string
): ExpertConfidencePenalty => ({ id, label, weight, description });

export const OPERATIONAL_EXPERT_REGISTRY: readonly OperationalExpertDefinition[] = [
  {
    id: 'positioning-expert',
    name: 'Positioning Expert',
    purpose:
      'Clarifies market position, audience, promise, proof, differentiation, and professional narrative.',
    supportedTasks: ['positioning_strategy', 'message_refinement', 'audience_definition'],
    requiredContext: ['brand_profile', 'brand_vault', 'digital_twins'],
    inputSchema: schema('Inputs for positioning, messaging, and audience strategy.', {
      targetAudience: field('string', 'Audience, buyer, reader, or stakeholder segment.', false),
      offerOrIdentity: field('string', 'Offer, role, expertise area, or professional identity.', false),
      proofPoints: field('array', 'Claims, outcomes, examples, or credentials to ground messaging.', false, {
        items: field('string', 'Proof point.')
      })
    }),
    outputSchema: outputSchema('Outputs for brand positioning decisions.', {
      positioningStatement: field('string', 'Concise positioning statement.'),
      audienceDefinition: field('string', 'Target audience and fit criteria.'),
      differentiationNotes: field('array', 'Distinctive angles or anti-positioning notes.', false, {
        items: field('string', 'Differentiation note.')
      })
    }),
    confidenceScoring: confidence(0.7, [
      signal('brand-profile-depth', 'Brand profile depth', 'brand_profile', 0.25, 'Operator name, focus, and profile details are present.'),
      signal('vault-proof-density', 'Proof density', 'brand_vault', 0.3, 'Positioning statement, proof points, and reusable snippets exist.'),
      signal('twin-identity-grounding', 'Twin identity grounding', 'digital_twins', 0.25, 'Active twin includes reviewed identity and approved claims.')
    ], [
      penalty('missing-proof', 'Missing proof', 0.25, 'Strategic claims are weak without examples or evidence.'),
      penalty('conflicting-audiences', 'Conflicting audiences', 0.18, 'Multiple audiences are present without a priority order.')
    ]),
    routingConditions: [
      {
        id: 'positioning-keywords',
        routeWhen: 'The request asks how the operator, brand, offer, audience, or message should be positioned.',
        modes: ['ask', 'plan'],
        taskHints: ['positioning_strategy', 'message_refinement', 'audience_definition'],
        keywords: ['positioning', 'audience', 'niche', 'offer', 'headline', 'bio', 'message', 'differentiate'],
        requiredContext: ['brand_profile', 'brand_vault'],
        avoidWhen: 'The user is asking to send outreach or publish content immediately.'
      }
    ]
  },
  {
    id: 'outreach-expert',
    name: 'Outreach Expert',
    purpose:
      'Drafts and improves relationship-aware outreach, follow-up, replies, and warm reconnect sequences.',
    supportedTasks: ['outreach_drafting', 'relationship_follow_up', 'reply_strategy'],
    requiredContext: ['outreach_drafts', 'contacts', 'opportunities', 'follow_ups'],
    inputSchema: schema('Inputs for outreach drafting and reply strategy.', {
      recipient: field('string', 'Target person or account.', false),
      relationshipStage: field('string', 'Known relationship stage or warmth.', false),
      outreachGoal: field('string', 'Desired outcome such as intro, meeting, reply, or proposal.'),
      channel: field('enum', 'Target outreach channel.', false, {
        allowedValues: ['linkedin', 'email', 'newsletter', 'other']
      })
    }),
    outputSchema: outputSchema('Outputs for outreach execution or review.', {
      messageDraft: field('string', 'Proposed outreach or reply copy.'),
      followUpPlan: field('array', 'Follow-up steps and timing.', false, {
        items: field('string', 'Follow-up step.')
      }),
      relationshipRationale: field('string', 'Why this tone and ask fit the relationship.', false)
    }),
    confidenceScoring: confidence(0.68, [
      signal('contact-context', 'Contact context', 'contacts', 0.25, 'Contact details and relationship stage are available.'),
      signal('outreach-history', 'Outreach history', 'outreach_drafts', 0.22, 'Prior drafts or messages indicate tone and goal.'),
      signal('opportunity-linkage', 'Opportunity linkage', 'opportunities', 0.22, 'Relevant opportunity context exists.'),
      signal('follow-up-timing', 'Follow-up timing', 'follow_ups', 0.16, 'Follow-up state can guide urgency.')
    ], [
      penalty('unknown-recipient', 'Unknown recipient', 0.28, 'Recipient or relationship is not specified.'),
      penalty('unclear-ask', 'Unclear ask', 0.2, 'The requested outcome is vague.')
    ]),
    routingConditions: [
      {
        id: 'outreach-keywords',
        routeWhen: 'The request asks for outreach, replies, follow-ups, introductions, reconnects, or relationship copy.',
        modes: ['ask', 'plan', 'operate'],
        taskHints: ['outreach_drafting', 'relationship_follow_up', 'reply_strategy'],
        keywords: ['outreach', 'follow up', 'follow-up', 'reply', 'dm', 'intro', 'reconnect', 'message them'],
        requiredContext: ['contacts', 'outreach_drafts'],
        avoidWhen: 'The user is asking for general public content rather than one-to-one communication.'
      }
    ]
  },
  {
    id: 'content-expert',
    name: 'Content Expert',
    purpose:
      'Generates, repurposes, and reviews content ideas, posts, hooks, outlines, and publishing-ready drafts.',
    supportedTasks: ['content_ideation', 'content_drafting', 'content_repurposing'],
    requiredContext: ['content_library', 'publishing_queue', 'brand_vault'],
    inputSchema: schema('Inputs for content ideation, drafting, and repurposing.', {
      contentGoal: field('string', 'Goal such as awareness, demand, proof, teaching, or launch.'),
      channel: field('enum', 'Publishing channel.', false, {
        allowedValues: ['linkedin', 'newsletter', 'x', 'blog', 'youtube', 'podcast']
      }),
      sourceMaterial: field('array', 'Existing notes, artifacts, or content refs.', false, {
        items: field('string', 'Source material reference.')
      })
    }),
    outputSchema: outputSchema('Outputs for content workflow decisions.', {
      contentAngle: field('string', 'Recommended angle or thesis.'),
      draft: field('string', 'Draft or outline content.', false),
      publishingNotes: field('array', 'Tags, channel notes, or scheduling guidance.', false, {
        items: field('string', 'Publishing note.')
      })
    }),
    confidenceScoring: confidence(0.69, [
      signal('content-library-depth', 'Content library depth', 'content_library', 0.28, 'Existing ideas and drafts can ground recommendations.'),
      signal('queue-awareness', 'Publishing queue awareness', 'publishing_queue', 0.18, 'Upcoming posts prevent duplication and cadence conflicts.'),
      signal('brand-voice', 'Brand voice', 'brand_vault', 0.24, 'Brand vault provides reusable voice and proof material.')
    ], [
      penalty('no-channel', 'No channel', 0.15, 'Channel constraints are missing.'),
      penalty('thin-source-material', 'Thin source material', 0.2, 'Repurposing quality drops without source material.')
    ]),
    routingConditions: [
      {
        id: 'content-keywords',
        routeWhen: 'The request asks for posts, content ideas, hooks, outlines, publishing, or repurposing.',
        modes: ['ask', 'plan', 'operate'],
        taskHints: ['content_ideation', 'content_drafting', 'content_repurposing'],
        keywords: ['content', 'post', 'linkedin', 'publish', 'draft post', 'hook', 'outline', 'repurpose'],
        requiredContext: ['content_library', 'brand_vault'],
        avoidWhen: 'The request is about private outreach to one recipient.'
      }
    ]
  },
  {
    id: 'planning-expert',
    name: 'Planning Expert',
    purpose:
      'Turns intent into sequenced operational plans with dependencies, approvals, execution readiness, and next actions.',
    supportedTasks: ['plan_generation', 'plan_prioritization', 'execution_readiness'],
    requiredContext: ['scheduler', 'follow_ups', 'opportunities', 'publishing_queue', 'app_settings'],
    inputSchema: schema('Inputs for operational planning and prioritization.', {
      objective: field('string', 'Desired outcome or workstream objective.'),
      constraints: field('array', 'Timing, capacity, risk, or approval constraints.', false, {
        items: field('string', 'Constraint.')
      }),
      proposedActions: field('array', 'Candidate actions or command previews.', false, {
        items: field('string', 'Action.')
      })
    }),
    outputSchema: outputSchema('Outputs for PLAN mode and execution readiness.', {
      planSteps: field('array', 'Ordered steps for the operator or execution engine.', true, {
        items: field('string', 'Plan step.')
      }),
      approvalNeeds: field('array', 'Actions requiring review or confirmation.', false, {
        items: field('string', 'Approval item.')
      }),
      readinessVerdict: field('enum', 'Whether the plan can move toward execution.', true, {
        allowedValues: ['ready', 'needs_input', 'needs_approval', 'blocked']
      })
    }),
    confidenceScoring: confidence(0.72, [
      signal('scheduler-state', 'Scheduler state', 'scheduler', 0.22, 'Calendar-like task state clarifies timing.'),
      signal('pipeline-state', 'Pipeline state', 'opportunities', 0.18, 'Opportunity state informs priority.'),
      signal('queue-state', 'Publishing queue state', 'publishing_queue', 0.14, 'Queued content affects workload.'),
      signal('settings-policy', 'Settings policy', 'app_settings', 0.16, 'Operator settings define execution and trace preferences.')
    ], [
      penalty('missing-objective', 'Missing objective', 0.24, 'Planning needs a concrete outcome.'),
      penalty('unsafe-action', 'Unsafe action', 0.3, 'Unapproved external actions must not be executed.')
    ]),
    routingConditions: [
      {
        id: 'plan-mode',
        routeWhen: 'The request asks to plan, prioritize, convert ASK into steps, or prepare OPERATE.',
        modes: ['plan', 'operate'],
        taskHints: ['plan_generation', 'plan_prioritization', 'execution_readiness'],
        keywords: ['plan', 'prioritize', 'roadmap', 'next steps', 'operate', 'execute', 'workflow'],
        requiredContext: ['scheduler', 'app_settings'],
        avoidWhen: 'The user wants only a short factual answer.'
      }
    ]
  },
  {
    id: 'opportunity-expert',
    name: 'Opportunity Expert',
    purpose:
      'Evaluates opportunities, pipeline health, stage movement, deal risk, value, confidence, and next actions.',
    supportedTasks: ['opportunity_scoring', 'pipeline_movement', 'deal_risk_review'],
    requiredContext: ['opportunities', 'contacts', 'follow_ups', 'outreach_drafts'],
    inputSchema: schema('Inputs for pipeline and opportunity intelligence.', {
      opportunityRef: field('string', 'Opportunity name, id, account, or stage reference.', false),
      desiredStage: field('string', 'Target pipeline stage or movement request.', false),
      riskQuestion: field('string', 'Specific risk, value, or next-action question.', false)
    }),
    outputSchema: outputSchema('Outputs for opportunity decision support.', {
      opportunityScore: field('number', 'Opportunity priority or health score from 0 to 1.', false),
      stageRecommendation: field('string', 'Recommended stage movement or status change.', false),
      nextAction: field('string', 'Most important next action.')
    }),
    confidenceScoring: confidence(0.7, [
      signal('opportunity-detail', 'Opportunity detail', 'opportunities', 0.3, 'Value, stage, confidence, and next action exist.'),
      signal('contact-link', 'Contact linkage', 'contacts', 0.18, 'Related contact context exists.'),
      signal('follow-up-state', 'Follow-up state', 'follow_ups', 0.18, 'Pending follow-ups clarify momentum.'),
      signal('outreach-link', 'Outreach linkage', 'outreach_drafts', 0.12, 'Drafts show communication state.')
    ], [
      penalty('unknown-opportunity', 'Unknown opportunity', 0.3, 'No matching opportunity is referenced.'),
      penalty('stale-stage', 'Stale stage', 0.2, 'Stage confidence is weak when activity is stale.')
    ]),
    routingConditions: [
      {
        id: 'opportunity-keywords',
        routeWhen: 'The request asks about pipeline health, opportunity rank, deal risk, value, or stage movement.',
        modes: ['ask', 'plan', 'operate'],
        taskHints: ['opportunity_scoring', 'pipeline_movement', 'deal_risk_review'],
        keywords: ['opportunity', 'pipeline', 'deal', 'stage', 'proposal', 'prospect', 'rank', 'revenue'],
        requiredContext: ['opportunities'],
        avoidWhen: 'The request is about content or broad positioning without deal context.'
      }
    ]
  },
  {
    id: 'behavioral-expert',
    name: 'Behavioral Expert',
    purpose:
      'Predicts likely operator, audience, and relationship behavior from consented traces, cadence, and workflow history.',
    supportedTasks: ['behavior_prediction', 'cadence_optimization', 'habit_signal_review'],
    requiredContext: ['operator_traces', 'ai_assistant_traces', 'scheduler', 'connected_identity'],
    inputSchema: schema('Inputs for behavioral prediction and cadence optimization.', {
      behaviorQuestion: field('string', 'Prediction, habit, cadence, or timing question.'),
      entityScope: field('string', 'Operator, audience, contact, account, or workflow scope.', false),
      timeHorizon: field('string', 'Prediction horizon such as today, this week, or next 30 days.', false)
    }),
    outputSchema: outputSchema('Outputs for behavioral intelligence.', {
      prediction: field('string', 'Behavioral forecast.'),
      confidenceDrivers: field('array', 'Signals that drove the prediction.', false, {
        items: field('string', 'Confidence driver.')
      }),
      recommendedTiming: field('string', 'Suggested timing or cadence.', false)
    }),
    confidenceScoring: confidence(0.6, [
      signal('operator-traces', 'Operator traces', 'operator_traces', 0.3, 'Local operator traces reveal recurring workflow behavior.'),
      signal('assistant-traces', 'Assistant traces', 'ai_assistant_traces', 0.14, 'Ask/plan history clarifies repeated needs.'),
      signal('scheduler-history', 'Scheduler history', 'scheduler', 0.22, 'Task completion and snooze history indicate cadence.'),
      signal('connected-identity', 'Connected identity signals', 'connected_identity', 0.18, 'Consented connected identity signals improve context.')
    ], [
      penalty('trace-collection-off', 'Trace collection off', 0.35, 'Behavior prediction should be conservative without traces.'),
      penalty('private-data-risk', 'Private data risk', 0.35, 'Raw private data must not be inferred or ingested automatically.')
    ]),
    routingConditions: [
      {
        id: 'behavior-keywords',
        routeWhen: 'The request asks what is likely to happen, when to act, what habit is emerging, or how to optimize cadence.',
        modes: ['ask', 'plan'],
        taskHints: ['behavior_prediction', 'cadence_optimization', 'habit_signal_review'],
        keywords: ['predict', 'likely', 'behavior', 'cadence', 'habit', 'timing', 'when should', 'pattern'],
        requiredContext: ['operator_traces', 'scheduler'],
        avoidWhen: 'The user expects certainty or requests unconsented private inference.'
      }
    ]
  },
  {
    id: 'integration-expert',
    name: 'Integration Expert',
    purpose:
      'Maps external sources, integration artifacts, sync health, source honesty, and ingestion readiness.',
    supportedTasks: ['integration_mapping', 'artifact_sync_review', 'source_health_review'],
    requiredContext: ['integration_hub', 'external_artifacts', 'app_settings'],
    inputSchema: schema('Inputs for integration and artifact decisions.', {
      sourceName: field('string', 'Integration source, vendor, or workspace system.', false),
      artifactType: field('string', 'Artifact kind such as document, issue, CRM record, or thread.', false),
      syncGoal: field('string', 'Desired mapping, review, or sync outcome.')
    }),
    outputSchema: outputSchema('Outputs for integration planning and health.', {
      integrationPlan: field('array', 'Steps to connect, map, or review an integration.', true, {
        items: field('string', 'Integration step.')
      }),
      sourceHealth: field('enum', 'Health or implementation status.', false, {
        allowedValues: ['connected', 'planned', 'needs_setup', 'degraded', 'unknown']
      }),
      artifactMapping: field('array', 'Artifact type mappings or sync assumptions.', false, {
        items: field('string', 'Artifact mapping.')
      })
    }),
    confidenceScoring: confidence(0.67, [
      signal('integration-source-state', 'Integration source state', 'integration_hub', 0.32, 'Registered sources and artifacts are available.'),
      signal('artifact-coverage', 'Artifact coverage', 'external_artifacts', 0.22, 'Imported artifacts can ground mapping decisions.'),
      signal('settings-constraints', 'Settings constraints', 'app_settings', 0.16, 'Settings clarify configured capabilities.')
    ], [
      penalty('unregistered-source', 'Unregistered source', 0.25, 'The source is not registered in the local workspace.'),
      penalty('sync-honesty-gap', 'Sync honesty gap', 0.22, 'A planned source should not be described as live sync.')
    ]),
    routingConditions: [
      {
        id: 'integration-keywords',
        routeWhen: 'The request asks to connect, map, sync, review, or reason about external tools and artifacts.',
        modes: ['ask', 'plan', 'operate'],
        taskHints: ['integration_mapping', 'artifact_sync_review', 'source_health_review'],
        keywords: ['integration', 'connect', 'sync', 'source', 'artifact', 'notion', 'github', 'google', 'slack'],
        requiredContext: ['integration_hub'],
        avoidWhen: 'The request is solely about local content drafting or positioning.'
      }
    ]
  },
  {
    id: 'twin-memory-expert',
    name: 'Twin Memory Expert',
    purpose:
      'Retrieves and constrains digital twin memory, approved claims, missing information, voice examples, and identity grounding.',
    supportedTasks: ['memory_retrieval', 'twin_grounding', 'missing_info_detection'],
    requiredContext: ['digital_twins', 'memory_context', 'connected_identity', 'brand_profile'],
    inputSchema: schema('Inputs for twin memory retrieval and grounding.', {
      memoryQuestion: field('string', 'Question about remembered facts, preferences, claims, or missing information.'),
      claimToCheck: field('string', 'Claim, draft, or recommendation that needs twin grounding.', false),
      allowedMemoryUse: field('enum', 'How memory may be used for the response.', false, {
        allowedValues: ['approved_only', 'ask_before_missing_facts', 'summarize_gaps']
      })
    }),
    outputSchema: outputSchema('Outputs for digital twin memory grounding.', {
      approvedMemory: field('array', 'Approved facts or preferences safe to use.', false, {
        items: field('string', 'Approved memory item.')
      }),
      missingInfoQuestions: field('array', 'Clarifying questions required before asserting facts.', false, {
        items: field('string', 'Clarifying question.')
      }),
      groundingVerdict: field('enum', 'Whether the response is grounded enough to proceed.', true, {
        allowedValues: ['grounded', 'ask_first', 'insufficient_context']
      })
    }),
    confidenceScoring: confidence(0.74, [
      signal('active-twin', 'Active twin', 'digital_twins', 0.34, 'An active reviewed twin exists.'),
      signal('memory-context', 'Memory context', 'memory_context', 0.22, 'Approved facts, preferences, and voice examples exist.'),
      signal('identity-signals', 'Connected identity signals', 'connected_identity', 0.14, 'Consented identity signals can supplement memory.'),
      signal('brand-profile', 'Brand profile', 'brand_profile', 0.12, 'Curated profile provides conflict resolution.')
    ], [
      penalty('no-active-twin', 'No active twin', 0.34, 'No active digital twin is available.'),
      penalty('unverified-claim', 'Unverified claim', 0.28, 'Unverified facts require clarification or exclusion.')
    ]),
    routingConditions: [
      {
        id: 'twin-memory-keywords',
        routeWhen: 'The request asks what the twin knows, how to ground a response, or whether a claim matches approved memory.',
        modes: ['ask', 'plan'],
        taskHints: ['memory_retrieval', 'twin_grounding', 'missing_info_detection'],
        keywords: ['twin', 'memory', 'remember', 'approved claim', 'voice', 'grounded', 'missing info'],
        requiredContext: ['digital_twins', 'memory_context'],
        avoidWhen: 'The user asks to infer private facts that are not approved memory.'
      }
    ]
  }
] as const;

const registryById = new Map(OPERATIONAL_EXPERT_REGISTRY.map((expert) => [expert.id, expert]));

export function listOperationalExperts(): readonly OperationalExpertDefinition[] {
  return OPERATIONAL_EXPERT_REGISTRY;
}

export function getOperationalExpert(
  id: OperationalExpertId
): OperationalExpertDefinition | undefined {
  return registryById.get(id);
}

export function listOperationalExpertIds(): OperationalExpertId[] {
  return OPERATIONAL_EXPERT_REGISTRY.map((expert) => expert.id);
}

function normalizeText(text: string | undefined): string {
  return (text ?? '').trim().toLowerCase();
}

function intersectCount<T>(a: readonly T[], b: ReadonlySet<T>): number {
  return a.reduce((sum, value) => sum + (b.has(value) ? 1 : 0), 0);
}

function missingContextFor(
  requiredContext: readonly ExpertContextKey[],
  availableContext: ReadonlySet<ExpertContextKey>
): ExpertContextKey[] {
  return requiredContext.filter((key) => !availableContext.has(key));
}

function keywordMatchCount(text: string, keywords: readonly string[]): number {
  if (!text) return 0;
  return keywords.reduce((sum, keyword) => {
    const normalized = keyword.toLowerCase();
    return sum + (normalized.length > 0 && text.includes(normalized) ? 1 : 0);
  }, 0);
}

function scoreExpertRoute(
  expert: OperationalExpertDefinition,
  input: ExpertRoutingInput
): ExpertRouteCandidate {
  const text = normalizeText(input.text);
  const taskHints = new Set(input.taskHints ?? []);
  const availableContext = new Set(input.availableContext ?? []);
  const reasons: string[] = [];
  const matchedRoutingConditions: string[] = [];
  const missingContext = missingContextFor(expert.requiredContext, availableContext);

  let score = expert.confidenceScoring.baseScore * 0.25;

  const supportedTaskMatches = intersectCount(expert.supportedTasks, taskHints);
  if (supportedTaskMatches > 0) {
    score += Math.min(0.24, supportedTaskMatches * 0.12);
    reasons.push(`task_match:${supportedTaskMatches}`);
  }

  const contextAvailableCount = expert.requiredContext.length - missingContext.length;
  if (expert.requiredContext.length > 0 && contextAvailableCount > 0) {
    score += (contextAvailableCount / expert.requiredContext.length) * 0.18;
    reasons.push(`context_available:${contextAvailableCount}/${expert.requiredContext.length}`);
  }

  for (const condition of expert.routingConditions) {
    let conditionScore = 0;
    const conditionReasons: string[] = [];
    if (input.mode && condition.modes.includes(input.mode)) {
      conditionScore += 0.12;
      conditionReasons.push(`mode:${input.mode}`);
    }

    const conditionTaskMatches = intersectCount(condition.taskHints, taskHints);
    if (conditionTaskMatches > 0) {
      conditionScore += Math.min(0.24, conditionTaskMatches * 0.12);
      conditionReasons.push(`condition_task_match:${conditionTaskMatches}`);
    }

    const matches = keywordMatchCount(text, condition.keywords);
    if (matches > 0) {
      conditionScore += Math.min(0.26, matches * 0.08);
      conditionReasons.push(`keyword_match:${matches}`);
    }

    const conditionMissing = missingContextFor(condition.requiredContext, availableContext);
    if (condition.requiredContext.length > 0 && conditionMissing.length === 0) {
      conditionScore += 0.08;
      conditionReasons.push('condition_context_ready');
    }

    if (conditionScore > 0) {
      score += conditionScore;
      matchedRoutingConditions.push(condition.id);
      reasons.push(...conditionReasons);
    }
  }

  if (missingContext.length > 0) {
    score -= Math.min(0.18, missingContext.length * 0.04);
    reasons.push(`missing_context:${missingContext.join(',')}`);
  }

  return {
    expert,
    score: Number(Math.max(0, Math.min(1, score)).toFixed(3)),
    reasons,
    matchedRoutingConditions,
    missingContext
  };
}

export function routeOperationalExperts(input: ExpertRoutingInput): ExpertRouteCandidate[] {
  const maxExperts = input.maxExperts ?? OPERATIONAL_EXPERT_REGISTRY.length;
  return OPERATIONAL_EXPERT_REGISTRY.map((expert) => scoreExpertRoute(expert, input))
    .filter((candidate) => candidate.score >= candidate.expert.confidenceScoring.minimumRoutableScore)
    .sort((a, b) => b.score - a.score || a.expert.name.localeCompare(b.expert.name))
    .slice(0, maxExperts);
}

export function summarizeOperationalExpertRegistry(): string[] {
  return OPERATIONAL_EXPERT_REGISTRY.map(
    (expert) =>
      `${expert.name}: ${expert.supportedTasks.length} task(s), ${expert.requiredContext.length} context requirement(s), ${expert.routingConditions.length} routing condition(s).`
  );
}
