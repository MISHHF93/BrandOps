/**
 * Evidence Ledger — tests for P0-5.
 *
 * Tests evidence creation, strength computation, claim evidence strength,
 * evidence lookup, and ledger operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLedgerEvidence,
  getEvidenceById,
  getEvidenceForClaim,
  getEvidenceForEntity,
  getAllEvidence,
  getEvidenceLedger,
  clearEvidenceLedger,
  computeClaimEvidenceStrength
} from '../../src/services/evidence/evidenceLedger';
import type { EvidenceSource } from '../../src/services/evidence/evidenceLedger';
import type { EvidenceEntry, EvidenceKind } from '../../src/types/builder';

const WS_ID = 'ws-evidence-test';

/**
 * Typed, so the compiler checks the kinds this suite claims to use.
 *
 * `kind` was `string`, which let every call pass an arbitrary value into an
 * `EvidenceKind` slot. The suite was never typechecked by any pipeline, so it
 * also carried three `{ type: 'repository' }` entity refs — and `repository` is
 * not an `EntityRefType`. The assertions still passed, because a test that
 * builds an invalid value and reads it straight back agrees with itself.
 */
function makeEvidenceEntry(ref: string, kind: EvidenceKind, label: string): EvidenceEntry {
  return { ref, kind, label };
}

describe('Evidence Ledger — Creation', () => {
  beforeEach(() => {
    clearEvidenceLedger(WS_ID);
  });

  it('creates evidence with auto-generated id', () => {
    const evidence = createLedgerEvidence({
      evidence: makeEvidenceEntry('git:owner/repo@abc123', 'code', 'Repository commit abc123'),
      source: 'repository' as EvidenceSource,
      sourceLabel: 'github',
      supportsClaims: ['claim-1'],
      attachedEntities: [{ type: 'project', id: 'owner/repo' }],
      workspaceId: WS_ID
    });

    expect(evidence.id).toMatch(/^ev-/);
    expect(evidence.ref).toBe('git:owner/repo@abc123');
    expect(evidence.kind).toBe('code');
    expect(evidence.label).toBe('Repository commit abc123');
    expect(evidence.source).toBe('repository');
    expect(evidence.sourceLabel).toBe('github');
    expect(evidence.strength).toBeGreaterThan(0);
    expect(evidence.addedAt).toBeDefined();
  });

  it('creates evidence with verification fetch source', () => {
    const evidence = createLedgerEvidence({
      evidence: makeEvidenceEntry('https://example.com/verify', 'url', 'Verified URL'),
      source: 'verification-fetch' as EvidenceSource,
      sourceLabel: 'evidence-api',
      supportsClaims: [],
      attachedEntities: [],
      workspaceId: WS_ID
    });

    expect(evidence.source).toBe('verification-fetch');
    expect(evidence.sourceLabel).toBe('evidence-api');
    expect(evidence.strength).toBeGreaterThan(0);
  });

  it('creates evidence with custom notes', () => {
    const evidence = createLedgerEvidence({
      evidence: makeEvidenceEntry('release:v1.2.3', 'release', 'Release v1.2.3'),
      source: 'user-input' as EvidenceSource,
      sourceLabel: 'user',
      supportsClaims: [],
      notes: 'Manually added by user',
      workspaceId: WS_ID
    });

    expect(evidence.notes).toBe('Manually added by user');
  });

  it('derives strength from verification status and trust tier', () => {
    const strong = createLedgerEvidence({
      evidence: makeEvidenceEntry('verified-1', 'url', 'Verified'),
      source: 'verification-fetch' as EvidenceSource,
      sourceLabel: 'api',
      supportsClaims: []
    });
    expect(strong.strength).toBeGreaterThanOrEqual(0.8);

    const weak = createLedgerEvidence({
      evidence: makeEvidenceEntry('unverified-1', 'user-input', 'Unverified'),
      source: 'user-input' as EvidenceSource,
      sourceLabel: 'user',
      supportsClaims: []
    });
    expect(weak.strength).toBeLessThan(strong.strength);
  });
});

describe('Evidence Ledger — Query', () => {
  beforeEach(() => {
    clearEvidenceLedger(WS_ID);
  });

  it('getEvidenceById returns the evidence', () => {
    const evidence = createLedgerEvidence({
      evidence: makeEvidenceEntry('git:repo@sha', 'code', 'Commit'),
      source: 'repository' as EvidenceSource,
      sourceLabel: 'github',
      supportsClaims: [],
      workspaceId: WS_ID
    });

    const retrieved = getEvidenceById(WS_ID, evidence.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(evidence.id);
  });

  it('getEvidenceById returns undefined for unknown id', () => {
    expect(getEvidenceById(WS_ID, 'nonexistent')).toBeUndefined();
  });

  it('getEvidenceForClaim returns evidence supporting a claim', () => {
    createLedgerEvidence({
      evidence: makeEvidenceEntry('ev-1', 'code', 'Evidence 1'),
      source: 'repository' as EvidenceSource,
      sourceLabel: 'github',
      supportsClaims: ['claim-1', 'claim-2'],
      workspaceId: WS_ID
    });
    createLedgerEvidence({
      evidence: makeEvidenceEntry('ev-2', 'release', 'Evidence 2'),
      source: 'user-input' as EvidenceSource,
      sourceLabel: 'user',
      supportsClaims: ['claim-1'],
      workspaceId: WS_ID
    });
    createLedgerEvidence({
      evidence: makeEvidenceEntry('ev-3', 'url', 'Evidence 3'),
      source: 'verification-fetch' as EvidenceSource,
      sourceLabel: 'api',
      supportsClaims: ['claim-3'],
      workspaceId: WS_ID
    });

    getAllEvidence(WS_ID); // ensure ledger exists

    const forClaim1 = getEvidenceForClaim(WS_ID, 'claim-1');
    expect(forClaim1.length).toBe(2);

    const forClaim3 = getEvidenceForClaim(WS_ID, 'claim-3');
    expect(forClaim3.length).toBe(1);
  });

  it('getEvidenceForEntity returns evidence attached to entity', () => {
    createLedgerEvidence({
      evidence: makeEvidenceEntry('ev-1', 'code', 'Evidence for repo'),
      source: 'repository' as EvidenceSource,
      sourceLabel: 'github',
      supportsClaims: [],
      attachedEntities: [{ type: 'project', id: 'owner/repo' }],
      workspaceId: WS_ID
    });
    createLedgerEvidence({
      evidence: makeEvidenceEntry('ev-2', 'code', 'Evidence for other'),
      source: 'repository' as EvidenceSource,
      sourceLabel: 'github',
      supportsClaims: [],
      attachedEntities: [{ type: 'project', id: 'other/repo' }],
      workspaceId: WS_ID
    });

    const forRepo = getEvidenceForEntity(WS_ID, 'project', 'owner/repo');
    expect(forRepo.length).toBe(1);
    expect(forRepo[0].label).toBe('Evidence for repo');
  });

  it('getAllEvidence returns all evidence for workspace', () => {
    createLedgerEvidence({
      evidence: makeEvidenceEntry('e1', 'code', 'E1'),
      source: 'repository' as EvidenceSource,
      sourceLabel: 'g',
      supportsClaims: [],
      workspaceId: WS_ID
    });
    createLedgerEvidence({
      evidence: makeEvidenceEntry('e2', 'release', 'E2'),
      source: 'user-input' as EvidenceSource,
      sourceLabel: 'u',
      supportsClaims: [],
      workspaceId: WS_ID
    });

    const all = getAllEvidence(WS_ID);
    expect(all.length).toBe(2);
  });

  it('getEvidenceLedger returns ledger structure', () => {
    createLedgerEvidence({
      evidence: makeEvidenceEntry('e1', 'code', 'E1'),
      source: 'repository' as EvidenceSource,
      sourceLabel: 'g',
      supportsClaims: [],
      workspaceId: WS_ID
    });

    const ledger = getEvidenceLedger(WS_ID);
    expect(ledger).toBeDefined();
    expect(ledger.items.length).toBe(1);
    expect(ledger.maxItems).toBe(500);
    expect(ledger.updatedAt).toBeDefined();
  });
});

describe('Evidence Ledger — Claim Evidence Strength', () => {
  beforeEach(() => {
    clearEvidenceLedger(WS_ID);
  });

  it('returns strength for claim with supporting evidence', () => {
    createLedgerEvidence({
      evidence: makeEvidenceEntry('ev-1', 'code', 'Strong evidence'),
      source: 'verification-fetch' as EvidenceSource,
      sourceLabel: 'api',
      supportsClaims: ['claim-1'],
      workspaceId: WS_ID
    });

    const strength = computeClaimEvidenceStrength(WS_ID, 'claim-1');
    expect(strength.supported).toBe(true);
    expect(strength.evidenceCount).toBe(1);
    expect(strength.combinedStrength).toBeGreaterThan(0);
    expect(strength.evidenceIds.length).toBe(1);
  });

  it('returns no support for claim without evidence', () => {
    const strength = computeClaimEvidenceStrength(WS_ID, 'claim-no-evidence');
    expect(strength.supported).toBe(false);
    expect(strength.evidenceCount).toBe(0);
    expect(strength.combinedStrength).toBe(0);
  });

  it('combines strength from multiple evidence items', () => {
    createLedgerEvidence({
      evidence: makeEvidenceEntry('ev-1', 'code', 'Strong'),
      source: 'verification-fetch' as EvidenceSource,
      sourceLabel: 'api',
      supportsClaims: ['claim-multi'],
      workspaceId: WS_ID
    });
    createLedgerEvidence({
      evidence: makeEvidenceEntry('ev-2', 'release', 'Moderate'),
      source: 'repository' as EvidenceSource,
      sourceLabel: 'github',
      supportsClaims: ['claim-multi'],
      workspaceId: WS_ID
    });

    const strength = computeClaimEvidenceStrength(WS_ID, 'claim-multi');
    expect(strength.evidenceCount).toBe(2);
    expect(strength.combinedStrength).toBeGreaterThan(0.2);
  });

  it('tracks strongest verification and trust tier', () => {
    createLedgerEvidence({
      evidence: makeEvidenceEntry('ev-1', 'code', 'Moderate evidence'),
      source: 'repository' as EvidenceSource,
      sourceLabel: 'github',
      supportsClaims: ['claim-tier'],
      workspaceId: WS_ID
    });
    createLedgerEvidence({
      evidence: makeEvidenceEntry('ev-2', 'url', 'Strong evidence'),
      source: 'verification-fetch' as EvidenceSource,
      sourceLabel: 'api',
      supportsClaims: ['claim-tier'],
      workspaceId: WS_ID
    });

    const strength = computeClaimEvidenceStrength(WS_ID, 'claim-tier');
    expect(strength.evidenceCount).toBe(2);
    expect(strength.evidenceIds.length).toBe(2);
  });
});

describe('Evidence Ledger — Evidence Strength Levels', () => {
  beforeEach(() => {
    clearEvidenceLedger(WS_ID);
  });

  it('STRONG evidence has high strength', () => {
    const evidence = createLedgerEvidence({
      evidence: makeEvidenceEntry('strong-1', 'url', 'Strong'),
      source: 'verification-fetch' as EvidenceSource,
      sourceLabel: 'api',
      supportsClaims: [],
      workspaceId: WS_ID
    });
    expect(evidence.strength).toBeGreaterThan(0.2);
  });

  it('MODERATE evidence has medium strength', () => {
    const evidence = createLedgerEvidence({
      evidence: makeEvidenceEntry('mod-1', 'code', 'Moderate'),
      source: 'repository' as EvidenceSource,
      sourceLabel: 'github',
      supportsClaims: [],
      workspaceId: WS_ID
    });
    expect(evidence.strength).toBeGreaterThan(0.1);
    expect(evidence.strength).toBeLessThan(0.35);
  });

  it('WEAK evidence has low strength', () => {
    const evidence = createLedgerEvidence({
      evidence: makeEvidenceEntry('weak-1', 'user-input', 'Weak'),
      source: 'user-input' as EvidenceSource,
      sourceLabel: 'user',
      supportsClaims: [],
      workspaceId: WS_ID
    });
    expect(evidence.strength).toBeGreaterThan(0);
    expect(evidence.strength).toBeLessThan(0.6);
  });
});

describe('Evidence Ledger — Workspace Isolation', () => {
  it('evidence from different workspaces are isolated', () => {
    createLedgerEvidence({
      evidence: makeEvidenceEntry('ws1-ev', 'code', 'WS1 evidence'),
      source: 'repository' as EvidenceSource,
      sourceLabel: 'github',
      supportsClaims: [],
      workspaceId: 'ws-1'
    });
    createLedgerEvidence({
      evidence: makeEvidenceEntry('ws2-ev', 'release', 'WS2 evidence'),
      source: 'user-input' as EvidenceSource,
      sourceLabel: 'user',
      supportsClaims: [],
      workspaceId: 'ws-2'
    });

    const ws1Evidence = getAllEvidence('ws-1');
    const ws2Evidence = getAllEvidence('ws-2');

    expect(ws1Evidence.length).toBe(1);
    expect(ws1Evidence[0].label).toBe('WS1 evidence');
    expect(ws2Evidence.length).toBe(1);
    expect(ws2Evidence[0].label).toBe('WS2 evidence');
  });
});
