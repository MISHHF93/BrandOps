/**
 * Execution heat (0–100) ranks cockpit queue items. Higher = act sooner.
 * Formulas live alongside factor labels so the UI can explain scores transparently.
 * Coefficients resolve from `getIntelligenceRules().heat` (defaults + optional remote pack).
 */

import { getIntelligenceRules } from '../../rules/intelligenceRulesRuntime';
import type { DashboardSectionId } from '../../shared/config/dashboardNavigation';

export type ExecutionHeatKind =
  | 'followup'
  | 'publish'
  | 'outreach'
  | 'pipeline'
  | 'managerial'
  | 'technical';

export interface HeatFactor {
  /** Short label shown in breakdown */
  label: string;
  /** Points attributed to this factor (display; bucket scores show full heat on one row). */
  points: number;
  /** One-line human explanation */
  note: string;
}

export interface ExecutionHeatItem {
  id: string;
  title: string;
  detail: string;
  sectionId: DashboardSectionId;
  heat: number;
  /** Legacy single reason string (e.g. “due window”) */
  reason: string;
  kind: ExecutionHeatKind;
  heatFactors: HeatFactor[];
}

export function getHeatBandCritical(): number {
  return getIntelligenceRules().heat.bandCritical;
}

export function getHeatBandWarning(): number {
  return getIntelligenceRules().heat.bandWarning;
}

export function getHeatScoreGuide(): string {
  const { bandCritical, bandWarning } = getIntelligenceRules().heat;
  return `Heat is a 0–100 priority score. It blends time pressure, deal impact, publishing windows, outreach age, and notification severity. Higher = address sooner. Bands: ≥${bandCritical} critical · ${bandWarning}–${bandCritical - 1} warning · <${bandWarning} watch.`;
}

export function followUpHeatAndFactors(taskDueAt: string, now: number): { heat: number; factors: HeatFactor[] } {
  const b = getIntelligenceRules().heat.followUp;
  const dueH = (new Date(taskDueAt).getTime() - now) / (1000 * 60 * 60);
  const heat = dueH <= 0 ? b.overdue : dueH <= 8 ? b.within8h : dueH <= 24 ? b.within24h : dueH <= 48 ? b.within48h : b.beyond;
  const tier =
    dueH <= 0
      ? 'Overdue — highest urgency'
      : dueH <= 8
        ? 'Due within 8 hours'
        : dueH <= 24
          ? 'Due within 24 hours'
          : dueH <= 48
            ? 'Due within 48 hours'
            : 'Due beyond 48 hours';
  return {
    heat,
    factors: [
      {
        label: 'Follow-up due window',
        points: heat,
        note: `${tier} (${dueH <= 0 ? 'late' : `${dueH.toFixed(1)}h`} to due)`
      }
    ]
  };
}

export function publishHeatAndFactors(
  scheduledFor: string | undefined,
  reminderAt: string | undefined,
  now: number
): { heat: number; factors: HeatFactor[] } {
  const b = getIntelligenceRules().heat.publish;
  const target = scheduledFor ?? reminderAt;
  const dueH = target
    ? (new Date(target).getTime() - now) / (1000 * 60 * 60)
    : Number.POSITIVE_INFINITY;
  const heat = !target ? b.noSchedule : dueH <= 0 ? b.overdue : dueH <= 6 ? b.within6h : dueH <= 24 ? b.within24h : dueH <= 48 ? b.within48h : b.beyond;
  if (!target) {
    return {
      heat,
      factors: [
        {
          label: 'Schedule gap',
          points: heat,
          note: 'No publish or reminder time — baseline attention until scheduled'
        }
      ]
    };
  }
  const tier =
    dueH <= 0
      ? 'Overdue slot'
      : dueH <= 6
        ? 'Due within 6 hours'
        : dueH <= 24
          ? 'Due within 24 hours'
          : dueH <= 48
            ? 'Due within 48 hours'
            : 'Scheduled further out';
  return {
    heat,
    factors: [
      {
        label: 'Publish / reminder proximity',
        points: heat,
        note: `${tier} (${dueH.toFixed(1)}h)`
      }
    ]
  };
}

export function outreachHeatAndFactors(
  updatedAt: string,
  status: string,
  now: number
): { heat: number; factors: HeatFactor[] } {
  const o = getIntelligenceRules().heat.outreach;
  const ageH = (now - new Date(updatedAt).getTime()) / (1000 * 60 * 60);
  const statusBoost =
    status === 'scheduled follow-up'
      ? o.statusScheduledBoost
      : status === 'ready'
        ? o.statusReadyBoost
        : o.statusDefaultBoost;
  const agePoints = Math.min(ageH / o.ageDivisorHours, o.agePointsCap);
  const heat = Math.min(o.heatCap, Math.round(statusBoost + agePoints));
  return {
    heat,
    factors: [
      {
        label: 'Draft stage weight',
        points: statusBoost,
        note: `Status “${status}”`
      },
      {
        label: 'Idle age',
        points: Math.round(agePoints),
        note: `${ageH.toFixed(1)}h since last update (caps at +${o.agePointsCap} pts)`
      }
    ]
  };
}

export function pipelineHeatAndFactors(
  opp: { followUpDate: string; valueUsd: number; confidence: number },
  now: number
): { heat: number; factors: HeatFactor[] } {
  const p = getIntelligenceRules().heat.pipeline;
  const { followUpDate, valueUsd, confidence } = opp;
  const followH = (new Date(followUpDate).getTime() - now) / (1000 * 60 * 60);
  const followBoost = followH <= 0 ? p.followOverdueBoost : followH <= 24 ? p.followWithin24Boost : p.followBeyondBoost;
  const valueBoost = Math.min(p.valueBoostCap, Math.round(valueUsd / p.valueDivisorUsd));
  const confidenceBoost = Math.round(confidence / p.confidenceDivisor);
  const heat = Math.min(p.heatCap, p.base + followBoost + valueBoost + confidenceBoost);
  return {
    heat,
    factors: [
      { label: 'Cockpit base', points: p.base, note: 'Active opportunity floor' },
      {
        label: 'Next-action window',
        points: followBoost,
        note:
          followH <= 0
            ? 'Follow-up overdue'
            : followH <= 24
              ? 'Follow-up within 24h'
              : 'Follow-up beyond 24h'
      },
      {
        label: 'Deal size',
        points: valueBoost,
        note: `Up to +${p.valueBoostCap} from value ÷ $${(p.valueDivisorUsd / 1000).toFixed(1)}k (this deal $${Math.round(valueUsd).toLocaleString()})`
      },
      {
        label: 'Confidence',
        points: confidenceBoost,
        note: `confidence ÷ ${p.confidenceDivisor} (=${confidence}% → +${confidenceBoost})`
      }
    ]
  };
}

export function managerialNotificationFactors(
  severity: string
): { heat: number; factors: HeatFactor[] } {
  const m = getIntelligenceRules().heat.notificationManagerial;
  const heat = severity === 'focus' ? m.focusHeat : m.routineHeat;
  return {
    heat,
    factors: [
      {
        label: 'Managerial signal',
        points: heat,
        note: severity === 'focus' ? 'Focus band (higher load)' : 'Radar band (monitor)'
      }
    ]
  };
}

export function technicalNotificationFactors(
  severity: string
): { heat: number; factors: HeatFactor[] } {
  const t = getIntelligenceRules().heat.notificationTechnical;
  const heat = severity === 'focus' ? t.focusHeat : t.routineHeat;
  return {
    heat,
    factors: [
      {
        label: 'Technical signal',
        points: heat,
        note: severity === 'focus' ? 'Focus band' : 'Radar band'
      }
    ]
  };
}
