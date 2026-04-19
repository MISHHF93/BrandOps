/**
 * Execution heat (0–100) ranks cockpit queue items. Higher = act sooner.
 * Formulas live alongside factor labels so the UI can explain scores transparently.
 */

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

export const HEAT_BAND_CRITICAL = 85;
export const HEAT_BAND_WARNING = 70;

/** Static copy for the operating board legend */
export const HEAT_SCORE_GUIDE =
  'Heat is a 0–100 priority score. It blends time pressure, deal impact, publishing windows, outreach age, and notification severity. Higher = address sooner. Bands: ≥85 critical · 70–84 warning · <70 watch.';

export function followUpHeatAndFactors(taskDueAt: string, now: number): { heat: number; factors: HeatFactor[] } {
  const dueH = (new Date(taskDueAt).getTime() - now) / (1000 * 60 * 60);
  const heat =
    dueH <= 0 ? 97 : dueH <= 8 ? 86 : dueH <= 24 ? 72 : dueH <= 48 ? 54 : 36;
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
  const target = scheduledFor ?? reminderAt;
  const dueH = target
    ? (new Date(target).getTime() - now) / (1000 * 60 * 60)
    : Number.POSITIVE_INFINITY;
  const heat =
    !target ? 34 : dueH <= 0 ? 92 : dueH <= 6 ? 82 : dueH <= 24 ? 70 : dueH <= 48 ? 52 : 34;
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
  const ageH = (now - new Date(updatedAt).getTime()) / (1000 * 60 * 60);
  const statusBoost =
    status === 'scheduled follow-up' ? 30 : status === 'ready' ? 22 : 14;
  const agePoints = Math.min(ageH / 3, 24);
  const heat = Math.min(90, Math.round(statusBoost + agePoints));
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
        note: `${ageH.toFixed(1)}h since last update (caps at +24 pts)`
      }
    ]
  };
}

export function pipelineHeatAndFactors(
  opp: { followUpDate: string; valueUsd: number; confidence: number },
  now: number
): { heat: number; factors: HeatFactor[] } {
  const { followUpDate, valueUsd, confidence } = opp;
  const followH = (new Date(followUpDate).getTime() - now) / (1000 * 60 * 60);
  const followBoost = followH <= 0 ? 34 : followH <= 24 ? 20 : 10;
  const valueBoost = Math.min(22, Math.round(valueUsd / 2500));
  const confidenceBoost = Math.round(confidence / 8);
  const base = 24;
  const heat = Math.min(95, base + followBoost + valueBoost + confidenceBoost);
  return {
    heat,
    factors: [
      { label: 'Cockpit base', points: base, note: 'Active opportunity floor' },
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
        note: `Up to +22 from value ÷ $2.5k (this deal $${Math.round(valueUsd).toLocaleString()})`
      },
      {
        label: 'Confidence',
        points: confidenceBoost,
        note: `confidence ÷ 8 (=${confidence}% → +${confidenceBoost})`
      }
    ]
  };
}

export function managerialNotificationFactors(
  severity: string
): { heat: number; factors: HeatFactor[] } {
  const heat = severity === 'focus' ? 84 : 62;
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
  const heat = severity === 'focus' ? 80 : 58;
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
