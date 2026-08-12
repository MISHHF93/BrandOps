import { describe, expect, it } from 'vitest';

import {
  buildDigitalTwinContextSummary,
  createDigitalTwinFromText,
  hydrateWorkspaceFromDigitalTwin,
  removeDigitalTwinWorkspaceArtifacts,
  twinActionPrompt,
  updateTwinFactVerificationStatus,
  updateTwinIdentityGoals
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
    expect(context).toContain('Goals: none captured yet');
    expect(context).toContain('ask before making unsupported claims');

    const prompt = twinActionPrompt('draft_outreach', twin);
    expect(prompt).toContain('ask:');
    expect(prompt).toContain('Use only verified or clearly marked unverified facts');
  });

  it('writes twin fact verification status (verified is reachable from Improve-Twin review)', () => {
    const { twin } = createDigitalTwinFromText({
      workspace: cloneSeedData(),
      rawText: resumeText,
      sourceType: 'resume'
    });
    const experienceItem = twin.resumeProfile.experience[0];
    expect(experienceItem).toBeDefined();
    expect(experienceItem.verificationStatus).toBe('unverified');

    let workspace = cloneSeedData();
    workspace = {
      ...workspace,
      digitalTwins: { activeTwinId: twin.id, twins: [twin] }
    };

    const next = updateTwinFactVerificationStatus(workspace, {
      twinId: twin.id,
      itemKind: 'experience',
      itemId: experienceItem.id,
      status: 'verified'
    });
    expect(next).not.toBe(workspace);
    expect(next.digitalTwins?.twins[0]?.resumeProfile.experience[0]?.verificationStatus).toBe(
      'verified'
    );

    const rejected = updateTwinFactVerificationStatus(next, {
      twinId: twin.id,
      itemKind: 'project',
      itemId: twin.resumeProfile.projects[0]?.id ?? 'nope',
      status: 'rejected'
    });
    expect(rejected.digitalTwins?.twins[0]?.resumeProfile.projects[0]?.verificationStatus).toBe(
      'rejected'
    );
  });

  it('returns the same workspace when the fact or twin is missing', () => {
    const { twin } = createDigitalTwinFromText({
      workspace: cloneSeedData(),
      rawText: resumeText,
      sourceType: 'resume'
    });
    let workspace = cloneSeedData();
    workspace = {
      ...workspace,
      digitalTwins: { activeTwinId: twin.id, twins: [twin] }
    };
    const unchanged = updateTwinFactVerificationStatus(workspace, {
      twinId: twin.id,
      itemKind: 'experience',
      itemId: 'missing-id',
      status: 'verified'
    });
    expect(unchanged).toBe(workspace);
  });

  it('updates twin identity goals (normalized) and records an audit entry', () => {
    const { twin } = createDigitalTwinFromText({
      workspace: cloneSeedData(),
      rawText: resumeText,
      sourceType: 'resume'
    });
    let workspace = cloneSeedData();
    workspace = {
      ...workspace,
      digitalTwins: { activeTwinId: twin.id, twins: [twin] }
    };

    const next = updateTwinIdentityGoals(workspace, twin.id, [
      '  Launch    a newsletter ',
      'Launch a newsletter',
      '',
      'Grow revenue',
      'Grow revenue'
    ]);
    expect(next).not.toBe(workspace);
    expect(next.digitalTwins?.twins[0]?.identity.goals).toEqual([
      'Launch a newsletter',
      'Grow revenue'
    ]);
    expect(next.digitalTwins?.twins[0]?.actions.auditTrail[0]?.action).toBe('twin-goals-update');
    expect(next.digitalTwins?.twins[0]?.actions.auditTrail[0]?.summary).toContain(
      'Launch a newsletter'
    );
  });

  it('clears twin goals and returns the same workspace when the twin is missing', () => {
    const { twin } = createDigitalTwinFromText({
      workspace: cloneSeedData(),
      rawText: resumeText,
      sourceType: 'resume'
    });
    let workspace = cloneSeedData();
    workspace = {
      ...workspace,
      digitalTwins: { activeTwinId: twin.id, twins: [twin] }
    };

    const cleared = updateTwinIdentityGoals(workspace, twin.id, ['   ', '']);
    expect(cleared.digitalTwins?.twins[0]?.identity.goals).toEqual([]);
    expect(cleared.digitalTwins?.twins[0]?.actions.auditTrail[0]?.summary).toBe(
      'Cleared twin goals.'
    );

    const missing = updateTwinIdentityGoals(workspace, 'no-such-twin', ['Goal']);
    expect(missing).toBe(workspace);
  });
});
