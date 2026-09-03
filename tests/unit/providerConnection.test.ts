import { describe, it, expect } from 'vitest';
import {
  markProviderConnected,
  markProviderDisconnected,
  markProviderError
} from '../../src/shared/account/providerConnection';
import { resolveConnectorForProvider, connectorStateFromProviderStatus } from '../../src/shared/connectors/connectorCatalog';
import type { BrandOpsData } from '../../src/types/domain';

function makeWorkspace(): BrandOpsData {
  return {
    modules: [],
    brand: { operatorName: 'Test', primaryOffer: '', focusMetric: '' },
    brandVault: { positioning: '', bios: [], services: [], proofPoints: [], voiceNotes: [] },
    contentLibrary: [],
    publishingQueue: [],
    contacts: [],
    companies: [],
    opportunities: [],
    outreachDrafts: [],
    outreachTemplates: [],
    outreachHistory: [],
    followUps: [],
    activityNotes: [],
    settings: {
      syncHub: {
        google: { clientId: '', connectionStatus: 'disconnected', auth: {} },
        github: { clientId: '', connectionStatus: 'disconnected', auth: {} },
        linkedin: { clientId: '', connectionStatus: 'disconnected', auth: {} }
      }
    } as BrandOpsData['settings']
  } as BrandOpsData;
}

describe('markProviderConnected', () => {
  it('sets connectionStatus to connected', () => {
    const ws = makeWorkspace();
    const result = markProviderConnected(ws, 'linkedin');
    expect(result.settings.syncHub.linkedin.connectionStatus).toBe('connected');
  });

  it('records lastConnectedAt', () => {
    const ws = makeWorkspace();
    const result = markProviderConnected(ws, 'google');
    expect(result.settings.syncHub.google.lastConnectedAt).toBeDefined();
  });

  it('clears lastError', () => {
    const ws = makeWorkspace();
    ws.settings.syncHub.github.lastError = 'old error';
    const result = markProviderConnected(ws, 'github');
    expect(result.settings.syncHub.github.lastError).toBeUndefined();
  });

  it('does not mutate the original workspace', () => {
    const ws = makeWorkspace();
    const result = markProviderConnected(ws, 'linkedin');
    expect(ws.settings.syncHub.linkedin.connectionStatus).toBe('disconnected');
    expect(result.settings.syncHub.linkedin.connectionStatus).toBe('connected');
  });

  it('returns data unchanged when syncHub is missing', () => {
    const ws = makeWorkspace();
    delete ws.settings.syncHub;
    const result = markProviderConnected(ws, 'linkedin');
    expect(result).toBe(ws);
  });
});

describe('markProviderDisconnected', () => {
  it('sets connectionStatus to disconnected', () => {
    const ws = makeWorkspace();
    ws.settings.syncHub.linkedin.connectionStatus = 'connected';
    const result = markProviderDisconnected(ws, 'linkedin');
    expect(result.settings.syncHub.linkedin.connectionStatus).toBe('disconnected');
  });

  it('clears lastError', () => {
    const ws = makeWorkspace();
    ws.settings.syncHub.linkedin.lastError = 'error';
    const result = markProviderDisconnected(ws, 'linkedin');
    expect(result.settings.syncHub.linkedin.lastError).toBeUndefined();
  });
});

describe('markProviderError', () => {
  it('sets connectionStatus to error', () => {
    const ws = makeWorkspace();
    const result = markProviderError(ws, 'linkedin', 'auth failed');
    expect(result.settings.syncHub.linkedin.connectionStatus).toBe('error');
    expect(result.settings.syncHub.linkedin.lastError).toBe('auth failed');
  });
});

describe('connector registry and provider state', () => {
  it('resolves a real BrandOps provider to the canonical connector family', () => {
    const google = resolveConnectorForProvider('google');
    const github = resolveConnectorForProvider('github');

    expect(google?.id).toBe('google-account');
    expect(github?.id).toBe('github');
  });

  it('maps provider status to registry health states', () => {
    expect(connectorStateFromProviderStatus('connected')).toBe('CONNECTED');
    expect(connectorStateFromProviderStatus('configured')).toBe('AVAILABLE');
    expect(connectorStateFromProviderStatus('error')).toBe('MISCONFIGURED');
    expect(connectorStateFromProviderStatus('disconnected')).toBe('NOT_CONNECTED');
  });
});
