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

describe('pipeline health command', () => {
  beforeEach(async () => {
    memoryStorage.clear();
    await storageService.getData();
  });

  it('returns a ranked summary when opportunities exist', async () => {
    const data = await storageService.getData();
    data.opportunities = [
      {
        id: 'a1',
        name: 'Deal A',
        company: 'Acme',
        role: 'Buyer',
        source: 'test',
        relationshipStage: 'building',
        opportunityType: 'client delivery',
        status: 'proposal',
        nextAction: 'Call',
        followUpDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        notes: '',
        links: [],
        relatedOutreachDraftIds: [],
        relatedContentTags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        valueUsd: 50000,
        confidence: 80
      }
    ];
    await storageService.setData(data);

    const result = await executeAgentWorkspaceCommand({
      text: 'pipeline health',
      source: 'chatbot-web'
    });

    expect(result.ok).toBe(true);
    expect(result.action).toBe('pipeline-health');
    expect(result.summary).toContain('Deal A');
    expect(result.summary.toLowerCase()).toContain('score');
  });

  it('handles an empty pipeline', async () => {
    const data = await storageService.getData();
    data.opportunities = [];
    await storageService.setData(data);

    const result = await executeAgentWorkspaceCommand({
      text: 'pipeline health',
      source: 'chatbot-web'
    });

    expect(result.ok).toBe(true);
    expect(result.action).toBe('pipeline-health');
    expect(result.summary).toMatch(/no active opportunities/i);
  });
});
