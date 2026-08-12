import { describe, expect, it } from 'vitest';

import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import {
  createDigitalTwinFromText,
  hydrateWorkspaceFromDigitalTwin
} from '../../src/services/digitalTwin/digitalTwin';
import { buildPositioningIntelligenceReadout } from '../../src/services/plan/positioningIntelligence';
import { cloneSeedData } from '../helpers/fixtures';

const resumeText = `
Maya Rivera
AI Product Operator
Summary
Builds AI workflow systems, creator operations, and GTM operating loops for founders.
Skills
AI strategy, GTM systems, creator operations, lifecycle marketing, workflow automation
`;

function workspaceWithPositioningSignals() {
  const base = cloneSeedData();
  const { twin, resumeArtifact } = createDigitalTwinFromText({
    workspace: base,
    rawText: resumeText,
    sourceType: 'resume',
    reviewOverrides: {
      displayName: 'Maya Rivera',
      headline: 'AI Product Operator'
    },
    now: new Date('2026-05-28T00:00:00.000Z')
  });
  const hydrated = hydrateWorkspaceFromDigitalTwin({
    workspace: base,
    twin,
    resumeArtifact,
    now: new Date('2026-05-28T00:00:00.000Z')
  }).workspace;

  hydrated.settings.connectedIdentityLearningEnabled = true;
  hydrated.brand.positioning = 'AI product operator for founder workflow systems';
  hydrated.brand.primaryOffer = 'Workflow systems and GTM operating loops for founders';
  hydrated.brand.focusMetric = 'High-fit founder conversations per month';
  hydrated.brandVault.industries = ['B2B SaaS', 'Creator economy'];
  hydrated.brandVault.audienceSegments = [
    'B2B SaaS founders moving from experimentation to execution'
  ];
  hydrated.brandVault.proofPoints = ['Built lifecycle and GTM workflows for founder-led teams'];
  hydrated.integrationHub.artifacts = [
    {
      id: 'artifact-competitor',
      sourceId: 'source-market',
      title: 'Competitor category notes',
      artifactType: 'market-summary',
      summary:
        'Competitor alternatives focus on generic CRM automation instead of operator-led workflows.',
      tags: ['competitor', 'category'],
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  hydrated.contentLibrary = [
    {
      id: 'content-founder-workflows',
      type: 'post-draft',
      title: 'Founder workflow bottlenecks',
      body: 'Draft body.',
      tags: ['founder-workflows', 'creator-ops'],
      audience: 'B2B founders',
      goal: 'Lead generation',
      status: 'ready',
      publishChannel: 'linkedin',
      notes: 'Resonates with founder operators.',
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  return hydrated;
}

describe('Positioning Intelligence', () => {
  it('generates positioning statements, value propositions, niches, and differentiation', () => {
    const readout = buildPositioningIntelligenceReadout(workspaceWithPositioningSignals());

    expect(readout.positioningStatements).toHaveLength(3);
    expect(readout.valuePropositions.length).toBeGreaterThan(0);
    expect(readout.nicheOpportunities.length).toBeGreaterThan(0);
    expect(readout.differentiationAngles.length).toBeGreaterThan(0);
    expect(readout.creatorPositioning.length).toBeGreaterThan(0);
    expect(readout.founderPositioning.length).toBeGreaterThan(0);
    expect(readout.professionalPositioning.length).toBeGreaterThan(0);
    expect(readout.averageConfidence).toBeGreaterThan(0);
    expect(readout.competitorSignals.length).toBeGreaterThan(0);
  });

  it('displays confidence, evidence used, strengths, and gaps', () => {
    const readout = buildPositioningIntelligenceReadout(workspaceWithPositioningSignals());

    expect(readout.positioningStatements.every((statement) => statement.confidence > 0)).toBe(true);
    expect(
      readout.positioningStatements.every((statement) => statement.evidenceUsed.length > 0)
    ).toBe(true);
    expect(readout.evidenceUsed.background.length).toBeGreaterThan(0);
    expect(readout.evidenceUsed.skills.length).toBeGreaterThan(0);
    expect(readout.evidenceUsed.industry.length).toBeGreaterThan(0);
    expect(readout.evidenceUsed.audience.length).toBeGreaterThan(0);
    expect(readout.evidenceUsed.content.length).toBeGreaterThan(0);
    expect(readout.evidenceUsed.goals.length).toBeGreaterThan(0);
    expect(readout.strengths.length).toBeGreaterThan(0);
    expect(readout.gaps.length).toBeGreaterThanOrEqual(0);
    expect(readout.reviewCommand).toContain('Do not save, publish, sync, send, or mutate');
    expect(readout.approvalPolicy).toContain('review and approve');
  });

  it('exposes Positioning Intelligence on the mobile workspace snapshot', () => {
    const snapshot = buildWorkspaceSnapshot(workspaceWithPositioningSignals());

    expect(snapshot.positioningIntelligence.positioningStatements.length).toBe(3);
    expect(snapshot.positioningIntelligence.averageConfidence).toBeGreaterThan(0);
  });
});
