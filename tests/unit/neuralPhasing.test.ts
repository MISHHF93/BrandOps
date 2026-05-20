import { describe, expect, it } from 'vitest';

import { buildNeuralPhasingResumeBlock } from '../../src/services/ai/neuralPhasing';
import { cloneSeedData } from '../helpers/fixtures';

describe('neuralPhasing', () => {
  it('returns empty when context unset', () => {
    const data = cloneSeedData();
    data.settings.operatorTwin = { ...data.settings.operatorTwin, resumeArtifact: '', version: 0 };
    expect(buildNeuralPhasingResumeBlock(data)).toBe('');
  });

  it('includes operator twin heading and precedence copy', () => {
    const data = cloneSeedData();
    data.settings.operatorTwin = {
      ...data.settings.operatorTwin,
      resumeArtifact: 'sections:experience | skills:python',
      version: 1
    };
    const block = buildNeuralPhasingResumeBlock(data);
    expect(block).toContain('Operator twin');
    expect(block).toContain('Phase R');
    expect(block).toContain('python');
    expect(block).toContain('Brand profile');
  });
});
