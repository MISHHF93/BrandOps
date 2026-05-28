import type { ExpertCompositionResult } from './expertCompositionEngine';
import type { OperationalExpertId } from './expertRegistry';
import type { ExpertWorkflowType } from './expertRoutingEngine';

export type ExpertExecutionMode = 'ASK' | 'PLAN' | 'OPERATE';

export type ExpertOutputQualityBand = 'strong' | 'usable' | 'needs_review';

export interface ExpertExecutionFailure {
  expertId?: OperationalExpertId;
  stage: 'routing' | 'composition' | 'quality' | 'approval' | 'unknown';
  message: string;
  recoverable: boolean;
}

export interface ExpertApprovalSummary {
  approved: number;
  rejected: number;
  pending: number;
}

export interface ExpertFallbackUsage {
  used: boolean;
  reasons: string[];
}

export interface ExpertOutputQuality {
  score: number;
  band: ExpertOutputQualityBand;
  signals: string[];
}

export interface ExpertExecutionTrace {
  schemaVersion: '1.0.0';
  mode: ExpertExecutionMode;
  workflowType: ExpertWorkflowType;
  activatedExperts: Array<{
    expertId: OperationalExpertId;
    name: string;
    confidence: number;
  }>;
  latencyMs: number;
  routingConfidence: number;
  outputQuality: ExpertOutputQuality;
  fallbackUsage: ExpertFallbackUsage;
  failures: ExpertExecutionFailure[];
  approvals: ExpertApprovalSummary;
  developerOnly: true;
}

export interface ExpertExecutionReceipt {
  id: string;
  mode: ExpertExecutionMode;
  title: string;
  summary: string;
  activatedExperts: string[];
  confidenceLabel: string;
  qualityLabel: string;
  latencyLabel: string;
  fallbackNotice?: string;
  approvalStatus: string;
  failureNotice?: string;
  generatedAt: string;
}

export interface ExpertExecutionObservationInput {
  mode: ExpertExecutionMode;
  composition: ExpertCompositionResult;
  startedAtMs: number;
  endedAtMs: number;
  approvals?: ExpertApprovalSummary;
  failures?: ExpertExecutionFailure[];
  fallbackReasons?: string[];
  generatedAt?: string;
}

function avg(values: readonly number[]): number {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3));
}

function pct(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

function qualityFrom(
  composition: ExpertCompositionResult,
  failures: readonly ExpertExecutionFailure[]
): ExpertOutputQuality {
  const contributionCoverage = composition.expertContributions.length > 0 ? 0.25 : 0;
  const structuredCoverage =
    composition.planWorkflow.steps.length > 0 && composition.operationalRecommendations.length > 0
      ? 0.25
      : 0.1;
  const confidence = composition.askResponse.confidence * 0.4;
  const failurePenalty = failures.length ? 0.2 : 0;
  const fallbackPenalty = composition.trace.compositionRules.some((rule) => rule.includes('added'))
    ? 0.04
    : 0;
  const score = Math.max(
    0,
    Math.min(1, contributionCoverage + structuredCoverage + confidence - failurePenalty - fallbackPenalty)
  );
  const band: ExpertOutputQualityBand =
    score >= 0.78 ? 'strong' : score >= 0.58 ? 'usable' : 'needs_review';
  return {
    score: pct(score),
    band,
    signals: [
      `${composition.expertContributions.length} expert contribution${composition.expertContributions.length === 1 ? '' : 's'}`,
      `${composition.planWorkflow.steps.length} plan step${composition.planWorkflow.steps.length === 1 ? '' : 's'}`,
      `${composition.operationalRecommendations.length} recommendation${composition.operationalRecommendations.length === 1 ? '' : 's'}`,
      failures.length ? `${failures.length} failure${failures.length === 1 ? '' : 's'} recorded` : ''
    ].filter(Boolean)
  };
}

function fallbackReasons(
  composition: ExpertCompositionResult,
  explicitReasons: readonly string[]
): string[] {
  const reasons = [...explicitReasons];
  if (composition.trace.compositionRules.includes('memory-validation-added')) {
    reasons.push('Memory validation expert added to protect factual grounding.');
  }
  if (!composition.expertContributions.length) {
    reasons.push('No expert contribution was available.');
  }
  return Array.from(new Set(reasons));
}

function approvalStatus(approvals: ExpertApprovalSummary): string {
  if (approvals.rejected > 0) return `${approvals.rejected} rejected · ${approvals.approved} approved`;
  if (approvals.pending > 0) return `${approvals.pending} pending approval`;
  if (approvals.approved > 0) return `${approvals.approved} approved`;
  return 'No execution approval recorded';
}

function receiptSummary(mode: ExpertExecutionMode, composition: ExpertCompositionResult): string {
  if (mode === 'ASK') {
    return `Expert reasoning prepared for ${composition.trace.workflowType.replace(/_/g, ' ')}.`;
  }
  if (mode === 'PLAN') {
    return `Expert workflow sequencing prepared ${composition.planWorkflow.steps.length} reviewable step${composition.planWorkflow.steps.length === 1 ? '' : 's'}.`;
  }
  return `Expert-assisted execution guidance prepared ${composition.operationalRecommendations.length} approval-gated recommendation${composition.operationalRecommendations.length === 1 ? '' : 's'}.`;
}

function receiptFromTrace(
  composition: ExpertCompositionResult,
  trace: ExpertExecutionTrace,
  generatedAt: string
): ExpertExecutionReceipt {
  const receipt: ExpertExecutionReceipt = {
    id: `expert-${trace.mode.toLowerCase()}-${trace.workflowType}`,
    mode: trace.mode,
    title: `${trace.mode} expert receipt`,
    summary: receiptSummary(trace.mode, composition),
    activatedExperts: trace.activatedExperts.map((expert) => expert.name),
    confidenceLabel: `${pct(trace.routingConfidence)}% routing confidence`,
    qualityLabel: `${trace.outputQuality.band.replace('_', ' ')} output · ${trace.outputQuality.score}%`,
    latencyLabel: `${trace.latencyMs}ms expert execution`,
    approvalStatus: approvalStatus(trace.approvals),
    generatedAt
  };
  if (trace.fallbackUsage.used) {
    receipt.fallbackNotice = trace.fallbackUsage.reasons.join(' ');
  }
  if (trace.failures.length) {
    receipt.failureNotice = `${trace.failures.length} recoverable issue${trace.failures.length === 1 ? '' : 's'} recorded`;
  }
  return receipt;
}

export function observeExpertExecution(input: ExpertExecutionObservationInput): {
  internalTrace: ExpertExecutionTrace;
  receipt: ExpertExecutionReceipt;
} {
  const failures = input.failures ?? [];
  const fallbacks = fallbackReasons(input.composition, input.fallbackReasons ?? []);
  const latencyMs = Math.max(0, Math.round(input.endedAtMs - input.startedAtMs));
  const routingConfidence = avg(input.composition.expertContributions.map((item) => item.confidence));
  const internalTrace: ExpertExecutionTrace = {
    schemaVersion: '1.0.0',
    mode: input.mode,
    workflowType: input.composition.trace.workflowType,
    activatedExperts: input.composition.expertContributions.map((contribution) => ({
      expertId: contribution.expertId,
      name: contribution.expertName,
      confidence: contribution.confidence
    })),
    latencyMs,
    routingConfidence,
    outputQuality: qualityFrom(input.composition, failures),
    fallbackUsage: {
      used: fallbacks.length > 0,
      reasons: fallbacks
    },
    failures,
    approvals: input.approvals ?? { approved: 0, rejected: 0, pending: 0 },
    developerOnly: true
  };

  return {
    internalTrace,
    receipt: receiptFromTrace(
      input.composition,
      internalTrace,
      input.generatedAt ?? new Date().toISOString()
    )
  };
}
