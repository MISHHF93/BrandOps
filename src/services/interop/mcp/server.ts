/**
 * Canonical MCP tool layer. Tools map 1:1 onto the capability registry
 * (`toolName`), so any MCP client (Claude Code, VS Code, IDE hosts) that
 * connects through BrandOps sees the same small, stable tool surface.
 *
 * This module is transport-agnostic: `handleCallToolRequest` implements the
 * core and `startMcpStdioServer` wraps it in a line-delimited JSON-RPC stdio
 * transport for standalone embedding. In-app, the Connected Agents panel calls
 * the same handler directly.
 */
import type {
  AgentCapabilityDefinition,
  AgentCapabilityId,
  AgentToolResult,
  McpTask
} from '../../../types/agentInterop';
import { getProfessionRelevantCapabilities } from '../../builder/professionPacks';
import { OUTCOME_DIMENSIONS } from '../../builder/outcomeLearning';
import {
  AGENT_CAPABILITY_DEFINITIONS,
  AGENT_CAPABILITY_REGISTRY,
  toolNameToCapabilityId
} from '../capabilityRegistry';
import type { McpResource } from './resources';
import type { JsonSchema } from './outputSchema';
import { buildToolOutputSchema, toWireValue, validateAgainstSchema } from './outputSchema';
import { executeAgentToolCall } from '../gateway';
import {
  INTENT_CONTRACT_SCHEMA,
  tierCarriesIntent,
  tierRequiresDeclaredIntent
} from '../intentContract';
import {
  clientDeclaredExtension,
  isSupportedProtocolVersion,
  LATEST_PROTOCOL_VERSION,
  MCP_ERROR,
  SERVER_INFO,
  validateRequestMeta,
  withResultEnvelope,
  isJsonRpcNotification,
  isNotificationMethod
} from './protocol';
import type { BrandOpsData } from '../../../types/domain';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
    anyOf?: Array<{ required: string[] }>;
  };
  /**
   * G18. Declared, therefore binding: the spec requires structured results to
   * conform to it, so `dispatchMcpMethod` validates before emitting rather than
   * publishing a shape it merely hopes is true.
   */
  outputSchema: JsonSchema;
}

const TOOL_ARG_SCHEMAS: Record<
  string,
  {
    properties: Record<string, unknown>;
    required: string[];
    /**
     * "One of these, at least" — a constraint `required` cannot express.
     * Several tools accept either of two ids, and declaring `required: []`
     * told a client it could call with nothing, which the handler then refused.
     */
    anyOf?: Array<{ required: string[] }>;
  }
> = {
  brandops_get_relevant_context: {
    properties: {
      query: {
        type: 'string',
        description: 'Natural-language topic to retrieve relevant context for.'
      },
      bundles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Context bundles to fetch. Defaults to all bundles granted to this session.'
      },
      maxItems: { type: 'number', description: 'Max items per bundle (1–20, default 8).' }
    },
    required: []
  },
  brandops_get_current_goals: { properties: {}, required: [] },
  brandops_search_artifacts: {
    properties: {
      query: {
        type: 'string',
        description: 'Search terms. Empty returns the most recent artifacts.'
      },
      limit: { type: 'number', description: 'Max results (1–20, default 10).' }
    },
    required: []
  },
  brandops_get_plan_status: {
    properties: {
      planId: { type: 'string', description: 'Plan id to read. Omit to read the most recent plan.' }
    },
    required: []
  },
  brandops_record_achievement: {
    properties: {
      kind: {
        type: 'string',
        description:
          'One of: repository_analyzed, feature_completed, release_prepared, documentation_created, milestone_proposed, technical_decision, experiment_completed, open_source_contribution, project_completed, development_session.'
      },
      title: { type: 'string', description: 'Short title of the achievement (max 300 chars).' },
      detail: {
        type: 'string',
        description: 'What happened, who was involved, and any measurable outcome.'
      },
      evidence: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ref: {
              type: 'string',
              description: 'e.g. git:owner/repo@sha, release:v1.2.3, file:docs/api.md'
            },
            kind: {
              type: 'string',
              description: 'git | release | document | milestone | link | other'
            },
            label: { type: 'string' }
          }
        },
        description: 'Pointers the agent can cite as evidence. Recorded as AGENT_REPORTED.'
      },
      dedupeKey: { type: 'string', description: 'Deterministic dedupe key (e.g. git sha).' },
      sourceRef: { type: 'string' }
    },
    required: ['kind', 'title', 'detail']
  },
  brandops_create_artifact: {
    properties: {
      title: { type: 'string' },
      artifactType: { type: 'string', description: 'e.g. report, document, analysis, dataset.' },
      summary: { type: 'string' },
      externalUrl: { type: 'string' },
      externalId: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
      rationale: { type: 'string' }
    },
    required: ['title', 'summary']
  },
  brandops_propose_twin_update: {
    properties: {
      claimText: {
        type: 'string',
        description: 'The Twin fact or positioning claim being proposed.'
      },
      rationale: { type: 'string' }
    },
    required: ['claimText']
  },
  brandops_create_content_opportunity: {
    properties: {
      title: { type: 'string' },
      detail: { type: 'string' },
      format: { type: 'string', description: 'e.g. technical blog post, thread, case study.' },
      angle: { type: 'string' },
      whyNow: { type: 'string' },
      audience: { type: 'string' },
      rationale: { type: 'string' }
    },
    required: ['title', 'detail']
  },
  brandops_convert_to_plan: {
    properties: {
      proposalId: { type: 'string', description: 'Approved proposal id to convert into a Plan.' },
      eventId: {
        type: 'string',
        description: 'Verified achievement event id to convert into a Plan.'
      }
    },
    required: [],
    anyOf: [{ required: ['proposalId'] }, { required: ['eventId'] }]
  },
  brandops_request_action: {
    properties: {
      action: { type: 'string', description: 'e.g. publish, outreach, integration-change.' },
      target: { type: 'string', description: 'What it applies to.' },
      summary: { type: 'string', description: 'Why and what exactly should happen.' },
      intent: INTENT_CONTRACT_SCHEMA
    },
    required: ['action', 'target', 'summary', 'intent']
  },
  brandops_request_plan_execution: {
    properties: {
      planId: { type: 'string', description: 'Saved plan id to execute.' },
      summary: { type: 'string', description: 'What you expect executing this plan to achieve.' },
      intent: INTENT_CONTRACT_SCHEMA
    },
    required: ['planId', 'intent']
  },
  brandops_get_execution: {
    properties: {
      taskId: {
        type: 'string',
        description: 'Task handle returned by brandops_request_plan_execution.'
      }
    },
    required: ['taskId']
  },
  brandops_cancel_execution: {
    properties: {
      taskId: { type: 'string', description: 'Task handle to cancel.' },
      reason: { type: 'string', description: 'Why the request is being withdrawn.' }
    },
    required: ['taskId']
  },
  brandops_search_evidence: {
    properties: {
      claim: {
        type: 'string',
        description: 'The claim you need evidence for, e.g. "experienced building AI agents".'
      },
      query: { type: 'string', description: 'Accepted alias for claim.' },
      limit: { type: 'number', description: 'Max hits (1–25, default 10).' }
    },
    required: ['claim']
  },
  brandops_get_voice: {
    properties: {
      channel: {
        type: 'string',
        description:
          'Where the writing will appear (e.g. linkedin, email, blog). Recorded on the response; BrandOps stores one voice, not per-channel variants.'
      }
    },
    required: []
  },
  brandops_get_relationship_context: {
    properties: {
      name: { type: 'string', description: 'Contact name, full or partial.' },
      contactId: { type: 'string', description: 'Exact contact id, if known.' }
    },
    required: [],
    anyOf: [{ required: ['name'] }, { required: ['contactId'] }]
  },
  brandops_get_artifact: {
    properties: {
      artifactId: {
        type: 'string',
        description: 'Artifact id from brandops_search_artifacts.'
      }
    },
    required: ['artifactId']
  },
  brandops_get_authority: {
    properties: {
      topic: {
        type: 'string',
        description: 'Optional topic filter. Omit for the full authority graph and gaps.'
      }
    },
    required: []
  },
  brandops_get_next_best_actions: {
    properties: {
      limit: { type: 'number', description: 'Max actions (1–10, default 5).' }
    },
    required: []
  },
  brandops_get_receipt: {
    properties: {
      receiptId: { type: 'string', description: 'Receipt id to read.' },
      planId: { type: 'string', description: 'Alternative: latest receipt for this plan.' }
    },
    required: []
  },
  brandops_report_outcome: {
    properties: {
      /**
       * Enumerated from the canonical list rather than described in prose. The
       * gateway rejects anything outside it, so publishing the constraint lets a
       * client be right the first time instead of learning it from a refusal —
       * and deriving it from `OUTCOME_DIMENSIONS` means the two cannot drift.
       */
      dimension: {
        type: 'string',
        enum: [...OUTCOME_DIMENSIONS],
        description: 'Which dimension of the outcome is being reported.'
      },
      score: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Observed outcome score, 0–1.'
      },
      planId: { type: 'string', description: 'Plan this outcome belongs to, when applicable.' },
      evidence: {
        type: 'array',
        items: { type: 'string' },
        description: 'What you observed. Recorded as AGENT_REPORTED.'
      },
      intent: INTENT_CONTRACT_SCHEMA
    },
    required: ['dimension', 'score']
  },
  // ── Builder intelligence MCP tool schemas ──────────────────────────────
  brandops_get_builder_context: {
    properties: {
      query: {
        type: 'string',
        description: 'Optional natural-language filter for builder context.'
      },
      bundles: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Builder context bundles to fetch: builder-context, project-context, content-context. Defaults to all granted.'
      },
      maxItems: { type: 'number', description: 'Max items per bundle (1–20, default 8).' }
    },
    required: []
  },
  brandops_list_achievements: {
    properties: {
      status: {
        type: 'string',
        description: 'Filter by verification status: verified, unverified, or all (default).'
      },
      limit: { type: 'number', description: 'Max results (1–50, default 20).' }
    },
    required: []
  },
  brandops_verify_achievement: {
    properties: {
      achievementId: {
        type: 'string',
        description: 'Achievement candidate id, or the id of the event it came from.'
      },
      eventId: { type: 'string', description: 'Accepted alias for achievementId.' },
      verificationNote: {
        type: 'string',
        description: 'Why this was verified. Recorded on the achievement.'
      }
    },
    required: ['achievementId']
  },
  brandops_dismiss_achievement: {
    properties: {
      achievementId: {
        type: 'string',
        description: 'Achievement candidate id, or the id of the event it came from.'
      },
      eventId: { type: 'string', description: 'Accepted alias for achievementId.' },
      reason: {
        type: 'string',
        description: 'Why it is being dismissed. Recorded on the candidate.'
      }
    },
    required: ['achievementId']
  },
  brandops_list_opportunities: {
    properties: {
      limit: { type: 'number', description: 'Max results (1–20, default 10).' }
    },
    required: []
  },
  brandops_convert_opportunity_to_plan: {
    properties: {
      opportunityId: { type: 'string', description: 'Opportunity id to convert to a Plan.' },
      achievementId: {
        type: 'string',
        description: 'Alternative: verified achievement id to convert.'
      },
      preset: {
        type: 'string',
        description:
          'Plan preset template: content-plan, outreach-plan, positioning-plan, launch-plan, portfolio-plan, etc.'
      },
      userIntent: {
        type: 'string',
        description: 'Optional user intent or instructions for the plan.'
      }
    },
    // Either id converts; the handler requires one, not both. `required: []`
    // alone said "call me with nothing", which the handler then refused —
    // `anyOf` states the actual rule.
    required: [],
    anyOf: [{ required: ['opportunityId'] }, { required: ['achievementId'] }]
  },
  brandops_dismiss_opportunity: {
    properties: {
      opportunityId: { type: 'string', description: 'Opportunity id to dismiss.' }
    },
    required: ['opportunityId']
  },
  brandops_list_twin_proposals: {
    properties: {
      limit: { type: 'number', description: 'Max results (1–20, default 10).' }
    },
    required: []
  },
  brandops_accept_twin_proposal: {
    properties: {
      proposalId: { type: 'string', description: 'Twin update proposal id to accept and apply.' }
    },
    required: ['proposalId']
  },
  brandops_reject_twin_proposal: {
    properties: {
      proposalId: { type: 'string', description: 'Twin update proposal id to reject.' }
    },
    required: ['proposalId']
  },
  brandops_list_projects: {
    properties: {
      limit: { type: 'number', description: 'Max results (1–50, default 20).' }
    },
    required: []
  },
  brandops_get_project_intelligence: {
    properties: {
      projectId: { type: 'string', description: 'Project id to get intelligence for.' }
    },
    required: ['projectId']
  },
  brandops_list_receipts: {
    properties: {
      limit: { type: 'number', description: 'Max results (1–50, default 20).' }
    },
    required: []
  },
  brandops_list_connected_sessions: {
    properties: {
      limit: { type: 'number', description: 'Max results (1–20, default 20).' }
    },
    required: []
  },
  brandops_revoke_session: {
    properties: {
      sessionId: { type: 'string', description: 'Session id to revoke.' }
    },
    required: ['sessionId']
  },
  brandops_ingest_activity: {
    properties: {
      kind: {
        type: 'string',
        description:
          'Activity kind: feature-built, repository-released, product-launched, documentation-published, benchmark-improved, hackathon-submission, project-milestone, integration-completed, significant-refactor, or skill-demonstrated.'
      },
      title: { type: 'string', description: 'Short title of the activity (max 300 chars).' },
      detail: {
        type: 'string',
        description: 'What happened, who was involved, and any measurable outcome.'
      },
      confidence: {
        type: 'number',
        description: 'Confidence in the activity accuracy (0–1, default 0.7).'
      },
      sourceId: { type: 'string', description: 'External source identifier for dedup.' },
      source: {
        type: 'string',
        enum: [
          'user-action',
          'agent-reported',
          'integration-import',
          'skill-pack',
          'dev-hook',
          'session-to-brand',
          'manual'
        ],
        description: 'Where the activity came from. Anything else is recorded as agent-reported.'
      },
      entityRefs: {
        type: 'array',
        items: { type: 'object', properties: { type: { type: 'string' }, id: { type: 'string' } } },
        description: 'Links to related workspace objects (projects, goals, artifacts).'
      },
      evidence: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ref: {
              type: 'string',
              description: 'e.g. git:owner/repo@sha, release:v1.2.3, file:docs/api.md'
            },
            kind: {
              type: 'string',
              description: 'git | release | document | milestone | link | other'
            },
            label: { type: 'string' }
          }
        },
        description: 'Pointers the agent can cite as evidence.'
      }
    },
    required: ['kind', 'title', 'detail']
  },
  brandops_ingest_session_summary: {
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session identifier from the development environment.'
      },
      workDescription: { type: 'string', description: 'What was worked on during the session.' },
      problemsSolved: {
        type: 'array',
        items: { type: 'string' },
        description: 'Problems that were solved during the session.'
      },
      technologiesUsed: {
        type: 'array',
        items: { type: 'string' },
        description: 'Technologies used during the session.'
      },
      evidence: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'file | commit | test | build | artifact | link' },
            ref: { type: 'string' },
            label: { type: 'string' },
            content: { type: 'string', description: 'Only include if explicitly authorized.' }
          }
        },
        description: 'Optional evidence items (only if explicitly authorized).'
      }
    },
    required: ['sessionId', 'workDescription']
  },
  brandops_get_skill_instructions: {
    properties: {
      skillId: {
        type: 'string',
        description:
          'Skill pack id: capture-achievement, turn-build-into-content, review-project-positioning, generate-builder-update, prepare-launch-narrative, convert-work-session-to-portfolio-evidence, review-professional-profile, create-weekly-builder-review.'
      }
    },
    required: ['skillId']
  },
  brandops_get_feature_registry: {
    properties: {},
    required: []
  }
};

export interface ListMcpToolsOptions {
  /**
   * Capabilities granted to the calling session. When supplied, discovery is
   * restricted to them: advertising a tool the caller cannot invoke leaks the
   * shape of the workspace and invites calls that can only ever be refused.
   */
  grantedCapabilities?: readonly AgentCapabilityId[];
  /**
   * Active Profession Pack. Used to *order* the surface so the capabilities that
   * fit this profession come first — deliberately not used to hide anything.
   * A granted capability the pack does not happen to list is still a capability
   * the user authorized, and silently dropping it would break real workflows.
   */
  professionPackId?: string;
}

export function listMcpTools(options?: ListMcpToolsOptions): McpToolDefinition[] {
  const granted = options?.grantedCapabilities;
  const relevant = options?.professionPackId
    ? new Set(getProfessionRelevantCapabilities(options.professionPackId))
    : null;

  const definitions = AGENT_CAPABILITY_DEFINITIONS.filter(
    (def): def is AgentCapabilityDefinition & { toolName: string } => Boolean(def.toolName)
  ).filter((def) => !granted || granted.includes(def.id));

  const ordered = relevant
    ? [...definitions].sort((a, b) => {
        const aRelevant = relevant.has(a.id) ? 0 : 1;
        const bRelevant = relevant.has(b.id) ? 0 : 1;
        return aRelevant - bRelevant;
      })
    : definitions;

  return ordered.map((def) => {
    const schema = TOOL_ARG_SCHEMAS[def.toolName] ?? { properties: {}, required: [] };
    /**
     * Every mutating tool advertises the intent contract, and consequential
     * tiers advertise it as required — a client should be able to see the
     * obligation in `tools/list` rather than discover it by being rejected.
     */
    const carriesIntent = tierCarriesIntent(def.tier);
    const properties = carriesIntent
      ? { ...schema.properties, intent: schema.properties.intent ?? INTENT_CONTRACT_SCHEMA }
      : schema.properties;
    const required =
      tierRequiresDeclaredIntent(def.tier) && !schema.required.includes('intent')
        ? [...schema.required, 'intent']
        : schema.required;
    return {
      name: def.toolName,
      description: def.description,
      inputSchema: {
        type: 'object',
        properties,
        required,
        ...(schema.anyOf ? { anyOf: schema.anyOf } : {})
      },
      outputSchema: buildToolOutputSchema(def)
    };
  });
}

/**
 * The output schema a given tool is bound by, or `null` for a name outside the
 * registry. Looked up from the registry rather than from a `tools/list` the
 * caller may have been served a scoped view of — the obligation is a property of
 * the capability, not of what this session was shown.
 */
export function outputSchemaForTool(toolName: string): JsonSchema | null {
  const capabilityId = toolNameToCapabilityId(toolName);
  if (!capabilityId) return null;
  const def = AGENT_CAPABILITY_DEFINITIONS.find((entry) => entry.id === capabilityId);
  return def?.toolName ? buildToolOutputSchema(def as typeof def & { toolName: string }) : null;
}

/** MCP Tasks extension identifier, used in both capability declaration and per-request `_meta`. */
export const TASKS_EXTENSION = 'io.modelcontextprotocol/tasks';

/**
 * True when a client opted this request into the Tasks extension by declaring it
 * under `params._meta['io.modelcontextprotocol/clientCapabilities'].extensions`.
 * Clients that do not opt in get the ordinary tool result, so the surface stays
 * usable by hosts with no task support.
 */
export function clientSupportsTasks(params: Record<string, unknown> | undefined): boolean {
  const meta = (params?._meta ?? {}) as Record<string, unknown>;
  const clientCapabilities = meta['io.modelcontextprotocol/clientCapabilities'] as
    | { extensions?: Record<string, unknown> }
    | undefined;
  return Boolean(
    clientCapabilities?.extensions && TASKS_EXTENSION in clientCapabilities.extensions
  );
}

/** `CreateTaskResult` — the task-shaped response to a task-augmented `tools/call`. */
export function createTaskResult(task: McpTask): Record<string, unknown> {
  return {
    resultType: 'task',
    taskId: task.taskId,
    status: task.status,
    ...(task.statusMessage ? { statusMessage: task.statusMessage } : {}),
    createdAt: task.createdAt,
    lastUpdatedAt: task.lastUpdatedAt,
    ttlMs: task.ttlMs,
    ...(task.pollIntervalMs ? { pollIntervalMs: task.pollIntervalMs } : {})
  };
}

/** `tasks/get` response — a complete result carrying the current task view. */
export function taskGetResult(task: McpTask): Record<string, unknown> {
  return { resultType: 'complete', ...task };
}

/** What a host's task handler returns to the transport. */
export interface TaskHandlerResult {
  ok: boolean;
  task?: McpTask;
  errorCode?: string;
  error?: string;
}

export interface CallToolInput {
  workspace: BrandOpsData;
  token: string;
  toolName: string;
  args: Record<string, unknown>;
  idempotencyKey?: string;
  purpose?: string;
}

export async function handleCallToolRequest(input: CallToolInput): Promise<AgentToolResult> {
  const { session, result } = await executeAgentToolCall({
    workspace: input.workspace,
    token: input.token,
    call: {
      toolName: input.toolName,
      args: input.args ?? {},
      idempotencyKey: input.idempotencyKey,
      purpose: input.purpose
    }
  });
  return {
    ...result,
    data: { ...result.data, sessionId: session.id }
  };
}

export interface McpDispatchHandlers {
  callTool: (
    toolName: string,
    args: Record<string, unknown>,
    extra?: { idempotencyKey?: string; purpose?: string }
  ) => Promise<AgentToolResult>;
  /** Session-scoped `tools/list`. Omitted hosts advertise the full surface. */
  listTools?: () => Promise<McpToolDefinition[]>;
  /**
   * Resources. Optional: a host that does not wire this neither advertises the
   * `resources` capability nor answers `resources/*`, which is the spec's own
   * rule — declaring a capability you cannot serve is worse than serving none.
   */
  resources?: {
    list: () => Promise<McpResource[]>;
    templates: () => Promise<Array<Record<string, unknown>>>;
    read: (uri: string) => Promise<{
      ok: boolean;
      mimeType?: string;
      data?: unknown;
      errorCode?: string;
      error?: string;
      capabilityId?: AgentCapabilityId;
    }>;
  };
  tasks?: {
    get: (taskId: string) => Promise<TaskHandlerResult>;
    cancel: (taskId: string) => Promise<TaskHandlerResult>;
    update: (
      taskId: string,
      inputResponses: Record<string, { action?: string; content?: unknown }>
    ) => Promise<TaskHandlerResult>;
  };
}

export interface McpDispatchOutcome {
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
  methodNotFound?: boolean;
  insufficientScope?: string[];
}

/**
 * The one place a JSON-RPC method becomes BrandOps behavior. Both transports —
 * stdio and Streamable HTTP — route through here, so a capability can never be
 * reachable over one binding and not the other, and neither can drift into
 * enforcing different rules.
 */
export async function dispatchMcpMethod(input: {
  method: string;
  params: Record<string, unknown>;
  handlers: McpDispatchHandlers;
  /** Version this request is being served at, echoed by `initialize`. */
  protocolVersion?: string;
}): Promise<McpDispatchOutcome> {
  const { method, params, handlers } = input;
  const taskHandlers = handlers.tasks;

  /**
   * A `notifications/*` method carrying an id is malformed — the client asked
   * for an answer to something defined as unanswerable. Acknowledging costs
   * nothing and keeps a client that mislabels its handshake connected;
   * refusing would fail the connection over a message that wanted no reply.
   */
  if (isNotificationMethod(method)) {
    return { result: {} };
  }

  switch (method) {
    /**
     * Retired in 2026-07-28 but still answered: a legacy-era client opens with
     * it, and refusing would break every client that has not migrated.
     */
    case 'initialize': {
      const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
      const negotiated = isSupportedProtocolVersion(requested)
        ? requested
        : LATEST_PROTOCOL_VERSION;
      return {
        result: {
          protocolVersion: negotiated,
          capabilities: {
            tools: { listChanged: false },
            // Neither listChanged nor subscribe: the spec allows an empty object
            // and says to omit what is not supported rather than imply it.
            ...(handlers.resources ? { resources: {} } : {}),
            ...(taskHandlers ? { extensions: { [TASKS_EXTENSION]: {} } } : {})
          },
          serverInfo: SERVER_INFO
        }
      };
    }

    case 'ping':
      return { result: {} };

    case 'tools/list':
      // The host supplies a session-scoped lister when it can resolve one;
      // without it the full surface is returned (in-app and smoke-test paths).
      return {
        result: { tools: await (handlers.listTools?.() ?? Promise.resolve(listMcpTools())) }
      };

    case 'tools/call': {
      /**
       * A missing tool name is a malformed request, not a tool that ran and
       * refused. It used to reach the executor as `''` and come back as a
       * successful result carrying `unknown_tool` — with a session minted and an
       * audit entry written for a call that never named anything.
       */
      const toolName = typeof params.name === 'string' ? params.name.trim() : '';
      if (!toolName) {
        return {
          error: {
            code: MCP_ERROR.INVALID_PARAMS,
            message: 'tools/call requires a tool name in params.name.'
          }
        };
      }
      const args = (params.arguments as Record<string, unknown>) ?? {};
      const result = await handlers.callTool(toolName, args, {
        idempotencyKey:
          typeof params.idempotencyKey === 'string' ? params.idempotencyKey : undefined,
        purpose: typeof params.purpose === 'string' ? params.purpose : undefined
      });

      /**
       * A session that was never granted the capability is an authorization
       * failure, not a tool failure. Naming the capability lets the HTTP binding
       * answer `insufficient_scope` with the exact scope to ask for.
       */
      if (!result.ok && result.errorCode === 'capability_not_granted') {
        return {
          error: { code: MCP_ERROR.INVALID_PARAMS, message: result.error ?? 'Not granted.' },
          insufficientScope: [toolNameToCapabilityId(toolName) ?? toolName]
        };
      }

      /**
       * `CreateTaskResult` answers a call that *created* durable work. Reading or
       * cancelling an existing task creates nothing, so those return the ordinary
       * envelope their `outputSchema` describes — otherwise a task-aware client
       * would get a shape the tool never advertised. Which capabilities mint a
       * task is a registry fact (`createsTask`), not a rule this adapter knows.
       */
      const task = (result.data as { task?: McpTask } | undefined)?.task;
      const mintsTask = Boolean(AGENT_CAPABILITY_REGISTRY[result.capabilityId]?.createsTask);
      if (task && result.ok && mintsTask && clientDeclaredExtension(params, TASKS_EXTENSION)) {
        return { result: createTaskResult(task) };
      }
      /**
       * G18. The structured result and the text block are the *same* value,
       * serialized once, so a client that reads one can never be told something
       * different by the other. The spec asks for the text block for backwards
       * compatibility; it stays.
       *
       * The schema is declared, so conformance is an obligation. Rather than
       * assume it holds, validate at the point of emission: on a mismatch the
       * structured field is withheld and the reason is stated in-band. A client
       * degrades to the text result — which is complete — instead of validating
       * a payload that quietly broke its contract.
       */
      const wire = toWireValue(result) as Record<string, unknown>;
      const schema = outputSchemaForTool(toolName);
      const verdict = schema ? validateAgainstSchema(wire, schema) : { valid: true, errors: [] };
      const text = JSON.stringify(result, null, 2);
      return {
        result: {
          content: verdict.valid
            ? [{ type: 'text', text }]
            : [
                { type: 'text', text },
                {
                  type: 'text',
                  text:
                    `[brandops] structuredContent withheld — the result did not conform to the ` +
                    `declared outputSchema for ${toolName}: ${verdict.errors.slice(0, 3).join('; ')}. ` +
                    `The full result is in the preceding block.`
                }
              ],
          ...(verdict.valid ? { structuredContent: wire } : {}),
          isError: !result.ok
        }
      };
    }

    case 'resources/list':
    case 'resources/templates/list':
    case 'resources/read': {
      const resourceHandlers = handlers.resources;
      if (!resourceHandlers) {
        return {
          methodNotFound: true,
          error: {
            code: MCP_ERROR.METHOD_NOT_FOUND,
            message: `Method not found: ${method} (resources not enabled on this host)`
          }
        };
      }
      if (method === 'resources/list') {
        return { result: { resources: await resourceHandlers.list() } };
      }
      if (method === 'resources/templates/list') {
        return { result: { resourceTemplates: await resourceHandlers.templates() } };
      }

      const uri = typeof params.uri === 'string' ? params.uri.trim() : '';
      if (!uri) {
        return {
          error: {
            code: MCP_ERROR.INVALID_PARAMS,
            message: 'resources/read requires a resource uri in params.uri.',
            // Same code *and* same shape as an unresolvable uri. A client that
            // reads `data.uri` to report what failed should not have to handle
            // two error shapes for one error code.
            data: { uri }
          }
        };
      }
      const outcome = await resourceHandlers.read(uri);
      if (outcome.ok) {
        return {
          result: {
            contents: [
              {
                uri,
                mimeType: outcome.mimeType ?? 'application/json',
                text: JSON.stringify(outcome.data ?? {}, null, 2)
              }
            ]
          }
        };
      }
      /**
       * A capability the session lacks is an authorization failure, not a
       * missing resource — same distinction `tools/call` draws, so the HTTP
       * binding can answer `insufficient_scope` with the exact scope to ask for.
       */
      if (outcome.errorCode === 'capability_not_granted' && outcome.capabilityId) {
        return {
          error: { code: MCP_ERROR.INVALID_PARAMS, message: outcome.error ?? 'Not granted.' },
          insufficientScope: [outcome.capabilityId]
        };
      }
      /**
       * Everything else is "not found", which the spec pins to -32602 with the
       * uri in `data`. Never an empty `contents` array: the spec forbids it
       * because it cannot be told apart from a resource that exists and is empty.
       */
      return {
        error: {
          code: MCP_ERROR.INVALID_PARAMS,
          message: outcome.error ?? 'Resource not found',
          data: { uri }
        }
      };
    }

    case 'tasks/get':
    case 'tasks/cancel':
    case 'tasks/update': {
      if (!taskHandlers) {
        return {
          methodNotFound: true,
          error: {
            code: MCP_ERROR.METHOD_NOT_FOUND,
            message: `Method not found: ${method} (tasks extension not enabled on this host)`
          }
        };
      }
      const taskId = String(params.taskId ?? '');
      if (!taskId) {
        return { error: { code: MCP_ERROR.INVALID_PARAMS, message: 'taskId is required.' } };
      }
      const outcome =
        method === 'tasks/get'
          ? await taskHandlers.get(taskId)
          : method === 'tasks/cancel'
            ? await taskHandlers.cancel(taskId)
            : await taskHandlers.update(
                taskId,
                (params.inputResponses as Record<string, { action?: string; content?: unknown }>) ??
                  {}
              );
      if (!outcome.ok) {
        return {
          error: {
            // An approval an agent may not grant is a permission failure, not a bad request.
            code:
              outcome.errorCode === 'approval_not_delegable'
                ? MCP_ERROR.INVALID_PARAMS
                : MCP_ERROR.INVALID_PARAMS,
            message: `${outcome.errorCode ?? 'task_error'}: ${outcome.error ?? 'Task call failed.'}`
          },
          ...(outcome.errorCode === 'approval_not_delegable'
            ? { insufficientScope: ['brandops:approval'] }
            : {})
        };
      }
      if (method === 'tasks/cancel') return { result: {} };
      return { result: outcome.task ? { ...outcome.task } : {} };
    }

    default:
      return {
        methodNotFound: true,
        error: { code: MCP_ERROR.METHOD_NOT_FOUND, message: `Method not found: ${method}` }
      };
  }
}

/**
 * Line-delimited JSON-RPC over stdio for standalone embedding. `callTool` is
 * injected so the host can persist workspace state between messages. Node-only
 * transport; never invoked from the browser SPA.
 */
export function startMcpStdioServer(handlers: {
  callTool: (
    toolName: string,
    args: Record<string, unknown>,
    extra?: { idempotencyKey?: string; purpose?: string }
  ) => Promise<AgentToolResult>;
  getToken: () => string;
  /**
   * Tasks-extension handlers. Optional: when absent the server still serves
   * tools, it just never advertises or answers `tasks/*`.
   */
  tasks?: {
    get: (taskId: string) => Promise<TaskHandlerResult>;
    cancel: (taskId: string) => Promise<TaskHandlerResult>;
    update: (
      taskId: string,
      inputResponses: Record<string, { action?: string; content?: unknown }>
    ) => Promise<TaskHandlerResult>;
  };
}): () => void {
  let buffer = '';
  // eslint-disable-next-line no-undef -- Node-only stdio transport
  const stdin = process.stdin;
  // eslint-disable-next-line no-undef -- Node-only stdio transport
  const stdout = process.stdout;

  const respond = (
    id: number | string | null,
    result?: unknown,
    error?: { code: number; message: string }
  ) => {
    const message = JSON.stringify({
      jsonrpc: '2.0',
      id,
      ...(result !== undefined ? { result } : {}),
      ...(error ? { error } : {})
    });
    stdout.write(`${message}\n`);
  };

  const onData = (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      let request: {
        jsonrpc?: string;
        id?: number | string | null;
        method?: string;
        params?: Record<string, unknown>;
      };
      try {
        request = JSON.parse(line);
      } catch {
        respond(null, undefined, { code: -32700, message: 'Parse error' });
        continue;
      }
      /**
       * Notifications are ignored in full: no response, no dispatch, and so no
       * session and no audit entry for a message that asked for nothing. An
       * unknown notification is ignored rather than refused — the spec allows a
       * receiver to drop one it does not understand, and answering would be the
       * worse error.
       */
      if (isJsonRpcNotification(request)) continue;

      const { id = null, method, params = {} } = request;
      if (!method) {
        respond(id, undefined, { code: MCP_ERROR.INVALID_PARAMS, message: 'Missing method.' });
        continue;
      }

      /**
       * Stateless-era requests carry their protocol version and capabilities in
       * `_meta`; legacy clients carry none and are served at the assumed legacy
       * version. Either way the check is per request — stdio is a byte stream,
       * not a session.
       */
      const metaCheck = validateRequestMeta(id, params);
      if (!metaCheck.ok && metaCheck.error) {
        respond(id, undefined, metaCheck.error.error);
        continue;
      }

      dispatchMcpMethod({ method, params, handlers, protocolVersion: metaCheck.version })
        .then((outcome) => {
          if (outcome.error) {
            respond(id, undefined, outcome.error);
            return;
          }
          respond(id, withResultEnvelope(outcome.result ?? {}));
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          /**
           * An authorization failure is not an internal error.
           *
           * A revoked session threw here and came back as `-32603`, which tells
           * a client the *server* is broken — so the reasonable response is to
           * retry, indefinitely, on a session that will never work again. The
           * user revoked it precisely to make it stop. The HTTP binding already
           * answered `401` for this; stdio now says the same thing in the code
           * space the rest of this file uses.
           */
          respond(id, undefined, {
            code: message.startsWith('E_UNAUTHORIZED')
              ? MCP_ERROR.UNAUTHORIZED
              : MCP_ERROR.INTERNAL_ERROR,
            message
          });
        });
    }
  };

  // eslint-disable-next-line no-undef -- Node Buffer type
  stdin.on('data', (data: Buffer) => onData(data.toString('utf8')));
  stdin.resume();

  return () => {
    stdin.removeAllListeners('data');
  };
}
