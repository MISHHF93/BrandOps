import { describe, expect, it } from 'vitest';
import {
  artifactGeneratedCheckpoint,
  beginAskCheckpoint,
  completeAskCheckpoint,
  expertConsultationCheckpoint,
  failAskCheckpoint
} from '../../src/services/execution/askExecutionCheckpoints';

describe('askExecutionCheckpoints', () => {
  it('builds a chained success sequence via parentCheckpointId', () => {
    const root = beginAskCheckpoint({
      conversationId: 'c1',
      questionText: 'What should I do today?'
    });
    expect(root.type).toBe('ask.question');
    expect(root.state).toBe('UNDERSTANDING');
    expect(root.parentCheckpointId).toBeUndefined();

    const expert = expertConsultationCheckpoint({
      conversationId: 'c1',
      parentCheckpointId: root.id,
      expertNames: ['Positioning Expert', 'Outreach Expert']
    });
    expect(expert.parentCheckpointId).toBe(root.id);
    expect(expert.summary).toContain('Positioning Expert');
    expect(expert.state).toBe('COMPLETED');

    const complete = completeAskCheckpoint({
      conversationId: 'c1',
      parentCheckpointId: expert.id,
      responseSummary: 'Here is your plan for today.',
      generatedArtifactRef: { kind: 'trace_bundle', id: 'trace-1' }
    });
    expect(complete.parentCheckpointId).toBe(expert.id);
    expect(complete.state).toBe('COMPLETED');
    expect(complete.generatedArtifactRef).toEqual({ kind: 'trace_bundle', id: 'trace-1' });
  });

  it('carries sourceMessageId so Retry can recover the full question when summary is display-clamped', () => {
    const withId = beginAskCheckpoint({
      conversationId: 'c1',
      questionText: 'x'.repeat(400),
      sourceMessageId: 'msg-abc123'
    });
    expect(withId.summary.length).toBeLessThanOrEqual(240);
    expect(withId.sourceMessageId).toBe('msg-abc123');

    const withoutId = beginAskCheckpoint({ conversationId: 'c1', questionText: 'short question' });
    expect(withoutId.sourceMessageId).toBeUndefined();
  });

  it('sets toolRef.expertId only when exactly one expert was consulted — a single field cannot represent several without misrepresenting the rest', () => {
    const single = expertConsultationCheckpoint({
      conversationId: 'c1',
      parentCheckpointId: 'root-1',
      expertNames: ['Positioning Expert'],
      expertIds: ['positioning-expert']
    });
    expect(single.toolRef?.expertId).toBe('positioning-expert');

    const multiple = expertConsultationCheckpoint({
      conversationId: 'c1',
      parentCheckpointId: 'root-1',
      expertNames: ['Positioning Expert', 'Outreach Expert'],
      expertIds: ['positioning-expert', 'outreach-expert']
    });
    expect(multiple.toolRef).toBeUndefined();

    const none = expertConsultationCheckpoint({
      conversationId: 'c1',
      parentCheckpointId: 'root-1',
      expertNames: [],
      expertIds: []
    });
    expect(none.toolRef).toBeUndefined();

    const noIdsProvided = expertConsultationCheckpoint({
      conversationId: 'c1',
      parentCheckpointId: 'root-1',
      expertNames: ['Positioning Expert']
    });
    expect(noIdsProvided.toolRef).toBeUndefined();
  });

  it('discloses "no experts" honestly rather than fabricating consultation', () => {
    const expert = expertConsultationCheckpoint({
      conversationId: 'c1',
      parentCheckpointId: 'root-1',
      expertNames: []
    });
    expect(expert.summary).toBe('No specialized experts consulted for this turn.');
  });

  it('builds a FAILED terminal checkpoint with recovery actions', () => {
    const fail = failAskCheckpoint({
      conversationId: 'c1',
      parentCheckpointId: 'expert-1',
      code: 'missing_api_key',
      message: 'AI adapter missing an API key.'
    });
    expect(fail.state).toBe('FAILED');
    expect(fail.errorState?.code).toBe('missing_api_key');
    expect(fail.errorState?.recoveryActions).toContain('retry');
  });

  it('tags associatedTwinId on every checkpoint that can know it, and omits it when no twin is active', () => {
    const expert = expertConsultationCheckpoint({
      conversationId: 'c1',
      parentCheckpointId: 'root-1',
      expertNames: ['Positioning Expert'],
      associatedTwinId: 'twin-1'
    });
    expect(expert.associatedTwinId).toBe('twin-1');

    const complete = completeAskCheckpoint({
      conversationId: 'c1',
      parentCheckpointId: expert.id,
      responseSummary: 'Here is your plan.',
      associatedTwinId: 'twin-1'
    });
    expect(complete.associatedTwinId).toBe('twin-1');

    const artifact = artifactGeneratedCheckpoint({
      conversationId: 'c1',
      parentCheckpointId: complete.id,
      artifactId: 'artifact-1',
      artifactTitle: 'Opportunity analysis',
      associatedTwinId: 'twin-1'
    });
    expect(artifact.associatedTwinId).toBe('twin-1');

    const fail = failAskCheckpoint({
      conversationId: 'c1',
      parentCheckpointId: expert.id,
      code: 'http_error',
      message: 'boom',
      associatedTwinId: 'twin-1'
    });
    expect(fail.associatedTwinId).toBe('twin-1');

    const noTwin = expertConsultationCheckpoint({
      conversationId: 'c1',
      parentCheckpointId: 'root-1',
      expertNames: []
    });
    expect(noTwin.associatedTwinId).toBeUndefined();
  });
});
