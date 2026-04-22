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

export const OPERATIONAL_PRESETS: Array<{ label: string; command: string }> = [
  {
    label: 'Focus mode',
    command:
      'configure: motion off, disable ambient, cadence maker-heavy, workday 9 to 17, max tasks per lane 3'
  },
  {
    label: 'Launch mode',
    command:
      'configure: motion balanced, enable ambient, cadence launch-day, workday 8 to 20, max tasks per lane 6'
  },
  {
    label: 'Client delivery',
    command:
      'configure: cadence client-heavy, remind before 30 min, workday 9 to 18, max tasks per lane 5'
  }
];
