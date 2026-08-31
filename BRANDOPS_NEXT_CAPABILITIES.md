---

# Part 3: Evaluations 21–30

> **SOURCE-NOTE (2026-08-31):** This is a capability *evaluation* doc (decision planning), not a completion record. Two file citations are corrected here: (1) `src/services/builder/opportunityEngine.ts` (evals #21/#25/#28) actually lives at **`src/services/plan/opportunityEngine.ts`** (the `builder/` path does not exist); (2) `src/services/builder/weeklyProfessionalReview.ts` (evals #22/#23/#24/#28, cited as producing reviews) is **ABSENT — never built** (verified; see `BUILDER_INTELLIGENCE_STATUS.md`). The impact/decisions in this doc stand as *proposals*, not implemented features, unless explicitly tested in the current baseline (982/982, 152 files).

## 21. Opportunity Lifecycle

**Rating: PARTIAL → HIGH_VALUE**

**Repository evidence:**
- `src/types/domain.ts`: `Opportunity` (id, name, company, role, source, relationshipStage, opportunityType, status: prospect/discovery/proposal/negotiation/won/lost, nextAction, followUpDate, notes, links, relatedOutreachDraftIds, relatedContentTags, archivedAt, createdAt, updatedAt, valueUsd, confidence, contactId, account, serviceLine, stage, version) — has a lifecycle (prospect → won/lost)
- `src/types/builder.ts`: `OpportunityRecommendation` (id, workspaceId, category, title, description, reason, evidence, confidence, expectedValue, effort, goalAlignment, primaryAction, actions, createdAt) — a recommendation, not a lifecycle entity
- `src/services/builder/opportunityEngine.ts`: `evaluateOpportunities` produces `OpportunityRecommendation[]`
- `src/services/builder/opportunityRadar.ts`: `buildOpportunityRadar` consolidates recommendations
- `src/services/interop/gateway.ts`: `builder.opportunities.dismiss` capability — dismisses opportunities
- `src/services/interop/gateway.ts`: `builder.opportunities.convert-to-plan` capability — converts to plan
- No lifecycle states for recommendations: DETECTED → QUALIFIED → SAVED/DISMISSED → PLANNED → ACTED → OUTCOME_OBSERVED → LEARNED

**What exists:** CRM `Opportunity` has a full lifecycle (prospect → discovery → proposal → negotiation → won/lost). But `OpportunityRecommendation` (from the builder module) is a transient recommendation with no lifecycle — it's generated, displayed, and either acted upon or dismissed. There's a `dismiss` capability but no tracking of what was dismissed or prevention of rediscovery.

**What is missing:** No lifecycle for `OpportunityRecommendation`: DETECTED → QUALIFIED → SAVED/DISMISSED → PLANNED → ACTED → OUTCOME_OBSERVED → LEARNED. No prevention of rediscovering the same opportunity after dismissal or completion.

**Dependencies:** Decision Ledger (#5) for tracking SAVED/DISMISSED decisions. Plan conversion for PLANNED state.

**Product value assessment:** HIGH_VALUE. Opportunity Radar rediscovering the same dismissed opportunity is a frustrating user experience. The opportunity lifecycle would give recommendations a proper state machine and prevent redundant suggestions. This is a "complete the feature" rather than "build something new" — the CRM Opportunity has a lifecycle, the builder recommendation doesn't.

**Decision: IMPLEMENT**

**Implementation notes:**
- Add lifecycle states to `OpportunityRecommendation` or create a new `OpportunitySignal` type:
  - `OpportunitySignal` type: { id, workspaceId, category, title, description, reason, evidence, confidence, expectedValue, effort, goalAlignment, primaryAction, actions, createdAt, lifecycleState: 'DETECTED' | 'QUALIFIED' | 'SAVED' | 'DISMISSED' | 'PLANNED' | 'ACTED' | 'OUTCOME_OBSERVED' | 'LEARNED', lifecycleTransitionAt: Record<LifecycleState, string>, dismissedReason?, savedPlanId?, actedExecutionId?, outcomeObservation?, learning? }
- Update `opportunityRadar.ts` to check for previously dismissed signals and exclude them
- Update `opportunityEngine.ts` to track lifecycle transitions
- Add `dismissOpportunitySignal` capability that records the dismissal with reason and prevents rediscovery
- Add `saveOpportunitySignal` capability that records the save and links to a plan
- Tests: unit tests for lifecycle transitions and rediscovery prevention

---

## 22. Professional Momentum Score

**Rating: NOT_YET_JUSTIFIED → LOW_VALUE**

**Repository evidence:**
- `src/types/builder.ts`: `Achievement` (kind, professionalRelevance, projectIds, goalIds, artifactIds, sourceEventIds, verifiedAt, twinSummary) — achievements are evidence of professional momentum
- `src/services/builder/achievementService.ts`: achievements can be verified, dismissed, promoted to Twin
- `src/types/builder.ts`: `Goal` (status: active/completed/paused/abandoned) — goal progress is a momentum indicator
- `src/services/builder/projectIntelligence.ts`: `ProjectIntelligence` has `projectStatus`, `professionalValue`, `recentMilestones`
- `src/services/builder/weeklyProfessionalReview.ts`: `buildWeeklyProfessionalReview` produces a review artifact
- No momentum score computed from verified achievements, completed plans, goal progress, validated outcomes

**What exists:** Achievements, goals, project intelligence, and weekly reviews all capture aspects of professional progress. The *data* for a momentum score exists.

**What is missing:** No computed "Professional Momentum Score" derived from verified recent achievements, completed plans, goal progress, validated outcomes. No use of this score for recommendation prioritization or weekly reviews. No exposure of a gamified number (the prompt says not to expose it unless user testing proves it helps).

**Dependencies:** Evidence Ledger (#2) for verified achievements. Decision Ledger (#5) for completed plans and goal decisions.

**Product value assessment:** LOW_VALUE for now. The momentum score is an internal metric that could improve recommendation prioritization and weekly reviews. But it's a derived metric — the underlying data (achievements, goals, plans) already exists and is used. The score itself is a nice-to-have optimization, not a capability gap.

**Decision: DEFER (low priority, internal metric only)**

---

## 23. Proof-of-Work Timeline

**Rating: PARTIAL → HIGH_VALUE**

**Repository evidence:**
- `src/types/builder.ts`: `Achievement` (kind, title, detail, professionalRelevance, projectIds, goalIds, artifactIds, sourceEventIds, verifiedAt, twinSummary, timestamp, confidence, verificationStatus) — verified achievements are proof-of-work events
- `src/services/builder/achievementService.ts`: achievements can be verified and promoted to Twin
- `src/types/domain.ts`: `Artifact` (id, workspaceId, title, description, artifactType, sourceIds, externalUrl, externalId, tags, trustTier, createdAt, updatedAt) — artifacts are proof-of-work evidence
- `src/services/builder/projectIntelligence.ts`: `ProjectMilestone` (achievementId, title, kind, achievedAt, confidence) — milestones are timeline events
- `src/services/builder/weeklyProfessionalReview.ts`: produces a review with "verified work completed, achievements accepted, artifacts created, plans completed, outcomes, goals advanced"
- No curated timeline of verified projects, releases, achievements, artifacts, outcomes for portfolio/résumé generation

**What exists:** Achievements, artifacts, project milestones, and weekly reviews all capture proof-of-work data. The *data* for a timeline exists.

**What is missing:** No curated "Proof-of-Work Timeline" that assembles verified projects, releases, achievements, artifacts, and outcomes into a coherent timeline. No ability to generate an evidence-backed portfolio narrative, résumé update, founder update, or technical profile from selected timeline events. No source provenance attached to timeline events.

**Dependencies:** Evidence Ledger (#2) for evidence on each timeline event. Personal Knowledge Graph (#1) for relationship context.

**Product value assessment:** HIGH_VALUE. A proof-of-work timeline is a core output for a professional intelligence tool — it's what the user ultimately wants (a coherent story of their professional progress). The data exists but is scattered across achievements, artifacts, projects, and weekly reviews. Assembling it into a curated timeline with provenance would be a major value-add.

**Decision: IMPLEMENT**

**Implementation notes:**
- Create `src/services/timeline/proofOfWorkTimeline.ts`:
  - `ProofOfWorkEvent` type: { id, eventType: 'project' | 'release' | 'achievement' | 'artifact' | 'outcome' | 'goal-progress' | 'plan-completion', title, description, timestamp, evidence: EvidenceEntry[], sourceEntities: EntityRef[], verified: boolean, verificationStatus, provenance: string }
  - `buildProofOfWorkTimeline(data: BrandOpsData): ProofOfWorkTimeline` — assembles events from achievements, artifacts, project milestones, outcomes, goal progress
  - `filterTimeline(timeline, criteria): ProofOfWorkTimeline` — filter by date range, project, category, verification status
  - `generateNarrative(timeline, format): string` — generate portfolio narrative, résumé update, founder update, or technical profile
  - `exportTimeline(timeline, format): string | object` — export in various formats with provenance attached
- Integrate with weekly review to surface timeline events
- Add UI for browsing and selecting timeline events
- Tests: unit tests for timeline assembly and narrative generation

---

## 24. Dynamic Portfolio

**Rating: NOT_YET_JUSTIFIED → LOW_VALUE**

**Repository evidence:**
- `src/types/domain.ts`: `BrandVault` (positioningStatement, headlineOptions, shortBio, fullAboutSummary, serviceOfferings, collaborationModes, outreachAngles, audienceSegments, expertiseAreas, industries, proofPoints, signatureThemes, preferredVoiceNotes, bannedPhrases, callsToAction, reusableSnippets, personalNotes) — brand content
- `src/services/builder/weeklyProfessionalReview.ts`: produces review artifacts
- `src/services/ai/brandOpsAiCore.ts`: `runBrandOpsAI` produces artifacts with content
- `src/services/digitalTwin/digitalTwin.ts`: Twin generates assets (bios, positioning, etc.)
- No dynamic portfolio generation from PoW evidence

**What exists:** Brand vault, AI-generated content, Twin-generated assets — all the *content generation* infrastructure exists.

**What is missing:** No "Dynamic Portfolio" — an optional generated view driven by Proof-of-Work evidence rather than manually maintained static entries. No user selection of which verified Projects/Achievements are public. No generation of descriptions in the Twin's voice without automatic publishing.

**Dependencies:** Proof-of-Work Timeline (#23) for the evidence base. Twin Fork / Persona Lens (#31) for voice consistency (optional).

**Product value assessment:** LOW_VALUE for now. A dynamic portfolio is a nice output format, but it's an enhancement to the proof-of-work timeline, not a separate capability. The core value is in the timeline (#23) — the portfolio view is a presentation layer on top.

**Decision: DEFER (implement as a view on top of Proof-of-Work Timeline)**

---

## 25. Content Lineage

**Rating: NOT_YET_JUSTIFIED → LOW_VALUE**

**Repository evidence:**
- `src/types/domain.ts`: `ContentLibraryItem` (id, type: post-draft/post-idea/article-note/carousel-outline/hook-bank-entry/cta-snippet/reusable-paragraph, title, body, tags, audience, goal, status: idea/drafting/ready/scheduled/published/archived, publishChannel, notes, createdAt, updatedAt, version) — content items have a status lifecycle
- `src/types/domain.ts`: `PublishingItem` (id, title, body, platforms, tags, status: queued/due-soon/ready-to-post/posted/skipped, contentLibraryItemId, scheduledFor, reminderAt, reminderLeadMinutes, checklist, postedAt, skippedAt, createdAt, updatedAt, version) — publishing items
- `src/services/builder/predictiveContentIdeationEngine.ts`: generates content ideas
- No content lineage: Achievement → idea → draft → approved content → publication → observed outcome → reusable learning

**What exists:** Content library items have a status lifecycle (idea → drafting → ready → scheduled → published → archived). Publishing items have statuses. The *content lifecycle* exists but is shallow — it tracks status, not lineage.

**What is missing:** No content lineage connecting: Achievement → idea → draft → approved content → publication → observed outcome → reusable learning. No prevention of BrandOps generating near-identical content. No influence of successful themes on future ideation without blindly cloning them.

**Dependencies:** Proof-of-Work Timeline (#23) for linking content to achievements.

**Product value assessment:** LOW_VALUE for now. Content lineage is a sophisticated feature that would improve content quality over time by learning from what worked. But BrandOps' current content generation is relatively simple (predictive content ideation produces ideas, content library stores drafts). The lineage feature adds complexity without clear immediate benefit.

**Decision: DEFER (low priority, enhance content library status lifecycle first)**

---

## 26. Idea Bank

**Rating: PARTIAL → MEDIUM_VALUE**

**Repository evidence:**
- `src/types/domain.ts`: `ContentLibraryItem` with `type: 'post-idea'` — ideas can be stored in the content library
- `src/types/domain.ts`: `ContentLibraryItem.status: 'idea'` — ideas have a status
- `src/services/builder/predictiveContentIdeationEngine.ts`: generates content ideas
- `src/services/builder/opportunityRadar.ts`: opportunity recommendations can spark ideas
- No dedicated Idea Bank with Develop/Convert to Artifact/Convert to Plan/Archive/semantic deduplication

**What exists:** Ideas can be stored as `ContentLibraryItem` with type `post-idea` and status `idea`. The content library is the de facto idea storage.

**What is missing:** No dedicated "Idea Bank" — a lightweight place for Ask insights, achievement observations, questions, project observations, and Opportunity Radar signals to become ideas without requiring a full Plan. No Develop/Convert to Artifact/Convert to Plan/Archive actions. No semantic deduplication.

**Dependencies:** Content library already supports idea storage. The missing piece is a dedicated UX and action layer on top.

**Product value assessment:** MEDIUM_VALUE. An Idea Bank would give users a lightweight place to capture thoughts without the overhead of creating a full plan. The content library already supports this, but the UX might not make it obvious. Semantic deduplication would be valuable — preventing the same idea from being captured multiple times.

**Decision: DEFER (medium priority, enhance content library UX rather than building a separate system)**

**Implementation notes (for later):**
- Enhance content library to make "post-idea" type more prominent
- Add "Convert to Plan" action from content library items
- Add "Convert to Artifact" action
- Add semantic deduplication (check for similar existing ideas before adding new ones)
- Tests: unit tests for idea conversion and deduplication

---

## 27. Experiment

**Rating: NOT_YET_JUSTIFIED → LOW_VALUE**

**Repository evidence:**
- `src/types/builder.ts`: `PlanDraft` (objective, assumptions, missingInputs, requiredApprovals, steps, timeline, risks, expectedOutput, thoughtTree) — plans have assumptions and expected output
- `src/services/builder/planCompiler.ts`: compiles plans with assumptions and expected output
- `src/types/domain.ts`: `Opportunity` (confidence, valueUsd) — opportunities have confidence
- No Experiment object — no hypothesis, expected signal, experiment action, duration, success threshold, result, learning

**What exists:** Plans have assumptions, expected output, and risks. The *structure* for testing hypotheses exists implicitly in plans.

**What is missing:** No explicit "Experiment" object for uncertain strategic decisions: hypothesis, expected signal, experiment action, duration, success threshold, result, learning. No use of experiments instead of pretending BrandOps can know whether an untested strategy will succeed.

**Dependencies:** Proof-of-Work Timeline (#23) for measuring outcomes. Decision Ledger (#5) for recording experiment decisions.

**Product value assessment:** LOW_VALUE for now. Experiments are valuable for strategic decisions where the outcome is uncertain. But BrandOps' current recommendations are largely deterministic (based on evidence, not guesses) — the experiment framework would be most valuable for A/B testing content strategies, positioning choices, or outreach approaches. This is a future capability for when BrandOps starts making more strategic recommendations.

**Decision: DEFER (low priority, potentially valuable for strategic recommendations in the future)**

---

## 28. Goal Health

**Rating: PARTIAL → HIGH_VALUE**

**Repository evidence:**
- `src/types/builder.ts`: `Goal` (id, workspaceId, title, description, status: active/completed/paused/abandoned, supportingEvidenceIds, createdAt, updatedAt) — goals have a simple status
- `src/services/builder/projectIntelligence.ts`: `ProjectIntelligence` has `projectStatus`, `recentMilestones`, `professionalValue`, `missingDocumentation`, `contentPotential`
- `src/services/builder/weeklyProfessionalReview.ts`: reviews goals advanced
- No goal health evaluation: ON_TRACK, AT_RISK, STALLED, COMPLETED, NEEDS_REVIEW

**What exists:** Goals have a status (active/completed/paused/abandoned). Projects have status and intelligence. The *data* for goal health exists.

**What is missing:** No goal health evaluation that considers: evidence-backed progress (not just task completion), blocked plans, recent activity, outcomes. No labels: ON_TRACK, AT_RISK, STALLED, COMPLETED, NEEDS_REVIEW. No evidence behind the status. No inference of business success solely from task completion.

**Dependencies:** Evidence Ledger (#2) for evidence-backed progress. Personal Knowledge Graph (#1) for goal-plan-achievement relationships. Plan Autopsy (#29) for failed plan impact on goals.

**Product value assessment:** HIGH_VALUE. Goal health is a core dashboard metric — users want to know if their goals are on track or at risk. The current binary status (active/completed/paused/abandoned) is too simplistic. A nuanced health evaluation with evidence would be a major dashboard improvement.

**Decision: IMPLEMENT**

**Implementation notes:**
- Create `src/services/goals/goalHealth.ts`:
  - `GoalHealthStatus` type: 'ON_TRACK' | 'AT_RISK' | 'STALLED' | 'COMPLETED' | 'NEEDS_REVIEW'
  - `GoalHealth` type: { goalId, status, evidence: GoalHealthEvidence, computedAt, factors: GoalHealthFactor[] }
  - `GoalHealthEvidence` type: { progressEvidence: string[], blockedPlans: string[], recentActivity: string[], outcomeEvidence: string[], confidence: number }
  - `GoalHealthFactor` type: { name, weight, value, description }
  - `evaluateGoalHealth(data: BrandOpsData, goalId): GoalHealth` — evaluates health from evidence-backed progress, blocked plans, recent activity, outcomes
  - `evaluateAllGoalHealth(data: BrandOpsData): Map<string, GoalHealth>` — batch evaluation
- Health factors:
  - Progress toward goal objectives (based on supporting evidence, not just task completion)
  - Blocked or stalled plans related to the goal
  - Recent activity level (achievements, artifacts, actions in the last N days/weeks)
  - Outcome evidence (measurable results related to the goal)
  - Time since last progress
- Add goal health to dashboard and weekly review
- Tests: unit tests for health evaluation against synthetic goal data

---

## 29. Plan Autopsy

**Rating: NOT_YET_JUSTIFIED → LOW_VALUE**

**Repository evidence:**
- `src/types/builder.ts`: `Plan` (status: draft/active/pending-approval/opportunity/approved/rejected/executing/executed/verified, steps, timeline, outputsAssets, risks, nextActions, savedAt, receiptId) — plans have status and execution records
- `src/services/execution/planExecutor.ts`: execution produces blocked steps, completion status
- `src/services/execution/planVerifier.ts`: verification checks outcomes
- `src/services/execution/checkpointStore.ts`: checkpoints record execution flow with error states
- No Plan Autopsy — no structured post-mortem on failed or abandoned plans

**What exists:** Plan execution records blocked steps and completion status. Checkpoints record error states. The *data* for an autopsy exists in execution records.

**What is missing:** No structured "Plan Autopsy" after failed or abandoned plans: which checkpoint failed, whether the issue was missing context, unrealistic scope, tool/integration failure, rejected approval, execution failure, or changed user intent. No structured learning saved without blaming the user. No prevention of identical failure patterns being regenerated.

**Dependencies:** Execution records and checkpoints provide the data. The autopsy is a post-hoc analysis layer.

**Product value assessment:** LOW_VALUE for now. Plan autopsy is valuable for improving plan quality over time, but it's a retrospective analysis feature. BrandOps currently has a limited number of plans (most are drafts or rejected), and the failure modes are simple (blocked by external action requirement, rejected by user). The autopsy would add more value when there are more executed plans with diverse failure modes.

**Decision: DEFER (low priority, enhance when plan execution volume increases)**

---

## 30. Reusable Playbooks

**Rating: PARTIAL → MEDIUM_VALUE**

**Repository evidence:**
- `src/services/builder/planCompiler.ts`: `compilePlan` with 10 plan templates — there are already templates
- `src/services/builder/skillPack.ts`: `getSkillPackInstructions`, `SkillPack` — reusable workflow definitions
- `src/services/builder/featureRegistry.ts`: `builder-skill-pack` feature (wired: true) — "Reusable, portable workflow definitions for common BrandOps workflows"
- `src/types/builder.ts`: `PlanDraft` (planType, objective, steps, requiredApprovals, assumptions, missingInputs, estimatedEffort, expectedOutput, thoughtTree) — plans have structure that could be templatized
- No conversion of successful Plans into parameterized templates with lessons learned

**What exists:** Plan templates (10 types) and skill packs (reusable workflow definitions) already exist. The *concept* of reusable workflows is implemented.

**What is missing:** No conversion of successful Plans into parameterized templates: objective, required context, steps, approvals, supported integrations, verification criteria, lessons learned. No "never automatically generalize one successful Plan into a universal best practice" guard.

**Dependencies:** Plan execution and verification infrastructure. Skill packs already provide a template mechanism.

**Product value assessment:** MEDIUM_VALUE. Reusable playbooks would let successful plans be converted into templates for future use. The existing skill pack system already provides some of this functionality. The main gap is the conversion path — turning a successful plan into a skill pack or template with lessons learned.

**Decision: DEFER (medium priority, enhance skill pack system to support plan-to-template conversion)**

---

*meta: writing BRANDOPS_NEXT_CAPABILITIES.md part 4 of 5 (evaluations 21-30 of 50)*
