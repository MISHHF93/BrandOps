/**
 * The last proposal kind that bound to a reference instead of content.
 *
 * Cycle 9 bound plan-execution approvals to the plan the user saw. Enumerating
 * the proposal kinds — rather than probing whichever came to mind — showed which
 * others were exposed:
 *
 *   twin_update         payload on the proposal    bound by construction
 *   artifact            payload on the proposal    bound by construction
 *   content_opportunity payload on the proposal    bound by construction
 *   external_action     payload on the proposal    bound by construction
 *   promotion           **a targetId**             not bound
 *
 * One kind, and it is the kind that writes `USER_VERIFIED` state.
 *
 * The probe: a proposal reading *"Verify achievement: Fixed a typo in the
 * README"* was approved, and *"Led the company-wide platform rewrite"* became
 * verified professional evidence. That is worse than the plan case in a way
 * worth naming — the output is a claim about a real person's career at the
 * highest trust tier in the system, and the record would say the user verified
 * something they never read.
 */
import { describe, expect, it } from 'vitest';
import {
  checkApprovalBinding,
  promotionApprovalBinding
} from '../../src/services/interop/approvalBinding';
import { createAgentProposal, decideAgentProposal } from '../../src/services/interop/proposals';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';

const NOW = new Date().toISOString();

function workspaceWith(title: string, description: string): BrandOpsData {
  const base = withDefaults(populatedWorkspace());
  return {
    ...base,
    builderActivity: {
      ...base.builderActivity,
      workspaceId: 'local-workspace',
      events: [
        {
          id: 'activity-evt-1',
          workspaceId: 'local-workspace',
          source: 'agent-reported',
          sourceId: 'src-1',
          kind: 'feature-built',
          title,
          detail: description,
          timestamp: NOW,
          confidence: 0.7,
          verificationStatus: 'UNVERIFIED',
          trustTier: 'AGENT_REPORTED',
          entityRefs: [],
          evidence: [],
          fingerprint: 'fp-1',
          relatedAchievements: [],
          recordedBy: 'agent:claude-code',
          createdAt: NOW,
          updatedAt: NOW
        }
      ],
      achievements: [
        {
          id: 'ach-1',
          workspaceId: 'local-workspace',
          eventId: 'activity-evt-1',
          title,
          description,
          evidence: [],
          sourceEvents: ['activity-evt-1'],
          confidence: 0.7,
          professionalRelevance: [],
          verificationRequired: true,
          kind: 'shipped-feature',
          reason: 'The detector believes this is worth remembering.',
          createdAt: NOW,
          updatedAt: NOW
        }
      ]
    }
  } as unknown as BrandOpsData;
}

const PROMOTION = { action: 'verify-achievement' as const, targetId: 'activity-evt-1' };

function pendingPromotion(workspace: BrandOpsData): { workspace: BrandOpsData; id: string } {
  const next = createAgentProposal(workspace, {
    kind: 'promotion',
    title: 'Verify achievement: Fixed a typo in the README',
    detail: 'Promote this agent-reported activity into verified professional evidence.',
    rationale: 'The agent believes this is achievement-worthy.',
    sessionId: 'session-1',
    proposedState: {
      promotion: PROMOTION,
      approvalBinding: promotionApprovalBinding(workspace, PROMOTION)
    }
  });
  return { workspace: next, id: (next.agentProposals?.entries ?? [])[0].id };
}

function verifiedTitles(workspace: BrandOpsData): string[] {
  return (workspace.builderActivity?.events ?? [])
    .filter((event) => event.verificationStatus === 'USER_VERIFIED')
    .map((event) => event.title);
}

describe('promotionApprovalBinding', () => {
  it('changes when the achievement is retitled', () => {
    const before = promotionApprovalBinding(
      workspaceWith('Fixed a typo in the README', 'A one-character change.'),
      PROMOTION
    );
    const after = promotionApprovalBinding(
      workspaceWith('Led the company-wide platform rewrite', 'A one-character change.'),
      PROMOTION
    );
    expect(after?.fingerprint).not.toBe(before?.fingerprint);
  });

  it('changes when only the description changes', () => {
    const before = promotionApprovalBinding(workspaceWith('Same title', 'A typo fix.'), PROMOTION);
    const after = promotionApprovalBinding(
      workspaceWith('Same title', 'Sole architect of the platform.'),
      PROMOTION
    );
    // The title is what the user reads first; the description is what becomes
    // evidence. Either changing changes what is verified.
    expect(after?.fingerprint).not.toBe(before?.fingerprint);
  });

  it('returns undefined when the target cannot be read', () => {
    const empty = withDefaults(populatedWorkspace());
    // Not a neutral value. A binding that cannot be computed must not become a
    // binding that always matches.
    expect(promotionApprovalBinding(empty, PROMOTION)).toBeUndefined();
  });
});

describe('checkApprovalBinding for a promotion', () => {
  it('refuses when the target vanished', () => {
    const check = checkApprovalBinding({ fingerprint: 'a', stepCount: 1 }, undefined, 'promotion');
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('no longer exists');
  });

  it('names promotion, not plans, in the message', () => {
    const check = checkApprovalBinding(
      { fingerprint: 'a', stepCount: 1 },
      { fingerprint: 'b', stepCount: 1 },
      'promotion'
    );
    // A user verifying an achievement should not be told a plan changed.
    expect(check.reason).toContain('nothing was promoted');
    expect(check.reason).not.toContain('plan');
  });

  it('still speaks about plans for a plan', () => {
    const check = checkApprovalBinding(
      { fingerprint: 'a', stepCount: 2 },
      { fingerprint: 'b', stepCount: 4 },
      'plan'
    );
    expect(check.reason).toContain('You approved 2 steps; it now has 4');
  });
});

describe('the decision path refuses a promotion whose subject changed', () => {
  it('promotes nothing and supersedes the proposal', () => {
    const { workspace: pending, id } = pendingPromotion(
      workspaceWith('Fixed a typo in the README', 'A one-character change.')
    );

    // The achievement is rewritten while the proposal sits pending.
    const tampered: BrandOpsData = {
      ...pending,
      builderActivity: {
        ...pending.builderActivity!,
        events: (pending.builderActivity?.events ?? []).map((event) => ({
          ...event,
          title: 'Led the company-wide platform rewrite',
          detail: 'Sole architect.'
        })),
        achievements: (pending.builderActivity?.achievements ?? []).map((entry) => ({
          ...entry,
          title: 'Led the company-wide platform rewrite',
          description: 'Sole architect.'
        }))
      }
    };

    const after = decideAgentProposal(tampered, { proposalId: id, decision: 'approved' });

    expect(verifiedTitles(after)).toEqual([]);
    const proposal = (after.agentProposals?.entries ?? []).find((entry) => entry.id === id);
    expect(proposal?.status).toBe('superseded');
    expect(proposal?.decisionNote).toContain('nothing was promoted');
    expect((after.checkpoints?.entries ?? [])[0]?.state).toBe('BLOCKED');
  });

  it('promotes normally when the achievement is untouched', () => {
    const { workspace: pending, id } = pendingPromotion(
      workspaceWith('Shipped the durable execution runtime', 'Real work, unchanged.')
    );
    const after = decideAgentProposal(pending, { proposalId: id, decision: 'approved' });

    // A binding that blocked legitimate promotions would be worse than none.
    const proposal = (after.agentProposals?.entries ?? []).find((entry) => entry.id === id);
    expect(proposal?.status).toBe('approved');
    expect(verifiedTitles(after)).toContain('Shipped the durable execution runtime');
  });

  it('refuses when the achievement was deleted after approval was requested', () => {
    const { workspace: pending, id } = pendingPromotion(
      workspaceWith('Shipped the runtime', 'Real work.')
    );
    const emptied: BrandOpsData = {
      ...pending,
      builderActivity: { ...pending.builderActivity!, events: [], achievements: [] }
    };
    const after = decideAgentProposal(emptied, { proposalId: id, decision: 'approved' });
    const proposal = (after.agentProposals?.entries ?? []).find((entry) => entry.id === id);
    expect(proposal?.status).toBe('superseded');
    expect(verifiedTitles(after)).toEqual([]);
  });
});
