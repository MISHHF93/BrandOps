import type { BrandOpsData } from '../../types/domain';
import { buildPlatformAwareAskReadout } from '../ai/platformAwareAskContext';

export type CrossPlatformPlanKind =
  | 'communication'
  | 'content'
  | 'workflow'
  | 'outreach-sequence'
  | 'scheduling-timeline'
  | 'follow-up-queue';

export type CrossPlatformPlanStatus = 'ready' | 'in-progress' | 'needs-approval' | 'needs-context';

export interface CrossPlatformOperationalPlan {
  id: string;
  kind: CrossPlatformPlanKind;
  title: string;
  purpose: string;
  connectedPlatforms: string[];
  executionSteps: string[];
  approvalRequirements: string[];
  executionStatus: CrossPlatformPlanStatus;
  timeline: string[];
  receiptRefs: string[];
  previewCommand: string;
}

function uniq(values: string[], cap = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const t = value.replace(/\s+/g, ' ').trim();
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t.slice(0, 220));
    if (out.length >= cap) break;
  }
  return out;
}

function includeAvailable(connected: string[], desired: string[], fallback = 'BrandOps workspace') {
  const set = new Set(connected.map((item) => item.toLowerCase()));
  const available = desired.filter((item) => set.has(item.toLowerCase()));
  return available.length ? available : [fallback];
}

function statusFrom(input: {
  hasContext: boolean;
  hasWork: boolean;
  pendingApprovals: number;
}): CrossPlatformPlanStatus {
  if (input.pendingApprovals > 0) return 'needs-approval';
  if (!input.hasContext) return 'needs-context';
  if (input.hasWork) return 'in-progress';
  return 'ready';
}

function approvalRequirements(platforms: string[], externalAction: string): string[] {
  const externalPlatforms = platforms.filter((platform) => platform !== 'BrandOps workspace');
  return [
    'Preview generated output inside BrandOps.',
    'Human approval required before external sending, posting, scheduling, syncing, or CRM updates.',
    externalPlatforms.length
      ? `External platforms gated: ${externalPlatforms.join(', ')}.`
      : 'No connected external platform action can run from this plan yet.',
    externalAction
  ];
}

function receiptRefs(workspace: BrandOpsData, label: string): string[] {
  return uniq(
    [
      ...((workspace.aiPipelineRuns?.entries ?? [])
        .slice(0, 3)
        .map((run) => `Pipeline receipt: ${run.pipeline_id} (${run.status})`) ?? []),
      ...((workspace.operatorTraces?.entries ?? [])
        .slice(0, 3)
        .map(
          (trace) =>
            `Operator receipt: ${trace.verb}${trace.reviewStatus ? ` (${trace.reviewStatus})` : ''}`
        ) ?? []),
      label
    ],
    5
  );
}

export function buildCrossPlatformOperationalPlans(
  workspace: BrandOpsData
): CrossPlatformOperationalPlan[] {
  const platformReadout = buildPlatformAwareAskReadout(workspace);
  const connected = platformReadout.connectedApps;
  const pendingApprovals = (workspace.operatorTraces?.entries ?? []).filter(
    (trace) => trace.reviewStatus === 'pending'
  ).length;
  const hasConnectedApps = connected.length > 0;
  const openFollowUps = workspace.followUps.filter((item) => !item.completed);
  const activeOpportunities = workspace.opportunities.filter((item) => !item.archivedAt);
  const unpostedPublishing = workspace.publishingQueue.filter((item) => item.status !== 'posted');
  const openSchedulerTasks = workspace.scheduler.tasks.filter(
    (item) => item.status !== 'completed'
  );

  const communicationPlatforms = includeAvailable(connected, ['Gmail', 'Slack', 'LinkedIn']);
  const contentPlatforms = includeAvailable(connected, [
    'Notion',
    'LinkedIn',
    'X/Twitter',
    'Instagram',
    'YouTube'
  ]);
  const workflowPlatforms = includeAvailable(connected, [
    'Notion',
    'Slack',
    'GitHub',
    'Jira',
    'Airtable'
  ]);
  const outreachPlatforms = includeAvailable(connected, [
    'Gmail',
    'LinkedIn',
    'HubSpot',
    'Salesforce'
  ]);
  const schedulingPlatforms = includeAvailable(connected, ['Google Calendar', 'Slack']);
  const followUpPlatforms = includeAvailable(connected, [
    'Gmail',
    'Google Calendar',
    'HubSpot',
    'Salesforce'
  ]);

  return [
    {
      id: 'cross-platform-communication',
      kind: 'communication',
      title: 'Communication Plan',
      purpose: 'Coordinate messaging across approved email, social, and team channels.',
      connectedPlatforms: communicationPlatforms,
      executionSteps: [
        'Read approved conversation summaries and recent activity.',
        'Draft message options in the active twin voice.',
        'Route drafts to Human Approval Queue.',
        'After approval, log receipt before any external send.'
      ],
      approvalRequirements: approvalRequirements(
        communicationPlatforms,
        'Sending messages always requires explicit approval.'
      ),
      executionStatus: statusFrom({
        hasContext: hasConnectedApps || workspace.outreachDrafts.length > 0,
        hasWork: workspace.outreachDrafts.length > 0,
        pendingApprovals
      }),
      timeline: [
        'Context review',
        'Draft',
        'Approve',
        'Send manually or through approved bridge',
        'Receipt'
      ],
      receiptRefs: receiptRefs(workspace, 'Communication receipt expected after approval.'),
      previewCommand:
        'ask: Build a cross-platform communication plan using connected apps and approved summaries only. Do not claim access to unavailable integrations. Include draft path, approvals, timeline, and receipt requirements.'
    },
    {
      id: 'cross-platform-content',
      kind: 'content',
      title: 'Content Plan',
      purpose:
        'Turn approved notes, twin positioning, and platform context into publishable content.',
      connectedPlatforms: contentPlatforms,
      executionSteps: [
        'Collect approved Notion/local notes and content ideas.',
        'Map themes to platform-specific drafts.',
        'Create schedule candidates without publishing.',
        'Require approval before posts are scheduled or exported.'
      ],
      approvalRequirements: approvalRequirements(
        contentPlatforms,
        'Publishing and scheduling content require approval.'
      ),
      executionStatus: statusFrom({
        hasContext: hasConnectedApps || workspace.contentLibrary.length > 0,
        hasWork: workspace.contentLibrary.length > 0 || unpostedPublishing.length > 0,
        pendingApprovals
      }),
      timeline: ['Source notes', 'Draft calendar', 'Approve content', 'Schedule/export', 'Receipt'],
      receiptRefs: receiptRefs(
        workspace,
        'Content plan receipt expected after approved schedule/export.'
      ),
      previewCommand:
        'ask: Turn my connected notes and content context into a cross-platform content plan. Use only connected or local approved sources. Include platform fit, steps, approvals, timeline, and receipts.'
    },
    {
      id: 'cross-platform-workflow',
      kind: 'workflow',
      title: 'Workflow Plan',
      purpose: 'Coordinate operational work across knowledge, team, task, and execution systems.',
      connectedPlatforms: workflowPlatforms,
      executionSteps: [
        'Review current workflow state and recent activity.',
        'Identify dependencies, blockers, and next artifacts.',
        'Sequence tasks into PLAN timeline.',
        'Gate any external task creation, sync, or update behind approval.'
      ],
      approvalRequirements: approvalRequirements(
        workflowPlatforms,
        'Creating or updating external tasks/docs requires approval.'
      ),
      executionStatus: statusFrom({
        hasContext: hasConnectedApps || workspace.notes.length > 0 || openSchedulerTasks.length > 0,
        hasWork: openSchedulerTasks.length > 0,
        pendingApprovals
      }),
      timeline: ['Intake', 'Dependency map', 'Execution sequence', 'Approval gate', 'Receipt'],
      receiptRefs: receiptRefs(
        workspace,
        'Workflow receipt expected after approved task/doc update.'
      ),
      previewCommand:
        'ask: Build a cross-platform workflow plan from my workflow state, recent activity, and operational context. Do not invent unavailable apps. Include steps, approvals, timeline, execution status, and receipts.'
    },
    {
      id: 'cross-platform-outreach-sequence',
      kind: 'outreach-sequence',
      title: 'Outreach Sequence',
      purpose:
        'Plan outreach drafts, touchpoints, and follow-ups across CRM and communication apps.',
      connectedPlatforms: outreachPlatforms,
      executionSteps: [
        'Select active opportunities or contacts.',
        'Draft initial outreach and follow-up sequence.',
        'Preview every message before approval.',
        'Record receipt for approval and delivery status.'
      ],
      approvalRequirements: approvalRequirements(
        outreachPlatforms,
        'Outreach sends and CRM writes require explicit approval.'
      ),
      executionStatus: statusFrom({
        hasContext: hasConnectedApps || activeOpportunities.length > 0,
        hasWork: workspace.outreachDrafts.length > 0 || activeOpportunities.length > 0,
        pendingApprovals
      }),
      timeline: [
        'Target selection',
        'Draft sequence',
        'Approve each touch',
        'Queue follow-up',
        'Receipt'
      ],
      receiptRefs: receiptRefs(workspace, 'Outreach receipt expected after approved touchpoint.'),
      previewCommand:
        'ask: Create a cross-platform outreach sequence using active opportunities, approved communication context, and connected platforms only. Include approval gates, timeline, status, and receipts.'
    },
    {
      id: 'cross-platform-scheduling',
      kind: 'scheduling-timeline',
      title: 'Scheduling Timeline',
      purpose:
        'Turn meetings, reminders, cadence, and content deadlines into an operating timeline.',
      connectedPlatforms: schedulingPlatforms,
      executionSteps: [
        'Review calendar/scheduler context and due tasks.',
        'Build a realistic operating timeline.',
        'Preview schedule changes before writing to any calendar.',
        'Generate receipt for approved schedule updates.'
      ],
      approvalRequirements: approvalRequirements(
        schedulingPlatforms,
        'Calendar writes, reminders, and sync updates require approval.'
      ),
      executionStatus: statusFrom({
        hasContext: hasConnectedApps || openSchedulerTasks.length > 0,
        hasWork: openSchedulerTasks.length > 0,
        pendingApprovals
      }),
      timeline: [
        'Calendar/context read',
        'Timeline draft',
        'Approve schedule',
        'Sync/export',
        'Receipt'
      ],
      receiptRefs: receiptRefs(
        workspace,
        'Scheduling receipt expected after approved timeline action.'
      ),
      previewCommand:
        'ask: Build a scheduling timeline from my calendar, scheduler, cadence, and operational context. If Calendar is unavailable, say so. Include approval requirements and receipts.'
    },
    {
      id: 'cross-platform-follow-up-queue',
      kind: 'follow-up-queue',
      title: 'Follow-up Queue',
      purpose:
        'Prioritize follow-ups across contacts, opportunities, email, calendar, and CRM context.',
      connectedPlatforms: followUpPlatforms,
      executionSteps: [
        'Rank open follow-ups by urgency and opportunity value.',
        'Draft next-touch options in the active twin voice.',
        'Queue review items for approval.',
        'Track completion and receipt status.'
      ],
      approvalRequirements: approvalRequirements(
        followUpPlatforms,
        'Follow-up sends, CRM updates, and calendar changes require approval.'
      ),
      executionStatus: statusFrom({
        hasContext: hasConnectedApps || openFollowUps.length > 0,
        hasWork: openFollowUps.length > 0,
        pendingApprovals
      }),
      timeline: ['Prioritize', 'Draft next touch', 'Approve', 'Complete/update', 'Receipt'],
      receiptRefs: receiptRefs(
        workspace,
        'Follow-up receipt expected after approved queue action.'
      ),
      previewCommand:
        'ask: Build a follow-up queue using open follow-ups, active opportunities, connected communication apps, and approved summaries only. Include approval gates, timeline, execution status, and receipts.'
    }
  ];
}
