import type { AiBridgeSettings, AppSettings, BrandProfile } from '../types/domain';

/** NLP HTTP bridge defaults — URLs empty until operator configures a provider. */
export const defaultAiBridgeSettings = {
  inferenceBaseUrl: '',
  embeddingBaseUrl: '',
  chatModelId: 'gpt-4o-mini',
  embeddingModelId: 'text-embedding-3-small'
} satisfies AiBridgeSettings;

/**
 * Canonical **production-empty** defaults for `BrandOpsData.brand`.
 * Storage normalization and new-install seed use these when data is missing or partial.
 */
export const defaultBrandProfile = {
  operatorName: 'Your name',
  positioning:
    'Principal-level AI engineering and generative AI architecture for teams that need enterprise LLM systems, governance, and execution they can trust.',
  primaryOffer:
    'Strategic AI architecture, GPT system design, model evaluation, and enterprise LLM deployment advisory packaged into audit, sprint, and implementation offers.',
  voiceGuide:
    'High-credibility, precise, strategic, proof-led, commercially relevant. Avoid generic marketing language, shallow AI hype, vague startup cliches, and creator-economy advice.',
  focusMetric:
    'Qualified high-trust AI strategy, architecture, or governance opportunities created per month.'
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
  operatorTraceCollectionEnabled: true,
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
    roleContext:
      'BrandOps operator — principal-level AI engineering, generative AI architecture, enterprise LLM deployment, AI governance, technical diligence, GPT system design, model evaluation, and founder-level execution.',
    promptTemplate:
      "You are BrandOps, my strategic personal brand engine. Build today's plan using my tasks, integrations, and workspace state. A labeled Workspace brand block is appended to this prompt—treat the operator, positioning, offer, voice, and focus metric there as source of truth. Prioritize positioning, proof, offer logic, content angle, commercial relevance, CTA direction, and next actions. Avoid generic marketing language and shallow AI hype. Keep sequencing practical and end with one review question.",
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
  },
  aiBridge: defaultAiBridgeSettings
} satisfies AppSettings;
