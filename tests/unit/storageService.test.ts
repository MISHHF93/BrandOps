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

import { browserLocalStorage } from '../../src/shared/storage/browserStorage';
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

  /**
   * Regression guard: reading used to gate repair behind a strict shape
   * check (all of modules/publishingQueue/contentLibrary/contacts/
   * opportunities present as arrays, plus settings). A blob that failed on
   * just one of those — a renamed field from a schema change, a partial
   * write, a manual edit — discarded the *entire* workspace and reseeded
   * from scratch, even though `withDefaults`'s per-field normalizers are
   * individually built to backfill exactly that. This proves a one-field
   * omission now gets repaired in place instead of wiping real user data.
   */
  it('repairs a persisted blob missing one required field instead of discarding the whole workspace', async () => {
    const source = cloneSeedData();
    const partiallyMalformed = {
      ...source,
      brand: { ...source.brand, operatorName: 'Distinctive Real Operator Name' },
      contacts: [{ id: 'contact-keep', name: 'Keep Me', role: '', company: '', notes: [] }],
      modules: undefined
    };
    memoryStorage.set(DATA_KEY, partiallyMalformed);

    const data = await storageService.getData();

    // The field that was missing got a real, valid fallback...
    expect(Array.isArray(data.modules)).toBe(true);
    expect(data.modules.length).toBeGreaterThan(0);
    // ...instead of every other field in the workspace being thrown away.
    expect(data.brand.operatorName).toBe('Distinctive Real Operator Name');
    expect(data.contacts.some((c) => c.id === 'contact-keep')).toBe(true);
  });

  it('still reseeds when the persisted payload is not object-shaped at all', async () => {
    memoryStorage.set(DATA_KEY, 'not-an-object');

    const data = await storageService.getData();

    expect(data.modules.length).toBeGreaterThan(0);
    expect(data.brand.operatorName.length).toBeGreaterThan(0);
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

  it('drops imported OAuth bearer tokens so workspace export cannot leak credentials', async () => {
    const source = cloneSeedData();
    const auth = source.settings.syncHub.google.auth as unknown as Record<string, unknown>;
    auth.accessToken = 'oauth-access-secret';
    auth.refreshToken = 'oauth-refresh-secret';
    auth.scope = ['openid'];

    const normalized = await storageService.setData(source);
    const normalizedAuth = normalized.settings.syncHub.google.auth as unknown as Record<
      string,
      unknown
    >;
    const exported = await storageService.exportData();

    expect(normalizedAuth.accessToken).toBeUndefined();
    expect(normalizedAuth.refreshToken).toBeUndefined();
    expect(exported).not.toContain('oauth-access-secret');
    expect(exported).not.toContain('oauth-refresh-secret');
  });

  it('clamps checkpoint fields on setData the same way buildCheckpoint does for live-created rows (a crafted import should not smuggle in oversized strings)', async () => {
    const source = cloneSeedData();
    source.checkpoints = {
      entries: [
        {
          id: 'chk-1',
          conversationId: 'c1',
          type: 'ask.response',
          state: 'FAILED',
          at: new Date().toISOString(),
          summary: 'x'.repeat(1000),
          source: 'assistant',
          parentCheckpointId: 'y'.repeat(1000),
          associatedTwinId: 'z'.repeat(1000),
          receiptRef: 'r'.repeat(1000),
          errorState: {
            code: 'c'.repeat(1000),
            message: 'm'.repeat(1000),
            recoveryActions: [
              'retry',
              'inspect',
              'save',
              'pin',
              'edit',
              'cancel',
              'approve',
              'reject'
            ]
          }
        }
      ]
    };

    const normalized = await storageService.setData(source);
    const entry = normalized.checkpoints?.entries[0];
    expect(entry?.summary.length).toBeLessThanOrEqual(240);
    expect(entry?.parentCheckpointId?.length).toBeLessThanOrEqual(160);
    expect(entry?.associatedTwinId?.length).toBeLessThanOrEqual(160);
    expect(entry?.receiptRef?.length).toBeLessThanOrEqual(160);
    expect(entry?.errorState?.code.length).toBeLessThanOrEqual(80);
    expect(entry?.errorState?.message.length).toBeLessThanOrEqual(500);
    expect(entry?.errorState?.recoveryActions.length).toBeLessThanOrEqual(6);
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
    expect(
      normalized.aiAssistantTraces?.entries?.[0].citations[0]?.excerpt?.length
    ).toBeLessThanOrEqual(360);
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
    expect(
      normalized.aiTraceGraph?.bundles?.[0].governance_meta?.hallucination_risk
    ).toBeUndefined();
  });

  it('migrates legacy notificationCenter.resumeNeuralPhaseContext into operatorTwin on normalize', async () => {
    const source = cloneSeedData();
    const nc = source.settings.notificationCenter as Record<string, unknown>;
    nc.resumeNeuralPhaseContext = 'sections:legacy | skills:rust';
    source.settings.operatorTwin = { ...source.settings.operatorTwin, resumeArtifact: '' };

    const normalized = await storageService.setData(source);

    expect(normalized.settings.operatorTwin.resumeArtifact).toContain('legacy');
    expect(normalized.settings.operatorTwin.resumeArtifact).toContain('rust');
  });

  it('normalizes digital twins and keeps active twin export/delete data in workspace JSON', async () => {
    const source = cloneSeedData();
    source.digitalTwins = {
      activeTwinId: 'twin-1',
      twins: [
        {
          id: 'twin-1',
          ownerUserId: '',
          workspaceId: '',
          displayName: '  Resume Twin  ',
          sourceType: 'resume',
          status: 'ready',
          confidenceScore: 250,
          createdAt: 'invalid',
          updatedAt: 'invalid',
          identity: {
            headline: 'Operator',
            summary: 'Builds AI systems.',
            professionalPositioning: '',
            targetAudience: '',
            goals: [],
            toneOfVoice: '',
            strengths: [],
            differentiators: []
          },
          resumeProfile: {
            contactInfo: { name: 'Resume Twin', links: ['https://example.test'] },
            experience: [],
            education: [],
            skills: ['TypeScript'],
            certifications: [],
            projects: [],
            achievements: [],
            industries: [],
            tools: [],
            keywords: []
          },
          memory: {
            facts: ['Builds AI systems.'],
            preferences: [],
            voiceExamples: [],
            approvedClaims: [],
            rejectedClaims: [],
            missingInfo: ['Add education.']
          },
          actions: {
            supportedActionTypes: ['generate_professional_bio', 'not-real' as never],
            generatedAssets: [],
            pendingApprovals: [],
            auditTrail: []
          }
        }
      ]
    };

    const normalized = await storageService.setData(source);

    expect(normalized.digitalTwins?.activeTwinId).toBe('twin-1');
    expect(normalized.digitalTwins?.twins[0]?.displayName).toBe('Resume Twin');
    expect(normalized.digitalTwins?.twins[0]?.confidenceScore).toBe(100);
    expect(normalized.digitalTwins?.twins[0]?.actions.supportedActionTypes).toEqual([
      'generate_professional_bio'
    ]);
  });

  it('never writes a normalized copy back on a plain read (kills the write-on-read clobber source)', async () => {
    await storageService.getData();
    const setSpy = browserLocalStorage.set as unknown as { mock: { calls: unknown[][] } };
    const before = setSpy.mock.calls.length;

    const read = await storageService.getData();

    expect(setSpy.mock.calls.length).toBe(before);
    expect(read.modules.length).toBeGreaterThan(0);
    expect(read.brand.operatorName.length).toBeGreaterThan(0);
  });

  it('persists a workspace mutation in a single attempt when nothing else wrote', async () => {
    await storageService.getData();
    const result = await storageService.withWorkspaceMutation((data) => ({
      ...data,
      brand: { ...data.brand, focusMetric: 'growth' }
    }));

    expect(result.changed).toBe(true);
    expect(result.attempts).toBe(1);
    const final = await storageService.getData();
    expect(final.brand.focusMetric).toBe('growth');
  });

  it('reports changed:false without writing when the mutator returns the same reference', async () => {
    await storageService.getData();
    const setSpy = browserLocalStorage.set as unknown as { mock: { calls: unknown[][] } };
    const before = setSpy.mock.calls.length;

    const result = await storageService.withWorkspaceMutation((data) => data);

    expect(result.changed).toBe(false);
    expect(result.attempts).toBe(1);
    expect(setSpy.mock.calls.length).toBe(before);
  });

  it('rebases a workspace mutation when a concurrent writer lands between read and write', async () => {
    const base = await storageService.getData();
    memoryStorage.set(DATA_KEY, base);
    const concurrent = {
      ...cloneSeedData(),
      brand: { ...cloneSeedData().brand, operatorName: 'Concurrent UI write' }
    };
    let reads = 0;
    const getSpy = browserLocalStorage.get as unknown as {
      mockImplementation: (fn: (key: string) => Promise<unknown>) => void;
    };
    getSpy.mockImplementation(async () => {
      reads += 1;
      if (reads === 2) {
        memoryStorage.set(DATA_KEY, concurrent);
        return concurrent;
      }
      return memoryStorage.get(DATA_KEY);
    });

    try {
      const result = await storageService.withWorkspaceMutation((data) => ({
        ...data,
        brand: { ...data.brand, positioning: 'SW reconcile write' }
      }));

      expect(result.changed).toBe(true);
      expect(result.attempts).toBeGreaterThan(1);
      expect(result.forced).toBe(false);
      const final = memoryStorage.get(DATA_KEY) as BrandOpsData;
      expect(final.brand.operatorName).toBe('Concurrent UI write');
      expect(final.brand.positioning).toBe('SW reconcile write');
    } finally {
      getSpy.mockImplementation(async (key: string) => memoryStorage.get(key));
    }
  });

  /**
   * Regression guard: under sustained contention (every attempt loses the CAS
   * race), the fallback used to fall through to a bare unconditional write —
   * recomputed from a stale read, with no re-check — silently reproducing
   * the exact last-write-wins clobbering this function exists to prevent, in
   * a return shape identical to a clean success. This proves the forced
   * write (a) still happens, so the caller's mutation is never dropped, (b)
   * is reported via `forced: true` so it's distinguishable from a real CAS
   * win, and (c) rebases against the freshest concurrent state it observed
   * instead of discarding it.
   */
  it('forces the write when every attempt loses the CAS race, without discarding the last observed concurrent write', async () => {
    const base = await storageService.getData();
    memoryStorage.set(DATA_KEY, base);
    let writeCount = 0;
    const getSpy = browserLocalStorage.get as unknown as {
      mockImplementation: (fn: (key: string) => Promise<unknown>) => void;
    };
    getSpy.mockImplementation(async () => {
      writeCount += 1;
      const concurrent = {
        ...cloneSeedData(),
        brand: { ...cloneSeedData().brand, operatorName: `Concurrent write #${writeCount}` }
      };
      memoryStorage.set(DATA_KEY, concurrent);
      return concurrent;
    });

    try {
      const result = await storageService.withWorkspaceMutation(
        (data) => ({ ...data, brand: { ...data.brand, positioning: 'forced write test' } }),
        { maxAttempts: 2 }
      );

      expect(result.changed).toBe(true);
      expect(result.forced).toBe(true);
      expect(result.attempts).toBe(2);
      // The forced write must still carry the caller's mutation...
      expect(result.data.brand.positioning).toBe('forced write test');
      // ...applied on top of the last concurrent state it actually observed, not stale data.
      expect(result.data.brand.operatorName).toBe(`Concurrent write #${writeCount}`);
      const final = memoryStorage.get(DATA_KEY) as BrandOpsData;
      expect(final.brand.positioning).toBe('forced write test');
    } finally {
      getSpy.mockImplementation(async (key: string) => memoryStorage.get(key));
    }
  });
});
