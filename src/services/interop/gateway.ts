/**
 * Canonical interop gateway. Every inbound agent tool call — whether it arrived
 * via MCP, an IDE integration, or the CLI — resolves to one code path:
 *
 *   authenticate (bearer token → session)
 *     → authorize (capability granted to this session)
 *       → idempotency check
 *         → dispatch to the capability handler
 *           → audit + checkpoint + operator trace
 *             → result
 *
 * Design rule: no capability handler executes an external side effect. Write
 * capabilities produce reviewable events/proposals/plans inside BrandOps; the
 * user is always in the loop before anything consequential happens.
 */
import type {
  AgentCapabilityId,
  AgentIntentContract,
  AgentToolResult,
  ContextBundleId,
  ExternalAgentEventEvidenceRef,
  ExternalAgentSession,
  MaterializedArtifactPayload
} from '../../types/agentInterop';
import type { BrandOpsData } from '../../types/domain';
import { buildAuthorityGraph } from '../builder/authorityGraph';
import {
  OUTCOME_DIMENSIONS,
  recordOutcome,
  type OutcomeDimension
} from '../builder/outcomeLearning';
import { prependOperatorTrace } from '../dataset/operatorTraces';
import { prependCheckpoint } from '../execution/checkpointStore';
import { buildPredictiveOperationsDashboardReadout } from '../plan/predictiveOperationsDashboard';
import { appendAuditEntry } from './audit';
import {
  getAgentCapability,
  isAgentCapabilityId,
  toolNameToCapabilityId,
  capabilityRequiresApproval
} from './capabilityRegistry';
import { getArtifactById, retrieveAgentContext, searchArtifacts } from './contextRetrieval';
import { searchWorkspaceEvidence } from './evidenceSearch';
import { planApprovalBinding } from './approvalBinding';
import { formatIntentContract, parseIntentContract, tierCarriesIntent } from './intentContract';
import { cancelTask, generateTaskId, resolveTask } from './mcp/tasks';
import { screenAgentContent } from './memoryScreen';
import { evaluateAgentPolicy, formatPolicyDecision } from './policyEngine';
import { convertAgentEventToPlan, convertOpportunityProposalToPlan } from './convertToPlan';
import { ingestAgentEvent, isAgentEventKind } from './events';
import {
  findDurableIdempotentResult,
  findIdempotentResult,
  recordDurableIdempotentResult,
  storeIdempotentResult
} from './idempotency';
import { createAgentProposal, createContentOpportunity } from './proposals';
import { resolveAgentSession, touchAgentSession } from './sessions';
import { detectPromptInjection, sanitizeAgentText } from './validation';
import { runBuilderHandler } from './mcp/builderToolHandlers';

export interface ExecuteAgentToolCallInput {
  workspace: BrandOpsData;
  /** Raw bearer token — hashed for lookup; never stored. */
  token: string;
  /** Canonical tool call envelope. `toolName` may be supplied instead of `capabilityId`. */
  call: {
    capabilityId?: string;
    toolName?: string;
    args: Record<string, unknown>;
    idempotencyKey?: string;
    purpose?: string;
  };
}

export interface ExecuteAgentToolCallResult {
  workspace: BrandOpsData;
  session: ExternalAgentSession;
  result: AgentToolResult;
}

function checkpointIdsForConversation(workspace: BrandOpsData, conversationId: string): string[] {
  return (workspace.checkpoints?.entries ?? [])
    .filter((entry) => entry.conversationId === conversationId)
    .slice(0, 8)
    .map((entry) => entry.id);
}

function strArg(args: Record<string, unknown>, key: string): string {
  return sanitizeAgentText(args[key]);
}

function strArrArg(args: Record<string, unknown>, key: string): string[] {
  const value = args[key];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => sanitizeAgentText(item))
    .filter((item): item is string => Boolean(item));
}

function runHandler(
  workspace: BrandOpsData,
  session: ExternalAgentSession,
  capabilityId: AgentCapabilityId,
  args: Record<string, unknown>,
  /** Present for every non-READ capability; the gateway rejects the call before dispatch otherwise. */
  intent: AgentIntentContract | null
): {
  workspace: BrandOpsData;
  ok: boolean;
  errorCode?: string;
  error?: string;
  data: Record<string, unknown>;
} {
  switch (capabilityId) {
    case 'context.read': {
      const query = strArg(args, 'query') || undefined;
      const requested = strArrArg(args, 'bundles');
      const bundles = (requested.length ? requested : session.grantedBundles).filter(
        (b): b is ContextBundleId => (session.grantedBundles as string[]).includes(b)
      );
      if (bundles.length === 0) {
        return {
          workspace,
          ok: false,
          errorCode: 'bundles_not_granted',
          error: 'None of the requested context bundles are granted to this session.',
          data: {}
        };
      }
      const maxItemsPerBundle = Math.max(
        1,
        Math.min(20, typeof args.maxItems === 'number' ? args.maxItems : 8)
      );
      const bundleResults = retrieveAgentContext(workspace, { query, bundles, maxItemsPerBundle });
      return { workspace, ok: true, data: { bundles: bundleResults } };
    }

    case 'goals.read': {
      const goals = workspace.workspaceIntelligence?.dna.goals ?? [];
      const goalList = goals.slice(0, 10).map((goal, index) => ({
        id: `goal-${index + 1}`,
        title: goal,
        status: 'active',
        reason: 'Current professional goal from Workspace DNA (model-derived, unverified).'
      }));
      return {
        workspace,
        ok: true,
        data: { goals: goalList }
      };
    }

    case 'artifacts.read': {
      const query = strArg(args, 'query');
      const limit = Math.max(1, Math.min(20, typeof args.limit === 'number' ? args.limit : 10));
      const artifacts = searchArtifacts(workspace, query, limit);
      return {
        workspace,
        ok: true,
        data: { artifacts }
      };
    }

    case 'plans.read': {
      const planId = strArg(args, 'planId');
      const plans = workspace.planWorkspace?.plans ?? [];
      const plan = plans.find((p) => p.id === planId) ?? plans[0];
      if (!plan)
        return {
          workspace,
          ok: false,
          errorCode: 'plan_not_found',
          error: 'No plan found.',
          data: {}
        };
      return {
        workspace,
        ok: true,
        data: {
          plan: {
            id: plan.id,
            title: plan.title,
            summary: plan.summary,
            status: plan.status,
            planType: plan.planType,
            objective: plan.objective,
            steps: plan.steps.map((step) => ({ title: step.title, status: step.status })),
            savedAt: plan.savedAt
          }
        }
      };
    }

    case 'execution.request': {
      const planId = strArg(args, 'planId');
      const plan = (workspace.planWorkspace?.plans ?? []).find((entry) => entry.id === planId);
      if (!plan) {
        return {
          workspace,
          ok: false,
          errorCode: 'plan_not_found',
          error: planId ? `No plan with id ${planId}.` : 'planId is required.',
          data: {}
        };
      }
      /**
       * The task handle is minted here and lives on the approval-gated proposal.
       * Requesting execution therefore *is* requesting approval — the first
       * observable task state is the boundary, not a running job.
       */
      const taskId = generateTaskId();
      const summary =
        strArg(args, 'summary') || `Execute plan "${plan.title}" (${plan.steps.length} steps).`;
      const next = createAgentProposal(workspace, {
        kind: 'external_action',
        title: `Execute plan: ${plan.title}`,
        detail: summary,
        rationale: intent
          ? `Execution requested by an external agent. Nothing runs until approved. Intent — ${formatIntentContract(intent)}`
          : 'Execution requested by an external agent. Nothing runs until approved.',
        sessionId: session.id,
        agentId: session.clientKind,
        taskId,
        planId: plan.id,
        proposedState: {
          externalAction: { action: 'execute-plan', target: plan.id, summary },
          // What the user is about to be shown. Checked again before anything runs.
          approvalBinding: planApprovalBinding(plan),
          ...(intent ? { intentContract: intent } : {})
        }
      });
      const created = (next.agentProposals?.entries ?? [])[0];
      const view = resolveTask(next, taskId, session.id);
      return {
        workspace: next,
        ok: true,
        data: {
          proposalId: created?.id,
          taskId,
          task: view.task,
          status: view.task?.status ?? 'input_required',
          note: 'Approval-gated. Nothing executes until a user approves inside BrandOps.'
        }
      };
    }

    case 'execution.read': {
      const taskId = strArg(args, 'taskId');
      if (!taskId) {
        return {
          workspace,
          ok: false,
          errorCode: 'invalid_args',
          error: 'taskId is required.',
          data: {}
        };
      }
      const view = resolveTask(workspace, taskId, session.id);
      if (!view.ok || !view.task) {
        return {
          workspace,
          ok: false,
          errorCode: view.errorCode ?? 'task_not_found',
          error: view.error ?? 'Task not found.',
          data: {}
        };
      }
      return { workspace, ok: true, data: { task: view.task } };
    }

    case 'execution.cancel': {
      const taskId = strArg(args, 'taskId');
      if (!taskId) {
        return {
          workspace,
          ok: false,
          errorCode: 'invalid_args',
          error: 'taskId is required.',
          data: {}
        };
      }
      const outcome = cancelTask(
        workspace,
        taskId,
        session.id,
        strArg(args, 'reason') || undefined
      );
      if (!outcome.ok) {
        return {
          workspace: outcome.workspace,
          ok: false,
          errorCode: outcome.errorCode ?? 'task_not_found',
          error: outcome.error ?? 'Could not cancel task.',
          data: {}
        };
      }
      return {
        workspace: outcome.workspace,
        ok: true,
        data: { taskId, task: outcome.task, status: outcome.task?.status ?? 'cancelled' }
      };
    }

    case 'evidence.read': {
      const claim = strArg(args, 'claim') || strArg(args, 'query');
      if (!claim) {
        return {
          workspace,
          ok: false,
          errorCode: 'invalid_args',
          error: 'claim is required — state the claim you want evidence for.',
          data: {}
        };
      }
      const limit = Math.max(1, Math.min(25, typeof args.limit === 'number' ? args.limit : 10));
      return {
        workspace,
        ok: true,
        data: { ...searchWorkspaceEvidence(workspace, claim, limit) }
      };
    }

    case 'authority.read': {
      const readout = buildAuthorityGraph(workspace);
      const topic = strArg(args, 'topic');
      const topics = topic
        ? readout.topics.filter((entry) => entry.topic.toLowerCase().includes(topic.toLowerCase()))
        : readout.topics;
      const gaps = topic
        ? readout.gaps.filter((entry) => entry.topic.toLowerCase().includes(topic.toLowerCase()))
        : readout.gaps;
      return {
        workspace,
        ok: true,
        data: {
          topics,
          gaps,
          headline: readout.headline,
          limitations: readout.limitations,
          generatedAt: readout.generatedAt
        }
      };
    }

    case 'next-best-actions.read': {
      const limit = Math.max(1, Math.min(10, typeof args.limit === 'number' ? args.limit : 5));
      const readout = buildPredictiveOperationsDashboardReadout(workspace);
      const actions = readout.nextBestActions.slice(0, limit).map((item) => ({
        id: item.id,
        title: item.title,
        detail: item.detail,
        urgency: item.urgency,
        confidence: item.confidence,
        reason: item.sourceLabel,
        signals: item.signals,
        command: item.command
      }));
      return {
        workspace,
        ok: true,
        data: {
          actions,
          headline: readout.headline,
          stateLine: readout.stateLine,
          urgentCount: readout.urgentCount,
          approvalCount: readout.approvalCount,
          generatedAt: readout.generatedAt
        }
      };
    }

    /**
     * The voice profile, assembled from the Twin rather than described in a
     * prompt. The point of the tool is that every model writes from the same
     * source: without it each host keeps its own drifting copy of "how this
     * person sounds", and the copies are unversioned and unattributable.
     */
    case 'voice.read': {
      const twin =
        (workspace.digitalTwins?.twins ?? []).find(
          (entry) => entry.id === workspace.digitalTwins?.activeTwinId
        ) ?? (workspace.digitalTwins?.twins ?? [])[0];
      if (!twin) {
        return {
          workspace,
          ok: false,
          errorCode: 'twin_not_found',
          error: 'No Digital Twin exists in this workspace yet, so there is no voice to read.',
          data: {}
        };
      }
      const channel = strArg(args, 'channel') || undefined;
      const examples = twin.memory.voiceExamples.slice(0, 8);
      const claims = twin.memory.approvedClaims.slice(0, 8);
      return {
        workspace,
        ok: true,
        data: {
          toneOfVoice: twin.identity.toneOfVoice,
          positioning: twin.identity.professionalPositioning,
          targetAudience: twin.identity.targetAudience,
          // Examples are the user's own writing, so they are the strongest
          // signal available and are labelled as verified rather than inferred.
          voiceExamples: examples,
          highConfidenceClaims: claims,
          channel: channel ?? 'any',
          trustTier: 'USER_VERIFIED',
          provenanceRef: `brandops://twin/${twin.id}/voice`,
          limitations: [
            examples.length
              ? null
              : 'No recorded voice examples — tone is described, not demonstrated.',
            claims.length
              ? null
              : 'No approved claims yet; do not assert specifics on the user’s behalf.',
            channel
              ? `Channel "${channel}" does not change the profile: BrandOps stores one voice, not per-channel variants.`
              : null
          ].filter(Boolean)
        }
      };
    }

    /**
     * The working state of a relationship, not a dossier. Everything returned is
     * something the user recorded about their own professional contact; the tool
     * exists so an agent drafting an email knows what is outstanding instead of
     * guessing.
     */
    case 'relationship.read': {
      const nameQuery = (strArg(args, 'name') || strArg(args, 'contactId')).toLowerCase();
      if (!nameQuery) {
        return {
          workspace,
          ok: false,
          errorCode: 'invalid_args',
          error: 'name (or contactId) is required.',
          data: {}
        };
      }
      const contacts = workspace.contacts ?? [];
      const contact =
        contacts.find((entry) => entry.id.toLowerCase() === nameQuery) ??
        contacts.find((entry) => (entry.fullName ?? entry.name).toLowerCase() === nameQuery) ??
        contacts.find((entry) => (entry.fullName ?? entry.name).toLowerCase().includes(nameQuery));
      if (!contact) {
        return {
          workspace,
          ok: false,
          errorCode: 'contact_not_found',
          error: `No contact matching "${strArg(args, 'name') || strArg(args, 'contactId')}".`,
          data: {}
        };
      }
      const interactions = (workspace.notes ?? [])
        .filter((note) => note.entityType === 'contact' && note.entityId === contact.id)
        .slice(0, 5)
        .map((note) => ({
          title: note.title,
          detail: sanitizeAgentText(note.detail)?.slice(0, 400) ?? '',
          nextAction: note.nextAction,
          at: note.createdAt
        }));
      return {
        workspace,
        ok: true,
        data: {
          name: contact.fullName ?? contact.name,
          company: contact.company,
          role: contact.title ?? contact.role,
          relationshipStage: contact.relationshipStage,
          status: contact.status,
          lastContactAt: contact.lastContactAt,
          outstanding: contact.nextAction || null,
          followUpDate: contact.followUpDate ?? null,
          recentInteractions: interactions,
          provenanceRef: `brandops://workspace/contact/${contact.id}`,
          limitations: [
            'Free-form contact notes are not returned in full; only recorded interactions and the outstanding next action.',
            interactions.length ? null : 'No interaction history recorded for this contact.'
          ].filter(Boolean)
        }
      };
    }

    case 'artifact.read': {
      const artifactId = strArg(args, 'artifactId');
      if (!artifactId) {
        return {
          workspace,
          ok: false,
          errorCode: 'invalid_args',
          error: 'artifactId is required. Find it with brandops_search_artifacts.',
          data: {}
        };
      }
      // Walks the same slices `brandops_search_artifacts` does, so an id found by
      // search always resolves here — the two cannot disagree about what an
      // artifact is, or how one is summarized.
      const artifact = getArtifactById(workspace, artifactId);
      if (!artifact) {
        return {
          workspace,
          ok: false,
          errorCode: 'artifact_not_found',
          error: `No artifact with id ${artifactId}.`,
          data: {}
        };
      }
      return { workspace, ok: true, data: { artifact } };
    }

    case 'receipts.read': {
      const receiptId = strArg(args, 'receiptId');
      const planId = strArg(args, 'planId');
      const receipts = workspace.planWorkspace?.receipts ?? [];
      const receipt = receiptId
        ? receipts.find((entry) => entry.id === receiptId)
        : planId
          ? receipts.find((entry) => entry.planId === planId)
          : receipts[0];
      if (!receipt) {
        return {
          workspace,
          ok: false,
          errorCode: 'receipt_not_found',
          error: receiptId
            ? `No receipt with id ${receiptId}.`
            : planId
              ? `No receipt for plan ${planId}.`
              : 'No receipts recorded in this workspace.',
          data: {}
        };
      }
      return {
        workspace,
        ok: true,
        data: {
          receipt: {
            id: receipt.id,
            planId: receipt.planId,
            planType: receipt.planType,
            convertedFrom: receipt.convertedFrom,
            sourceMessageId: receipt.sourceMessageId,
            generatedSteps: receipt.generatedSteps,
            userAction: receipt.userAction,
            summary: receipt.summary,
            timestamp: receipt.timestamp
          }
        }
      };
    }

    case 'outcome.report': {
      const dimension = strArg(args, 'dimension') as OutcomeDimension;
      if (!OUTCOME_DIMENSIONS.includes(dimension)) {
        return {
          workspace,
          ok: false,
          errorCode: 'invalid_args',
          error: `dimension must be one of: ${OUTCOME_DIMENSIONS.join(', ')}.`,
          data: {}
        };
      }
      const rawScore = typeof args.score === 'number' ? args.score : Number.NaN;
      if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > 1) {
        return {
          workspace,
          ok: false,
          errorCode: 'invalid_args',
          error: 'score is required and must be between 0 and 1.',
          data: {}
        };
      }
      const planId = strArg(args, 'planId') || undefined;
      const evidence = strArrArg(args, 'evidence');
      /**
       * The outcome is recorded as reported by this agent — never as verified
       * truth. `notedBy` carries the client identity plus the declared intent so
       * a later reviewer can see who claimed what, and why.
       */
      const next = recordOutcome({
        workspace,
        planId,
        dimension,
        score: rawScore,
        evidence,
        notedBy: `agent:${session.clientKind}:${session.id}`
      });
      const recorded = (next.builderActivity?.outcomeScores ?? [])[0];
      return {
        workspace: next,
        ok: true,
        data: {
          outcomeId: recorded?.id,
          dimension,
          score: recorded?.score,
          trustTier: 'AGENT_REPORTED',
          intent: intent ? formatIntentContract(intent) : undefined,
          note: 'Recorded as AGENT_REPORTED. Feeds learning only after BrandOps-side validation.'
        }
      };
    }

    case 'achievement.record': {
      const kind = strArg(args, 'kind');
      const title = strArg(args, 'title');
      const detail = strArg(args, 'detail');
      const clientKind = session.clientKind;
      // `evidence` is agent-supplied and may be any JSON value at all. Narrow to
      // actual objects in an actual array before touching it — a string here used
      // to reach `.map` and throw straight out of the gateway.
      const evidence = (Array.isArray(args.evidence) ? args.evidence : [])
        .filter(
          (ref): ref is { ref?: string; kind?: string; label?: string } =>
            Boolean(ref) && typeof ref === 'object' && !Array.isArray(ref)
        )
        .slice(0, 12)
        .map((ref) => ({
          ref: typeof ref.ref === 'string' ? ref.ref : '',
          kind: typeof ref.kind === 'string' ? ref.kind : 'other',
          label: typeof ref.label === 'string' ? ref.label : ''
        }))
        .filter((ref) => ref.ref || ref.label) as Array<{
        ref: string;
        kind?: ExternalAgentEventEvidenceRef['kind'];
        label: string;
      }>;
      if (!title || !detail) {
        return {
          workspace,
          ok: false,
          errorCode: 'invalid_args',
          error: 'title and detail are required.',
          data: {}
        };
      }
      const {
        workspace: next,
        event,
        deduplicated
      } = ingestAgentEvent(workspace, {
        sessionId: session.id,
        clientKind,
        kind: isAgentEventKind(kind) ? kind : 'development_session',
        title,
        detail,
        evidence,
        dedupeKey: typeof args.dedupeKey === 'string' ? args.dedupeKey : undefined,
        sourceRef: typeof args.sourceRef === 'string' ? args.sourceRef : undefined
      });
      return {
        workspace: next,
        ok: true,
        data: {
          eventId: event.id,
          status: event.status,
          trustTier: event.trustTier,
          deduplicated,
          note: deduplicated
            ? 'Duplicate signal; returned the previously recorded event.'
            : 'Recorded as AGENT_REPORTED. Promote to the Twin only after you verify it.'
        }
      };
    }

    case 'artifact.create': {
      const artifact: MaterializedArtifactPayload = {
        title: strArg(args, 'title'),
        artifactType: strArg(args, 'artifactType') || 'document',
        summary: strArg(args, 'summary'),
        externalUrl: strArg(args, 'externalUrl') || undefined,
        externalId: strArg(args, 'externalId') || undefined,
        tags: strArrArg(args, 'tags')
      };
      if (!artifact.title || !artifact.summary) {
        return {
          workspace,
          ok: false,
          errorCode: 'invalid_args',
          error: 'title and summary are required.',
          data: {}
        };
      }
      const rationale =
        strArg(args, 'rationale') || 'Proposed by an external agent; awaiting user approval.';
      const next = createAgentProposal(workspace, {
        kind: 'artifact',
        title: artifact.title,
        detail: artifact.summary,
        rationale,
        sessionId: session.id,
        agentId: session.clientKind,
        proposedState: { artifact }
      });
      return {
        workspace: next,
        ok: true,
        data: { proposalId: (next.agentProposals?.entries ?? [])[0]?.id, status: 'pending' }
      };
    }

    case 'twin.propose_update': {
      const claimText = strArg(args, 'claimText');
      const rationale =
        strArg(args, 'rationale') || 'Proposed by an external agent; awaiting user approval.';
      if (!claimText) {
        return {
          workspace,
          ok: false,
          errorCode: 'invalid_args',
          error: 'claimText is required.',
          data: {}
        };
      }
      const next = createAgentProposal(workspace, {
        kind: 'twin_update',
        title: `Twin update proposal: ${claimText.slice(0, 120)}`,
        detail: claimText,
        rationale,
        sessionId: session.id,
        agentId: session.clientKind,
        proposedState: { twinMemoryType: 'approvedClaims', approvedClaimText: claimText }
      });
      return {
        workspace: next,
        ok: true,
        data: { proposalId: (next.agentProposals?.entries ?? [])[0]?.id, status: 'pending' }
      };
    }

    case 'opportunity.create': {
      const title = strArg(args, 'title');
      const detail = strArg(args, 'detail');
      if (!title || !detail) {
        return {
          workspace,
          ok: false,
          errorCode: 'invalid_args',
          error: 'title and detail are required.',
          data: {}
        };
      }
      const next = createContentOpportunity(workspace, {
        title,
        detail,
        rationale:
          strArg(args, 'rationale') || 'Proposed by an external agent; awaiting user approval.',
        sessionId: session.id,
        agentId: session.clientKind,
        proposedState: {
          contentOpportunity: {
            format: strArg(args, 'format') || undefined,
            angle: strArg(args, 'angle') || undefined,
            whyNow: strArg(args, 'whyNow') || undefined,
            audience: strArg(args, 'audience') || undefined
          }
        }
      });
      return {
        workspace: next,
        ok: true,
        data: { proposalId: (next.agentProposals?.entries ?? [])[0]?.id, status: 'pending' }
      };
    }

    case 'plan.convert': {
      const proposalId = strArg(args, 'proposalId');
      const eventId = strArg(args, 'eventId');
      if (proposalId) {
        const converted = convertOpportunityProposalToPlan(workspace, proposalId);
        if (!converted) {
          return {
            workspace,
            ok: false,
            errorCode: 'not_approved',
            error:
              'This proposal must be approved by the user before it can be converted into a Plan.',
            data: {}
          };
        }
        return {
          workspace: converted.workspace,
          ok: true,
          data: {
            planId: converted.plan.id,
            title: converted.plan.title,
            status: converted.plan.status
          }
        };
      }
      if (eventId) {
        const converted = convertAgentEventToPlan(workspace, eventId);
        if (!converted) {
          return {
            workspace,
            ok: false,
            errorCode: 'not_verified',
            error:
              'This achievement must be verified by the user before it can be converted into a Plan.',
            data: {}
          };
        }
        return {
          workspace: converted.workspace,
          ok: true,
          data: {
            planId: converted.plan.id,
            title: converted.plan.title,
            status: converted.plan.status
          }
        };
      }
      return {
        workspace,
        ok: false,
        errorCode: 'invalid_args',
        error: 'proposalId or eventId is required.',
        data: {}
      };
    }

    case 'action.request': {
      const action = strArg(args, 'action');
      const target = strArg(args, 'target');
      const summary = strArg(args, 'summary');
      if (!action || !target || !summary) {
        return {
          workspace,
          ok: false,
          errorCode: 'invalid_args',
          error: 'action, target, and summary are required.',
          data: {}
        };
      }
      /**
       * The approval surface shows the user the agent's declared intent, not just
       * the mechanical request — "send this email" is a different decision from
       * "send this email because the user asked you to follow up on Tuesday".
       */
      const next = createAgentProposal(workspace, {
        kind: 'external_action',
        title: `${action} on ${target}`,
        detail: summary,
        rationale: intent
          ? `Requested by an external agent. Never executes; requires user approval. Intent — ${formatIntentContract(intent)}`
          : 'Requested by an external agent. Never executes; requires user approval.',
        sessionId: session.id,
        agentId: session.clientKind,
        proposedState: {
          externalAction: { action, target, summary },
          ...(intent ? { intentContract: intent } : {})
        }
      });
      return {
        workspace: next,
        ok: true,
        data: {
          proposalId: (next.agentProposals?.entries ?? [])[0]?.id,
          status: 'pending',
          note: 'Recorded as an approval-gated request. Nothing will execute.'
        }
      };
    }

    // ── Builder intelligence capability dispatch ─────────────────────
    default: {
      if (capabilityId.startsWith('builder.')) {
        return runBuilderHandler(workspace, session, capabilityId, args);
      }
      return {
        workspace,
        ok: false,
        errorCode: 'unknown_capability',
        error: `Unknown capability: ${capabilityId}`,
        data: {}
      };
    }
  }
}

export async function executeAgentToolCall(
  input: ExecuteAgentToolCallInput
): Promise<ExecuteAgentToolCallResult> {
  const started = Date.now();
  const session = await resolveAgentSession(input.workspace, input.token);
  if (!session) {
    throw new Error('E_UNAUTHORIZED: Unknown or revoked agent session.');
  }

  /**
   * A raw `capabilityId` from a caller is untrusted input like any other: it is
   * only a capability once the registry says so. Validating here keeps every
   * downstream stage — policy included — able to assume the id resolves.
   */
  const requestedId =
    input.call.capabilityId ??
    (input.call.toolName ? toolNameToCapabilityId(input.call.toolName) : null);
  const capabilityId =
    requestedId && isAgentCapabilityId(requestedId) ? (requestedId as AgentCapabilityId) : null;

  const failResult = (
    workspace: BrandOpsData,
    errorCode: string,
    error: string,
    summary: string,
    operation: string
  ): ExecuteAgentToolCallResult => {
    const withAudit = appendAuditEntry(workspace, {
      sessionId: session.id,
      clientKind: session.clientKind,
      capabilityId: (capabilityId ?? 'context.read') as AgentCapabilityId,
      operation,
      ok: false,
      errorCode,
      summary,
      requestPreview: JSON.stringify(input.call.args ?? {}),
      latencyMs: Date.now() - started
    });
    return {
      workspace: touchAgentSession(withAudit, session.id),
      session,
      result: {
        ok: false,
        capabilityId: (capabilityId ?? 'context.read') as AgentCapabilityId,
        data: {},
        errorCode,
        error,
        checkpointIds: [],
        auditEntryId: withAudit.externalAgentAudit?.entries[0]?.id ?? ''
      }
    };
  };

  if (!capabilityId) {
    return failResult(
      input.workspace,
      'unknown_tool',
      `Unknown capability or tool: ${input.call.capabilityId ?? input.call.toolName}`,
      'Rejected tool call with unknown capability.',
      'tool_call'
    );
  }

  /**
   * G9 — the Policy Engine is the one place authorization is decided. Session
   * liveness, workspace scope, capability grant, trust ceiling and rate budget
   * are evaluated in a fixed order, and the verdict (including the checks that
   * ran) goes into the audit entry alongside the outcome.
   */
  const policy = evaluateAgentPolicy({ workspace: input.workspace, session, capabilityId });
  if (!policy.allow) {
    return failResult(
      input.workspace,
      policy.errorCode ?? 'capability_not_granted',
      policy.reason ?? `Policy denied ${capabilityId}.`,
      `Blocked ${capabilityId}: ${formatPolicyDecision(policy)}`,
      'tool_call'
    );
  }

  const injectionVerdict = detectPromptInjection(JSON.stringify(input.call.args ?? {}));
  if (injectionVerdict.injected) {
    return failResult(
      input.workspace,
      'prompt_injection_detected',
      injectionVerdict.reason ?? 'Inbound text matched a prompt-injection signature.',
      'Blocked prompt-injection signature in tool args.',
      'tool_call'
    );
  }

  const idempotencyKey = input.call.idempotencyKey;
  if (idempotencyKey) {
    const key = { sessionId: session.id, capabilityId, idempotencyKey };
    /**
     * Memory first, then the workspace.
     *
     * The in-memory cache is the fast path and holds while the process lives.
     * The durable record is the one that matters after a crash — which is the
     * case an idempotency key is *for*, and the case the cache alone did not
     * cover: driving the real gateway showed the same key replayed after a
     * restart ingesting a second event.
     */
    const cached = findIdempotentResult(key) ?? findDurableIdempotentResult(input.workspace, key);
    if (cached) {
      return {
        workspace: input.workspace,
        session,
        result: cached
      };
    }
  }

  const def = getAgentCapability(capabilityId);

  /**
   * Invariant 5 — the Memory Firewall. Only writes are screened: a read cannot
   * poison memory, and its arguments were already checked for injection above.
   * Runs after the idempotency cache on purpose — a replay returns content that
   * was screened when it was first accepted, and re-judging it could refuse work
   * BrandOps has already recorded.
   */
  const screen = def.readOnly
    ? { screened: false, allow: true, summary: '' }
    : screenAgentContent({
        args: input.call.args ?? {},
        capabilityId,
        sessionId: session.id,
        clientKind: session.clientKind
      });
  if (!screen.allow) {
    return failResult(
      input.workspace,
      screen.errorCode ?? 'memory_firewall_rejected',
      screen.reason ?? 'Content was rejected by the Memory Firewall.',
      screen.summary,
      'tool_call'
    );
  }

  /**
   * G10 — User Intent Contract. A granted capability says the client *may* act;
   * the contract says what it is acting for. Consequential tiers must declare
   * one, sensitive tiers must also confirm, and every other mutation gets a
   * synthesized contract so no write reaches the ledger unattributed.
   */
  let intent: AgentIntentContract | null = null;
  if (tierCarriesIntent(def.tier)) {
    const verdict = parseIntentContract({
      args: input.call.args ?? {},
      capabilityId,
      tier: def.tier,
      purpose: input.call.purpose
    });
    if (!verdict.ok || !verdict.contract) {
      return failResult(
        input.workspace,
        verdict.errorCode ?? 'intent_contract_required',
        verdict.error ?? 'A User Intent Contract is required for this capability.',
        `Blocked ${capabilityId}: ${verdict.errorCode ?? 'intent contract missing'}.`,
        'tool_call'
      );
    }
    intent = verdict.contract;
  }

  /**
   * A handler that throws must not throw *through* the gateway. An escaped
   * exception skips the audit entry, the checkpoint and the result envelope —
   * the call would have happened with no record that it did. Converting it to a
   * fail-closed refusal keeps every outcome, including a bug, on the ledger.
   *
   * The caller gets a generic message; the exception text goes only to the audit
   * summary, since it can carry internals a hostile client should not be handed.
   */
  let handler: ReturnType<typeof runHandler>;
  try {
    handler = runHandler(input.workspace, session, capabilityId, input.call.args ?? {}, intent);
  } catch (error) {
    return failResult(
      input.workspace,
      'handler_error',
      `The ${capabilityId} handler failed. Nothing was written.`,
      `Blocked ${capabilityId}: handler threw — ${
        error instanceof Error ? error.message : String(error)
      }`,
      'tool_call'
    );
  }

  /**
   * P1-4: approval-access capabilities must NEVER execute directly. Their
   * handler's only legal output is a pending approval-gated request — a
   * `pending` proposal carrying a NEEDS_APPROVAL checkpoint (proposals.ts).
   * If that invariant is not met, fail closed instead of reporting success,
   * so a future reclassified/misbehaving capability cannot silently act.
   */
  const approvalRequired = capabilityRequiresApproval(capabilityId);
  /**
   * Only second-guess a handler that claims success. A handler that already
   * failed (bad args, missing plan) executed nothing, so overriding its error
   * with `approval_required` would hide the real reason from the caller while
   * protecting against nothing.
   */
  if (approvalRequired && handler.ok) {
    const proposalId = (handler.data as { proposalId?: string } | undefined)?.proposalId ?? null;
    const pendingApprovalRequest = proposalId
      ? (handler.workspace.agentProposals?.entries ?? []).some(
          (p) => p.id === proposalId && p.status === 'pending'
        ) &&
        (handler.workspace.checkpoints?.entries ?? []).some(
          (c) => c.receiptRef === proposalId && c.state === 'NEEDS_APPROVAL'
        )
      : false;
    if (!pendingApprovalRequest) {
      return failResult(
        handler.workspace,
        'approval_required',
        `Capability ${capabilityId} requires approval and may only create an approval-gated request; nothing was executed.`,
        `Blocked ${capabilityId}: approval-access capability attempted to execute directly.`,
        'tool_call'
      );
    }
  }

  const conversationId =
    (handler.data as { eventId?: string; proposalId?: string } | undefined)?.eventId ??
    (handler.data as { eventId?: string; proposalId?: string } | undefined)?.proposalId ??
    session.id;

  const base = touchAgentSession(handler.workspace, session.id);
  const withTrace = prependOperatorTrace(base, {
    source: 'bridge',
    verb: `agent.${capabilityId.replace('.', '_')}`,
    surface: 'external-agent',
    capabilityId,
    sessionId: session.id,
    entityType: 'tool-call',
    entityId: conversationId,
    outcome: handler.ok ? 'success' : 'failure',
    labels: [capabilityId, def.access, handler.ok ? 'ok' : 'blocked']
  });

  const withAudit = appendAuditEntry(withTrace, {
    sessionId: session.id,
    clientKind: session.clientKind,
    capabilityId,
    operation: `call:${def.toolName ?? capabilityId}`,
    ok: handler.ok,
    errorCode: handler.errorCode,
    summary: [
      handler.ok
        ? approvalRequired
          ? `${def.label} — approval-gated request recorded; nothing executed.`
          : def.label
        : (handler.error ?? 'Call failed.'),
      // Every mutation is auditable back to the intent it claimed to serve,
      // and every call back to the policy verdict that let it through.
      intent ? `Intent — ${formatIntentContract(intent)}` : null,
      formatPolicyDecision(policy),
      // What the firewall made of the agent's own words, recorded whether or not
      // it changed the outcome — a later reviewer needs the screening it passed,
      // not only the ones it failed.
      screen.screened ? screen.summary : null
    ]
      .filter(Boolean)
      .join(' '),
    requestPreview: JSON.stringify(input.call.args ?? {}),
    latencyMs: Date.now() - started
  });

  const checkpointIds = checkpointIdsForConversation(withAudit, conversationId);
  if (checkpointIds.length === 0 && handler.ok) {
    const contextCheckpoint = prependCheckpoint(withAudit, {
      conversationId,
      type: 'agent.context_supplied',
      state: 'COMPLETED',
      summary: `${def.label} via ${session.clientKind} (${session.id}).`,
      source: 'bridge',
      receiptRef: withAudit.externalAgentAudit?.entries[0]?.id
    });
    const ctxIds = checkpointIdsForConversation(contextCheckpoint, conversationId);
    const result: AgentToolResult = {
      ok: true,
      capabilityId,
      data: handler.data,
      approvalRequired,
      checkpointIds: ctxIds,
      auditEntryId: withAudit.externalAgentAudit?.entries[0]?.id ?? ''
    };
    if (idempotencyKey) {
      const key = { sessionId: session.id, capabilityId, idempotencyKey };
      storeIdempotentResult(key, result);
      // Persisted as well as cached, so the guarantee outlives the process.
      return {
        workspace: recordDurableIdempotentResult(contextCheckpoint, key, result),
        session,
        result
      };
    }
    return { workspace: contextCheckpoint, session, result };
  }

  const result: AgentToolResult = {
    ok: handler.ok,
    capabilityId,
    data: handler.data,
    errorCode: handler.errorCode,
    error: handler.error,
    approvalRequired,
    checkpointIds,
    auditEntryId: withAudit.externalAgentAudit?.entries[0]?.id ?? ''
  };
  if (idempotencyKey) {
    const key = { sessionId: session.id, capabilityId, idempotencyKey };
    storeIdempotentResult(key, result);
    return {
      workspace: recordDurableIdempotentResult(withAudit, key, result),
      session,
      result
    };
  }
  return { workspace: withAudit, session, result };
}
