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
import { applyDeltas, type CurrentTwinState } from './twinDeltaEngine';

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
  return {
    ...workspace,
    builderActivity: {
      ...activity,
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

  return {
    ...workspace,
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
