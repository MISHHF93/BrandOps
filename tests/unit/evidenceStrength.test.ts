/**
 * How strong a piece of evidence is, and what that number is made of.
 *
 * Nine exports in `evidenceLedger.ts` were unwired, including the scorer and the
 * export/import pair. Exercising the scorer found that it took a `trustTier` and
 * **never read it** — all five tiers produced the same score, so a
 * `MODEL_INFERRED` claim scored exactly as a `USER_VERIFIED` one, while the
 * parameter's presence said otherwise.
 *
 * The sharper version was in `updateEvidenceVerification`, which accepts a tier
 * from its caller, **stores it on the evidence**, and passed it to the scorer to
 * be discarded. The recorded tier and the recorded strength could disagree with
 * nothing to reconcile them.
 *
 * The parameter is gone rather than weighted, because both internal callers
 * derived the tier from `source` in the first place — provenance is already what
 * `source` encodes. These tests pin that separation so nobody later assumes the
 * number contains a tier it has never contained.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  computeEvidenceStrength,
  evidenceStrengthLevel,
  createLedgerEvidence,
  updateEvidenceVerification,
  getEvidenceById,
  clearEvidenceLedger,
  exportEvidenceLedger,
  importEvidenceLedger,
  type EvidenceSource
} from '../../src/services/evidence/evidenceLedger';
import type { EvidenceEntry, EvidenceKind, VerificationStatus } from '../../src/types/builder';

const WS = 'ws-strength';

const entry = (ref: string, kind: EvidenceKind, label: string): EvidenceEntry => ({
  ref,
  kind,
  label
});

const STATUSES: VerificationStatus[] = [
  'UNVERIFIED',
  'INDEPENDENTLY_SUPPORTED',
  'USER_VERIFIED',
  'SYSTEM_VERIFIED'
];

const SOURCES: EvidenceSource[] = [
  'verification-fetch',
  'user-input',
  'repository',
  'integration-import',
  'agent-event',
  'webpage'
];

beforeEach(() => clearEvidenceLedger(WS));

describe('what the strength number is made of', () => {
  it('rises with verification status, holding the source fixed', () => {
    const at = (status: VerificationStatus) =>
      computeEvidenceStrength({ verificationStatus: status, source: 'user-input' });

    // System verification outranks a user's own say-so here, deliberately: it
    // means something independent checked, not that someone asserted.
    expect(at('SYSTEM_VERIFIED')).toBeGreaterThan(at('USER_VERIFIED'));
    expect(at('USER_VERIFIED')).toBeGreaterThan(at('INDEPENDENTLY_SUPPORTED'));
    expect(at('INDEPENDENTLY_SUPPORTED')).toBeGreaterThan(at('UNVERIFIED'));
  });

  it('rises with source reliability, holding the status fixed', () => {
    const at = (source: EvidenceSource) =>
      computeEvidenceStrength({ verificationStatus: 'UNVERIFIED', source });

    expect(at('verification-fetch')).toBeGreaterThan(at('user-input'));
    expect(at('user-input')).toBeGreaterThan(at('repository'));
    expect(at('repository')).toBeGreaterThan(at('agent-event'));
    expect(at('agent-event')).toBeGreaterThan(at('webpage'));
  });

  it('never returns a score outside its own range', () => {
    for (const verificationStatus of STATUSES) {
      for (const source of SOURCES) {
        const score = computeEvidenceStrength({ verificationStatus, source });
        expect(score, `${verificationStatus} + ${source}`).toBeGreaterThan(0);
        expect(score, `${verificationStatus} + ${source}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('calls nothing STRONG without system verification', () => {
    const strong = STATUSES.flatMap((verificationStatus) =>
      SOURCES.filter(
        (source) =>
          evidenceStrengthLevel(computeEvidenceStrength({ verificationStatus, source })) ===
          'STRONG'
      ).map((source) => `${verificationStatus}+${source}`)
    );

    // Worth pinning: STRONG is reachable only through SYSTEM_VERIFIED. A user
    // personally confirming something from a fetched source reaches MODERATE.
    expect(strong.every((combination) => combination.startsWith('SYSTEM_VERIFIED'))).toBe(true);
    expect(strong.length, 'STRONG unreachable').toBeGreaterThan(0);
  });

  it('cannot produce NONE, which only a claim with no evidence reaches', () => {
    /**
     * `evidenceStrengthLevel(0)` is `NONE`, and the scorer's floor is 0.15 — an
     * unverified webpage is still *some* evidence. Recorded rather than
     * "fixed": the level exists for a claim nothing supports, which is a
     * different question from how strong one piece is.
     */
    const floors = STATUSES.flatMap((verificationStatus) =>
      SOURCES.map((source) => computeEvidenceStrength({ verificationStatus, source }))
    );
    expect(Math.min(...floors)).toBeGreaterThan(0);
    expect(evidenceStrengthLevel(0)).toBe('NONE');
  });
});

describe('the trust tier is recorded, not scored', () => {
  it('does not appear in the scorer at all', () => {
    // The parameter used to be here and was ignored, which is the same as
    // absent except that it claimed otherwise.
    expect(computeEvidenceStrength.length).toBe(1);
  });

  it('is still stored on the evidence, and can outrank its strength', () => {
    const created = createLedgerEvidence({
      evidence: entry('url:example', 'link', 'A webpage someone pasted'),
      source: 'webpage',
      sourceLabel: 'web',
      supportsClaims: ['claim-1'],
      attachedEntities: [],
      workspaceId: WS
    });

    // Positional, not an object. The first version of this call passed an
    // object literal, so `verificationStatus` became that object, the scorer
    // fell to its default branch, and the test failed against working code.
    const raised = updateEvidenceVerification(WS, created.id, 'UNVERIFIED', 'USER_VERIFIED');

    /**
     * The two fields answer different questions and are allowed to diverge: the
     * operator vouching for a webpage does not make the webpage a verification
     * fetch. What is no longer possible is the scorer *pretending* to weigh the
     * tier while discarding it.
     */
    expect(raised?.trustTier).toBe('USER_VERIFIED');
    expect(raised?.strength).toBe(
      computeEvidenceStrength({ verificationStatus: 'UNVERIFIED', source: 'webpage' })
    );
  });

  it('recomputes strength when the verification status changes', () => {
    const created = createLedgerEvidence({
      evidence: entry('git:repo@abc', 'code', 'A commit'),
      source: 'repository',
      sourceLabel: 'github',
      supportsClaims: [],
      attachedEntities: [],
      workspaceId: WS
    });
    const before = getEvidenceById(WS, created.id)?.strength ?? 0;

    const after = updateEvidenceVerification(WS, created.id, 'SYSTEM_VERIFIED');

    // The counter-case for dropping the parameter: the recompute must still
    // happen, and must still move.
    expect(after?.strength).toBeGreaterThan(before);
  });
});

describe('taking the ledger out and putting it back', () => {
  it('round-trips what it holds', () => {
    const created = createLedgerEvidence({
      evidence: entry('git:repo@abc', 'code', 'A commit'),
      source: 'repository',
      sourceLabel: 'github',
      supportsClaims: ['claim-1'],
      attachedEntities: [{ type: 'project', id: 'proj-1' }],
      workspaceId: WS
    });

    const exported = exportEvidenceLedger(WS);
    clearEvidenceLedger(WS);
    expect(getEvidenceById(WS, created.id), 'ledger did not actually clear').toBeUndefined();

    importEvidenceLedger(WS, exported);
    const restored = getEvidenceById(WS, created.id);

    expect(restored?.ref).toBe('git:repo@abc');
    expect(restored?.strength).toBe(created.strength);
    expect(restored?.supportsClaims).toEqual(['claim-1']);
  });

  it('exports something a reader could inspect', () => {
    createLedgerEvidence({
      evidence: entry('git:repo@abc', 'code', 'A commit'),
      source: 'repository',
      sourceLabel: 'github',
      supportsClaims: [],
      attachedEntities: [],
      workspaceId: WS
    });
    // Serialisable, which is what makes an export an export.
    expect(() => JSON.stringify(exportEvidenceLedger(WS))).not.toThrow();
  });
});
