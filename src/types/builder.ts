/**
 * Canonical Builder Intelligence contracts.
 *
 * These types are the shared backbone for the activity graph, achievement
 * detector, professional signals, twin deltas, project intelligence, opportunity
 * radar, plan compiler, execution receipts, and policy engine.
 *
 * Design rules:
 * - Every event carries `source`, `sourceId`, `timestamp`, `confidence`,
 *   `verificationStatus`, and `workspaceId`.
 * - Imported/agent-reported accomplishments are `UNVERIFIED` until confirmed or
 *   independently supported.
 * - No type here duplicates shapes already in `domain.ts` — extend `BrandOpsData`
 *   additions live in the storage layer, not here.
 */

import type { TrustTier } from './agentInterop';

// Re-export TrustTier from agentInterop for backward compat
export type { TrustTier } from './agentInterop';

// ---------------------------------------------------------------------------
// Activity Event
// ---------------------------------------------------------------------------

export type ActivityEventSource =
  | 'user-action'
  | 'agent-reported'
  | 'integration-import'
  | 'skill-pack'
  | 'dev-hook'
  | 'session-to-brand'
  | 'manual';

export type ActivityEventKind =
  | 'work-start'
  | 'work-progress'
  | 'work-session-complete'
  | 'feature-built'
  | 'refactor-completed'
  | 'release-prepared'
  | 'repository-released'
  | 'integration-completed'
  | 'documentation-published'
  | 'benchmark-improved'
  | 'hackathon-submission'
  | 'project-milestone'
  | 'artifact-created'
  | 'plan-approved'
  | 'plan-executed'
  | 'outcome-observed'
  | 'skill-evidence'
  | 'goal-advanced'
  | 'relationship-formed'
  | 'content-published'
  | 'external-agent-event'
  | 'developer-session'
  // Achievement-detector event kinds (mirror AchievementKind for detector output)
  | 'feature-shipped'
  | 'product-launched'
  | 'open-source-contribution'
  | 'significant-refactor'
  | 'project-milestone-reached'
  | 'outcome-achieved'
  | 'skill-demonstrated'
  | 'significant-refactor-completed';

export type VerificationStatus =
  | 'UNVERIFIED'
  | 'INDEPENDENTLY_SUPPORTED'
  | 'USER_VERIFIED'
  | 'SYSTEM_VERIFIED';

/*
 * REMOVED (2026-08-31): `trustTierLabel`, `strongestTier` and `isUsableAsFact`
 * lived here as a second implementation of the trust-tier semantics that
 * `services/interop/trustBoundaries.ts` already owns — down to a **third,
 * inlined copy of the rank table**, separate from `TRUST_TIER_RANK` in
 * `agentInterop.ts`. They agreed today; nothing kept them agreeing, and a change
 * to the canonical rank would silently not have reached this copy.
 *
 * Nothing imported them — every import of this module is `import type` — so they
 * were dead weight *and* a drift hazard: an auto-import of `isUsableAsFact`
 * would have picked whichever the editor offered first, and the two answer the
 * same question about a trust boundary. Use `trustBoundaries.ts`, which reads
 * the canonical `TRUST_TIER_RANK`.
 *
 * This is a types module. It should not ship behavior at all.
 */

// ---------------------------------------------------------------------------
// Activity Event
// ---------------------------------------------------------------------------

export interface ActivityEvent {
  id: string;
  workspaceId: string;
  source: ActivityEventSource;
  sourceId: string;
  kind: ActivityEventKind;
  title: string;
  detail: string;
  /** Verified-at timestamp (set when achievement is verified; not on raw events). */
  verifiedAt?: string;
  timestamp: string;
  confidence: number;
  verificationStatus: VerificationStatus;
  trustTier: TrustTier;
  fingerprint?: string;
  entityRefs: EntityRef[];
  evidence?: EvidenceEntry[];
  recordedBy: string;
  recordedReason?: string;
  createdAt: string;
  updatedAt: string;
  relatedAchievements?: string[];
}

export interface EntityRef {
  type: EntityRefType;
  id: string;
  label?: string;
}

export type EntityRefType =
  | 'achievement'
  | 'project'
  | 'artifact'
  | 'goal'
  | 'outcome'
  | 'skillEvidence'
  | 'relationship'
  | 'externalAgentEvent'
  | 'plan'
  | 'twin';

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export interface EvidenceEntry {
  /** e.g. git:owner/repo@sha, release:v1.2.3, file:docs/api.md, url:… */
  ref: string;
  kind: EvidenceKind;
  label: string;
  /** Optional external fetch URL for independent verification. */
  verificationUrl?: string;
}

export type EvidenceKind =
  | 'git'
  | 'release'
  | 'document'
  | 'milestone'
  | 'link'
  | 'metric'
  | 'screenshot'
  | 'code'
  | 'test'
  | 'other';

// ---------------------------------------------------------------------------
// Achievement
// ---------------------------------------------------------------------------

export type AchievementKind =
  | 'feature-shipped'
  | 'repository-released'
  | 'product-launched'
  | 'open-source-contribution'
  | 'significant-refactor'
  | 'documentation-published'
  | 'benchmark-improved'
  | 'integration-completed'
  | 'hackathon-submission'
  | 'project-milestone-reached'
  | 'skill-demonstrated'
  | 'content-published'
  | 'outcome-achieved'
  | 'goal-advanced'
  | 'significant-refactor-completed';

export interface Achievement extends ActivityEvent {
  /** Structured professional relevance tags. */
  professionalRelevance: string[];
  /** Which projects this achievement supports. */
  projectIds: string[];
  /** Which goals this achievement supports. */
  goalIds: string[];
  /** Linked artifacts (evidence artifacts, not the achievement itself). */
  artifactIds: string[];
  /** Source events that support this achievement. */
  sourceEventIds: string[];
  /** When the user promoted this to verified professional history. */
  verifiedAt?: string;
  /** Optional summary the Twin may use. */
  twinSummary?: string;
  /** Dismissal status. */
  dismissed?: boolean;
  /** Event id reference (legacy compatibility). */
  eventId?: string;
}

// ---------------------------------------------------------------------------
// Achievement Candidate (detector output)
// ---------------------------------------------------------------------------

export interface AchievementCandidate {
  id: string;
  workspaceId: string;
  eventId: string;
  title: string;
  description: string;
  evidence: EvidenceEntry[];
  sourceEvents: string[];
  confidence: number;
  professionalRelevance: string[];
  verificationRequired: boolean;
  kind: AchievementKind;
  suggestedKind?: AchievementKind;
  /** Why the detector believes this is worth remembering. */
  reason: string;
  /** Timestamp the detector fired. */
  detectedAt: string;
  /** When the candidate was last updated. */
  updatedAt: string;
  /** When the user verified this candidate (if verified). */
  verifiedAt?: string;
  /** When the user dismissed this candidate (if dismissed). */
  dismissed?: boolean;
  /** When the user dismissed this candidate (if dismissed). */
  dismissedAt?: string;
  /** Note provided when dismissing. */
  dismissalReason?: string;
  /** Suggested actions for the UI. */
  suggestedActions?: { action: string; label: string; requiresConfirmation?: boolean }[];
  /** Suggested conversion to plan/content. */
  suggestedConversion?: { enabled: boolean; planPreset?: string; note?: string };
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  summary: string;
  /** Optional external references when authorized. */
  externalRefs?: ProjectExternalRef[];
  /** Linked verified achievements. */
  achievementIds: string[];
  /** Linked artifacts. */
  artifactIds: string[];
  /** Linked goals. */
  goalIds: string[];
  /** Linked plans. */
  planIds: string[];
  /** Linked outcomes. */
  outcomeIds: string[];
  /** Status derived from linked achievements/plans/outcomes. */
  projectStatus: ProjectStatus;
  /** Recent verified milestones (derived). */
  recentMilestones: ProjectMilestone[];
  /** Professional value score (derived, 0–1). */
  professionalValue: number;
  /** Documentation gaps detected. */
  missingDocumentation: string[];
  /** Content potential score (derived, 0–1). */
  contentPotential: number;
  /** Derived tags from achievements/artifacts. */
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'active' | 'completed' | 'paused' | 'stalled' | 'unknown';

export interface ProjectMilestone {
  achievementId: string;
  title: string;
  kind: AchievementKind;
  achievedAt: string;
  confidence: number;
}

export interface ProjectExternalRef {
  kind: 'repository' | 'website' | 'document' | 'link';
  ref: string;
  label: string;
  authorized: boolean;
}

// ---------------------------------------------------------------------------
// Skill Evidence
// ---------------------------------------------------------------------------

export interface SkillEvidence {
  id: string;
  workspaceId: string;
  skillArea: string;
  /** What demonstrated this skill. */
  evidence: EvidenceEntry[];
  /** Linked achievement/event ids. */
  sourceIds: string[];
  /** Confidence the skill area is genuinely demonstrated. */
  confidence: number;
  firstObservedAt: string;
  lastObservedAt: string;
  /** Optional proficiency hint (never invented; only from evidence strength). */
  demonstratedLevel?: 'introduced' | 'applied' | 'proficient' | 'expert';
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Artifact
// ---------------------------------------------------------------------------

export interface Artifact {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  artifactType: string;
  /** Linked achievement/event/project ids. */
  sourceIds: string[];
  /** External URL when authorized. */
  externalUrl?: string;
  externalId?: string;
  tags: string[];
  /** Trust tier of the source material. */
  trustTier: TrustTier;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Relationship
// ---------------------------------------------------------------------------

export type RelationshipKind =
  | 'BUILT'
  | 'SHIPPED'
  | 'CONTRIBUTED_TO'
  | 'LEARNED'
  | 'PUBLISHED'
  | 'ACHIEVED'
  | 'SUPPORTS_GOAL'
  | 'GENERATED_ARTIFACT'
  | 'PRODUCED_OUTCOME';

export interface Relationship {
  id: string;
  workspaceId: string;
  kind: RelationshipKind;
  sourceType: EntityRefType;
  sourceId: string;
  targetType: EntityRefType;
  targetId: string;
  confidence: number;
  evidence?: EvidenceEntry[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Goal
// ---------------------------------------------------------------------------

export interface Goal {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  /** Linked achievement/outcome ids that advance this goal. */
  supportingEvidenceIds: string[];
  /** When the user set this goal. */
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Outcome
// ---------------------------------------------------------------------------

export interface Outcome {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  outcomeType: 'milestone' | 'metric' | 'launch' | 'impact' | 'learning';
  /** Linked achievement/project/plan ids. */
  sourceIds: string[];
  /** Optional measurable result. */
  measurableResult?: string;
  trustTier: TrustTier;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Professional Signal
// ---------------------------------------------------------------------------

export type ProfessionalSignalKind =
  | 'frequently-builds-ai-agent-infrastructure'
  | 'publishes-technical-content'
  | 'currently-prioritizing-developer-tooling'
  | 'ships-products'
  | 'improves-performance'
  | 'contributes-to-open-source'
  | 'delivers-milestones'
  | 'writes-documentation'
  | 'significant-refactor-completed';

export interface ProfessionalSignal {
  id: string;
  workspaceId: string;
  claim: string;
  kind: ProfessionalSignalKind;
  evidenceIds: string[];
  confidence: number;
  firstObservedAt: string;
  lastObservedAt: string;
  status: 'observed' | 'proposed' | 'user-accepted' | 'user-rejected';
  userVerified: boolean;
  /** Reason the engine derived this signal. */
  reason: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Execution Receipt
// ---------------------------------------------------------------------------

export type TwinDeltaField =
  | 'identity/headline'
  | 'identity/summary'
  | 'identity/professionalPositioning'
  | 'identity/targetAudience'
  | 'identity/toneOfVoice'
  | 'identity/strengths'
  | 'identity/differentiators'
  | 'resume/skills'
  | 'resume/experience'
  | 'resume/projects'
  | 'twin/claims'
  | 'twin/positioning'
  | 'twin/differentiators'
  | 'resume/achievements'
  | 'identity/expertiseAreas'
  | 'goals';

export type TwinDeltaEvidence = EvidenceEntry | { type: string; id: string };

export interface TwinDelta {
  id: string;
  workspaceId: string;
  field: TwinDeltaField;
  previousValue: string;
  proposedValue: string;
  evidence: TwinDeltaEvidence[];
  reason: string;
  confidence: number;
  /** Who/what proposed this delta. */
  proposedBy:
    | 'signal-engine'
    | 'activity-graph'
    | 'project-intelligence'
    | 'user'
    | 'session-to-brand'
    | 'opportunity-engine'
    | 'professional-signal-engine';
  status: 'proposed' | 'accepted' | 'edited' | 'rejected';
  /** When the user accepted/edited/rejected. */
  decidedAt?: string;
  decisionNote?: string;
  createdAt: string;
  /** Whether this delta requires explicit user confirmation before applying. */
  requiresConfirmation?: boolean;
  /** When the delta was applied (set on acceptance). */
  appliedAt?: string;
  /** Where the delta originated. */
  source?: string;
  /** Source identifier (e.g. event id, signal id). */
  sourceId?: string;
  /** Timestamp (alias for createdAt, used by some consumers). */
  timestamp?: string;
  /** Professional signal kind that triggered this delta, if any. */
  signalKind?: ProfessionalSignalKind;
}

// ---------------------------------------------------------------------------
// Twin Update Proposal (user-facing prompt for Twin Delta)
// ---------------------------------------------------------------------------

export interface TwinUpdateProposal {
  id: string;
  workspaceId: string;
  deltas: TwinDelta[];
  summary: string;
  evidence: TwinDeltaEvidence[];
  confidence: number;
  reason: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  sourceId?: string;
  source?: string;
  /** Whether any delta in this proposal requires explicit user confirmation. */
  requiresConfirmation?: boolean;
}

// ---------------------------------------------------------------------------
// Twin Version (version history for Twin changes)
// ---------------------------------------------------------------------------

/**
 * One snapshot of the Twin, as `applyDeltas` produces it.
 *
 * This concept was declared **twice** — a five-field stub here and the real
 * thirteen-field shape in `twinDeltaEngine.ts` — and the two were incompatible.
 * Nothing used the stub, so nothing failed, right up until the version history
 * was wired and the two definitions met.
 *
 * The engine's shape is the one that exists at runtime, so it lives here where
 * types belong and the engine imports it.
 */
export interface TwinVersion {
  id: string;
  workspaceId: string;
  twinId: string;
  snapshot: {
    headline: string;
    summary: string;
    professionalPositioning: string;
    targetAudience: string;
    toneOfVoice: string;
    expertiseAreas: string[];
    skills: string[];
    achievements: string[];
    goals: string[];
  };
  previousSnapshot: {
    headline: string;
    summary: string;
    professionalPositioning: string;
    targetAudience: string;
    toneOfVoice: string;
    expertiseAreas: string[];
    skills: string[];
    achievements: string[];
    goals: string[];
  };
  changes: Array<{ field: string; from: string; to: string; status: string }>;
  appliedBy: string;
  appliedAt: string;
  appliedDeltas: string[];
  deltaCount: number;
  hasMaterialChanges: boolean;
}

export interface TwinVersionHistory {
  versions: TwinVersion[];
  currentVersion: number;
}

export interface TwinVersionHistoryState {
  versions: TwinVersion[];
  currentVersion: number;
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export interface PlanStep {
  id: string;
  stepIndex: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
  blockReason?: string;
}

export interface Plan {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  objectives: string[];
  steps: PlanStep[];
  status: 'draft' | 'pending-approval' | 'approved' | 'in-progress' | 'completed' | 'cancelled';
  source: string;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

// ---------------------------------------------------------------------------
// Opportunity Recommendation
// ---------------------------------------------------------------------------

export type OpportunityCategory =
  | 'CONTENT'
  | 'PORTFOLIO'
  | 'POSITIONING'
  | 'OUTREACH'
  | 'FOLLOW_UP'
  | 'BUILD'
  | 'PUBLISH'
  | 'CONNECT'
  | 'DOCUMENT'
  | 'LEARN'
  | 'AUTOMATE'
  | 'content-piece-opportunity';

export interface OpportunityRecommendation {
  id: string;
  workspaceId: string;
  category: OpportunityCategory;
  title: string;
  description: string;
  reason: string;
  evidence: EvidenceEntry[];
  confidence: number;
  expectedValue: number; // 0–1
  effort: 'low' | 'medium' | 'high';
  goalAlignment: string[];
  primaryAction: string;
  /** Action identifiers the user can take. */
  actions: OpportunityAction[];
  createdAt: string;
}

export type OpportunityActionType =
  | 'convert-to-plan'
  | 'save'
  | 'dismiss'
  | 'open-source'
  | 'open-project';

export interface OpportunityAction {
  type: OpportunityActionType;
  label: string;
  /** Optional target id (plan id, project id, achievement id). */
  targetId?: string;
}

// ---------------------------------------------------------------------------
// Project Intelligence (derived snapshot)
// ---------------------------------------------------------------------------

export interface ProjectIntelligence {
  projectId: string;
  projectStatus: ProjectStatus;
  recentMilestones: ProjectMilestone[];
  professionalValue: number;
  missingDocumentation: string[];
  contentPotential: number;
  suggestedQuestions: string[];
  /** Evidence summary for Ask My Twin. */
  evidenceSummary: string;
  computedAt: string;
}

// ---------------------------------------------------------------------------
// Execution Receipt
// ---------------------------------------------------------------------------

export interface ExecutionReceipt {
  id: string;
  workspaceId: string;
  requestedBy: string;
  approvedBy?: string;
  source: string;
  planId?: string;
  checkpointId?: string;
  command: string;
  integration?: string;
  startedAt: string;
  completedAt?: string;
  result: ReceiptResult;
  verification?: ReceiptVerification;
  affectedObjects: AffectedObjectRef[];
  nextAction?: string;
  /** Observable execution facts only — never hidden reasoning. */
  summary: string;
}

export type ReceiptResult =
  | 'success'
  | 'approved-pending'
  | 'rejected'
  | 'failed'
  | 'blocked'
  | 'deduplicated';

export interface ReceiptVerification {
  type: 'user-verified' | 'system-verified' | 'pending';
  detail: string;
}

export interface AffectedObjectRef {
  type: EntityRefType;
  id: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Builder Brief / Weekly Review
// ---------------------------------------------------------------------------

export interface BuilderBriefSection {
  key: string;
  title: string;
  body: string;
  /** Actionable link target, if any. */
  targetId?: string;
  targetType?: EntityRefType;
}

export interface BuilderBrief {
  id: string;
  workspaceId: string;
  generatedAt: string;
  sections: BuilderBriefSection[];
  /** Whether this brief had real data or was empty. */
  hadRealData: boolean;
}

export interface WeeklyReview {
  id: string;
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  workCompleted: string[];
  achievementsAccepted: string[];
  artifactsCreated: string[];
  plansCompleted: string[];
  outcomesObserved: string[];
  goalsAdvanced: string[];
  opportunitiesAccepted: string[];
  opportunitiesDismissed: string[];
  proposedTwinDeltas: string[];
  learnings: string[];
  learningsApprovedForMemory: string[];
}

// ---------------------------------------------------------------------------
// Skill Pack
// ---------------------------------------------------------------------------

export type SkillPackId =
  | 'capture-achievement'
  | 'turn-build-into-content'
  | 'review-project-positioning'
  | 'generate-builder-update'
  | 'prepare-launch-narrative'
  | 'convert-work-session-to-portfolio-evidence'
  | 'review-professional-profile'
  | 'create-weekly-builder-review';

export interface SkillPack {
  id: SkillPackId;
  name: string;
  description: string;
  /** Which BrandOps capabilities this skill uses. */
  requiredCapabilities: string[];
  /** Steps the skill instructs the agent to perform using BrandOps APIs. */
  steps: SkillPackStep[];
  /** Business logic stays in BrandOps services; this is the portable instruction layer. */
  invocationHint: string;
}

export interface SkillPackStep {
  order: number;
  title: string;
  instruction: string;
  /** Which BrandOps tool/API this step maps to. */
  mapsToTool?: string;
  /** Input the step expects from the prior step or the agent environment. */
  expectedInput?: string;
  outputHint?: string;
}

// ---------------------------------------------------------------------------
// Feature Registry
// ---------------------------------------------------------------------------

export type FeatureMaturity = 'EXPERIMENTAL' | 'BETA' | 'STABLE';

export interface FeatureRegistryEntry {
  id: string;
  name: string;
  description: string;
  owningModule: string;
  owningService: string;
  uiExposure: 'plan' | 'ask' | 'settings' | 'dashboard' | 'hidden' | 'none';
  backendImplementation: boolean;
  requiredPermissions: string[];
  integrationDependencies: string[];
  maturity: FeatureMaturity;
  featureFlag?: string;
  tests?: string[];
  /** Whether this feature is currently wired end-to-end. */
  wired: boolean;
}

// ---------------------------------------------------------------------------
// Policy Engine
// ---------------------------------------------------------------------------

export type PolicyId =
  | 'CAN_READ_CONTEXT'
  | 'CAN_CREATE_DRAFT'
  | 'CAN_PROPOSE_TWIN_CHANGE'
  | 'CAN_CREATE_PLAN'
  | 'CAN_REQUEST_EXTERNAL_ACTION'
  | 'REQUIRES_APPROVAL'
  | 'REQUIRES_SENSITIVE_CONFIRMATION'
  | 'CAN_INGEST_ACTIVITY'
  | 'CAN_VERIFY_ACHIEVEMENT'
  | 'CAN_PROMOTE_TO_TWIN'
  | 'CAN_CREATE_OPPORTUNITY'
  | 'CAN_CONVERT_TO_PLAN'
  | 'CAN_REVOKE_AGENT'
  | 'CAN_READ_EXECUTION_RECEIPT'
  | 'CAN_READ_FEATURE_REGISTRY';

export type PolicyDecision =
  | 'allowed'
  | 'denied'
  | 'approval-required'
  | 'sensitive-confirmation-required';

export interface PolicyContext {
  actor: string;
  actorType: 'user' | 'agent' | 'skill' | 'hook' | 'system' | 'dev-hook';
  workspaceId: string;
  clientKind?: string;
  sessionId?: string;
  grantedCapabilities?: string[];
  grantedBundles?: string[];
  scope: string;
  intent?: string;
}

export interface PolicyDecisionResult {
  decision: PolicyDecision;
  policyId: PolicyId;
  reason: string;
  /** Optional metadata for the UI. */
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Context Bundle extension
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Builder Activity State
// ---------------------------------------------------------------------------

/** Persistent Builder Intelligence slice on BrandOpsData (builderActivity). */
export interface BuilderActivityState {
  events: ActivityEvent[];
  workspaceId: string;
  achievements?: AchievementCandidate[];
  projects?: Project[];
  opportunities?: OpportunityRecommendation[];
  twinProposals?: TwinUpdateProposal[];
  artifacts?: Artifact[];
  outcomes?: Outcome[];
  goals?: Goal[];
  weeklyReviews?: WeeklyReview[];
  dailyBriefs?: BuilderBrief[];
  executionReceipts?: ExecutionReceipt[];
  achievementsVerifiedAt?: string[];
  // Outcome → Learning fields
  signals?: import('../services/builder/outcomeLearning').LearningSignal[];
  outcomeScores?: import('../services/builder/outcomeLearning').OutcomeRecord[];
  preferenceHints?: import('../services/builder/outcomeLearning').PreferenceHint[];
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Context Bundle extension
// ---------------------------------------------------------------------------

import { CONTEXT_BUNDLE_IDS } from './agentInterop';

/** New bundle for agent execution context — project state, active plan, readiness. */

export const EXTENDED_CONTEXT_BUNDLE_IDS = [...CONTEXT_BUNDLE_IDS, 'EXECUTION_CONTEXT'] as const;

// Re-export from agentInterop for services that need these types
