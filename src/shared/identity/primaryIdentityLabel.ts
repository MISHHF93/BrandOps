import type { BrandOpsData, IdentityProviderId } from '../../types/domain';

/** Display string for the linked OAuth profile shown in the cockpit, or null if none. */
export function getPrimaryIdentityLabel(data: BrandOpsData): string | null {
  const hub = data.settings.syncHub;
  const order: IdentityProviderId[] = ['google', 'github', 'linkedin'];

  const pickRow = () => {
    const explicit = data.settings.primaryIdentityProvider;
    if (
      explicit &&
      hub[explicit].connectionStatus === 'connected'
    ) {
      return hub[explicit];
    }
    const connected = order
      .filter((id) => hub[id].connectionStatus === 'connected')
      .map((id) => ({ id, at: hub[id].lastConnectedAt }))
      .sort((a, b) => {
        const ta = a.at ? new Date(a.at).getTime() : 0;
        const tb = b.at ? new Date(b.at).getTime() : 0;
        return tb - ta;
      });
    return connected.length ? hub[connected[0].id] : null;
  };

  const row = pickRow();
  if (!row) return null;

  const name = row.profile?.name?.trim();
  const email = row.profile?.email?.trim();
  if (name && email) return `${name} (${email})`;
  return name || email || 'Signed in';
}
