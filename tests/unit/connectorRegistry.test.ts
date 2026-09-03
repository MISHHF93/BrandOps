import { describe, expect, it } from 'vitest';
import {
  BRANDOPS_CONNECTOR_LIBRARY,
  connectorRegistry,
  resolveConnectorForCapability,
  CAPABILITY_TAXONOMY,
  GOOGLE_CONNECTOR_FAMILY,
  filterConnectorLibrary
} from '../../src/shared/connectors/connectorCatalog';
import {
  BRANDOPS_AGENT_CATALOG,
  BRANDOPS_SYSTEM_AGENT_CATALOG,
  modelIdForAgent
} from '../../src/shared/agents/agentCatalog';
import { discoverConnectorCapabilities } from '../../src/shared/connectors/connectorFabric';
import {
  BRANDOPS_CONNECTOR_RECONCILIATION,
  CONNECTOR_RECONCILIATION_SUMMARY
} from '../../src/shared/connectors/connectorReconciliation';

describe('connector registry', () => {
  it('defines a canonical Google family and protects capability truth', () => {
    expect(GOOGLE_CONNECTOR_FAMILY.length).toBeGreaterThan(5);
    expect(
      GOOGLE_CONNECTOR_FAMILY.some((connector) => connector.id === 'google-account')
    ).toBe(true);
    expect(
      GOOGLE_CONNECTOR_FAMILY.some((connector) => connector.id === 'gmail')
    ).toBe(true);
    expect(
      BRANDOPS_CONNECTOR_LIBRARY.some((connector) => connector.maturity === 'PLANNED')
    ).toBe(true);
  });

  it('routes by canonical capability rather than provider-specific imports', () => {
    const gmail = resolveConnectorForCapability('gmail.send');
    expect(gmail).toBeDefined();
    expect(gmail?.provider).toBe('google');

    const calendar = resolveConnectorForCapability('calendar.create');
    expect(calendar).toBeDefined();
    expect(calendar?.id).toBe('google-calendar');
  });

  it('enforces canonical capability vocabulary and risk classification', () => {
    expect(CAPABILITY_TAXONOMY).toContain('email.send');
    expect(CAPABILITY_TAXONOMY).toContain('calendar.create');
    expect(CAPABILITY_TAXONOMY).toContain('social.publish');
    expect(connectorRegistry.get('gmail')?.capabilities.some((cap) => cap.id === 'email.send')).toBe(
      true
    );
    expect(connectorRegistry.get('gmail')?.riskLevel).toBe('SEND_EXTERNAL');
  });

  it('filters the connector library by search, category, and status without losing truthfulness', () => {
    const search = filterConnectorLibrary(BRANDOPS_CONNECTOR_LIBRARY, 'gmail', 'all', 'all');
    expect(search.some((connector) => connector.id === 'gmail')).toBe(true);
    expect(search.some((connector) => connector.id === 'linkedin')).toBe(false);

    const category = filterConnectorLibrary(BRANDOPS_CONNECTOR_LIBRARY, '', 'google', 'all');
    expect(category.some((connector) => connector.family === 'google')).toBe(true);
    expect(category.some((connector) => connector.family === 'social')).toBe(false);

    const status = filterConnectorLibrary(BRANDOPS_CONNECTOR_LIBRARY, '', 'all', 'PLANNED');
    expect(status.some((connector) => connector.maturity === 'PLANNED')).toBe(true);
    expect(status.some((connector) => connector.status === 'CONNECTED')).toBe(false);
  });

  it('routes the visible capability agents through the default model stack', () => {
    expect(BRANDOPS_AGENT_CATALOG).toHaveLength(8);
    expect(modelIdForAgent('orchestrator')).toBe('gemini-3.8-flash');
    expect(modelIdForAgent('media')).toBe('nano-banana-2');
    expect(modelIdForAgent('workspace')).toBe('gemini-3.5-flash-lite');
    expect(BRANDOPS_SYSTEM_AGENT_CATALOG).toHaveLength(8);
    expect(BRANDOPS_SYSTEM_AGENT_CATALOG.some((agent) => agent.id === 'verification')).toBe(true);
  });

  it('discovers only a bounded set of capability tools just in time', () => {
    const results = discoverConnectorCapabilities(BRANDOPS_CONNECTOR_LIBRARY, 'email.send', { limit: 2 });
    expect(results).toHaveLength(2);
    expect(results.every((result) => result.capability.id === 'email.send')).toBe(true);
    expect(results.every((result) => result.requiresApproval)).toBe(true);
  });

  it('reconciles the complete provider inventory without duplicate mechanism records', () => {
    expect(CONNECTOR_RECONCILIATION_SUMMARY.totalTargets).toBe(91);
    expect(CONNECTOR_RECONCILIATION_SUMMARY.uniqueProviders).toBe(84);
    expect(CONNECTOR_RECONCILIATION_SUMMARY.mechanisms).toBe(7);
    expect(new Set(BRANDOPS_CONNECTOR_RECONCILIATION.map((entry) => entry.id)).size).toBe(91);
    expect(BRANDOPS_CONNECTOR_RECONCILIATION.find((entry) => entry.id === 'gmail')?.status).toBe('PARTIAL');
    expect(BRANDOPS_CONNECTOR_RECONCILIATION.find((entry) => entry.id === 'a2a')?.kind).toBe('mechanism');
  });

  it('does not expose provider metadata as an authenticated runtime connection', () => {
    expect(BRANDOPS_CONNECTOR_LIBRARY.find((connector) => connector.id === 'gmail')?.status).toBe(
      'NOT_CONNECTED'
    );
    expect(BRANDOPS_CONNECTOR_LIBRARY.find((connector) => connector.id === 'google-account')?.status).toBe(
      'NOT_CONNECTED'
    );
    expect(BRANDOPS_CONNECTOR_LIBRARY.find((connector) => connector.id === 'remote-mcp-server')?.status).toBe(
      'AVAILABLE'
    );
  });
});
