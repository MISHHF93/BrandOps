/**
 * The published tool schema is a contract, and these tests check both directions
 * of it.
 *
 * The defect that prompted them: `brandops_verify_achievement` and
 * `brandops_dismiss_achievement` declared `achievementId` **required**, and their
 * handlers read only `args.eventId`. A client following the published schema
 * exactly — passing the one required argument — got `missing_event_id: eventId
 * is required`. Two tools were uncallable as documented, and every existing test
 * passed, because every existing test called them the way the *handler* wanted.
 *
 * So: what the schema requires must be enforced, what the schema documents must
 * be sufficient, and what the handler reads must be documented.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cloneSeedData } from '../helpers/fixtures';
import { createAgentSession } from '../../src/services/interop/sessions';
import { executeAgentToolCall } from '../../src/services/interop/gateway';
import { listMcpTools } from '../../src/services/interop/mcp/server';
import { AGENT_CAPABILITY_DEFINITIONS } from '../../src/services/interop/capabilityRegistry';
import { resetRateLimits } from '../../src/services/interop/policyEngine';
import { AGENT_CAPABILITY_IDS, CONTEXT_BUNDLE_IDS } from '../../src/types/agentInterop';
import type { AgentCapabilityId } from '../../src/types/agentInterop';
import type { BrandOpsData } from '../../src/types/domain';

const INTENT = {
  objective: 'Exercise the published tool contract.',
  reason: 'The user asked for the documented surface to be verified.',
  confirm: true
};

/** Errors that mean "you did not give me an argument I needed". */
const ARGUMENT_ERRORS = /^(invalid_args|missing_)/;

async function fullyGranted(): Promise<{ workspace: BrandOpsData; token: string }> {
  const created = await createAgentSession(cloneSeedData(), {
    clientKind: 'claude-code',
    clientName: 'Claude Code',
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    grantedBundles: [...CONTEXT_BUNDLE_IDS],
    grantedCapabilities: [...AGENT_CAPABILITY_IDS] as AgentCapabilityId[]
  });
  return { workspace: created.workspace, token: created.token };
}

/** A placeholder that satisfies the property's own declared constraints. */
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

describe('published tool contract', () => {
  it('enforces every argument it declares required', async () => {
    const { workspace, token } = await fullyGranted();
    let current = workspace;
    const notEnforced: string[] = [];

    for (const tool of listMcpTools()) {
      const required = tool.inputSchema.required.filter((name) => name !== 'intent');
      if (!required.length) continue;
      resetRateLimits();
      const { workspace: next, result } = await executeAgentToolCall({
        workspace: current,
        token,
        // Everything omitted except the intent contract, which a separate stage owns.
        call: { toolName: tool.name, args: { intent: INTENT } }
      });
      current = next;
      if (result.ok) notEnforced.push(`${tool.name} declares [${required.join(', ')}] required`);
    }

    expect(notEnforced, `Required arguments not enforced: ${notEnforced.join('; ')}`).toEqual([]);
  });

  /**
   * The direction that was broken. A client that reads the schema and supplies
   * exactly what it asks for must get past argument validation. Where it lands
   * after that — not found, nothing to do — is the workspace's business.
   */
  it('accepts a call built from nothing but its own documented schema', async () => {
    const { workspace, token } = await fullyGranted();
    let current = workspace;
    const unusable: string[] = [];

    for (const tool of listMcpTools()) {
      const properties = tool.inputSchema.properties as Record<string, Record<string, unknown>>;
      const args: Record<string, unknown> = { intent: INTENT };
      // `required`, plus the first `anyOf` branch where the tool needs one of
      // several ids. A client generating a call reads exactly these.
      const names = [
        ...tool.inputSchema.required,
        ...(tool.inputSchema.anyOf?.[0]?.required ?? [])
      ];
      for (const name of names) {
        if (name === 'intent') continue;
        args[name] = placeholder(properties[name] ?? {}, name);
      }
      resetRateLimits();
      const { workspace: next, result } = await executeAgentToolCall({
        workspace: current,
        token,
        call: { toolName: tool.name, args }
      });
      current = next;
      if (!result.ok && ARGUMENT_ERRORS.test(result.errorCode ?? '')) {
        unusable.push(`${tool.name}: ${result.errorCode} — ${result.error}`);
      }
    }

    expect(
      unusable,
      `Uncallable as documented — the schema asks for one thing and the handler wants another:\n  ${unusable.join('\n  ')}`
    ).toEqual([]);
  });

  /**
   * The other direction: an argument a handler reads but never declares is
   * behavior no client can discover. `brandops_dismiss_achievement` quietly
   * accepted a `reason` for a long time, so an agent dismissing an achievement
   * could have recorded why and had no way to know it.
   */
  it('documents every argument its handler reads', () => {
    const sources = [
      readFileSync('src/services/interop/gateway.ts', 'utf8'),
      readFileSync('src/services/interop/mcp/builderToolHandlers.ts', 'utf8')
    ];
    const schemas = new Map(
      listMcpTools().map((tool) => [tool.name, new Set(Object.keys(tool.inputSchema.properties))])
    );

    /** The `case '<id>': { … }` body, up to the next case at the same depth. */
    const handlerBody = (source: string, capabilityId: string): string | null => {
      const start = source.indexOf(`case '${capabilityId}':`);
      if (start < 0) return null;
      const next = source.indexOf("\n    case '", start + 5);
      return source.slice(start, next < 0 ? source.length : next);
    };

    const undocumented: string[] = [];
    for (const def of AGENT_CAPABILITY_DEFINITIONS) {
      if (!def.toolName) continue;
      const body = sources.map((src) => handlerBody(src, def.id)).find(Boolean);
      if (!body) continue;
      const declared = schemas.get(def.toolName) ?? new Set<string>();
      const pattern = /(?:strArg|strArrArg)\(args,\s*'([^']+)'\)|args\.([A-Za-z_][A-Za-z0-9_]*)/g;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(body))) {
        const key = match[1] ?? match[2];
        if (key && !declared.has(key)) {
          undocumented.push(`${def.toolName} reads args.${key}`);
        }
      }
    }

    expect(
      undocumented,
      `Undocumented arguments — declare them or stop reading them:\n  ${undocumented.join('\n  ')}`
    ).toEqual([]);
  });

  it('records the verification note the schema now advertises', async () => {
    // `verifyAchievement` has always taken an optional note; nothing passed one,
    // and the schema advertised a `verificationStatus` the handler never read.
    const tool = listMcpTools().find((t) => t.name === 'brandops_verify_achievement')!;
    const properties = Object.keys(tool.inputSchema.properties);
    expect(properties).toContain('verificationNote');
    expect(properties).not.toContain('verificationStatus');
  });

  it('states a one-of argument rule instead of implying none', () => {
    // Three tools accept either of two ids. Their schemas said `required: []`,
    // which tells a client it may call with nothing — and the handler refused.
    for (const name of [
      'brandops_convert_to_plan',
      'brandops_get_relationship_context',
      'brandops_convert_opportunity_to_plan'
    ]) {
      const tool = listMcpTools().find((t) => t.name === name)!;
      expect(tool.inputSchema.anyOf, name).toBeDefined();
      expect(tool.inputSchema.anyOf!.length, name).toBeGreaterThan(1);
      for (const branch of tool.inputSchema.anyOf!) {
        // Every alternative names a property the tool actually documents.
        for (const key of branch.required) {
          expect(Object.keys(tool.inputSchema.properties), `${name}.${key}`).toContain(key);
        }
      }
    }
  });
});
