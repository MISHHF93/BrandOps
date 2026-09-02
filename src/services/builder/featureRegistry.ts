/**
 * Feature Registry — machine-readable registry of all BrandOps capabilities.
 * Used during development/auditing to detect backend-only features, dead UI,
 * duplicated capabilities, and unsupported product claims.
 */

import type { FeatureRegistryEntry, FeatureMaturity } from '../../types/builder';
import type { BrandOpsData } from '../../types/domain';

/**
 * Unwired is not unwanted.
 *
 * Nine of this module's exports have no caller: `updateFeatureRegistry`,
 * `getFeatureById`, `getFeaturesByMaturity`, `getWiredFeatures`,
 * `getUnwiredFeatures`, `getBackendOnlyFeatures`, `getDeadUiFeatures`,
 * `detectDuplicates`, and the storage key they share. A previous cycle deleted
 * them for that reason, and that was the wrong call: they are a coherent query
 * API over the feature registry, and an unlinked function is work that has not
 * been connected yet rather than work nobody wanted.
 *
 * They are kept, and — more usefully — they are covered by
 * `featureRegistryQueries.test.ts`. Unwired code that nothing exercises is the
 * real hazard: it rots silently and then fails on the day somebody finally calls
 * it. Tested unwired code is a capability waiting for a caller.
 *
 * `updateFeatureRegistry` is the one that unlocks the rest. Nothing writes
 * `workspace.featureRegistry`, so every read falls through to the built-in
 * catalogue; wiring that write is what would make these queries answer about a
 * real workspace instead of a constant.
 */
export interface FeatureRegistryState {
  entries: FeatureRegistryEntry[];
  updatedAt: string;
}

export const FEATURE_REGISTRY_KEY = 'featureRegistry' as const;

export const DEFAULT_FEATURE_REGISTRY: FeatureRegistryEntry[] = [
  // Core capabilities
  {
    id: 'core-context-bundles',
    name: 'Context Bundles',
    description:
      'Purpose-scoped context retrieval for agents: PUBLIC_IDENTITY, BUILDER_CONTEXT, PROJECT_CONTEXT, WRITING_VOICE, CURRENT_GOALS, POSITIONING_CONTEXT, CONTENT_CONTEXT, EXECUTION_CONTEXT.',
    owningModule: 'interop',
    owningService: 'contextRetrieval.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['context.read'],
    integrationDependencies: [],
    maturity: 'STABLE',
    wired: true,
    tests: []
  },
  {
    id: 'core-mcp-gateway',
    name: 'MCP Gateway',
    description: 'Canonical MCP tool layer exposing agent capabilities over stdio transport.',
    owningModule: 'interop',
    owningService: 'mcp/server.ts',
    uiExposure: 'hidden',
    backendImplementation: true,
    requiredPermissions: [
      'context.read',
      'goals.read',
      'artifacts.read',
      'plans.read',
      'achievement.record',
      'artifact.create',
      'twin.propose_update',
      'opportunity.create',
      'plan.convert',
      'action.request'
    ],
    integrationDependencies: [],
    maturity: 'STABLE',
    wired: true,
    tests: []
  },
  {
    id: 'core-agent-sessions',
    name: 'Agent Sessions',
    description: 'External agent session lifecycle: create, resolve, revoke, token hashing.',
    owningModule: 'interop',
    owningService: 'sessions.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_REVOKE_AGENT'],
    integrationDependencies: [],
    maturity: 'STABLE',
    wired: true,
    tests: []
  },
  {
    id: 'core-agent-events',
    name: 'Agent Events',
    description:
      'Agent-reported professional signals with lifecycle: proposed → reviewed → verified → promoted.',
    owningModule: 'interop',
    owningService: 'events.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_INGEST_ACTIVITY', 'CAN_VERIFY_ACHIEVEMENT', 'CAN_PROMOTE_TO_TWIN'],
    integrationDependencies: [],
    maturity: 'STABLE',
    wired: true,
    tests: []
  },
  {
    id: 'core-agent-proposals',
    name: 'Agent Proposals',
    description:
      'Reviewable proposals for twin updates, artifacts, content opportunities, and external actions.',
    owningModule: 'interop',
    owningService: 'proposals.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_CREATE_DRAFT', 'CAN_PROPOSE_TWIN_CHANGE', 'CAN_CREATE_OPPORTUNITY'],
    integrationDependencies: [],
    maturity: 'STABLE',
    wired: true,
    tests: []
  },
  {
    id: 'core-plan-conversion',
    name: 'Plan Conversion',
    description:
      'Convert Ask responses, agent achievements, and opportunities into typed PlanDrafts.',
    owningModule: 'plan',
    owningService: 'askPlanConversion.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_CONVERT_TO_PLAN'],
    integrationDependencies: [],
    maturity: 'STABLE',
    wired: true,
    tests: ['askPlanConversion.test.ts']
  },
  {
    id: 'core-plan-execution',
    name: 'Plan Execution',
    description: 'Plan execution with checkpoints, verification, and receipts.',
    owningModule: 'execution',
    owningService: 'planExecutor.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_CREATE_PLAN'],
    integrationDependencies: [],
    maturity: 'BETA',
    wired: true,
    tests: ['planExecutor.test.ts']
  },
  {
    id: 'core-digital-twin',
    name: 'Digital Twin',
    description:
      'Persistent digital twin with identity, resume profile, memory, and generated assets.',
    owningModule: 'digitalTwin',
    owningService: 'digitalTwin.ts',
    uiExposure: 'ask',
    backendImplementation: true,
    requiredPermissions: ['CAN_PROPOSE_TWIN_CHANGE', 'CAN_PROMOTE_TO_TWIN'],
    integrationDependencies: [],
    maturity: 'STABLE',
    wired: true,
    tests: ['digitalTwin.test.ts']
  },
  {
    id: 'core-workspace-intelligence',
    name: 'Workspace Intelligence',
    description: 'Living DNA, decisions, scorecard, opportunities, and playbook.',
    owningModule: 'workspaceIntelligence',
    owningService: 'workspaceIntelligence.ts',
    uiExposure: 'dashboard',
    backendImplementation: true,
    requiredPermissions: ['CAN_READ_CONTEXT'],
    integrationDependencies: [],
    maturity: 'BETA',
    wired: true,
    tests: []
  },
  // Builder intelligence (new)
  {
    id: 'builder-activity-graph',
    name: 'Builder Activity Graph',
    description:
      'Canonical entities for ActivityEvent, Achievement, Project, SkillEvidence, Artifact, Relationship, Goal, Outcome. Ingests activity from authorized sources with deduplication.',
    owningModule: 'builder',
    owningService: 'activityGraph.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_INGEST_ACTIVITY'],
    integrationDependencies: ['core-agent-events', 'core-plan-execution'],
    maturity: 'EXPERIMENTAL',
    wired: true,
    tests: []
  },
  {
    id: 'builder-achievement-detector',
    name: 'Achievement Detector',
    description:
      'Detects meaningful milestones from activity events. Surfaces as "BrandOps noticed something worth remembering."',
    owningModule: 'builder',
    owningService: 'achievementDetector.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_INGEST_ACTIVITY', 'CAN_VERIFY_ACHIEVEMENT'],
    integrationDependencies: ['builder-activity-graph'],
    maturity: 'EXPERIMENTAL',
    wired: true,
    tests: []
  },
  {
    id: 'builder-achievement-service',
    name: 'Achievement Service',
    description:
      'Verify, edit, dismiss achievements. Create artifacts from achievements. Promote to Twin.',
    owningModule: 'builder',
    owningService: 'achievementService.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_VERIFY_ACHIEVEMENT', 'CAN_PROMOTE_TO_TWIN'],
    integrationDependencies: ['builder-activity-graph', 'core-digital-twin'],
    maturity: 'EXPERIMENTAL',
    wired: true,
    tests: []
  },
  {
    id: 'builder-opportunity-engine',
    name: 'Opportunity Engine',
    description:
      'Evaluates CONTENT, PORTFOLIO, POSITIONING, OUTREACH, and FOLLOW_UP opportunities from verified achievements.',
    owningModule: 'builder',
    owningService: 'opportunityEngine.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_CREATE_OPPORTUNITY'],
    integrationDependencies: ['builder-activity-graph'],
    maturity: 'EXPERIMENTAL',
    wired: true,
    tests: []
  },
  {
    id: 'builder-professional-signal-engine',
    name: 'Professional Signal Engine',
    description:
      'Derives non-sensitive professional signals from verified activity. Creates TwinUpdateProposal when thresholds are crossed.',
    owningModule: 'builder',
    owningService: 'professionalSignalEngine.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_PROPOSE_TWIN_CHANGE'],
    integrationDependencies: ['builder-activity-graph', 'core-digital-twin'],
    maturity: 'EXPERIMENTAL',
    wired: true,
    tests: []
  },
  {
    id: 'builder-twin-delta-engine',
    name: 'Twin Delta Engine',
    description:
      'Calculates explicit deltas between existing Twin state and new verified information. Requires confirmation for material changes.',
    owningModule: 'builder',
    owningService: 'twinDeltaEngine.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_PROPOSE_TWIN_CHANGE'],
    integrationDependencies: ['core-digital-twin'],
    maturity: 'EXPERIMENTAL',
    wired: true,
    tests: []
  },
  {
    id: 'builder-context-inspector',
    name: 'Context Inspector',
    description:
      'User-facing "Context used" control showing categories and concise evidence for Ask responses, recommendations, Twin updates, and Plans.',
    owningModule: 'builder',
    owningService: 'contextRetrieval.ts',
    uiExposure: 'ask',
    backendImplementation: true,
    requiredPermissions: ['CAN_READ_CONTEXT'],
    integrationDependencies: ['core-context-bundles'],
    maturity: 'EXPERIMENTAL',
    wired: false,
    tests: []
  },
  {
    id: 'builder-project-intelligence',
    name: 'Project Intelligence',
    description:
      'Canonical Project object linking verified achievements, artifacts, goals, plans, and outcomes. Calculates status, milestones, value, documentation gaps.',
    owningModule: 'builder',
    owningService: 'projectIntelligence.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_READ_CONTEXT'],
    integrationDependencies: ['builder-activity-graph'],
    maturity: 'EXPERIMENTAL',
    wired: true,
    tests: []
  },
  {
    id: 'builder-opportunity-radar',
    name: 'Opportunity Radar',
    description:
      'Consolidated opportunity recommendations in 8 categories: BUILD, PUBLISH, CONNECT, FOLLOW_UP, POSITION, DOCUMENT, LEARN, AUTOMATE.',
    owningModule: 'builder',
    owningService: 'opportunityRadar.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_CREATE_OPPORTUNITY'],
    integrationDependencies: ['builder-activity-graph', 'builder-opportunity-engine'],
    maturity: 'EXPERIMENTAL',
    wired: true,
    tests: []
  },
  {
    id: 'builder-plan-compiler',
    name: 'Plan Compiler',
    description:
      'Compiles Ask/Artifact/Opportunity inputs into typed PlanDrafts with 10 plan templates.',
    owningModule: 'builder',
    owningService: 'planCompiler.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_CONVERT_TO_PLAN'],
    integrationDependencies: ['core-plan-conversion'],
    maturity: 'EXPERIMENTAL',
    wired: true,
    tests: []
  },
  {
    id: 'builder-plan-dependency-engine',
    name: 'Plan Dependency Engine',
    description:
      'Allows PlanSteps to declare dependencies. Computes READY, BLOCKED, WAITING_APPROVAL, RUNNING, DONE, FAILED states.',
    owningModule: 'builder',
    owningService: '',
    uiExposure: 'plan',
    backendImplementation: false,
    requiredPermissions: ['CAN_CREATE_PLAN'],
    integrationDependencies: ['core-plan-execution'],
    maturity: 'EXPERIMENTAL',
    wired: false,
    tests: []
  },
  {
    id: 'builder-execution-receipt',
    name: 'Execution Receipt',
    description:
      'Standardized durable receipt for every consequential command with request/approval/result/verification/affected objects.',
    owningModule: 'builder',
    owningService: 'executionReceiptService.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_READ_EXECUTION_RECEIPT'],
    integrationDependencies: ['core-plan-execution'],
    maturity: 'EXPERIMENTAL',
    wired: true,
    tests: []
  },
  {
    id: 'builder-policy-engine',
    name: 'Policy Engine',
    description:
      'Centralized authorization decisions. All frontend, AI, MCP, and external clients resolve through the same policy service.',
    owningModule: 'builder',
    owningService: 'policyEngine.ts',
    uiExposure: 'hidden',
    backendImplementation: true,
    requiredPermissions: [],
    integrationDependencies: ['core-agent-sessions', 'core-agent-proposals'],
    maturity: 'EXPERIMENTAL',
    wired: true,
    tests: []
  },
  {
    id: 'builder-skill-pack',
    name: 'Skill Pack',
    description: 'Reusable, portable workflow definitions for common BrandOps workflows.',
    owningModule: 'builder',
    owningService: 'skillPack.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: [],
    integrationDependencies: ['builder-activity-graph', 'builder-opportunity-engine'],
    maturity: 'EXPERIMENTAL',
    wired: true,
    tests: []
  },
  {
    id: 'builder-session-to-brand',
    name: 'Session to Brand',
    description:
      'Summarize Work for BrandOps command. Receives authorized session evidence and returns structured analysis.',
    owningModule: 'builder',
    owningService: 'sessionToBrand.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_INGEST_ACTIVITY'],
    integrationDependencies: ['builder-activity-graph'],
    maturity: 'EXPERIMENTAL',
    wired: true,
    tests: []
  },
  {
    id: 'builder-daily-builder-brief',
    name: 'Daily Builder Brief',
    description:
      'Concise optional briefing from actual BrandOps state: top priority, active plan, recent achievement, highest-value opportunity, pending approvals, suggested next action.',
    owningModule: 'builder',
    owningService: '',
    uiExposure: 'plan',
    backendImplementation: false,
    requiredPermissions: ['CAN_READ_CONTEXT'],
    integrationDependencies: ['builder-activity-graph'],
    maturity: 'EXPERIMENTAL',
    wired: false,
    tests: []
  },
  {
    id: 'builder-weekly-professional-review',
    name: 'Weekly Professional Review',
    description:
      'Review artifact with verified work completed, achievements accepted, artifacts created, plans completed, outcomes, goals advanced, opportunities, proposed Twin deltas, and learnings.',
    owningModule: 'builder',
    owningService: '',
    uiExposure: 'plan',
    backendImplementation: false,
    requiredPermissions: ['CAN_READ_CONTEXT'],
    integrationDependencies: ['builder-activity-graph'],
    maturity: 'EXPERIMENTAL',
    wired: false,
    tests: []
  },
  {
    id: 'builder-feature-registry',
    name: 'Feature Registry',
    description: 'Machine-readable registry of all BrandOps capabilities for development/auditing.',
    owningModule: 'builder',
    owningService: 'featureRegistry.ts',
    uiExposure: 'hidden',
    backendImplementation: true,
    requiredPermissions: ['CAN_READ_FEATURE_REGISTRY'],
    integrationDependencies: [],
    maturity: 'BETA',
    wired: true,
    tests: []
  },
  {
    id: 'builder-connected-ai-agents',
    name: 'Connected AI Agents',
    description:
      'Flat expandable section in PLAN listing authorized clients with connection status, scopes, last activity.',
    owningModule: 'builder',
    owningService: 'ConnectedAgentsPanel.tsx (UI) + sessions.ts (backend)',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_REVOKE_AGENT'],
    integrationDependencies: ['core-agent-sessions'],
    maturity: 'BETA',
    wired: true,
    tests: []
  },
  {
    id: 'builder-agent-trust-center',
    name: 'Agent Trust Center',
    description:
      'Compact PLAN section for inspecting which agents have access to which context bundles and commands, revoking them, and reviewing recent events.',
    owningModule: 'builder',
    owningService: 'sessions.ts, gateway.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_REVOKE_AGENT', 'CAN_READ_CONTEXT'],
    integrationDependencies: ['core-agent-sessions', 'core-mcp-gateway'],
    maturity: 'EXPERIMENTAL',
    wired: false,
    tests: []
  },
  {
    id: 'builder-approval-inbox',
    name: 'Approval Inbox',
    description:
      'Flattened "Needs You" stream in PLAN combining plan approvals, Twin update proposals, achievement verification, connection permission requests, and sensitive actions.',
    owningModule: 'builder',
    owningService: 'proposals.ts, events.ts',
    uiExposure: 'plan',
    backendImplementation: true,
    requiredPermissions: ['CAN_PROPOSE_TWIN_CHANGE', 'CAN_VERIFY_ACHIEVEMENT', 'CAN_REVOKE_AGENT'],
    integrationDependencies: ['core-agent-proposals', 'core-agent-events'],
    maturity: 'EXPERIMENTAL',
    wired: false,
    tests: []
  },
  {
    id: 'builder-source-health-hooks',
    name: 'Source Health Hooks',
    description:
      'Deterministic agent lifecycle hooks for formatter/linter/typecheck/tests after code modifications.',
    owningModule: 'builder',
    owningService: '',
    uiExposure: 'hidden',
    backendImplementation: false,
    requiredPermissions: [],
    integrationDependencies: [],
    maturity: 'EXPERIMENTAL',
    wired: false,
    tests: []
  },
  {
    id: 'builder-agent-evaluation-suite',
    name: 'Agent Evaluation Suite',
    description:
      'Regression scenarios for Twin grounding, achievement detection, Context Bundle isolation, Ask quality, MCP authorization, prompt injection, etc.',
    owningModule: 'builder',
    owningService: '',
    uiExposure: 'hidden',
    backendImplementation: false,
    requiredPermissions: [],
    integrationDependencies: ['core-context-bundles', 'builder-activity-graph', 'core-mcp-gateway'],
    maturity: 'EXPERIMENTAL',
    wired: false,
    tests: []
  },
  {
    id: 'builder-self-verification-gate',
    name: 'Self-Verification Gate',
    description:
      'After implementing each feature batch, automatically trace the relevant user path, run tests, and mark as VERIFIED/PARTIAL/FAILED/UNVERIFIED.',
    owningModule: 'builder',
    owningService: '',
    uiExposure: 'hidden',
    backendImplementation: false,
    requiredPermissions: [],
    integrationDependencies: ['builder-feature-registry', 'builder-agent-evaluation-suite'],
    maturity: 'EXPERIMENTAL',
    wired: false,
    tests: []
  }
];

/**
 * The workspace's registry, or the catalogue this build ships with.
 *
 * The fallback used to stamp `updatedAt: new Date().toISOString()` — a freshness
 * claim on a hardcoded constant. Nothing writes `workspace.featureRegistry` yet,
 * so that branch runs on every call, and every call reported the built-in list
 * as though it had just been recomputed.
 *
 * A caller cannot tell a stored registry from the default by looking at the
 * entries, so the timestamp is the only thing that could carry the distinction —
 * and it was actively erasing it. `BUILT_IN_AT` is the constant's own identity:
 * it does not change because the list does not change.
 */
const BUILT_IN_AT = 'built-in';

export function getFeatureRegistryState(workspace: BrandOpsData): FeatureRegistryState {
  const existing = workspace.featureRegistry;
  if (existing && existing.entries.length > 0) {
    return existing;
  }
  return {
    entries: DEFAULT_FEATURE_REGISTRY,
    updatedAt: BUILT_IN_AT
  };
}

export function updateFeatureRegistry(
  workspace: BrandOpsData,
  entries: FeatureRegistryEntry[],
  updatedAt?: string
): BrandOpsData {
  const now = updatedAt ?? new Date().toISOString();
  return {
    ...workspace,
    featureRegistry: {
      entries,
      updatedAt: now
    }
  };
}

export function getFeatureById(
  registry: FeatureRegistryState,
  id: string
): FeatureRegistryEntry | null {
  return registry.entries.find((e) => e.id === id) ?? null;
}

export function getFeaturesByMaturity(
  registry: FeatureRegistryState,
  maturity: FeatureMaturity
): FeatureRegistryEntry[] {
  return registry.entries.filter((e) => e.maturity === maturity);
}

export function getWiredFeatures(registry: FeatureRegistryState): FeatureRegistryEntry[] {
  return registry.entries.filter((e) => e.wired);
}

export function getUnwiredFeatures(registry: FeatureRegistryState): FeatureRegistryEntry[] {
  return registry.entries.filter((e) => !e.wired);
}

/**
 * Implemented and wired, with no surface a user can reach.
 *
 * This tested `uiExposure === 'hidden'` only, and the field's type also allows
 * `'none'` — both of which mean the same thing here: nothing user-facing. The
 * shipped catalogue happens to use only `hidden`, so the gap returned the right
 * answer today and would have silently under-reported the first time an entry
 * used the other value. Found by exercising the function rather than by reading
 * it, which is the argument for testing code that has no caller yet.
 */
export function getBackendOnlyFeatures(registry: FeatureRegistryState): FeatureRegistryEntry[] {
  return registry.entries.filter((e) => e.backendImplementation && !hasUserSurface(e) && e.wired);
}

/** `hidden` and `none` both mean the user cannot get to it. */
function hasUserSurface(entry: FeatureRegistryEntry): boolean {
  return entry.uiExposure !== 'hidden' && entry.uiExposure !== 'none';
}

/** A surface the user can reach that is not wired end to end. */
export function getDeadUiFeatures(registry: FeatureRegistryState): FeatureRegistryEntry[] {
  return registry.entries.filter((e) => hasUserSurface(e) && !e.wired);
}

export function detectDuplicates(registry: FeatureRegistryState): FeatureRegistryEntry[] {
  const seen = new Map<string, FeatureRegistryEntry[]>();
  for (const entry of registry.entries) {
    const key = [entry.owningModule, entry.name.toLowerCase()].join(':');
    if (seen.has(key)) {
      seen.get(key)!.push(entry);
    } else {
      seen.set(key, [entry]);
    }
  }
  const duplicates: FeatureRegistryEntry[] = [];
  for (const [, entries] of seen) {
    if (entries.length > 1) {
      duplicates.push(...entries);
    }
  }
  return duplicates;
}
