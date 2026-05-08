import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import { executeAiPipeline } from '../../src/services/ai/aiPipelineRunner';

describe('executeAiPipeline', () => {
  it('workspace_audit_report succeeds without hosted completion', async () => {
    const ws = cloneSeedData();
    const run = await executeAiPipeline({
      workspace: ws,
      pipelineId: 'workspace_audit_report'
    });
    expect(run.status).toBe('success');
    expect(run.steps.every((s) => s.status !== 'failure')).toBe(true);
  });

  it('governance_review stops at human gate without acknowledgement', async () => {
    const ws = cloneSeedData();
    const run = await executeAiPipeline({
      workspace: ws,
      pipelineId: 'governance_review',
      humanReviewAck: false
    });
    expect(run.status).toBe('partial');
    expect(run.steps.some((s) => s.detail?.includes('Awaiting operator'))).toBe(true);
  });
});
