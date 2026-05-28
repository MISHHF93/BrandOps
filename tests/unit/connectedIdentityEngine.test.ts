import { describe, expect, it } from 'vitest';

import {
  buildConnectedIdentityEngineReadout,
  evolveActiveTwinFromConnectedIdentity
} from '../../src/services/connectedIdentity/connectedIdentityEngine';
import {
  createDigitalTwinFromText,
  hydrateWorkspaceFromDigitalTwin
} from '../../src/services/digitalTwin/digitalTwin';
import { cloneSeedData } from '../helpers/fixtures';

const resumeText = `
Maya Rivera
Senior AI Product Operator
Summary
AI product operator who builds workflow systems for creators and founders.
Skills
TypeScript, React, NLP, GTM, creator operations
`;

function workspaceWithTwinAndPlatformMetadata() {
  const base = cloneSeedData();
  const { twin, resumeArtifact } = createDigitalTwinFromText({
    workspace: base,
    rawText: resumeText,
    sourceType: 'resume',
    reviewOverrides: {
      displayName: 'Maya Rivera',
      headline: 'Senior AI Product Operator'
    },
    now: new Date('2026-05-28T00:00:00.000Z')
  });
  const hydrated = hydrateWorkspaceFromDigitalTwin({
    workspace: base,
    twin,
    resumeArtifact,
    now: new Date('2026-05-28T00:00:00.000Z')
  }).workspace;
  return {
    ...hydrated,
    settings: {
      ...hydrated.settings,
      connectedIdentityLearningEnabled: true
    },
    integrationHub: {
      ...hydrated.integrationHub,
      sources: [
        ...hydrated.integrationHub.sources,
        {
          id: 'source-linkedin',
          name: 'LinkedIn profile',
          kind: 'linkedin-marketing' as const,
          status: 'connected' as const,
          artifactTypes: ['profile-summary'],
          tags: ['linkedin', 'positioning'],
          notes: 'Approved profile summary only.',
          createdAt: '2026-05-28T00:00:00.000Z'
        },
        {
          id: 'source-notion',
          name: 'Notion knowledge base',
          kind: 'notion' as const,
          status: 'connected' as const,
          artifactTypes: ['approved-doc-summary'],
          tags: ['notion', 'knowledge'],
          notes: 'Approved summaries only.',
          createdAt: '2026-05-28T00:00:00.000Z'
        }
      ],
      artifacts: [
        ...hydrated.integrationHub.artifacts,
        {
          id: 'artifact-linkedin-about',
          sourceId: 'source-linkedin',
          title: 'LinkedIn About approved summary',
          artifactType: 'profile-summary',
          summary: 'Positions Maya as an AI product operator for creator workflow systems.',
          tags: ['linkedin', 'positioning'],
          createdAt: '2026-05-28T00:00:00.000Z',
          updatedAt: '2026-05-28T00:00:00.000Z'
        },
        {
          id: 'artifact-gmail-tone',
          sourceId: 'source-email',
          title: 'Gmail tone approved summary',
          artifactType: 'email-summary',
          summary: 'Concise, warm, strategic follow-up tone from approved email summaries.',
          tags: ['gmail', 'tone'],
          createdAt: '2026-05-28T00:00:00.000Z',
          updatedAt: '2026-05-28T00:00:00.000Z'
        }
      ]
    }
  };
}

describe('Connected Identity Engine', () => {
  it('does not derive platform identity signals without explicit consent', () => {
    const workspace = cloneSeedData();
    const readout = buildConnectedIdentityEngineReadout(workspace);

    expect(readout.consentGranted).toBe(false);
    expect(readout.signalCount).toBe(0);
    expect(readout.evolutionSummary).toContain('is off');
    expect(readout.sensitiveDataPolicy).toContain('must not automatically ingest raw private');
  });

  it('derives consented platform signals from metadata and approved summaries', () => {
    const readout = buildConnectedIdentityEngineReadout(workspaceWithTwinAndPlatformMetadata());

    expect(readout.consentGranted).toBe(true);
    expect(readout.signalCount).toBeGreaterThan(0);
    expect(readout.platformCoverage).toContain('linkedin');
    expect(readout.signals.some((signal) => signal.source === 'gmail')).toBe(true);
    expect(readout.signals.every((signal) => signal.sensitivity !== 'private_data_blocked')).toBe(
      true
    );
  });

  it('evolves the active twin only after consent is enabled', () => {
    const result = evolveActiveTwinFromConnectedIdentity(
      workspaceWithTwinAndPlatformMetadata(),
      new Date('2026-05-28T01:00:00.000Z')
    );

    expect(result.applied).toBe(true);
    expect(result.signalCount).toBeGreaterThan(0);
    const twin = result.workspace.digitalTwins?.twins[0];
    expect(twin?.memory.facts.some((fact) => fact.includes('linkedin'))).toBe(true);
    expect(twin?.actions.auditTrail[0]?.summary).toContain('Raw private data was not ingested');
  });
});
