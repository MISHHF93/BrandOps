import { describe, expect, it } from 'vitest';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { buildPulseTimeline } from '../../src/pages/mobile/pulseTimeline';
import type { BrandOpsData, FollowUpTask } from '../../src/types/domain';
import { cloneDemoSampleData } from '../helpers/fixtures';

const sortMs = (iso: string) => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.NaN : t;
};

describe('buildPulseTimeline', () => {
  it('sorts rows ascending by sortKey (soonest first)', () => {
    const w = cloneDemoSampleData();
    const rows = buildPulseTimeline(w);
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 1; i < rows.length; i++) {
      const a = sortMs(rows[i - 1].sortKey);
      const b = sortMs(rows[i].sortKey);
      expect(Number.isNaN(a) || Number.isNaN(b) || b >= a).toBe(true);
    }
  });

  it('matches snapshot.pulseTimelineRows from buildWorkspaceSnapshot', () => {
    const w = cloneDemoSampleData();
    expect(buildWorkspaceSnapshot(w).pulseTimelineRows).toEqual(buildPulseTimeline(w));
  });

  it('caps merged timeline at 40 rows', () => {
    const base = cloneDemoSampleData();
    const extra: FollowUpTask[] = Array.from({ length: 60 }, (_, i) => ({
      id: `fu-pulse-cap-${i}`,
      contactId: base.contacts[0]?.id ?? 'contact-1',
      reason: `Cap test ${i}`,
      dueAt: new Date(Date.UTC(2030, 0, 2 + i)).toISOString(),
      completed: false
    }));
    const w: BrandOpsData = { ...base, followUps: [...base.followUps, ...extra] };
    expect(buildPulseTimeline(w)).toHaveLength(40);
  });

  it('excludes completed follow-ups', () => {
    const base = cloneDemoSampleData();
    const first = base.followUps[0];
    expect(first).toBeDefined();
    const w: BrandOpsData = {
      ...base,
      followUps: base.followUps.map((f, i) => (i === 0 ? { ...f, completed: true } : f))
    };
    const ids = new Set(buildPulseTimeline(w).filter((r) => r.kind === 'follow-up').map((r) => r.id));
    expect(ids.has(`fu-${first!.id}`)).toBe(false);
  });
});
