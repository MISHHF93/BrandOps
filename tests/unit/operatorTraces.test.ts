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

import { defaultAppSettings } from '../../src/config/workspaceDefaults';
import {
  capOperatorTraceEntries,
  MAX_OPERATOR_TRACE_ENTRIES,
  OPERATOR_TRACE_EXPORT_SCHEMA_VERSION,
  prependOperatorTrace,
  sanitizeOperatorTraceDetails,
  serializeOperatorTracesJsonl
} from '../../src/services/dataset/operatorTraces';
import { storageService, withDefaults } from '../../src/services/storage/storage';
import type { BrandOpsData, OperatorTraceEntry } from '../../src/types/domain';

const baseWorkspace = (): BrandOpsData => ({
  brand: {
    operatorName: 't',
    positioning: 'p',
    primaryOffer: 'o',
    voiceGuide: 'v',
    focusMetric: 'f'
  },
  brandVault: {
    positioningStatement: '',
    headlineOptions: [],
    shortBio: '',
    fullAboutSummary: '',
    serviceOfferings: [],
    collaborationModes: [],
    outreachAngles: [],
    audienceSegments: [],
    expertiseAreas: [],
    industries: [],
    proofPoints: [],
    signatureThemes: [],
    preferredVoiceNotes: [],
    bannedPhrases: [],
    callsToAction: [],
    reusableSnippets: [],
    personalNotes: []
  },
  modules: [],
  publishingQueue: [],
  contentLibrary: [],
  contacts: [],
  companies: [],
  notes: [],
  outreachDrafts: [],
  outreachTemplates: [],
  outreachHistory: [],
  followUps: [],
  opportunities: [],
  messagingVault: [],
  scheduler: {
    tasks: [],
    updatedAt: new Date().toISOString(),
    lastHydratedAt: new Date().toISOString()
  },
  settings: { ...defaultAppSettings, operatorTraceCollectionEnabled: true },
  externalSync: { links: [], updatedAt: new Date().toISOString() },
  integrationHub: { liveFeed: [], sshTargets: [], sources: [], artifacts: [] },
  seed: {
    seededAt: new Date().toISOString(),
    source: 'production-empty',
    version: '1',
    onboardingVersion: '1'
  }
});

describe('operator traces', () => {
  it('sanitizeOperatorTraceDetails caps keys and string length', () => {
    const d: Record<string, unknown> = { long: 'y'.repeat(300), n: 42, ok: true };
    for (let i = 0; i < 20; i += 1) d[`k${i}`] = 'x';
    const out = sanitizeOperatorTraceDetails(d);
    expect(Object.keys(out!).length).toBeLessThanOrEqual(12);
    const longVal = Object.values(out!).find((v) => typeof v === 'string' && v.includes('y')) as
      | string
      | undefined;
    expect(longVal!.length).toBeLessThanOrEqual(201);
    expect(longVal!.endsWith('…')).toBe(true);
  });

  it('prependOperatorTrace is a no-op when collection disabled', () => {
    const data = baseWorkspace();
    data.settings = { ...data.settings, operatorTraceCollectionEnabled: false };
    const next = prependOperatorTrace(data, { source: 'user', verb: 'x' });
    expect(next).toBe(data);
    expect(next.operatorTraces?.entries?.length ?? 0).toBe(0);
  });

  it('prependOperatorTrace prepends newest-first and respects cap', () => {
    let data = baseWorkspace();
    data = prependOperatorTrace(data, { source: 'user', verb: 'a', outcome: 'success' });
    for (let i = 0; i < MAX_OPERATOR_TRACE_ENTRIES + 5; i += 1) {
      data = prependOperatorTrace(data, { source: 'user', verb: `b${i}`, outcome: 'success' });
    }
    expect(data.operatorTraces?.entries.length).toBe(MAX_OPERATOR_TRACE_ENTRIES);
    expect(data.operatorTraces?.entries[0]?.verb).toBe(`b${MAX_OPERATOR_TRACE_ENTRIES + 4}`);
  });

  /**
   * Approval resolution (`checkpointActions.ts` `findPendingTraceIdForPlan`) has no
   * fallback once a pending trace row is gone entirely — a plain slice-to-cap could
   * silently and permanently orphan a plan sitting in `pending-approval` once enough
   * unrelated activity pushed its trace past the cap. Regression coverage for that.
   */
  it('prependOperatorTrace never evicts a pending-review entry, even past the cap', () => {
    let data = baseWorkspace();
    data = prependOperatorTrace(data, {
      source: 'assistant',
      verb: 'ask.convert_to_plan',
      entityType: 'plan',
      entityId: 'plan-oldest',
      reviewStatus: 'pending',
      outcome: 'success'
    });
    for (let i = 0; i < MAX_OPERATOR_TRACE_ENTRIES + 50; i += 1) {
      data = prependOperatorTrace(data, { source: 'user', verb: `noise-${i}`, outcome: 'success' });
    }
    const entries = data.operatorTraces?.entries ?? [];
    expect(entries.length).toBe(MAX_OPERATOR_TRACE_ENTRIES);
    const pending = entries.find((e) => e.entityId === 'plan-oldest');
    expect(pending?.reviewStatus).toBe('pending');
  });

  it('capOperatorTraceEntries preserves newest-first order and keeps all pending rows over the cap', () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      id: `e${i}`,
      at: new Date().toISOString(),
      source: 'user' as const,
      verb: `v${i}`,
      outcome: 'success' as const,
      ...(i === 3 || i === 7 ? { reviewStatus: 'pending' as const } : {})
    }));
    const capped = capOperatorTraceEntries(entries, 4);
    expect(capped.map((e) => e.id)).toEqual(['e0', 'e1', 'e3', 'e7']);
  });

  /** Same eviction risk exists on the read-side normalizer (`withDefaults`), a separate code path from `prependOperatorTrace` — e.g. loading an imported workspace file with an oversized trace log. */
  it('withDefaults normalizer also preserves pending-review entries past the cap', () => {
    const data = baseWorkspace();
    const oversized: OperatorTraceEntry[] = [
      {
        id: 'trace-oldest-pending',
        at: new Date(0).toISOString(),
        source: 'assistant',
        verb: 'ask.convert_to_plan',
        entityType: 'plan',
        entityId: 'plan-oldest',
        reviewStatus: 'pending',
        outcome: 'success'
      },
      ...Array.from({ length: MAX_OPERATOR_TRACE_ENTRIES + 50 }, (_, i) => ({
        id: `trace-noise-${i}`,
        at: new Date().toISOString(),
        source: 'user' as const,
        verb: `noise-${i}`,
        outcome: 'success' as const
      }))
    ];
    data.operatorTraces = { entries: oversized };

    const reloaded = withDefaults(data);
    const entries = reloaded.operatorTraces?.entries ?? [];
    expect(entries.length).toBe(MAX_OPERATOR_TRACE_ENTRIES);
    expect(entries.find((e) => e.id === 'trace-oldest-pending')?.reviewStatus).toBe('pending');
  });

  it('serializeOperatorTracesJsonl starts with metadata line', () => {
    let data = baseWorkspace();
    data = prependOperatorTrace(data, {
      source: 'user',
      verb: 'nav.tab_change',
      outcome: 'success'
    });
    const raw = serializeOperatorTracesJsonl(data);
    const lines = raw.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const meta = JSON.parse(lines[0]!) as { schemaVersion: string; type: string };
    expect(meta.type).toBe('brandops.operator_traces.metadata');
    expect(meta.schemaVersion).toBe(OPERATOR_TRACE_EXPORT_SCHEMA_VERSION);
    const row = JSON.parse(lines[1]!) as { verb: string };
    expect(row.verb).toBe('nav.tab_change');
  });
});

describe('storageService operator traces', () => {
  beforeEach(() => {
    memoryStorage.clear();
  });

  it('appendOperatorTrace persists when collection enabled', async () => {
    await storageService.getData();
    await storageService.appendOperatorTrace({
      source: 'user',
      verb: 'test.event',
      outcome: 'success'
    });
    const d = await storageService.getData();
    expect(d.operatorTraces?.entries.length).toBe(1);
    expect(d.operatorTraces?.entries[0]?.verb).toBe('test.event');
  });

  it('exportOperatorTracesJsonl reads persisted traces', async () => {
    await storageService.getData();
    await storageService.appendOperatorTrace({
      source: 'assistant',
      verb: 'command.execute',
      outcome: 'success',
      details: { action: 'add-note' }
    });
    const jsonl = await storageService.exportOperatorTracesJsonl();
    expect(jsonl).toContain('command.execute');
    expect(jsonl).toContain(OPERATOR_TRACE_EXPORT_SCHEMA_VERSION);
  });
});
