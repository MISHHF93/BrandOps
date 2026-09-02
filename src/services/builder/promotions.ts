/**
 * The two promotions an external agent may request but never perform.
 *
 * Verifying an achievement turns an `AGENT_REPORTED` signal into professional
 * evidence. Accepting a Twin proposal writes the Digital Twin. Both are the
 * moment a claim becomes a fact about the user, which the directive's fourth
 * invariant reserves for a person: *external AI may propose, never promote.*
 *
 * Both used to live inside the MCP handlers and run on `access: 'auto'` — an
 * agent could verify the achievement it had just reported. They now execute only
 * from `decideAgentProposal`, after a user approves the request.
 *
 * They live here rather than in `interop/proposals.ts` on purpose. The promotion
 * *effect* is builder-domain logic and it already existed in
 * `achievementService` and `twinDeltaEngine`; a copy inside the proposal module
 * would be a second implementation of a governed write, which is the failure
 * mode this codebase keeps producing.
 */
import type { BrandOpsData, DigitalTwin } from '../../types/domain';
import { verifyAchievement } from './achievementService';
import type { TwinUpdateProposal } from '../../types/builder';
import {
  addVersionToHistory,
  applyDeltas,
  calculateDeltas,
  createInitialVersionHistory,
  createTwinUpdateProposal,
  type CurrentTwinState
} from './twinDeltaEngine';

/** Projects a stored Twin into the shape `applyDeltas` expects. */
function twinState(twin: DigitalTwin): CurrentTwinState {
  return {
    id: twin.id,
    workspaceId: twin.workspaceId,
    headline: twin.identity.headline,
    summary: twin.identity.summary,
    professionalPositioning: twin.identity.professionalPositioning,
    targetAudience: twin.identity.targetAudience,
    toneOfVoice: twin.identity.toneOfVoice,
    expertiseAreas: twin.identity.strengths,
    skills: twin.resumeProfile.skills,
    achievements: twin.resumeProfile.achievements,
    goals: twin.identity.goals,
    createdAt: twin.createdAt,
    updatedAt: twin.updatedAt
  };
}

/**
 * Marks the event verified and retires the candidate.
 *
 * A no-op when the candidate or event has since disappeared — an approval that
 * arrives after its subject is gone must not invent one.
 */
export function applyAchievementVerification(
  workspace: BrandOpsData,
  eventId: string
): BrandOpsData {
  const activity = workspace.builderActivity;
  if (!activity) return workspace;
  const candidate = (activity.achievements ?? []).find(
    (entry) => entry.eventId === eventId || entry.id === eventId
  );
  const event = (activity.events ?? []).find((entry) => entry.id === candidate?.eventId);
  if (!candidate || !event) return workspace;

  const result = verifyAchievement(candidate, event);
  const nowIso = new Date().toISOString();

  /**
   * A verified achievement now reaches the Twin, as a proposal.
   *
   * Verification marked the event `USER_VERIFIED` and stopped there, so the
   * Twin never learned anything from it. The delta engine was built for exactly
   * this hand-off — `calculateDeltas` and `createTwinUpdateProposal` — and
   * neither had a caller, while `applyTwinProposalAcceptance` waited for
   * proposals **nothing could create**. Three quarters of a vertical, connected
   * at one end.
   *
   * What is created is a proposal, not a change. The Twin is untouched until the
   * operator accepts it through the existing approval path, which binds the
   * approval to the content they saw. That boundary is the reason this is safe
   * to wire automatically: the directive forbids promoting a claim into verified
   * Twin state without a person, and proposing is not promoting.
   */
  const proposal = proposeTwinUpdateFromAchievement(workspace, result.achievement.title, event.id);

  return {
    ...workspace,
    builderActivity: {
      ...activity,
      twinProposals: proposal
        ? [proposal, ...(activity.twinProposals ?? [])]
        : (activity.twinProposals ?? []),
      events: (activity.events ?? []).map((entry) =>
        entry.id === event.id
          ? {
              ...entry,
              verificationStatus: 'USER_VERIFIED' as const,
              trustTier: 'USER_VERIFIED' as const,
              verifiedAt: result.achievement.verifiedAt
            }
          : entry
      ),
      achievements: (activity.achievements ?? []).filter((entry) => entry.id !== candidate.id),
      achievementsVerifiedAt: [...(activity.achievementsVerifiedAt ?? []), event.id],
      updatedAt: nowIso
    }
  };
}

/**
 * Turn one newly verified achievement into a Twin update proposal, or nothing.
 *
 * Returns `undefined` rather than proposing when there is no active Twin, when
 * the achievement is already recorded on it, or when the engine finds no delta
 * worth proposing. A proposal that changes nothing is noise in an approval
 * queue, and the queue is the scarcest surface in the product.
 */
function proposeTwinUpdateFromAchievement(
  workspace: BrandOpsData,
  achievementTitle: string,
  eventId: string
): TwinUpdateProposal | undefined {
  const twinId = workspace.digitalTwins?.activeTwinId ?? workspace.digitalTwins?.twins[0]?.id;
  const twin = workspace.digitalTwins?.twins.find((entry) => entry.id === twinId);
  const title = achievementTitle.trim();
  if (!twin || !title) return undefined;

  /**
   * Two guards were here and both were unreachable, which mutation testing is
   * what proved: removing either left every test green.
   *
   * An "already recorded" check is redundant because `calculateDeltas` returns
   * no deltas when nothing changed — the engine's own job. And an "already
   * proposed for this event" check cannot fire, because verification removes the
   * achievement candidate, so a second call returns before reaching here.
   *
   * Defensive code that cannot run is worse than none: it reads as a considered
   * safeguard and is one more thing to keep true.
   */
  const current = twinState(twin);
  const { deltas } = calculateDeltas({
    currentTwin: current,
    newVerifiedInfo: { achievements: [...current.achievements, title] },
    source: 'achievement-verification',
    sourceId: eventId
  });
  if (!deltas.length) return undefined;

  return createTwinUpdateProposal({
    deltas,
    reason: `Verified achievement: ${title.slice(0, 200)}`,
    source: 'achievement-verification',
    sourceId: eventId
  }).proposal;
}

/** Applies an accepted Twin proposal's deltas to the active Twin and retires it. */
export function applyTwinProposalAcceptance(
  workspace: BrandOpsData,
  proposalId: string
): BrandOpsData {
  const activity = workspace.builderActivity;
  const proposal = (activity?.twinProposals ?? []).find((entry) => entry.id === proposalId);
  const twinId = workspace.digitalTwins?.activeTwinId ?? workspace.digitalTwins?.twins[0]?.id;
  const twin = workspace.digitalTwins?.twins.find((entry) => entry.id === twinId);
  if (!activity || !proposal || !twin) return workspace;

  const result = applyDeltas({
    currentTwin: twinState(twin),
    deltas: proposal.deltas,
    acceptedDeltaIds: proposal.deltas.map((delta) => delta.id),
    rejectedDeltaIds: [],
    editedDeltas: new Map()
  });

  /**
   * Record what changed, which the engine has always computed.
   *
   * `applyDeltas` returns a `version` — the snapshot before, the snapshot after,
   * the deltas applied, who applied them and when — and this function used
   * `updatedTwin` and threw the rest away. So the Twin changed and nothing said
   * it had. For a product whose subject is verified identity, an unrecorded
   * edit is the one kind it cannot afford.
   *
   * Seeded from the state *before* this change, so the first entry is where the
   * Twin was rather than where it ended up.
   */
  const before = twinState(twin);
  const history =
    workspace.twinVersionHistory ??
    createInitialVersionHistory(twin.id, before.workspaceId, before);

  return {
    ...workspace,
    twinVersionHistory: addVersionToHistory(history, result.version),
    digitalTwins: {
      activeTwinId: workspace.digitalTwins?.activeTwinId ?? null,
      twins: (workspace.digitalTwins?.twins ?? []).map((entry) =>
        entry.id === twin.id
          ? {
              ...entry,
              identity: {
                ...entry.identity,
                headline: result.updatedTwin.headline,
                summary: result.updatedTwin.summary,
                professionalPositioning: result.updatedTwin.professionalPositioning,
                targetAudience: result.updatedTwin.targetAudience,
                toneOfVoice: result.updatedTwin.toneOfVoice,
                strengths: result.updatedTwin.expertiseAreas,
                goals: result.updatedTwin.goals
              },
              resumeProfile: {
                ...entry.resumeProfile,
                skills: result.updatedTwin.skills,
                achievements: result.updatedTwin.achievements
              },
              updatedAt: result.updatedTwin.updatedAt
            }
          : entry
      )
    },
    builderActivity: {
      ...activity,
      twinProposals: (activity.twinProposals ?? []).filter((entry) => entry.id !== proposalId),
      updatedAt: new Date().toISOString()
    }
  };
}
