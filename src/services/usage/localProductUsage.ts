/**
 * On-device, privacy-preserving aggregates for the product experience metrics in
 * Rolling aggregates: habit, command confidence, perceived shell speed — local-only.
 * No network: stored under `product-usage-v1` in extension local storage.
 */
import { browserLocalStorage } from '../../shared/storage/browserStorage';

/** Matches {@link MobileShellTabId} — kept local to avoid services importing pages. */
type ShellTabId = 'pulse' | 'chat' | 'daily' | 'integrations' | 'settings';

const STORAGE_KEY = 'product-usage-v1';
const MAX_DAY_KEYS = 120;
const MAX_ROLLING_SAMPLES = 32;

export type LocalProductUsageV1 = {
  v: 1;
  firstOpenAt: string;
  /** Local calendar YYYY-MM-DD, most recent first, de-duplicated, capped. */
  activeLocalDays: string[];
  commandOk: number;
  commandFail: number;
  fromPulseToChat: number;
  fromTodayToChat: number;
  fromIntegrationsToChat: number;
  fromSettingsToChat: number;
  /** Milliseconds between consecutive command completions (ok or fail). */
  interCommandDeltasMs: number[];
  /** Last N agent round-trip durations (execute flow). */
  commandDurationsMs: number[];
  /** Time to first ready snapshot after shell mount (per page load, last N). */
  initialShellReadyDurationsMs: number[];
  lastCommandCompletedAtMs: number | null;
};

const defaultUsage = (): LocalProductUsageV1 => ({
  v: 1,
  firstOpenAt: new Date().toISOString(),
  activeLocalDays: [],
  commandOk: 0,
  commandFail: 0,
  fromPulseToChat: 0,
  fromTodayToChat: 0,
  fromIntegrationsToChat: 0,
  fromSettingsToChat: 0,
  interCommandDeltasMs: [],
  commandDurationsMs: [],
  initialShellReadyDurationsMs: [],
  lastCommandCompletedAtMs: null
});

export function localDayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDayKey(key: string): number | null {
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  return Number.isFinite(t) ? t : null;
}

function mergeDayKeys(prior: string[], day: string): string[] {
  const set = new Set([day, ...prior]);
  const next = Array.from(set).sort((a, b) => {
    const ta = parseDayKey(a);
    const tb = parseDayKey(b);
    if (ta === null || tb === null) return 0;
    return tb - ta;
  });
  return next.slice(0, MAX_DAY_KEYS);
}

function pushCapped(list: number[], value: number, cap: number): number[] {
  return [...list, value].slice(-cap);
}

async function write(u: LocalProductUsageV1): Promise<void> {
  await browserLocalStorage.set(STORAGE_KEY, u);
}

async function read(): Promise<LocalProductUsageV1> {
  const raw = await browserLocalStorage.get<LocalProductUsageV1>(STORAGE_KEY);
  if (!raw || raw.v !== 1) {
    const initial = defaultUsage();
    await write(initial);
    return initial;
  }
  return {
    ...defaultUsage(),
    ...raw,
    activeLocalDays: Array.isArray(raw.activeLocalDays) ? raw.activeLocalDays : [],
    interCommandDeltasMs: Array.isArray(raw.interCommandDeltasMs) ? raw.interCommandDeltasMs : [],
    commandDurationsMs: Array.isArray(raw.commandDurationsMs) ? raw.commandDurationsMs : [],
    initialShellReadyDurationsMs: Array.isArray(raw.initialShellReadyDurationsMs)
      ? raw.initialShellReadyDurationsMs
      : []
  };
}

/** Call once per shell mount; idempotent for the same calendar day. */
export async function recordLocalSessionDay(): Promise<void> {
  const u = await read();
  u.activeLocalDays = mergeDayKeys(u.activeLocalDays, localDayKey());
  await write(u);
}

export async function recordShellNavigation(from: ShellTabId, to: ShellTabId): Promise<void> {
  if (from === to) return;
  if (to !== 'chat') return;
  const u = await read();
  if (from === 'pulse') u.fromPulseToChat += 1;
  else if (from === 'daily') u.fromTodayToChat += 1;
  else if (from === 'integrations') u.fromIntegrationsToChat += 1;
  else if (from === 'settings') u.fromSettingsToChat += 1;
  await write(u);
}

export async function recordCommandOutcome(result: {
  ok: boolean;
  durationMs: number;
}): Promise<void> {
  const u = await read();
  if (result.ok) u.commandOk += 1;
  else u.commandFail += 1;
  const now = Date.now();
  if (u.lastCommandCompletedAtMs !== null) {
    const delta = Math.min(Math.max(0, now - u.lastCommandCompletedAtMs), 1000 * 60 * 60);
    u.interCommandDeltasMs = pushCapped(u.interCommandDeltasMs, delta, MAX_ROLLING_SAMPLES);
  }
  u.lastCommandCompletedAtMs = now;
  u.commandDurationsMs = pushCapped(
    u.commandDurationsMs,
    Math.max(0, result.durationMs),
    MAX_ROLLING_SAMPLES
  );
  await write(u);
}

export async function recordInitialShellReady(durationMs: number): Promise<void> {
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 120_000) return;
  const u = await read();
  u.initialShellReadyDurationsMs = pushCapped(
    u.initialShellReadyDurationsMs,
    durationMs,
    MAX_ROLLING_SAMPLES
  );
  await write(u);
}

function countActiveInRollingLocalDays(keys: string[], windowDays: number): number {
  const set = new Set(keys);
  let c = 0;
  for (let i = 0; i < windowDays; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (set.has(localDayKey(d))) c += 1;
  }
  return c;
}

function median(ns: number[]): number | null {
  if (ns.length === 0) return null;
  const s = [...ns].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function p95ish(ns: number[]): number | null {
  if (ns.length === 0) return null;
  const s = [...ns].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1);
  return s[idx] ?? null;
}

export type LocalProductUsageSummary = {
  /** Days with any open in the last 7 local calendar days (max 7). Habit / WAU-style proxy. */
  activeDaysLast7: number;
  /** Days with any open in the last 30 local calendar days (max 30). */
  activeDaysLast30: number;
  totalSessionsDaysStored: number;
  commandSuccessRate: number | null;
  commandOk: number;
  commandFail: number;
  fromPulseToChat: number;
  fromTodayToChat: number;
  fromIntegrationsToChat: number;
  fromSettingsToChat: number;
  medianMsBetweenCommands: number | null;
  medianCommandDurationMs: number | null;
  p95ishCommandDurationMs: number | null;
  medianInitialShellReadyMs: number | null;
  p95ishInitialShellReadyMs: number | null;
  firstOpenAt: string;
};

export async function getLocalProductUsageSummary(): Promise<LocalProductUsageSummary> {
  const u = await read();
  const total = u.commandOk + u.commandFail;
  return {
    activeDaysLast7: countActiveInRollingLocalDays(u.activeLocalDays, 7),
    activeDaysLast30: countActiveInRollingLocalDays(u.activeLocalDays, 30),
    totalSessionsDaysStored: u.activeLocalDays.length,
    commandSuccessRate: total > 0 ? u.commandOk / total : null,
    commandOk: u.commandOk,
    commandFail: u.commandFail,
    fromPulseToChat: u.fromPulseToChat,
    fromTodayToChat: u.fromTodayToChat,
    fromIntegrationsToChat: u.fromIntegrationsToChat,
    fromSettingsToChat: u.fromSettingsToChat,
    medianMsBetweenCommands: median(u.interCommandDeltasMs),
    medianCommandDurationMs: median(u.commandDurationsMs),
    p95ishCommandDurationMs: p95ish(u.commandDurationsMs),
    medianInitialShellReadyMs: median(u.initialShellReadyDurationsMs),
    p95ishInitialShellReadyMs: p95ish(u.initialShellReadyDurationsMs),
    firstOpenAt: u.firstOpenAt
  };
}
