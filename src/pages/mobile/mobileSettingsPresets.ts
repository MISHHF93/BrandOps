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
  { label: 'Cadence balanced', command: 'configure: cadence balanced' },
  { label: 'Cadence maker-heavy', command: 'configure: cadence maker-heavy' },
  { label: 'Cadence client-heavy', command: 'configure: cadence client-heavy' },
  { label: 'Launch-day cadence', command: 'configure: cadence launch-day' },
  { label: 'Workday 9-18', command: 'configure: workday 9 to 18' },
  { label: 'Max daily tasks 4', command: 'configure: max tasks per lane 4' },
  { label: 'Reminder 20 min', command: 'configure: remind before 20 min' }
];

/**
 * One-tap **workflow modes** for BrandOps: pipeline, content, deep work, and launch pushes.
 * These align with Pulse / Today / cockpit use cases; they are not generic “sprint” methodology.
 * Each `command` is a compound `configure:` string parsed by `buildAiSettingsPlan` in `aiSettingsMode.ts`.
 */
export type WorkflowBundlePreset = {
  label: string;
  /** Shown in Settings and on the button `title` for screen readers. */
  description: string;
  command: string;
};

export const OPERATIONAL_PRESETS: readonly WorkflowBundlePreset[] = [
  {
    label: 'Deep focus',
    description: 'Minimal motion and chrome, maker cadence, shorter workday — best for writing and planning blocks.',
    command:
      'configure: motion off, disable ambient, cadence maker-heavy, workday 9 to 17, max tasks per lane 3'
  },
  {
    label: 'Content & publishing',
    description: 'Maker cadence, classic visual, and a day-long window tuned for posts, drafts, and brand work.',
    command: 'configure: cadence maker-heavy, workday 8 to 18, max tasks per lane 4, classic'
  },
  {
    label: 'Pipeline & client delivery',
    description: 'Client-heavy cadence, tighter reminders, business-weighted signals — for deals, follow-ups, and CRM work.',
    command:
      'configure: cadence client-heavy, remind before 15 min, workday 9 to 18, max tasks per lane 5, 55% business'
  },
  {
    label: 'Launch / campaign push',
    description: 'Launch-day cadence, ambient on, extended hours — for ship weeks, campaigns, and time-bound pushes.',
    command:
      'configure: motion balanced, enable ambient, cadence launch-day, workday 8 to 20, max tasks per lane 6'
  }
] as const;
