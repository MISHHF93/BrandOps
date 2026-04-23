import type { AppSettings, BrandProfile } from '../types/domain';

/**
 * Canonical **production-empty** defaults for `BrandOpsData.brand`.
 * Storage normalization and new-install seed use these when data is missing or partial.
 */
export const defaultBrandProfile = {
  operatorName: 'Your name',
  positioning: 'Add a one-line positioning statement in Settings or Brand Vault.',
  primaryOffer: 'Describe your primary offer.',
  voiceGuide: 'Note tone and vocabulary to keep messaging consistent.',
  focusMetric: 'Pick one metric that signals progress this quarter.'
} satisfies BrandProfile;

/**
 * Canonical **production-empty** defaults for `BrandOpsData.settings`.
 * Storage normalization and new-install seed use these when data is missing or partial.
 */
export const defaultAppSettings = {
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
      "You are my AI operating partner. Build today's plan using my tasks, integrations, and workspace state. A labeled Workspace brand block (from Settings → Preferences) is appended to this prompt—treat the operator, positioning, offer, voice, and focus metric there as source of truth. Keep sequencing practical and end with one review question.",
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
} satisfies AppSettings;
