import { describe, expect, it } from 'vitest';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { buildPulseHomeBoard } from '../../src/pages/mobile/pulseHomeModel';
import { cloneSeedData } from '../helpers/fixtures';

describe('buildPulseHomeBoard', () => {
  it('produces the four sections from seed data', () => {
    const snap = buildWorkspaceSnapshot(cloneSeedData());
    const home = buildPulseHomeBoard(snap, new Date('2025-01-15T10:00:00'));
    expect(home.mattersNow.length).toBeGreaterThan(0);
    expect(home.needsAttention.length).toBeGreaterThan(0);
    expect(home.momentum.length).toBeGreaterThan(0);
    expect(home.recommendedActions.length).toBeGreaterThan(0);
    expect(home.recommendedActions.some((a) => a.command.includes('pipeline health'))).toBe(true);
  });
});
