import { describe, expect, it } from 'vitest';
import type { CockpitDailySnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { buildTodayFocusBoard } from '../../src/pages/mobile/todayFocusModel';
import { cloneSeedData } from '../helpers/fixtures';

describe('buildTodayFocusBoard', () => {
  it('returns do / urgent / momentum with quick actions', () => {
    const snap = buildWorkspaceSnapshot(cloneSeedData()) as CockpitDailySnapshot;
    const t = buildTodayFocusBoard(snap);
    expect(t.doToday.length).toBeGreaterThan(0);
    expect(t.urgent.length).toBeGreaterThan(0);
    expect(t.momentum.length).toBeGreaterThan(0);
    expect(t.quickActions.some((a) => a.command.includes('pipeline health'))).toBe(true);
  });
});
