import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  formatEvidenceChipTitle,
  parseHostedAskResponse,
  sanitizeAiCitationChunk,
  stripAskStructuredJsonFences
} from '../../src/services/ai/aiIoProvenance';
import { parseAiExecutablePayload } from '../../src/services/ai/actionPipeline';
import { AssistantEvidenceChips } from '../../src/pages/mobile/AssistantEvidenceChips';
import { AssistantTraceSummary } from '../../src/pages/mobile/AssistantTraceSummary';

describe('aiIoProvenance', () => {
  it('sanitizes citation chunks with snake_case and camelCase aliases', () => {
    const c = sanitizeAiCitationChunk({
      chunkId: 'abc',
      source: 'Brand guidelines',
      pageNumber: 4,
      sourceType: 'linked_document',
      confidence: 1.4,
      excerpt: 'x'.repeat(500),
      multimodal: { modality: 'image', uriHint: 'Bearer secret-token', mimeType: 'image/png' }
    });
    expect(c?.chunk_id).toBe('abc');
    expect(c?.page).toBe(4);
    expect(c?.source_type).toBe('linked_document');
    expect(c?.confidence).toBe(1);
    expect(c?.excerpt?.length).toBeLessThanOrEqual(360);
    expect(c?.multimodal?.uri_hint).not.toContain('secret');
  });

  it('preserves numeric chunk_id from model JSON', () => {
    const c = sanitizeAiCitationChunk({
      chunk_id: 12,
      source: 'ISO_42001.pdf',
      page: 14,
      confidence: 0.94
    });
    expect(c?.chunk_id).toBe(12);
    expect(c?.source).toBe('ISO_42001.pdf');
  });

  it('parses JSON answer envelope with citations', () => {
    const raw = JSON.stringify({
      answer: 'Hello',
      citations: [{ source: 'Doc A', page: 2, confidence: 0.5 }]
    });
    const p = parseHostedAskResponse(raw);
    expect(p.displayText).toBe('Hello');
    expect(p.citations[0]?.source).toBe('Doc A');
  });

  it('extracts brandOpsAiProvenance from fenced JSON and strips from display', () => {
    const raw = `Here is the answer.

\`\`\`json
{"brandOpsAiProvenance":{"version":1,"citations":[{"source":"CRM","chunk_id":"k1","confidence":0.9}]}}
\`\`\`
`;
    const p = parseHostedAskResponse(raw);
    expect(p.displayText.trim()).toBe('Here is the answer.');
    expect(p.citations).toHaveLength(1);
    expect(p.citations[0]?.chunk_id).toBe('k1');
  });

  it('merges automation + provenance in one JSON object without breaking executable parse', () => {
    const raw = `Summary line.

\`\`\`json
{"brandOpsAiProvenance":{"version":1,"citations":[{"source":"Hub"}]},"brandOpsStructuredApply":{"version":1,"executeAgentCommand":"pipeline health"}}
\`\`\`
`;
    const p = parseHostedAskResponse(raw);
    expect(p.displayText.trim()).toBe('Summary line.');
    expect(p.citations[0]?.source).toBe('Hub');

    const exec = parseAiExecutablePayload(raw);
    expect(exec.kind).toBe('single');
    if (exec.kind === 'single') {
      expect(exec.commandText.toLowerCase()).toContain('pipeline');
    }
  });

  it('parses governance meta from brandOpsAiProvenance fences', () => {
    const raw = `Answer body.

\`\`\`json
{"brandOpsAiProvenance":{"version":1,"citations":[{"source":"Doc"}],"governance_tags":["x"],"hallucination_risk":"medium","evidence_completeness":"partial","missing_evidence_notes":["gap"],"reproduction_notes":"verify export"}}
\`\`\`
`;
    const p = parseHostedAskResponse(raw);
    expect(p.displayText.trim()).toBe('Answer body.');
    expect(p.governanceMeta?.hallucination_risk).toBe('medium');
    expect(p.governanceMeta?.evidence_completeness).toBe('partial');
    expect(p.governanceMeta?.governance_tags).toContain('x');
    expect(p.governanceMeta?.missing_evidence_notes?.[0]).toContain('gap');
  });

  it('stripAskStructuredJsonFences leaves non-structured JSON fences intact', () => {
    const raw = 'Text\n```json\n{"foo":1}\n```';
    expect(stripAskStructuredJsonFences(raw)).toContain('foo');
  });

  it('formatEvidenceChipTitle joins source page confidence', () => {
    expect(
      formatEvidenceChipTitle({
        source: 'Q3 deck',
        page: 12,
        confidence: 0.813
      })
    ).toContain('Q3 deck');
    expect(formatEvidenceChipTitle({ source: 'Q3 deck', page: 12, confidence: 0.813 })).toContain(
      'p.12'
    );
    expect(formatEvidenceChipTitle({ source: 'Q3 deck', page: 12, confidence: 0.813 })).toContain(
      '81%'
    );
  });
});

describe('AssistantEvidenceChips', () => {
  it('renders citation summaries for SSR smoke', () => {
    const html = renderToStaticMarkup(
      <AssistantEvidenceChips
        citations={[
          {
            source: 'Playbook',
            page: 3,
            confidence: 0.77,
            retrieval_timestamp: '2026-05-01T12:00:00.000Z',
            excerpt: 'Quoted line'
          }
        ]}
        btnFocus=""
      />
    );
    expect(html).toContain('Playbook');
    expect(html).toContain('Evidence');
    expect(html).toContain('Quoted line');
  });
});

describe('AssistantTraceSummary', () => {
  it('renders provenance summary SSR smoke', () => {
    const html = renderToStaticMarkup(
      <AssistantTraceSummary
        btnFocus=""
        summary={{
          trace_id: 'trace-abc-def',
          model: 'gpt-test',
          provider: 'example.com',
          prompt_hash: 'ph',
          output_hash: 'oh',
          hallucination_risk: 'unknown',
          evidence_completeness: 'none',
          governance_tags: ['t1']
        }}
      />
    );
    expect(html).toContain('Provenance');
    expect(html).toContain('trace-abc-def');
    expect(html).toContain('fingerprint');
  });
});
