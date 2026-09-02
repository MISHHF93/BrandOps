import { beforeEach, describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import { createAgentSession } from '../../src/services/interop/sessions';
import { executeAgentToolCall } from '../../src/services/interop/gateway';
import { resetRateLimits } from '../../src/services/interop/policyEngine';
import {
  dispatchMcpMethod,
  listMcpTools,
  outputSchemaForTool
} from '../../src/services/interop/mcp/server';
import {
  buildToolOutputSchema,
  toWireValue,
  validateAgainstSchema
} from '../../src/services/interop/mcp/outputSchema';
import { AGENT_CAPABILITY_DEFINITIONS } from '../../src/services/interop/capabilityRegistry';
import { AGENT_CAPABILITY_IDS, CONTEXT_BUNDLE_IDS } from '../../src/types/agentInterop';
import type { AgentCapabilityId } from '../../src/types/agentInterop';
import type { BrandOpsData } from '../../src/types/domain';

const INTENT = {
  objective: 'Exercise the declared output contract.',
  reason: 'The user asked for the structured surface to be verified end to end.',
  confirm: true
};

/**
 * One argument fixture per tool. Several deliberately land on the failure branch
 * (no such plan, no such task) — the point is that *both* branches of the
 * envelope must conform, not just the happy one.
 */
const TOOL_ARGS: Record<string, Record<string, unknown>> = {
  brandops_get_relevant_context: { query: 'agent runtime' },
  brandops_search_evidence: { claim: 'shipped the agent runtime' },
  brandops_search_artifacts: { query: '' },
  brandops_get_plan_status: {},
  brandops_get_receipt: {},
  brandops_record_achievement: {
    kind: 'feature_completed',
    title: 'Structured output landed',
    detail: 'Declared and enforced an output schema for every tool.'
  },
  brandops_create_artifact: { title: 'Schema note', summary: 'What the envelope guarantees.' },
  brandops_propose_twin_update: { claimText: 'Ships governed MCP surfaces.' },
  brandops_create_content_opportunity: {
    title: 'Write up structured output',
    detail: 'Explain why a declared schema is a promise.'
  },
  brandops_convert_to_plan: { proposalId: 'no-such-proposal' },
  brandops_request_plan_execution: { planId: 'no-such-plan' },
  brandops_get_execution: { taskId: 'no-such-task' },
  brandops_cancel_execution: { taskId: 'no-such-task' },
  brandops_request_action: {
    action: 'send-email',
    target: 'nobody@example.invalid',
    summary: 'Never executes; approval-gated.'
  },
  brandops_report_outcome: { dimension: 'plan-success-rate', score: 0.5 }
};

async function grantedSession(
  workspace: BrandOpsData = cloneSeedData()
): Promise<{ workspace: BrandOpsData; token: string }> {
  const created = await createAgentSession(workspace, {
    clientKind: 'claude-code',
    clientName: 'Claude Code',
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    grantedBundles: [...CONTEXT_BUNDLE_IDS],
    grantedCapabilities: [...AGENT_CAPABILITY_IDS] as AgentCapabilityId[]
  });
  return { workspace: created.workspace, token: created.token };
}

/** Drives one `tools/call` through the real gateway and returns the MCP result. */
async function callTool(
  workspace: BrandOpsData,
  token: string,
  toolName: string,
  args: Record<string, unknown>
) {
  let current = workspace;
  const outcome = await dispatchMcpMethod({
    method: 'tools/call',
    params: { name: toolName, arguments: args },
    handlers: {
      callTool: async (name, callArgs) => {
        const {
          workspace: next,
          session,
          result
        } = await executeAgentToolCall({
          workspace: current,
          token,
          call: { toolName: name, args: callArgs }
        });
        current = next;
        return { ...result, data: { ...result.data, sessionId: session.id } };
      }
    }
  });
  return { outcome, workspace: current };
}

describe('G18 — declared output schemas', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('every advertised tool declares an output schema pinned to its capability', () => {
    const tools = listMcpTools();
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      const schema = tool.outputSchema;
      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(schema.type).toBe('object');
      const properties = schema.properties as Record<string, Record<string, unknown>>;
      // The envelope names which capability answered, so a client can tell what it is holding.
      const definition = AGENT_CAPABILITY_DEFINITIONS.find((def) => def.toolName === tool.name);
      expect(properties.capabilityId.const).toBe(definition?.id);
      expect(schema.required).toEqual(
        expect.arrayContaining(['ok', 'capabilityId', 'data', 'checkpointIds', 'auditEntryId'])
      );
    }
  });

  it('an unregistered tool name carries no output obligation', () => {
    expect(outputSchemaForTool('brandops_not_a_tool')).toBeNull();
  });

  /**
   * The load-bearing test. The spec makes a declared schema binding, so the only
   * way to know it holds is to drive the surface and check what comes back —
   * every tool, both branches, against the schema the server published.
   */
  it('every tool result conforms to the schema that tool advertises', async () => {
    const { workspace, token } = await grantedSession();
    let current = workspace;
    const checked: string[] = [];

    for (const tool of listMcpTools()) {
      const args = { ...(TOOL_ARGS[tool.name] ?? {}), intent: INTENT };
      const { outcome, workspace: next } = await callTool(current, token, tool.name, args);
      current = next;

      const result = outcome.result as
        | { content?: Array<{ text?: string }>; structuredContent?: unknown }
        | undefined;
      // `insufficientScope` results are protocol errors and carry no envelope.
      if (!result) continue;

      expect(
        result.structuredContent,
        `${tool.name} withheld structuredContent: ${result.content?.[1]?.text ?? ''}`
      ).toBeDefined();

      const verdict = validateAgainstSchema(result.structuredContent, tool.outputSchema);
      expect(verdict.errors, `${tool.name}: ${verdict.errors.join('; ')}`).toEqual([]);
      checked.push(tool.name);
    }

    expect(checked.length).toBe(listMcpTools().length);
  });

  it('the structured result and the text block are the same value', async () => {
    const { workspace, token } = await grantedSession();
    const { outcome } = await callTool(workspace, token, 'brandops_get_current_goals', {});
    const result = outcome.result as {
      content: Array<{ text: string }>;
      structuredContent: unknown;
    };
    expect(JSON.parse(result.content[0].text)).toEqual(result.structuredContent);
  });

  it('a refusal still conforms, and always names itself', async () => {
    const { workspace, token } = await grantedSession();
    const { outcome } = await callTool(workspace, token, 'brandops_get_execution', {
      taskId: 'no-such-task'
    });
    const result = outcome.result as {
      structuredContent: Record<string, unknown>;
      isError: boolean;
    };
    expect(result.isError).toBe(true);
    expect(result.structuredContent.ok).toBe(false);
    // The `if ok === false then errorCode` branch is not decoration: it is enforced.
    expect(result.structuredContent.errorCode).toBe('task_not_found');
    expect(
      validateAgainstSchema(
        result.structuredContent,
        outputSchemaForTool('brandops_get_execution')!
      ).errors
    ).toEqual([]);
  });

  it('withholds structured content rather than emitting a payload that broke the contract', () => {
    const definition = AGENT_CAPABILITY_DEFINITIONS.find((def) => def.id === 'goals.read')!;
    const schema = buildToolOutputSchema(definition as typeof definition & { toolName: string });
    // A handler that regressed and dropped `goals` from a successful read.
    const broken = {
      ok: true,
      capabilityId: 'goals.read',
      data: {},
      checkpointIds: [],
      auditEntryId: 'audit-1'
    };
    const verdict = validateAgainstSchema(broken, schema);
    expect(verdict.valid).toBe(false);
    expect(verdict.errors.join(' ')).toContain('goals');
  });

  it('a result claiming the wrong capability is caught', () => {
    const definition = AGENT_CAPABILITY_DEFINITIONS.find((def) => def.id === 'goals.read')!;
    const schema = buildToolOutputSchema(definition as typeof definition & { toolName: string });
    const verdict = validateAgainstSchema(
      {
        ok: true,
        capabilityId: 'artifacts.read',
        data: { goals: [] },
        checkpointIds: [],
        auditEntryId: 'a'
      },
      schema
    );
    expect(verdict.valid).toBe(false);
  });

  it('an agent-reported outcome cannot declare itself verified', () => {
    const definition = AGENT_CAPABILITY_DEFINITIONS.find((def) => def.id === 'outcome.report')!;
    const schema = buildToolOutputSchema(definition as typeof definition & { toolName: string });
    const verdict = validateAgainstSchema(
      {
        ok: true,
        capabilityId: 'outcome.report',
        data: { dimension: 'plan-success-rate', trustTier: 'USER_VERIFIED', note: 'n' },
        checkpointIds: [],
        auditEntryId: 'a'
      },
      schema
    );
    // The schema pins the tier to a const — the trust boundary is in the contract, not just the code.
    expect(verdict.valid).toBe(false);
  });
});

describe('G18 — schema validation subset', () => {
  it('checks type, const, enum, required and nested properties', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        kind: { const: 'plan' },
        status: { type: 'string', enum: ['todo', 'done'] },
        nested: { type: 'object', properties: { count: { type: 'number' } } }
      },
      required: ['name', 'kind']
    };
    expect(validateAgainstSchema({ name: 'a', kind: 'plan', status: 'todo' }, schema).valid).toBe(
      true
    );
    expect(validateAgainstSchema({ kind: 'plan' }, schema).errors[0]).toContain('required');
    expect(validateAgainstSchema({ name: 'a', kind: 'other' }, schema).valid).toBe(false);
    expect(validateAgainstSchema({ name: 'a', kind: 'plan', status: 'x' }, schema).valid).toBe(
      false
    );
    expect(
      validateAgainstSchema({ name: 'a', kind: 'plan', nested: { count: 'no' } }, schema).valid
    ).toBe(false);
  });

  it('checks array items, additionalProperties, anyOf and allOf', () => {
    expect(
      validateAgainstSchema([1, 2, 'three'], { type: 'array', items: { type: 'number' } }).valid
    ).toBe(false);
    expect(
      validateAgainstSchema(
        { a: 1, b: 2 },
        { type: 'object', properties: { a: { type: 'number' } }, additionalProperties: false }
      ).valid
    ).toBe(false);
    expect(
      validateAgainstSchema('x', { anyOf: [{ type: 'number' }, { type: 'string' }] }).valid
    ).toBe(true);
    expect(validateAgainstSchema(1, { anyOf: [{ type: 'string' }] }).valid).toBe(false);
    expect(
      validateAgainstSchema({ a: 1 }, { allOf: [{ type: 'object' }, { required: ['b'] }] }).valid
    ).toBe(false);
  });

  it('applies if/then only when the condition holds', () => {
    const schema = {
      type: 'object',
      properties: { ok: { type: 'boolean' } },
      if: { properties: { ok: { const: false } }, required: ['ok'] },
      then: { required: ['errorCode'] }
    };
    expect(validateAgainstSchema({ ok: true }, schema).valid).toBe(true);
    expect(validateAgainstSchema({ ok: false }, schema).valid).toBe(false);
    expect(validateAgainstSchema({ ok: false, errorCode: 'nope' }, schema).valid).toBe(true);
  });

  it('ignores keywords it does not implement instead of inventing failures', () => {
    // A constraint this validator cannot evaluate must not be reported as violated.
    expect(
      validateAgainstSchema('abc', { type: 'string', pattern: '^\\d+$', minLength: 99 }).valid
    ).toBe(true);
  });

  it('validates the value that will actually serialize, not the one in memory', () => {
    const schema = {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id']
    };
    const inMemory = { id: undefined as string | undefined };
    // `JSON.stringify` drops the key, so validating the raw object would pass a
    // result the client never receives.
    expect(validateAgainstSchema(toWireValue(inMemory), schema).valid).toBe(false);
    expect(toWireValue({ a: 1, b: undefined })).toEqual({ a: 1 });
  });
});
