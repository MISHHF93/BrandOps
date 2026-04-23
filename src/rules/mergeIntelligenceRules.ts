import { INTELLIGENCE_RULES_DEFAULTS } from './intelligenceRulesDefaults';
import {
  INTELLIGENCE_RULES_SCHEMA_VERSION,
  type DigestRulesPack,
  type HeatRulesPack,
  type IntelligenceRulesPack
} from './intelligenceRulesTypes';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const isNum = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function mergeSection<T extends Record<string, number>>(
  defaults: T,
  patch: unknown,
  bounds: Record<keyof T, { min: number; max: number }>
): T {
  const out = { ...defaults };
  if (!patch || typeof patch !== 'object') return out;
  const p = patch as Record<string, unknown>;
  (Object.keys(defaults) as (keyof T)[]).forEach((key) => {
    const v = p[key as string];
    if (!isNum(v)) return;
    const { min, max } = bounds[key];
    out[key] = clamp(v, min, max) as T[keyof T];
  });
  return out;
}

/**
 * Deep-merge a partial remote payload over defaults with per-field clamps.
 * Unknown `schemaVersion` majors are ignored (defaults only).
 */
export function mergeIntelligenceRules(remote: unknown): IntelligenceRulesPack {
  const base = structuredClone(INTELLIGENCE_RULES_DEFAULTS);
  if (!remote || typeof remote !== 'object') return base;

  const raw = remote as Record<string, unknown>;
  const schema = raw.schemaVersion;
  if (isNum(schema) && Math.floor(schema) !== INTELLIGENCE_RULES_SCHEMA_VERSION) {
    return base;
  }

  base.contentPriority = mergeSection(base.contentPriority, raw.contentPriority, {
    baseScore: { min: 0, max: 100 },
    readyBonus: { min: 0, max: 80 },
    draftingBonus: { min: 0, max: 80 },
    ideaBonus: { min: 0, max: 80 },
    tagWeight: { min: 0, max: 20 },
    tagCap: { min: 0, max: 40 },
    discoveryGoalBonus: { min: 0, max: 40 }
  });

  base.outreachUrgency = mergeSection(base.outreachUrgency, raw.outreachUrgency, {
    baseScore: { min: 0, max: 80 },
    readyBonus: { min: 0, max: 80 },
    scheduledFollowUpBonus: { min: 0, max: 80 },
    repliedBonus: { min: 0, max: 40 },
    staleAfterHours: { min: 1, max: 720 },
    staleBonus: { min: 0, max: 60 },
    callIntentBonus: { min: 0, max: 40 }
  });

  base.overdueRisk = mergeSection(base.overdueRisk, raw.overdueRisk, {
    pastDue24hScore: { min: 0, max: 100 },
    pastDueScore: { min: 0, max: 100 },
    within24hScore: { min: 0, max: 100 },
    within48hScore: { min: 0, max: 100 },
    beyond48hScore: { min: 0, max: 100 }
  });

  base.opportunityHealth = mergeSection(base.opportunityHealth, raw.opportunityHealth, {
    confidenceMultiplier: { min: 0, max: 2 },
    valueDivisor: { min: 100, max: 100_000 },
    valueBonusCap: { min: 0, max: 80 },
    lostPenalty: { min: 0, max: 100 },
    wonAdjustment: { min: 0, max: 100 }
  });

  base.publishing = mergeSection(base.publishing, raw.publishing, {
    urgentWithinHours: { min: 0.25, max: 168 },
    prepWithinHours: { min: 1, max: 336 },
    previewQueueSlice: { min: 1, max: 20 }
  });

  base.templateSuggestions = mergeSection(base.templateSuggestions, raw.templateSuggestions, {
    minTokenLength: { min: 2, max: 20 },
    maxResults: { min: 1, max: 10 }
  });

  const heatPatch =
    raw.heat && typeof raw.heat === 'object' ? (raw.heat as Record<string, unknown>) : undefined;
  base.heat = mergeHeatRules(base.heat, heatPatch);

  const digestPatch =
    raw.digest && typeof raw.digest === 'object'
      ? (raw.digest as Record<string, unknown>)
      : undefined;
  base.digest = mergeDigestRules(base.digest, digestPatch);

  if (base.heat.bandWarning >= base.heat.bandCritical) {
    base.heat.bandWarning = Math.max(40, base.heat.bandCritical - 5);
  }

  return base;
}

function mergeHeatRules(
  defaults: HeatRulesPack,
  patch: Record<string, unknown> | undefined
): HeatRulesPack {
  if (!patch) return defaults;
  const top = mergeSection(
    { bandCritical: defaults.bandCritical, bandWarning: defaults.bandWarning },
    { bandCritical: patch.bandCritical, bandWarning: patch.bandWarning },
    {
      bandCritical: { min: 50, max: 99 },
      bandWarning: { min: 35, max: 95 }
    }
  );
  return {
    bandCritical: top.bandCritical,
    bandWarning: top.bandWarning,
    followUp: mergeSection(defaults.followUp, patch.followUp, {
      overdue: { min: 50, max: 100 },
      within8h: { min: 50, max: 100 },
      within24h: { min: 35, max: 100 },
      within48h: { min: 25, max: 100 },
      beyond: { min: 15, max: 100 }
    }),
    publish: mergeSection(defaults.publish, patch.publish, {
      noSchedule: { min: 15, max: 80 },
      overdue: { min: 50, max: 100 },
      within6h: { min: 50, max: 100 },
      within24h: { min: 40, max: 100 },
      within48h: { min: 25, max: 100 },
      beyond: { min: 15, max: 80 }
    }),
    outreach: mergeSection(defaults.outreach, patch.outreach, {
      statusScheduledBoost: { min: 0, max: 60 },
      statusReadyBoost: { min: 0, max: 60 },
      statusDefaultBoost: { min: 0, max: 50 },
      ageDivisorHours: { min: 1, max: 48 },
      agePointsCap: { min: 0, max: 40 },
      heatCap: { min: 50, max: 100 }
    }),
    pipeline: mergeSection(defaults.pipeline, patch.pipeline, {
      base: { min: 10, max: 60 },
      followOverdueBoost: { min: 0, max: 60 },
      followWithin24Boost: { min: 0, max: 50 },
      followBeyondBoost: { min: 0, max: 40 },
      valueDivisorUsd: { min: 500, max: 50_000 },
      valueBoostCap: { min: 0, max: 40 },
      confidenceDivisor: { min: 2, max: 20 },
      heatCap: { min: 60, max: 100 }
    }),
    notificationManagerial: mergeSection(
      defaults.notificationManagerial,
      patch.notificationManagerial,
      {
        focusHeat: { min: 50, max: 100 },
        routineHeat: { min: 40, max: 90 }
      }
    ),
    notificationTechnical: mergeSection(
      defaults.notificationTechnical,
      patch.notificationTechnical,
      {
        focusHeat: { min: 50, max: 100 },
        routineHeat: { min: 40, max: 90 }
      }
    )
  };
}

function mergeDigestRules(
  defaults: DigestRulesPack,
  patch: Record<string, unknown> | undefined
): DigestRulesPack {
  if (!patch) return defaults;
  const merged = mergeSection(defaults as unknown as Record<string, number>, patch, {
    opportunityFollowUpWithinHours: { min: 1, max: 168 },
    publishingDueWithinHours: { min: 1, max: 168 },
    technicalContentPriorityTop: { min: 1, max: 10 },
    notesRecentSlice: { min: 1, max: 20 },
    artifactThinSummaryMaxLen: { min: 5, max: 200 },
    sourceThinNotesMaxLen: { min: 1, max: 80 },
    sourceThinArtifactTypesMin: { min: 0, max: 10 },
    datasetActionsMinSlice: { min: 1, max: 20 }
  });
  return merged as unknown as DigestRulesPack;
}
