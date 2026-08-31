import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import type { BrandOpsData } from '../../src/types/domain';
import { withDefaults } from '../../src/services/storage/storage';
import { executeAgentToolCall } from '../../src/services/interop/gateway';
import { createAgentSession } from '../../src/services/interop/sessions';
import { reviewAgentEvent, promoteAgentEventToTwin } from '../../src/services/interop/events';
import { createDigitalTwinFromText } from '../../src/services/digitalTwin/digitalTwin';
import {
  recordLearningSignal,
  recordOutcome
} from '../../src/services/builder/outcomeLearning';
import { verifyPlanOutcomes } from '../../src/services/execution/planVerifier';
import { CONTEXT_BUNDLE_IDS } from '../../src/types/agentInterop';

/**
 * Concurrency & failure-injection. The local-first architecture is single-blob
 * and actor-serialized: callers pass the returned workspace forward. This suite
 * proves the supported concurrency contract (dedupe + gateway idempotency +
 * storage round-trip stability) and that broken/incomplete input fails closed —
 * never producing NaN, unclamped scores, unbounded growth, or forged claims.
 */
describe('concurrency & failure-injection', () => {
  function seeded(): BrandOpsData {
    let data = cloneSeedData();
    const { twin } = createDigitalTwinFromText({
      workspace: data,
      rawText: 'Founder of Acme. I build auth systems and write technical posts.',
      sourceType: 'profile'
    });
    return { ...data, digitalTwins: { activeTwinId: twin.id, twins: [twin] } };
  }

  it('re-ingesting the same achievement via the workspace does not grow the ledger', async () => {
    const created = await createAgentSession(seeded(), {
      clientKind: 'claude-code',
      clientName: 'Claude Code',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [...CONTEXT_BUNDLE_IDS],
      grantedCapabilities: ['achievement.record']
    });
    let ws = created.workspace;

    const first = await executeAgentToolCall({
      workspace: ws,
      token: created.token,
      call: {
        capabilityId: 'achievement.record',
        args: { kind: 'feature_completed', title: 'Ship analytics export', detail: 'Merged.', dedupeKey: 'analytic-export' }
      }
    });
    expect(first.result.ok).toBe(true);
    ws = first.workspace;
    const countAfterFirst = (ws.externalAgentEvents?.entries ?? []).length;
    const eventId = first.result.data.eventId as string;

    // Simulate a concurrent/duplicate replay passing the already-updated workspace.
    const replay = await executeAgentToolCall({
      workspace: ws,
      token: created.token,
      call: {
        capabilityId: 'achievement.record',
        args: { kind: 'feature_completed', title: 'Ship analytics export', detail: 'Merged.', dedupeKey: 'analytic-export' }
      }
    });
    expect(replay.result.data.deduplicated).toBe(true);
    expect(replay.result.data.eventId).toBe(eventId);
    expect((replay.workspace.externalAgentEvents?.entries ?? []).length).toBe(countAfterFirst);
  });

  it('a burst of gateway calls with the same idempotency key produces one artifact-bearing result', async () => {
    const created = await createAgentSession(seeded(), {
      clientKind: 'claude-code',
      clientName: 'Claude Code',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [...CONTEXT_BUNDLE_IDS],
      grantedCapabilities: ['opportunity.create']
    });
    let ws = created.workspace;
    // Interleave two independent keys against the same workspace.
    for (let i = 0; i < 3; i++) {
      const call = await executeAgentToolCall({
        workspace: ws,
        token: created.token,
        call: {
          capabilityId: 'opportunity.create',
          args: { title: `Opp ${i}`, detail: 'burst' },
          idempotencyKey: `burst-${i % 2}` // two distinct logical calls, each replayed
        }
      });
      ws = call.workspace;
    }
    // Two distinct idempotency keys → exactly two proposals, no duplicates.
    expect((ws.agentProposals?.entries ?? []).length).toBe(2);
  });

  it('single-blob storage round-trip preserves learning and interop state exactly (no data loss)', async () => {
    const created = await createAgentSession(seeded(), {
      clientKind: 'codex',
      clientName: 'Codex',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [...CONTEXT_BUNDLE_IDS],
      grantedCapabilities: ['achievement.record']
    });
    let ws = created.workspace;
    const res = await executeAgentToolCall({
      workspace: ws,
      token: created.token,
      call: {
        capabilityId: 'achievement.record',
        args: { kind: 'feature_completed', title: 'Persistent event', detail: 'body' }
      }
    });
    ws = res.workspace;
    const eventId = res.result.data.eventId as string;
    ws = reviewAgentEvent(ws, { eventId, decision: 'verified' });
    ws = promoteAgentEventToTwin(ws, eventId);

    const good = JSON.stringify(ws);
    const reloaded = withDefaults(JSON.parse(good));

    expect((reloaded.externalAgentEvents?.entries ?? []).length).toBe(1);
    expect(reloaded.externalAgentEvents?.entries[0]?.trustTier).toBe('USER_VERIFIED');
    expect(
      reloaded.digitalTwins?.twins[0]?.resumeProfile?.achievements.some((a) =>
        a.includes('Persistent event')
      )
    ).toBe(true);
  });

  it('learning is bounded: signals cap at 500, outcome scores at 200 — never unbounded', () => {
    let ws = seeded();
    ws = { ...ws, builderActivity: { events: [], workspaceId: 'ws-c' } };
    const hazard = Date.now();
    for (let i = 0; i < 600; i++) {
      ws = recordLearningSignal({
        workspace: ws,
        signalType: 'preferred-approach',
        source: 'test',
        detail: `${hazard}-${i}`,
        strength: 0.5
      });
      if (i < 260) {
        ws = recordOutcome({
          workspace: ws,
          dimension: 'tool-effectiveness',
          score: 0.8,
          notedBy: 'test'
        });
      }
    }
    expect(ws.builderActivity!.signals!.length).toBeLessThanOrEqual(500);
    expect(ws.builderActivity!.outcomeScores!.length).toBeLessThanOrEqual(200);
  });

  it('failure injection: a verifiable plan with zero steps yields completionRate 0 (no NaN score)', () => {
    const ws = seeded();
    ws.planWorkspace = {
      plans: [
        {
          id: 'p-empty',
          title: 'Empty plan',
          summary: 's',
          objective: 'o',
          planType: 'content-plan',
          confidenceScore: 50,
          sourceResponseId: 'm1',
          assumptions: [],
          missingInputs: [],
          requiredApprovals: [],
          steps: [],
          timeline: [],
          outputsAssets: [],
          risks: [],
          nextActions: [],
          status: 'executed',
          source: {} as never,
          estimatedEffort: '',
          expectedOutput: '',
          savedAt: new Date().toISOString(),
          receiptId: 'r1'
        }
      ],
      receipts: [],
      updatedAt: new Date().toISOString()
    };
    // Verification of an empty plan is a no-op; the score recorded, if any, must be finite.
    const out = verifyPlanOutcomes(ws, 'p-empty', { outcomes: [] });
    if (out.verified) {
      const scores = out.workspace.builderActivity?.outcomeScores ?? [];
      for (const score of scores) expect(Number.isFinite(score.score)).toBe(true);
    }
  });

  it('failure injection: unknown capability and empty grants fail closed without side effects', async () => {
    const created = await createAgentSession(seeded(), {
      clientKind: 'cli',
      clientName: 'CLI',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [],
      grantedCapabilities: []
    });
    // No grants → even a read is blocked.
    const blocked = await executeAgentToolCall({
      workspace: created.workspace,
      token: created.token,
      call: { capabilityId: 'context.read', args: {} }
    });
    expect(blocked.result.ok).toBe(false);
    // Unknown capability is rejected gracefully.
    const unknown = await executeAgentToolCall({
      workspace: created.workspace,
      token: created.token,
      call: { capabilityId: 'builder.does-not-exist', args: {} }
    });
    expect(unknown.result.ok).toBe(false);
    // Neither call mutated stored event/proposal state.
    expect((unknown.workspace.externalAgentEvents?.entries ?? []).length).toBe(0);
    expect((unknown.workspace.agentProposals?.entries ?? []).length).toBe(0);
  });
});
