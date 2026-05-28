import { describe, expect, it } from 'vitest';

import { buildOperationalPlanFromContentIdeation } from '../../src/pages/mobile/contentIdeationPlanConversion';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import {
  createDigitalTwinFromText,
  hydrateWorkspaceFromDigitalTwin
} from '../../src/services/digitalTwin/digitalTwin';
import { buildPredictiveContentIdeationReadout } from '../../src/services/plan/predictiveContentIdeationEngine';
import { cloneSeedData } from '../helpers/fixtures';

const resumeText = `
Maya Rivera
AI Product Operator
Summary
Builds AI workflow systems, creator operations, and GTM operating loops for founders.
Skills
AI strategy, creator operations, lifecycle marketing, workflow automation
`;

function workspaceWithContentSignals() {
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

  hydrated.brand.positioning = 'AI product operator for founder workflow systems';
  hydrated.brand.primaryOffer = 'Creator operating systems for founder-led teams';
  hydrated.brandVault.signatureThemes = ['AI operator workflows', 'Founder content systems'];
  hydrated.brandVault.audienceSegments = ['Founder-led teams building repeatable GTM systems'];
  hydrated.brandVault.proofPoints = ['Built lifecycle and GTM workflows for founder-led teams'];
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
  hydrated.integrationHub.artifacts = [
    {
      id: 'artifact-engagement',
      sourceId: 'source-linkedin',
      title: 'LinkedIn engagement summary',
      artifactType: 'engagement-summary',
      summary: 'Founder workflow posts received strong comments, saves, and reply engagement.',
      tags: ['engagement', 'comments', 'saves'],
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  return hydrated;
}

describe('Predictive Content Ideation Engine', () => {
  it('generates themes, posts, campaigns, threads, series, hooks, and trend opportunities', () => {
    const readout = buildPredictiveContentIdeationReadout(workspaceWithContentSignals());

    expect(readout.themes.length).toBeGreaterThan(0);
    expect(readout.postIdeas.length).toBeGreaterThan(0);
    expect(readout.campaignIdeas.length).toBeGreaterThan(0);
    expect(readout.threadStructures.length).toBeGreaterThan(0);
    expect(readout.creatorSeries.length).toBeGreaterThan(0);
    expect(readout.audienceHooks.length).toBeGreaterThan(0);
    expect(readout.trendOpportunities.length).toBeGreaterThan(0);
    expect(readout.allIdeas.every((idea) => idea.evidenceUsed.length > 0)).toBe(true);
    expect(readout.allIdeas.every((idea) => idea.askToPlanCommand.includes('Do not publish'))).toBe(true);
    expect(readout.sourceCoverage['engagement-data']).toBeGreaterThan(0);
    expect(readout.approvalPolicy).toContain('review and approve');
  });

  it('converts content ideation directly into PLAN cards', () => {
    const [idea] = buildPredictiveContentIdeationReadout(workspaceWithContentSignals()).allIdeas;
    const plan = buildOperationalPlanFromContentIdeation(idea);

    expect(plan.kind).toBe('content-calendar');
    expect(plan.sourceLabel).toBe('Converted from content ideation');
    expect(plan.previewCommand).toContain(idea.title);
    expect(plan.promise).toContain('Predictive Content Ideation');
    expect(plan.exportPayload.type).toBe('predictive-content-ideation-plan');
  });

  it('exposes Predictive Content Ideation on the mobile workspace snapshot', () => {
    const snapshot = buildWorkspaceSnapshot(workspaceWithContentSignals());

    expect(snapshot.predictiveContentIdeationEngine.allIdeas.length).toBeGreaterThan(0);
    expect(snapshot.predictiveContentIdeationEngine.averageConfidence).toBeGreaterThan(0);
  });
});

