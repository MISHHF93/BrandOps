/**
 * A summarised work session can reach the Twin, one confirmation at a time.
 *
 * `summarizeWorkForBrandOps` returns a `proposedEvent` and a
 * `proposedAchievement`, both documented as *"not saved until user confirms"* —
 * and **nothing saved them**. They were computed, handed back to the agent, and
 * lost. There was no confirm step because there was nothing to confirm.
 *
 * That was the missing first link in a chain whose other three links were wired
 * over the preceding cycles:
 *
 * ```
 *   session summary  ->  stored candidate  ->  verification  ->  Twin proposal
 *                                                            ->  accepted, version recorded
 * ```
 *
 * Each link is a person's decision, and none of them is skippable. Storing a
 * candidate is not promoting a claim: the event keeps `UNVERIFIED` /
 * `AGENT_REPORTED` standing until the operator verifies it, and the Twin does
 * not move until the operator accepts the proposal that verification produces.
 *
 * This test drives the whole chain rather than each link, because every previous
 * cycle found the same failure — a link wired at one end, with nothing reporting
 * that the road did not meet.
 */
import { describe, expect, it } from 'vitest';
import { runBuilderHandler } from '../../src/services/interop/mcp/builderToolHandlers';
import {
  applyAchievementVerification,
  applyTwinProposalAcceptance
} from '../../src/services/builder/promotions';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';

const WORK = 'Shipped the MCP gateway conformance suite';

const session = {
  id: 'agent-session-1',
  clientKind: 'claude-code' as const,
  clientName: 'Claude Code',
  ownerUserId: 'local-user',
  workspaceId: 'local-workspace'
};

/** Ask the tool to summarise a session, the way an agent would. */
function summarise(workspace: BrandOpsData) {
  // Positional, and the real exported name — `handleBuilderTool` does not exist.
  return runBuilderHandler(
    workspace,
    session as never,
    'builder.activity.ingest-session-summary' as never,
    {
      sessionId: 'dev-session-1',
      workDescription: WORK,
      problemsSolved: ['Notification handling', 'Session revocation'],
      technologiesUsed: ['TypeScript', 'MCP'],
      filesChanged: ['src/services/interop/mcp/server.ts']
    }
  ) as {
    workspace: BrandOpsData;
    ok: boolean;
    data: { eventId?: string; achievementId?: string; deduplicated?: boolean };
  };
}

const eventsIn = (w: BrandOpsData) => w.builderActivity?.events ?? [];
const candidatesIn = (w: BrandOpsData) => w.builderActivity?.achievements ?? [];
const activeTwin = (w: BrandOpsData) =>
  w.digitalTwins?.twins.find((t) => t.id === w.digitalTwins?.activeTwinId) ??
  w.digitalTwins?.twins[0];

describe('summarising a session', () => {
  it('stores the event it proposes', () => {
    const before = withDefaults(populatedWorkspace());
    const after = summarise(before);

    // Was computed and discarded.
    expect(after.ok).toBe(true);
    expect(after.data.eventId, 'no event id returned').toBeDefined();
    expect(eventsIn(after.workspace).some((e) => e.id === after.data.eventId)).toBe(true);
  });

  it('stores it as something still to be verified', () => {
    const stored = summarise(withDefaults(populatedWorkspace()));
    const event = eventsIn(stored.workspace).find((e) => e.id === stored.data.eventId);

    /**
     * The safety property. A candidate an agent proposed is not a fact, and the
     * directive is explicit that an external AI may propose but not promote.
     */
    expect(event?.verificationStatus).toBe('UNVERIFIED');
    expect(event?.trustTier).toBe('AGENT_REPORTED');
  });

  it('stores the achievement candidate against that event', () => {
    const stored = summarise(withDefaults(populatedWorkspace()));
    const candidate = candidatesIn(stored.workspace).find((c) => c.eventId === stored.data.eventId);

    // The join is what lets verification later find it.
    expect(candidate, 'no candidate stored').toBeDefined();
    expect(candidate?.verificationRequired).toBe(true);
    expect(candidate?.title.length ?? 0).toBeGreaterThan(0);
  });

  it('does not store the same session twice', () => {
    const first = summarise(withDefaults(populatedWorkspace()));
    const second = summarise(first.workspace);

    /**
     * `ingestActivityEvent` fingerprints and de-duplicates, which is the reason
     * to go through it rather than pushing onto the array. Summarising a session
     * twice is an ordinary thing for an agent to do.
     */
    expect(second.data.deduplicated).toBe(true);
    expect(
      candidatesIn(second.workspace).filter((c) => c.eventId === second.data.eventId)
    ).toHaveLength(1);
  });
});

describe('the chain, end to end', () => {
  it('carries a summarised session all the way to a recorded Twin version', () => {
    const stored = summarise(withDefaults(populatedWorkspace()));
    const eventId = stored.data.eventId as string;

    // Link 2: the operator verifies the candidate.
    const verified = applyAchievementVerification(stored.workspace, eventId);
    const proposal = (verified.builderActivity?.twinProposals ?? [])[0];
    expect(proposal, 'verification produced no Twin proposal').toBeDefined();

    // The Twin has still not moved.
    expect(activeTwin(verified)?.resumeProfile.achievements).toEqual(
      activeTwin(stored.workspace)?.resumeProfile.achievements
    );

    // Link 3: the operator accepts it.
    const accepted = applyTwinProposalAcceptance(verified, proposal.id);

    expect(activeTwin(accepted)?.resumeProfile.achievements).toContain(WORK);
    expect(accepted.twinVersionHistory?.versions.length ?? 0).toBeGreaterThan(0);
  });

  it('goes nowhere on its own', () => {
    const stored = summarise(withDefaults(populatedWorkspace()));

    /**
     * The counter-case for the whole cycle, and the one that matters most. An
     * agent summarising a session must not be able to move the Twin by doing so
     * — every step between here and there is a person's decision.
     */
    expect(activeTwin(stored.workspace)?.resumeProfile.achievements).not.toContain(WORK);
    expect(stored.workspace.twinVersionHistory).toBeUndefined();
    expect(stored.workspace.builderActivity?.twinProposals ?? []).toHaveLength(0);
  });
});
