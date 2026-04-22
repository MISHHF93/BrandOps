/** Monotonic pack version; bump when shape changes incompatibly. */
export const INTELLIGENCE_RULES_SCHEMA_VERSION = 1 as const;

/** Execution heat (0–100) thresholds used by intelligence scoring. */
export interface HeatRulesPack {
  bandCritical: number;
  bandWarning: number;
  followUp: {
    overdue: number;
    within8h: number;
    within24h: number;
    within48h: number;
    beyond: number;
  };
  publish: {
    noSchedule: number;
    overdue: number;
    within6h: number;
    within24h: number;
    within48h: number;
    beyond: number;
  };
  outreach: {
    statusScheduledBoost: number;
    statusReadyBoost: number;
    statusDefaultBoost: number;
    ageDivisorHours: number;
    agePointsCap: number;
    heatCap: number;
  };
  pipeline: {
    base: number;
    followOverdueBoost: number;
    followWithin24Boost: number;
    followBeyondBoost: number;
    valueDivisorUsd: number;
    valueBoostCap: number;
    confidenceDivisor: number;
    heatCap: number;
  };
  notificationManagerial: { focusHeat: number; routineHeat: number };
  notificationTechnical: { focusHeat: number; routineHeat: number };
}

/** Daily digest thresholds — see `dailyNotificationCenter.ts`. */
export interface DigestRulesPack {
  opportunityFollowUpWithinHours: number;
  publishingDueWithinHours: number;
  technicalContentPriorityTop: number;
  notesRecentSlice: number;
  artifactThinSummaryMaxLen: number;
  sourceThinNotesMaxLen: number;
  sourceThinArtifactTypesMin: number;
  datasetActionsMinSlice: number;
}

export interface IntelligenceRulesPack {
  schemaVersion: typeof INTELLIGENCE_RULES_SCHEMA_VERSION;
  contentPriority: {
    baseScore: number;
    readyBonus: number;
    draftingBonus: number;
    ideaBonus: number;
    tagWeight: number;
    tagCap: number;
    discoveryGoalBonus: number;
  };
  outreachUrgency: {
    baseScore: number;
    readyBonus: number;
    scheduledFollowUpBonus: number;
    repliedBonus: number;
    staleAfterHours: number;
    staleBonus: number;
    callIntentBonus: number;
  };
  overdueRisk: {
    pastDue24hScore: number;
    pastDueScore: number;
    within24hScore: number;
    within48hScore: number;
    beyond48hScore: number;
  };
  opportunityHealth: {
    confidenceMultiplier: number;
    valueDivisor: number;
    valueBonusCap: number;
    lostPenalty: number;
    wonAdjustment: number;
  };
  publishing: {
    urgentWithinHours: number;
    prepWithinHours: number;
    previewQueueSlice: number;
  };
  templateSuggestions: {
    minTokenLength: number;
    maxResults: number;
  };
  heat: HeatRulesPack;
  digest: DigestRulesPack;
}
