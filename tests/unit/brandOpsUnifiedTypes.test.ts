import { describe, expect, it } from 'vitest';
import type { AgentPlan, BrandVoiceProfile, EvaluationRun } from '../../src/types/brandOpsUnified';

describe('brandOpsUnified type aliases (compile-time shape)', () => {
  it('accepts evaluation run envelope', () => {
    const row: EvaluationRun = {
      run_id: 'eval-1',
      created_at: '2026-01-01',
      task_label: 'hosted_assistant',
      result: {
        model_id: 'x',
        task_type: 'hosted_assistant',
        rubric_version: '1',
        scores: { groundedness: 0.8 }
      }
    };
    expect(row.result.model_id).toBe('x');
  });

  it('narrows brand voice profile from brand fields', () => {
    const voice: BrandVoiceProfile = {
      operatorName: 'A',
      positioning: 'B',
      primaryOffer: 'C',
      voiceGuide: 'D'
    };
    expect(voice.voiceGuide).toBe('D');
  });

  it('treats AgentPlan as pipeline definition compatible object', () => {
    const plan: AgentPlan = {
      pipeline_id: 'demo',
      label: 'Demo',
      description: 'd',
      task_family: 'hosted_assistant',
      steps: []
    };
    expect(plan.pipeline_id).toBe('demo');
  });
});
