import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import { buildBehavioralPredictionExpertReadout } from './behavioralPredictionExpert';
import {
  getOperationalExpert,
  type ExpertContextKey,
  type OperationalExpertId
} from './expertRegistry';
import {
  inferAvailableExpertContext,
  routeExpertSlate,
  type ExpertActivation,
  type ExpertRoutingEngineInput,
  type ExpertRoutingResolution,
  type ExpertWorkflowType
} from './expertRoutingEngine';

export type ExpertContributionKind =
  | 'strategic_angle'
  | 'messaging_draft'
  | 'execution_sequence'
  | 'fact_validation'
  | 'content_strategy'
  | 'opportunity_assessment'
  | 'behavioral_forecast'
  | 'integration_readout'
  | 'general_guidance';

export type CompositionReadiness = 'ready' | 'needs_review' | 'needs_input';

export interface ExpertContribution {
  expertId: OperationalExpertId;
  expertName: string;
  kind: ExpertContributionKind;
  summary: string;
  structuredOutput: {
    angle?: string;
    messageDraft?: string;
    planSteps?: string[];
    validationVerdict?: 'grounded' | 'ask_first' | 'insufficient_context';
    recommendations?: string[];
    risks?: string[];
    evidenceRefs?: string[];
  };
  confidence: number;
  explainability: {
    role: string;
    routingReasons: string[];
    missingContext: ExpertContextKey[];
  };
}

export interface ComposedAskResponse {
  headline: string;
  response: string;
  sections: Array<{
    title: string;
    expertId: OperationalExpertId;
    content: string;
  }>;
  confidence: number;
}

export interface ComposedPlanWorkflow {
  objective: string;
  readiness: CompositionReadiness;
  steps: Array<{
    id: string;
    title: string;
    ownerExpertId: OperationalExpertId;
    detail: string;
  }>;
  approvalGates: string[];
}

export interface OperationalRecommendation {
  id: string;
  ownerExpertId: OperationalExpertId;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  rationale: string;
}

export interface ExpertCompositionTrace {
  schemaVersion: '1.0.0';
  workflowType: ExpertWorkflowType;
  activatedExpertIds: OperationalExpertId[];
  contributionOrder: OperationalExpertId[];
  compositionRules: string[];
  routingTrace: ExpertRoutingResolution['trace'];
}

export interface ExpertCompositionResult {
  askResponse: ComposedAskResponse;
  planWorkflow: ComposedPlanWorkflow;
  operationalRecommendations: OperationalRecommendation[];
  expertContributions: ExpertContribution[];
  trace: ExpertCompositionTrace;
}

export interface ExpertCompositionInput extends ExpertRoutingEngineInput {
  routing?: ExpertRoutingResolution;
  requireFactValidation?: boolean;
}

function clean(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function avg(values: readonly number[]): number {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3));
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

function objectiveFor(input: ExpertCompositionInput, routing: ExpertRoutingResolution): string {
  const base = clean(input.userIntent);
  if (base) return base.slice(0, 220);
  return `Compose ${routing.trace.workflowType.replace(/_/g, ' ')} guidance`;
}

function hasMemoryContext(input: ExpertCompositionInput): boolean {
  if (input.twinProfile?.hasApprovedMemory) return true;
  const twin = input.workspace ? getActiveDigitalTwin(input.workspace) : null;
  return Boolean(
    twin &&
    (twin.memory.approvedClaims.length ||
      twin.memory.preferences.length ||
      twin.memory.voiceExamples.length)
  );
}

function shouldAddMemoryValidation(
  input: ExpertCompositionInput,
  routing: ExpertRoutingResolution
): boolean {
  if (routing.activatedExperts.some((expert) => expert.expertId === 'twin-memory-expert')) {
    return false;
  }
  if (input.requireFactValidation === false) return false;
  if (input.requireFactValidation === true) return true;
  const externalFacingWorkflow = new Set<ExpertWorkflowType>([
    'investor_outreach',
    'outreach',
    'content',
    'creator_growth',
    'positioning'
  ]);
  return externalFacingWorkflow.has(routing.trace.workflowType) && hasMemoryContext(input);
}

function syntheticMemoryActivation(
  input: ExpertCompositionInput,
  routing: ExpertRoutingResolution
): ExpertActivation {
  const definition = getOperationalExpert('twin-memory-expert');
  const availableContext = inferAvailableExpertContext(input);
  const required = definition?.requiredContext ?? [];
  return {
    expertId: 'twin-memory-expert',
    name: definition?.name ?? 'Twin Memory Expert',
    score: hasMemoryContext(input) ? 0.72 : 0.54,
    confidenceBand: hasMemoryContext(input) ? 'medium' : 'low',
    reasons: ['composition:fact_validation', `workflow:${routing.trace.workflowType}`],
    missingContext: required.filter((key) => !availableContext.includes(key)),
    matchedRoutingConditions: ['composition-memory-validation']
  };
}

function activationSlate(
  input: ExpertCompositionInput,
  routing: ExpertRoutingResolution
): ExpertActivation[] {
  const slate = [...routing.activatedExperts];
  if (shouldAddMemoryValidation(input, routing)) {
    slate.push(syntheticMemoryActivation(input, routing));
  }
  return slate;
}

function contextPhrase(input: ExpertCompositionInput, routing: ExpertRoutingResolution): string {
  return [
    input.profession ? `profession: ${input.profession}` : '',
    input.connectedPlatforms?.length ? `platforms: ${input.connectedPlatforms.join(', ')}` : '',
    input.twinProfile?.professionalPositioning
      ? `twin: ${input.twinProfile.professionalPositioning}`
      : '',
    `workflow: ${routing.trace.workflowType.replace(/_/g, ' ')}`
  ]
    .filter(Boolean)
    .join(' | ');
}

function contributionFor(
  activation: ExpertActivation,
  input: ExpertCompositionInput,
  routing: ExpertRoutingResolution
): ExpertContribution {
  const objective = objectiveFor(input, routing);
  const context = contextPhrase(input, routing);
  const baseExplainability = {
    routingReasons: activation.reasons,
    missingContext: activation.missingContext
  };

  switch (activation.expertId) {
    case 'positioning-expert':
      return {
        expertId: activation.expertId,
        expertName: activation.name,
        kind: 'strategic_angle',
        summary: `Frame the work around a proof-backed strategic angle before drafting or executing.`,
        structuredOutput: {
          angle: `Position "${objective}" through clear audience fit, credible proof, and a single concrete next ask.`,
          recommendations: [
            'Lead with the operator-specific wedge before asking for action.',
            'Tie claims to approved proof or ask for clarification before using them.',
            'Keep the angle narrow enough for one workflow outcome.'
          ],
          evidenceRefs: [context]
        },
        confidence: activation.score,
        explainability: {
          role: 'Defines the strategic angle other experts should preserve.',
          ...baseExplainability
        }
      };
    case 'outreach-expert':
      return {
        expertId: activation.expertId,
        expertName: activation.name,
        kind: 'messaging_draft',
        summary: `Translate the strategic angle into relationship-aware messaging.`,
        structuredOutput: {
          messageDraft: `Draft direction: open with relevance, name the reason for reaching out, offer one proof point, and close with a low-friction next step for "${objective}".`,
          recommendations: [
            'Use one recipient-specific opener.',
            'Make one ask only.',
            'Keep approval required before sending externally.'
          ],
          risks: [
            'Avoid overstating traction, investor interest, or relationship warmth without evidence.'
          ]
        },
        confidence: activation.score,
        explainability: {
          role: 'Turns strategy into message-ready copy and relationship constraints.',
          ...baseExplainability
        }
      };
    case 'planning-expert':
      return {
        expertId: activation.expertId,
        expertName: activation.name,
        kind: 'execution_sequence',
        summary: `Sequence the work into an approval-gated operational plan.`,
        structuredOutput: {
          planSteps: [
            'Confirm objective, audience, and success criteria.',
            'Draft the core angle and message artifacts.',
            'Validate facts, proof, and claims before external use.',
            'Review the final workflow preview with the operator.',
            'Execute only approved commands or handoffs and store receipts.'
          ],
          recommendations: [
            'Keep PLAN output editable before OPERATE.',
            'Separate drafting, validation, approval, and execution receipts.'
          ],
          risks: ['External sends, posts, syncs, or workspace mutations require explicit approval.']
        },
        confidence: activation.score,
        explainability: {
          role: 'Creates the execution sequence and approval gates.',
          ...baseExplainability
        }
      };
    case 'twin-memory-expert': {
      const grounded = hasMemoryContext(input);
      return {
        expertId: activation.expertId,
        expertName: activation.name,
        kind: 'fact_validation',
        summary: grounded
          ? 'Validate drafts against approved twin memory and flag missing claims.'
          : 'Memory context is thin; ask before asserting identity, proof, or preferences.',
        structuredOutput: {
          validationVerdict: grounded ? 'grounded' : 'ask_first',
          recommendations: grounded
            ? [
                'Use approved memory only for professional identity and proof claims.',
                'Ask before adding new claims or private facts.'
              ]
            : [
                'Ask the operator for approved facts before using identity or proof claims.',
                'Keep recommendations generic until memory is reviewed.'
              ],
          risks: ['Do not infer private facts or unreviewed achievements.'],
          evidenceRefs: grounded ? ['approved twin memory available'] : []
        },
        confidence: activation.score,
        explainability: {
          role: 'Validates factual grounding and missing-info boundaries.',
          ...baseExplainability
        }
      };
    }
    case 'content-expert':
      return {
        expertId: activation.expertId,
        expertName: activation.name,
        kind: 'content_strategy',
        summary: 'Turn the task into publishable content themes and channel-ready angles.',
        structuredOutput: {
          angle: `Create content around "${objective}" using one audience promise, one proof point, and one repeatable cadence.`,
          recommendations: [
            'Choose one primary channel before drafting variants.',
            'Convert the strategic angle into hooks, teaching points, and proof-led posts.'
          ]
        },
        confidence: activation.score,
        explainability: {
          role: 'Creates content angles, hooks, and channel constraints.',
          ...baseExplainability
        }
      };
    case 'opportunity-expert':
      return {
        expertId: activation.expertId,
        expertName: activation.name,
        kind: 'opportunity_assessment',
        summary: 'Evaluate growth or pipeline upside and the next opportunity to pursue.',
        structuredOutput: {
          recommendations: [
            'Prioritize the opportunity with the clearest audience signal and next action.',
            'Score upside separately from execution effort.'
          ],
          risks: [
            'Do not treat audience interest as revenue confidence without supporting signals.'
          ]
        },
        confidence: activation.score,
        explainability: {
          role: 'Assesses opportunity quality, upside, and next move.',
          ...baseExplainability
        }
      };
    case 'behavioral-expert': {
      const behavioralReadout = input.workspace
        ? buildBehavioralPredictionExpertReadout(input.workspace)
        : null;
      return {
        expertId: activation.expertId,
        expertName: activation.name,
        kind: 'behavioral_forecast',
        summary: behavioralReadout?.allPredictions.length
          ? `Forecast likely next moves from ${behavioralReadout.signals.length} behavioral signal families.`
          : 'Forecast likely cadence, response, or execution behavior from available memory.',
        structuredOutput: {
          recommendations: behavioralReadout?.allPredictions.length
            ? behavioralReadout.allPredictions
                .slice(0, 4)
                .map((prediction) => prediction.suggestion)
            : [
                'Pick timing based on observed cadence instead of generic urgency.',
                'Use behavioral memory as a confidence signal, not as certainty.'
              ],
          risks: [
            behavioralReadout?.approvalPolicy ??
              'Predictions must remain advisory and approval-gated.'
          ],
          evidenceRefs: behavioralReadout?.signals.map((signal) => signal.label)
        },
        confidence: activation.score,
        explainability: {
          role: 'Adds timing, cadence, and likely-behavior constraints.',
          ...baseExplainability
        }
      };
    }
    case 'integration-expert':
      return {
        expertId: activation.expertId,
        expertName: activation.name,
        kind: 'integration_readout',
        summary: 'Map connected platforms and artifact readiness before sync or external handoff.',
        structuredOutput: {
          recommendations: [
            'Confirm source status before assuming live sync.',
            'Use integration artifacts as evidence refs, not hidden execution authority.'
          ],
          risks: ['Planned integrations should not be represented as connected.']
        },
        confidence: activation.score,
        explainability: {
          role: 'Checks platform context, artifact readiness, and sync honesty.',
          ...baseExplainability
        }
      };
    default:
      return {
        expertId: activation.expertId,
        expertName: activation.name,
        kind: 'general_guidance',
        summary: `Contribute bounded guidance for ${objective}.`,
        structuredOutput: {
          recommendations: ['Keep the output grounded, reviewable, and approval-gated.']
        },
        confidence: activation.score,
        explainability: {
          role: 'Provides bounded operational guidance.',
          ...baseExplainability
        }
      };
  }
}

function askResponseFrom(
  input: ExpertCompositionInput,
  routing: ExpertRoutingResolution,
  contributions: readonly ExpertContribution[]
): ComposedAskResponse {
  const objective = objectiveFor(input, routing);
  const sections = contributions.map((contribution) => ({
    title: contribution.expertName,
    expertId: contribution.expertId,
    content: contribution.summary
  }));
  const topLine = contributions
    .map(
      (contribution) =>
        contribution.structuredOutput.angle ?? contribution.structuredOutput.messageDraft
    )
    .find(Boolean);
  return {
    headline: `Composed ${routing.trace.workflowType.replace(/_/g, ' ')} response`,
    response:
      topLine ??
      `Use the activated experts to answer "${objective}" with structured, reviewable guidance.`,
    sections,
    confidence: avg(contributions.map((contribution) => contribution.confidence))
  };
}

function planWorkflowFrom(
  input: ExpertCompositionInput,
  routing: ExpertRoutingResolution,
  contributions: readonly ExpertContribution[]
): ComposedPlanWorkflow {
  const explicitSteps = contributions.flatMap(
    (contribution) =>
      contribution.structuredOutput.planSteps?.map((step) => ({
        ownerExpertId: contribution.expertId,
        detail: step
      })) ?? []
  );
  const fallbackSteps = contributions.map((contribution) => ({
    ownerExpertId: contribution.expertId,
    detail: contribution.summary
  }));
  const steps = (explicitSteps.length ? explicitSteps : fallbackSteps).map((step, index) => ({
    id: `step-${index + 1}`,
    title: step.detail.split(/[.:]/)[0].slice(0, 80),
    ownerExpertId: step.ownerExpertId,
    detail: step.detail
  }));
  const gates = uniq([
    ...contributions.flatMap((contribution) => contribution.structuredOutput.risks ?? []),
    'Operator approval required before sending, publishing, syncing, or mutating workspace records.'
  ]);
  const hasBlockingValidation = contributions.some(
    (contribution) => contribution.structuredOutput.validationVerdict === 'ask_first'
  );
  return {
    objective: objectiveFor(input, routing),
    readiness: hasBlockingValidation ? 'needs_input' : gates.length ? 'needs_review' : 'ready',
    steps,
    approvalGates: gates
  };
}

function recommendationsFrom(
  contributions: readonly ExpertContribution[]
): OperationalRecommendation[] {
  return contributions.flatMap((contribution, contributionIndex) =>
    (contribution.structuredOutput.recommendations ?? [contribution.summary]).map(
      (recommendation, recommendationIndex) => ({
        id: `rec-${contributionIndex + 1}-${recommendationIndex + 1}`,
        ownerExpertId: contribution.expertId,
        priority: contributionIndex === 0 ? 'high' : contributionIndex <= 2 ? 'medium' : 'low',
        recommendation,
        rationale: contribution.explainability.role
      })
    )
  );
}

export function composeExpertTask(input: ExpertCompositionInput): ExpertCompositionResult {
  const routing = input.routing ?? routeExpertSlate(input);
  const slate = activationSlate(input, routing);
  const contributions = slate.map((activation) => contributionFor(activation, input, routing));
  const contributionOrder = contributions.map((contribution) => contribution.expertId);

  return {
    askResponse: askResponseFrom(input, routing, contributions),
    planWorkflow: planWorkflowFrom(input, routing, contributions),
    operationalRecommendations: recommendationsFrom(contributions),
    expertContributions: contributions,
    trace: {
      schemaVersion: '1.0.0',
      workflowType: routing.trace.workflowType,
      activatedExpertIds: contributionOrder,
      contributionOrder,
      compositionRules: [
        'route-before-compose',
        'preserve-routing-order',
        'structured-contributions-only',
        shouldAddMemoryValidation(input, routing)
          ? 'memory-validation-added'
          : 'memory-validation-not-needed'
      ],
      routingTrace: routing.trace
    }
  };
}

export function summarizeExpertComposition(result: ExpertCompositionResult): string[] {
  return [
    `workflow=${result.trace.workflowType}`,
    `contributors=${result.trace.contributionOrder.join(',') || 'none'}`,
    `ask_sections=${result.askResponse.sections.length}`,
    `plan_steps=${result.planWorkflow.steps.length}`,
    `recommendations=${result.operationalRecommendations.length}`
  ];
}
