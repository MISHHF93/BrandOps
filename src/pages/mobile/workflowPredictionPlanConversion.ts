import type { WorkflowPrediction } from '../../services/plan/workflowPredictionLayer';
import type { OperationalPlanCard } from './PlanOperationalStudio';

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function kindFor(prediction: WorkflowPrediction): OperationalPlanCard['kind'] {
  switch (prediction.kind) {
    case 'repeated-outreach':
      return 'outreach';
    case 'repeated-creator-workflow':
    case 'repeated-content-pipeline':
      return 'content-calendar';
    default:
      return 'workflow';
  }
}

function approveCommandFor(prediction: WorkflowPrediction): string {
  switch (prediction.kind) {
    case 'repeated-outreach':
      return 'draft outreach: reusable outreach workflow';
    case 'repeated-scheduling':
      return 'today plan';
    case 'repeated-creator-workflow':
      return 'draft post: reusable creator workflow';
    case 'repeated-content-pipeline':
      return 'draft post: reusable content pipeline';
    default:
      return 'add note: reusable planning workflow approved';
  }
}

export function buildOperationalPlanFromWorkflowPrediction(
  prediction: WorkflowPrediction
): OperationalPlanCard {
  return {
    id: `workflow-prediction-plan-${prediction.id}-${Math.random().toString(36).slice(2, 7)}`,
    title: compact(`${prediction.reusableTemplateName}: ${prediction.title}`).slice(0, 120),
    kind: kindFor(prediction),
    promise:
      'Converted from Workflow Prediction Layer. Preview, edit, save, template, reuse, or automate only after approval.',
    previewCommand: prediction.controls.reuseCommand,
    approveCommand: approveCommandFor(prediction),
    editTarget: 'palette',
    status: 'needs-input',
    progress: Math.max(20, Math.min(85, prediction.confidence - 10)),
    timeline: prediction.recommendedSteps,
    sourceLabel: 'Converted from workflow prediction',
    exportPayload: {
      type: 'workflow-prediction-plan',
      workflowPredictionId: prediction.id,
      workflowPredictionKind: prediction.kind,
      reusableTemplateName: prediction.reusableTemplateName,
      confidence: prediction.confidence,
      repeatedPattern: prediction.repeatedPattern,
      evidence: prediction.evidence.slice(0, 6),
      triggerSignals: prediction.triggerSignals,
      approvalGate: prediction.approvalGate
    }
  };
}

