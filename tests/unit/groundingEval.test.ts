/**
 * Grounding evaluation — a deterministic measure of whether the context BrandOps
 * supplies is actually grounded.
 *
 * **What this evaluates, and what it cannot.** The hosted model is
 * non-deterministic and needs a provider, so answer quality is out of reach
 * here. What *is* deterministic is the layer underneath it: retrieval and
 * evidence search are pure functions over a workspace. That layer is what
 * decides whether a model is handed facts or coincidences, so it is the part
 * worth measuring — and D11 cannot reach full marks on this suite alone, which
 * the scorecard says plainly.
 *
 * The eval is scored rather than pass/fail. A binary suite tells you something
 * broke; a score tells you how well the thing works, which is what a production
 * dimension needs.
 *
 * It found a real defect on its first run: the claim *"flew to the moon last
 * tuesday"* returned a shipped-gateway achievement as supporting evidence,
 * matched on the token **"the"**. Evidence search had no stopword filter and no
 * relevance floor — unrelated records were being returned *with provenance
 * attached*, which is more dangerous than returning nothing because it looks
 * like grounding.
 */
import { describe, expect, it } from 'vitest';
import { searchWorkspaceEvidence } from '../../src/services/interop/evidenceSearch';
import { retrieveAgentContext } from '../../src/services/interop/contextRetrieval';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import { CONTEXT_BUNDLE_IDS } from '../../src/types/agentInterop';

const WORKSPACE = populatedWorkspace();

/**
 * A claim, and what an honest grounding layer must and must not say about it.
 * `supported: false` cases are the important half — fabrication shows up as a
 * confident answer to a question the workspace cannot answer.
 */
interface GroundingCase {
  claim: string;
  supported: boolean;
  /** A fragment that must appear in a returned hit when supported. */
  mustCite?: string;
  why: string;
}

const CASES: GroundingCase[] = [
  {
    claim: 'shipped the gateway',
    supported: true,
    mustCite: 'gateway',
    why: 'The workspace holds an achievement recording exactly this.'
  },
  {
    claim: 'governed MCP surface with policy and audit',
    supported: true,
    mustCite: 'Governed MCP surface',
    why: 'Phrase-level overlap with a stored achievement description.'
  },
  {
    claim: 'flew to the moon last tuesday',
    supported: false,
    why: 'Nothing in the workspace relates to it. Used to match on the token "the".'
  },
  {
    claim: 'holds a commercial pilot licence',
    supported: false,
    why: 'A plausible-sounding professional claim with no stored basis.'
  },
  {
    claim: 'the and for with this that',
    supported: false,
    why: 'Stopwords only. Must not match everything in the workspace.'
  },
  {
    claim: 'raised a Series C from Sequoia',
    supported: false,
    why: 'Specific, checkable, and absent — the shape of a hallucinated credential.'
  }
];

describe('grounding evaluation', () => {
  it.each(CASES)('$claim → supported=$supported', ({ claim, supported, mustCite }) => {
    const result = searchWorkspaceEvidence(WORKSPACE, claim, 10);
    if (supported) {
      expect(result.hits.length).toBeGreaterThan(0);
      if (mustCite) {
        expect(result.hits.some((hit) => hit.statement.includes(mustCite))).toBe(true);
      }
    } else {
      expect(result.hits).toEqual([]);
      // Silence is not enough — an unsupported claim must be *told* it is unsupported.
      expect(result.limitations.join(' ')).toContain('unsupported');
    }
  });

  it('scores the grounding layer, and holds a floor', () => {
    let correct = 0;
    const failures: string[] = [];
    for (const testCase of CASES) {
      const result = searchWorkspaceEvidence(WORKSPACE, testCase.claim, 10);
      const answered = result.hits.length > 0;
      if (answered === testCase.supported) correct += 1;
      else
        failures.push(`"${testCase.claim}" → ${answered ? 'cited' : 'nothing'} (${testCase.why})`);
    }
    const score = correct / CASES.length;
    // The number is the point: a dimension score should rest on a measurement,
    // not on the absence of a failing assertion.
    expect(
      score,
      `Grounding score ${score.toFixed(2)}. Misjudged:\n  ${failures.join('\n  ')}`
    ).toBe(1);
  });

  it('never labels agent-reported evidence as verified support', () => {
    const result = searchWorkspaceEvidence(WORKSPACE, 'shipped the gateway', 10);
    expect(result.hits.length).toBeGreaterThan(0);
    // The workspace's achievement is agent-reported and unverified. Counting it
    // as verified support is how a claim launders itself into a fact.
    expect(result.verifiedCount).toBe(0);
    expect(result.agentReportedCount).toBeGreaterThan(0);
    for (const hit of result.hits) {
      expect(hit.trustTier).not.toBe('USER_VERIFIED');
      expect(hit.trustTier).not.toBe('BRANDOPS_VERIFIED');
    }
  });

  it('gives every hit a provenance reference and an explainable score', () => {
    const result = searchWorkspaceEvidence(WORKSPACE, 'governed MCP surface', 10);
    for (const hit of result.hits) {
      // A citation that cannot be followed and a score that cannot be explained
      // are both just assertions.
      expect(hit.provenanceRef, hit.statement).toBeTruthy();
      expect(hit.relevanceScore, hit.statement).toBeGreaterThan(0);
      expect(hit.trustLabel, hit.statement).toBeTruthy();
    }
  });

  it('always states what it could not see', () => {
    for (const claim of ['shipped the gateway', 'anything at all']) {
      const result = searchWorkspaceEvidence(WORKSPACE, claim, 10);
      const limitations = result.limitations.join(' ');
      // The two standing caveats: workspace-only, and lexical rather than proof.
      expect(limitations).toContain('no live web');
      expect(limitations).toContain('not that the evidence proves the claim');
    }
  });

  it('retrieved context carries provenance on every item', () => {
    const bundles = retrieveAgentContext(WORKSPACE, {
      query: 'agent runtime',
      bundles: [...CONTEXT_BUNDLE_IDS],
      maxItemsPerBundle: 5
    });
    const items = bundles.flatMap((bundle) => bundle.items);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.provenanceRef, item.text.slice(0, 40)).toBeTruthy();
      expect(item.trustTier, item.text.slice(0, 40)).toBeTruthy();
      // `verified` must agree with the tier rather than being set independently.
      const shouldBeVerified =
        item.trustTier === 'USER_VERIFIED' || item.trustTier === 'BRANDOPS_VERIFIED';
      expect(item.verified, item.text.slice(0, 40)).toBe(shouldBeVerified);
    }
  });

  it('returns nothing from a bundle that was not requested', () => {
    const bundles = retrieveAgentContext(WORKSPACE, {
      query: 'voice',
      bundles: ['WRITING_VOICE'],
      maxItemsPerBundle: 5
    });
    // Scope is a promise: asking for one bundle must not quietly widen.
    expect(bundles.every((bundle) => bundle.bundleId === 'WRITING_VOICE')).toBe(true);
  });

  it('a stopword-only query does not return the whole workspace', () => {
    const result = searchWorkspaceEvidence(WORKSPACE, 'the and for with', 25);
    expect(result.hits).toEqual([]);
  });
});
