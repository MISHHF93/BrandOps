/**
 * An approval fingerprint must not confuse two different sets of content.
 *
 * `approvalBinding.ts` computes three fingerprints and uses two different
 * delimiters to do it. The plan-step material joins on a NUL:
 *
 * ```
 *   line  61  ].join('\0')   plan steps
 *   line 171  ].join(' ')    achievement candidate + event
 *   line 186  ].join(' ')    twin proposal + deltas
 * ```
 *
 * NUL is the right choice precisely because it cannot occur in the joined
 * values. A space can: it is legal, ordinary content inside a title, a
 * description or a reason. So the two space-joined fingerprints are ambiguous —
 * moving a word from the end of one field to the start of the next produces
 * identical material and therefore an identical digest.
 *
 * That is not a hypothetical weakness in this file, it is the exact failure this
 * file exists to prevent. Its own comment states the property: *"an approved
 * proposal cannot do more than the user saw when they approved it."* A user
 * approves verification of an achievement they read; an agent then shifts a word
 * across a field boundary; the binding still matches and the approval is spent
 * on content the user never saw. The digest is deliberately weak — the header
 * says collision resistance is not the property needed — which makes the
 * delimiter the only thing separating the fields, so it has to be a character
 * the fields cannot contain.
 *
 * These tests are written against the boundary, not against the hash.
 */
import { describe, expect, it } from 'vitest';
import { promotionApprovalBinding } from '../../src/services/interop/approvalBinding';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';
import type { TwinDelta } from '../../src/types/builder';

const EVENT_ID = 'event-fp-1';

/** A workspace holding one achievement candidate with the given text fields. */
function workspaceWith(fields: {
  title: string;
  description: string;
  reason: string;
}): BrandOpsData {
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
          title: 'Event title',
          detail: 'Event detail',
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
          title: fields.title,
          description: fields.description,
          kind: 'feature-shipped',
          sourceEvents: [EVENT_ID],
          confidence: 0.9,
          professionalRelevance: [],
          verificationRequired: true,
          evidence: [],
          reason: fields.reason,
          detectedAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      twinProposals: [],
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  } as BrandOpsData;
}

const fingerprintOf = (fields: { title: string; description: string; reason: string }) =>
  promotionApprovalBinding(workspaceWith(fields), {
    action: 'verify-achievement',
    targetId: EVENT_ID
  })?.fingerprint;

describe('an achievement approval fingerprint', () => {
  it('is produced at all for a real candidate', () => {
    // Guards the fixture: a binding of `undefined` would make every
    // inequality below vacuously true.
    expect(fingerprintOf({ title: 'A', description: 'B', reason: 'C' })).toBeDefined();
  });

  it('distinguishes a word moved across a field boundary', () => {
    /**
     * The attack, minimally. Both candidates describe different work — one is
     * titled "Shipped auth", the other merely "Shipped" — and a space-joined
     * material renders them character-for-character identical.
     */
    const asRead = fingerprintOf({
      title: 'Shipped auth',
      description: 'fix',
      reason: 'Detected from a completed feature.'
    });
    const asMutated = fingerprintOf({
      title: 'Shipped',
      description: 'auth fix',
      reason: 'Detected from a completed feature.'
    });

    expect(asMutated, 'a word moved between fields kept the same fingerprint').not.toBe(asRead);
  });

  it('distinguishes an emptied field from a shortened neighbour', () => {
    // The degenerate form: content moved out of a field entirely.
    const a = fingerprintOf({ title: 'Delivered the gateway', description: '', reason: 'r' });
    const b = fingerprintOf({ title: 'Delivered the', description: 'gateway', reason: 'r' });

    expect(b).not.toBe(a);
  });

  it('still changes when the content genuinely changes', () => {
    // The counter-case: a delimiter that separated everything but also made
    // every fingerprint equal would pass the tests above.
    const a = fingerprintOf({ title: 'One', description: 'two', reason: 'three' });
    const b = fingerprintOf({ title: 'One', description: 'two', reason: 'four' });

    expect(a).toBeDefined();
    expect(b).not.toBe(a);
  });

  it('is stable for identical content', () => {
    const fields = { title: 'Same', description: 'same', reason: 'same' };
    expect(fingerprintOf(fields)).toBe(fingerprintOf(fields));
  });
});

/** A workspace holding one twin proposal with the given summary and deltas. */
function proposalWorkspace(summary: string, deltas: TwinDelta[]): BrandOpsData {
  const base = withDefaults(populatedWorkspace());
  return {
    ...base,
    builderActivity: {
      ...(base.builderActivity ?? {}),
      workspaceId: base.builderActivity?.workspaceId ?? 'local-workspace',
      events: [],
      achievements: [],
      twinProposals: [
        {
          id: 'proposal-fp-1',
          workspaceId: 'local-workspace',
          deltas,
          summary,
          evidence: [],
          confidence: 0.9,
          reason: 'fixture',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          createdBy: 'test'
        }
      ],
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  } as BrandOpsData;
}

function delta(id: string, field: string, proposedValue: string): TwinDelta {
  return {
    id,
    workspaceId: 'local-workspace',
    field,
    previousValue: '',
    proposedValue,
    evidence: [],
    reason: 'fixture',
    confidence: 0.9,
    proposedBy: 'signal-engine',
    status: 'proposed'
  } as TwinDelta;
}

const proposalFingerprint = (summary: string, deltas: TwinDelta[]) =>
  promotionApprovalBinding(proposalWorkspace(summary, deltas), {
    action: 'accept-twin-proposal',
    targetId: 'proposal-fp-1'
  })?.fingerprint;

describe('a twin proposal approval fingerprint', () => {
  it('is produced at all', () => {
    expect(proposalFingerprint('A summary', [delta('d1', 'headline', 'New')])).toBeDefined();
  });

  it('does not let a summary impersonate a delta', () => {
    /**
     * The higher-impact half of the same defect, and the reason it is worth a
     * second case: these deltas *edit the Twin*.
     *
     * Each delta contributes `index:id:field:value` to the material. Joined on a
     * space, a summary containing that same text is indistinguishable from an
     * actual delta — so a proposal that changes **nothing** fingerprints
     * identically to one that rewrites the headline. `stepCount` does not save
     * it: `checkApprovalBinding` compares fingerprints alone for promotions and
     * uses the count only to word the message.
     */
    const harmless = proposalFingerprint('Tidy up 0:d1:headline:Chief Architect', []);
    const armed = proposalFingerprint('Tidy up', [delta('d1', 'headline', 'Chief Architect')]);

    expect(armed, 'an empty proposal fingerprinted the same as one editing the Twin').not.toBe(
      harmless
    );
  });

  it('distinguishes two deltas whose values differ only by where a space falls', () => {
    const a = proposalFingerprint('S', [delta('d1', 'headline', 'Staff Engineer')]);
    const b = proposalFingerprint('S', [
      delta('d1', 'headline', 'Staff'),
      delta('d2', 'headline', 'Engineer')
    ]);

    expect(b).not.toBe(a);
  });

  it('still changes when a delta value genuinely changes', () => {
    const a = proposalFingerprint('S', [delta('d1', 'headline', 'One')]);
    const b = proposalFingerprint('S', [delta('d1', 'headline', 'Two')]);

    expect(a).toBeDefined();
    expect(b).not.toBe(a);
  });
});
