/**
 * Canonical agent capability registry — the single source of truth for what
 * external agents may do, at which permission tier, and with what access mode.
 * MCP tools map 1:1 onto these capability ids (see `toolName`), so vendor
 * connectors stay thin and authorization lives here once.
 */
import type { AgentCapabilityDefinition, AgentCapabilityId } from '../../types/agentInterop';

export const AGENT_CAPABILITY_REGISTRY: Readonly<
  Record<AgentCapabilityId, AgentCapabilityDefinition>
> = {
  'context.read': {
    id: 'context.read',
    toolName: 'brandops_get_relevant_context',
    label: 'Retrieve relevant context',
    description:
      'Relevance-scored, purpose-scoped professional context (Twin, positioning, goals, voice, projects) with provenance.',
    tier: 'READ',
    family: 'KNOW',
    access: 'auto',
    readOnly: true
  },
  'goals.read': {
    id: 'goals.read',
    toolName: 'brandops_get_current_goals',
    label: 'Get current goals',
    description:
      'Current professional goals and decision memory from the workspace intelligence layer.',
    tier: 'READ',
    family: 'KNOW',
    access: 'auto',
    readOnly: true
  },
  'artifacts.read': {
    id: 'artifacts.read',
    toolName: 'brandops_search_artifacts',
    label: 'Search artifacts',
    description:
      'Search integration-hub artifacts, content library, and publishing drafts by query.',
    tier: 'READ',
    family: 'SEARCH',
    access: 'auto',
    readOnly: true
  },
  'plans.read': {
    id: 'plans.read',
    toolName: 'brandops_get_plan_status',
    label: 'Get plan status',
    description: 'Read status and steps of a saved PLAN by id.',
    tier: 'READ',
    family: 'KNOW',
    access: 'auto',
    readOnly: true
  },
  'evidence.read': {
    id: 'evidence.read',
    toolName: 'brandops_search_evidence',
    label: 'Search evidence',
    description:
      'Search the workspace evidence surface (achievements, agent events, twin resume facts, receipts) for what actually supports a claim. Every hit carries its provenance and trust tier; agent-reported evidence is never returned as verified fact.',
    tier: 'READ',
    family: 'SEARCH',
    access: 'auto',
    readOnly: true
  },
  'authority.read': {
    id: 'authority.read',
    toolName: 'brandops_get_authority',
    label: 'Get authority graph',
    description:
      'Topics the workspace can actually substantiate, scored from owned evidence, with the corroboration gaps between claimed positioning and demonstrated proof.',
    tier: 'READ',
    family: 'ANALYZE',
    access: 'auto',
    readOnly: true
  },
  'next-best-actions.read': {
    id: 'next-best-actions.read',
    toolName: 'brandops_get_next_best_actions',
    label: 'Get next best actions',
    description:
      'Ranked next best actions from the predictive operations layer: what to do now, why, and the command that starts it.',
    tier: 'READ',
    family: 'ADVISE',
    access: 'auto',
    readOnly: true
  },
  'receipts.read': {
    id: 'receipts.read',
    toolName: 'brandops_get_receipt',
    label: 'Get receipt',
    description:
      'Read one execution receipt by id (or the latest for a plan): what was requested, what actually happened, under whose approval, and the result.',
    tier: 'READ',
    family: 'VERIFY',
    access: 'auto',
    readOnly: true
  },
  'execution.request': {
    id: 'execution.request',
    toolName: 'brandops_request_plan_execution',
    label: 'Request plan execution',
    description:
      'Request execution of a saved PLAN. Never executes: returns a durable MCP task handle whose first state is the user-approval boundary. Poll it with tasks/get or brandops_get_execution.',
    tier: 'EXTERNAL_ACTION',
    family: 'ACT',
    access: 'approval',
    readOnly: false,
    createsTask: true
  },
  'execution.read': {
    id: 'execution.read',
    toolName: 'brandops_get_execution',
    label: 'Get execution status',
    description:
      'Read a durable execution task by id: status, status message, pending approvals, result or error. Projected from canonical Plan/Execution/Checkpoint state.',
    tier: 'READ',
    family: 'ACT',
    access: 'auto',
    readOnly: true
  },
  'execution.cancel': {
    id: 'execution.cancel',
    toolName: 'brandops_cancel_execution',
    label: 'Cancel execution',
    description:
      'Withdraw an execution request or cancel approved work. Stopping is the safe direction, so this is not approval-gated — but it cannot revive a task that already finished.',
    tier: 'PREPARE',
    family: 'ACT',
    access: 'auto',
    readOnly: false
  },
  'voice.read': {
    id: 'voice.read',
    toolName: 'brandops_get_voice',
    label: 'Get brand voice',
    description:
      'The professional voice profile for a channel: tone, structure, real voice examples and high-confidence claims, each with provenance. Lets any AI write in the same voice without a per-model prompt.',
    tier: 'READ',
    family: 'KNOW',
    access: 'auto',
    readOnly: true
  },
  'relationship.read': {
    id: 'relationship.read',
    toolName: 'brandops_get_relationship_context',
    label: 'Get relationship context',
    description:
      'What is professionally relevant about a named contact: stage, last contact, recent interactions and what is outstanding. Returns the working state of the relationship, not a dossier.',
    tier: 'READ',
    family: 'KNOW',
    access: 'auto',
    readOnly: true
  },
  'artifact.read': {
    id: 'artifact.read',
    toolName: 'brandops_get_artifact',
    label: 'Get artifact by id',
    description:
      'Read one artifact by id, with its provenance reference. Use brandops_search_artifacts to find the id first.',
    tier: 'READ',
    family: 'SEARCH',
    access: 'auto',
    readOnly: true
  },
  'outcome.report': {
    id: 'outcome.report',
    toolName: 'brandops_report_outcome',
    label: 'Report outcome',
    description:
      'Report what happened after work completed, scored on a canonical outcome dimension. Always AGENT_REPORTED; feeds learning only after BrandOps-side validation.',
    tier: 'GENERATE',
    family: 'MEASURE',
    access: 'auto',
    readOnly: false
  },
  'achievement.record': {
    id: 'achievement.record',
    toolName: 'brandops_record_achievement',
    label: 'Record achievement',
    description:
      'Propose a professional achievement signal (feature shipped, release, documentation, milestone, decision, contribution). Always AGENT_REPORTED; never auto-promotes to a verified Twin fact.',
    tier: 'GENERATE',
    family: 'REMEMBER',
    access: 'auto',
    readOnly: false
  },
  'artifact.create': {
    id: 'artifact.create',
    toolName: 'brandops_create_artifact',
    label: 'Create artifact proposal',
    description:
      'Propose an artifact for the workspace integration hub. Becomes a reviewable proposal the user can approve, edit, or convert to a Plan.',
    tier: 'PREPARE',
    family: 'CREATE',
    access: 'auto',
    readOnly: false
  },
  'twin.propose_update': {
    id: 'twin.propose_update',
    toolName: 'brandops_propose_twin_update',
    label: 'Propose Twin update',
    description:
      'Propose an update to the Digital Twin (positioning, voice, or fact). Never mutates the Twin; the proposal is reviewable and convertible to a Plan.',
    tier: 'PREPARE',
    family: 'REMEMBER',
    access: 'auto',
    readOnly: false
  },
  'opportunity.create': {
    id: 'opportunity.create',
    toolName: 'brandops_create_content_opportunity',
    label: 'Create content opportunity',
    description:
      'Propose a content/positioning opportunity signal (e.g. "turn this shipped feature into a technical post").',
    tier: 'GENERATE',
    family: 'CREATE',
    access: 'auto',
    readOnly: false
  },
  'plan.convert': {
    id: 'plan.convert',
    toolName: 'brandops_convert_to_plan',
    label: 'Convert to Plan',
    description:
      'Convert a recorded agent achievement (or proposal) into a reviewable PLAN draft inside BrandOps.',
    tier: 'PREPARE',
    family: 'PLAN',
    access: 'auto',
    readOnly: false
  },
  'action.request': {
    id: 'action.request',
    toolName: 'brandops_request_action',
    label: 'Request external action',
    description:
      'Request a consequential BrandOps action (publish, outreach, integration change, destructive op). Never executes; creates an approval-gated request.',
    tier: 'EXTERNAL_ACTION',
    family: 'ACT',
    access: 'approval',
    readOnly: false
  },
  // ── Builder intelligence capabilities ────────────────────────────────
  'builder.context.read': {
    id: 'builder.context.read',
    toolName: 'brandops_get_builder_context',
    label: 'Get builder context',
    description:
      'Retrieve builder intelligence context: recent activity, verified achievements, active projects, and proposed opportunities.',
    tier: 'READ',
    family: 'KNOW',
    access: 'auto',
    readOnly: true
  },
  'builder.achievements.list': {
    id: 'builder.achievements.list',
    toolName: 'brandops_list_achievements',
    label: 'List achievements',
    description:
      'List verified and unverified achievements with their kind, confidence, and evidence.',
    tier: 'READ',
    family: 'SEARCH',
    access: 'auto',
    readOnly: true
  },
  'builder.achievements.verify': {
    id: 'builder.achievements.verify',
    toolName: 'brandops_verify_achievement',
    label: 'Verify achievement',
    description:
      'Verify an unverified achievement as USER_VERIFIED or INDEPENDENTLY_SUPPORTED. Never auto-promotes to a verified Twin fact.',
    tier: 'PREPARE',
    family: 'REMEMBER',
    /**
     * Approval-gated (corrected 2026-08-31). Verifying an achievement promotes an
     * `AGENT_REPORTED` signal toward verified professional evidence, which is a
     * *promote*, and the directive is explicit: external AI may propose, never
     * promote. This ran as `access: 'auto'` — an agent holding the grant verified
     * its own reports outright. A second definition list in
     * `builder/mcpBuilderCapabilities.ts` had documented `'approval'` all along;
     * the registry is what enforces, and the registry said otherwise.
     */
    access: 'approval',
    readOnly: false
  },
  'builder.achievements.dismiss': {
    id: 'builder.achievements.dismiss',
    toolName: 'brandops_dismiss_achievement',
    label: 'Dismiss achievement',
    description: 'Dismiss an unverified achievement (marks it as rejected for auditability).',
    tier: 'PREPARE',
    family: 'REMEMBER',
    access: 'auto',
    readOnly: false
  },
  'builder.opportunities.list': {
    id: 'builder.opportunities.list',
    toolName: 'brandops_list_opportunities',
    label: 'List opportunities',
    description: 'List ranked opportunity recommendations from verified achievements.',
    tier: 'READ',
    family: 'SEARCH',
    access: 'auto',
    readOnly: true
  },
  'builder.opportunities.convert-to-plan': {
    id: 'builder.opportunities.convert-to-plan',
    toolName: 'brandops_convert_opportunity_to_plan',
    label: 'Convert opportunity to plan',
    description:
      'Convert a high-value opportunity into a structured PlanDraft using the appropriate template.',
    tier: 'PREPARE',
    family: 'PLAN',
    access: 'auto',
    readOnly: false
  },
  'builder.opportunities.dismiss': {
    id: 'builder.opportunities.dismiss',
    toolName: 'brandops_dismiss_opportunity',
    label: 'Dismiss opportunity',
    description: 'Dismiss an opportunity recommendation.',
    tier: 'PREPARE',
    family: 'CREATE',
    access: 'auto',
    readOnly: false
  },
  'builder.twin-proposals.list': {
    id: 'builder.twin-proposals.list',
    toolName: 'brandops_list_twin_proposals',
    label: 'List Twin proposals',
    description:
      'List pending Twin update proposals from the professional signal engine or activity graph.',
    tier: 'READ',
    family: 'SEARCH',
    access: 'auto',
    readOnly: true
  },
  'builder.twin-proposals.accept': {
    id: 'builder.twin-proposals.accept',
    toolName: 'brandops_accept_twin_proposal',
    label: 'Accept Twin proposal',
    description: 'Accept a Twin update proposal (applies deltas to the Twin).',
    tier: 'PREPARE',
    family: 'REMEMBER',
    /**
     * Approval-gated (corrected 2026-08-31). Accepting a Twin proposal writes the
     * Digital Twin. It is *the* promote path, and it ran as `auto`: an agent
     * could accept the very proposal it had just created. Same divergence, same
     * source — the duplicate definition list said `'approval'`, the registry did not.
     */
    access: 'approval',
    readOnly: false
  },
  'builder.twin-proposals.reject': {
    id: 'builder.twin-proposals.reject',
    toolName: 'brandops_reject_twin_proposal',
    label: 'Reject Twin proposal',
    description: 'Reject a Twin update proposal.',
    tier: 'PREPARE',
    family: 'REMEMBER',
    access: 'auto',
    readOnly: false
  },
  'builder.projects.list': {
    id: 'builder.projects.list',
    toolName: 'brandops_list_projects',
    label: 'List projects',
    description:
      'List canonical Project objects with their status, achievements, and intelligence.',
    tier: 'READ',
    family: 'KNOW',
    access: 'auto',
    readOnly: true
  },
  'builder.projects.intelligence': {
    id: 'builder.projects.intelligence',
    toolName: 'brandops_get_project_intelligence',
    label: 'Get project intelligence',
    description:
      'Get derived project intelligence: status, recent milestones, professional value, documentation gaps, content potential.',
    tier: 'READ',
    family: 'KNOW',
    access: 'auto',
    readOnly: true
  },
  'builder.receipts.list': {
    id: 'builder.receipts.list',
    toolName: 'brandops_list_receipts',
    label: 'List execution receipts',
    description:
      'List execution receipts for recent commands with request, approval, result, and affected objects.',
    tier: 'READ',
    family: 'SEARCH',
    access: 'auto',
    readOnly: true
  },
  'builder.sessions.list': {
    id: 'builder.sessions.list',
    toolName: 'brandops_list_connected_sessions',
    label: 'List connected sessions',
    description: 'List connected external agent sessions with status, scopes, and last activity.',
    tier: 'READ',
    family: 'SEARCH',
    access: 'auto',
    readOnly: true
  },
  'builder.sessions.revoke': {
    id: 'builder.sessions.revoke',
    toolName: 'brandops_revoke_session',
    label: 'Revoke session',
    description:
      'Revoke an external agent session (immediate and irreversible — the token can never be re-activated). Sensitive: requires an explicit confirmation in the intent contract, and is approval-gated on top of that.',
    tier: 'SENSITIVE_ACTION',
    family: 'ACT',
    access: 'approval',
    readOnly: false
  },
  'builder.activity.ingest': {
    id: 'builder.activity.ingest',
    toolName: 'brandops_ingest_activity',
    label: 'Ingest activity event',
    description:
      'Ingest an activity event from an authorized source (user action, agent, integration, skill pack, dev hook, session-to-brand).',
    tier: 'GENERATE',
    family: 'REMEMBER',
    access: 'auto',
    readOnly: false
  },
  'builder.activity.ingest-session-summary': {
    id: 'builder.activity.ingest-session-summary',
    toolName: 'brandops_ingest_session_summary',
    label: 'Ingest session summary',
    description:
      'Ingest a development session summary from Session-to-Brand: work completed, problems solved, technologies used, potential achievement.',
    tier: 'GENERATE',
    family: 'REMEMBER',
    access: 'approval',
    readOnly: false
  },
  'builder.skill-packed-instructions': {
    id: 'builder.skill-packed-instructions',
    toolName: 'brandops_get_skill_instructions',
    label: 'Get skill instructions',
    description:
      'Get the portable instruction steps for a named skill pack (capture-achievement, turn-build-into-content, etc.).',
    tier: 'READ',
    family: 'KNOW',
    access: 'auto',
    readOnly: true
  },
  'builder.feature-registry.read': {
    id: 'builder.feature-registry.read',
    toolName: 'brandops_get_feature_registry',
    label: 'Get feature registry',
    description:
      'Get the machine-readable feature registry with maturity, wiring status, and test coverage for each capability.',
    tier: 'READ',
    family: 'KNOW',
    access: 'auto',
    readOnly: true
  }
};

export const AGENT_CAPABILITY_DEFINITIONS: readonly AgentCapabilityDefinition[] =
  Object.values(AGENT_CAPABILITY_REGISTRY);

export function getAgentCapability(id: AgentCapabilityId): AgentCapabilityDefinition {
  return AGENT_CAPABILITY_REGISTRY[id];
}

/**
 * True when a capability's declared `access` requires BrandOps-side approval
 * before anything executes. The gateway fails closed on this invariant
 * (`gateway.ts`), so an `access: 'approval'` capability can only ever produce
 * an approval-gated request — never a direct side effect.
 */
export function capabilityRequiresApproval(id: AgentCapabilityId): boolean {
  return AGENT_CAPABILITY_REGISTRY[id].access === 'approval';
}

/**
 * Sensitive capabilities are irreversible or high-impact. They require an
 * explicit confirmation in the User Intent Contract *before* the approval gate,
 * so a client can never reach an irreversible action by accident.
 */
export function capabilityIsSensitive(id: AgentCapabilityId): boolean {
  return AGENT_CAPABILITY_REGISTRY[id].tier === 'SENSITIVE_ACTION';
}

/**
 * Read capabilities — the only ones a read-only session may be granted.
 *
 * Derived from the registry's `readOnly` declaration rather than the shape of
 * the id: a capability that reads is read-only whether it is named `.read`,
 * `.list`, or anything else, and least-privilege must not depend on naming luck.
 */
export function isReadCapability(id: AgentCapabilityId): boolean {
  return AGENT_CAPABILITY_REGISTRY[id].readOnly === true;
}

/** Reverse map: MCP tool name → canonical capability id. */
const TOOL_TO_CAPABILITY: Readonly<Record<string, AgentCapabilityId>> = Object.fromEntries(
  AGENT_CAPABILITY_DEFINITIONS.flatMap((def) => (def.toolName ? [[def.toolName, def.id]] : []))
);

export function toolNameToCapabilityId(toolName: string): AgentCapabilityId | null {
  return TOOL_TO_CAPABILITY[toolName] ?? null;
}

export function isAgentCapabilityId(value: string): value is AgentCapabilityId {
  return value in AGENT_CAPABILITY_REGISTRY;
}

/**
 * What approving an action actually does, in the words a person decides in.
 *
 * An approval row on the plan page told the reader who was asking and what for.
 * It did not tell them what happens if they say yes — whether anything leaves
 * the workspace, whether it can be undone, what it touches. Those are the
 * questions someone actually has in front of an approve button, and the answers
 * were already in this file: every capability carries a `tier` and a `readOnly`
 * flag. The snapshot builder was dropping `capabilityId` on the way to the UI,
 * so the row had no way to reach them.
 *
 * Derived from the registry rather than written per action, so a capability
 * added next month describes itself without anyone remembering to.
 *
 * `null` when the capability is unknown — an action whose effect is not recorded
 * says so rather than borrowing a reassuring default. "Effect not recorded" is
 * information; a confident guess would not be.
 */
export interface ApprovalConsequence {
  /** What approving does. */
  effect: string;
  /** Whether approving can be taken back, and null when the registry cannot say. */
  reversible: boolean | null;
  /** Whether the effect is confined to this workspace. */
  leavesWorkspace: boolean;
}

export function describeApprovalConsequence(capabilityId: string): ApprovalConsequence | null {
  if (!isAgentCapabilityId(capabilityId)) return null;
  const capability = AGENT_CAPABILITY_REGISTRY[capabilityId];

  if (capability.readOnly) {
    return {
      effect: 'Reads your workspace. Approving changes nothing.',
      reversible: true,
      leavesWorkspace: false
    };
  }

  switch (capability.tier) {
    case 'SENSITIVE_ACTION':
      return {
        effect: `${capability.label} — takes effect immediately and cannot be undone.`,
        reversible: false,
        leavesWorkspace: false
      };
    case 'EXTERNAL_ACTION':
      return {
        // The one case where approving reaches something BrandOps does not own,
        // so it is the one the reader most needs named before deciding.
        effect: `${capability.label} — sends to a connected service outside BrandOps.`,
        reversible: false,
        leavesWorkspace: true
      };
    default:
      return {
        effect: `${capability.label} — writes to your workspace. Nothing leaves it.`,
        reversible: true,
        leavesWorkspace: false
      };
  }
}
