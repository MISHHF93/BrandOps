/**
 * @vitest-environment jsdom
 *
 * An approval row has to say what approving does.
 *
 * Before this, it said who was asking and what for. The reader was shown a
 * request and an Approve button, and nothing about the consequence: whether
 * anything leaves the workspace, whether it can be undone, what it touches.
 * Those are the questions someone actually has in front of that button.
 *
 * **The answers already existed.** Every capability in the registry carries a
 * `tier` and a `readOnly` flag, and `OperatorTraceEntry` carries a
 * `capabilityId` to look them up with. Two things were in the way, and both were
 * omissions rather than bugs:
 *
 * 1. `buildPendingReviewPeek` copied eleven fields to the UI and dropped
 *    `capabilityId` — the only one that knows the consequence.
 * 2. `askPlanConversion`, the path a person actually goes through, never set it.
 *    `convertToPlan.ts` records `plan.convert` for the identical operation over
 *    MCP; the human path recorded no capability at all.
 *
 * So the row was only half the fix. These tests drive the real conversion rather
 * than a hand-built trace, because a fixture with `capabilityId` filled in by
 * hand would have passed against the broken product.
 */
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { MobileWorkspaceHubView } from '../../src/pages/mobile/MobileWorkspaceHubView';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { describeApprovalConsequence } from '../../src/services/interop/capabilityRegistry';
import { cloneDemoSampleData } from '../helpers/fixtures';
import type { BrandOpsData, OperatorTraceEntry } from '../../src/types/domain';

const noop = () => {};

function render(workspace: BrandOpsData): Document {
  const html = renderToString(
    React.createElement(MobileWorkspaceHubView, {
      snapshot: buildWorkspaceSnapshot(workspace),
      btnFocus: '',
      commandBusy: false,
      runCommand: noop,
      onOpenToday: noop,
      launchAccess: {
        auth: { isAuthenticated: true, provider: 'google', email: 'operator@fixture.test' },
        membership: { status: 'active' }
      },
      onOpenSettings: noop,
      onOpenIntegrations: noop,
      onOpenCommandPalette: noop,
      firstRunJourneyVisible: true,
      canRunWorkspaceCommands: true,
      workspaceCommandLockReason: null,
      onDownloadPipelineRun: noop,
      onApproveOperatorTrace: async () => {}
    } as never)
  );
  return new JSDOM(`<body>${html}</body>`).window.document;
}

function withPendingTrace(extra: Partial<OperatorTraceEntry>): BrandOpsData {
  const workspace = cloneDemoSampleData();
  const entry = {
    id: 'trace-approval-1',
    at: new Date().toISOString(),
    source: 'assistant',
    verb: 'ask.convert_to_plan',
    surface: 'plan',
    entityType: 'plan',
    entityId: 'plan-1',
    outcome: 'success',
    labels: ['human-gated'],
    reviewStatus: 'pending',
    ...extra
  } as OperatorTraceEntry;
  return {
    ...workspace,
    settings: { ...workspace.settings, operatorTraceCollectionEnabled: true },
    operatorTraces: { entries: [entry, ...(workspace.operatorTraces?.entries ?? [])] }
  } as BrandOpsData;
}

/** Text a reader sees without opening anything. */
function collapsedText(doc: Document): string {
  return Array.from(doc.querySelectorAll('summary'))
    .map((element) => (element.textContent ?? '').replace(/\s+/g, ' '))
    .join(' | ');
}

describe('the registry knows what approving does', () => {
  it('says a read changes nothing', () => {
    const consequence = describeApprovalConsequence('plans.read');
    expect(consequence?.reversible).toBe(true);
    expect(consequence?.leavesWorkspace).toBe(false);
    expect(consequence?.effect).toMatch(/changes nothing/i);
  });

  it('warns that a sensitive action cannot be undone', () => {
    const consequence = describeApprovalConsequence('builder.sessions.revoke');
    expect(consequence?.reversible).toBe(false);
    expect(consequence?.effect).toMatch(/cannot be undone/i);
  });

  it('refuses to describe a capability it does not know', () => {
    // A confident default here would be a fabricated safety claim, which is
    // worse than saying nothing at all.
    expect(describeApprovalConsequence('not.a.capability')).toBeNull();
  });

  it('describes every capability the registry defines', async () => {
    const { AGENT_CAPABILITY_IDS } = await import('../../src/types/agentInterop');
    const undescribed = AGENT_CAPABILITY_IDS.filter(
      (id) => describeApprovalConsequence(id) === null
    );
    // Derived from `tier` and `readOnly` rather than written per action, so a
    // capability added next month explains itself without anyone remembering.
    expect(undescribed).toEqual([]);
  });
});

describe('the approval row shows it', () => {
  it('states the consequence without the reader opening anything', () => {
    const doc = render(withPendingTrace({ capabilityId: 'plan.convert' }));
    expect(collapsedText(doc)).toMatch(/writes to your workspace/i);
  });

  it('says nothing when the trace does not record a capability', () => {
    const doc = render(withPendingTrace({ capabilityId: undefined }));
    // The counter-case. If the row invented a consequence, the test above would
    // pass against a product that guesses.
    expect(collapsedText(doc)).not.toMatch(/writes to your workspace/i);
  });

  it('carries the capability through the snapshot at all', () => {
    const snapshot = buildWorkspaceSnapshot(withPendingTrace({ capabilityId: 'plan.convert' }));
    const pending = snapshot.planPendingReviewPeek.find((item) => item.id === 'trace-approval-1');
    // The builder used to drop this field, which is what made the row silent.
    expect(pending?.capabilityId).toBe('plan.convert');
  });
});

describe('the path a person actually takes records it', () => {
  it('records a capability on the trace it writes for approval', async () => {
    const { convertAskResponseToPlan, savePlanDraftToWorkspace } =
      await import('../../src/services/plan/askPlanConversion');
    const base = cloneDemoSampleData();
    const workspace = {
      ...base,
      settings: { ...base.settings, operatorTraceCollectionEnabled: true }
    } as BrandOpsData;

    const draft = convertAskResponseToPlan({
      conversationId: 'conv-approval',
      messageId: 'msg-approval',
      responseText: 'Draft outreach to three launch partners and send it this week.',
      userIntent: 'How should I reach launch partners?',
      planPreset: 'outreach-plan',
      sourceSurface: 'ask',
      workspaceContext: workspace
    } as never);
    expect(draft.ok, 'draft did not convert').toBe(true);
    if (!draft.ok) return;

    const saved = savePlanDraftToWorkspace({
      workspace,
      draft: draft.draft,
      userAction: 'save-plan',
      convertedFromLabel: 'ask'
    } as never);

    const conversion = (saved.workspace.operatorTraces?.entries ?? []).find(
      (entry) => entry.verb === 'ask.convert_to_plan'
    );

    /**
     * The heart of it, driven through the real conversion rather than a
     * hand-built trace. `convertToPlan.ts` has always recorded `plan.convert`
     * for this same operation over MCP; this path recorded nothing, so every
     * approval a person created was unexplainable by construction.
     */
    expect(conversion, 'no conversion trace written').toBeDefined();
    expect(conversion?.capabilityId).toBe('plan.convert');
    expect(describeApprovalConsequence(conversion?.capabilityId ?? '')).not.toBeNull();
  });
});
