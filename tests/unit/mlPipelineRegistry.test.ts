import { describe, expect, it } from 'vitest';
import {
  documentedMlPipelineSurfaceCount,
  HOSTED_NLP_UNIFIED_IN_GATEWAY,
  hostedNeuralHttpOperationCount,
  ML_PIPELINE_STAGES,
  summarizeMlInventoryLines
} from '../../src/services/ai/mlPipelineRegistry';

describe('mlPipelineRegistry', () => {
  it('exposes exactly two hosted neural HTTP operations behind one gateway module', () => {
    expect(HOSTED_NLP_UNIFIED_IN_GATEWAY).toBe(true);
    expect(hostedNeuralHttpOperationCount()).toBe(2);
  });

  it('documents six surfaces (rules + persistence + CLI)', () => {
    expect(ML_PIPELINE_STAGES.length).toBe(6);
    expect(documentedMlPipelineSurfaceCount()).toBe(6);
  });

  it('summarizeMlInventoryLines states unified policy gate', () => {
    const lines = summarizeMlInventoryLines();
    expect(lines.some((l) => /unified in gateway/i.test(l))).toBe(true);
    expect(lines.some((l) => /2 HTTP operations/i.test(l))).toBe(true);
  });
});
