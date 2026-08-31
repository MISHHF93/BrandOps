import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import type { TwinSupportedActionType } from '../../types/domain';
import { twinActionPrompt } from '../../services/digitalTwin/digitalTwin';

export type OperationalPlanStatus = 'needs-input' | 'ready' | 'in-progress' | 'blocked';

export interface OperationalPlanCard {
  id: string;
  title: string;
  kind:
    | 'workflow'
    | 'outreach'
    | 'content-calendar'
    | 'execution-sequence'
    | 'action-queue'
    | 'approval-flow';
  promise: string;
  previewCommand: string;
  approveCommand: string;
  editTarget: 'settings' | 'palette' | 'today';
  status: OperationalPlanStatus;
  progress: number;
  timeline: string[];
  exportPayload: Record<string, unknown>;
  sourceLabel?: string;
}

function twinPrompt(
  snapshot: MobileWorkspaceSnapshot,
  actionType: TwinSupportedActionType,
  fallback: string
): string {
  return snapshot.activeDigitalTwin
    ? twinActionPrompt(actionType, snapshot.activeDigitalTwin)
    : fallback;
}

function twinPlanPrefix(snapshot: MobileWorkspaceSnapshot): string {
  const twin = snapshot.activeDigitalTwin;
  const memory = snapshot.memoryContextEngine;
  const memoryContext = memory.entries.length
    ? `Memory context: ${[
        ...memory.improvements['plan-generation'].slice(0, 3),
        ...memory.improvements['workflow-recommendations'].slice(0, 3)
      ]
        .filter(Boolean)
        .join('; ')}.`
    : '';
  if (!twin) return memoryContext;
  const verified = [
    twin.identity.headline,
    twin.identity.professionalPositioning,
    ...twin.resumeProfile.skills.slice(0, 8),
    ...twin.memory.approvedClaims.slice(0, 5)
  ]
    .filter(Boolean)
    .join('; ');
  const missing = twin.memory.missingInfo.length
    ? `Missing info: ${twin.memory.missingInfo.join('; ')}. Ask for clarification before using missing facts.`
    : 'If any required fact is missing, ask for clarification instead of inventing it.';
  return `In active twin context for ${twin.displayName}, use this voice: ${twin.identity.toneOfVoice}. Positioning: ${twin.identity.professionalPositioning || twin.identity.summary}. Verified facts: ${verified || 'use only reviewed profile data'}. ${memoryContext} ${missing}`;
}

function twinAwareAsk(snapshot: MobileWorkspaceSnapshot, task: string): string {
  const prefix = twinPlanPrefix(snapshot);
  const expert = snapshot.expertOperator;
  const planningContext = `Planning context: ${expert.professionPath} profile, ${expert.workflowType.replace(/_/g, ' ')} workflow. Recommended sequence: ${expert.plan.guidance.slice(0, 3).join(' | ')}. Execution guidance: ${expert.operate.guidance.slice(0, 3).join(' | ')}. Keep execution approval-gated.`;
  return `ask: ${prefix ? `${prefix}\n\n` : ''}${planningContext}\n\n${task}`;
}

export function buildOperationalPlanCards(
  snapshot: MobileWorkspaceSnapshot
): OperationalPlanCard[] {
  const queueCount = snapshot.pulseTimelineRows.length;
  const profileReady =
    Boolean(snapshot.operatorName.trim()) &&
    Boolean(snapshot.primaryOffer.trim()) &&
    Boolean(snapshot.voiceGuide.trim());
  const approvalBlocked = snapshot.planPendingReviewCount > 0;

  return [
    {
      id: 'workflow-reasoning',
      title: 'Workflow Plan',
      kind: 'workflow',
      promise: `${snapshot.expertOperator.plan.headline}: turn a strategic idea into executable steps, dependencies, risks, and artifacts — then verify outcomes and feed results back to the twin.`,
      previewCommand: twinAwareAsk(
        snapshot,
        'Turn my next best idea into an execution workflow with risks, dependencies, artifacts, decision gates, and follow-up questions for any missing facts.'
      ),
      approveCommand: 'today plan',
      editTarget: 'palette',
      status: profileReady ? 'ready' : 'needs-input',
      progress: Math.min(100, Math.round((snapshot.notes + snapshot.integrationArtifactCount) * 8)),
      timeline: [
        'Expert route',
        ...snapshot.expertOperator.plan.guidance.slice(0, 2),
        'Approve next actions',
        'Track in Today'
      ],
      exportPayload: {
        type: 'workflow',
        profileReady,
        notes: snapshot.notes,
        artifacts: snapshot.integrationArtifactCount
      }
    },
    {
      id: 'outreach-plan',
      title: 'Outreach Plan',
      kind: 'outreach',
      promise: 'Convert positioning and proof into draft outreach, follow-ups, and approvals — with execution receipts that strengthen the twin.',
      previewCommand: twinPrompt(
        snapshot,
        'draft_outreach',
        'ask: Draft an outreach plan using my workspace profile, proof points, and follow-up priorities.'
      ),
      approveCommand: 'draft outreach',
      editTarget: 'settings',
      status:
        snapshot.outreachDrafts > 0 || snapshot.incompleteFollowUps > 0 ? 'in-progress' : 'ready',
      progress: Math.min(100, snapshot.outreachDrafts * 20 + snapshot.incompleteFollowUps * 10),
      timeline: ['Review targets', 'Approve draft', 'Queue follow-up', 'Review replies'],
      exportPayload: {
        type: 'outreach',
        outreachDrafts: snapshot.outreachDrafts,
        followUps: snapshot.incompleteFollowUps,
        activeOpportunities: snapshot.activeOpportunities
      }
    },
    {
      id: 'content-calendar',
      title: 'Content Calendar',
      kind: 'content-calendar',
      promise: 'Transform twin ideas into a repeatable content calendar and publish queue — verified posts feed back into positioning intelligence.',
      previewCommand: twinPrompt(
        snapshot,
        'create_30_day_content_plan',
        'ask: Create a 30-day content calendar from my expertise, voice, proof points, and current workspace context.'
      ),
      approveCommand: 'create linkedin post',
      editTarget: 'palette',
      status:
        snapshot.queuedPublishing > 0 || snapshot.publishingQueue > 0 ? 'in-progress' : 'ready',
      progress: Math.min(
        100,
        snapshot.queuedPublishing * 20 + snapshot.contentTopSignals.length * 10
      ),
      timeline: ['Ideate themes', 'Approve calendar', 'Create drafts', 'Schedule queue'],
      exportPayload: {
        type: 'content-calendar',
        publishingQueue: snapshot.publishingQueue,
        queuedPublishing: snapshot.queuedPublishing,
        contentSignals: snapshot.contentTopSignals.length
      }
    },
    {
      id: 'execution-sequence',
      title: 'Execution Sequence',
      kind: 'execution-sequence',
      promise: `${snapshot.expertOperator.operate.headline}: sequence tasks, pipeline moves, scheduler items, and daily operating priorities — verified results compound into twin intelligence.`,
      previewCommand: twinAwareAsk(
        snapshot,
        'Build an execution sequence for today using my queue, follow-ups, opportunities, constraints, twin voice, and positioning.'
      ),
      approveCommand: 'pipeline health',
      editTarget: 'today',
      status: queueCount > 0 ? 'in-progress' : 'needs-input',
      progress: Math.min(100, queueCount * 12 + snapshot.dueTodayTasks * 10),
      timeline: [
        'Read expert guidance',
        ...snapshot.expertOperator.operate.guidance.slice(0, 2),
        'Run approved command',
        'Measure progress'
      ],
      exportPayload: {
        type: 'execution-sequence',
        queueRows: queueCount,
        dueTodayTasks: snapshot.dueTodayTasks,
        missedTasks: snapshot.missedTasks
      }
    },
    {
      id: 'approval-flow',
      title: 'Approval Flow',
      kind: 'approval-flow',
      promise: 'Keep AI-generated work gated by human review, approval, retry, and export — verified outcomes strengthen future predictions.',
      previewCommand: twinAwareAsk(
        snapshot,
        'Review my pending approvals and explain what needs human confirmation before execution. Flag unsupported claims and ask for missing facts.'
      ),
      approveCommand: approvalBlocked
        ? 'run ai pipeline workspace_audit_report --ack'
        : 'pipeline health',
      editTarget: 'palette',
      status: approvalBlocked ? 'blocked' : 'ready',
      progress: approvalBlocked ? 35 : 100,
      timeline: ['Review generated work', 'Human approval', 'Retry if blocked', 'Export audit'],
      exportPayload: {
        type: 'approval-flow',
        pendingReviews: snapshot.planPendingReviewCount,
        traceBundles: snapshot.memoryTraceSummary.bundleCount,
        recentPipelineRuns: snapshot.recentAiPipelineRuns.length
      }
    }
  ];
}
