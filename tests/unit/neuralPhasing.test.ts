import { describe, expect, it } from 'vitest';

import { buildNeuralPhasingResumeBlock } from '../../src/services/ai/neuralPhasing';
import { cloneSeedData } from '../helpers/fixtures';

describe('neuralPhasing', () => {
  it('returns empty when context unset', () => {
    const data = cloneSeedData();
    data.settings.notificationCenter.resumeNeuralPhaseContext = '';
    expect(buildNeuralPhasingResumeBlock(data)).toBe('');
  });

  it('includes Phase R heading and precedence copy', () => {
    const data = cloneSeedData();
    data.settings.notificationCenter.resumeNeuralPhaseContext =
      'sections:experience | skills:python';
    const block = buildNeuralPhasingResumeBlock(data);
    expect(block).toContain('Neural phasing');
    expect(block).toContain('Phase R');
    expect(block).toContain('python');
    expect(block).toContain('Brand profile');
  });
});
