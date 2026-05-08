import { describe, expect, it } from 'vitest';
import {
  hubSourceHonestyPills,
  INTEGRATION_REGISTRY_HELP_TOPIC_ID
} from '../../src/shared/integrations/integrationHonesty';

describe('integrationHonesty', () => {
  it('exports stable Help topic id', () => {
    expect(INTEGRATION_REGISTRY_HELP_TOPIC_ID).toBe('integration-registry');
  });

  it('hubSourceHonestyPills always includes local + sync-off + status row', () => {
    const planned = hubSourceHonestyPills('planned');
    expect(planned.map((p) => p.label)).toEqual([
      'Saved locally',
      'Background sync: off',
      'Planned connector'
    ]);

    const connected = hubSourceHonestyPills('connected');
    expect(connected.find((p) => p.label === 'Registered')).toBeTruthy();

    const monitoring = hubSourceHonestyPills('monitoring');
    expect(monitoring.find((p) => p.label === 'Monitoring intent')).toBeTruthy();
  });
});
