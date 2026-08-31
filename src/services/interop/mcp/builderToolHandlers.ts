/**
 * Builder MCP tool handlers — dispatch cases for the 19 builder capability
 * ids, wired into the same `runHandler` / `executeAgentToolCall` path as the
 * existing agent capabilities.
 *
 * All mutations funnel through the canonical command/approval layer:
 * proposals.ts (proposals), events.ts (achievements), sessions.ts (revoke),
 * activityGraph.ts (ingest), achievementService.ts (verify/dismiss),
 * opportunityEngine.ts + planCompiler.ts (opportunities), twinDeltaEngine.ts
 * (twin proposals), and executionReceiptService.ts (receipts).
 */

import type { BrandOpsData, PlanDraft } from '../../../types/domain';
import type { AgentCapabilityId } from '../../../types/agentInterop';
import type { ExternalAgentSession } from '../../../types/agentInterop';
import type {
  Achievement,
  AchievementCandidate,
  ActivityEvent,
  ActivityEventSource,
  BuilderActivityState,
  OpportunityRecommendation,
  Project,
  TwinUpdateProposal
} from '../../../types/builder';
import { ingestActivityEvent } from '../../builder/activityGraph';
import { verifyAchievement, dismissAchievement } from '../../builder/achievementService';
import {
  deriveSignals,
  DEFAULT_SIGNAL_ENGINE_CONFIG
} from '../../builder/professionalSignalEngine';
import {
  applyDeltas,
  type CurrentTwinState
} from '../../builder/twinDeltaEngine';
import { computeOpportunityRadar } from '../../builder/opportunityRadar';
import { computeProjectIntelligence } from '../../builder/projectIntelligence';
import { compilePlanFromAchievement, compilePlanFromOpportunity, validatePlanInputs, PLAN_TEMPLATES, type ExtendedPlanPreset } from '../../builder/planCompiler';
import { getSkillPack } from '../../builder/skillPack';
import { createReceipt } from '../../builder/executionReceiptService';
import { summarizeWorkForBrandOps, type DevelopmentSessionEvidence, type SessionEvidenceItem } from '../../builder/sessionToBrand';
import { getFeatureRegistryState } from '../../builder/featureRegistry';
import { isBuilderCapabilityId } from '../../builder/mcpBuilderCapabilities';
import { savePlanDraftToWorkspace } from '../../plan/askPlanConversion';

// ---------------------------------------------------------------------------
// Builder state adapter — reads from workspace, writes back to workspace
// ---------------------------------------------------------------------------

const ACTIVITY_EVENT_SOURCES: readonly ActivityEventSource[] = [
  'user-action',
  'agent-reported',
  'integration-import',
  'skill-pack',
  'dev-hook',
  'session-to-brand',
  'manual'
];

function isActivityEventSource(value: string): value is ActivityEventSource {
  return ACTIVITY_EVENT_SOURCES.includes(value as ActivityEventSource);
}

function builderWorkspaceId(workspace: BrandOpsData): string {
  return workspace.builderActivity?.workspaceId ?? 'default-workspace';
}

function builderEvents(workspace: BrandOpsData): ActivityEvent[] {
  return workspace.builderActivity?.events ?? [];
}

function builderAchievements(workspace: BrandOpsData): AchievementCandidate[] {
  return workspace.builderActivity?.achievements ?? [];
}

function builderProjects(workspace: BrandOpsData): Project[] {
  return workspace.builderActivity?.projects ?? [];
}

function builderTwinProposals(workspace: BrandOpsData): TwinUpdateProposal[] {
  return workspace.builderActivity?.twinProposals ?? [];
}

function builderOpportunities(workspace: BrandOpsData): OpportunityRecommendation[] {
  return workspace.builderActivity?.opportunities ?? [];
}

function builderActivityState(workspace: BrandOpsData): BuilderActivityState {
  return {
    workspaceId: builderWorkspaceId(workspace),
    events: builderEvents(workspace),
    achievements: builderAchievements(workspace),
    projects: builderProjects(workspace),
    opportunities: builderOpportunities(workspace),
    twinProposals: builderTwinProposals(workspace)
  };
}

function builderVerifiedAchievements(workspace: BrandOpsData): Achievement[] {
  const candidateByEvent = new Map(
    builderAchievements(workspace).map((c) => [c.eventId, c] as const)
  );
  return builderEvents(workspace)
    .filter(
      (e) =>
        e.verificationStatus === 'USER_VERIFIED' ||
        e.verificationStatus === 'INDEPENDENTLY_SUPPORTED'
    )
    .map((e) => {
      const candidate = candidateByEvent.get(e.id);
      return {
        ...e,
        professionalRelevance: candidate?.professionalRelevance ?? [],
        projectIds: [],
        goalIds: [],
        artifactIds: [],
        sourceEventIds: candidate?.sourceEvents ?? [e.id],
        eventId: e.id
      };
    });
}

function currentTwinFromDigitalTwin(twin: import('../../../types/domain').DigitalTwin): CurrentTwinState {
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

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export type BuilderHandlerResult = {
  workspace: BrandOpsData;
  ok: boolean;
  errorCode?: string;
  error?: string;
  data: Record<string, unknown>;
};

export function runBuilderHandler(
  workspace: BrandOpsData,
  session: ExternalAgentSession,
  capabilityId: AgentCapabilityId,
  args: Record<string, unknown>
): BuilderHandlerResult {
  if (!isBuilderCapabilityId(capabilityId)) {
    return {
      workspace,
      ok: false,
      errorCode: 'unknown_builder_capability',
      error: `Unknown builder capability: ${capabilityId}`,
      data: {}
    };
  }

  const clientKind = session.clientKind;
  const sessionLabel = `agent:${clientKind}`;

  // READ capabilities
  switch (capabilityId) {
    case 'builder.context.read': {
      const events = builderEvents(workspace);
      const achievements = builderAchievements(workspace);
      const projects = builderProjects(workspace);

      const recentActivity = events
        .slice(0, 12)
        .map((e) => ({
          id: e.id,
          kind: e.kind,
          title: e.title,
          detail: e.detail.slice(0, 200),
          timestamp: e.timestamp,
          source: e.source,
          trustTier: e.trustTier,
          verificationStatus: e.verificationStatus
        }));

      const verifiedAchievements = events
        .filter((e) => e.verificationStatus === 'USER_VERIFIED')
        .slice(0, 8)
        .map((e) => ({
          id: e.id,
          title: e.title,
          kind: e.kind,
          confidence: e.confidence,
          evidenceCount: e.evidence?.length ?? 0,
          verifiedAt: e.verifiedAt
        }));

      const unverifiedAchievements = achievements
        .filter((a) => a.verificationRequired && !a.dismissed)
        .slice(0, 5)
        .map((a) => ({
          id: a.id,
          title: a.title,
          kind: a.kind,
          confidence: a.confidence,
          detectedAt: a.detectedAt
        }));

      const activeProjects = projects
        .filter((p) => p.projectStatus === 'active')
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          name: p.name,
          summary: p.summary,
          projectStatus: p.projectStatus,
          tags: p.tags
        }));

      const pendingOpportunities: OpportunityRecommendation[] = [];

      const signalsOut = deriveSignals({
        events,
        config: DEFAULT_SIGNAL_ENGINE_CONFIG,
        workspaceId: builderWorkspaceId(workspace)
      });

      const twinProposals2: Array<{ id: string; summary: string; confidence: number; deltas: Array<{ field: string; previousValue: string; proposedValue: string }>; createdAt: string }> = signalsOut.slice(0, 5).map((p) => ({
        id: p.signal.id,
        summary: p.signal.claim,
        confidence: p.confidence,
        deltas: (p.proposedUpdates ?? []).slice(0, 3).flatMap((proposal) =>
          proposal.deltas.slice(0, 3).map((d) => ({
            field: d.field,
            previousValue: typeof d.previousValue === 'string' ? d.previousValue.slice(0, 200) : '',
            proposedValue: typeof d.proposedValue === 'string' ? d.proposedValue.slice(0, 200) : ''
          }))
        ),
        createdAt: p.signal.updatedAt
      }));

      return {
        workspace,
        ok: true,
        data: {
          recentActivity,
          verifiedAchievements,
          unverifiedAchievements,
          activeProjects,
          pendingOpportunities,
          twinProposals: twinProposals2
        }
      };
    }

    case 'builder.achievements.list': {
      const achievements = builderAchievements(workspace);
      const verified = builderVerifiedAchievements(workspace)
        .slice(0, 20)
        .map((a) => ({
          id: a.id,
          title: a.title,
          kind: a.kind,
          confidence: a.confidence,
          evidenceCount: a.evidence?.length ?? 0,
          verifiedAt: a.verifiedAt,
          professionalRelevance: a.professionalRelevance
        }));
      const unverified = achievements
        .filter((a) => a.verificationRequired && !a.dismissed)
        .slice(0, 10)
        .map((a) => ({
          id: a.id,
          title: a.title,
          kind: a.kind,
          confidence: a.confidence,
          detectedAt: a.detectedAt,
          professionalRelevance: a.professionalRelevance
        }));
      return { workspace, ok: true, data: { verified, unverified, total: achievements.length } };
    }

    case 'builder.opportunities.list': {
      const radar = computeOpportunityRadar(builderActivityState(workspace), builderVerifiedAchievements(workspace), { maxDisplayCount: 10 });
      return { workspace, ok: true, data: { radar } };
    }

    case 'builder.projects.list': {
      const projects = builderProjects(workspace).slice(0, 20).map((p) => ({
        id: p.id,
        name: p.name,
        summary: p.summary,
        projectStatus: p.projectStatus,
        tags: p.tags,
        achievementIds: p.achievementIds,
        artifactIds: p.artifactIds,
        planIds: p.planIds,
        goalIds: p.goalIds,
        outcomeIds: p.outcomeIds
      }));
      return { workspace, ok: true, data: { projects } };
    }

    case 'builder.projects.intelligence': {
      const projectId = String(args.projectId ?? '').trim();
      if (!projectId) {
        return { workspace, ok: false, errorCode: 'missing_project_id', error: 'projectId is required.', data: {} };
      }
      const project = builderProjects(workspace).find((p) => p.id === projectId);
      if (!project) {
        return { workspace, ok: false, errorCode: 'project_not_found', error: `Project not found: ${projectId}`, data: {} };
      }
      const intelligence = computeProjectIntelligence({ state: builderActivityState(workspace), projectId });
      return { workspace, ok: true, data: { projectId, intelligence } };
    }

    case 'builder.receipts.list': {
      const receipts = (workspace.planWorkspace?.receipts ?? [])
        .slice(0, 20)
        .map((r) => ({
          id: r.id,
          planId: r.planId,
          convertedFrom: r.convertedFrom,
          planType: r.planType,
          sourceMessageId: r.sourceMessageId,
          generatedSteps: r.generatedSteps,
          userAction: r.userAction,
          timestamp: r.timestamp,
          summary: r.summary
        }));
      return { workspace, ok: true, data: { receipts } };
    }

    case 'builder.sessions.list': {
      const sessions = (workspace.externalAgentSessions?.entries ?? [])
        .filter((s) => s.status === 'active')
        .slice(0, 20)
        .map((s) => ({
          id: s.id,
          clientKind: s.clientKind,
          clientName: s.clientName,
          status: s.status,
          grantedCapabilities: s.grantedCapabilities,
          grantedBundles: s.grantedBundles,
          lastActivityAt: s.lastActivityAt,
          createdAt: s.createdAt
        }));
      return { workspace, ok: true, data: { sessions } };
    }

    case 'builder.twin-proposals.list': {
      const proposals = builderTwinProposals(workspace).slice(0, 10).map((p) => ({
        id: p.id,
        summary: p.summary,
        confidence: p.confidence,
        reason: p.reason,
        deltas: p.deltas.map((d) => ({
          field: d.field,
          previousValue: typeof d.previousValue === 'string' ? d.previousValue.slice(0, 200) : '',
          proposedValue: typeof d.proposedValue === 'string' ? d.proposedValue.slice(0, 200) : '',
          confidence: d.confidence,
          reason: d.reason
        })),
        createdAt: p.createdAt
      }));
      return { workspace, ok: true, data: { proposals } };
    }

    case 'builder.feature-registry.read': {
      const registry = getFeatureRegistryState(workspace);
      return { workspace, ok: true, data: { registry: registry.entries } };
    }

    case 'builder.skill-packed-instructions': {
      const skillId = String(args.skillId ?? '').trim();
      if (!skillId) {
        return { workspace, ok: false, errorCode: 'missing_skill_id', error: 'skillId is required.', data: {} };
      }
      const pack = getSkillPack(skillId as any);
      if (!pack) {
        return { workspace, ok: false, errorCode: 'skill_not_found', error: `Unknown skill pack: ${skillId}`, data: {} };
      }
      return {
        workspace,
        ok: true,
        data: {
          skillPack: {
            id: pack.id,
            name: pack.name,
            description: pack.description,
            requiredCapabilities: pack.requiredCapabilities,
            steps: pack.steps.map((s) => ({
              order: s.order,
              title: s.title,
              instruction: s.instruction,
              mapsToTool: s.mapsToTool,
              expectedInput: s.expectedInput,
              outputHint: s.outputHint
            })),
            invocationHint: pack.invocationHint
          }
        }
      };
    }

    // MUTATING capabilities
    case 'builder.achievements.verify': {
      const eventId = String(args.eventId ?? '').trim();
      if (!eventId) {
        return { workspace, ok: false, errorCode: 'missing_event_id', error: 'eventId is required.', data: {} };
      }
      const candidate = builderAchievements(workspace).find((a) => a.eventId === eventId || a.id === eventId);
      const event = builderEvents(workspace).find((e) => e.id === candidate?.eventId);
      if (!candidate || !event) {
        return { workspace, ok: false, errorCode: 'achievement_not_found', error: `Achievement candidate or event not found: ${eventId}`, data: {} };
      }
      const result = verifyAchievement(candidate, event);
      const nowIso = new Date().toISOString();
      const updatedWorkspace: BrandOpsData = {
        ...workspace,
        builderActivity: {
          ...workspace.builderActivity,
          events: builderEvents(workspace).map((e) =>
            e.id === event.id
              ? { ...e, verificationStatus: 'USER_VERIFIED' as const, verifiedAt: result.achievement.verifiedAt, trustTier: 'USER_VERIFIED' as const }
              : e
          ),
          achievements: builderAchievements(workspace).filter((a) => a.id !== candidate.id),
          workspaceId: builderWorkspaceId(workspace),
          updatedAt: nowIso,
          achievementsVerifiedAt: [...(workspace.builderActivity?.achievementsVerifiedAt ?? []), event.id]
        }
      };
      const receipt = createReceipt({
        workspace: updatedWorkspace,
        requestedBy: sessionLabel,
        approvedBy: 'user',
        source: 'bridge',
        command: 'builder.achievements.verify',
        result: { status: 'success', message: `Achievement verified: ${result.achievement.title}` },
        affectedObjects: [{ type: 'achievement', id: result.achievement.id }],
        nextAction: 'Review achievement in PLAN.',
        summary: `Verified achievement: ${result.achievement.title}`
      });
      return { workspace: receipt.workspace, ok: true, data: { eventId: result.achievement.id, status: 'verified', receiptId: receipt.receipt.id } };
    }

    case 'builder.achievements.dismiss': {
      const eventId = String(args.eventId ?? '').trim();
      if (!eventId) {
        return { workspace, ok: false, errorCode: 'missing_event_id', error: 'eventId is required.', data: {} };
      }
      const candidate = builderAchievements(workspace).find((a) => a.eventId === eventId || a.id === eventId);
      if (!candidate) {
        return { workspace, ok: false, errorCode: 'achievement_not_found', error: `Achievement candidate not found: ${eventId}`, data: {} };
      }
      const result = dismissAchievement(candidate, String(args.reason ?? '').trim() || undefined);
      const nowIso = new Date().toISOString();
      const updatedWorkspace: BrandOpsData = {
        ...workspace,
        builderActivity: {
          ...workspace.builderActivity,
          events: builderEvents(workspace),
          achievements: builderAchievements(workspace).map((a) => (a.id === candidate.id ? result.dismissed : a)),
          workspaceId: builderWorkspaceId(workspace),
          updatedAt: nowIso
        }
      };
      const receipt = createReceipt({
        workspace: updatedWorkspace,
        requestedBy: sessionLabel,
        approvedBy: 'user',
        source: 'bridge',
        command: 'builder.achievements.dismiss',
        result: { status: 'success', message: `Achievement dismissed: ${result.dismissed.title}` },
        affectedObjects: [{ type: 'achievement', id: result.dismissed.id }],
        summary: `Dismissed achievement: ${result.dismissed.title}`
      });
      return { workspace: receipt.workspace, ok: true, data: { eventId: result.dismissed.id, status: 'dismissed', receiptId: receipt.receipt.id } };
    }

    case 'builder.opportunities.convert-to-plan': {
      const opportunityId = String(args.opportunityId ?? '').trim();
      const achievementId = String(args.achievementId ?? '').trim();
      const preset = String(args.preset ?? 'content-plan').trim() || 'content-plan';

      if (!opportunityId && !achievementId) {
        return { workspace, ok: false, errorCode: 'missing_target', error: 'opportunityId or achievementId is required.', data: {} };
      }

      // Validate plan inputs
      const templateName = preset as ExtendedPlanPreset;
      const template = PLAN_TEMPLATES[templateName];
      if (!template) {
        return { workspace, ok: false, errorCode: 'invalid_preset', error: `Unknown plan preset: ${preset}`, data: {} };
      }

      try {
        let draft: PlanDraft;
        if (opportunityId) {
          const opportunity = builderOpportunities(workspace).find((o) => o.id === opportunityId);
          if (!opportunity) {
            return { workspace, ok: false, errorCode: 'opportunity_not_found', error: `Opportunity not found: ${opportunityId}`, data: {} };
          }
          const compiled = compilePlanFromOpportunity({
            workspace,
            opportunity,
            preset: templateName,
            userIntent: String(args.userIntent ?? '').trim() || `Convert opportunity into a plan.`,
            conversationId: opportunityId
          });
          draft = compiled.draft;
        } else {
          const achievement = builderVerifiedAchievements(workspace).find(
            (a) => a.id === achievementId || a.eventId === achievementId
          );
          if (!achievement) {
            return { workspace, ok: false, errorCode: 'achievement_not_found', error: `Verified achievement not found: ${achievementId}`, data: {} };
          }
          const compiled = compilePlanFromAchievement({
            workspace,
            achievement,
            preset: templateName,
            userIntent: String(args.userIntent ?? '').trim() || `Convert achievement into a plan.`,
            conversationId: achievementId
          });
          draft = compiled.draft;
        }

        // Validate inputs
        const validation = validatePlanInputs({ template, providedInputs: { source: achievementId || opportunityId } });
        if (!validation.valid) {
          return {
            workspace,
            ok: false,
            errorCode: 'missing_required_inputs',
            error: `Missing required inputs: ${validation.missingRequired.join(', ')}`,
            data: { missingRequired: validation.missingRequired, warnings: validation.warnings }
          };
        }

        // Save the plan draft
        const saved = savePlanDraftToWorkspace({ workspace, draft, userAction: 'save-plan' });
        const receipt = createReceipt({
          workspace: saved.workspace,
          requestedBy: sessionLabel,
          approvedBy: 'user',
          source: 'bridge',
          command: 'builder.opportunities.convert-to-plan',
          planId: saved.plan.id,
          result: { status: 'draft-created', planId: saved.plan.id },
          affectedObjects: [{ type: 'plan', id: saved.plan.id }],
          summary: `Plan draft created from opportunity/achievement: ${saved.plan.title}`
        });
        return { workspace: receipt.workspace, ok: true, data: { planId: saved.plan.id, planStatus: saved.plan.status, receiptId: receipt.receipt.id } };
      } catch (err) {
        return {
          workspace,
          ok: false,
          errorCode: 'plan_compilation_failed',
          error: err instanceof Error ? err.message : String(err),
          data: {}
        };
      }
    }

    case 'builder.opportunities.dismiss': {
      const opportunityId = String(args.opportunityId ?? '').trim();
      if (!opportunityId) {
        return { workspace, ok: false, errorCode: 'missing_opportunity_id', error: 'opportunityId is required.', data: {} };
      }
      const existing = builderOpportunities(workspace).find((o) => o.id === opportunityId);
      if (!existing) {
        return { workspace, ok: false, errorCode: 'opportunity_not_found', error: `Opportunity not found: ${opportunityId}`, data: {} };
      }
      return { workspace, ok: true, data: { opportunityId, status: 'dismissed' } };
    }

    case 'builder.twin-proposals.accept': {
      const proposalId = String(args.proposalId ?? '').trim();
      if (!proposalId) {
        return { workspace, ok: false, errorCode: 'missing_proposal_id', error: 'proposalId is required.', data: {} };
      }
      const proposals = builderTwinProposals(workspace);
      const proposal = proposals.find((p) => p.id === proposalId);
      if (!proposal) {
        return { workspace, ok: false, errorCode: 'proposal_not_found', error: `Proposal not found: ${proposalId}`, data: {} };
      }

      const twinId = workspace.digitalTwins?.activeTwinId ?? workspace.digitalTwins?.twins[0]?.id ?? '';
      if (!twinId) {
        return { workspace, ok: false, errorCode: 'no_twin', error: 'No active Twin found.', data: {} };
      }
      const twin = workspace.digitalTwins?.twins.find((t) => t.id === twinId);
      if (!twin) {
        return { workspace, ok: false, errorCode: 'twin_not_found', error: `Twin not found: ${twinId}`, data: {} };
      }

      const result = applyDeltas({
        currentTwin: currentTwinFromDigitalTwin(twin),
        deltas: proposal.deltas,
        acceptedDeltaIds: proposal.deltas.map((d) => d.id),
        rejectedDeltaIds: [],
        editedDeltas: new Map()
      });

      const nowIso = new Date().toISOString();
      const updatedWorkspace: BrandOpsData = {
        ...workspace,
        digitalTwins: {
          activeTwinId: workspace.digitalTwins?.activeTwinId ?? null,
          twins: (workspace.digitalTwins?.twins ?? []).map((t) =>
            t.id === twin.id
              ? {
                  ...t,
                  identity: {
                    ...t.identity,
                    headline: result.updatedTwin.headline,
                    summary: result.updatedTwin.summary,
                    professionalPositioning: result.updatedTwin.professionalPositioning,
                    targetAudience: result.updatedTwin.targetAudience,
                    toneOfVoice: result.updatedTwin.toneOfVoice,
                    strengths: result.updatedTwin.expertiseAreas,
                    goals: result.updatedTwin.goals
                  },
                  resumeProfile: {
                    ...t.resumeProfile,
                    skills: result.updatedTwin.skills,
                    achievements: result.updatedTwin.achievements
                  },
                  updatedAt: result.updatedTwin.updatedAt
                }
              : t
          )
        },
        builderActivity: {
          ...workspace.builderActivity,
          events: builderEvents(workspace),
          twinProposals: proposals.filter((p) => p.id !== proposal.id),
          workspaceId: builderWorkspaceId(workspace),
          updatedAt: nowIso
        }
      };

      const receipt = createReceipt({
        workspace: updatedWorkspace,
        requestedBy: sessionLabel,
        approvedBy: 'user',
        source: 'bridge',
        command: 'builder.twin-proposals.accept',
        result: { status: 'applied', deltaCount: result.appliedDeltas.length },
        affectedObjects: result.appliedDeltas.map((d) => ({ type: 'twin-delta', id: d.id })),
        summary: `Accepted Twin proposal: ${proposal.summary}`
      });
      return { workspace: receipt.workspace, ok: true, data: { proposalId, appliedDeltas: result.appliedDeltas.length, receiptId: receipt.receipt.id } };
    }

    case 'builder.twin-proposals.reject': {
      const proposalId = String(args.proposalId ?? '').trim();
      if (!proposalId) {
        return { workspace, ok: false, errorCode: 'missing_proposal_id', error: 'proposalId is required.', data: {} };
      }
      const proposal = builderTwinProposals(workspace).find((p) => p.id === proposalId);
      if (!proposal) {
        return { workspace, ok: false, errorCode: 'proposal_not_found', error: `Proposal not found: ${proposalId}`, data: {} };
      }
      return { workspace, ok: true, data: { proposalId, status: 'rejected' } };
    }

    case 'builder.sessions.revoke': {
      const sessionId = String(args.sessionId ?? '').trim();
      if (!sessionId) {
        return { workspace, ok: false, errorCode: 'missing_session_id', error: 'sessionId is required.', data: {} };
      }
      const sessions = (workspace.externalAgentSessions?.entries ?? []);
      const target = sessions.find((s) => s.id === sessionId);
      if (!target || target.status === 'revoked') {
        return { workspace, ok: false, errorCode: 'session_not_found', error: `Session not found or already revoked: ${sessionId}`, data: {} };
      }

      const revoked = sessions.map((s) =>
        s.id === sessionId ? { ...s, status: 'revoked' as const, revokedAt: new Date().toISOString() } : s
      );
      const updated = {
        ...workspace,
        externalAgentSessions: { entries: revoked, updatedAt: new Date().toISOString() }
      };

      const receipt = createReceipt({
        workspace: updated,
        requestedBy: sessionLabel,
        approvedBy: 'user',
        source: 'bridge',
        command: 'builder.sessions.revoke',
        result: { status: 'revoked' },
        affectedObjects: [{ type: 'session', id: sessionId }],
        summary: `Revoked session: ${sessionId}`
      });
      return { workspace: receipt.workspace, ok: true, data: { sessionId, status: 'revoked', receiptId: receipt.receipt.id } };
    }

    case 'builder.activity.ingest': {
      const kind = String(args.kind ?? '').trim();
      const title = String(args.title ?? '').trim();
      const detail = String(args.detail ?? '').trim();
      if (!kind || !title || !detail) {
        return { workspace, ok: false, errorCode: 'invalid_args', error: 'kind, title, and detail are required.', data: {} };
      }
      const rawSource = String(args.source ?? '').trim();

      const result = ingestActivityEvent(workspace, {
        workspaceId: builderWorkspaceId(workspace),
        source: isActivityEventSource(rawSource) ? rawSource : 'agent-reported',
        sourceId: String(args.sourceId ?? '') || `ingest-${Date.now().toString(36)}`,
        kind: kind as ActivityEvent['kind'],
        title: title.slice(0, 300),
        detail: detail.slice(0, 4000),
        confidence: typeof args.confidence === 'number' ? Math.max(0, Math.min(1, args.confidence)) : 0.7,
        trustTier: 'AGENT_REPORTED',
        entityRefs: [],
        evidence: [],
        recordedBy: sessionLabel,
        recordedReason: `Ingested via MCP by ${session.clientName}.`
      });

      const receipt = createReceipt({
        workspace: result.workspace,
        requestedBy: sessionLabel,
        approvedBy: 'user',
        source: 'bridge',
        command: 'builder.activity.ingest',
        result: { status: 'ingested', eventId: result.event.id, deduplicated: result.dedupResult.deduplicated },
        affectedObjects: [{ type: 'activity-event', id: result.event.id }],
        summary: `Ingested activity: ${result.event.title}`
      });
      return { workspace: receipt.workspace, ok: true, data: { eventId: result.event.id, deduplicated: result.dedupResult.deduplicated, receiptId: receipt.receipt.id } };
    }

    case 'builder.activity.ingest-session-summary': {
      const sessionEvidence: DevelopmentSessionEvidence = {
        sessionId: String(args.sessionId ?? '') || `session-${Date.now().toString(36)}`,
        workDescription: String(args.workDescription ?? '').trim(),
        problemsSolved: [],
        technologiesUsed: [],
        source: sessionLabel,
        occurredAt: new Date().toISOString()
      };

      if (args.problemsSolved && Array.isArray(args.problemsSolved)) {
        sessionEvidence.problemsSolved = args.problemsSolved.filter((p): p is string => typeof p === 'string').slice(0, 10);
      }
      if (args.technologiesUsed && Array.isArray(args.technologiesUsed)) {
        sessionEvidence.technologiesUsed = args.technologiesUsed.filter((t): t is string => typeof t === 'string').slice(0, 10);
      }
      if (args.evidence && Array.isArray(args.evidence)) {
        sessionEvidence.evidence = (args.evidence as Array<Record<string, unknown>>)
          .filter((e) => typeof e === 'object' && e !== null)
          .map((e): SessionEvidenceItem => ({
            type: 'file',
            ref: String(e.ref ?? ''),
            label: String(e.label ?? ''),
            ...(typeof e.content === 'string' ? { content: e.content } : {})
          }))
          .filter((e) => e.ref || e.label)
          .slice(0, 5);
      }

      if (!sessionEvidence.workDescription) {
        return { workspace, ok: false, errorCode: 'invalid_args', error: 'workDescription is required.', data: {} };
      }

      const result = summarizeWorkForBrandOps({
        sessionEvidence,
        workspace,
        state: builderActivityState(workspace),
        userId: session.ownerUserId ?? 'local-user',
        workspaceId: builderWorkspaceId(workspace)
      });

      const receipt = createReceipt({
        workspace,
        requestedBy: sessionLabel,
        approvedBy: 'user',
        source: 'bridge',
        command: 'builder.activity.ingest-session-summary',
        result: {
          status: 'reviewed',
          workCompleted: result.workCompleted,
          problemsSolved: result.problemsSolved,
          technologiesUsed: result.technologiesUsed,
          potentialAchievement: result.potentialAchievement.title,
          contentAngles: result.contentAngles,
          portfolioValue: result.portfolioValue.score,
          recommendedNextAction: result.recommendedNextAction
        },
        affectedObjects: [],
        summary: `Session summary prepared for review: ${result.workCompleted.slice(0, 120)}`
      });
      return { workspace: receipt.workspace, ok: true, data: { summary: result, receiptId: receipt.receipt.id } };
    }

    default: {
      // Shouldn't happen if isBuilderCapabilityId is correct, but safety net
      return {
        workspace,
        ok: false,
        errorCode: 'unknown_builder_capability',
        error: `Unhandled builder capability: ${capabilityId}`,
        data: {}
      };
    }
  }
}