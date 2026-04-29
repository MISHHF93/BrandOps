import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

export type ComposerBlankStarter = {
  /** Chip label */
  label: string;
  /** Fills the assistant composer; user may edit before Apply. */
  snippet: string;
};

/**
 * Sensible defaults to prime the Settings assistant — operating mode is handled in Preferences.
 */
function starterSnippet(value: string, max = 100) {
  return value.replace(/"/g, "'").replace(/\n/g, ' ').trim().slice(0, max);
}

export function buildComposerBlankStarters(
  snapshot: MobileWorkspaceSnapshot
): ComposerBlankStarter[] {
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
    },
    {
      label: 'Positioning',
      snippet: `positioning is "${starterSnippet(snapshot.positioning, 160)}"`
    },
    {
      label: 'Brand voice',
      snippet: `brand voice is "${starterSnippet(snapshot.voiceGuide, 200)}"`
    }
  ];
}
