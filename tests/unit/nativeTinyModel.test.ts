import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  appendResumeArtifactToProfileBlob,
  buildNativeArtifactRunTrace,
  extractNativeEmployeeContextFromWorkspaceExport,
  extractNativeProfileFromWorkspaceExport
} from '../../scripts/lib/nativeProfileContext.mjs';
import { asNonNullStr, coerceArtifactBlob } from '../../scripts/lib/nativeArtifactUtils.mjs';
import {
  extractResumeArtifacts,
  normalizeResumeText
} from '../../scripts/lib/nativeResumeArtifacts.mjs';
import { extractWorkContextSegments } from '../../scripts/lib/nativeWorkContext.mjs';
import {
  forward,
  hashEmbed,
  hashEmbedWithProfile,
  hashEmbedWithSegmentAttention,
  INPUT_DIM,
  LABELS
} from '../../scripts/lib/nativeTinyMlp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const weightsPath = path.join(__dirname, '../../scripts/data/native-mlp-weights.json');

describe('nativeTinyMlp (in-repo toy model)', () => {
  it('artifact helpers coerce away null and non-string blobs', () => {
    expect(asNonNullStr(null)).toBe('');
    expect(asNonNullStr(undefined)).toBe('');
    expect(coerceArtifactBlob(null)).toBe('');
    expect(coerceArtifactBlob(undefined)).toBe('');
    expect(coerceArtifactBlob(123 as unknown as string)).toBe('');
  });

  it('forward treats null context blob like empty string', () => {
    const bundle = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
    const a = forward(bundle.weights, 'hello world', '');
    const b = forward(bundle.weights, 'hello world', null as unknown as string);
    expect(a.label).toBe(b.label);
    expect(JSON.stringify(a.logits)).toBe(JSON.stringify(b.logits));
  });

  it('artifactCoverage trace summarizes work segments without null fields', () => {
    const trace = buildNativeArtifactRunTrace(
      {
        brandVault: { positioningStatement: 'We ship clarity', expertiseAreas: ['AI ops'] },
        integrationHub: {
          sources: [
            {
              id: '1',
              name: 'Notion',
              kind: 'notion',
              status: 'connected',
              artifactTypes: [],
              tags: [],
              notes: '',
              createdAt: ''
            }
          ],
          artifacts: [],
          liveFeed: [],
          sshTargets: []
        },
        embeddingIndex: {
          entries: [
            {
              modelId: 'embed-model',
              contentLibraryItemId: '',
              dims: 8,
              vector: [],
              textFingerprint: '',
              updatedAt: '',
              id: ''
            }
          ]
        }
      },
      '',
      'operator:Z'
    );
    expect(trace.resumeArtifactChars).toBe(0);
    expect(trace.totalPipeSegmentsInBlob).toBeGreaterThanOrEqual(1);
    expect(trace.workMemory.segmentCount).toBeGreaterThan(0);
    expect(trace.workMemory.byPrefix.vaultstmt).toBeGreaterThanOrEqual(1);
  });

  it('extractWorkContextSegments includes vault sync audit embeddings', () => {
    const segs = extractWorkContextSegments({
      brandVault: { positioningStatement: 'Position X' },
      externalSync: {
        links: [
          {
            id: 'l1',
            provider: 'google-calendar',
            resourceType: 'calendar-event',
            sourceType: 'opportunity',
            sourceId: 's',
            targetId: 't',
            remoteId: 'r',
            lastSyncedAt: ''
          }
        ],
        updatedAt: ''
      },
      agentAudit: {
        entries: [
          {
            id: 'a1',
            at: '',
            source: 'cli',
            action: 'dry-run',
            ok: true,
            summary: 'ok',
            commandPreview: ''
          }
        ]
      },
      embeddingIndex: {
        entries: [
          {
            id: 'e1',
            contentLibraryItemId: 'c1',
            modelId: 'm1',
            dims: 4,
            vector: [0, 1, 0, 1],
            textFingerprint: 'fp',
            updatedAt: ''
          }
        ]
      }
    });
    expect(segs.some((s) => s.startsWith('vaultstmt:'))).toBe(true);
    expect(segs.some((s) => s.startsWith('sync:'))).toBe(true);
    expect(segs.some((s) => s.startsWith('audit:'))).toBe(true);
    expect(segs.some((s) => s.startsWith('embeddings:'))).toBe(true);
  });

  it('hashEmbed is deterministic and normalized', () => {
    const a = hashEmbed('pipeline health');
    const b = hashEmbed('pipeline health');
    expect(a.length).toBe(INPUT_DIM);
    expect(a).toEqual(b);
    const norm = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeGreaterThan(0.99);
    expect(norm).toBeLessThan(1.01);
  });

  it('legacy profile fusion changes embedding when blob provided', () => {
    const p = 'operator:Tester | role:AI engineer';
    const plain = hashEmbed('pipeline health');
    const fused = hashEmbedWithProfile('pipeline health', p);
    expect(fused.length).toBe(INPUT_DIM);
    let diff = 0;
    for (let i = 0; i < INPUT_DIM; i++) diff += Math.abs(fused[i] - plain[i]);
    expect(diff).toBeGreaterThan(0.01);
  });

  it('segment attention changes embedding vs plain hash when multiple context slots exist', () => {
    const blob = 'operator:Tester | pipeline:Acme renewal · negotiation | publish:May memo';
    const plain = hashEmbed('rank opportunities');
    const fused = hashEmbedWithSegmentAttention('rank opportunities', blob);
    expect(fused.length).toBe(INPUT_DIM);
    let diff = 0;
    for (let i = 0; i < INPUT_DIM; i++) diff += Math.abs(fused[i] - plain[i]);
    expect(diff).toBeGreaterThan(0.01);
  });

  it('segment attention with empty profile matches utterance-only embedding', () => {
    const q = 'pipeline health';
    expect(hashEmbedWithSegmentAttention(q, '')).toEqual(hashEmbed(q));
  });

  it('LABELS align with weight bundle', () => {
    const bundle = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
    expect(bundle.type).toBe('brandops.native_mlp.v2');
    expect(bundle.labels).toEqual(LABELS);
    expect(bundle.weights.meta.labels).toEqual(LABELS);
  });

  it('committed weights classify synthetic intents', () => {
    const bundle = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
    expect(forward(bundle.weights, 'pipeline health').label).toBe('pipeline');
    expect(forward(bundle.weights, 'configure cadence balanced').label).toBe('settings');
    expect(forward(bundle.weights, 'draft post linkedin').label).toBe('content');
    expect(forward(bundle.weights, 'hello world').label).toBe('other');
    expect(forward(bundle.weights, "you draft the outreach I'll approve before send").label).toBe(
      'collaboration'
    );
  });

  it('normalizeResumeText trims and normalizes newlines', () => {
    expect(normalizeResumeText('  a\r\nb  ')).toBe('a\nb');
  });

  it('extractResumeArtifacts captures sections skills bullets from plain resume text', () => {
    const resume = `
Skills:
- TypeScript and React
Experience
Senior Engineer | 2020 – Present
Built Python NLP pipelines for production.
`;
    const art = extractResumeArtifacts(resume);
    expect(art).toContain('skills');
    expect(art.toLowerCase()).toContain('typescript');
    expect(art.toLowerCase()).toContain('python');
  });

  it('appendResumeArtifactToProfileBlob appends resume chunk', () => {
    expect(appendResumeArtifactToProfileBlob('operator:Test', 'skills:rust')).toContain(
      'operator:Test'
    );
    expect(appendResumeArtifactToProfileBlob('operator:Test', 'skills:rust')).toContain(
      'resume:skills:rust'
    );
    expect(appendResumeArtifactToProfileBlob('', 'sections:a')).toBe('resume:sections:a');
  });

  it('workspace export extracts native profile blob', () => {
    const blob = extractNativeProfileFromWorkspaceExport({
      brand: {
        operatorName: 'Jordan Kai',
        positioning: 'AI infra',
        primaryOffer: 'Assistants',
        voiceGuide: 'Crisp',
        focusMetric: 'Latency'
      },
      settings: {
        notificationCenter: {
          roleContext: 'Staff AI engineer',
          promptTemplate: 'Be precise.',
          resumeNeuralPhaseContext: ''
        }
      }
    });
    expect(blob).toContain('operator:Jordan Kai');
    expect(blob).toContain('role:Staff AI engineer');
  });

  it('workspace export merges resumeNeuralPhaseContext when no explicit resumeArtifact arg', () => {
    const blob = extractNativeProfileFromWorkspaceExport({
      brand: { operatorName: 'Riley', positioning: 'ML' },
      settings: {
        notificationCenter: {
          resumeNeuralPhaseContext: 'sections:a | skills:python'
        }
      }
    });
    expect(blob).toContain('operator:Riley');
    expect(blob).toContain('resume:sections:a');
    expect(blob.toLowerCase()).toContain('python');
  });

  it('explicit resumeArtifact overrides resumeNeuralPhaseContext', () => {
    const blob = extractNativeProfileFromWorkspaceExport(
      {
        brand: { operatorName: 'Riley', positioning: 'ML' },
        settings: {
          notificationCenter: {
            resumeNeuralPhaseContext: 'sections:stored-only'
          }
        }
      },
      'sections:from-arg'
    );
    expect(blob).toContain('resume:sections:from-arg');
    expect(blob).not.toContain('stored-only');
  });

  it('extractWorkContextSegments captures pipeline, publishing, follow-ups, traces', () => {
    const segs = extractWorkContextSegments({
      opportunities: [
        {
          name: 'Renewal',
          company: 'Acme',
          status: 'negotiation',
          opportunityType: 'consulting',
          nextAction: 'Send deck'
        }
      ],
      publishingQueue: [{ title: 'May launch post' }],
      contentLibrary: [{ title: 'Playbook idea', status: 'idea' }],
      followUps: [{ reason: 'Call back', dueAt: '2026-05-10', completed: false }],
      operatorTraces: { entries: [{ verb: 'navigate', surface: 'pipeline', entityType: 'view' }] }
    });
    expect(segs.some((s) => s.startsWith('pipeline:'))).toBe(true);
    expect(segs.some((s) => s.startsWith('publish:'))).toBe(true);
    expect(segs.some((s) => s.startsWith('followup:'))).toBe(true);
    expect(segs.some((s) => s.startsWith('trace:'))).toBe(true);
  });

  it('employee workspace context merges profile blob and work segments', () => {
    const blob = extractNativeEmployeeContextFromWorkspaceExport(
      {
        brand: { operatorName: 'Sam', positioning: 'GTM' },
        opportunities: [
          { name: 'Deal X', company: 'Co', status: 'building', opportunityType: 'advisory' }
        ]
      },
      ''
    );
    expect(blob).toContain('operator:Sam');
    expect(blob).toContain('pipeline:');
  });

  it('workspace export merges resume artifact into profile blob', () => {
    const blob = extractNativeProfileFromWorkspaceExport(
      { brand: { operatorName: 'Taylor', positioning: 'Ops' } },
      'sections:skills | skills:typescript'
    );
    expect(blob).toContain('operator:Taylor');
    expect(blob).toContain('resume:sections:skills');
    expect(blob).toContain('typescript');
  });

  it('profile-conditioned inference shifts fusion path without crashing', () => {
    const bundle = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
    const profile =
      'operator:Demo | role:AI engineer — NLP & inference tooling | focus:Reliable assistants';
    const a = forward(bundle.weights, 'draft post linkedin');
    const b = forward(bundle.weights, 'draft post linkedin', profile);
    expect(a.label).toBe('content');
    expect(b.label).toBe('content');
    expect(JSON.stringify(a.logits)).not.toBe(JSON.stringify(b.logits));
  });
});
