import { describe, expect, it } from 'vitest';

import { dailyNotificationCenter } from '../../src/services/intelligence/dailyNotificationCenter';
import { localIntelligence } from '../../src/services/intelligence/localIntelligence';
import { scheduler } from '../../src/services/scheduling/scheduler';
import { buildScaledData } from '../helpers/fixtures';

const measureMs = <T>(fn: () => T) => {
  const startedAt = performance.now();
  const result = fn();
  return {
    result,
    durationMs: performance.now() - startedAt
  };
};

describe('performance smoke', () => {
  it('keeps core dashboard computations within practical budgets on scaled data', () => {
    const data = buildScaledData(250);
    const now = new Date('2026-04-11T12:00:00.000Z');

    scheduler.reconcile(data, now);
    localIntelligence.contentPriority(data.contentLibrary);
    localIntelligence.outreachUrgency(data.outreachDrafts);
    localIntelligence.overdueRisk(data);
    localIntelligence.pipelineHealth(data.opportunities);
    localIntelligence.publishingRecommendations(data.publishingQueue);
    dailyNotificationCenter.build(data);

    const schedulerRun = measureMs(() => scheduler.reconcile(data, now));
    const intelligenceRun = measureMs(() => {
      localIntelligence.contentPriority(data.contentLibrary);
      localIntelligence.outreachUrgency(data.outreachDrafts);
      localIntelligence.overdueRisk(data);
      localIntelligence.pipelineHealth(data.opportunities);
      localIntelligence.publishingRecommendations(data.publishingQueue);
    });
    const digestRun = measureMs(() => dailyNotificationCenter.build(data));

    expect(schedulerRun.result.tasks.length).toBe(
      data.publishingQueue.length + data.followUps.length + data.opportunities.length
    );
    /* Budgets allow slower dev/Windows hosts; still catch pathological regressions vs multi-second stalls. */
    expect(schedulerRun.durationMs).toBeLessThan(1200);
    expect(intelligenceRun.durationMs).toBeLessThan(1200);
    expect(digestRun.result.headline.length).toBeGreaterThan(0);
    expect(digestRun.durationMs).toBeLessThan(1200);
  });
});
