/**
 * G14 — Resources.
 *
 * The point of these is not "another way to fetch things". Every governed read
 * already returns `brandops://` provenance references, and until now nothing
 * could resolve one: the citation was real, the library did not exist. These
 * tests assert the three things that makes true — the reference resolves, it
 * resolves through the same governed path a tool call takes, and it resolves
 * only for a caller that holds the capability.
 */
import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import { createAgentSession, resolveAgentSession } from '../../src/services/interop/sessions';
import { executeAgentToolCall } from '../../src/services/interop/gateway';
import { dispatchMcpMethod } from '../../src/services/interop/mcp/server';
import {
  classifyProvenanceRef,
  listResourceTemplates,
  listResources,
  resolveResourceUri,
  RESOURCE_TEMPLATES
} from '../../src/services/interop/mcp/resources';
import { AGENT_CAPABILITY_REGISTRY } from '../../src/services/interop/capabilityRegistry';
import { withDefaults } from '../../src/services/storage/storage';
import { CONTEXT_BUNDLE_IDS } from '../../src/types/agentInterop';
import type { AgentCapabilityId } from '../../src/types/agentInterop';
import type { BrandOpsData } from '../../src/types/domain';

const ALL_RESOURCE_CAPS: AgentCapabilityId[] = [
  'voice.read',
  'plans.read',
  'receipts.read',
  'relationship.read',
  'artifact.read'
];

function populated(): BrandOpsData {
  const base = cloneSeedData();
  const now = new Date().toISOString();
  return withDefaults({
    ...base,
    digitalTwins: {
      activeTwinId: 'twin-res',
      twins: [
        {
          id: 'twin-res',
          ownerUserId: 'local-user',
          workspaceId: 'local-workspace',
          displayName: 'T',
          sourceType: 'resume',
          identity: {
            headline: 'h',
            summary: 's',
            professionalPositioning: 'p',
            targetAudience: 'a',
            toneOfVoice: 'Direct, technical',
            strengths: [],
            goals: []
          },
          resumeProfile: {
            contactInfo: { name: 'T' },
            experience: [],
            education: [],
            skills: [],
            certifications: [],
            achievements: [],
            projects: [],
            summary: '',
            links: []
          },
          memory: {
            facts: [],
            preferences: [],
            voiceExamples: ['We shipped it.'],
            approvedClaims: ['Built a runtime.'],
            rejectedClaims: [],
            missingInfo: []
          },
          createdAt: now,
          updatedAt: now
        }
      ]
    },
    contacts: [
      {
        id: 'contact-1',
        name: 'Sarah Chen',
        fullName: 'Sarah Chen',
        company: 'Northwind',
        role: 'Principal',
        source: 'conf',
        relationshipStage: 'building',
        status: 'active',
        nextAction: 'Send notes',
        notes: 'private',
        links: [],
        relatedOutreachDraftIds: [],
        relatedContentTags: [],
        lastContactAt: now
      }
    ],
    integrationHub: {
      ...base.integrationHub,
      artifacts: [
        {
          id: 'artifact-1',
          sourceId: 'src',
          title: 'Brief',
          summary: 'A brief.',
          artifactType: 'report',
          tags: [],
          createdAt: now,
          updatedAt: now
        },
        ...base.integrationHub.artifacts
      ]
    }
  } as unknown as BrandOpsData);
}

async function session(workspace: BrandOpsData, granted: AgentCapabilityId[]) {
  return createAgentSession(workspace, {
    clientKind: 'claude-code',
    clientName: 'Claude Code',
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    grantedBundles: [],
    grantedCapabilities: granted
  });
}

/** The wiring both gateway hosts use, so the tests exercise the shipped path. */
function resourceHandlers(initial: BrandOpsData, token: string) {
  const state = { workspace: initial };
  return {
    state,
    handlers: {
      callTool: async () => {
        throw new Error('not used');
      },
      resources: {
        list: async () => {
          const s = await resolveAgentSession(state.workspace, token);
          return listResources(state.workspace, { grantedCapabilities: s?.grantedCapabilities });
        },
        templates: async () => {
          const s = await resolveAgentSession(state.workspace, token);
          return listResourceTemplates({ grantedCapabilities: s?.grantedCapabilities });
        },
        read: async (uri: string) => {
          const resolved = resolveResourceUri(uri);
          if (!resolved) return { ok: false, error: `Unknown resource URI: ${uri}` };
          const { workspace: next, result } = await executeAgentToolCall({
            workspace: state.workspace,
            token,
            call: { toolName: resolved.call.toolName, args: resolved.call.args }
          });
          state.workspace = next;
          return {
            ok: result.ok,
            mimeType: resolved.mimeType,
            data: result.data,
            errorCode: result.errorCode,
            error: result.error,
            capabilityId: resolved.capabilityId
          };
        }
      }
    }
  };
}

const rpc = (handlers: unknown, method: string, params: Record<string, unknown> = {}) =>
  dispatchMcpMethod({ method, params, handlers: handlers as never });

describe('G14 — resources resolve provenance', () => {
  it('every template maps to a capability that exists in the registry', () => {
    for (const template of RESOURCE_TEMPLATES) {
      const def = AGENT_CAPABILITY_REGISTRY[template.capabilityId];
      expect(def, template.uriTemplate).toBeDefined();
      // Resources are read-oriented by design; a template pointing at a write
      // would be a second, unaudited mutation path.
      expect(def.readOnly, template.uriTemplate).toBe(true);
    }
  });

  it('resolves the provenance reference a read actually handed out', async () => {
    const ws = populated();
    const created = await session(ws, ALL_RESOURCE_CAPS);
    const { handlers } = resourceHandlers(created.workspace, created.token);

    // The voice read returns `provenanceRef`. That exact string must resolve.
    const voice = await executeAgentToolCall({
      workspace: created.workspace,
      token: created.token,
      call: { toolName: 'brandops_get_voice', args: {} }
    });
    const ref = (voice.result.data as { provenanceRef: string }).provenanceRef;
    expect(ref).toBe('brandops://twin/twin-res/voice');

    const outcome = await rpc(handlers, 'resources/read', { uri: ref });
    const contents = (outcome.result as { contents: Array<{ uri: string; text: string }> })
      .contents;
    expect(contents).toHaveLength(1);
    expect(contents[0].uri).toBe(ref);
    expect(JSON.parse(contents[0].text).toneOfVoice).toBe('Direct, technical');
  });

  it('reads a contact and an artifact by their provenance shapes', async () => {
    const ws = populated();
    const created = await session(ws, ALL_RESOURCE_CAPS);
    const { handlers } = resourceHandlers(created.workspace, created.token);

    const contact = await rpc(handlers, 'resources/read', {
      uri: 'brandops://workspace/contact/contact-1'
    });
    expect(
      JSON.parse((contact.result as { contents: Array<{ text: string }> }).contents[0].text).name
    ).toBe('Sarah Chen');

    const artifact = await rpc(handlers, 'resources/read', {
      uri: 'brandops://workspace/artifact-1'
    });
    expect(
      JSON.parse((artifact.result as { contents: Array<{ text: string }> }).contents[0].text)
        .artifact.id
    ).toBe('artifact-1');
  });

  it('lists singletons only — never an enumeration of the workspace', async () => {
    const ws = populated();
    const created = await session(ws, ALL_RESOURCE_CAPS);
    const { handlers } = resourceHandlers(created.workspace, created.token);

    const listed = (await rpc(handlers, 'resources/list')).result as {
      resources: Array<{ uri: string }>;
    };
    // One voice profile. Not every artifact, contact, plan and receipt — that
    // would hand over the shape of the whole workspace in one call.
    expect(listed.resources.map((r) => r.uri)).toEqual(['brandops://twin/twin-res/voice']);

    const templates = (await rpc(handlers, 'resources/templates/list')).result as {
      resourceTemplates: Array<{ uriTemplate: string }>;
    };
    expect(templates.resourceTemplates.map((t) => t.uriTemplate)).toContain(
      'brandops://plan/{planId}'
    );
    // Templates describe the shape; they never carry an id or leak a capability id.
    expect(JSON.stringify(templates.resourceTemplates)).not.toContain('contact-1');
    expect(JSON.stringify(templates.resourceTemplates)).not.toContain('capabilityId');
  });

  it('scopes discovery to the capabilities the session actually holds', async () => {
    const ws = populated();
    const created = await session(ws, ['plans.read']);
    const { handlers } = resourceHandlers(created.workspace, created.token);

    const templates = (await rpc(handlers, 'resources/templates/list')).result as {
      resourceTemplates: Array<{ uriTemplate: string }>;
    };
    expect(templates.resourceTemplates.map((t) => t.uriTemplate)).toEqual([
      'brandops://plan/{planId}'
    ]);
    // The twin exists, but this session cannot read voice, so it is not offered one.
    const listed = (await rpc(handlers, 'resources/list')).result as { resources: unknown[] };
    expect(listed.resources).toEqual([]);
  });

  it('refuses a resource the session was not granted, naming the scope', async () => {
    const ws = populated();
    const created = await session(ws, ['plans.read']);
    const { handlers } = resourceHandlers(created.workspace, created.token);

    const outcome = await rpc(handlers, 'resources/read', {
      uri: 'brandops://workspace/contact/contact-1'
    });
    expect(outcome.result).toBeUndefined();
    // Authorization failure, not a missing resource — so the HTTP binding can
    // answer `insufficient_scope` with the exact capability to ask for.
    expect(outcome.insufficientScope).toEqual(['relationship.read']);
  });

  it('reports an unknown URI as -32602 with the uri, never an empty contents array', async () => {
    const ws = populated();
    const created = await session(ws, ALL_RESOURCE_CAPS);
    const { handlers } = resourceHandlers(created.workspace, created.token);

    for (const uri of [
      'brandops://nope/1',
      'file:///etc/passwd',
      'brandops://plan/../../secret',
      'brandops://workspace/contact/a/b',
      ''
    ]) {
      const outcome = await rpc(handlers, 'resources/read', { uri });
      expect(outcome.result, uri).toBeUndefined();
      expect(outcome.error?.code, uri).toBe(-32602);
      expect((outcome.error?.data as { uri: string }).uri, uri).toBe(uri);
    }
  });

  it('a missing entity is not found, not an empty success', async () => {
    const ws = populated();
    const created = await session(ws, ALL_RESOURCE_CAPS);
    const { handlers } = resourceHandlers(created.workspace, created.token);
    const outcome = await rpc(handlers, 'resources/read', {
      uri: 'brandops://receipt/no-such-receipt'
    });
    expect(outcome.result).toBeUndefined();
    expect(outcome.error?.code).toBe(-32602);
  });

  it('every resource read leaves an audit entry, exactly like a tool call', async () => {
    const ws = populated();
    const created = await session(ws, ALL_RESOURCE_CAPS);
    const wiring = resourceHandlers(created.workspace, created.token);
    await rpc(wiring.handlers, 'resources/read', { uri: 'brandops://twin/twin-res/voice' });
    const audit = wiring.state.workspace.externalAgentAudit?.entries ?? [];
    expect(audit.length).toBeGreaterThan(0);
    expect(audit[0].capabilityId).toBe('voice.read');
  });

  it('a host that does not wire resources neither advertises nor answers them', async () => {
    const bare = { callTool: async () => ({}) };
    const init = await rpc(bare, 'initialize', {});
    expect(
      (init.result as { capabilities: Record<string, unknown> }).capabilities.resources
    ).toBeUndefined();

    const read = await rpc(bare, 'resources/read', { uri: 'brandops://twin/x/voice' });
    expect(read.methodNotFound).toBe(true);
  });

  it('advertises the resources capability when the host wires it', async () => {
    const ws = populated();
    const created = await session(ws, ALL_RESOURCE_CAPS);
    const { handlers } = resourceHandlers(created.workspace, created.token);
    const init = await rpc(handlers, 'initialize', {});
    // Empty object: neither listChanged nor subscribe is supported, and the spec
    // says to omit what is not supported rather than imply it.
    expect(
      (init.result as { capabilities: { resources: unknown } }).capabilities.resources
    ).toEqual({});
  });

  /**
   * The invariant that keeps the surface honest.
   *
   * A scan of the live read surface found 39 distinct `brandops://` shapes and 3
   * that resolved. The other 36 are not a backlog — most point at a *fragment*
   * (one line of positioning, one DNA entry), and making each addressable would
   * be the "leak the whole workspace through broad resources" the directive
   * forbids, arrived at one template at a time. They are citations, not
   * addresses.
   *
   * What was wrong was that nothing said which was which. This test drives the
   * read surface and fails on any shape nobody has classified, so a new one
   * cannot appear unreviewed.
   */
  it('every provenance reference a read emits is a resource or a reviewed citation', async () => {
    const ws = populated();
    // Context bundles must be granted, or `context.read` returns nothing and the
    // scan silently covers three references instead of the whole read surface.
    const created = await createAgentSession(ws, {
      clientKind: 'claude-code',
      clientName: 'Claude Code',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [...CONTEXT_BUNDLE_IDS],
      grantedCapabilities: ALL_RESOURCE_CAPS.concat(['context.read', 'evidence.read'])
    });
    let current = created.workspace;

    const seen = new Set<string>();
    const collect = (value: unknown): void => {
      if (typeof value === 'string' && value.startsWith('brandops://')) seen.add(value);
      else if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === 'object') Object.values(value).forEach(collect);
    };

    for (const [toolName, args] of [
      ['brandops_get_relevant_context', {}],
      ['brandops_search_evidence', { claim: 'runtime' }],
      ['brandops_get_voice', {}],
      ['brandops_get_relationship_context', { contactId: 'contact-1' }],
      ['brandops_get_artifact', { artifactId: 'artifact-1' }]
    ] as Array<[string, Record<string, unknown>]>) {
      const { workspace: next, result } = await executeAgentToolCall({
        workspace: current,
        token: created.token,
        call: { toolName, args }
      });
      current = next;
      collect(result.data);
    }

    expect(seen.size).toBeGreaterThan(10);
    const unclassified = [...seen].filter((uri) => classifyProvenanceRef(uri) === 'unclassified');
    expect(
      unclassified,
      `Unclassified provenance references. Either add a resource template or record them in ` +
        `REFERENCE_ONLY_PROVENANCE_PREFIXES with a reason: ${unclassified.join(', ')}`
    ).toEqual([]);
  });

  it('classifies an address, a citation and an unknown differently', () => {
    expect(classifyProvenanceRef('brandops://workspace/artifact-1')).toBe('resource');
    expect(classifyProvenanceRef('brandops://workspace/dna/goals')).toBe('reference');
    expect(classifyProvenanceRef('brandops://something/new')).toBe('unclassified');
  });

  it('no provenance authority is doubled up', async () => {
    // `brandops://profession/profession/identity` shipped for a while: the
    // entity ids already began with `profession/` and the template prefixed it
    // again. A doubled segment is always a bug, never a namespace.
    const ws = populated();
    const created = await createAgentSession(ws, {
      clientKind: 'claude-code',
      clientName: 'Claude Code',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [...CONTEXT_BUNDLE_IDS],
      grantedCapabilities: ['context.read']
    });
    const { result } = await executeAgentToolCall({
      workspace: created.workspace,
      token: created.token,
      call: { toolName: 'brandops_get_relevant_context', args: {} }
    });
    const refs: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === 'string' && v.startsWith('brandops://')) refs.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(result.data);
    for (const ref of refs) {
      const segments = ref.replace('brandops://', '').split('/');
      const doubled = segments.find((seg, i) => i > 0 && seg === segments[i - 1]);
      expect(doubled, ref).toBeUndefined();
    }
  });
});
