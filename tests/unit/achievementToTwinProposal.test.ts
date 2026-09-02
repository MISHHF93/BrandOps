/**
 * A verified achievement now reaches the Twin — as a proposal, not a change.
 *
 * The delta engine had three quarters of a vertical connected at one end.
 * `applyTwinProposalAcceptance` applied a proposal's deltas and was wired into
 * the approval path; `calculateDeltas` and `createTwinUpdateProposal` were the
 * functions that would produce one, and **neither had a caller**. So the
 * acceptance handler waited for proposals nothing in the product could create,
 * and verifying an achievement marked the event `USER_VERIFIED` and taught the
 * Twin nothing.
 *
 * Verification is now the trigger, and the boundary is the point: what it
 * creates is a **proposal**. The Twin is untouched until the operator accepts it
 * through the existing approval path, which binds the approval to the content
 * they saw. The directive forbids promoting a claim into verified Twin state
 * without a person — proposing is not promoting, and these tests hold that line.
 */
import { describe, expect, it } from 'vitest';
import {
  applyAchievementVerification,
  applyTwinProposalAcceptance
} from '../../src/services/builder/promotions';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import { withDefaults } from '../../src/services/storage/storage';
import type { BrandOpsData } from '../../src/types/domain';

const EVENT_ID = 'event-verified-1';
const TITLE = 'Shipped the interoperability gateway';

/**
 * A workspace with a Twin **and** one achievement candidate awaiting review.
 *
 * The Twin matters: the demo fixture has none, so a first version of this file
 * verified an achievement against an empty `digitalTwins` and got no proposal —
 * the code declining correctly while the test read it as a failure.
 */
function pending(overrides: { title?: string } = {}): BrandOpsData {
  const base = withDefaults(populatedWorkspace());
  const title = overrides.title ?? TITLE;
  const activity: NonNullable<BrandOpsData['builderActivity']> = {
    ...(base.builderActivity ?? {}),
    // Required on `BuilderActivityState`; spreading an absent activity leaves it
    // `undefined`, which the cast used to hide.
    workspaceId: base.builderActivity?.workspaceId ?? 'local-workspace',
    events: [
      {
        id: EVENT_ID,
        workspaceId: 'local-workspace',
        source: 'user-action',
        sourceId: 'src-1',
        // A real `ActivityEventKind`. The fixture said 'milestone', which is in
        // neither union — invisible until the fixture was typed.
        kind: 'feature-built',
        title,
        detail: 'Delivered and reviewed.',
        confidence: 0.9,
        trustTier: 'AGENT_REPORTED',
        verificationStatus: 'UNVERIFIED',
        entityRefs: [],
        evidence: [],
        recordedBy: 'test',
        recordedReason: 'fixture',
        // Required, and missing until the cast came off.
        timestamp: '2026-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ],
    achievements: [
      {
        id: 'achievement-1',
        workspaceId: 'local-workspace',
        eventId: EVENT_ID,
        title,
        description: 'Delivered and reviewed.',
        kind: 'feature-shipped',
        sourceEvents: [EVENT_ID],
        confidence: 0.9,
        professionalRelevance: [],
        verificationRequired: true,
        evidence: [],
        // `AchievementCandidate` has `reason` and `detectedAt`, not `createdAt`
        // — fields the cast had let this fixture invent.
        reason: 'Detected from a completed feature.',
        detectedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ],
    twinProposals: [],
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
  // Typed at construction rather than cast at the end, so a change to the
  // activity shape fails here instead of drifting silently.
  return { ...base, builderActivity: activity };
}

const proposalsIn = (workspace: BrandOpsData) => workspace.builderActivity?.twinProposals ?? [];
const activeTwin = (workspace: BrandOpsData) =>
  workspace.digitalTwins?.twins.find((t) => t.id === workspace.digitalTwins?.activeTwinId) ??
  workspace.digitalTwins?.twins[0];

describe('verifying an achievement', () => {
  it('proposes a Twin update where it previously proposed nothing', () => {
    const after = applyAchievementVerification(pending(), EVENT_ID);

    // Was zero: the acceptance handler had no way to ever receive one.
    expect(proposalsIn(after), 'no proposal created').toHaveLength(1);
    expect(proposalsIn(after)[0].sourceId).toBe(EVENT_ID);
    expect(proposalsIn(after)[0].deltas.length).toBeGreaterThan(0);
  });

  it('does not touch the Twin itself', () => {
    const before = pending();
    const after = applyAchievementVerification(before, EVENT_ID);

    /**
     * The whole safety argument. Verification proposes; only acceptance
     * changes the Twin, and acceptance goes through the approval path.
     */
    expect(activeTwin(after)?.resumeProfile.achievements).toEqual(
      activeTwin(before)?.resumeProfile.achievements
    );
  });

  it('still marks the event verified, as it always did', () => {
    const after = applyAchievementVerification(pending(), EVENT_ID);
    const event = (after.builderActivity?.events ?? []).find((e) => e.id === EVENT_ID);

    // The counter-case for adding the proposal: the original behaviour has to
    // survive alongside it.
    expect(event?.verificationStatus).toBe('USER_VERIFIED');
    expect(after.builderActivity?.achievementsVerifiedAt).toContain(EVENT_ID);
  });

  it('says where the proposal came from', () => {
    const proposal = proposalsIn(applyAchievementVerification(pending(), EVENT_ID))[0];
    // A proposal in an approval queue with no provenance is a thing the reader
    // cannot evaluate.
    expect(proposal.source).toBe('achievement-verification');
    expect(proposal.reason).toContain(TITLE);
  });
});

describe('what it declines to propose', () => {
  it('proposes nothing when the Twin already records the achievement', () => {
    const base = pending();
    const twin = activeTwin(base);
    const workspace = {
      ...base,
      digitalTwins: {
        ...base.digitalTwins,
        twins: (base.digitalTwins?.twins ?? []).map((entry) =>
          entry.id === twin?.id
            ? {
                ...entry,
                resumeProfile: {
                  ...entry.resumeProfile,
                  achievements: [...entry.resumeProfile.achievements, TITLE]
                }
              }
            : entry
        )
      }
    } as BrandOpsData;

    // A proposal that changes nothing is noise in the scarcest surface in the
    // product.
    expect(proposalsIn(applyAchievementVerification(workspace, EVENT_ID))).toHaveLength(0);
  });

  it('proposes once, not once per call', () => {
    const first = applyAchievementVerification(pending(), EVENT_ID);
    const second = applyAchievementVerification(first, EVENT_ID);
    // Verification is idempotent; so is the proposal it triggers.
    expect(proposalsIn(second)).toHaveLength(1);
  });

  it('proposes nothing when there is no Twin to update', () => {
    const workspace = { ...pending(), digitalTwins: { activeTwinId: null, twins: [] } } as never;
    expect(() => applyAchievementVerification(workspace, EVENT_ID)).not.toThrow();
    expect(proposalsIn(applyAchievementVerification(workspace, EVENT_ID))).toHaveLength(0);
  });
});

describe('the vertical, end to end', () => {
  it('reaches the Twin only after the proposal is accepted', () => {
    const verified = applyAchievementVerification(pending(), EVENT_ID);
    const proposal = proposalsIn(verified)[0];
    expect(proposal, 'nothing to accept').toBeDefined();

    const accepted = applyTwinProposalAcceptance(verified, proposal.id);

    /**
     * The step that was unreachable before this cycle: a proposal existing at
     * all is what makes the acceptance handler do anything.
     */
    expect(activeTwin(accepted)?.resumeProfile.achievements).toContain(TITLE);
  });
});
