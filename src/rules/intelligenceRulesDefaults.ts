import { INTELLIGENCE_RULES_SCHEMA_VERSION, type IntelligenceRulesPack } from './intelligenceRulesTypes';

/** L1 baseline — matches pre–rule-pack heuristics in `localIntelligence.ts`. */
export const INTELLIGENCE_RULES_DEFAULTS: IntelligenceRulesPack = {
  schemaVersion: INTELLIGENCE_RULES_SCHEMA_VERSION,
  contentPriority: {
    baseScore: 20,
    readyBonus: 40,
    draftingBonus: 20,
    ideaBonus: 10,
    tagWeight: 4,
    tagCap: 16,
    discoveryGoalBonus: 14
  },
  outreachUrgency: {
    baseScore: 10,
    readyBonus: 35,
    scheduledFollowUpBonus: 30,
    repliedBonus: 5,
    staleAfterHours: 72,
    staleBonus: 20,
    callIntentBonus: 10
  },
  overdueRisk: {
    pastDue24hScore: 95,
    pastDueScore: 80,
    within24hScore: 60,
    within48hScore: 35,
    beyond48hScore: 10
  },
  opportunityHealth: {
    confidenceMultiplier: 0.45,
    valueDivisor: 2000,
    valueBonusCap: 25,
    lostPenalty: 80,
    wonAdjustment: 20
  },
  publishing: {
    urgentWithinHours: 2,
    prepWithinHours: 24,
    previewQueueSlice: 5
  },
  templateSuggestions: {
    minTokenLength: 4,
    maxResults: 3
  },
  heat: {
    bandCritical: 85,
    bandWarning: 70,
    followUp: {
      overdue: 97,
      within8h: 86,
      within24h: 72,
      within48h: 54,
      beyond: 36
    },
    publish: {
      noSchedule: 34,
      overdue: 92,
      within6h: 82,
      within24h: 70,
      within48h: 52,
      beyond: 34
    },
    outreach: {
      statusScheduledBoost: 30,
      statusReadyBoost: 22,
      statusDefaultBoost: 14,
      ageDivisorHours: 3,
      agePointsCap: 24,
      heatCap: 90
    },
    pipeline: {
      base: 24,
      followOverdueBoost: 34,
      followWithin24Boost: 20,
      followBeyondBoost: 10,
      valueDivisorUsd: 2500,
      valueBoostCap: 22,
      confidenceDivisor: 8,
      heatCap: 95
    },
    notificationManagerial: { focusHeat: 84, routineHeat: 62 },
    notificationTechnical: { focusHeat: 80, routineHeat: 58 }
  },
  digest: {
    opportunityFollowUpWithinHours: 24,
    publishingDueWithinHours: 24,
    technicalContentPriorityTop: 2,
    notesRecentSlice: 3,
    artifactThinSummaryMaxLen: 25,
    sourceThinNotesMaxLen: 10,
    sourceThinArtifactTypesMin: 1,
    datasetActionsMinSlice: 2
  }
};
