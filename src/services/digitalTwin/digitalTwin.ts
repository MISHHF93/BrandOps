import type {
  BrandProfile,
  BrandOpsData,
  BrandVault,
  ContentLibraryItem,
  DigitalTwin,
  DigitalTwinSourceType,
  ExternalArtifactRecord,
  IntegrationSource,
  MessagingVaultEntry,
  TwinFactStatus,
  TwinSupportedActionType
} from '../../types/domain';
import { defaultBrandProfile } from '../../config/workspaceDefaults';
import {
  extractResumeNeuralPhaseArtifact,
  normalizeResumeNeuralInput
} from '../ai/resumeNeuralPhaseExtract';

export const SUPPORTED_TWIN_ACTIONS: TwinSupportedActionType[] = [
  'generate_professional_bio',
  'generate_linkedin_about',
  'generate_positioning',
  'draft_outreach',
  'create_30_day_content_plan',
  'generate_pitch_email',
  'create_media_kit_copy',
  'summarize_resume',
  'find_strongest_opportunities',
  'improve_profile_gaps'
];

const MAX_SOURCE_CHARS = 48_000;
const MAX_LIST_ITEMS = 18;

function id(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const fixedId = (prefix: string, twinId: string): string => `${prefix}-${twinId}`;

function uniq(items: string[], cap = MAX_LIST_ITEMS): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = item.replace(/\s+/g, ' ').trim();
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t.slice(0, 220));
    if (out.length >= cap) break;
  }
  return out;
}

function mergeUnique(existing: string[], additions: string[], cap = 36): string[] {
  return uniq([...additions, ...existing], cap);
}

function isDefaultProfileValue<K extends keyof BrandProfile>(
  workspace: BrandOpsData,
  key: K
): boolean {
  return workspace.brand[key].trim() === defaultBrandProfile[key].trim();
}

function profileValue<K extends keyof BrandProfile>(workspace: BrandOpsData, key: K): string {
  return isDefaultProfileValue(workspace, key) ? '' : workspace.brand[key].trim();
}

function linesFrom(raw: string): string[] {
  return normalizeResumeNeuralInput(raw)
    .slice(0, MAX_SOURCE_CHARS)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function firstNameCandidate(lines: string[], fallback: string): string {
  const first = lines.find((line) => {
    if (line.length < 2 || line.length > 70) return false;
    if (/[@:/\\]/.test(line)) return false;
    if (/\d{3,}/.test(line)) return false;
    return !/^(summary|profile|experience|education|skills|projects|certifications)$/i.test(line);
  });
  return first || fallback || 'Digital Twin';
}

function valuesAfterSection(lines: string[], section: RegExp, stopAfter = 10): string[] {
  const out: string[] = [];
  let collecting = false;
  for (const line of lines) {
    const isHeading = /^[A-Z][A-Za-z /&+-]{2,40}:?$/.test(line) && line.length < 48;
    if (section.test(line)) {
      collecting = true;
      continue;
    }
    if (collecting && isHeading && out.length > 0) break;
    if (collecting) {
      out.push(line.replace(/^[-•*▪▸]\s+/, ''));
      if (out.length >= stopAfter) break;
    }
  }
  return uniq(out);
}

function extractSkills(lines: string[], artifact: string): string[] {
  const fromArtifact =
    /skills:([^|]+)/i
      .exec(artifact)?.[1]
      ?.split(';')
      .map((s) => s.trim()) ?? [];
  const fromSection = valuesAfterSection(lines, /^(skills|technical skills|tools)\s*:?\s*$/i, 8)
    .flatMap((line) => line.split(/[,;|]/))
    .map((s) => s.trim());
  return uniq([...fromArtifact, ...fromSection], 24);
}

function extractBullets(lines: string[]): string[] {
  return uniq(
    lines
      .filter(
        (line) =>
          /^[-•*▪▸]\s+/.test(line) || /\b(led|built|launched|improved|created|owned)\b/i.test(line)
      )
      .map((line) => line.replace(/^[-•*▪▸]\s+/, '')),
    14
  );
}

function extractExperience(lines: string[], artifact: string) {
  const roleHints =
    /roles:([^|]+)/i
      .exec(artifact)?.[1]
      ?.split(';')
      .map((s) => s.trim()) ?? [];
  const dated = lines.filter((line) => /(19|20)\d{2}\s*[–-]\s*((19|20)\d{2}|present)/i.test(line));
  return uniq([...roleHints, ...dated], 8).map((entry) => {
    const [roleish, timeframe = ''] = entry.split(/\s+[|,]\s+(?=(19|20)\d{2})/);
    const parts = roleish.split(/\s+[|@]\s+/);
    return {
      id: id('exp'),
      role: (parts[0] || entry).trim().slice(0, 100),
      organization: (parts[1] || '').trim().slice(0, 100),
      timeframe: timeframe.trim().slice(0, 60),
      highlights: [],
      verificationStatus: 'unverified' as const
    };
  });
}

function extractLinks(lines: string[]): string[] {
  return uniq(
    lines.flatMap((line) => line.match(/https?:\/\/\S+/gi) ?? []),
    8
  );
}

function deriveFocusMetric(twinName: string, skills: string[]): string {
  const skillText = skills.slice(0, 3).join(', ');
  return skillText
    ? `High-fit opportunities created from ${twinName}'s ${skillText} proof points per month.`
    : `High-fit opportunities created from ${twinName}'s verified strengths per month.`;
}

function derivePrimaryOffer(twinName: string, skills: string[], achievements: string[]): string {
  const proof = achievements[0] ? `, backed by proof like ${achievements[0]}` : '';
  const skillText = skills.slice(0, 5).join(', ');
  return skillText
    ? `${twinName}'s verified expertise across ${skillText}${proof}.`
    : `${twinName}'s verified experience, proof points, and operating strengths.`;
}

function calculateConfidence(input: {
  rawLength: number;
  skills: string[];
  experienceCount: number;
  achievements: string[];
  summary: string;
}): number {
  let score = 22;
  if (input.rawLength > 900) score += 18;
  if (input.skills.length >= 5) score += 18;
  if (input.experienceCount > 0) score += 18;
  if (input.achievements.length >= 3) score += 12;
  if (input.summary.length > 40) score += 12;
  return Math.max(0, Math.min(96, score));
}

export function createDigitalTwinFromText(options: {
  workspace: BrandOpsData;
  rawText: string;
  sourceType: DigitalTwinSourceType;
  sourceSummary?: string;
  reviewOverrides?: {
    displayName?: string;
    headline?: string;
    summary?: string;
    professionalPositioning?: string;
  };
  now?: Date;
}): { twin: DigitalTwin; resumeArtifact: string } {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const raw = normalizeResumeNeuralInput(options.rawText).slice(0, MAX_SOURCE_CHARS);
  const lines = linesFrom(raw);
  const resumeArtifact = extractResumeNeuralPhaseArtifact(raw);
  const displayName =
    options.reviewOverrides?.displayName?.trim() ||
    firstNameCandidate(lines, options.workspace.brand.operatorName);
  const skills = extractSkills(lines, resumeArtifact);
  const achievements = extractBullets(lines);
  const experience = extractExperience(lines, resumeArtifact);
  const summary =
    options.reviewOverrides?.summary?.trim() ||
    valuesAfterSection(lines, /^(summary|profile|objective)\s*:?\s*$/i, 3).join(' ') ||
    achievements[0] ||
    options.workspace.brand.positioning;
  const existingFocusMetric = profileValue(options.workspace, 'focusMetric');
  const existingPrimaryOffer = profileValue(options.workspace, 'primaryOffer');
  const existingPositioning = profileValue(options.workspace, 'positioning');
  const existingVoiceGuide = profileValue(options.workspace, 'voiceGuide');
  const goals = uniq([existingFocusMetric, existingPrimaryOffer], 4);
  const missingInfo = [
    experience.length === 0 ? 'Work history needs review.' : '',
    skills.length < 5 ? 'Add more verified skills.' : '',
    !existingVoiceGuide ? 'Add preferred voice and tone.' : '',
    goals.length === 0 ? 'Add goals or target outcomes.' : ''
  ].filter(Boolean);
  const confidenceScore = calculateConfidence({
    rawLength: raw.length,
    skills,
    experienceCount: experience.length,
    achievements,
    summary
  });

  return {
    resumeArtifact,
    twin: {
      id: id('twin'),
      ownerUserId: 'local-owner',
      workspaceId: 'local-workspace',
      displayName,
      sourceType: options.sourceType,
      status: confidenceScore >= 70 && missingInfo.length === 0 ? 'ready' : 'needs_review',
      confidenceScore,
      createdAt: nowIso,
      updatedAt: nowIso,
      identity: {
        headline:
          options.reviewOverrides?.headline?.trim() ||
          experience[0]?.role ||
          existingPositioning ||
          'Professional operator',
        summary: summary.slice(0, 700),
        professionalPositioning:
          options.reviewOverrides?.professionalPositioning?.trim() ||
          existingPositioning ||
          summary.slice(0, 220),
        targetAudience: existingPrimaryOffer || 'Professional network and collaborators',
        goals,
        toneOfVoice: existingVoiceGuide || 'Clear, credible, proof-led, and concise.',
        strengths: skills.slice(0, 10),
        differentiators: achievements.slice(0, 6)
      },
      resumeProfile: {
        contactInfo: {
          name: displayName,
          email: lines.find((line) => /\S+@\S+\.\S+/.test(line)),
          links: extractLinks(lines)
        },
        experience,
        education: valuesAfterSection(lines, /^education\s*:?\s*$/i, 4).map((entry) => ({
          id: id('edu'),
          institution: entry,
          credential: '',
          timeframe: '',
          verificationStatus: 'unverified'
        })),
        skills,
        certifications: valuesAfterSection(lines, /^(certifications|certificates)\s*:?\s*$/i, 6),
        projects: valuesAfterSection(lines, /^projects\s*:?\s*$/i, 6).map((entry) => ({
          id: id('proj'),
          name: entry.slice(0, 90),
          summary: entry,
          tools: skills.slice(0, 5),
          verificationStatus: 'unverified'
        })),
        achievements,
        industries: uniq(
          skills.filter((skill) => /ai|ml|data|cloud|product|security|media|finance/i.test(skill)),
          8
        ),
        tools: skills.filter((skill) =>
          /react|node|python|sql|aws|gcp|azure|docker|kubernetes/i.test(skill)
        ),
        keywords: uniq([...skills, ...experience.map((e) => e.role), ...achievements], 30)
      },
      memory: {
        facts: uniq([summary, ...experience.map((e) => e.role), ...skills], 18),
        preferences: existingVoiceGuide ? [existingVoiceGuide] : [],
        voiceExamples: uniq([summary, ...achievements], 6),
        approvedClaims: uniq([summary, ...skills.slice(0, 10), ...achievements.slice(0, 6)], 20),
        rejectedClaims: [],
        missingInfo
      },
      actions: {
        supportedActionTypes: SUPPORTED_TWIN_ACTIONS,
        generatedAssets: [],
        pendingApprovals: [],
        auditTrail: [
          {
            id: id('ta'),
            at: nowIso,
            action: 'create_twin_from_profile',
            summary: options.sourceSummary || 'Created from pasted resume/profile text.'
          }
        ]
      }
    }
  };
}

function buildHydratedBrandProfile(workspace: BrandOpsData, twin: DigitalTwin): BrandProfile {
  const skills = twin.resumeProfile.skills;
  return {
    operatorName: twin.displayName || workspace.brand.operatorName,
    positioning:
      twin.identity.professionalPositioning ||
      twin.identity.headline ||
      twin.identity.summary ||
      workspace.brand.positioning,
    primaryOffer:
      twin.identity.targetAudience &&
      twin.identity.targetAudience !== 'Professional network and collaborators'
        ? twin.identity.targetAudience
        : derivePrimaryOffer(twin.displayName, skills, twin.resumeProfile.achievements),
    voiceGuide:
      twin.identity.toneOfVoice ||
      `Sound like ${twin.displayName}: clear, credible, specific, and grounded in verified resume facts.`,
    focusMetric: twin.identity.goals[0] || deriveFocusMetric(twin.displayName, skills)
  };
}

function buildHydratedBrandVault(workspace: BrandOpsData, twin: DigitalTwin): BrandVault {
  const current = workspace.brandVault;
  const proof = [
    ...twin.resumeProfile.achievements,
    ...twin.resumeProfile.experience.flatMap((item) => item.highlights),
    ...twin.resumeProfile.projects.map((project) => project.summary)
  ];
  const snippets = [
    twin.identity.summary,
    twin.identity.professionalPositioning,
    ...twin.memory.approvedClaims.slice(0, 8)
  ];
  return {
    ...current,
    positioningStatement: twin.identity.professionalPositioning || current.positioningStatement,
    headlineOptions: mergeUnique(current.headlineOptions, [twin.identity.headline], 12),
    shortBio: twin.identity.summary || current.shortBio,
    fullAboutSummary:
      [
        twin.identity.summary,
        twin.identity.professionalPositioning,
        twin.resumeProfile.achievements.slice(0, 4).join(' ')
      ]
        .filter(Boolean)
        .join('\n\n')
        .slice(0, 2400) || current.fullAboutSummary,
    serviceOfferings: mergeUnique(
      current.serviceOfferings,
      [
        derivePrimaryOffer(
          twin.displayName,
          twin.resumeProfile.skills,
          twin.resumeProfile.achievements
        )
      ],
      16
    ),
    collaborationModes: mergeUnique(current.collaborationModes, [
      'Outreach support',
      'Content planning',
      'Positioning refinement',
      'Workflow execution'
    ]),
    outreachAngles: mergeUnique(current.outreachAngles, [
      ...twin.identity.strengths.slice(0, 8).map((item) => `Lead with ${item}`),
      ...twin.identity.differentiators.slice(0, 6)
    ]),
    audienceSegments: mergeUnique(current.audienceSegments, [twin.identity.targetAudience], 16),
    expertiseAreas: mergeUnique(current.expertiseAreas, twin.resumeProfile.skills, 40),
    industries: mergeUnique(current.industries, twin.resumeProfile.industries, 24),
    proofPoints: mergeUnique(current.proofPoints, proof, 40),
    signatureThemes: mergeUnique(
      current.signatureThemes,
      [
        ...twin.resumeProfile.keywords.slice(0, 12),
        ...twin.resumeProfile.projects.map((p) => p.name)
      ],
      36
    ),
    preferredVoiceNotes: mergeUnique(
      current.preferredVoiceNotes,
      [twin.identity.toneOfVoice, ...twin.memory.voiceExamples.slice(0, 4)],
      16
    ),
    bannedPhrases: current.bannedPhrases,
    callsToAction: mergeUnique(current.callsToAction, [
      `Invite ${twin.displayName} to discuss a high-fit collaboration.`,
      `Ask ${twin.displayName} for the strongest proof point before publishing.`
    ]),
    reusableSnippets: mergeUnique(current.reusableSnippets, snippets, 30),
    personalNotes: mergeUnique(current.personalNotes, [
      `Digital twin generated from ${twin.sourceType} source on ${new Date(twin.createdAt).toLocaleDateString()}.`
    ])
  };
}

function twinMessagingVaultEntries(twin: DigitalTwin, nowIso: string): MessagingVaultEntry[] {
  const entries: MessagingVaultEntry[] = [
    {
      id: fixedId('msg-positioning', twin.id),
      category: 'positioning',
      title: `${twin.displayName} positioning`,
      content: twin.identity.professionalPositioning || twin.identity.summary,
      version: 1
    },
    {
      id: fixedId('msg-bio', twin.id),
      category: 'case-study',
      title: `${twin.displayName} resume proof`,
      content: twin.resumeProfile.achievements.slice(0, 8).join('\n') || twin.identity.summary,
      version: 1
    },
    {
      id: fixedId('msg-faq', twin.id),
      category: 'faq',
      title: `${twin.displayName} missing information`,
      content: twin.memory.missingInfo.join('\n') || 'No obvious profile gaps found.',
      version: 1
    }
  ];
  return entries.map((entry) => ({
    ...entry,
    content: entry.content || `Profile artifact captured at ${nowIso}.`
  }));
}

function twinContentItems(twin: DigitalTwin, nowIso: string): ContentLibraryItem[] {
  const items: ContentLibraryItem[] = [
    {
      id: fixedId('content-bio', twin.id),
      type: 'reusable-paragraph',
      title: `${twin.displayName} professional bio seed`,
      body: twin.identity.summary,
      tags: ['digital-twin', 'resume', 'bio'],
      audience: twin.identity.targetAudience,
      goal: 'Reuse as the seed for bios, media kits, and introductions.',
      status: 'idea',
      publishChannel: 'linkedin',
      notes: 'Generated from reviewed resume/profile data. Verify before publishing.',
      createdAt: nowIso,
      updatedAt: nowIso
    },
    {
      id: fixedId('content-themes', twin.id),
      type: 'hook-bank-entry',
      title: `${twin.displayName} content themes`,
      body: twin.resumeProfile.keywords.slice(0, 18).join('\n'),
      tags: ['digital-twin', 'content-plan'],
      audience: twin.identity.targetAudience,
      goal: 'Turn verified strengths and keywords into content angles.',
      status: 'idea',
      publishChannel: 'linkedin',
      notes: 'Structured twin artifact, not an externally synced document.',
      createdAt: nowIso,
      updatedAt: nowIso
    }
  ];
  return items.filter((item) => item.body.trim().length > 0);
}

function twinIntegrationArtifacts(
  twin: DigitalTwin,
  resumeArtifact: string,
  nowIso: string
): { source: IntegrationSource; artifacts: ExternalArtifactRecord[] } {
  const sourceId = fixedId('source-twin', twin.id);
  return {
    source: {
      id: sourceId,
      name: `${twin.displayName} resume/profile ingest`,
      kind: 'custom-api',
      status: 'connected',
      artifactTypes: ['digital-twin', 'resume-profile', 'structured-facts', 'action-context'],
      tags: ['digital-twin', 'resume', 'local-first'],
      notes:
        'Local résumé/profile ingest artifact. No public sharing, OCR, PDF parsing, or vendor sync implied.',
      createdAt: nowIso
    },
    artifacts: [
      {
        id: fixedId('artifact-summary', twin.id),
        sourceId,
        title: `${twin.displayName} twin summary`,
        artifactType: 'digital-twin-summary',
        summary: twin.identity.summary,
        tags: ['digital-twin', 'summary'],
        syncedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso
      },
      {
        id: fixedId('artifact-facts', twin.id),
        sourceId,
        title: `${twin.displayName} structured facts`,
        artifactType: 'resume-structured-facts',
        summary: [
          `Skills: ${twin.resumeProfile.skills.slice(0, 20).join(', ')}`,
          `Experience: ${twin.resumeProfile.experience.map((e) => e.role).join(', ')}`,
          `Missing: ${twin.memory.missingInfo.join(', ') || 'none'}`
        ].join('\n'),
        tags: ['digital-twin', 'facts'],
        syncedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso
      },
      {
        id: fixedId('artifact-phase-r', twin.id),
        sourceId,
        title: `${twin.displayName} Phase R hosted Ask artifact`,
        artifactType: 'resume-phase-r-artifact',
        summary: resumeArtifact,
        tags: ['digital-twin', 'hosted-ask', 'resume-artifact'],
        syncedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso
      }
    ].filter((artifact) => artifact.summary.trim().length > 0)
  };
}

function replaceById<T extends { id: string }>(existing: T[], additions: T[], cap: number): T[] {
  const removeIds = new Set(additions.map((item) => item.id));
  return [...additions, ...existing.filter((item) => !removeIds.has(item.id))].slice(0, cap);
}

export function hydrateWorkspaceFromDigitalTwin(options: {
  workspace: BrandOpsData;
  twin: DigitalTwin;
  resumeArtifact: string;
  now?: Date;
}): { workspace: BrandOpsData; capturedArtifactCount: number } {
  const nowIso = (options.now ?? new Date()).toISOString();
  const { twin, resumeArtifact } = options;
  const integrationCapture = twinIntegrationArtifacts(twin, resumeArtifact, nowIso);
  const messagingEntries = twinMessagingVaultEntries(twin, nowIso);
  const contentItems = twinContentItems(twin, nowIso);
  const hydratedTwin: DigitalTwin = {
    ...twin,
    updatedAt: nowIso,
    actions: {
      ...twin.actions,
      auditTrail: [
        {
          id: id('ta'),
          at: nowIso,
          action: 'hydrate_workspace_from_twin',
          summary:
            'Updated BrandOps profile, brand vault, messaging vault, content library, and local artifact registry from reviewed twin data.'
        },
        ...twin.actions.auditTrail
      ].slice(0, 120)
    }
  };

  return {
    capturedArtifactCount:
      messagingEntries.length + contentItems.length + integrationCapture.artifacts.length + 2,
    workspace: {
      ...options.workspace,
      brand: buildHydratedBrandProfile(options.workspace, hydratedTwin),
      brandVault: buildHydratedBrandVault(options.workspace, hydratedTwin),
      contentLibrary: replaceById(options.workspace.contentLibrary, contentItems, 500),
      messagingVault: replaceById(options.workspace.messagingVault, messagingEntries, 200),
      integrationHub: {
        ...options.workspace.integrationHub,
        sources: replaceById(
          options.workspace.integrationHub.sources,
          [integrationCapture.source],
          100
        ),
        artifacts: replaceById(
          options.workspace.integrationHub.artifacts,
          integrationCapture.artifacts,
          400
        ),
        liveFeed: [
          {
            id: fixedId('feed-twin', hydratedTwin.id),
            source: integrationCapture.source.name,
            title: 'Digital twin workspace artifacts captured',
            detail:
              'Profile, vault, messaging, content, and structured résumé artifacts were generated locally from reviewed twin data.',
            level: 'success' as const,
            happenedAt: nowIso
          },
          ...options.workspace.integrationHub.liveFeed.filter(
            (item) => item.id !== fixedId('feed-twin', hydratedTwin.id)
          )
        ].slice(0, 100)
      },
      digitalTwins: {
        activeTwinId: hydratedTwin.id,
        twins: replaceById(options.workspace.digitalTwins?.twins ?? [], [hydratedTwin], 12)
      }
    }
  };
}

function removeKnownValues(existing: string[], values: string[]): string[] {
  const remove = new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
  return existing.filter((item) => !remove.has(item.trim().toLowerCase()));
}

export function removeDigitalTwinWorkspaceArtifacts(
  workspace: BrandOpsData,
  twin: DigitalTwin
): BrandOpsData {
  const relatedIds = new Set([
    fixedId('msg-positioning', twin.id),
    fixedId('msg-bio', twin.id),
    fixedId('msg-faq', twin.id),
    fixedId('content-bio', twin.id),
    fixedId('content-themes', twin.id),
    fixedId('source-twin', twin.id),
    fixedId('artifact-summary', twin.id),
    fixedId('artifact-facts', twin.id),
    fixedId('artifact-phase-r', twin.id),
    fixedId('feed-twin', twin.id)
  ]);
  const remainingTwins = (workspace.digitalTwins?.twins ?? []).filter(
    (item) => item.id !== twin.id
  );
  const proofValues = [
    twin.identity.headline,
    twin.identity.summary,
    twin.identity.professionalPositioning,
    twin.identity.targetAudience,
    ...twin.identity.strengths,
    ...twin.identity.differentiators,
    ...twin.resumeProfile.skills,
    ...twin.resumeProfile.achievements,
    ...twin.resumeProfile.industries,
    ...twin.resumeProfile.keywords,
    ...twin.resumeProfile.projects.map((project) => project.name),
    ...twin.resumeProfile.projects.map((project) => project.summary),
    ...twin.memory.approvedClaims,
    ...twin.memory.voiceExamples
  ];

  return {
    ...workspace,
    brand:
      workspace.brand.operatorName.trim() === twin.displayName.trim()
        ? defaultBrandProfile
        : workspace.brand,
    brandVault: {
      ...workspace.brandVault,
      positioningStatement:
        workspace.brandVault.positioningStatement.trim() ===
        twin.identity.professionalPositioning.trim()
          ? ''
          : workspace.brandVault.positioningStatement,
      shortBio:
        workspace.brandVault.shortBio.trim() === twin.identity.summary.trim()
          ? ''
          : workspace.brandVault.shortBio,
      fullAboutSummary: workspace.brandVault.fullAboutSummary.includes(twin.identity.summary)
        ? ''
        : workspace.brandVault.fullAboutSummary,
      headlineOptions: removeKnownValues(workspace.brandVault.headlineOptions, proofValues),
      serviceOfferings: removeKnownValues(workspace.brandVault.serviceOfferings, proofValues),
      collaborationModes: workspace.brandVault.collaborationModes,
      outreachAngles: removeKnownValues(workspace.brandVault.outreachAngles, proofValues),
      audienceSegments: removeKnownValues(workspace.brandVault.audienceSegments, proofValues),
      expertiseAreas: removeKnownValues(workspace.brandVault.expertiseAreas, proofValues),
      industries: removeKnownValues(workspace.brandVault.industries, proofValues),
      proofPoints: removeKnownValues(workspace.brandVault.proofPoints, proofValues),
      signatureThemes: removeKnownValues(workspace.brandVault.signatureThemes, proofValues),
      preferredVoiceNotes: removeKnownValues(workspace.brandVault.preferredVoiceNotes, proofValues),
      bannedPhrases: workspace.brandVault.bannedPhrases,
      callsToAction: workspace.brandVault.callsToAction.filter(
        (item) => !item.includes(twin.displayName)
      ),
      reusableSnippets: removeKnownValues(workspace.brandVault.reusableSnippets, proofValues),
      personalNotes: workspace.brandVault.personalNotes.filter(
        (item) => !item.toLowerCase().includes('digital twin generated')
      )
    },
    contentLibrary: workspace.contentLibrary.filter((item) => !relatedIds.has(item.id)),
    messagingVault: workspace.messagingVault.filter((item) => !relatedIds.has(item.id)),
    integrationHub: {
      ...workspace.integrationHub,
      sources: workspace.integrationHub.sources.filter((item) => !relatedIds.has(item.id)),
      artifacts: workspace.integrationHub.artifacts.filter((item) => !relatedIds.has(item.id)),
      liveFeed: workspace.integrationHub.liveFeed.filter((item) => !relatedIds.has(item.id))
    },
    digitalTwins: {
      activeTwinId: remainingTwins[0]?.id ?? null,
      twins: remainingTwins
    }
  };
}

export function getActiveDigitalTwin(workspace: BrandOpsData): DigitalTwin | null {
  const state = workspace.digitalTwins;
  if (!state?.twins.length) return null;
  return state.twins.find((t) => t.id === state.activeTwinId) ?? state.twins[0] ?? null;
}

export type TwinFactItemKind = 'experience' | 'education' | 'project';

export type TwinFactVerificationUpdate = {
  twinId: string;
  itemKind: TwinFactItemKind;
  itemId: string;
  status: Exclude<TwinFactStatus, 'unverified'>;
};

/**
 * Marks a single extracted twin fact (experience/education/project row) as
 * verified or rejected from the Improve-Twin review. Pure and immutable —
 * returns a new workspace when the twin + item exist, otherwise the same
 * reference. Gives `TwinFactStatus === 'verified'` its first real writer
 * (previously reachable only in the static type and storage normalization).
 */
export function updateTwinFactVerificationStatus(
  workspace: BrandOpsData,
  update: TwinFactVerificationUpdate
): BrandOpsData {
  const state = workspace.digitalTwins;
  if (!state?.twins.length) return workspace;
  const index = state.twins.findIndex((t) => t.id === update.twinId);
  if (index === -1) return workspace;
  const twin = state.twins[index];
  const profile = twin.resumeProfile;
  if (!profile) return workspace;

  const list = (() => {
    switch (update.itemKind) {
      case 'experience':
        return profile.experience;
      case 'education':
        return profile.education;
      case 'project':
        return profile.projects;
    }
  })();
  if (!list || !list.some((item) => item.id === update.itemId)) return workspace;

  const nextProfile = { ...profile };
  if (update.itemKind === 'experience') {
    nextProfile.experience = profile.experience.map((item) =>
      item.id === update.itemId ? { ...item, verificationStatus: update.status } : item
    );
  } else if (update.itemKind === 'education') {
    nextProfile.education = profile.education.map((item) =>
      item.id === update.itemId ? { ...item, verificationStatus: update.status } : item
    );
  } else {
    nextProfile.projects = profile.projects.map((item) =>
      item.id === update.itemId ? { ...item, verificationStatus: update.status } : item
    );
  }

  const nextTwins = state.twins.slice();
  nextTwins[index] = { ...twin, resumeProfile: nextProfile, updatedAt: new Date().toISOString() };
  return {
    ...workspace,
    digitalTwins: { ...state, twins: nextTwins }
  };
}

/**
 * Replace the active twin's `identity.goals` with the given list (normalized:
 * trimmed, deduped, capped). Returns `workspace` unchanged when the twin is
 * missing, so callers can detect a no-op by identity comparison.
 */
export function updateTwinIdentityGoals(
  workspace: BrandOpsData,
  twinId: string,
  goals: string[]
): BrandOpsData {
  const state = workspace.digitalTwins;
  if (!state?.twins.length) return workspace;
  const index = state.twins.findIndex((twin) => twin.id === twinId);
  if (index === -1) return workspace;
  const twin = state.twins[index];
  const nextGoals = uniq(goals.map((goal) => goal.replace(/\s+/g, ' ').trim()).filter(Boolean), 12);
  const nowIso = new Date().toISOString();
  const nextTwins = state.twins.slice();
  nextTwins[index] = {
    ...twin,
    updatedAt: nowIso,
    identity: { ...twin.identity, goals: nextGoals },
    actions: {
      ...twin.actions,
      auditTrail: [
        {
          id: `twin-goals-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          at: nowIso,
          action: 'twin-goals-update',
          summary:
            nextGoals.length === 0
              ? 'Cleared twin goals.'
              : `Updated twin goals: ${nextGoals.join('; ')}`
        },
        ...twin.actions.auditTrail
      ].slice(0, 80)
    }
  };
  return {
    ...workspace,
    digitalTwins: { ...state, twins: nextTwins }
  };
}

export function buildDigitalTwinContextSummary(twin: DigitalTwin | null): string {
  if (!twin) return '';
  const verifiedFacts = [
    twin.identity.headline,
    ...twin.resumeProfile.skills.slice(0, 8),
    ...twin.memory.approvedClaims.slice(0, 6)
  ].filter(Boolean);
  return [
    `Active twin: ${twin.displayName}`,
    `Status: ${twin.status}; confidence ${twin.confidenceScore}%`,
    `Positioning: ${twin.identity.professionalPositioning || twin.identity.summary}`,
    `Voice: ${twin.identity.toneOfVoice}`,
    twin.identity.goals.length
      ? `Goals: ${uniq(twin.identity.goals, 12).join('; ')}`
      : 'Goals: none captured yet',
    verifiedFacts.length ? `Known facts: ${uniq(verifiedFacts, 14).join('; ')}` : '',
    twin.memory.missingInfo.length
      ? `Missing info: ${twin.memory.missingInfo.join('; ')}. Ask the user before inventing facts; ask before making unsupported claims.`
      : 'Use only approved/profile facts; ask before making unsupported claims.'
  ]
    .filter(Boolean)
    .join('\n');
}

export function twinActionPrompt(actionType: TwinSupportedActionType, twin: DigitalTwin): string {
  const labels: Record<TwinSupportedActionType, string> = {
    generate_professional_bio: 'Generate a concise professional bio',
    generate_linkedin_about: 'Generate a LinkedIn About section',
    generate_positioning: 'Create creator/brand positioning',
    draft_outreach: 'Draft an outreach message',
    create_30_day_content_plan: 'Create a 30-day content plan',
    generate_pitch_email: 'Generate a pitch email',
    create_media_kit_copy: 'Create media kit copy',
    summarize_resume: 'Summarize this resume',
    find_strongest_opportunities: 'Find the strongest opportunities',
    improve_profile_gaps: 'Suggest profile gaps to improve'
  };
  return `ask: In active twin context for ${twin.displayName}, ${labels[actionType]}. Use only verified or clearly marked unverified facts from the twin. If a required fact is missing, ask a follow-up instead of inventing it.`;
}
