import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

export type ComposerBlankStarter = {
  /** Chip label */
  label: string;
  /** Fills the assistant composer; user may edit before Apply. */
  snippet: string;
};

/**
 * Sensible defaults to prime the Settings assistant — does not include cadence
 * (use the segmented control in the Workspace card).
 */
export function buildComposerBlankStarters(snapshot: MobileWorkspaceSnapshot): ComposerBlankStarter[] {
  return [
    {
      label: 'Workday',
      snippet: `workday ${snapshot.workdayStartHour} to ${snapshot.workdayEndHour}`
    },
    {
      label: 'Reminder lead',
      snippet: `remind before ${snapshot.remindBeforeMinutes} min`
    },
    {
      label: 'Daily task cap',
      snippet: `max tasks per lane ${snapshot.maxDailyTasks}`
    },
    {
      label: 'Business weight',
      snippet: `${snapshot.managerialWeight}% business`
    }
  ];
}
