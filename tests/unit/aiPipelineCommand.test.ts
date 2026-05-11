import { beforeEach, describe, expect, it, vi } from 'vitest';

const memoryStorage = new Map<string, unknown>();

vi.mock('../../src/shared/storage/browserStorage', () => ({
  browserLocalStorage: {
    get: vi.fn(async (key: string) => memoryStorage.get(key)),
    set: vi.fn(async (key: string, value: unknown) => {
      memoryStorage.set(key, value);
    }),
    remove: vi.fn(async (key: string) => {
      memoryStorage.delete(key);
    }),
    getAll: vi.fn(async () => Object.fromEntries(memoryStorage.entries())),
    clear: vi.fn(async () => {
      memoryStorage.clear();
    })
  }
}));

import { executeAgentWorkspaceCommand } from '../../src/services/agent/agentWorkspaceEngine';
import { storageService } from '../../src/services/storage/storage';

describe('run ai pipeline command', () => {
  beforeEach(async () => {
    memoryStorage.clear();
    const data = await storageService.getData();
    data.settings.operatorTraceCollectionEnabled = true;
    await storageService.setData(data);
  });

  it('runs deterministic workspace_audit_report and persists', async () => {
    const result = await executeAgentWorkspaceCommand({
      text: 'run ai pipeline workspace_audit_report',
      source: 'chatbot-web'
    });
    expect(result.ok).toBe(true);
    expect(result.action).toBe('ai-pipeline-run');
    expect(result.summary).toContain('workspace_audit_report');
    const data = await storageService.getData();
    expect(data.aiPipelineRuns?.entries?.length).toBeGreaterThan(0);
    expect(data.aiPipelineRuns?.entries?.[0]?.pipeline_id).toBe('workspace_audit_report');
    expect(data.aiPipelineRuns?.entries?.[0]?.status).toBe('success');
  });

  it('stops at human review gate without acknowledgement', async () => {
    const result = await executeAgentWorkspaceCommand({
      text: 'run ai pipeline governance_review',
      source: 'chatbot-web'
    });
    expect(result.ok).toBe(true);
    expect(result.action).toBe('ai-pipeline-run');
    const run = (await storageService.getData()).aiPipelineRuns?.entries?.[0];
    expect(run?.status).toBe('partial');
    expect(run?.steps.find((s) => s.step_id === 'review')?.status).toBe('skipped');
  });

  it('rejects unknown pipeline ids', async () => {
    const result = await executeAgentWorkspaceCommand({
      text: 'run ai pipeline not_a_real_pipeline',
      source: 'chatbot-web'
    });
    expect(result.ok).toBe(false);
    expect(result.action).toBe('ai-pipeline-run');
    expect(result.summary).toMatch(/unknown pipeline/i);
  });
});
