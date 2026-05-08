import { describe, expect, it } from 'vitest';
import {
  buildCitationLookupMap,
  findOrphanInlineCitationMarkers,
  resolveCitationMarker,
  sanitizeEvidenceAnchorPrefix,
  splitInlineCitationSegments,
  evidenceDetailDomId
} from '../../src/services/ai/aiInlineCitations';

describe('aiInlineCitations', () => {
  it('splitInlineCitationSegments splits [cite: …] markers', () => {
    const segs = splitInlineCitationSegments('Hello [cite: 12] world.');
    expect(segs).toHaveLength(3);
    expect(segs[1]).toEqual({ type: 'cite', marker: '12', raw: '[cite: 12]' });
  });

  it('resolves markers against numeric chunk_id', () => {
    const citations = [
      {
        chunk_id: 12,
        source: 'ISO_42001.pdf',
        page: 14,
        confidence: 0.94,
        retrieval_timestamp: '2026-05-08T12:00:00Z'
      }
    ];
    const lookup = buildCitationLookupMap(citations);
    expect(resolveCitationMarker('12', lookup)?.source).toBe('ISO_42001.pdf');
    expect(findOrphanInlineCitationMarkers('Done [cite: 99].', citations)).toContain('99');
    expect(findOrphanInlineCitationMarkers('Ok [cite: 12].', citations)).toHaveLength(0);
  });

  it('exposes stable DOM ids for anchor linking', () => {
    const citations = [{ chunk_id: 12, source: 'x' }];
    const id = evidenceDetailDomId('msg-abc', citations[0], 0);
    expect(id).toContain('bo-ev');
    expect(id).toContain('12');
    expect(sanitizeEvidenceAnchorPrefix('msg-abc!')).toBe('msg-abc');
  });
});
