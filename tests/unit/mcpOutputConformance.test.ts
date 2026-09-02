/**
 * Output-schema conformance against a workspace with data in it.
 *
 * `mcpStructuredOutput.test.ts` already drives every tool, but against the seed
 * workspace — which has no twin, no contacts, no artifacts, no achievement
 * candidates, no opportunities, no proposals and no projects. So most tools land
 * on their "not found" branch, and a sweep that looks exhaustive validated the
 * *success* payload of 21 tools out of 40.
 *
 * That gap is not theoretical. Two published schemas were wrong —
 * `PlanReceipt.generatedSteps` declared a number when it is a string array, and
 * `McpTask.ttlMs` not permitting the null BrandOps actually emits — and both
 * survived every test until one finally supplied real data.
 *
 * This suite closes it: same sweep, populated workspace, and a coverage floor so
 * the blind spot cannot quietly reopen.
 */
import { describe, expect, it } from 'vitest';
import { populatedWorkspace, POPULATED_IDS } from '../helpers/populatedWorkspace';
import { createAgentSession } from '../../src/services/interop/sessions';
import { executeAgentToolCall } from '../../src/services/interop/gateway';
import { listMcpTools, outputSchemaForTool } from '../../src/services/interop/mcp/server';
import { toWireValue, validateAgainstSchema } from '../../src/services/interop/mcp/outputSchema';
import { resetRateLimits } from '../../src/services/interop/policyEngine';
import { computeProjectIntelligence } from '../../src/services/builder/projectIntelligence';
import { AGENT_CAPABILITY_IDS, CONTEXT_BUNDLE_IDS } from '../../src/types/agentInterop';
import type { AgentCapabilityId } from '../../src/types/agentInterop';

const INTENT = {
  objective: 'Exercise every tool against real data.',
  reason: 'The user asked for the published output contract to be verified.',
  confirm: true
};

/** Ids that let each tool reach the branch where its payload actually has content. */
const REAL_ARGS: Record<string, Record<string, unknown>> = {
  brandops_get_plan_status: { planId: POPULATED_IDS.plan },
  brandops_get_receipt: { planId: POPULATED_IDS.plan },
  brandops_request_plan_execution: { planId: POPULATED_IDS.plan },
  brandops_get_relationship_context: { name: 'Sarah Chen' },
  brandops_get_artifact: { artifactId: POPULATED_IDS.artifact },
  brandops_search_evidence: { claim: 'shipped the gateway' },
  brandops_verify_achievement: { achievementId: POPULATED_IDS.achievement },
  brandops_convert_opportunity_to_plan: { opportunityId: POPULATED_IDS.opportunity },
  brandops_dismiss_opportunity: { opportunityId: POPULATED_IDS.opportunity },
  brandops_accept_twin_proposal: { proposalId: POPULATED_IDS.twinProposal },
  brandops_get_project_intelligence: { projectId: POPULATED_IDS.project },
  brandops_get_skill_instructions: { skillId: 'capture-achievement' }
};

/** A value that satisfies the property's own declared constraints. */
function placeholder(schema: Record<string, unknown>, key: string): unknown {
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  switch (schema.type) {
    case 'number':
      return typeof schema.minimum === 'number' ? schema.minimum : 1;
    case 'boolean':
      return true;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return `placeholder-${key}`;
  }
}

describe('output conformance against real data', () => {
  it('every reachable payload matches the schema its tool publishes', async () => {
    const created = await createAgentSession(populatedWorkspace(), {
      clientKind: 'claude-code',
      clientName: 'Claude Code',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [...CONTEXT_BUNDLE_IDS],
      grantedCapabilities: [...AGENT_CAPABILITY_IDS] as AgentCapabilityId[]
    });
    let current = created.workspace;

    const violations: string[] = [];
    const crashed: string[] = [];
    const succeeded: string[] = [];

    for (const tool of listMcpTools()) {
      // Revoking would end the session this sweep is running under.
      if (tool.name === 'brandops_revoke_session') continue;

      const properties = tool.inputSchema.properties as Record<string, Record<string, unknown>>;
      const args: Record<string, unknown> = { intent: INTENT };
      for (const name of [
        ...tool.inputSchema.required,
        ...(tool.inputSchema.anyOf?.[0]?.required ?? [])
      ]) {
        if (name !== 'intent') args[name] = placeholder(properties[name] ?? {}, name);
      }
      Object.assign(args, REAL_ARGS[tool.name] ?? {});

      resetRateLimits();
      const { workspace: next, result } = await executeAgentToolCall({
        workspace: current,
        token: created.token,
        call: { toolName: tool.name, args }
      });
      current = next;

      // `handler_error` is the gateway catching a thrown handler. With ordinary
      // data in the workspace, nothing should throw.
      if (result.errorCode === 'handler_error') crashed.push(`${tool.name}: ${result.error}`);
      if (result.ok) succeeded.push(tool.name);

      const verdict = validateAgainstSchema(toWireValue(result), outputSchemaForTool(tool.name)!);
      if (verdict.errors.length) {
        violations.push(`${tool.name}: ${verdict.errors.join('; ')}`);
      }
    }

    expect(crashed, `Handlers that threw on ordinary data:\n  ${crashed.join('\n  ')}`).toEqual([]);
    expect(
      violations,
      `Payloads that broke their own published schema:\n  ${violations.join('\n  ')}`
    ).toEqual([]);

    /**
     * The floor is the point of this suite. Against the seed workspace only 21
     * tools reached a success branch, so 19 output schemas were being "verified"
     * against refusals. If this number falls, the sweep has gone back to
     * validating nothing in particular.
     */
    expect(
      succeeded.length,
      `Only ${succeeded.length} tools reached a success branch. Populate the fixture rather than lowering the floor.`
    ).toBeGreaterThanOrEqual(28);
  });

  it('the populated fixture survives normalization', () => {
    // `withDefaults` silently drops records that do not satisfy the normalizer,
    // and a fixture it discards makes every test that uses it pass against
    // nothing. Each id below is one such near-miss already paid for.
    const ws = populatedWorkspace();
    expect(ws.digitalTwins?.twins.map((t) => t.id)).toContain(POPULATED_IDS.twin);
    expect(ws.contacts.map((c) => c.id)).toContain(POPULATED_IDS.contact);
    expect(ws.integrationHub.artifacts.map((a) => a.id)).toContain(POPULATED_IDS.artifact);
    expect(ws.planWorkspace?.plans.map((p) => p.id)).toContain(POPULATED_IDS.plan);
    expect(ws.planWorkspace?.receipts.map((r) => r.planId)).toContain(POPULATED_IDS.plan);
    expect(ws.builderActivity?.achievements?.map((a) => a.id)).toContain(POPULATED_IDS.achievement);
    expect(ws.builderActivity?.opportunities?.map((o) => o.id)).toContain(
      POPULATED_IDS.opportunity
    );
    expect(ws.builderActivity?.twinProposals?.map((p) => p.id)).toContain(
      POPULATED_IDS.twinProposal
    );
    expect(ws.builderActivity?.projects?.map((p) => p.id)).toContain(POPULATED_IDS.project);
  });

  it('project intelligence survives a project record missing its arrays', () => {
    // `Project` types `tags` and the id arrays as required and nothing enforces
    // it — `withDefaults` does not normalize `builderActivity.projects` at all.
    // A record from a partial write or an older schema used to throw out of the
    // handler on `project.tags.length`.
    const ws = populatedWorkspace();
    const bare = { ...ws.builderActivity!.projects![0] } as Record<string, unknown>;
    for (const key of ['tags', 'achievementIds', 'artifactIds', 'planIds', 'recentMilestones']) {
      delete bare[key];
    }
    expect(() =>
      computeProjectIntelligence({
        state: { ...ws.builderActivity, projects: [bare] },
        projectId: POPULATED_IDS.project
      } as never)
    ).not.toThrow();
  });
});
