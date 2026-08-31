import type { BrandOpsData } from '../../types/domain';
import { buildBehavioralIntelligenceEngineReadout } from '../intelligence/behavioralIntelligenceEngine';
import { buildCrossPlatformOperationalPlans } from './crossPlatformPlanner';
import { buildPlatformActionCards } from './platformActionCards';
import { buildPredictiveOpportunityLayerReadout } from './predictiveOpportunityLayer';
import { buildBuyerPersonaIntelligenceReadout } from './buyerPersonaIntelligence';
import { buildPositioningIntelligenceReadout } from './positioningIntelligence';
import { buildPredictiveContentIdeationReadout } from './predictiveContentIdeationEngine';
import { buildWorkflowPredictionLayerReadout } from './workflowPredictionLayer';
import { buildMemoryContextEngineReadout } from '../memory/memoryContextEngine';

export type HumanTrustControlType =
  | 'preview'
  | 'approval'
  | 'edit'
  | 'reject'
  | 'retry'
  | 'receipts'
  | 'audit-history';

export type HumanTrustActionKind =
  | 'platform-action'
  | 'cross-platform-plan'
  | 'behavioral-prediction'
  | 'predictive-opportunity'
  | 'buyer-persona-intelligence'
  | 'positioning-intelligence'
  | 'predictive-content-ideation'
  | 'workflow-prediction'
  | 'memory-context';

export interface HumanTrustControl {
  type: HumanTrustControlType;
  label: string;
  description: string;
  command?: string;
  href?: string;
}

export interface HumanTrustAction {
  id: string;
  kind: HumanTrustActionKind;
  title: string;
  location: string;
  status: string;
  riskLevel: 'external-gated' | 'workspace-only';
  controls: HumanTrustControl[];
}

export interface HumanTrustLayerReadout {
  actions: HumanTrustAction[];
  totalActions: number;
  controlTypes: HumanTrustControlType[];
  policy: string;
  headline: string;
}

export const HUMAN_TRUST_CONTROL_TYPES: HumanTrustControlType[] = [
  'preview',
  'approval',
  'edit',
  'reject',
  'retry',
  'receipts',
  'audit-history'
];

function trustCommand(action: {
  title: string;
  location: string;
  control: HumanTrustControlType;
  sourceCommand?: string;
}) {
  const label = action.control.replace('-', ' ');
  return `ask: Human Trust Layer ${label} for this cross-platform action. Keep the user in control. Do not execute externally. Show approval requirements, receipt expectations, audit history needs, and any missing context.\n\nAction: ${action.title}\nWhere: ${action.location}\nControl: ${label}\nSource command: ${action.sourceCommand ?? 'none'}`;
}

function controlsFor(input: {
  title: string;
  location: string;
  previewCommand?: string;
}): HumanTrustControl[] {
  return [
    {
      type: 'preview',
      label: 'Preview',
      description: 'Inspect the proposed output before state changes.',
      command: input.previewCommand ?? trustCommand({ ...input, control: 'preview' })
    },
    {
      type: 'approval',
      label: 'Approval',
      description: 'Route through the human approval gate before external execution.',
      href: '#plan-human-approval-queue'
    },
    {
      type: 'edit',
      label: 'Edit',
      description: 'Revise the generated output inside BrandOps.',
      command: trustCommand({ ...input, control: 'edit', sourceCommand: input.previewCommand })
    },
    {
      type: 'reject',
      label: 'Reject',
      description: 'Decline the action without sending, posting, scheduling, or syncing.',
      command: trustCommand({ ...input, control: 'reject', sourceCommand: input.previewCommand })
    },
    {
      type: 'retry',
      label: 'Retry',
      description: 'Regenerate or retry the draft safely without autonomous execution.',
      command: trustCommand({ ...input, control: 'retry', sourceCommand: input.previewCommand })
    },
    {
      type: 'receipts',
      label: 'Receipts',
      description: 'Review what happened, why, source facts, approvals, status, and warnings.',
      href: '#plan-execution-receipts'
    },
    {
      type: 'audit-history',
      label: 'Audit history',
      description: 'Inspect trace and command history before trusting the action.',
      command: trustCommand({
        ...input,
        control: 'audit-history',
        sourceCommand: input.previewCommand
      })
    }
  ];
}

export function buildHumanTrustLayer(workspace: BrandOpsData): HumanTrustLayerReadout {
  const platformActions = buildPlatformActionCards(workspace).map<HumanTrustAction>((card) => ({
    id: `trust-${card.id}`,
    kind: 'platform-action',
    title: card.title,
    location: card.platform,
    status: 'approval gated',
    riskLevel: 'external-gated',
    controls: controlsFor({
      title: card.title,
      location: card.platform,
      previewCommand: card.command
    })
  }));

  const planActions = buildCrossPlatformOperationalPlans(workspace).map<HumanTrustAction>(
    (plan) => ({
      id: `trust-${plan.id}`,
      kind: 'cross-platform-plan',
      title: plan.title,
      location: plan.connectedPlatforms.join(', ') || 'BrandOps workspace',
      status: plan.executionStatus,
      riskLevel: plan.connectedPlatforms.some((platform) => platform !== 'BrandOps workspace')
        ? 'external-gated'
        : 'workspace-only',
      controls: controlsFor({
        title: plan.title,
        location: plan.connectedPlatforms.join(', ') || 'BrandOps workspace',
        previewCommand: plan.previewCommand
      })
    })
  );

  const behavioralPredictionActions = buildBehavioralIntelligenceEngineReadout(
    workspace
  ).predictions.map<HumanTrustAction>((prediction) => ({
    id: `trust-${prediction.id}`,
    kind: 'behavioral-prediction',
    title: prediction.title,
    location: 'Behavioral Intelligence Engine',
    status: 'prediction requires approval',
    riskLevel: 'workspace-only',
    controls: controlsFor({
      title: prediction.title,
      location: 'Behavioral Intelligence Engine',
      previewCommand: prediction.suggestedCommand
    })
  }));

  const predictiveOpportunityActions = buildPredictiveOpportunityLayerReadout(
    workspace
  ).suggestions.map<HumanTrustAction>((suggestion) => ({
    id: `trust-${suggestion.id}`,
    kind: 'predictive-opportunity',
    title: suggestion.title,
    location: 'Predictive Opportunity Layer',
    status: 'suggestion requires approval',
    riskLevel: 'workspace-only',
    controls: controlsFor({
      title: suggestion.title,
      location: 'Predictive Opportunity Layer',
      previewCommand: suggestion.previewCommand
    })
  }));

  const buyerPersona = buildBuyerPersonaIntelligenceReadout(workspace);
  const buyerPersonaActions: HumanTrustAction[] = [
    {
      id: 'trust-buyer-persona-intelligence',
      kind: 'buyer-persona-intelligence',
      title: 'Buyer Persona Intelligence',
      location: 'Buyer Persona Intelligence',
      status: 'draft requires approval',
      riskLevel: 'workspace-only',
      controls: controlsFor({
        title: 'Buyer Persona Intelligence',
        location: 'Buyer Persona Intelligence',
        previewCommand: buyerPersona.compareVersionsCommand
      })
    }
  ];

  const positioning = buildPositioningIntelligenceReadout(workspace);
  const positioningActions: HumanTrustAction[] = [
    {
      id: 'trust-positioning-intelligence',
      kind: 'positioning-intelligence',
      title: 'Positioning Intelligence',
      location: 'Positioning Intelligence',
      status: 'positioning requires approval',
      riskLevel: 'workspace-only',
      controls: controlsFor({
        title: 'Positioning Intelligence',
        location: 'Positioning Intelligence',
        previewCommand: positioning.reviewCommand
      })
    }
  ];

  const predictiveContentIdeationActions = buildPredictiveContentIdeationReadout(
    workspace
  ).allIdeas.map<HumanTrustAction>((idea) => ({
    id: `trust-${idea.id}`,
    kind: 'predictive-content-ideation',
    title: idea.title,
    location: 'Predictive Content Ideation',
    status: 'content idea requires approval',
    riskLevel: 'workspace-only',
    controls: controlsFor({
      title: idea.title,
      location: 'Predictive Content Ideation',
      previewCommand: idea.askToPlanCommand
    })
  }));

  const workflowPredictionActions = buildWorkflowPredictionLayerReadout(
    workspace
  ).predictions.map<HumanTrustAction>((workflow) => ({
    id: `trust-${workflow.id}`,
    kind: 'workflow-prediction',
    title: workflow.title,
    location: 'Workflow Prediction Layer',
    status: 'workflow requires approval',
    riskLevel: 'workspace-only',
    controls: controlsFor({
      title: workflow.title,
      location: 'Workflow Prediction Layer',
      previewCommand: workflow.controls.reuseCommand
    })
  }));

  const memory = buildMemoryContextEngineReadout(workspace);
  const memoryActions: HumanTrustAction[] = [
    {
      id: 'trust-memory-context-engine',
      kind: 'memory-context',
      title: 'Memory & Context Engine',
      location: 'Memory & Context Engine',
      status: memory.enabled ? 'memory controls available' : 'memory disabled',
      riskLevel: 'workspace-only',
      controls: controlsFor({
        title: 'Memory & Context Engine',
        location: 'Memory & Context Engine',
        previewCommand: memory.controls.viewCommand
      })
    }
  ];

  const actions = [
    ...platformActions,
    ...planActions,
    ...behavioralPredictionActions,
    ...predictiveOpportunityActions,
    ...buyerPersonaActions,
    ...positioningActions,
    ...predictiveContentIdeationActions,
    ...workflowPredictionActions,
    ...memoryActions
  ].slice(0, 20);

  return {
    actions,
    totalActions: actions.length,
    controlTypes: HUMAN_TRUST_CONTROL_TYPES,
    policy:
      'BrandOps may review, draft, edit, retry, explain, and queue cross-platform work, but sending, posting, scheduling, syncing, or writing to external systems always requires visible human control.',
    headline: actions.length
      ? `${actions.length} cross-platform action${actions.length === 1 ? '' : 's'} protected by review, approval, edit, reject, retry, receipts, and audit history.`
      : 'No cross-platform actions are available yet; connect platforms or create a PLAN to activate trust controls.'
  };
}
