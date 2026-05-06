import { describe, expect, it } from 'vitest';

import {
  buildArtifactGraphEdges,
  buildNativeStructuredArtifactPackage,
  STRUCTURED_ARTIFACT_SCHEMA_VERSION
} from '../../scripts/lib/nativeStructuredArtifacts.mjs';
import { extractResumeArtifactRecord } from '../../scripts/lib/nativeResumeArtifacts.mjs';

describe('nativeStructuredArtifacts', () => {
  it('extractResumeArtifactRecord returns arrays never null', () => {
    expect(extractResumeArtifactRecord('')).toMatchObject({
      sections: [],
      skills: [],
      roles: [],
      bullets: [],
      fusedText: '',
      normalizedCharCount: 0
    });
    const rec = extractResumeArtifactRecord('Skills:\n- Python');
    expect(Array.isArray(rec.skills)).toBe(true);
    expect(Array.isArray(rec.bullets)).toBe(true);
    expect(rec.fusedText.length).toBeGreaterThan(0);
  });

  it('structured package mirrors BrandOps domains with empty-safe arrays', () => {
    const pkg = buildNativeStructuredArtifactPackage({});
    expect(pkg.schemaVersion).toBe(STRUCTURED_ARTIFACT_SCHEMA_VERSION);
    expect(pkg.canonicalTypeRef).toContain('BrandOpsData');
    expect(pkg.graphEdges).toEqual([]);
    expect(Array.isArray(pkg.fusion.segmentTokens)).toBe(true);
    expect(Array.isArray(pkg.structured.opportunities)).toBe(true);
    expect(Array.isArray(pkg.structured.embeddingIndex)).toBe(true);
    expect(pkg.structured.settings.notificationCenter).toBeDefined();
    expect(pkg.structured.integrationHub.sources).toEqual([]);
    expect(pkg.structured.scheduler.tasks).toEqual([]);
  });

  it('graphEdges link opportunities to contacts and drafts', () => {
    const structured = {
      opportunities: [
        {
          id: 'o1',
          contactId: 'c1',
          relatedOutreachDraftIds: ['d1']
        }
      ],
      followUps: [{ id: 'f1', contactId: 'c2' }],
      publishingQueue: [{ id: 'p1', contentLibraryItemId: 'lib1' }],
      activityNotes: [{ id: 'n1', entityType: 'contact', entityId: 'c9' }]
    };
    const edges = buildArtifactGraphEdges(structured);
    expect(edges.some((e) => e.relation === 'opportunity_contact')).toBe(true);
    expect(edges.some((e) => e.relation === 'opportunity_outreachDraft')).toBe(true);
    expect(edges.some((e) => e.relation === 'followUp_contact')).toBe(true);
    expect(edges.some((e) => e.relation === 'publishing_contentLibrary')).toBe(true);
    expect(edges.some((e) => e.relation === 'note_entity')).toBe(true);
  });

  it('embeds brand and vault slices into fusion + structured output', () => {
    const pkg = buildNativeStructuredArtifactPackage({
      brand: {
        operatorName: 'Test',
        positioning: 'P',
        primaryOffer: 'O',
        voiceGuide: 'V',
        focusMetric: 'F'
      },
      brandVault: {
        positioningStatement: 'We help founders scale',
        headlineOptions: ['H1'],
        shortBio: '',
        fullAboutSummary: '',
        serviceOfferings: [],
        collaborationModes: [],
        outreachAngles: [],
        audienceSegments: [],
        expertiseAreas: ['ops'],
        industries: [],
        proofPoints: [],
        signatureThemes: [],
        preferredVoiceNotes: [],
        bannedPhrases: [],
        callsToAction: [],
        reusableSnippets: [],
        personalNotes: []
      }
    } as Record<string, unknown>);
    expect(pkg.structured.brand.operatorName).toBe('Test');
    expect(pkg.fusion.profileBlobEmployeeContext).toContain('operator:Test');
    expect(pkg.structured.brandVault.expertiseAreas).toContain('ops');
  });
});
