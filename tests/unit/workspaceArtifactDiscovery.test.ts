import { describe, expect, it } from 'vitest';
import { discoverWorkspaceArtifactsForTrace } from '../../src/services/ai/workspaceArtifactDiscovery';
import { cloneSeedData } from '../helpers/fixtures';

describe('discoverWorkspaceArtifactsForTrace', () => {
  it('emits integration_record_ref rows from integrationHub.artifacts', () => {
    const d = cloneSeedData();
    d.integrationHub.artifacts = [
      {
        id: 'ea1',
        sourceId: 's',
        title: 'T',
        artifactType: 'crm-row',
        summary: '',
        tags: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ];
    const arts = discoverWorkspaceArtifactsForTrace(d, 'trace-x', { max: 40 });
    expect(arts.some((a) => a.workspace_entity_id === 'ea1')).toBe(true);
    expect(arts.some((a) => a.kind === 'integration_record_ref')).toBe(true);
  });
});
