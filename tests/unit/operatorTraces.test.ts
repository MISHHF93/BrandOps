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
  MAX_OPERATOR_TRACE_ENTRIES,
  OPERATOR_TRACE_EXPORT_SCHEMA_VERSION,
  prependOperatorTrace,
  sanitizeOperatorTraceDetails,
  serializeOperatorTracesJsonl
} from '../../src/services/dataset/operatorTraces';
import { storageService } from '../../src/services/storage/storage';
import type { BrandOpsData } from '../../src/types/domain';

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
