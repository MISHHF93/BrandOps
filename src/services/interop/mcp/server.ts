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
import type { AgentCapabilityDefinition, AgentToolResult } from '../../../types/agentInterop';
import { AGENT_CAPABILITY_DEFINITIONS } from '../capabilityRegistry';
import { executeAgentToolCall } from '../gateway';
import type { BrandOpsData } from '../../../types/domain';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

const TOOL_ARG_SCHEMAS: Record<
  string,
  { properties: Record<string, unknown>; required: string[] }
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
    required: []
  },
  brandops_request_action: {
    properties: {
      action: { type: 'string', description: 'e.g. publish, outreach, integration-change.' },
      target: { type: 'string', description: 'What it applies to.' },
      summary: { type: 'string', description: 'Why and what exactly should happen.' }
    },
    required: ['action', 'target', 'summary']
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
        description: "Builder context bundles to fetch: builder-context, project-context, content-context. Defaults to all granted."
      },
      maxItems: { type: 'number', description: 'Max items per bundle (1–20, default 8).' }
    },
    required: []
  },
  brandops_list_achievements: {
    properties: {
      status: {
        type: 'string',
        description: "Filter by verification status: verified, unverified, or all (default)."
      },
      limit: { type: 'number', description: 'Max results (1–50, default 20).' }
    },
    required: []
  },
  brandops_verify_achievement: {
    properties: {
      achievementId: { type: 'string', description: 'Achievement id to verify.' },
      verificationStatus: {
        type: 'string',
        description: "Verification status: USER_VERIFIED (default) or INDEPENDENTLY_SUPPORTED."
      }
    },
    required: ['achievementId']
  },
  brandops_dismiss_achievement: {
    properties: {
      achievementId: { type: 'string', description: 'Achievement id to dismiss.' }
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
      achievementId: { type: 'string', description: 'Alternative: verified achievement id to convert.' },
      preset: {
        type: 'string',
        description: 'Plan preset template: content-plan, outreach-plan, positioning-plan, launch-plan, portfolio-plan, etc.'
      },
      userIntent: { type: 'string', description: 'Optional user intent or instructions for the plan.' }
    },
    required: ['opportunityId', 'achievementId']
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
        description: 'Activity kind: feature-built, repository-released, product-launched, documentation-published, benchmark-improved, hackathon-submission, project-milestone, integration-completed, significant-refactor, or skill-demonstrated.'
      },
      title: { type: 'string', description: 'Short title of the activity (max 300 chars).' },
      detail: { type: 'string', description: 'What happened, who was involved, and any measurable outcome.' },
      confidence: { type: 'number', description: 'Confidence in the activity accuracy (0–1, default 0.7).' },
      sourceId: { type: 'string', description: 'External source identifier for dedup.' },
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
            ref: { type: 'string', description: 'e.g. git:owner/repo@sha, release:v1.2.3, file:docs/api.md' },
            kind: { type: 'string', description: 'git | release | document | milestone | link | other' },
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
      sessionId: { type: 'string', description: 'Session identifier from the development environment.' },
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
        description: 'Skill pack id: capture-achievement, turn-build-into-content, review-project-positioning, generate-builder-update, prepare-launch-narrative, convert-work-session-to-portfolio-evidence, review-professional-profile, create-weekly-builder-review.'
      }
    },
    required: ['skillId']
  },
  brandops_get_feature_registry: {
    properties: {},
    required: []
  }
};

export function listMcpTools(): McpToolDefinition[] {
  return AGENT_CAPABILITY_DEFINITIONS.filter(
    (def): def is AgentCapabilityDefinition & { toolName: string } => Boolean(def.toolName)
  ).map((def) => {
    const schema = TOOL_ARG_SCHEMAS[def.toolName] ?? { properties: {}, required: [] };
    return {
      name: def.toolName,
      description: def.description,
      inputSchema: { type: 'object', properties: schema.properties, required: schema.required }
    };
  });
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
      const { id = null, method, params = {} } = request;
      if (method === 'initialize') {
        respond(id, {
          protocolVersion: '2025-03-26',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'brandops-agent-gateway', version: '1.0.0' }
        });
      } else if (method === 'tools/list') {
        respond(id, { tools: listMcpTools() });
      } else if (method === 'tools/call') {
        const toolName = String(params.name ?? '');
        const args = (params.arguments as Record<string, unknown>) ?? {};
        const extra = {
          idempotencyKey:
            typeof params.idempotencyKey === 'string' ? params.idempotencyKey : undefined,
          purpose: typeof params.purpose === 'string' ? params.purpose : undefined
        };
        handlers
          .callTool(toolName, args, extra)
          .then((result) =>
            respond(id, {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
              isError: !result.ok
            })
          )
          .catch((error: unknown) =>
            respond(id, undefined, {
              code: -32603,
              message: error instanceof Error ? error.message : String(error)
            })
          );
      } else if (method === 'ping') {
        respond(id, {});
      } else {
        respond(id, undefined, { code: -32601, message: `Method not found: ${method ?? ''}` });
      }
    }
  };

  // eslint-disable-next-line no-undef -- Node Buffer type
  stdin.on('data', (data: Buffer) => onData(data.toString('utf8')));
  stdin.resume();

  return () => {
    stdin.removeAllListeners('data');
  };
}
