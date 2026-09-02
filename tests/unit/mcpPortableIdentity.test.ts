/**
 * The three reads that make professional identity portable across models:
 * voice, relationship context, and an artifact by id.
 *
 * Each is exercised on its **success** branch against a workspace that actually
 * holds the data, and each result is validated against the `outputSchema` its
 * tool publishes. That combination is deliberate: the seed workspace has no
 * twin, no contacts and no artifacts, so a fixture-driven sweep would only ever
 * reach the "not found" branch — which is exactly how two earlier schema
 * mistakes survived until a test finally supplied real data.
 */
import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import { createAgentSession } from '../../src/services/interop/sessions';
import { executeAgentToolCall } from '../../src/services/interop/gateway';
import { outputSchemaForTool } from '../../src/services/interop/mcp/server';
import { validateAgainstSchema, toWireValue } from '../../src/services/interop/mcp/outputSchema';
import { withDefaults } from '../../src/services/storage/storage';
import { AGENT_CAPABILITY_REGISTRY } from '../../src/services/interop/capabilityRegistry';
import type { AgentCapabilityId } from '../../src/types/agentInterop';
import type { BrandOpsData } from '../../src/types/domain';

const NEW_READS: AgentCapabilityId[] = ['voice.read', 'relationship.read', 'artifact.read'];

/** A workspace that actually holds a twin, a contact with history, and an artifact. */
function populated(): BrandOpsData {
  const base = cloneSeedData();
  const now = new Date().toISOString();
  return withDefaults({
    ...base,
    digitalTwins: {
      activeTwinId: 'twin-voice',
      twins: [
        {
          id: 'twin-voice',
          ownerUserId: 'local-user',
          workspaceId: 'local-workspace',
          displayName: 'Test Twin',
          sourceType: 'resume',
          identity: {
            headline: 'AI infrastructure founder',
            summary: 'Builds agent systems.',
            professionalPositioning: 'AI workforce infrastructure',
            targetAudience: 'Technical founders',
            toneOfVoice: 'Direct, technical, no hype',
            strengths: ['agent runtimes'],
            goals: ['Build technical authority']
          },
          resumeProfile: {
            contactInfo: { name: 'Test User' },
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
            voiceExamples: ['We shipped the runtime. Here is what broke and why.'],
            approvedClaims: ['Built a durable multi-agent execution runtime.'],
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
        id: 'contact-sarah',
        name: 'Sarah Chen',
        fullName: 'Sarah Chen',
        company: 'Northwind',
        role: 'Principal',
        title: 'Principal Engineer',
        source: 'conference',
        relationshipStage: 'building',
        status: 'active',
        nextAction: 'Send the architecture notes you promised',
        followUpDate: now,
        notes: 'Private working notes that should not be shipped wholesale.',
        links: [],
        relatedOutreachDraftIds: [],
        relatedContentTags: [],
        lastContactAt: now
      }
    ],
    notes: [
      {
        id: 'note-1',
        entityType: 'contact',
        entityId: 'contact-sarah',
        title: 'MCP architecture chat',
        detail: 'Discussed agent infrastructure and the gateway design.',
        nextAction: 'Send architecture notes',
        createdAt: now
      }
    ],
    integrationHub: {
      ...base.integrationHub,
      artifacts: [
        {
          // `withDefaults` silently drops an artifact missing any of id,
          // sourceId, title, artifactType, summary, createdAt or updatedAt —
          // so the fixture has to satisfy the normalizer, not just the type.
          id: 'artifact-brief',
          sourceId: 'integration-test',
          title: 'Market entry brief',
          summary: 'Analysis of the agent infrastructure market.',
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

async function grantedSession(workspace: BrandOpsData) {
  const created = await createAgentSession(workspace, {
    clientKind: 'claude-code',
    clientName: 'Claude Code',
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    grantedBundles: ['PUBLIC_IDENTITY', 'WRITING_VOICE'],
    grantedCapabilities: NEW_READS
  });
  return created;
}

/** Drives a tool and asserts the result matches the schema that tool advertises. */
async function callAndValidate(
  workspace: BrandOpsData,
  token: string,
  toolName: string,
  args: Record<string, unknown>
) {
  const { result } = await executeAgentToolCall({
    workspace,
    token,
    call: { toolName, args }
  });
  const schema = outputSchemaForTool(toolName)!;
  const verdict = validateAgainstSchema(toWireValue(result), schema);
  expect(verdict.errors, `${toolName}: ${verdict.errors.join('; ')}`).toEqual([]);
  return result;
}

describe('portable identity reads', () => {
  it('every one is registered, read-only, and tool-mapped', () => {
    for (const id of NEW_READS) {
      const def = AGENT_CAPABILITY_REGISTRY[id];
      expect(def, id).toBeDefined();
      expect(def.toolName, id).toBeTruthy();
      // READ tier and read-only, so a read-only session may hold them and no
      // intent contract is demanded — these observe, they never write.
      expect(def.tier, id).toBe('READ');
      expect(def.readOnly, id).toBe(true);
      expect(def.access, id).toBe('auto');
    }
  });

  it('returns the voice profile from the Twin, marked as the user’s own writing', async () => {
    const created = await grantedSession(populated());
    const result = await callAndValidate(created.workspace, created.token, 'brandops_get_voice', {
      channel: 'linkedin'
    });
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.toneOfVoice).toBe('Direct, technical, no hype');
    expect(data.voiceExamples).toEqual(['We shipped the runtime. Here is what broke and why.']);
    // Voice examples are the user's own words, so USER_VERIFIED is honest here —
    // and it is stamped by BrandOps, never asserted by the caller.
    expect(data.trustTier).toBe('USER_VERIFIED');
    // The channel is echoed, and the response says plainly that it changed nothing.
    expect((data.limitations as string[]).join(' ')).toContain('linkedin');
  });

  it('says so rather than inventing a voice when there is no Twin', async () => {
    const created = await grantedSession(cloneSeedData());
    const result = await callAndValidate(
      created.workspace,
      created.token,
      'brandops_get_voice',
      {}
    );
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('twin_not_found');
  });

  it('returns the working state of a relationship, not the private notes', async () => {
    const created = await grantedSession(populated());
    const result = await callAndValidate(
      created.workspace,
      created.token,
      'brandops_get_relationship_context',
      { name: 'sarah' }
    );
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.name).toBe('Sarah Chen');
    expect(data.outstanding).toBe('Send the architecture notes you promised');
    expect((data.recentInteractions as unknown[]).length).toBe(1);
    // The contact's free-form notes field is deliberately not in the payload.
    expect(JSON.stringify(data)).not.toContain('Private working notes');
    expect((data.limitations as string[]).join(' ')).toContain('not returned in full');
  });

  it('refuses a contact it cannot find instead of guessing at the nearest one', async () => {
    const created = await grantedSession(populated());
    const result = await callAndValidate(
      created.workspace,
      created.token,
      'brandops_get_relationship_context',
      { name: 'nobody-by-that-name' }
    );
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('contact_not_found');
  });

  it('reads one artifact by the id search returns', async () => {
    const created = await grantedSession(populated());
    const found = await executeAgentToolCall({
      workspace: created.workspace,
      token: created.token,
      call: { toolName: 'brandops_get_artifact', args: { artifactId: 'artifact-brief' } }
    });
    expect(found.result.ok).toBe(true);
    const artifact = (found.result.data as { artifact: Record<string, unknown> }).artifact;
    expect(artifact.id).toBe('artifact-brief');
    expect(artifact.provenanceRef).toBeTruthy();

    const missing = await callAndValidate(
      created.workspace,
      created.token,
      'brandops_get_artifact',
      { artifactId: 'no-such-artifact' }
    );
    expect(missing.ok).toBe(false);
    expect(missing.errorCode).toBe('artifact_not_found');
  });

  it('a session granted only these reads cannot reach anything else', async () => {
    const created = await grantedSession(populated());
    const blocked = await executeAgentToolCall({
      workspace: created.workspace,
      token: created.token,
      call: {
        toolName: 'brandops_record_achievement',
        args: { kind: 'x', title: 'y', detail: 'z' }
      }
    });
    expect(blocked.result.ok).toBe(false);
    expect(blocked.result.errorCode).toBe('capability_not_granted');
  });
});
