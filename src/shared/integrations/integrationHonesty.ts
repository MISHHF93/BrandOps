import type { IntegrationSource } from '../../types/domain';

/** Knowledge Center topic id — see `knowledgeCenterTopics`. */
export const INTEGRATION_REGISTRY_HELP_TOPIC_ID = 'integration-registry' as const;

export type HubHonestyPillTone = 'neutral' | 'info' | 'muted';

/** Operator-facing badges for a hub-registered source (local-first; no vendor sync shipped). */
export function hubSourceHonestyPills(
  status: IntegrationSource['status']
): readonly { label: string; tone: HubHonestyPillTone }[] {
  const statusPill: { label: string; tone: HubHonestyPillTone } =
    status === 'planned'
      ? { label: 'Planned connector', tone: 'muted' }
      : status === 'monitoring'
        ? { label: 'Monitoring intent', tone: 'info' }
        : { label: 'Registered', tone: 'neutral' };

  return [
    { label: 'Saved locally', tone: 'neutral' },
    { label: 'Background sync: off', tone: 'info' },
    statusPill
  ];
}
