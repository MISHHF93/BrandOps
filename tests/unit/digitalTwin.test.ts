import { describe, expect, it } from 'vitest';

import {
  buildDigitalTwinContextSummary,
  createDigitalTwinFromText,
  hydrateWorkspaceFromDigitalTwin,
  removeDigitalTwinWorkspaceArtifacts,
  twinActionPrompt
} from '../../src/services/digitalTwin/digitalTwin';
import { cloneSeedData } from '../helpers/fixtures';

const resumeText = `
Maya Rivera
Senior AI Product Operator | 2020 – Present
Summary
AI product operator who builds workflow systems for creators, founders, and revenue teams.
Skills
TypeScript, React, Python, NLP, leadership, product
Projects
Launched an AI workflow cockpit for creator operations.
- Built NLP pipelines with Python and React
- Led GTM positioning and creator outreach
`;

describe('digitalTwin service', () => {
  it('creates a local digital twin from reviewed resume/profile text', () => {
    const workspace = cloneSeedData();
    const { twin, resumeArtifact } = createDigitalTwinFromText({
      workspace,
      rawText: resumeText,
      sourceType: 'resume',
      sourceSummary: 'unit test resume',
      reviewOverrides: {
        displayName: 'Maya Rivera',
        headline: 'Senior AI Product Operator'
      },
      now: new Date('2026-05-28T00:00:00.000Z')
    });

    expect(twin.displayName).toBe('Maya Rivera');
    expect(twin.identity.headline).toBe('Senior AI Product Operator');
    expect(twin.resumeProfile.skills).toContain('typescript');
    expect(twin.actions.supportedActionTypes).toContain('generate_professional_bio');
    expect(twin.memory.missingInfo).toEqual(expect.any(Array));
    expect(resumeArtifact).toContain('skills:');
  });

  it('hydrates the BrandOps workspace profile, vault, and artifacts from a twin', () => {
    const workspace = cloneSeedData();
    const { twin, resumeArtifact } = createDigitalTwinFromText({
      workspace,
      rawText: resumeText,
      sourceType: 'resume',
      reviewOverrides: {
        displayName: 'Maya Rivera',
        headline: 'Senior AI Product Operator',
        professionalPositioning: 'AI product operator for creator workflow systems'
      },
      now: new Date('2026-05-28T00:00:00.000Z')
    });

    const hydrated = hydrateWorkspaceFromDigitalTwin({
      workspace,
      twin,
      resumeArtifact,
      now: new Date('2026-05-28T00:00:00.000Z')
    }).workspace;

    expect(hydrated.brand.operatorName).toBe('Maya Rivera');
    expect(hydrated.brand.positioning).toContain('AI product operator');
    expect(hydrated.brandVault.expertiseAreas.length).toBeGreaterThan(0);
    expect(hydrated.messagingVault.some((entry) => entry.id.includes(twin.id))).toBe(true);
    expect(hydrated.contentLibrary.some((entry) => entry.id.includes(twin.id))).toBe(true);
    expect(hydrated.integrationHub.artifacts.some((entry) => entry.id.includes(twin.id))).toBe(
      true
    );

    const pruned = removeDigitalTwinWorkspaceArtifacts(hydrated, twin);
    expect(pruned.digitalTwins?.twins).toHaveLength(0);
    expect(pruned.messagingVault.some((entry) => entry.id.includes(twin.id))).toBe(false);
    expect(pruned.integrationHub.artifacts.some((entry) => entry.id.includes(twin.id))).toBe(false);
  });

  it('builds no-hallucination chat context and guided action prompts', () => {
    const { twin } = createDigitalTwinFromText({
      workspace: cloneSeedData(),
      rawText: resumeText,
      sourceType: 'manual'
    });

    const context = buildDigitalTwinContextSummary(twin);
    expect(context).toContain('Active twin:');
    expect(context).toContain('ask before making unsupported claims');

    const prompt = twinActionPrompt('draft_outreach', twin);
    expect(prompt).toContain('ask:');
    expect(prompt).toContain('Use only verified or clearly marked unverified facts');
  });
});
