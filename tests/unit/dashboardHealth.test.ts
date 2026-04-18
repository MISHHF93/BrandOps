import { describe, expect, it } from 'vitest';

import { computeOverviewHealthMetrics } from '../../src/pages/dashboard/dashboardHealth';
import { cloneDemoSampleData } from '../helpers/fixtures';

describe('computeOverviewHealthMetrics', () => {
  it('marks execution severity as critical when high heat items exist', () => {
    const data = cloneDemoSampleData();
    const metrics = computeOverviewHealthMetrics(data, [92, 74, 55]);
    const execution = metrics.find((item) => item.id === 'execution');

    expect(execution?.severity).toBe('critical');
    expect(execution?.detail).toContain('1 critical');
  });

  it('marks publishing as warning for unscheduled and due-soon work', () => {
    const data = cloneDemoSampleData();
    data.publishingQueue = [
      {
        ...data.publishingQueue[0],
        status: 'queued',
        scheduledFor: undefined,
        reminderAt: undefined
      }
    ];

    const metrics = computeOverviewHealthMetrics(data, [50]);
    const publishing = metrics.find((item) => item.id === 'publishing');

    expect(publishing?.severity).toBe('warning');
    expect(publishing?.detail).toContain('unscheduled');
  });

  it('marks integration as critical when sync is stale and errored', () => {
    const data = cloneDemoSampleData();
    data.settings.syncHub.linkedin.connectionStatus = 'connected';
    data.settings.syncHub.linkedin.lastConnectedAt = '2026-01-01T00:00:00.000Z';
    data.settings.syncHub.linkedin.lastError = 'Token refresh failed';

    const metrics = computeOverviewHealthMetrics(data, [40]);
    const integration = metrics.find((item) => item.id === 'integration');

    expect(integration?.severity).toBe('critical');
  });
});
