import { BrandOpsData } from '../../types/domain';
import { defaultAppSettings, defaultBrandProfile } from '../../config/workspaceDefaults';
import { workspaceModules } from '../../shared/config/modules';

const now = new Date();
const isoNow = now.toISOString();

/**
 * Canonical **production-empty** workspace: no demo contacts, pipeline dollars, or sample content.
 * New installs, storage recovery, and “Reset workspace” use this dataset.
 * For a filled demo, see `demoSeed.ts` → `demoSampleData`.
 */
export const seedData: BrandOpsData = {
  brand: defaultBrandProfile,
  brandVault: {
    positioningStatement: '',
    headlineOptions: [],
    shortBio: '',
    fullAboutSummary: '',
    serviceOfferings: [],
    collaborationModes: [],
    outreachAngles: [],
    audienceSegments: [],
    expertiseAreas: [],
    industries: [],
    proofPoints: [],
    signatureThemes: [],
    preferredVoiceNotes: [],
    bannedPhrases: [],
    callsToAction: [],
    reusableSnippets: [],
    personalNotes: []
  },
  modules: workspaceModules,
  publishingQueue: [],
  contentLibrary: [],
  contacts: [],
  companies: [],
  notes: [],
  outreachDrafts: [],
  outreachTemplates: [],
  outreachHistory: [],
  followUps: [],
  opportunities: [],
  messagingVault: [],
  scheduler: {
    tasks: [],
    updatedAt: isoNow,
    lastHydratedAt: isoNow
  },
  settings: defaultAppSettings,
  externalSync: {
    links: [],
    updatedAt: isoNow
  },
  integrationHub: {
    liveFeed: [],
    sshTargets: [],
    sources: [],
    artifacts: []
  },
  agentAudit: {
    entries: []
  },
  operatorTraces: {
    entries: []
  },
  embeddingIndex: {
    entries: []
  },
  seed: {
    seededAt: isoNow,
    source: 'production-empty',
    version: '2.0.0',
    onboardingVersion: '2'
  }
};
