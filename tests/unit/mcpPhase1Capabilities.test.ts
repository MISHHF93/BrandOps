import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import { createAgentSession } from '../../src/services/interop/sessions';
import { executeAgentToolCall } from '../../src/services/interop/gateway';
import { listMcpTools } from '../../src/services/interop/mcp/server';
import {
  AGENT_CAPABILITY_REGISTRY,
  capabilityIsSensitive,
  isReadCapability,
  toolNameToCapabilityId
} from '../../src/services/interop/capabilityRegistry';
import { parseIntentContract } from '../../src/services/interop/intentContract';
import { searchWorkspaceEvidence } from '../../src/services/interop/evidenceSearch';
import { buildAuthorityGraph } from '../../src/services/builder/authorityGraph';
import { AGENT_CAPABILITY_IDS } from '../../src/types/agentInterop';
import type { AgentCapabilityId } from '../../src/types/agentInterop';
import type { BrandOpsData } from '../../src/types/domain';

const PHASE_1_CAPABILITIES: AgentCapabilityId[] = [
  'evidence.read',
  'authority.read',
  'next-best-actions.read',
  'receipts.read',
  'outcome.report'
];

/** Workspace carrying evidence a claim can actually be checked against. */
function workspaceWithEvidence(): BrandOpsData {
  const base = cloneSeedData();
  const now = new Date().toISOString();
  return {
    ...base,
    builderActivity: {
      ...(base.builderActivity ?? { events: [], workspaceId: 'local-workspace' }),
      workspaceId: 'local-workspace',
      events: base.builderActivity?.events ?? [],
      achievements: [
        {
          id: 'ach-runtime',
          workspaceId: 'local-workspace',
          eventId: 'evt-runtime',
          title: 'Shipped the agent runtime',
          description: 'Durable multi-agent execution with checkpoints and receipts.',
          evidence: [
            { ref: 'git:acme/brandops@abc123', kind: 'git', label: 'runtime commit' },
            {
              ref: 'release:v1.2.0',
              kind: 'release',
              label: 'runtime release',
              verificationUrl: 'https://example.invalid/releases/v1.2.0'
            }
          ],
          sourceEvents: ['evt-runtime'],
          confidence: 0.9,
          professionalRelevance: ['agent runtime', 'infrastructure'],
          verificationRequired: true,
          kind: 'feature_completed',
          reason: 'Detected a completed runtime feature.',
          detectedAt: now,
          updatedAt: now
        },
        {
          id: 'ach-dismissed',
          workspaceId: 'local-workspace',
          eventId: 'evt-dismissed',
          title: 'Dismissed runtime note',
          description: 'Should never surface as evidence.',
          evidence: [],
          sourceEvents: [],
          confidence: 0.2,
          professionalRelevance: ['agent runtime'],
          verificationRequired: true,
          kind: 'feature_completed',
          reason: 'Noise.',
          detectedAt: now,
          updatedAt: now,
          dismissed: true
        }
      ],
      projects: [
        {
          id: 'proj-brandops',
          workspaceId: 'local-workspace',
          name: 'BrandOps',
          summary: 'Agent runtime and professional intelligence control plane.',
          achievementIds: ['ach-runtime'],
          artifactIds: [],
          goalIds: [],
          planIds: [],
          outcomeIds: [],
          projectStatus: 'active',
          recentMilestones: [],
          professionalValue: 0.8,
          missingDocumentation: [],
          contentPotential: 0.7,
          tags: ['agent runtime'],
          externalRefs: [
            {
              kind: 'repository',
              ref: 'https://example.invalid/acme',
              label: 'repo',
              authorized: true
            }
          ],
          createdAt: now,
          updatedAt: now
        }
      ]
    },
    planWorkspace: {
      ...(base.planWorkspace ?? { plans: [], receipts: [] }),
      plans: base.planWorkspace?.plans ?? [],
      receipts: [
        {
          id: 'receipt-1',
          planId: 'plan-1',
          convertedFrom: 'ask-1',
          planType: 'positioning-plan',
          sourceMessageId: 'msg-1',
          generatedSteps: ['Draft the write-up', 'Review'],
          userAction: 'save-plan',
          timestamp: now,
          summary: 'Saved the launch plan after preview.'
        }
      ]
    }
  } as BrandOpsData;
}

async function sessionFor(
  workspace: BrandOpsData,
  grantedCapabilities: AgentCapabilityId[]
): Promise<{ workspace: BrandOpsData; token: string }> {
  const created = await createAgentSession(workspace, {
    clientKind: 'claude-code',
    clientName: 'Claude Code',
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    grantedBundles: [],
    grantedCapabilities
  });
  return { workspace: created.workspace, token: created.token };
}

describe('MCP phase 1: capability surface', () => {
  it('every new capability is registered, tool-mapped, and reachable by tool name', () => {
    for (const id of PHASE_1_CAPABILITIES) {
      const def = AGENT_CAPABILITY_REGISTRY[id];
      expect(def).toBeTruthy();
      expect(def.toolName).toBeTruthy();
      expect(toolNameToCapabilityId(def.toolName as string)).toBe(id);
      expect(AGENT_CAPABILITY_IDS).toContain(id);
    }
  });

  it('the four new read capabilities are grantable to read-only sessions; the reporter is not', () => {
    expect(isReadCapability('evidence.read')).toBe(true);
    expect(isReadCapability('authority.read')).toBe(true);
    expect(isReadCapability('next-best-actions.read')).toBe(true);
    expect(isReadCapability('receipts.read')).toBe(true);
    expect(isReadCapability('outcome.report')).toBe(false);
  });

  it('tools/list advertises the intent contract, required only for consequential tiers', () => {
    const tools = listMcpTools();
    const requestAction = tools.find((tool) => tool.name === 'brandops_request_action');
    expect(requestAction?.inputSchema.required).toContain('intent');

    const revoke = tools.find((tool) => tool.name === 'brandops_revoke_session');
    expect(revoke?.inputSchema.required).toContain('intent');

    const reportOutcome = tools.find((tool) => tool.name === 'brandops_report_outcome');
    expect(reportOutcome?.inputSchema.properties.intent).toBeTruthy();
    expect(reportOutcome?.inputSchema.required).not.toContain('intent');

    const evidence = tools.find((tool) => tool.name === 'brandops_search_evidence');
    expect(evidence?.inputSchema.properties.intent).toBeUndefined();
  });
});

describe('MCP phase 1: evidence search', () => {
  it('returns provenance-carrying hits and never counts agent-reported evidence as verified', async () => {
    const base = workspaceWithEvidence();
    const { workspace, token } = await sessionFor(base, ['evidence.read']);
    const { result } = await executeAgentToolCall({
      workspace,
      token,
      call: { capabilityId: 'evidence.read', args: { claim: 'agent runtime' } }
    });

    expect(result.ok).toBe(true);
    const hits = result.data.hits as Array<Record<string, unknown>>;
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      expect(hit.provenanceRef).toBeTruthy();
      expect(hit.trustTier).toBeTruthy();
      expect(hit.trustLabel).toBeTruthy();
    }
    // The unverified achievement is reported as agent-reported, not as fact.
    const achievementHit = hits.find((hit) => hit.id === 'ach-runtime');
    expect(achievementHit?.trustTier).toBe('AGENT_REPORTED');
    expect(result.data.agentReportedCount).toBeGreaterThan(0);
    // Limitations are always stated so a caller cannot mistake this for proof.
    expect((result.data.limitations as string[]).length).toBeGreaterThan(0);
  });

  it('excludes dismissed achievements', () => {
    const found = searchWorkspaceEvidence(workspaceWithEvidence(), 'agent runtime', 25);
    expect(found.hits.some((hit) => hit.id === 'ach-dismissed')).toBe(false);
  });

  it('reports an unsupported claim honestly instead of returning noise', () => {
    const found = searchWorkspaceEvidence(workspaceWithEvidence(), 'quantum cryptography', 10);
    expect(found.hits).toHaveLength(0);
    expect(found.limitations.join(' ')).toContain('unsupported');
  });

  it('requires a claim', async () => {
    const { workspace, token } = await sessionFor(workspaceWithEvidence(), ['evidence.read']);
    const { result } = await executeAgentToolCall({
      workspace,
      token,
      call: { capabilityId: 'evidence.read', args: {} }
    });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('invalid_args');
  });
});

describe('MCP phase 1: authority graph', () => {
  it('scores substantiation from owned evidence and always states its limitations', () => {
    const readout = buildAuthorityGraph(workspaceWithEvidence());
    expect(readout.limitations.length).toBeGreaterThan(0);
    expect(readout.limitations.join(' ')).toContain('not public reputation');
    expect(readout.generatedAt).toBeTruthy();
  });

  it('flags a claimed topic with no supporting evidence as a critical gap', () => {
    const base = workspaceWithEvidence();
    const twin = {
      id: 'twin-1',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      displayName: 'Test',
      sourceType: 'profile' as const,
      status: 'ready' as const,
      confidenceScore: 0.8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      identity: {
        headline: '',
        summary: '',
        professionalPositioning: '',
        targetAudience: '',
        goals: [],
        toneOfVoice: '',
        strengths: [],
        differentiators: []
      },
      resumeProfile: {
        contactInfo: {},
        experience: [],
        education: [],
        skills: ['underwater basket weaving'],
        certifications: [],
        projects: [],
        achievements: [],
        industries: [],
        tools: [],
        keywords: []
      },
      memory: {
        facts: [],
        preferences: [],
        voiceExamples: [],
        approvedClaims: [],
        rejectedClaims: [],
        missingInfo: []
      },
      actions: { suggested: [], completed: [] }
    } as unknown as BrandOpsData['digitalTwins']['twins'][number];

    const withTwin: BrandOpsData = {
      ...base,
      digitalTwins: { activeTwinId: 'twin-1', twins: [twin] }
    };
    const readout = buildAuthorityGraph(withTwin);
    const gap = readout.gaps.find((entry) => entry.topic === 'underwater basket weaving');
    expect(gap?.severity).toBe('critical');
    expect(gap?.recommendedActions.length).toBeGreaterThan(0);
  });

  it('is reachable over the gateway', async () => {
    const { workspace, token } = await sessionFor(workspaceWithEvidence(), ['authority.read']);
    const { result } = await executeAgentToolCall({
      workspace,
      token,
      call: { capabilityId: 'authority.read', args: {} }
    });
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data.topics)).toBe(true);
    expect(Array.isArray(result.data.gaps)).toBe(true);
  });
});

describe('MCP phase 1: next best actions and receipts', () => {
  it('returns ranked next best actions with the command that starts each one', async () => {
    const { workspace, token } = await sessionFor(workspaceWithEvidence(), [
      'next-best-actions.read'
    ]);
    const { result } = await executeAgentToolCall({
      workspace,
      token,
      call: { capabilityId: 'next-best-actions.read', args: { limit: 3 } }
    });
    expect(result.ok).toBe(true);
    const actions = result.data.actions as Array<Record<string, unknown>>;
    expect(actions.length).toBeLessThanOrEqual(3);
    for (const action of actions) {
      expect(action.title).toBeTruthy();
      expect(action.command).toBeTruthy();
    }
  });

  it('reads one receipt by id', async () => {
    const { workspace, token } = await sessionFor(workspaceWithEvidence(), ['receipts.read']);
    const { result } = await executeAgentToolCall({
      workspace,
      token,
      call: { capabilityId: 'receipts.read', args: { receiptId: 'receipt-1' } }
    });
    expect(result.ok).toBe(true);
    expect((result.data.receipt as { id: string }).id).toBe('receipt-1');
  });

  it('fails clearly when the receipt does not exist', async () => {
    const { workspace, token } = await sessionFor(workspaceWithEvidence(), ['receipts.read']);
    const { result } = await executeAgentToolCall({
      workspace,
      token,
      call: { capabilityId: 'receipts.read', args: { receiptId: 'nope' } }
    });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('receipt_not_found');
  });
});

describe('MCP phase 1: outcome reporting', () => {
  it('records an agent-reported outcome without promoting it to verified truth', async () => {
    const { workspace, token } = await sessionFor(workspaceWithEvidence(), ['outcome.report']);
    const res = await executeAgentToolCall({
      workspace,
      token,
      call: {
        capabilityId: 'outcome.report',
        args: {
          dimension: 'plan-success-rate',
          score: 0.8,
          planId: 'plan-1',
          evidence: ['Launch email sent; 3 replies within a day.'],
          intent: {
            objective: 'Record how the launch plan performed.',
            reason: 'The plan completed and the user asked for follow-through.'
          }
        }
      }
    });
    expect(res.result.ok).toBe(true);
    expect(res.result.data.trustTier).toBe('AGENT_REPORTED');
    const recorded = (res.workspace.builderActivity?.outcomeScores ?? [])[0];
    expect(recorded?.dimension).toBe('plan-success-rate');
    expect(recorded?.notedBy).toContain('agent:claude-code:');
  });

  it('rejects an unknown dimension and an out-of-range score', async () => {
    const { workspace, token } = await sessionFor(workspaceWithEvidence(), ['outcome.report']);
    const badDimension = await executeAgentToolCall({
      workspace,
      token,
      call: { capabilityId: 'outcome.report', args: { dimension: 'vibes', score: 0.5 } }
    });
    expect(badDimension.result.ok).toBe(false);
    expect(badDimension.result.errorCode).toBe('invalid_args');

    const badScore = await executeAgentToolCall({
      workspace,
      token,
      call: {
        capabilityId: 'outcome.report',
        args: { dimension: 'plan-success-rate', score: 42 }
      }
    });
    expect(badScore.result.ok).toBe(false);
    expect(badScore.result.errorCode).toBe('invalid_args');
  });
});

describe('MCP phase 1: User Intent Contract', () => {
  it('blocks an external action that declares no intent, and audits the block', async () => {
    const { workspace, token } = await sessionFor(workspaceWithEvidence(), ['action.request']);
    const res = await executeAgentToolCall({
      workspace,
      token,
      call: {
        capabilityId: 'action.request',
        args: { action: 'publish', target: 'linkedin', summary: 'Post it.' }
      }
    });
    expect(res.result.ok).toBe(false);
    expect(res.result.errorCode).toBe('intent_contract_required');
    // Nothing was proposed, and the rejection is on the record.
    expect((res.workspace.agentProposals?.entries ?? []).length).toBe(0);
    const audit = res.workspace.externalAgentAudit?.entries ?? [];
    expect(audit[0]?.ok).toBe(false);
  });

  it('carries the declared intent onto the approval surface', async () => {
    const { workspace, token } = await sessionFor(workspaceWithEvidence(), ['action.request']);
    const res = await executeAgentToolCall({
      workspace,
      token,
      call: {
        capabilityId: 'action.request',
        args: {
          action: 'publish',
          target: 'linkedin',
          summary: 'Post the runtime write-up.',
          intent: {
            objective: 'Announce the agent runtime.',
            reason: 'The user asked for an announcement once the runtime shipped.',
            constraints: ['No pricing claims']
          }
        }
      }
    });
    expect(res.result.ok).toBe(true);
    const proposal = (res.workspace.agentProposals?.entries ?? [])[0];
    expect(proposal?.rationale).toContain('Announce the agent runtime');
    expect(proposal?.rationale).toContain('No pricing claims');
  });

  it('rejects an expired contract', () => {
    const verdict = parseIntentContract({
      args: {
        intent: {
          objective: 'Send it',
          reason: 'Because',
          expiresAt: '2020-01-01T00:00:00.000Z'
        }
      },
      capabilityId: 'action.request',
      tier: 'EXTERNAL_ACTION'
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.errorCode).toBe('intent_contract_expired');
  });

  it('synthesizes and labels a contract for mutations that do not declare one', () => {
    const verdict = parseIntentContract({
      args: {},
      capabilityId: 'outcome.report',
      tier: 'GENERATE',
      purpose: 'Close the loop on the launch plan.'
    });
    expect(verdict.ok).toBe(true);
    expect(verdict.contract?.origin).toBe('synthesized');
    expect(verdict.contract?.objective).toBe('Close the loop on the launch plan.');
  });

  it('read capabilities carry no contract obligation', async () => {
    const { workspace, token } = await sessionFor(workspaceWithEvidence(), ['receipts.read']);
    const { result } = await executeAgentToolCall({
      workspace,
      token,
      call: { capabilityId: 'receipts.read', args: {} }
    });
    expect(result.ok).toBe(true);
  });
});

describe('MCP phase 1: sensitive tier', () => {
  it('session revocation is classified sensitive and demands explicit confirmation', async () => {
    expect(capabilityIsSensitive('builder.sessions.revoke')).toBe(true);

    const { workspace, token } = await sessionFor(workspaceWithEvidence(), [
      'builder.sessions.revoke'
    ]);
    const targetId = (workspace.externalAgentSessions?.entries ?? [])[0]?.id;
    const res = await executeAgentToolCall({
      workspace,
      token,
      call: {
        capabilityId: 'builder.sessions.revoke',
        args: {
          sessionId: targetId,
          intent: {
            objective: 'Revoke the stale Codex session.',
            reason: 'The user reported the laptop was lost.'
          }
        }
      }
    });
    expect(res.result.ok).toBe(false);
    expect(res.result.errorCode).toBe('confirmation_required');
    // The session is untouched: an irreversible action never ran.
    expect(
      (res.workspace.externalAgentSessions?.entries ?? []).find((s) => s.id === targetId)?.status
    ).toBe('active');
  });
});
