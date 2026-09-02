import { describe, expect, it } from 'vitest';
import type { BrandOpsData } from '../../src/types/domain';
import { withDefaults } from '../../src/services/storage/storage';
import { executePlan } from '../../src/services/execution/planExecutor';
import { convertAskResponseToPlan } from '../../src/services/plan/askPlanConversion';
import { savePlanDraftToWorkspace } from '../../src/services/plan/askPlanConversion';
import type { PlanStep } from '../../src/types/domain';

// ---------------------------------------------------------------------------
// P0 Security: Cross-workspace isolation, approval bypass, idempotency
// ---------------------------------------------------------------------------

/** Create a minimal workspace with correct TwinIdentity shape for testing */
function makeWorkspace(overrides: Partial<BrandOpsData> = {}): BrandOpsData {
  return withDefaults({
    id: 'ws-test',
    digitalTwins: {
      activeTwinId: 'twin-1',
      twins: [
        {
          id: 'twin-1',
          identity: {
            headline: 'Test User',
            summary: 'Test summary',
            professionalPositioning: 'Founder',
            targetAudience: 'General',
            goals: [],
            toneOfVoice: 'Professional',
            strengths: [],
            differentiators: []
          },
          resumeProfile: {
            contactInfo: { name: 'Test User' },
            achievements: []
          },
          memory: { approvedClaims: [] }
        }
      ]
    },
    settings: {
      notificationCenter: { roleContext: 'founder' },
      aiOperatorMode: 'balanced'
    },
    ...overrides
  });
}

const makePlanStep = (overrides: Partial<PlanStep> = {}): PlanStep => ({
  id: 'step-1',
  title: 'Review document',
  description: 'Read the document',
  owner: 'user',
  requiredInput: '',
  approvalRequired: false,
  status: 'todo',
  ...overrides
});

describe('P0 Security — Isolation & Authorization', () => {
  it('cross-workspace isolation: workspace data is structurally isolated', () => {
    const wsA = makeWorkspace({
      id: 'ws-A',
      digitalTwins: {
        activeTwinId: 'twin-A',
        twins: [
          {
            id: 'twin-A',
            identity: {
              headline: 'Alice',
              summary: 'Founder at Acme',
              professionalPositioning: 'Founder',
              targetAudience: 'Investors',
              goals: ['build'],
              toneOfVoice: 'Confident',
              strengths: ['engineering'],
              differentiators: ['speed']
            },
            resumeProfile: {
              contactInfo: { name: 'Alice' },
              achievements: ['Alice secret achievement']
            },
            memory: { approvedClaims: ['Alice proprietary claim'] }
          }
        ]
      }
    });

    const wsB = makeWorkspace({
      id: 'ws-B',
      digitalTwins: {
        activeTwinId: 'twin-B',
        twins: [
          {
            id: 'twin-B',
            identity: {
              headline: 'Bob',
              summary: 'Independent consultant',
              professionalPositioning: 'Consultant',
              targetAudience: 'Startups',
              goals: ['consult'],
              toneOfVoice: 'Calm',
              strengths: ['strategy'],
              differentiators: ['depth']
            },
            resumeProfile: {
              contactInfo: { name: 'Bob' },
              achievements: []
            },
            memory: { approvedClaims: [] }
          }
        ]
      }
    });

    // Verify wsA has data wsB should not see
    const twinA = wsA.digitalTwins?.twins[0];
    expect(twinA).toBeDefined();
    expect(twinA?.identity?.headline).toBe('Alice');
    expect(twinA?.resumeProfile?.contactInfo?.name).toBe('Alice');
    expect(twinA?.resumeProfile?.achievements).toContain('Alice secret achievement');
    expect(twinA?.memory?.approvedClaims).toContain('Alice proprietary claim');

    // Verify wsB has its own data — no trace of Alice
    const twinB = wsB.digitalTwins?.twins[0];
    expect(twinB).toBeDefined();
    expect(twinB?.identity?.headline).toBe('Bob');
    expect(twinB?.resumeProfile?.contactInfo?.name).toBe('Bob');
    expect(twinB?.resumeProfile?.achievements).not.toContain('Alice secret achievement');
    expect(twinB?.memory?.approvedClaims).not.toContain('Alice proprietary claim');

    // The workspace boundary is structural: each workspace is a separate
    // BrandOpsData object with its own digitalTwins. No shared global state
    // crosses workspace boundaries in the local-first architecture.
    //
    // `expect(wsB.id).not.toBe(wsA.id)` used to stand here. It compared a field
    // this test had just assigned two different values to — a tautology reading
    // as an isolation check, and one TypeScript could not even see, since
    // `BrandOpsData` has no `id` (it survives only because `withDefaults`
    // preserves unknown keys). Isolation is worth asserting properly: writing
    // through one workspace must not be observable through the other.
    expect(wsB.digitalTwins?.activeTwinId).not.toBe(wsA.digitalTwins?.activeTwinId);
    expect(wsB.digitalTwins).not.toBe(wsA.digitalTwins);
    expect(wsB.digitalTwins?.twins).not.toBe(wsA.digitalTwins?.twins);
    wsA.digitalTwins?.twins.push({ ...wsA.digitalTwins.twins[0], id: 'twin-injected' });
    expect(wsB.digitalTwins?.twins.some((t) => t.id === 'twin-injected')).toBe(false);
  });

  it('approval bypass: plan in draft status cannot be executed', () => {
    const ws = makeWorkspace();

    const draft = convertAskResponseToPlan({
      conversationId: 'conv-1',
      messageId: 'msg-1',
      responseText: 'Test plan',
      userIntent: 'Test',
      planPreset: 'content-plan',
      sourceSurface: 'ask',
      workspaceContext: ws
    });

    expect(draft.ok).toBe(true);
    if (!draft.ok) return;

    const saved = savePlanDraftToWorkspace({
      workspace: ws,
      draft: draft.draft,
      userAction: 'save-plan',
      convertedFromLabel: 'test'
    });

    const plan = saved.workspace.planWorkspace?.plans[0];
    expect(plan).toBeDefined();
    expect(plan!.status).toBe('draft');

    const result = executePlan(saved.workspace, plan!.id);
    expect(result.executed).toBe(false);
    expect(result.summary).toContain('not approved for execution');
  });

  it('approval bypass: plan with rejected status cannot be executed', () => {
    const ws = makeWorkspace();

    const draft = convertAskResponseToPlan({
      conversationId: 'conv-2',
      messageId: 'msg-2',
      responseText: 'Test plan 2',
      userIntent: 'Test',
      planPreset: 'content-plan',
      sourceSurface: 'ask',
      workspaceContext: ws
    });

    expect(draft.ok).toBe(true);
    if (!draft.ok) return;

    const saved = savePlanDraftToWorkspace({
      workspace: ws,
      draft: draft.draft,
      userAction: 'save-plan',
      convertedFromLabel: 'test'
    });

    const plan = saved.workspace.planWorkspace?.plans[0];
    expect(plan).toBeDefined();

    const rejectedWs = {
      ...saved.workspace,
      planWorkspace: {
        ...saved.workspace.planWorkspace,
        plans: saved.workspace.planWorkspace?.plans.map((p) =>
          p.id === plan!.id ? { ...p, status: 'rejected' } : p
        )
      }
    };

    const result = executePlan(rejectedWs, plan!.id);
    expect(result.executed).toBe(false);
    expect(result.summary).toContain('not approved for execution');
  });

  it('idempotency: plan cannot be executed twice — second execution correctly rejected', () => {
    const ws = makeWorkspace();

    const draft = convertAskResponseToPlan({
      conversationId: 'conv-3',
      messageId: 'msg-3',
      responseText: 'Internal-only plan',
      userIntent: 'Test',
      planPreset: 'custom-plan',
      sourceSurface: 'ask',
      workspaceContext: ws
    });

    expect(draft.ok).toBe(true);
    if (!draft.ok) return;

    // Replace steps with internal-only step so execution succeeds
    const draftWithInternalSteps = {
      ...draft.draft,
      steps: [
        makePlanStep({
          id: 'step-safe-1',
          title: 'Review document',
          description: 'Read the document'
        })
      ]
    };

    const saved = savePlanDraftToWorkspace({
      workspace: ws,
      draft: draftWithInternalSteps,
      userAction: 'save-plan',
      convertedFromLabel: 'test'
    });

    const plan = saved.workspace.planWorkspace?.plans[0];

    const approvedWs = {
      ...saved.workspace,
      planWorkspace: {
        ...saved.workspace.planWorkspace,
        plans: saved.workspace.planWorkspace?.plans.map((p) =>
          p.id === plan!.id ? { ...p, status: 'approved' } : p
        )
      }
    };

    // First execution succeeds
    const firstRun = executePlan(approvedWs, plan!.id);
    expect(firstRun.executed).toBe(true);

    // After first execution, plan status is 'executed'. Second execution
    // is correctly rejected — this is the idempotency guarantee:
    // the state machine prevents duplicate execution.
    const secondRun = executePlan(firstRun.workspace, plan!.id);
    expect(secondRun.executed).toBe(false);
    expect(secondRun.summary).toContain('not approved for execution');

    // Count execution_started checkpoints — only one from first run
    const execStartedCheckpoints =
      secondRun.workspace.checkpoints?.entries.filter((c) => c.type === 'plan.execution_started')
        .length ?? 0;
    expect(execStartedCheckpoints).toBe(1);
  });
});
