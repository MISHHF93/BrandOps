/**
 * The Twin records that it changed.
 *
 * `applyDeltas` has always returned a `version` — the snapshot before, the
 * snapshot after, the deltas applied, who applied them and when — and
 * `applyTwinProposalAcceptance` used `updatedTwin` and **threw the rest away**.
 * So the Twin moved and nothing said it had. `addVersionToHistory` and
 * `createInitialVersionHistory` existed to hold those snapshots and had no
 * caller: the third half-wired vertical found in as many cycles.
 *
 * For a product whose subject is verified identity, an unrecorded edit is the
 * one kind it cannot afford.
 *
 * **Wiring it surfaced a duplicated concept.** `TwinVersion` was declared twice
 * — a five-field stub in `types/builder.ts` and the real thirteen-field shape in
 * `twinDeltaEngine.ts` — and the two were incompatible. Nothing used the stub,
 * so nothing failed, right up until the history was stored and the definitions
 * met. There is now one, in the types file, and the engine imports it.
 */
import { describe, expect, it } from 'vitest';
import {
  applyAchievementVerification,
  applyTwinProposalAcceptance
} from '../../src/services/builder/promotions';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';

const EVENT_ID = 'event-history-1';
const TITLE = 'Shipped the version history';

function pendingVerification(title = TITLE, eventId = EVENT_ID): BrandOpsData {
  const base = withDefaults(populatedWorkspace());
  const activity: NonNullable<BrandOpsData['builderActivity']> = {
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
  };
  return { ...base, builderActivity: activity };
}

/** Verify, then accept the proposal that produces — the full path. */
function acceptOnce(workspace: BrandOpsData, eventId = EVENT_ID): BrandOpsData {
  const verified = applyAchievementVerification(workspace, eventId);
  const proposal = (verified.builderActivity?.twinProposals ?? [])[0];
  if (!proposal) throw new Error('no proposal was created to accept');
  return applyTwinProposalAcceptance(verified, proposal.id);
}

describe('accepting a Twin update', () => {
  it('records a version where it previously recorded none', () => {
    const before = pendingVerification();
    expect(before.twinVersionHistory, 'fixture already had history').toBeUndefined();

    const after = acceptOnce(before);

    // The engine always computed this. The caller used to discard it.
    expect(after.twinVersionHistory?.versions.length).toBeGreaterThan(0);
  });

  it('records what changed, not merely that something did', () => {
    const latest = acceptOnce(pendingVerification()).twinVersionHistory?.versions.at(-1);

    expect(latest?.deltaCount).toBeGreaterThan(0);
    expect(latest?.appliedDeltas.length).toBeGreaterThan(0);
    expect(latest?.changes.length, 'no field-level changes recorded').toBeGreaterThan(0);
  });

  it('keeps the state before the change alongside the state after', () => {
    const latest = acceptOnce(pendingVerification()).twinVersionHistory?.versions.at(-1);

    /**
     * Both halves, or the record cannot answer "what did this actually do".
     * The achievement is in the new snapshot and absent from the old one.
     */
    expect(latest?.snapshot.achievements).toContain(TITLE);
    expect(latest?.previousSnapshot.achievements ?? []).not.toContain(TITLE);
  });

  it('starts the history from where the Twin was, not where it ended up', () => {
    const versions = acceptOnce(pendingVerification()).twinVersionHistory?.versions ?? [];

    /**
     * The seeded entry, which the appended-entry assertions above cannot see.
     * Seeding from the post-change state would make the history claim the Twin
     * always had this achievement — a record that erases the very change it
     * exists to describe. Mutation testing found this gap: swapping the seed
     * left every other test in this file green.
     */
    expect(versions.length, 'no seeded entry').toBeGreaterThan(1);
    expect(versions[0].snapshot.achievements, 'the first entry already knew').not.toContain(TITLE);
    expect(versions[0].appliedBy).toBe('initial');
  });

  it('says when, and by what', () => {
    const latest = acceptOnce(pendingVerification()).twinVersionHistory?.versions.at(-1);
    expect(latest?.appliedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(latest?.appliedBy?.length ?? 0).toBeGreaterThan(0);
  });

  it('appends rather than replacing', () => {
    const first = acceptOnce(pendingVerification());
    const second = acceptOnce(
      {
        ...pendingVerification('A second shipped thing', 'event-history-2'),
        ...{ twinVersionHistory: first.twinVersionHistory }
      },
      'event-history-2'
    );

    // The counter-case for seeding: a fresh history on every acceptance would
    // keep exactly one entry and look like it worked.
    expect(second.twinVersionHistory?.versions.length).toBe(
      (first.twinVersionHistory?.versions.length ?? 0) + 1
    );
    expect(second.twinVersionHistory?.currentVersion).toBeGreaterThan(
      first.twinVersionHistory?.currentVersion ?? 0
    );
  });
});

describe('the history as stored data', () => {
  it('survives the round trip a workspace makes', () => {
    const after = acceptOnce(pendingVerification());
    const reloaded = withDefaults(JSON.parse(JSON.stringify(after)) as BrandOpsData);

    // A record that does not survive being saved is not a record.
    expect(reloaded.twinVersionHistory?.versions.length).toBe(
      after.twinVersionHistory?.versions.length
    );
    expect(reloaded.twinVersionHistory?.versions.at(-1)?.snapshot.achievements).toContain(TITLE);
  });

  it('is absent on a workspace that has accepted nothing', () => {
    // Optional by design, so a workspace written before this existed loads
    // unchanged rather than gaining an empty history it never had.
    expect(withDefaults(populatedWorkspace()).twinVersionHistory).toBeUndefined();
  });
});
