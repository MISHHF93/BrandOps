import { describe, expect, it } from 'vitest';

import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import {
  buildHumanTrustLayer,
  HUMAN_TRUST_CONTROL_TYPES
} from '../../src/services/plan/humanTrustLayer';
import { cloneSeedData } from '../helpers/fixtures';

function workspaceWithTrustInputs() {
  const workspace = cloneSeedData();
  workspace.integrationHub.sources = [
    {
      id: 'source-google',
      name: 'Google Workspace',
      kind: 'google-workspace',
      status: 'connected',
      artifactTypes: ['calendar-event', 'email-thread-summary'],
      tags: ['gmail', 'calendar'],
      notes: 'Approved Gmail and Calendar summaries only.',
      createdAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  workspace.integrationHub.artifacts = [
    {
      id: 'artifact-email',
      sourceId: 'source-google',
      title: 'Gmail founder thread summary',
      artifactType: 'email-thread-summary',
      summary: 'Founder asked for a concise follow-up proposal.',
      tags: ['gmail'],
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  return workspace;
}

describe('Human Trust Layer', () => {
  it('wraps every cross-platform action with required trust controls', () => {
    const readout = buildHumanTrustLayer(workspaceWithTrustInputs());

    expect(readout.totalActions).toBeGreaterThan(0);
    expect(readout.controlTypes).toEqual(HUMAN_TRUST_CONTROL_TYPES);
    expect(readout.policy).toContain('requires visible human control');
    expect(
      readout.actions.every((action) =>
        HUMAN_TRUST_CONTROL_TYPES.every((type) =>
          action.controls.some((control) => control.type === type)
        )
      )
    ).toBe(true);
    expect(
      readout.actions.every((action) =>
        action.controls.every((control) => control.command || control.href)
      )
    ).toBe(true);
  });

  it('exposes the Human Trust Layer on the mobile workspace snapshot', () => {
    const snapshot = buildWorkspaceSnapshot(workspaceWithTrustInputs());

    expect(snapshot.humanTrustLayer.totalActions).toBeGreaterThan(0);
    expect(snapshot.humanTrustLayer.actions[0]?.controls.map((control) => control.type)).toEqual(
      HUMAN_TRUST_CONTROL_TYPES
    );
  });
});
