/**
 * @vitest-environment jsdom
 *
 * A person can see how their own Twin changed.
 *
 * `twinVersionHistory` has been written on every accepted proposal since the
 * acceptance path stopped discarding the version the engine returns. Nothing
 * read it. Not a page, not the workspace snapshot, not an accessor — the same
 * shape as `twinProposals` in the previous cycle, and the same consequence: a
 * record of how someone's professional identity changed, kept somewhere they
 * cannot look.
 *
 * That is worse than not recording it. A history that exists and is unreachable
 * invites the belief that the question has been answered.
 *
 * These tests drive the whole path rather than any part of it — verify an
 * achievement, accept the proposal it produces, build the snapshot the settings
 * surface actually consumes, render that surface — because every previous cycle
 * found the same failure: a link wired at one end with nothing reporting that
 * the road did not meet. A hand-built history would have rendered perfectly
 * against a snapshot that never carried one.
 */
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import {
  applyAchievementVerification,
  applyTwinProposalAcceptance
} from '../../src/services/builder/promotions';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { SettingsTwinDashboard } from '../../src/pages/mobile/MobileSettingsAISurface';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';

const EVENT_ID = 'event-history-visible';
const TITLE = 'Shipped the twin change history';

function pendingVerification(title = TITLE, eventId = EVENT_ID): BrandOpsData {
  const base = withDefaults(populatedWorkspace());
  return {
    ...base,
    builderActivity: {
      ...(base.builderActivity ?? {}),
      workspaceId: base.builderActivity?.workspaceId ?? 'local-workspace',
      events: [
        {
          id: eventId,
          workspaceId: 'local-workspace',
          source: 'user-action',
          sourceId: 'src-1',
          kind: 'feature-built',
          title,
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
          id: `achievement-${eventId}`,
          workspaceId: 'local-workspace',
          eventId,
          title,
          description: 'Delivered and reviewed.',
          kind: 'feature-shipped',
          sourceEvents: [eventId],
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

/** Verify then accept — the only path that writes a version. */
function acceptOnce(workspace: BrandOpsData, eventId = EVENT_ID): BrandOpsData {
  const verified = applyAchievementVerification(workspace, eventId);
  const proposal = (verified.builderActivity?.twinProposals ?? [])[0];
  if (!proposal) throw new Error('verification produced no Twin proposal');
  return applyTwinProposalAcceptance(verified, proposal.id);
}

function renderTwinSettings(workspace: BrandOpsData): Document {
  const html = renderToString(
    React.createElement(SettingsTwinDashboard, {
      snapshot: buildWorkspaceSnapshot(workspace),
      btnFocus: '',
      disabled: false,
      runCommand: () => {},
      onDeleteActiveDigitalTwin: () => {}
    })
  );
  return new JSDOM(`<!doctype html><body>${html}</body>`).window.document;
}

describe('the snapshot the settings surface reads', () => {
  it('carries the history the acceptance path recorded', () => {
    const after = acceptOnce(pendingVerification());

    // The service side genuinely wrote something — otherwise the UI assertions
    // below would be testing an empty list rendering correctly.
    expect(after.twinVersionHistory?.versions.length ?? 0).toBeGreaterThan(0);
    expect(buildWorkspaceSnapshot(after).twinChangeHistory.length).toBeGreaterThan(0);
  });

  it('is empty on a workspace that has accepted nothing', () => {
    expect(buildWorkspaceSnapshot(withDefaults(populatedWorkspace())).twinChangeHistory).toEqual(
      []
    );
  });

  it('leaves out the seeded entry, which records no change', () => {
    /**
     * The history is seeded with where the Twin *was*, so its first entry
     * carries no changes. Listing it would claim an edit that never happened —
     * and one acceptance would read as two.
     */
    const after = acceptOnce(pendingVerification());

    expect(after.twinVersionHistory?.versions.length).toBeGreaterThan(1);
    expect(buildWorkspaceSnapshot(after).twinChangeHistory).toHaveLength(1);
  });

  it('puts the newest change first', () => {
    const first = acceptOnce(pendingVerification());
    const second = acceptOnce(
      {
        ...pendingVerification('A second shipped thing', 'event-2'),
        twinVersionHistory: first.twinVersionHistory
      },
      'event-2'
    );

    const history = buildWorkspaceSnapshot(second).twinChangeHistory;
    expect(history).toHaveLength(2);
    expect(history[0].changes.some((c) => c.to.includes('A second shipped thing'))).toBe(true);
  });

  it('says what changed, when, and by what', () => {
    const entry = buildWorkspaceSnapshot(acceptOnce(pendingVerification())).twinChangeHistory[0];

    expect(entry.changes.length).toBeGreaterThan(0);
    expect(entry.appliedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.appliedBy.length).toBeGreaterThan(0);
  });
});

describe('the Twin settings surface', () => {
  it('shows the change and its new value', () => {
    const doc = renderTwinSettings(acceptOnce(pendingVerification()));
    const text = doc.body.textContent ?? '';

    // The section exists at all — guards against a vacuous content match.
    expect(text).toContain('Change history');
    /**
     * The achievement that was written into the Twin has to be legible. This
     * was unreachable: the value lived only in `twinVersionHistory`, which no
     * interface could read.
     */
    expect(text, 'the recorded change is not on screen').toContain(TITLE);
  });

  it('says so plainly when nothing has been accepted', () => {
    const doc = renderTwinSettings(withDefaults(populatedWorkspace()));
    const text = doc.body.textContent ?? '';

    // An empty section that renders nothing looks like a surface that is broken
    // rather than one with nothing to report.
    expect(text).toContain('Change history');
    expect(text).toContain('No changes recorded yet');
  });
});
