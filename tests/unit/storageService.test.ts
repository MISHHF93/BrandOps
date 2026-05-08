import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BrandOpsData } from '../../src/types/domain';
import { cloneSeedData } from '../helpers/fixtures';

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

import { storageService } from '../../src/services/storage/storage';

const DATA_KEY = 'brandops:data';

describe('storageService', () => {
  beforeEach(() => {
    memoryStorage.clear();
  });

  it('seeds a workspace when no existing data is present', async () => {
    const data = await storageService.getData();

    expect(data.modules.length).toBeGreaterThan(0);
    expect(data.brand.operatorName.length).toBeGreaterThan(0);
    expect(memoryStorage.get(DATA_KEY)).toBeDefined();
  });

  it('normalizes malformed persisted data during setData', async () => {
    const source = cloneSeedData();
    const malformed = {
      ...source,
      brand: {
        operatorName: '',
        positioning: '',
        primaryOffer: '',
        voiceGuide: '',
        focusMetric: ''
      },
      followUps: [
        {
          id: 'fu-invalid',
          contactId: 'contact-001',
          reason: '   ',
          dueAt: 'not-a-date',
          completed: false
        }
      ],
      scheduler: {
        tasks: [
          {
            id: 'publishing:bad',
            sourceId: 'bad',
            sourceType: 'publishing',
            title: 'Bad task',
            detail: 'Invalid due date',
            dueAt: 'invalid',
            remindAt: 'still-invalid',
            status: 'scheduled',
            snoozeCount: -100,
            createdAt: 'invalid',
            updatedAt: 'invalid'
          }
        ],
        updatedAt: 'invalid',
        lastHydratedAt: 'invalid'
      },
      messagingVault: [
        {
          id: 'msg-invalid',
          category: 'not-a-category',
          title: '',
          content: ''
        }
      ]
    };

    const normalized = await storageService.setData(
      malformed as unknown as Parameters<typeof storageService.setData>[0]
    );

    expect(normalized.brand.operatorName.length).toBeGreaterThan(0);
    expect(normalized.followUps[0].reason).toBe('Follow up');
    expect(Number.isFinite(new Date(normalized.followUps[0].dueAt).getTime())).toBe(true);
    expect(normalized.scheduler.tasks[0].snoozeCount).toBe(0);
    expect(Number.isFinite(new Date(normalized.scheduler.tasks[0].dueAt).getTime())).toBe(true);
    expect(normalized.messagingVault).toHaveLength(0);
  });

  it('fills syncHub.linkedin defaults when persisted payload omits linkedin', async () => {
    const source = cloneSeedData();
    const hub = source.settings.syncHub as Record<string, unknown>;
    delete hub.linkedin;

    const normalized = await storageService.setData(source);

    expect(normalized.settings.syncHub.linkedin).toBeDefined();
    expect(typeof normalized.settings.syncHub.linkedin.clientId).toBe('string');
  });

  it('fills syncHub.google and github when persisted payload omits them', async () => {
    const source = cloneSeedData();
    const hub = source.settings.syncHub as Record<string, unknown>;
    delete hub.google;
    delete hub.github;

    const normalized = await storageService.setData(source);

    expect(normalized.settings.syncHub.google.clientId).toBe('');
    expect(normalized.settings.syncHub.github.clientId).toBe('');
  });

  it('rejects malformed and invalid imports with actionable errors', async () => {
    await expect(storageService.importData('{')).rejects.toThrow(
      'Import failed: JSON is malformed.'
    );
    await expect(storageService.importData('{"foo":"bar"}')).rejects.toThrow(
      'Invalid BrandOps workspace payload.'
    );
  });

  it('normalizes aiAssistantTraces on setData (drops invalid rows, sanitizes citations)', async () => {
    const source = cloneSeedData();
    source.aiAssistantTraces = {
      entries: [
        {
          id: 'bad',
          at: 'x',
          surface: 'not-a-surface',
          outcome: 'success',
          user_turn_preview: 'q',
          assistant_preview: 'a',
          citations: [],
          trace_schema_version: '1.0.0'
        },
        {
          id: 'ok',
          at: new Date().toISOString(),
          trace_schema_version: '1.0.0',
          surface: 'assistant_chat',
          outcome: 'success',
          user_turn_preview: 'q',
          assistant_preview: 'a',
          citations: [
            // Confidence > 1 + long excerpt — sanitized on read
            { source: 'Doc', confidence: 9, chunkId: 'c1', excerpt: 'e'.repeat(400) }
          ]
        }
      ]
    } as BrandOpsData['aiAssistantTraces'];

    const normalized = await storageService.setData(source);
    expect(normalized.aiAssistantTraces?.entries).toHaveLength(1);
    expect(normalized.aiAssistantTraces?.entries?.[0].id).toBe('ok');
    expect(normalized.aiAssistantTraces?.entries?.[0].citations[0]?.confidence).toBe(1);
    expect(normalized.aiAssistantTraces?.entries?.[0].citations[0]?.excerpt?.length).toBeLessThanOrEqual(
      360
    );
  });

  it('normalizes aiTraceGraph on setData (drops invalid bundles, sanitizes governance)', async () => {
    const source = cloneSeedData();
    source.aiTraceGraph = {
      schema_version: '9',
      bundles: [
        {
          trace_id: 'ok',
          schema_version: '1.0.0',
          created_at: '2026-02-01T00:00:00.000Z',
          surface: 'assistant_chat',
          artifacts: [],
          links: [],
          invocations: [],
          retrieval_chunks: [],
          governance_meta: { hallucination_risk: 'not-valid' as never }
        },
        {
          trace_id: '',
          created_at: '',
          schema_version: '1.0.0',
          surface: 'assistant_chat',
          artifacts: [],
          links: [],
          invocations: [],
          retrieval_chunks: []
        }
      ]
    } as BrandOpsData['aiTraceGraph'];

    const normalized = await storageService.setData(source);
    expect(normalized.aiTraceGraph?.bundles).toHaveLength(1);
    expect(normalized.aiTraceGraph?.bundles?.[0].trace_id).toBe('ok');
    expect(normalized.aiTraceGraph?.bundles?.[0].governance_meta?.hallucination_risk).toBeUndefined();
  });
});
