import type { BrandOpsData } from '../../types/domain';
import { buildCrossPlatformOperationalPlans } from './crossPlatformPlanner';
import { buildPlatformActionCards } from './platformActionCards';

export type HumanTrustControlType =
  | 'preview'
  | 'approval'
  | 'edit'
  | 'reject'
  | 'retry'
  | 'receipts'
  | 'audit-history';

export type HumanTrustActionKind = 'platform-action' | 'cross-platform-plan';

export interface HumanTrustControl {
  type: HumanTrustControlType;
  label: string;
  description: string;
  command?: string;
  href?: string;
}

export interface HumanTrustAction {
  id: string;
  kind: HumanTrustActionKind;
  title: string;
  location: string;
  status: string;
  riskLevel: 'external-gated' | 'workspace-only';
  controls: HumanTrustControl[];
}

export interface HumanTrustLayerReadout {
  actions: HumanTrustAction[];
  totalActions: number;
  controlTypes: HumanTrustControlType[];
  policy: string;
  headline: string;
}

export const HUMAN_TRUST_CONTROL_TYPES: HumanTrustControlType[] = [
  'preview',
  'approval',
  'edit',
  'reject',
  'retry',
  'receipts',
  'audit-history'
];

function trustCommand(action: {
  title: string;
  location: string;
  control: HumanTrustControlType;
  sourceCommand?: string;
}) {
  const label = action.control.replace('-', ' ');
  return `ask: Human Trust Layer ${label} for this cross-platform action. Keep the user in control. Do not execute externally. Show approval requirements, receipt expectations, audit history needs, and any missing context.\n\nAction: ${action.title}\nWhere: ${action.location}\nControl: ${label}\nSource command: ${action.sourceCommand ?? 'none'}`;
}

function controlsFor(input: {
  title: string;
  location: string;
  previewCommand?: string;
}): HumanTrustControl[] {
  return [
    {
      type: 'preview',
      label: 'Preview',
      description: 'Inspect the proposed output before state changes.',
      command: input.previewCommand ?? trustCommand({ ...input, control: 'preview' })
    },
    {
      type: 'approval',
      label: 'Approval',
      description: 'Route through the human approval gate before external execution.',
      href: '#plan-human-approval-queue'
    },
    {
      type: 'edit',
      label: 'Edit',
      description: 'Revise the generated output inside BrandOps.',
      command: trustCommand({ ...input, control: 'edit', sourceCommand: input.previewCommand })
    },
    {
      type: 'reject',
      label: 'Reject',
      description: 'Decline the action without sending, posting, scheduling, or syncing.',
      command: trustCommand({ ...input, control: 'reject', sourceCommand: input.previewCommand })
    },
    {
      type: 'retry',
      label: 'Retry',
      description: 'Regenerate or retry the draft safely without autonomous execution.',
      command: trustCommand({ ...input, control: 'retry', sourceCommand: input.previewCommand })
    },
    {
      type: 'receipts',
      label: 'Receipts',
      description: 'Review what happened, why, source facts, approvals, status, and warnings.',
      href: '#plan-execution-receipts'
    },
    {
      type: 'audit-history',
      label: 'Audit history',
      description: 'Inspect trace and command history before trusting the action.',
      command: trustCommand({
        ...input,
        control: 'audit-history',
        sourceCommand: input.previewCommand
      })
    }
  ];
}

export function buildHumanTrustLayer(workspace: BrandOpsData): HumanTrustLayerReadout {
  const platformActions = buildPlatformActionCards(workspace).map<HumanTrustAction>((card) => ({
    id: `trust-${card.id}`,
    kind: 'platform-action',
    title: card.title,
    location: card.platform,
    status: 'approval gated',
    riskLevel: 'external-gated',
    controls: controlsFor({
      title: card.title,
      location: card.platform,
      previewCommand: card.command
    })
  }));

  const planActions = buildCrossPlatformOperationalPlans(workspace).map<HumanTrustAction>(
    (plan) => ({
      id: `trust-${plan.id}`,
      kind: 'cross-platform-plan',
      title: plan.title,
      location: plan.connectedPlatforms.join(', ') || 'BrandOps workspace',
      status: plan.executionStatus,
      riskLevel: plan.connectedPlatforms.some((platform) => platform !== 'BrandOps workspace')
        ? 'external-gated'
        : 'workspace-only',
      controls: controlsFor({
        title: plan.title,
        location: plan.connectedPlatforms.join(', ') || 'BrandOps workspace',
        previewCommand: plan.previewCommand
      })
    })
  );

  const actions = [...platformActions, ...planActions].slice(0, 18);

  return {
    actions,
    totalActions: actions.length,
    controlTypes: HUMAN_TRUST_CONTROL_TYPES,
    policy:
      'BrandOps may preview, draft, edit, retry, explain, and queue cross-platform work, but sending, posting, scheduling, syncing, or writing to external systems always requires visible human control.',
    headline: actions.length
      ? `${actions.length} cross-platform action${actions.length === 1 ? '' : 's'} protected by preview, approval, edit, reject, retry, receipts, and audit history.`
      : 'No cross-platform actions are available yet; connect platforms or create a PLAN to activate trust controls.'
  };
}
