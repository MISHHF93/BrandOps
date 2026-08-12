import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CheckpointTimeline } from '../../src/shared/ui/execution/CheckpointTimeline';
import type { Checkpoint } from '../../src/types/executionState';

function checkpoint(
  overrides: Partial<Checkpoint> & Pick<Checkpoint, 'id' | 'type' | 'state' | 'summary'>
): Checkpoint {
  return {
    conversationId: 'c1',
    at: '2026-08-08T00:00:00.000Z',
    source: 'assistant',
    ...overrides
  };
}

describe('CheckpointTimeline', () => {
  it('does not repeat the summary/status of a single-node chain', () => {
    const failed = checkpoint({
      id: 'chk-fail',
      type: 'ask.response',
      state: 'FAILED',
      summary: 'Ask failed',
      errorState: {
        code: 'x',
        message: 'AI adapter mode is disabled.',
        recoveryActions: ['inspect']
      }
    });
    const html = renderToStaticMarkup(
      <CheckpointTimeline checkpoints={[failed]} handlers={{ onInspect: () => {} }} />
    );
    expect(html.match(/Ask failed/g)?.length ?? 0).toBe(1);
  });

  it('hides Approve/Reject on an approval row already superseded by a decision child', () => {
    const saved = checkpoint({
      id: 'chk-saved',
      type: 'plan.saved',
      state: 'COMPLETED',
      summary: 'Plan saved'
    });
    const requested = checkpoint({
      id: 'chk-requested',
      parentCheckpointId: 'chk-saved',
      type: 'plan.approval_requested',
      state: 'NEEDS_APPROVAL',
      summary: 'Approval requested: Plan',
      associatedPlanRef: { id: 'plan-1', kind: 'saved' }
    });
    const granted = checkpoint({
      id: 'chk-granted',
      parentCheckpointId: 'chk-requested',
      type: 'plan.approval_granted',
      state: 'COMPLETED',
      summary: 'Approved for execution.',
      associatedPlanRef: { id: 'plan-1', kind: 'saved' }
    });
    const html = renderToStaticMarkup(
      <CheckpointTimeline
        checkpoints={[saved, requested, granted]}
        handlers={{ onApprove: () => {}, onReject: () => {} }}
      />
    );
    expect(html).not.toMatch(/\bApprove\b/);
    expect(html).not.toMatch(/\bReject\b/);
    expect(html).toContain('Approved for execution.');
  });

  it('still shows live Approve/Reject on the leaf of a pending approval chain', () => {
    const saved = checkpoint({
      id: 'chk-saved-2',
      type: 'plan.saved',
      state: 'COMPLETED',
      summary: 'Plan saved'
    });
    const requested = checkpoint({
      id: 'chk-requested-2',
      parentCheckpointId: 'chk-saved-2',
      type: 'plan.approval_requested',
      state: 'NEEDS_APPROVAL',
      summary: 'Approval requested: Plan',
      associatedPlanRef: { id: 'plan-2', kind: 'saved' }
    });
    const html = renderToStaticMarkup(
      <CheckpointTimeline
        checkpoints={[saved, requested]}
        handlers={{ onApprove: () => {}, onReject: () => {} }}
      />
    );
    expect(html).toMatch(/\bApprove\b/);
    expect(html).toMatch(/\bReject\b/);
  });

  it('renders the receipt on an approval-requested checkpoint, not just on plain completed rows', () => {
    /** Real shape from `planSavedCheckpoint` (planExecutionCheckpoints.ts): when a plan requires
     * approval, `receiptRef` lands directly on the `plan.approval_requested`/NEEDS_APPROVAL node
     * itself — there is no separate preceding COMPLETED node to carry it. */
    const requested = checkpoint({
      id: 'chk-requested-3',
      type: 'plan.approval_requested',
      state: 'NEEDS_APPROVAL',
      summary: 'Approval requested: Plan',
      associatedPlanRef: { id: 'plan-3', kind: 'saved' },
      receiptRef: 'receipt-3'
    });
    const html = renderToStaticMarkup(
      <CheckpointTimeline
        checkpoints={[requested]}
        handlers={{
          onApprove: () => {},
          onReject: () => {},
          resolveReceipt: () => ({
            id: 'receipt-3',
            summary: 'Converted outreach plan from Ask response.',
            timestamp: '2026-08-08T00:00:00.000Z',
            result: 'Draft opener, Schedule follow-up',
            status: 'pending-approval'
          })
        }}
      />
    );
    expect(html).toContain('Converted outreach plan from Ask response.');
    expect(html).toMatch(/\bApprove\b/);
  });

  it("surfaces the consulted expert's specialty when toolRef.expertId is set", () => {
    const toolCall = checkpoint({
      id: 'chk-tool-1',
      type: 'tool.invocation',
      state: 'COMPLETED',
      summary: 'Consulted: Positioning Expert',
      toolRef: { expertId: 'positioning-expert' }
    });
    const html = renderToStaticMarkup(<CheckpointTimeline checkpoints={[toolCall]} />);
    expect(html).toContain('Clarifies market position');
  });

  it('resolves associatedTwinId to a display name on a plain completed row', () => {
    const response = checkpoint({
      id: 'chk-twin-1',
      type: 'ask.response',
      state: 'COMPLETED',
      summary: 'Here is a draft.',
      associatedTwinId: 'twin-1'
    });
    const html = renderToStaticMarkup(
      <CheckpointTimeline
        checkpoints={[response]}
        handlers={{ resolveTwinName: () => 'Consulting Twin' }}
      />
    );
    expect(html).toContain('Twin: Consulting Twin');
  });

  it('resolves associatedTwinId on a FAILED checkpoint too, not just plain rows', () => {
    const failed = checkpoint({
      id: 'chk-twin-fail',
      type: 'ask.response',
      state: 'FAILED',
      summary: 'Ask failed',
      associatedTwinId: 'twin-2',
      errorState: {
        code: 'x',
        message: 'AI adapter mode is disabled.',
        recoveryActions: ['inspect']
      }
    });
    const html = renderToStaticMarkup(
      <CheckpointTimeline
        checkpoints={[failed]}
        handlers={{ onInspect: () => {}, resolveTwinName: () => 'Consulting Twin' }}
      />
    );
    expect(html).toContain('Twin: Consulting Twin');
  });

  it('renders an Open Plan action on a plain row that carries associatedPlanRef, when a handler is wired', () => {
    const saved = checkpoint({
      id: 'chk-openplan-1',
      type: 'plan.saved',
      state: 'COMPLETED',
      summary: 'Cold outreach sequence for Q3 leads',
      associatedPlanRef: { id: 'plan-openplan-1', kind: 'saved' }
    });
    const html = renderToStaticMarkup(
      <CheckpointTimeline checkpoints={[saved]} handlers={{ onOpenPlan: () => {} }} />
    );
    expect(html).toContain('Open Plan');
  });

  it('does not render Open Plan when no handler is wired (no dead button)', () => {
    const saved = checkpoint({
      id: 'chk-openplan-2',
      type: 'plan.saved',
      state: 'COMPLETED',
      summary: 'Cold outreach sequence for Q3 leads',
      associatedPlanRef: { id: 'plan-openplan-2', kind: 'saved' }
    });
    const html = renderToStaticMarkup(<CheckpointTimeline checkpoints={[saved]} />);
    expect(html).not.toContain('Open Plan');
  });
});
