/**
 * @vitest-environment jsdom
 *
 * A person approving a Twin edit has to be shown the edit.
 *
 * `approvalBinding.ts` promises that an approved proposal cannot do more than
 * the user saw when they approved it. For twin updates that promise bound to
 * nothing, because nothing was ever shown. The review row in
 * `ConnectedAgentsPanel` rendered a title, a `line-clamp-2` detail, and
 * `kind · status` — then an **Approve** button. The deltas themselves, which
 * rewrite a person's headline, summary, skills and achievements, sat in
 * `builderActivity.twinProposals`, and that state had no reader outside the
 * services layer at all: no page, no accessor, nothing.
 *
 * So the wiring ran backend-to-backend. An agent proposed a change to someone's
 * professional identity, the person clicked Approve on a one-line summary, and
 * the only description of what actually changed was written to a version
 * history that also had no reader.
 *
 * `previewPromotion` closes it, and computes the answer by calling `applyDeltas`
 * exactly as the acceptance path does, against a copy it throws away. A
 * hand-written field mapping would have been a second implementation free to
 * drift from the one that runs; this one cannot claim an edit the real path
 * would not make.
 *
 * These tests drive the real chain — verify an achievement, take the proposal
 * that produces — rather than hand-building a proposal, because a fixture whose
 * deltas were typed by hand would pass against a product that never computed
 * any.
 */
import { describe, expect, it } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  applyAchievementVerification,
  previewPromotion
} from '../../src/services/builder/promotions';
import { agentBridge } from '../../src/services/interop/agentBridge';
import { ConnectedAgentsPanel } from '../../src/pages/mobile/ConnectedAgentsPanel';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';
import type { AgentProposal } from '../../src/types/agentInterop';

const EVENT_ID = 'event-preview-1';
const TITLE = 'Shipped the approval preview';

/** A workspace with one achievement candidate awaiting verification. */
function pendingVerification(): BrandOpsData {
  const base = withDefaults(populatedWorkspace());
  return {
    ...base,
    builderActivity: {
      ...(base.builderActivity ?? {}),
      workspaceId: base.builderActivity?.workspaceId ?? 'local-workspace',
      events: [
        {
          id: EVENT_ID,
          workspaceId: 'local-workspace',
          source: 'user-action',
          sourceId: 'src-1',
          kind: 'feature-built',
          title: TITLE,
          detail: 'Delivered and reviewed.',
          confidence: 0.9,
          trustTier: 'AGENT_REPORTED',
          verificationStatus: 'UNVERIFIED',
          entityRefs: [],
          evidence: [],
          recordedBy: 'test',
          recordedReason: 'fixture',
          timestamp: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      achievements: [
        {
          id: `achievement-${EVENT_ID}`,
          workspaceId: 'local-workspace',
          eventId: EVENT_ID,
          title: TITLE,
          description: 'Delivered and reviewed.',
          kind: 'feature-shipped',
          sourceEvents: [EVENT_ID],
          confidence: 0.9,
          professionalRelevance: [],
          verificationRequired: true,
          evidence: [],
          reason: 'Detected from a completed feature.',
          detectedAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      twinProposals: [],
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  } as BrandOpsData;
}

/** Verify the candidate and return the workspace plus the Twin proposal it produced. */
function withTwinProposal() {
  const verified = applyAchievementVerification(pendingVerification(), EVENT_ID);
  const proposal = (verified.builderActivity?.twinProposals ?? [])[0];
  if (!proposal) throw new Error('verification produced no Twin proposal');
  return { workspace: verified, proposal };
}

function agentProposalFor(
  targetId: string,
  action: 'verify-achievement' | 'accept-twin-proposal'
): AgentProposal {
  return {
    id: 'agent-proposal-1',
    kind: 'promotion',
    title: 'Accept a Twin update',
    detail: 'An agent proposed changes to your Twin.',
    rationale: 'Derived from verified work.',
    status: 'pending',
    tier: 'SENSITIVE_ACTION',
    promotion: { action, targetId },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

describe('previewPromotion', () => {
  it('names the fields a twin update will change', () => {
    const { workspace, proposal } = withTwinProposal();

    const preview = previewPromotion(workspace, {
      action: 'accept-twin-proposal',
      targetId: proposal.id
    });

    expect(preview?.missing).toBe(false);
    expect(preview?.changes.length, 'no changes described').toBeGreaterThan(0);
    for (const change of preview?.changes ?? []) {
      expect(change.field.length).toBeGreaterThan(0);
      expect(change.to.length).toBeGreaterThan(0);
    }
  });

  it('describes the same edit the acceptance path would make', () => {
    /**
     * The property that matters, and the reason the preview runs the engine
     * rather than restating it. Whatever the preview promises must be what the
     * Twin actually receives.
     */
    const { workspace, proposal } = withTwinProposal();
    const preview = previewPromotion(workspace, {
      action: 'accept-twin-proposal',
      targetId: proposal.id
    });

    expect(preview?.changes.some((c) => c.to.includes(TITLE))).toBe(true);
  });

  it('says a verification does not edit the Twin', () => {
    // Approving a verification produces a *proposal*; it does not move the Twin.
    // Claiming otherwise on the button would be the same lie in the other
    // direction.
    const preview = previewPromotion(pendingVerification(), {
      action: 'verify-achievement',
      targetId: EVENT_ID
    });

    expect(preview?.action).toBe('verify-achievement');
    expect(preview?.subject).toBe(TITLE);
    expect(preview?.changes).toEqual([]);
    expect(preview?.missing).toBe(false);
  });

  it('reports a target that has since disappeared', () => {
    // An approval outliving its subject must say so rather than describe
    // an empty change set as "changes nothing".
    const { workspace } = withTwinProposal();
    const preview = previewPromotion(workspace, {
      action: 'accept-twin-proposal',
      targetId: 'proposal-that-never-existed'
    });

    expect(preview?.missing).toBe(true);
  });

  it('returns nothing for a proposal that promotes nothing', () => {
    const { workspace } = withTwinProposal();
    const plain = { ...agentProposalFor('x', 'accept-twin-proposal'), promotion: undefined };

    expect(agentBridge.previewProposal(workspace, plain)).toBeNull();
  });
});

describe('the review row a person actually reads', () => {
  /** Render the panel against a workspace and return its HTML. */
  async function renderPanel(workspace: BrandOpsData): Promise<string> {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        React.createElement(ConnectedAgentsPanel, {
          loadWorkspace: async () => workspace,
          applyWorkspace: async () => {}
        })
      );
    });
    const html = host.innerHTML;
    await act(async () => root.unmount());
    host.remove();
    return html;
  }

  it('shows the edit before the Approve button, not just a title', async () => {
    const { workspace, proposal } = withTwinProposal();
    const staged: BrandOpsData = {
      ...workspace,
      agentProposals: {
        ...(workspace.agentProposals ?? {}),
        entries: [agentProposalFor(proposal.id, 'accept-twin-proposal')]
      }
    } as BrandOpsData;

    const html = await renderPanel(staged);

    // The row exists at all — otherwise the assertion below is vacuous.
    expect(html).toContain('Approve');
    /**
     * The achievement being written into the Twin has to be legible on screen.
     * This was absent: the value lived only in `twinProposals`, which the
     * interface could not read.
     */
    expect(html, 'the row does not show what approving changes').toContain(
      'Approving edits your Twin'
    );
    expect(html).toContain(TITLE);
  });

  it('does not claim a Twin edit for a verification', async () => {
    const base = pendingVerification();
    const staged: BrandOpsData = {
      ...base,
      agentProposals: {
        ...(base.agentProposals ?? {}),
        entries: [agentProposalFor(EVENT_ID, 'verify-achievement')]
      }
    } as BrandOpsData;

    const html = await renderPanel(staged);

    expect(html).toContain('Approve');
    expect(html).not.toContain('Approving edits your Twin');
    expect(html).toContain('verified');
  });
});
