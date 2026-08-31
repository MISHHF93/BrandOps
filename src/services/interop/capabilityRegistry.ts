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
    access: 'auto',
    readOnly: true
  },
  'plans.read': {
    id: 'plans.read',
    toolName: 'brandops_get_plan_status',
    label: 'Get plan status',
    description: 'Read status and steps of a saved PLAN by id.',
    tier: 'READ',
    access: 'auto',
    readOnly: true
  },
  'achievement.record': {
    id: 'achievement.record',
    toolName: 'brandops_record_achievement',
    label: 'Record achievement',
    description:
      'Propose a professional achievement signal (feature shipped, release, documentation, milestone, decision, contribution). Always AGENT_REPORTED; never auto-promotes to a verified Twin fact.',
    tier: 'GENERATE',
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
    access: 'auto',
    readOnly: false
  },
  'builder.achievements.dismiss': {
    id: 'builder.achievements.dismiss',
    toolName: 'brandops_dismiss_achievement',
    label: 'Dismiss achievement',
    description:
      'Dismiss an unverified achievement (marks it as rejected for auditability).',
    tier: 'PREPARE',
    access: 'auto',
    readOnly: false
  },
  'builder.opportunities.list': {
    id: 'builder.opportunities.list',
    toolName: 'brandops_list_opportunities',
    label: 'List opportunities',
    description:
      'List ranked opportunity recommendations from verified achievements.',
    tier: 'READ',
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
    access: 'auto',
    readOnly: false
  },
  'builder.opportunities.dismiss': {
    id: 'builder.opportunities.dismiss',
    toolName: 'brandops_dismiss_opportunity',
    label: 'Dismiss opportunity',
    description: 'Dismiss an opportunity recommendation.',
    tier: 'PREPARE',
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
    access: 'auto',
    readOnly: true
  },
  'builder.twin-proposals.accept': {
    id: 'builder.twin-proposals.accept',
    toolName: 'brandops_accept_twin_proposal',
    label: 'Accept Twin proposal',
    description:
      'Accept a Twin update proposal (applies deltas to the Twin).',
    tier: 'PREPARE',
    access: 'auto',
    readOnly: false
  },
  'builder.twin-proposals.reject': {
    id: 'builder.twin-proposals.reject',
    toolName: 'brandops_reject_twin_proposal',
    label: 'Reject Twin proposal',
    description: 'Reject a Twin update proposal.',
    tier: 'PREPARE',
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
    access: 'auto',
    readOnly: true
  },
  'builder.sessions.list': {
    id: 'builder.sessions.list',
    toolName: 'brandops_list_connected_sessions',
    label: 'List connected sessions',
    description:
      'List connected external agent sessions with status, scopes, and last activity.',
    tier: 'READ',
    access: 'auto',
    readOnly: true
  },
  'builder.sessions.revoke': {
    id: 'builder.sessions.revoke',
    toolName: 'brandops_revoke_session',
    label: 'Revoke session',
    description:
      'Revoke an external agent session (immediate, token can never be re-activated). Approval-gated.',
    tier: 'EXTERNAL_ACTION',
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

/** Read capabilities — the only ones a read-only session may be granted. */
export function isReadCapability(id: AgentCapabilityId): boolean {
  return id.endsWith('.read');
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
