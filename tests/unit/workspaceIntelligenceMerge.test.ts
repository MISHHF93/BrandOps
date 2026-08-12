import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceIntelligenceState,
  refreshWorkspaceIntelligence,
  WORKSPACE_INTELLIGENCE_SCHEMA_VERSION
} from '../../src/services/workspaceIntelligence/workspaceIntelligence';
import type { WorkspaceOperatingManualSection } from '../../src/types/workspaceIntelligence';
import { cloneSeedData } from '../helpers/fixtures';

const customSection: WorkspaceOperatingManualSection = {
  id: 'custom-approval-rule',
  title: 'Custom Approval Rule',
  body: 'External outreach requires explicit approval.',
  evidenceCount: 3,
  updatedAt: '2026-01-01T00:00:00.000Z'
};

describe('workspaceIntelligence operatingManual merge on reload', () => {
  it('preserves learned/custom operating manual rows that are not re-derived', () => {
    const workspace = cloneSeedData();
    const withPersisted = {
      ...workspace,
      workspaceIntelligence: {
        schemaVersion: WORKSPACE_INTELLIGENCE_SCHEMA_VERSION,
        updatedAt: '2026-01-01T00:00:00.000Z',
        dna: workspace.workspaceIntelligence?.dna,
        decisionMemory: workspace.workspaceIntelligence?.decisionMemory ?? [],
        opportunityRadar: [],
        scorecard: workspace.workspaceIntelligence?.scorecard ?? [],
        operatingManual: [customSection]
      }
    };

    const rebuilt = buildWorkspaceIntelligenceState(withPersisted);
    const ids = rebuilt.operatingManual.map((row) => row.id);
    expect(ids).toContain('custom-approval-rule');
    const kept = rebuilt.operatingManual.find((row) => row.id === 'custom-approval-rule');
    expect(kept?.body).toBe('External outreach requires explicit approval.');
    expect(kept?.evidenceCount).toBe(3);
  });

  it('keeps the canonical derived sections on every reload', () => {
    const workspace = cloneSeedData();
    const rebuilt = buildWorkspaceIntelligenceState(workspace);
    const ids = rebuilt.operatingManual.map((row) => row.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'positioning',
        'audience',
        'workflows',
        'voice-rules',
        'operating-context'
      ])
    );
  });

  it('refreshWorkspaceIntelligence does not drop persisted custom rows', () => {
    const workspace = cloneSeedData();
    const withPersisted = {
      ...workspace,
      workspaceIntelligence: {
        ...workspace.workspaceIntelligence,
        operatingManual: [customSection]
      }
    };
    const refreshed = refreshWorkspaceIntelligence(withPersisted);
    const ids = refreshed.workspaceIntelligence?.operatingManual.map((row) => row.id) ?? [];
    expect(ids).toContain('custom-approval-rule');
  });
});
