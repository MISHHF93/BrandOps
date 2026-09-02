/**
 * A workspace with something in every drawer.
 *
 * The seed workspace has no twin, no contacts, no artifacts, no achievement
 * candidates, no opportunities, no twin proposals and no projects. That is fine
 * for testing refusals and terrible for testing results: a sweep over the whole
 * tool surface reached a *success* branch on 21 of 40 tools, so 19 published
 * output schemas had never been checked against a payload with real data in it.
 * Two schema errors shipped that way — `PlanReceipt.generatedSteps` typed as a
 * number, `McpTask.ttlMs` not permitting null — and both were found only when a
 * test finally supplied the data.
 *
 * Everything here is shaped to survive `withDefaults`, which silently drops
 * entries that do not satisfy the normalizer. A fixture the normalizer discards
 * is worse than no fixture: the test still passes, against nothing.
 */
import { cloneSeedData } from './fixtures';
import { withDefaults } from '../../src/services/storage/storage';
import type { BrandOpsData, Plan } from '../../src/types/domain';

export const POPULATED_IDS = {
  twin: 'twin-fixture',
  contact: 'contact-fixture',
  artifact: 'artifact-fixture',
  plan: 'plan-fixture',
  event: 'event-fixture',
  achievement: 'achievement-fixture',
  opportunity: 'opportunity-fixture',
  twinProposal: 'twin-proposal-fixture',
  project: 'project-fixture'
} as const;

/** Shaped to survive `normalizePlan`, which requires `sourceResponseId` and full steps. */
function planFixture(now: string): Plan {
  const step = (suffix: string, title: string) => ({
    id: `${POPULATED_IDS.plan}-${suffix}`,
    title,
    description: `${title}.`,
    owner: 'User',
    requiredInput: 'None.',
    approvalRequired: false,
    status: 'todo' as const
  });
  return {
    id: POPULATED_IDS.plan,
    title: 'Fixture plan',
    summary: 'A plan with real steps.',
    objective: 'Exercise the plan surface',
    planType: 'content-plan',
    status: 'approved',
    confidenceScore: 70,
    sourceResponseId: `${POPULATED_IDS.plan}-source`,
    assumptions: [],
    missingInputs: [],
    requiredApprovals: [],
    steps: [step('s1', 'Draft it'), step('s2', 'Review it')],
    timeline: [],
    outputsAssets: [],
    savedAt: now,
    receiptId: `${POPULATED_IDS.plan}-receipt`
  } as unknown as Plan;
}

export function populatedWorkspace(now = new Date().toISOString()): BrandOpsData {
  const base = cloneSeedData();
  return withDefaults({
    ...base,
    digitalTwins: {
      activeTwinId: POPULATED_IDS.twin,
      twins: [
        {
          id: POPULATED_IDS.twin,
          ownerUserId: 'local-user',
          workspaceId: 'local-workspace',
          displayName: 'Fixture Twin',
          sourceType: 'resume',
          identity: {
            headline: 'AI infrastructure founder',
            summary: 'Builds agent systems.',
            professionalPositioning: 'AI workforce infrastructure',
            targetAudience: 'Technical founders',
            toneOfVoice: 'Direct, technical, no hype',
            strengths: ['agent runtimes'],
            differentiators: ['governed execution'],
            goals: ['Build technical authority']
          },
          resumeProfile: {
            contactInfo: { name: 'Fixture User' },
            experience: [],
            education: [],
            skills: ['typescript'],
            certifications: [],
            achievements: [],
            projects: [],
            summary: '',
            links: []
          },
          memory: {
            facts: [],
            preferences: [],
            voiceExamples: ['We shipped the runtime. Here is what broke.'],
            approvedClaims: ['Built a durable multi-agent execution runtime.'],
            rejectedClaims: [],
            missingInfo: []
          },
          createdAt: now,
          updatedAt: now
        }
      ]
    },
    contacts: [
      {
        id: POPULATED_IDS.contact,
        name: 'Sarah Chen',
        fullName: 'Sarah Chen',
        company: 'Northwind',
        role: 'Principal',
        title: 'Principal Engineer',
        source: 'conference',
        relationshipStage: 'building',
        status: 'active',
        nextAction: 'Send the architecture notes',
        followUpDate: now,
        notes: 'Private working notes.',
        links: [],
        relatedOutreachDraftIds: [],
        relatedContentTags: [],
        lastContactAt: now
      }
    ],
    notes: [
      {
        id: 'note-fixture',
        entityType: 'contact',
        entityId: POPULATED_IDS.contact,
        title: 'Architecture chat',
        detail: 'Discussed the gateway design.',
        nextAction: 'Send notes',
        createdAt: now
      }
    ],
    integrationHub: {
      ...base.integrationHub,
      artifacts: [
        {
          // `sourceId` is required by the normalizer; omit it and the artifact
          // vanishes without a word.
          id: POPULATED_IDS.artifact,
          sourceId: 'fixture-source',
          title: 'Market entry brief',
          summary: 'Analysis of the agent infrastructure market.',
          artifactType: 'report',
          tags: [],
          createdAt: now,
          updatedAt: now
        },
        ...base.integrationHub.artifacts
      ]
    },
    planWorkspace: {
      plans: [planFixture(now), ...(base.planWorkspace?.plans ?? [])],
      receipts: [
        {
          id: `${POPULATED_IDS.plan}-receipt`,
          planId: POPULATED_IDS.plan,
          convertedFrom: 'Fixture',
          planType: 'content-plan',
          sourceMessageId: `${POPULATED_IDS.plan}-source`,
          generatedSteps: ['Draft it', 'Review it'],
          userAction: 'save-plan',
          timestamp: now,
          summary: 'Converted a fixture into a plan.'
        },
        ...(base.planWorkspace?.receipts ?? [])
      ],
      updatedAt: now
    },
    builderActivity: {
      workspaceId: 'local-workspace',
      updatedAt: now,
      events: [
        {
          id: POPULATED_IDS.event,
          workspaceId: 'local-workspace',
          source: 'agent-reported',
          sourceId: 'fixture',
          kind: 'feature-built',
          title: 'Shipped the gateway',
          detail: 'Policy engine, intent contracts, durable tasks.',
          timestamp: now,
          confidence: 0.9,
          trustTier: 'AGENT_REPORTED',
          verificationStatus: 'UNVERIFIED',
          entityRefs: [],
          evidence: []
        }
      ],
      achievements: [
        {
          id: POPULATED_IDS.achievement,
          workspaceId: 'local-workspace',
          eventId: POPULATED_IDS.event,
          title: 'Shipped the gateway',
          description: 'Governed MCP surface with policy and audit.',
          evidence: [{ ref: 'git:acme/brandops@c0ffee', kind: 'git', label: 'gateway commit' }],
          sourceEvents: [POPULATED_IDS.event],
          confidence: 0.9,
          professionalRelevance: ['agent runtime'],
          // `verifyAchievement` throws on a candidate that does not require it.
          verificationRequired: true,
          kind: 'feature_completed',
          reason: 'Detected a completed feature.',
          detectedAt: now,
          updatedAt: now
        }
      ],
      opportunities: [
        {
          id: POPULATED_IDS.opportunity,
          workspaceId: 'local-workspace',
          category: 'content',
          title: 'Write up the gateway',
          description: 'Turn the gateway work into a technical narrative.',
          reason: 'Strong project evidence, weak public evidence.',
          evidence: [],
          confidence: 0.8,
          expectedValue: 0.7,
          effort: 'medium',
          goalAlignment: ['Build technical authority'],
          primaryAction: 'convert-to-plan',
          actions: [],
          createdAt: now
        }
      ],
      twinProposals: [
        {
          id: POPULATED_IDS.twinProposal,
          workspaceId: 'local-workspace',
          deltas: [],
          summary: 'Add agent-runtime expertise.',
          evidence: [],
          confidence: 0.8,
          reason: 'Repeated verified work in this area.',
          createdAt: now,
          updatedAt: now,
          createdBy: 'agent:claude-code'
        }
      ],
      projects: [
        {
          id: POPULATED_IDS.project,
          workspaceId: 'local-workspace',
          name: 'BrandOps',
          summary: 'Agent runtime and professional intelligence control plane.',
          achievementIds: [POPULATED_IDS.achievement],
          artifactIds: [POPULATED_IDS.artifact],
          goalIds: [],
          planIds: [POPULATED_IDS.plan],
          outcomeIds: [],
          projectStatus: 'active',
          recentMilestones: [],
          tags: ['agent-runtime'],
          createdAt: now,
          updatedAt: now
        }
      ]
    }
  } as unknown as BrandOpsData);
}
