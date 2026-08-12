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
  AgentToolResult,
  ContextBundleId,
  ExternalAgentEventEvidenceRef,
  ExternalAgentSession,
  MaterializedArtifactPayload
} from '../../types/agentInterop';
import type { BrandOpsData } from '../../types/domain';
import { prependOperatorTrace } from '../dataset/operatorTraces';
import { prependCheckpoint } from '../execution/checkpointStore';
import { appendAuditEntry } from './audit';
import { getAgentCapability, toolNameToCapabilityId, capabilityRequiresApproval } from './capabilityRegistry';
import { retrieveAgentContext, searchArtifacts } from './contextRetrieval';
import { convertAgentEventToPlan, convertOpportunityProposalToPlan } from './convertToPlan';
import { ingestAgentEvent, isAgentEventKind } from './events';
import { findIdempotentResult, storeIdempotentResult } from './idempotency';
import { createAgentProposal, createContentOpportunity } from './proposals';
import { resolveAgentSession, touchAgentSession } from './sessions';
import { detectPromptInjection, sanitizeAgentText } from './validation';

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
  args: Record<string, unknown>
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

    case 'achievement.record': {
      const kind = strArg(args, 'kind');
      const title = strArg(args, 'title');
      const detail = strArg(args, 'detail');
      const clientKind = session.clientKind;
      const evidence = (
        (args.evidence as Array<{ ref?: string; kind?: string; label?: string }> | undefined) ?? []
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
      const next = createAgentProposal(workspace, {
        kind: 'external_action',
        title: `${action} on ${target}`,
        detail: summary,
        rationale: 'Requested by an external agent. Never executes; requires user approval.',
        sessionId: session.id,
        agentId: session.clientKind,
        proposedState: { externalAction: { action, target, summary } }
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

  const capabilityId = (input.call.capabilityId ??
    (input.call.toolName
      ? toolNameToCapabilityId(input.call.toolName)
      : null)) as AgentCapabilityId | null;

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

  if (!session.grantedCapabilities.includes(capabilityId)) {
    return failResult(
      input.workspace,
      'capability_not_granted',
      `Session ${session.id} is not granted capability ${capabilityId}.`,
      `Blocked ${capabilityId} (not granted to session).`,
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
    const cached = findIdempotentResult({ sessionId: session.id, capabilityId, idempotencyKey });
    if (cached) {
      return {
        workspace: input.workspace,
        session,
        result: cached
      };
    }
  }

  const def = getAgentCapability(capabilityId);
  const handler = runHandler(input.workspace, session, capabilityId, input.call.args ?? {});

  /**
   * P1-4: approval-access capabilities must NEVER execute directly. Their
   * handler's only legal output is a pending approval-gated request — a
   * `pending` proposal carrying a NEEDS_APPROVAL checkpoint (proposals.ts).
   * If that invariant is not met, fail closed instead of reporting success,
   * so a future reclassified/misbehaving capability cannot silently act.
   */
  const approvalRequired = capabilityRequiresApproval(capabilityId);
  if (approvalRequired) {
    const proposalId =
      (handler.data as { proposalId?: string } | undefined)?.proposalId ?? null;
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
    summary: handler.ok
      ? approvalRequired
        ? `${def.label} — approval-gated request recorded; nothing executed.`
        : def.label
      : (handler.error ?? 'Call failed.'),
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
      storeIdempotentResult({ sessionId: session.id, capabilityId, idempotencyKey }, result);
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
    storeIdempotentResult({ sessionId: session.id, capabilityId, idempotencyKey }, result);
  }
  return { workspace: withAudit, session, result };
}
