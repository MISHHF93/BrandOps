import { describe, expect, it } from 'vitest';
import { buildAssistantAskTraceBundle } from '../../src/services/ai/aiTraceBundleBuilder';
import { cloneSeedData } from '../helpers/fixtures';

describe('buildAssistantAskTraceBundle', () => {
  it('links model invocation as triggered_by user prompt', () => {
    const data = cloneSeedData();
    const b = buildAssistantAskTraceBundle({
      brandData: data,
      question: 'q',
      assistantMessageId: 'm1',
      displayText: 'out',
      citations: [],
      orphanInlineMarkers: [],
      modelId: 'gpt-x',
      durationMs: 12
    });
    const trig = b.links.find((l) => l.relation === 'triggered_by');
    expect(trig).toBeDefined();
    expect(trig!.from_artifact_id).toContain(':inv:model');
    expect(trig!.to_artifact_id).toContain(':input:user_prompt');
  });
});
