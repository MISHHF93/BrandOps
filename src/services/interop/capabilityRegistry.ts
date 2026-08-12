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
  return AGENT_CAPABILITY_REGISTRY[id].readOnly;
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
