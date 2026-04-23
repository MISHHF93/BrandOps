/** Chat-native `configure:` commands for the mobile Settings tab. */
export const CONFIG_PRESETS: Array<{ label: string; command: string }> = [
  { label: 'Classic visual', command: 'configure: classic' },
  { label: 'Retro visual', command: 'configure: retro' },
  { label: 'Motion off', command: 'configure: motion off' },
  { label: 'Motion balanced', command: 'configure: motion balanced' },
  { label: 'Motion wild', command: 'configure: motion wild' },
  { label: 'Ambient on', command: 'configure: enable ambient' },
  { label: 'Ambient off', command: 'configure: disable ambient' },
  { label: 'Debug on', command: 'configure: enable debug' },
  { label: 'Debug off', command: 'configure: disable debug' },
  { label: 'Workday 9-18', command: 'configure: workday 9 to 18' },
  { label: 'Max daily tasks 4', command: 'configure: max tasks per lane 4' },
  { label: 'Reminder 20 min', command: 'configure: remind before 20 min' }
];

/**
 * One-tap **workspace templates** — compound `configure:` strings for `buildAiSettingsPlan`.
 * Operating mode alone is in Advanced → Preferences; these bundle several fields for a working style.
 */
export type WorkflowBundlePreset = {
  label: string;
  /** Shown in Settings and on the button `title` for screen readers. */
  description: string;
  command: string;
};

export const OPERATIONAL_PRESETS: readonly WorkflowBundlePreset[] = [
  {
    label: 'Focus',
    description: 'Quiet UI, maker cadence, shorter day — writing, planning, deep blocks.',
    command:
      'configure: motion off, disable ambient, cadence maker-heavy, workday 9 to 17, max tasks per lane 3'
  },
  {
    label: 'Studio',
    description: 'Classic look, maker cadence, long day — drafts, posts, brand work.',
    command: 'configure: cadence maker-heavy, workday 8 to 18, max tasks per lane 4, classic'
  },
  {
    label: 'Pipeline',
    description:
      'Client-heavy rhythm, tighter reminders, business-weighted — deals and follow-ups.',
    command:
      'configure: cadence client-heavy, remind before 15 min, workday 9 to 18, max tasks per lane 5, 55% business'
  },
  {
    label: 'Sprint',
    description: 'Launch-day cadence, ambient on, extended hours — ship weeks and campaigns.',
    command:
      'configure: motion balanced, enable ambient, cadence launch-day, workday 8 to 20, max tasks per lane 6'
  }
] as const;
