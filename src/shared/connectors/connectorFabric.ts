import type { ConnectorCapability, ConnectorDefinition, ConnectorTransport } from './connectorCatalog';

export type ConnectorFabricId = 'native' | 'google-workspace-mcp' | 'nango' | 'pipedream' | 'composio';

export interface ConnectorFabricDefinition {
  id: ConnectorFabricId;
  label: string;
  transport: ConnectorTransport;
  managedAuth: boolean;
  justInTimeTools: boolean;
  status: 'AVAILABLE' | 'PREVIEW' | 'PLANNED';
}

export interface DiscoveredConnectorCapability {
  connectorId: string;
  connectorName: string;
  provider: string;
  capability: ConnectorCapability;
  fabric: ConnectorFabricId;
  requiresApproval: boolean;
}

export const CONNECTOR_FABRICS: readonly ConnectorFabricDefinition[] = [
  {
    id: 'native',
    label: 'Native APIs',
    transport: 'api',
    managedAuth: false,
    justInTimeTools: false,
    status: 'AVAILABLE'
  },
  {
    id: 'google-workspace-mcp',
    label: 'Google Workspace MCP',
    transport: 'mcp',
    managedAuth: false,
    justInTimeTools: true,
    status: 'PREVIEW'
  },
  {
    id: 'nango',
    label: 'Nango',
    transport: 'api',
    managedAuth: true,
    justInTimeTools: true,
    status: 'PLANNED'
  },
  {
    id: 'pipedream',
    label: 'Pipedream Connect',
    transport: 'webhook',
    managedAuth: true,
    justInTimeTools: true,
    status: 'PLANNED'
  },
  {
    id: 'composio',
    label: 'Composio',
    transport: 'mcp',
    managedAuth: true,
    justInTimeTools: true,
    status: 'PLANNED'
  }
];

export function fabricForConnector(connector: ConnectorDefinition): ConnectorFabricDefinition {
  if (connector.provider === 'google' && connector.transport === 'mcp') {
    return CONNECTOR_FABRICS.find((fabric) => fabric.id === 'google-workspace-mcp')!;
  }
  if (connector.transport === 'mcp') {
    return CONNECTOR_FABRICS.find((fabric) => fabric.id === 'composio')!;
  }
  return CONNECTOR_FABRICS.find((fabric) => fabric.id === 'native')!;
}

export function discoverConnectorCapabilities(
  connectors: readonly ConnectorDefinition[],
  query: string,
  options: { family?: string; limit?: number } = {}
): readonly DiscoveredConnectorCapability[] {
  const normalizedQuery = query.trim().toLowerCase();
  const limit = Math.max(1, Math.min(options.limit ?? 12, 50));
  const matches: DiscoveredConnectorCapability[] = [];

  for (const connector of connectors) {
    if (options.family && connector.family !== options.family && connector.category !== options.family) continue;
    const connectorText = `${connector.name} ${connector.provider} ${connector.description}`.toLowerCase();
    for (const capability of connector.capabilities) {
      const capabilityText = `${capability.id} ${capability.label} ${capability.description}`.toLowerCase();
      if (normalizedQuery && !`${connectorText} ${capabilityText}`.includes(normalizedQuery)) continue;
      matches.push({
        connectorId: connector.id,
        connectorName: connector.name,
        provider: connector.provider,
        capability,
        fabric: fabricForConnector(connector).id,
        requiresApproval: capability.approvalRequired ?? false
      });
      if (matches.length >= limit) return matches;
    }
  }
  return matches;
}