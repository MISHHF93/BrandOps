import type { BrandOpsData } from '../../types/domain';

/** Every `AppSettings` + related field we can show read-only on mobile Settings (traceback / audit). */
export interface MobileSettingsFullReadout {
  timezone: string;
  weekStartsOn: string;
  defaultReminderLeadHours: number;
  theme: string;
  cockpitLayout: string;
  cockpitDensity: string;
  localModelEnabled: boolean;
  aiAdapterMode: string;
  primaryIdentityProvider: string;
  notificationsEnabled: boolean;
  aiGuidanceMode: string;
  preferredModel: string;
  roleContextPreview: string;
  promptTemplatePreview: string;
  datasetReviewEnabled: boolean;
  integrationReviewEnabled: boolean;
  deepWorkBlockCount: number;
  deepWorkBlockHours: number;
  includeStartupBlock: boolean;
  includeShutdownBlock: boolean;
  includeArtifactReviewBlock: boolean;
  calendarSyncEnabled: boolean;
  artifactSyncEnabled: boolean;
  overlayEnabled: boolean;
  overlayCompact: boolean;
  overlayContactInsights: boolean;
  automationRuleCount: number;
  automationRulesSummary: string;
  brandVoiceGuidePreview: string;
  operatorTraceCollectionEnabled: boolean;
  /** Masked OpenAI-compatible inference root (no secrets). */
  aiInferenceEndpointPreview: string;
  /** Masked embeddings root when set, else same as inference preview when embedding URL empty. */
  aiEmbeddingEndpointPreview: string;
  aiBridgeChatModelId: string;
  aiBridgeEmbeddingModelId: string;
}

/** Safe preview for Settings readout — strips path/query noise beyond host + shortened path. */
export function maskAiBridgeEndpointPreview(raw: string): string {
  const t = raw.trim();
  if (!t.length) return '—';
  try {
    const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withScheme);
    const path = u.pathname.replace(/\/+$/, '') || '';
    const shortPath = path.length > 48 ? `${path.slice(0, 48)}…` : path;
    return `${u.protocol}//${u.host}${shortPath}`;
  } catch {
    return '(unparsable URL)';
  }
}

const clip = (s: string, max: number) => {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
};

/**
 * Maps live `BrandOpsData` into a display object so the Settings tab can show the full workspace
 * model alongside the smaller set of fields the `configure:` command can change today.
 */
export function buildMobileSettingsFullReadout(workspace: BrandOpsData): MobileSettingsFullReadout {
  const s = workspace.settings;
  const nc = s.notificationCenter;
  const cf = s.cadenceFlow;
  const ov = s.overlay;
  const rules = s.automationRules ?? [];
  const primary = s.primaryIdentityProvider;
  const bridge = s.aiBridge;
  const embedRaw = bridge.embeddingBaseUrl.trim();
  const inferPreview = maskAiBridgeEndpointPreview(bridge.inferenceBaseUrl);
  const embedPreview = embedRaw.length ? maskAiBridgeEndpointPreview(embedRaw) : inferPreview;

  return {
    timezone: s.timezone,
    weekStartsOn: s.weekStartsOn,
    defaultReminderLeadHours: s.defaultReminderLeadHours,
    theme: s.theme,
    cockpitLayout: s.cockpitLayout,
    cockpitDensity: s.cockpitDensity,
    localModelEnabled: s.localModelEnabled,
    aiAdapterMode: s.aiAdapterMode,
    primaryIdentityProvider: primary ?? '(none)',
    notificationsEnabled: nc.enabled,
    aiGuidanceMode: nc.aiGuidanceMode,
    preferredModel: nc.preferredModel || '—',
    roleContextPreview: clip(nc.roleContext, 120),
    promptTemplatePreview: clip(nc.promptTemplate, 120),
    datasetReviewEnabled: nc.datasetReviewEnabled,
    integrationReviewEnabled: nc.integrationReviewEnabled,
    deepWorkBlockCount: cf.deepWorkBlockCount,
    deepWorkBlockHours: cf.deepWorkBlockHours,
    includeStartupBlock: cf.includeStartupBlock,
    includeShutdownBlock: cf.includeShutdownBlock,
    includeArtifactReviewBlock: cf.includeArtifactReviewBlock,
    calendarSyncEnabled: cf.calendarSyncEnabled,
    artifactSyncEnabled: cf.artifactSyncEnabled,
    overlayEnabled: ov.enabled,
    overlayCompact: ov.compactMode,
    overlayContactInsights: ov.showContactInsights,
    automationRuleCount: rules.length,
    automationRulesSummary:
      rules.length === 0
        ? '—'
        : rules.map((r) => (r.enabled ? r.name : `${r.name} (off)`)).join(', '),
    brandVoiceGuidePreview: clip(workspace.brand.voiceGuide, 100),
    operatorTraceCollectionEnabled: s.operatorTraceCollectionEnabled,
    aiInferenceEndpointPreview: inferPreview,
    aiEmbeddingEndpointPreview: embedPreview,
    aiBridgeChatModelId: bridge.chatModelId || '—',
    aiBridgeEmbeddingModelId: bridge.embeddingModelId || '—'
  };
}
