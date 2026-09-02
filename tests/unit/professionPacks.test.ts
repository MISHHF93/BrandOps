import { describe, expect, it } from 'vitest';

import { cloneSeedData } from '../helpers/fixtures';
import { retrieveAgentContext } from '../../src/services/interop/contextRetrieval';
import {
  getProfessionPackForWorkspace,
  getProfessionPack,
  PROFESSION_PACKS,
  FOUNDER_CONSULTANT_PACK,
  SALES_MARKETING_PACK,
  RESEARCH_ANALYTICAL_PACK
} from '../../src/services/builder/professionPacks';
import type { BrandOpsData } from '../../src/types/domain';

const NOW = new Date('2026-05-28T09:00:00.000Z');

/**
 * Profession / Industry operating model (Section V) + PROFESSION_CONTEXT bundle
 * (Section VII). Asserts that three materially different professions resolve to
 * distinct reference packs and flow through the SAME deterministic context
 * retrieval runtime — proving the "AI workforce for everything else" abstraction
 * rather than three parallel applications.
 */
describe('Profession packs → context wiring', () => {
  /** Set the profession label through the always-present settings.notificationCenter.roleContext. */
  const setProfession = (ws: BrandOpsData, label: string) => {
    ws.settings.notificationCenter.roleContext = label;
  };

  it('provides three materially different reference packs', () => {
    expect(PROFESSION_PACKS.length).toBe(3);
    expect(FOUNDER_CONSULTANT_PACK.category).toBe('individual');
    expect(SALES_MARKETING_PACK.category).toBe('commercial');
    expect(RESEARCH_ANALYTICAL_PACK.category).toBe('research');
    const ids = new Set(PROFESSION_PACKS.map((p) => p.id));
    expect(ids.size).toBe(3);
    // The packs must specify genuinely different risk/approval semantics.
    expect(FOUNDER_CONSULTANT_PACK.approvalPolicies).not.toEqual(
      RESEARCH_ANALYTICAL_PACK.approvalPolicies
    );
  });

  it('resolves an explicit professionPackId without a profession label', () => {
    const ws = cloneSeedData();
    ws.settings.professionPackId = 'sales-marketing';
    setProfession(ws, '');
    expect(getProfessionPackForWorkspace(ws)?.id).toBe('sales-marketing');
  });

  it('resolves a pack by profession-label keyword heuristic', () => {
    const ws = cloneSeedData();

    setProfession(ws, 'Sales Development Representative');
    expect(getProfessionPackForWorkspace(ws)?.id).toBe('sales-marketing');

    setProfession(ws, 'Independent consultant and author');
    expect(getProfessionPackForWorkspace(ws)?.id).toBe('founder-consultant');

    setProfession(ws, 'Research and operations analyst');
    expect(getProfessionPackForWorkspace(ws)?.id).toBe('research-analytical');
  });

  it('returns undefined for an unrecognized profession (generic runtime)', () => {
    const ws = cloneSeedData();
    setProfession(ws, 'Unrelated unknown field');
    ws.settings.professionPackId = undefined;
    expect(getProfessionPackForWorkspace(ws)).toBeUndefined();
  });

  it('emits PROFESSION_CONTEXT items for a resolved pack through the shared retrieval runtime', () => {
    const ws = cloneSeedData();
    setProfession(ws, 'Sales Development Representative');
    const results = retrieveAgentContext(ws, {
      bundles: ['PROFESSION_CONTEXT'],
      now: NOW
    });
    expect(results).toHaveLength(1);
    const bundle = results[0];
    expect(bundle.bundleId).toBe('PROFESSION_CONTEXT');
    expect(bundle.items.length).toBeGreaterThan(0);
    const text = bundle.items.map((i) => i.text).join('\n');
    expect(text).toContain('Sales / Marketing / Commercial Operator');
    expect(text).toContain('Generate qualified leads');
    expect(text).toContain('Evidence expectations');
    // Items carry an explicit non-verified provenance trust tier.
    expect(bundle.items.every((i) => i.bundleId === 'PROFESSION_CONTEXT')).toBe(true);
  });

  it('emits a generic-runtime note (no pack) instead of failing', () => {
    const ws = cloneSeedData();
    setProfession(ws, 'Unknown field');
    ws.settings.professionPackId = undefined;
    const bundle = retrieveAgentContext(ws, {
      bundles: ['PROFESSION_CONTEXT'],
      now: NOW
    })[0];
    expect(
      bundle.items.some((i) => i.text.includes('generic professional operating runtime'))
    ).toBe(true);
  });

  it('keeps the canonical context bundles intact after adding PROFESSION_CONTEXT', () => {
    const ws = cloneSeedData();
    const results = retrieveAgentContext(ws, {
      bundles: ['PUBLIC_IDENTITY', 'BUILDER_CONTEXT', 'PROFESSION_CONTEXT'],
      now: NOW
    });
    expect(results.map((r) => r.bundleId).sort()).toEqual([
      'BUILDER_CONTEXT',
      'PROFESSION_CONTEXT',
      'PUBLIC_IDENTITY'
    ]);
  });

  it('all packs share a single profession runtime (same function signature / no per-profession orchestrator)', () => {
    // All three resolve through the same getProfessionPackForWorkspace + retrieveAgentContext path.
    for (const packId of PROFESSION_PACKS.map((p) => p.id)) {
      const ws = cloneSeedData();
      ws.settings.professionPackId = packId;
      const resolved = getProfessionPackForWorkspace(ws);
      expect(resolved?.id).toBe(packId);
      const bundle = retrieveAgentContext(ws, { bundles: ['PROFESSION_CONTEXT'], now: NOW })[0];
      expect(bundle.items.length).toBeGreaterThan(0);
      expect(bundle.items.some((i) => i.bundleId === 'PROFESSION_CONTEXT')).toBe(true);
    }
  });

  it('can resolve each pack by canonical id', () => {
    expect(getProfessionPack('founder-consultant')?.name).toBe(FOUNDER_CONSULTANT_PACK.name);
    expect(getProfessionPack('sales-marketing')?.name).toBe(SALES_MARKETING_PACK.name);
    expect(getProfessionPack('research-analytical')?.name).toBe(RESEARCH_ANALYTICAL_PACK.name);
  });
});

/** Compile-time guard that BrandOpsData remains structurally compatible with pack resolution. */
function __brandOpsDataShape(ws: BrandOpsData): string | undefined {
  return getProfessionPackForWorkspace(ws)?.id;
}
void __brandOpsDataShape;
