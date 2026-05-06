import { describe, expect, it } from 'vitest';

import {
  extractResumeNeuralPhaseArtifact,
  normalizeResumeNeuralInput
} from '../../src/services/ai/resumeNeuralPhaseExtract';

describe('resumeNeuralPhaseExtract', () => {
  it('returns empty for blank input', () => {
    expect(extractResumeNeuralPhaseArtifact('')).toBe('');
    expect(extractResumeNeuralPhaseArtifact('   \n\t')).toBe('');
  });

  it('normalizes ends without collapsing internal newlines', () => {
    expect(normalizeResumeNeuralInput('  a  \n  b  ')).toBe('a  \n  b');
  });

  it('fuses sections, skills, roles, and bullets', () => {
    const raw = `
Experience
Senior ML Engineer | 2020 – Present
- Built NLP pipelines with Python and TensorFlow
Skills
TypeScript React
`;
    const out = extractResumeNeuralPhaseArtifact(raw);
    expect(out).toContain('sections:');
    expect(out.toLowerCase()).toContain('python');
    expect(out.toLowerCase()).toContain('typescript');
    expect(out.toLowerCase()).toContain('react');
  });

  it('respects max length cap', () => {
    const bullets = Array.from({ length: 80 }, (_, i) => `- Very long bullet ${i} `.repeat(12)).join('\n');
    const out = extractResumeNeuralPhaseArtifact(`Skills\n${bullets}`, 200);
    expect(out.length).toBeLessThanOrEqual(200);
  });
});
