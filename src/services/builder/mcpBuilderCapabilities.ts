/**
 * MCP Builder Capabilities — new capability definitions for the builder intelligence
 * tools exposed over MCP.
 */

import type { AgentCapabilityDefinition } from '../../types/agentInterop';

export type BuilderCapabilityId =
  | 'builder.context.read'
  | 'builder.achievements.list'
  | 'builder.achievements.verify'
  | 'builder.achievements.dismiss'
  | 'builder.opportunities.list'
  | 'builder.opportunities.convert-to-plan'
  | 'builder.opportunities.dismiss'
  | 'builder.twin-proposals.list'
  | 'builder.twin-proposals.accept'
  | 'builder.twin-proposals.reject'
  | 'builder.projects.list'
  | 'builder.projects.intelligence'
  | 'builder.receipts.list'
  | 'builder.sessions.list'
  | 'builder.sessions.revoke'
  | 'builder.activity.ingest'
  | 'builder.activity.ingest-session-summary'
  | 'builder.skill-packed-instructions'
  | 'builder.feature-registry.read';

const BUILDER_CAPABILITY_DEFINITIONS: readonly AgentCapabilityDefinition[] = [
  {
    id: 'builder.context.read',
    toolName: 'brandops_get_builder_context',
    label: 'Get builder context',
    description: 'Retrieve builder intelligence context: recent activity, verified achievements, active projects, and proposed opportunities.',
    tier: 'READ',
    access: 'auto',
    readOnly: true
  },
  {
    id: 'builder.achievements.list',
    toolName: 'brandops_list_achievements',
    label: 'List achievements',
    description: 'List verified and unverified achievements with their kind, confidence, and evidence.',
    tier: 'READ',
    access: 'auto',
    readOnly: true
  },
  {
    id: 'builder.achievements.verify',
    toolName: 'brandops_verify_achievement',
    label: 'Verify achievement',
    description: 'Verify an unverified achievement as USER_VERIFIED or INDEPENDENTLY_SUPPORTED.',
    tier: 'PREPARE',
    access: 'approval',
    readOnly: false
  },
  {
    id: 'builder.achievements.dismiss',
    toolName: 'brandops_dismiss_achievement',
    label: 'Dismiss achievement',
    description: 'Dismiss an unverified achievement (marks it as rejected for auditability).',
    tier: 'PREPARE',
    access: 'auto',
    readOnly: false
  },
  {
    id: 'builder.opportunities.list',
    toolName: 'brandops_list_opportunities',
    label: 'List opportunities',
    description: 'List ranked opportunity recommendations from verified achievements.',
    tier: 'READ',
    access: 'auto',
    readOnly: true
  },
  {
    id: 'builder.opportunities.convert-to-plan',
    toolName: 'brandops_convert_opportunity_to_plan',
    label: 'Convert opportunity to plan',
    description: 'Convert a high-value opportunity into a structured PlanDraft using the appropriate template.',
    tier: 'PREPARE',
    access: 'auto',
    readOnly: false
  },
  {
    id: 'builder.opportunities.dismiss',
    toolName: 'brandops_dismiss_opportunity',
    label: 'Dismiss opportunity',
    description: 'Dismiss an opportunity recommendation.',
    tier: 'PREPARE',
    access: 'auto',
    readOnly: false
  },
  {
    id: 'builder.twin-proposals.list',
    toolName: 'brandops_list_twin_proposals',
    label: 'List Twin proposals',
    description: 'List pending Twin update proposals from the professional signal engine or activity graph.',
    tier: 'READ',
    access: 'auto',
    readOnly: true
  },
  {
    id: 'builder.twin-proposals.accept',
    toolName: 'brandops_accept_twin_proposal',
    label: 'Accept Twin proposal',
    description: 'Accept a Twin update proposal (applies deltas to the Twin).',
    tier: 'PREPARE',
    access: 'approval',
    readOnly: false
  },
  {
    id: 'builder.twin-proposals.reject',
    toolName: 'brandops_reject_twin_proposal',
    label: 'Reject Twin proposal',
    description: 'Reject a Twin update proposal.',
    tier: 'PREPARE',
    access: 'auto',
    readOnly: false
  },
  {
    id: 'builder.projects.list',
    toolName: 'brandops_list_projects',
    label: 'List projects',
    description: 'List canonical Project objects with their status, achievements, and intelligence.',
    tier: 'READ',
    access: 'auto',
    readOnly: true
  },
  {
    id: 'builder.projects.intelligence',
    toolName: 'brandops_get_project_intelligence',
    label: 'Get project intelligence',
    description: 'Get derived project intelligence: status, recent milestones, professional value, documentation gaps, content potential.',
    tier: 'READ',
    access: 'auto',
    readOnly: true
  },
  {
    id: 'builder.receipts.list',
    toolName: 'brandops_list_receipts',
    label: 'List execution receipts',
    description: 'List execution receipts for recent commands with request, approval, result, and affected objects.',
    tier: 'READ',
    access: 'auto',
    readOnly: true
  },
  {
    id: 'builder.sessions.list',
    toolName: 'brandops_list_connected_sessions',
    label: 'List connected sessions',
    description: 'List connected external agent sessions with status, scopes, and last activity.',
    tier: 'READ',
    access: 'auto',
    readOnly: true
  },
  {
    id: 'builder.sessions.revoke',
    toolName: 'brandops_revoke_session',
    label: 'Revoke session',
    description: 'Revoke an external agent session (immediate, token can never be re-activated).',
    tier: 'EXTERNAL_ACTION',
    access: 'approval',
    readOnly: false
  },
  {
    id: 'builder.activity.ingest',
    toolName: 'brandops_ingest_activity',
    label: 'Ingest activity event',
    description: 'Ingest an activity event from an authorized source (user action, agent, integration, skill pack, dev hook, session-to-brand).',
    tier: 'GENERATE',
    access: 'auto',
    readOnly: false
  },
  {
    id: 'builder.activity.ingest-session-summary',
    toolName: 'brandops_ingest_session_summary',
    label: 'Ingest session summary',
    description: 'Ingest a development session summary from Session-to-Brand: work completed, problems solved, technologies used, potential achievement.',
    tier: 'GENERATE',
    access: 'approval',
    readOnly: false
  },
  {
    id: 'builder.skill-packed-instructions',
    toolName: 'brandops_get_skill_instructions',
    label: 'Get skill instructions',
    description: 'Get the portable instruction steps for a named skill pack (capture-achievement, turn-build-into-content, etc.).',
    tier: 'READ',
    access: 'auto',
    readOnly: true
  },
  {
    id: 'builder.feature-registry.read',
    toolName: 'brandops_get_feature_registry',
    label: 'Get feature registry',
    description: 'Get the machine-readable feature registry with maturity, wiring status, and test coverage for each capability.',
    tier: 'READ',
    access: 'auto',
    readOnly: true
  }
];

export const BUILDER_AGENT_CAPABILITY_DEFINITIONS = BUILDER_CAPABILITY_DEFINITIONS;

export function getBuilderCapability(id: BuilderCapabilityId): AgentCapabilityDefinition {
  return BUILDER_CAPABILITY_DEFINITIONS.find((d) => d.id === id) as AgentCapabilityDefinition;
}

export function isBuilderCapabilityId(value: string): value is BuilderCapabilityId {
  return BUILDER_CAPABILITY_DEFINITIONS.some((d) => d.id === value);
}

export function builderToolNameToCapabilityId(toolName: string): BuilderCapabilityId | null {
  const def = BUILDER_CAPABILITY_DEFINITIONS.find((d) => d.toolName === toolName);
  return def ? (def.id as BuilderCapabilityId) : null;
}
