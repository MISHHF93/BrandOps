import { BrandOpsData } from '../../types/domain';
import { workspaceModules } from '../../shared/config/modules';

const now = new Date();
const isoNow = now.toISOString();

/**
 * Canonical **production-empty** workspace: no demo contacts, pipeline dollars, or sample content.
 * New installs, storage recovery, and “Reset workspace” use this dataset.
 * For a filled demo, see `demoSeed.ts` → `demoSampleData`.
 */
export const seedData: BrandOpsData = {
  brand: {
    operatorName: 'Your name',
    positioning: 'Add a one-line positioning statement in Settings or Brand Vault.',
    primaryOffer: 'Describe your primary offer.',
    voiceGuide: 'Note tone and vocabulary to keep messaging consistent.',
    focusMetric: 'Pick one metric that signals progress this quarter.'
  },
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
  settings: {
    timezone: 'America/New_York',
    defaultReminderLeadHours: 24,
    weekStartsOn: 'monday',
    theme: 'dark',
    visualMode: 'classic',
    motionMode: 'balanced',
    ambientFxEnabled: false,
    cockpitLayout: 'sections',
    cockpitDensity: 'compact',
    localModelEnabled: false,
    aiAdapterMode: 'disabled',
    debugMode: false,
    primaryIdentityProvider: null,
    overlay: {
      enabled: true,
      compactMode: true,
      showContactInsights: true
    },
    automationRules: [
      {
        id: 'rule-001',
        name: 'Highlight overdue follow-ups',
        trigger: 'follow-up-overdue',
        action: 'badge-highlight',
        enabled: true
      },
      {
        id: 'rule-002',
        name: 'Pin weekly review card',
        trigger: 'weekly-review',
        action: 'dashboard-pin',
        enabled: true
      }
    ],
    syncHub: {
      google: {
        clientId: '',
        connectionStatus: 'disconnected',
        auth: { scope: [] }
      },
      github: {
        clientId: '',
        connectionStatus: 'disconnected',
        auth: { scope: [] }
      },
      linkedin: {
        clientId: '',
        connectionStatus: 'disconnected',
        auth: { scope: [] }
      }
    },
    notificationCenter: {
      enabled: true,
      managerialWeight: 40,
      workdayStartHour: 9,
      workdayEndHour: 18,
      maxDailyTasks: 3,
      aiGuidanceMode: 'hybrid',
      preferredModel: '',
      roleContext: 'Operator — define your role in Settings → Notification Center.',
      promptTemplate:
        "You are my AI operating partner. Build today's plan using my tasks, integrations, and workspace state. Keep sequencing practical and end with one review question.",
      datasetReviewEnabled: true,
      integrationReviewEnabled: true
    },
    cadenceFlow: {
      mode: 'balanced',
      deepWorkBlockCount: 2,
      deepWorkBlockHours: 2,
      includeStartupBlock: true,
      includeShutdownBlock: true,
      includeArtifactReviewBlock: true,
      remindBeforeMinutes: 15,
      calendarSyncEnabled: true,
      artifactSyncEnabled: true
    }
  },
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
  seed: {
    seededAt: isoNow,
    source: 'production-empty',
    version: '2.0.0',
    onboardingVersion: '2'
  }
};
