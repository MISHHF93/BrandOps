import { describe, expect, it } from 'vitest';

import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { createDigitalTwinFromText, hydrateWorkspaceFromDigitalTwin } from '../../src/services/digitalTwin/digitalTwin';
import { buildBuyerPersonaIntelligenceReadout } from '../../src/services/plan/buyerPersonaIntelligence';
import { cloneSeedData } from '../helpers/fixtures';

const resumeText = `
Maya Rivera
AI Product Operator
Summary
Builds AI workflow systems, creator operations, and GTM operating loops for founders.
Skills
AI strategy, GTM systems, creator operations, lifecycle marketing, workflow automation
`;

function workspaceWithBuyerSignals() {
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
  hydrated.brandVault.audienceSegments = [
    'B2B SaaS founders moving from experimentation to execution',
    'Creator business owners building repeatable revenue systems'
  ];
  hydrated.brandVault.outreachAngles = [
    'Turn scattered growth work into a repeatable operating system'
  ];
  hydrated.integrationHub.sources = [
    {
      id: 'source-linkedin',
      name: 'LinkedIn profile',
      kind: 'linkedin-marketing',
      status: 'connected',
      artifactTypes: ['profile-summary'],
      tags: ['linkedin', 'positioning'],
      notes: 'Approved profile summary.',
      createdAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  hydrated.integrationHub.artifacts = [
    {
      id: 'artifact-linkedin',
      sourceId: 'source-linkedin',
      title: 'LinkedIn audience summary',
      artifactType: 'profile-summary',
      summary: 'Audience is founders, product leaders, and creator operators.',
      tags: ['linkedin', 'audience'],
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
  hydrated.outreachDrafts = [
    {
      id: 'draft-founder',
      category: 'founder intro',
      targetName: 'Ari Founder',
      company: 'Orbit Labs',
      role: 'Founder',
      messageBody: 'Draft message.',
      outreachGoal: 'Book a founder workflow audit call.',
      tone: 'warm strategic',
      status: 'ready',
      notes: 'Needs approval before sending.',
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z'
    }
  ];
  return hydrated;
}

describe('Buyer Persona Intelligence', () => {
  it('generates ICP, personas, segments, messaging, outreach angles, and resonance suggestions', () => {
    const readout = buildBuyerPersonaIntelligenceReadout(workspaceWithBuyerSignals());

    expect(readout.idealCustomerProfile.title.length).toBeGreaterThan(0);
    expect(readout.buyerPersonas.length).toBeGreaterThanOrEqual(3);
    expect(readout.audienceSegments.length).toBeGreaterThan(0);
    expect(readout.communicationRecommendations.length).toBeGreaterThan(0);
    expect(readout.outreachAngles.length).toBeGreaterThan(0);
    expect(readout.contentResonanceSuggestions.length).toBeGreaterThan(0);
    expect(readout.supportingSignals.length).toBeGreaterThan(0);
    expect(readout.sourceCoverage['uploaded-profile']).toBeGreaterThan(0);
    expect(readout.sourceCoverage['connected-platforms']).toBeGreaterThan(0);
    expect(readout.sourceCoverage['generated-content']).toBeGreaterThan(0);
    expect(readout.sourceCoverage['outreach-patterns']).toBeGreaterThan(0);
    expect(readout.sourceCoverage.profession).toBeGreaterThan(0);
  });

  it('provides edit, approve, regenerate, and compare-version controls without autonomous execution', () => {
    const readout = buildBuyerPersonaIntelligenceReadout(workspaceWithBuyerSignals());

    expect(readout.versions.length).toBeGreaterThanOrEqual(2);
    expect(readout.editCommand).toContain('edit');
    expect(readout.approveCommand).toContain('approval');
    expect(readout.regenerateCommand).toContain('regenerate');
    expect(readout.compareVersionsCommand).toContain('compare');
    expect(readout.compareVersionsCommand).toContain('Do not save, send, sync, or mutate');
    expect(readout.approvalPolicy).toContain('edit, approve, regenerate, or compare versions');
  });

  it('exposes Buyer Persona Intelligence on the mobile workspace snapshot', () => {
    const snapshot = buildWorkspaceSnapshot(workspaceWithBuyerSignals());

    expect(snapshot.buyerPersonaIntelligence.buyerPersonas.length).toBeGreaterThan(0);
    expect(snapshot.buyerPersonaIntelligence.averageConfidence).toBeGreaterThan(0);
  });
});

