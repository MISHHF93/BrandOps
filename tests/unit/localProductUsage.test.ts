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

import {
  getLocalProductUsageSummary,
  localDayKey,
  recordCommandOutcome,
  recordLocalSessionDay,
  recordShellNavigation,
  type LocalProductUsageV1
} from '../../src/services/usage/localProductUsage';

const USAGE_KEY = 'product-usage-v1';

describe('localProductUsage', () => {
  beforeEach(() => {
    memoryStorage.clear();
  });

  it('seeds usage on first read and records an active day', async () => {
    await recordLocalSessionDay();
    const raw = memoryStorage.get(USAGE_KEY) as LocalProductUsageV1 | undefined;
    expect(raw?.v).toBe(1);
    expect(raw?.activeLocalDays).toContain(localDayKey());
  });

  it('increments navigation when landing on Assistant from Workspace overview or Today', async () => {
    await recordShellNavigation('workspace', 'chat');
    await recordShellNavigation('daily', 'chat');
    const s = await getLocalProductUsageSummary();
    expect(s.fromPulseToChat).toBe(1);
    expect(s.fromTodayToChat).toBe(1);
  });

  it('does not increment when not navigating to Chat', async () => {
    await recordShellNavigation('workspace', 'daily');
    const s = await getLocalProductUsageSummary();
    expect(s.fromPulseToChat).toBe(0);
  });

  it('records command outcomes and success rate', async () => {
    await recordCommandOutcome({ ok: true, durationMs: 40 });
    await recordCommandOutcome({ ok: true, durationMs: 60 });
    await recordCommandOutcome({ ok: false, durationMs: 12 });
    const s = await getLocalProductUsageSummary();
    expect(s.commandOk).toBe(2);
    expect(s.commandFail).toBe(1);
    expect(s.commandSuccessRate).toBeCloseTo(2 / 3, 5);
    expect(s.p95ishCommandDurationMs).toBeGreaterThan(0);
  });

  it('records time between commands in interCommandDeltasMs', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-15T10:00:00.000Z'));
    await recordCommandOutcome({ ok: true, durationMs: 10 });
    vi.setSystemTime(new Date('2020-01-15T10:00:05.000Z'));
    await recordCommandOutcome({ ok: true, durationMs: 10 });
    const s = await getLocalProductUsageSummary();
    expect(s.medianMsBetweenCommands).toBe(5000);
    vi.useRealTimers();
  });
});
