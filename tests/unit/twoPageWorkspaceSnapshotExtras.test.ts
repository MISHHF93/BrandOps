import { describe, expect, it } from 'vitest';
import { AI_PIPELINE_RUN_SCHEMA_VERSION } from '../../src/types/aiIntegrationSuite';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { sanitizePipelineRun } from '../../src/services/ai/aiPipelineRunPersistence';
import { cloneSeedData } from '../helpers/fixtures';

describe('two-page workspace snapshot extras', () => {
  it('surfaces pipeline runs, trace memory summary, and pending reviews', () => {
    const ws = cloneSeedData();
    ws.aiPipelineRuns = {
      schema_version: AI_PIPELINE_RUN_SCHEMA_VERSION,
      entries: [
        {
          run_id: 'run-a',
          pipeline_id: 'p-test',
          schema_version: AI_PIPELINE_RUN_SCHEMA_VERSION,
          started_at: '2026-01-02T00:00:00.000Z',
          ended_at: '2026-01-02T00:01:00.000Z',
          status: 'success',
          steps: [],
          audit_tags: ['demo']
        },
        {
          run_id: 'run-b',
          pipeline_id: 'p-test',
          schema_version: AI_PIPELINE_RUN_SCHEMA_VERSION,
          started_at: '2026-01-03T00:00:00.000Z',
          status: 'failure',
          steps: [],
          error_message: 'x'
        }
      ]
    };
    ws.aiTraceGraph = {
      schema_version: '1.0.0',
      bundles: [
        {
          trace_id: 't1',
          schema_version: '1.0.0',
          created_at: '2026-01-01T00:00:00.000Z',
          surface: 'assistant_chat',
          artifacts: [],
          links: [],
          invocations: [],
          retrieval_chunks: []
        }
      ]
    };
    ws.operatorTraces = {
      entries: [
        {
          id: '1',
          at: '2026-01-01',
          source: 'assistant',
          verb: 'ask',
          reviewStatus: 'pending'
        }
      ]
    };

    const snap = buildWorkspaceSnapshot(ws);
    expect(snap.recentAiPipelineRuns[0].run_id).toBe('run-b');
    expect(snap.memoryTraceSummary.bundleCount).toBe(1);
    expect(snap.planPendingReviewCount).toBe(1);
  });

  it('sanitizes pipeline runs with stable step ids', () => {
    const sanitized = sanitizePipelineRun({
      run_id: '   ',
      pipeline_id: '',
      schema_version: AI_PIPELINE_RUN_SCHEMA_VERSION,
      started_at: '2026-01-01T00:00:00.000Z',
      status: 'partial',
      steps: [{ step_id: '', status: 'running' }]
    });
    expect(sanitized.run_id).toBe('run-unknown');
    expect(sanitized.pipeline_id).toBe('pipeline-unknown');
    expect(sanitized.steps[0]?.step_id).toBe('step');
  });
});
