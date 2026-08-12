/**
 * Convert-to-plan for agent outcomes. A plan is a reviewable artifact, not a
 * side effect, so conversion is safe to offer to agents — but the plan itself
 * remains a draft until the user saves/approves it in PLAN (PLAN owns
 * execution, approvals, receipts, and status).
 */
import type { AgentProposal, ExternalAgentEvent } from '../../types/agentInterop';
import type { BrandOpsData, Plan } from '../../types/domain';
import { convertAskResponseToPlan, savePlanDraftToWorkspace } from '../plan/askPlanConversion';
import { prependCheckpoint } from '../execution/checkpointStore';
import { prependOperatorTrace } from '../dataset/operatorTraces';
import { getAgentProposalById } from './proposals';
import { getAgentEventById } from './events';

export interface ConvertOpportunityToPlanResult {
  workspace: BrandOpsData;
  plan: Plan;
  proposal: AgentProposal;
}

export interface ConvertEventToPlanResult {
  workspace: BrandOpsData;
  plan: Plan;
  event: ExternalAgentEvent;
}

function convertToPlanDraft(
  workspace: BrandOpsData,
  opts: {
    conversationId: string;
    title: string;
    detail: string;
    kind: string;
    sourceSurface: 'agent-proposal' | 'agent-event';
    convertedFromLabel: string;
  }
) {
  return convertAskResponseToPlan({
    conversationId: opts.conversationId,
    messageId: `agent-${opts.kind}-${Date.now().toString(36)}`,
    responseText: `${opts.title}. ${opts.detail}`,
    userIntent: `Create a plan from an agent-approved opportunity: ${opts.title}`,
    planPreset: 'content-plan',
    sourceSurface: opts.sourceSurface,
    workspaceContext: workspace
  });
}

/**
 * Convert an APPROVED content opportunity into a saved Plan draft. The proposal
 * keeps its `planId` so the review queue can link straight into PLAN.
 */
export function convertOpportunityProposalToPlan(
  workspace: BrandOpsData,
  proposalId: string
): ConvertOpportunityToPlanResult | null {
  const proposal = getAgentProposalById(workspace, proposalId);
  if (!proposal || proposal.kind !== 'content_opportunity' || proposal.status !== 'approved') {
    return null;
  }
  const draftResult = convertToPlanDraft(workspace, {
    conversationId: proposal.relatedEventId ?? proposal.id,
    title: proposal.title,
    detail: proposal.detail,
    kind: 'opportunity',
    sourceSurface: 'agent-proposal',
    convertedFromLabel: 'Agent proposal'
  });
  if (!draftResult.ok) return null;

  const saved = savePlanDraftToWorkspace({
    workspace,
    draft: draftResult.draft,
    userAction: 'save-plan',
    convertedFromLabel: 'Agent proposal'
  });

  let next: BrandOpsData = {
    ...saved.workspace,
    agentProposals: {
      entries: (saved.workspace.agentProposals?.entries ?? []).map((entry) =>
        entry.id === proposalId ? { ...entry, planId: saved.plan.id } : entry
      ),
      updatedAt: new Date().toISOString()
    }
  };
  next = prependCheckpoint(next, {
    conversationId: proposal.relatedEventId ?? proposalId,
    type: 'agent.proposal_converted',
    state: 'COMPLETED',
    summary: `Opportunity converted to Plan draft: ${saved.plan.title}`,
    source: 'user',
    receiptRef: proposalId
  });
  next = prependOperatorTrace(next, {
    source: 'user',
    verb: 'agent.proposal_convert',
    surface: 'external-agent',
    capabilityId: 'plan.convert',
    sessionId: proposal.sessionId,
    entityType: 'agent-proposal',
    entityId: proposal.id,
    outcome: 'success',
    labels: ['opportunity-converted', 'draft']
  });
  return { workspace: next, plan: saved.plan, proposal };
}

/**
 * Convert a VERIFIED agent event into a saved Plan draft (e.g. a completed
 * release or milestone becomes a follow-on plan the user can approve).
 */
export function convertAgentEventToPlan(
  workspace: BrandOpsData,
  eventId: string
): ConvertEventToPlanResult | null {
  const event = getAgentEventById(workspace, eventId);
  if (!event || (event.status !== 'verified' && event.status !== 'promoted')) {
    return null;
  }
  const draftResult = convertToPlanDraft(workspace, {
    conversationId: event.id,
    title: event.title,
    detail: event.detail,
    kind: 'event',
    sourceSurface: 'agent-event',
    convertedFromLabel: 'Agent event'
  });
  if (!draftResult.ok) return null;

  const saved = savePlanDraftToWorkspace({
    workspace,
    draft: draftResult.draft,
    userAction: 'save-plan',
    convertedFromLabel: 'Agent event'
  });

  let next: BrandOpsData = {
    ...saved.workspace,
    externalAgentEvents: {
      entries: (saved.workspace.externalAgentEvents?.entries ?? []).map((entry) =>
        entry.id === eventId ? { ...entry, convertedPlanId: saved.plan.id } : entry
      ),
      updatedAt: new Date().toISOString()
    }
  };
  next = prependCheckpoint(next, {
    conversationId: event.id,
    type: 'agent.proposal_converted',
    state: 'COMPLETED',
    summary: `Agent achievement converted to Plan draft: ${saved.plan.title}`,
    source: 'user',
    receiptRef: eventId
  });
  next = prependOperatorTrace(next, {
    source: 'user',
    verb: 'agent.proposal_convert',
    surface: 'external-agent',
    capabilityId: 'plan.convert',
    sessionId: event.sessionId,
    entityType: 'agent-event',
    entityId: event.id,
    outcome: 'success',
    labels: ['event-converted', 'draft']
  });
  return { workspace: next, plan: saved.plan, event };
}
