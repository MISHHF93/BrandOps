/**
 * What the record says happened, and who authorised it.
 *
 * The directive's mutation flow ends `… → Command → Execution → Verification →
 * Receipt → Outcome`. The receipt is the artifact that has to answer for every
 * stage before it, and it could not: `createReceipt` accepted `requestedBy`,
 * `approvedBy`, `command`, `result`, `affectedObjects` and `nextAction` from
 * every call site and dropped all six into a `PlanReceipt` that has fields for
 * none of them. `ExecutionReceipt` — a fully specified type with a declared
 * store slot — was never written by anything. Every caller looked correct while
 * the artifact was a timestamp and a summary string.
 *
 * The second half is `approvedBy`. Five call sites passed the literal `'user'`,
 * three of them for `access: 'auto'` capabilities that ask nobody. Had the field
 * been stored, the audit trail would have asserted a human decision that never
 * happened — for an agent-initiated write, which is the specific claim a receipt
 * exists to make checkable.
 */
import { describe, expect, it } from 'vitest';
import { createReceipt } from '../../src/services/builder/executionReceiptService';
import { AGENT_CAPABILITY_REGISTRY } from '../../src/services/interop/capabilityRegistry';
import { createActivityEvent } from '../../src/services/builder/activityGraph';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';

const workspace = () => withDefaults(populatedWorkspace());

describe('the receipt records what it was given', () => {
  it('keeps the provenance every call site passes', () => {
    const { executionReceipt } = createReceipt({
      workspace: workspace(),
      requestedBy: 'agent:claude-code',
      command: 'builder.activity.ingest',
      source: 'bridge',
      summary: 'Ingested activity: shipped the rewrite',
      affectedObjects: [{ type: 'activity-event', id: 'activity-1' }],
      nextAction: 'Review it.'
    });

    expect(executionReceipt.command).toBe('builder.activity.ingest');
    expect(executionReceipt.requestedBy).toBe('agent:claude-code');
    expect(executionReceipt.affectedObjects).toEqual([
      // A ref with no label falls back to its id rather than rendering blank.
      { type: 'activity-event', id: 'activity-1', label: 'activity-1' }
    ]);
    expect(executionReceipt.nextAction).toBe('Review it.');
    expect(executionReceipt.summary).toContain('shipped the rewrite');
  });

  it('stores the governance record where it can be found again', () => {
    const { workspace: after, executionReceipt } = createReceipt({
      workspace: workspace(),
      requestedBy: 'agent:claude-code',
      command: 'builder.activity.ingest',
      summary: 'One'
    });
    // A receipt nothing reads back is not a receipt.
    expect(after.builderActivity?.executionReceipts?.[0]?.id).toBe(executionReceipt.id);
  });

  it('resolves the workspace rather than minting one', () => {
    const { executionReceipt } = createReceipt({
      workspace: workspace(),
      requestedBy: 'agent:claude-code',
      command: 'builder.activity.ingest',
      summary: 'One'
    });
    // Identity drift has been the cause of two lockouts in this codebase; a new
    // writer inventing a third workspace id is exactly how it recurs.
    expect(executionReceipt.workspaceId).toBe('local-workspace');
  });

  it('keeps the newest record first', () => {
    let ws = workspace();
    for (const summary of ['first', 'second', 'third']) {
      ws = createReceipt({
        workspace: ws,
        requestedBy: 'agent:claude-code',
        command: 'builder.activity.ingest',
        summary
      }).workspace;
    }
    expect(ws.builderActivity?.executionReceipts?.map((r) => r.summary)).toEqual([
      'third',
      'second',
      'first'
    ]);
  });
});

describe('approval provenance is derived, never asserted', () => {
  it('records no approver for a capability that asks nobody', () => {
    expect(AGENT_CAPABILITY_REGISTRY['builder.activity.ingest'].access).toBe('auto');
    const { executionReceipt } = createReceipt({
      workspace: workspace(),
      requestedBy: 'agent:claude-code',
      // The call site passes 'user'. The registry says nobody was asked, and the
      // registry is the only thing that knows.
      approvedBy: 'user',
      command: 'builder.activity.ingest',
      summary: 'Ingested'
    });
    expect(executionReceipt.approvedBy).toBeUndefined();
    expect(executionReceipt.requestedBy).toBe('agent:claude-code');
  });

  it('keeps the approver for a capability that requires one', () => {
    expect(AGENT_CAPABILITY_REGISTRY['builder.sessions.revoke'].access).toBe('approval');
    const { executionReceipt } = createReceipt({
      workspace: workspace(),
      requestedBy: 'agent:claude-code',
      approvedBy: 'user',
      command: 'builder.sessions.revoke',
      summary: 'Revoked'
    });
    expect(executionReceipt.approvedBy).toBe('user');
  });

  it('treats an unrecognised command as requiring approval', () => {
    const { executionReceipt } = createReceipt({
      workspace: workspace(),
      requestedBy: 'agent:claude-code',
      approvedBy: 'user',
      command: 'not.a.registered.capability',
      summary: 'Unknown'
    });
    // Guessing "auto" for something the registry does not describe is the unsafe
    // direction: it would quietly drop the approver from a governed write.
    expect(executionReceipt.approvedBy).toBe('user');
  });

  it('every auto-access capability that writes a receipt records no approver', () => {
    for (const [id, capability] of Object.entries(AGENT_CAPABILITY_REGISTRY)) {
      if (capability.access !== 'auto' || capability.readOnly) continue;
      const { executionReceipt } = createReceipt({
        workspace: workspace(),
        requestedBy: 'agent:test',
        approvedBy: 'user',
        command: id,
        summary: id
      });
      expect(executionReceipt.approvedBy, id).toBeUndefined();
    }
  });
});

describe('a failed command is not recorded as a success', () => {
  it('marks the result failed and the checkpoint FAILED', () => {
    const { workspace: after, executionReceipt } = createReceipt({
      workspace: workspace(),
      requestedBy: 'agent:claude-code',
      command: 'builder.activity.ingest',
      summary: 'Ingest failed',
      ok: false
    });
    expect(executionReceipt.result).toBe('failed');
    // The audit entry and the operator trace were hardcoded to success — the two
    // places anyone looks to find out what happened.
    expect(after.externalAgentAudit?.entries?.[0]?.ok).toBe(false);
    expect(after.checkpoints?.entries?.[0]?.state).toBe('FAILED');
  });

  it('still defaults to success when the caller says nothing', () => {
    const { executionReceipt } = createReceipt({
      workspace: workspace(),
      requestedBy: 'agent:claude-code',
      command: 'builder.activity.ingest',
      summary: 'Ingested'
    });
    expect(executionReceipt.result).toBe('success');
  });
});

describe('trust tier is not derivable from a caller-supplied source', () => {
  it('defaults an unspecified tier to AGENT_REPORTED, whatever the source claims', () => {
    const event = createActivityEvent(
      {
        workspaceId: 'local-workspace',
        source: 'user-action',
        sourceId: 'probe-1',
        kind: 'feature-built',
        title: 'Shipped it single-handedly',
        detail: 'Claimed by the agent, witnessed by nobody.'
      },
      new Date().toISOString(),
      true
    );
    // This used to return USER_VERIFIED — the highest tier in the system — for
    // a caller that supplied a string. The one real caller pinned the tier, so
    // nothing exploited it; the guard lived in the caller rather than here.
    expect(event.trustTier).toBe('AGENT_REPORTED');
    expect(event.verificationStatus).toBe('UNVERIFIED');
  });

  it('still honours a tier a caller states outright', () => {
    const event = createActivityEvent(
      {
        workspaceId: 'local-workspace',
        source: 'user-action',
        sourceId: 'probe-2',
        kind: 'feature-built',
        title: 'The user confirmed this',
        detail: 'Recorded from a user action in the app.',
        trustTier: 'USER_VERIFIED'
      },
      new Date().toISOString(),
      true
    );
    // Promotion has to be something a caller says, not something a string implies.
    expect(event.trustTier).toBe('USER_VERIFIED');
  });
});
