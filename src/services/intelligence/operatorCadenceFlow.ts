import { BrandOpsData, CadenceFlowMode } from '../../types/domain';
import { dailyNotificationCenter } from './dailyNotificationCenter';

export interface CadenceFlowBlock {
  id: string;
  title: string;
  category:
    | 'startup'
    | 'business'
    | 'deep-work'
    | 'delivery'
    | 'artifact-review'
    | 'buffer'
    | 'shutdown';
  startHour: number;
  endHour: number;
  sectionId: string;
  objective: string;
  syncTargets: Array<'ops-grid' | 'local-reminder'>;
}

export interface CadenceFlowEdge {
  id: string;
  from: string;
  to: string;
  kind: 'calendar' | 'task' | 'artifact' | 'reminder';
  detail: string;
}

export interface CadenceReminderCoverage {
  id: string;
  title: string;
  channel: 'browser';
  detail: string;
  at: string;
}

export interface OperatorCadenceDigest {
  mode: CadenceFlowMode;
  headline: string;
  blocks: CadenceFlowBlock[];
  edges: CadenceFlowEdge[];
  reminderCoverage: CadenceReminderCoverage[];
  artifactSummary: string;
}

interface PresetShape {
  label: string;
  businessUnits: number;
  deliveryUnits: number;
  bufferUnits: number;
}

interface DraftBlock {
  id: string;
  title: string;
  category: CadenceFlowBlock['category'];
  units: number;
  minUnits: number;
  flexible: boolean;
  sectionId: string;
  objective: string;
  syncTargets: CadenceFlowBlock['syncTargets'];
}

const MODE_PRESETS: Record<CadenceFlowMode, PresetShape> = {
  balanced: {
    label: 'Balanced operator cadence',
    businessUnits: 2,
    deliveryUnits: 2,
    bufferUnits: 2
  },
  'maker-heavy': {
    label: 'Maker-heavy cadence',
    businessUnits: 2,
    deliveryUnits: 1,
    bufferUnits: 1
  },
  'client-heavy': {
    label: 'Client-heavy cadence',
    businessUnits: 3,
    deliveryUnits: 3,
    bufferUnits: 1
  },
  'launch-day': {
    label: 'Launch-day cadence',
    businessUnits: 3,
    deliveryUnits: 4,
    bufferUnits: 1
  }
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)));

const hoursToUnits = (hours: number) => Math.max(1, Math.round(hours * 2));
const unitsToHours = (units: number) => units / 2;

const hardMinimumUnits = (block: DraftBlock) => {
  if (block.category === 'business') return 1;
  if (block.category === 'deep-work') {
    return block.id === 'deep-work-1' ? 1 : 0;
  }

  return 0;
};

const shrinkPriority = (block: DraftBlock) => {
  switch (block.category) {
    case 'buffer':
      return 0;
    case 'artifact-review':
      return 1;
    case 'shutdown':
      return 2;
    case 'startup':
      return 3;
    case 'delivery':
      return 4;
    case 'deep-work': {
      const blockIndex = Number(block.id.split('-').pop() ?? '1');
      return 8 - blockIndex;
    }
    case 'business':
      return 9;
    default:
      return 10;
  }
};

const shiftMinutes = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();

const isoForHour = (baseDate: Date, hour: number) => {
  const result = new Date(baseDate);
  const safeHour = Math.max(0, Math.min(24, hour));
  const wholeHours = Math.floor(safeHour);
  const minutes = Math.round((safeHour - wholeHours) * 60);

  result.setHours(wholeHours, minutes, 0, 0);
  return result.toISOString();
};

const humanModeLabel = (mode: CadenceFlowMode) => MODE_PRESETS[mode].label;

const buildDraftBlocks = (data: BrandOpsData): DraftBlock[] => {
  const digest = dailyNotificationCenter.build(data);
  const cadence = data.settings.cadenceFlow;
  const preset = MODE_PRESETS[cadence.mode];
  const deepWorkBlockCount = clamp(cadence.deepWorkBlockCount, 1, 3);
  const deepWorkUnits = hoursToUnits(Math.max(1, cadence.deepWorkBlockHours));
  const businessObjective =
    digest.managerialActions[0]?.detail ??
    'Clear urgent follow-ups, confirm priorities, and protect revenue momentum.';
  const deepObjective =
    digest.technicalActions[0]?.detail ??
    'Ship the highest-leverage technical work while context is fresh.';
  const deliveryObjective =
    digest.managerialActions[1]?.detail ??
    'Handle client updates, relationship replies, and external commitments in one batch.';
  const artifactObjective =
    digest.datasetActions[0]?.detail ??
    'Capture artifacts, update summaries, and keep the operator stack searchable.';

  const blocks: DraftBlock[] = [];

  if (cadence.includeStartupBlock) {
    blocks.push({
      id: 'startup-scan',
      title: 'Startup scan',
      category: 'startup',
      units: 1,
      minUnits: 1,
      flexible: false,
      sectionId: 'today',
      objective: businessObjective,
      syncTargets: ['local-reminder']
    });
  }

  blocks.push({
    id: 'business-control',
    title: 'Business control',
    category: 'business',
    units: preset.businessUnits,
    minUnits: 1,
    flexible: false,
    sectionId: 'pipeline',
    objective: businessObjective,
    syncTargets: ['local-reminder']
  });

  for (let index = 0; index < deepWorkBlockCount; index += 1) {
    blocks.push({
      id: `deep-work-${index + 1}`,
      title: `Deep work ${index + 1}`,
      category: 'deep-work',
      units: deepWorkUnits,
      minUnits: 2,
      flexible: true,
      sectionId: index % 2 === 0 ? 'brand-content' : 'connections',
      objective: deepObjective,
      syncTargets: ['local-reminder']
    });
  }

  blocks.push({
    id: 'delivery-window',
    title: cadence.mode === 'client-heavy' ? 'Client delivery window' : 'Delivery + comms',
    category: 'delivery',
    units: preset.deliveryUnits,
    minUnits: 1,
    flexible: true,
    sectionId: 'pipeline',
    objective: deliveryObjective,
    syncTargets: ['local-reminder']
  });

  if (cadence.includeArtifactReviewBlock) {
    blocks.push({
      id: 'artifact-review',
      title: 'Artifact review',
      category: 'artifact-review',
      units: 1,
      minUnits: 1,
      flexible: false,
      sectionId: 'connections',
      objective: artifactObjective,
      syncTargets: ['ops-grid']
    });
  }

  blocks.push({
    id: 'buffer-window',
    title: cadence.mode === 'launch-day' ? 'Launch buffer' : 'Operator buffer',
    category: 'buffer',
    units: preset.bufferUnits,
    minUnits: 0,
    flexible: true,
    sectionId: 'today',
    objective: 'Absorb interruptions, breaks, overruns, and recovery without destroying the whole day.',
    syncTargets: ['local-reminder']
  });

  if (cadence.includeShutdownBlock) {
    blocks.push({
      id: 'shutdown-review',
      title: 'Shutdown review',
      category: 'shutdown',
      units: 1,
      minUnits: 1,
      flexible: false,
      sectionId: 'today',
      objective: 'Capture outcomes, queue tomorrow, and close the day deliberately.',
      syncTargets: ['ops-grid']
    });
  }

  return blocks;
};

const compressBlocks = (blocks: DraftBlock[], totalUnits: number) => {
  const nextBlocks = blocks.map((block) => ({ ...block }));
  const fixedUnits = nextBlocks
    .filter((block) => !block.flexible)
    .reduce((total, block) => total + block.units, 0);
  let availableFlexibleUnits = Math.max(totalUnits - fixedUnits, 0);

  const flexibleBlocks = nextBlocks.filter((block) => block.flexible);
  const minimumFlexibleUnits = flexibleBlocks.reduce((total, block) => total + block.minUnits, 0);

  if (availableFlexibleUnits < minimumFlexibleUnits) {
    let deficit = minimumFlexibleUnits - availableFlexibleUnits;
    for (let index = 0; index < nextBlocks.length; index += 1) {
      const block = nextBlocks[index];
      if (
        deficit > 0 &&
        (block.category === 'buffer' ||
          block.category === 'artifact-review' ||
          block.category === 'shutdown' ||
          block.category === 'startup')
      ) {
        const removable = Math.min(block.units - (block.category === 'buffer' ? 0 : 1), deficit);
        if (removable > 0) {
          block.units -= removable;
          deficit -= removable;
        }
      }
    }

    availableFlexibleUnits = Math.max(
      totalUnits -
        nextBlocks.filter((block) => !block.flexible).reduce((total, block) => total + block.units, 0),
      0
    );
  }

  const requestedFlexibleUnits = flexibleBlocks.reduce((total, block) => total + block.units, 0);
  if (requestedFlexibleUnits <= availableFlexibleUnits) {
    return nextBlocks.filter((block) => block.units > 0);
  }

  let reducibleUnits = requestedFlexibleUnits - availableFlexibleUnits;
  while (reducibleUnits > 0) {
    const target = nextBlocks
      .filter((block) => block.flexible && block.units > block.minUnits)
      .sort((left, right) => right.units - left.units)[0];

    if (!target) break;
    target.units -= 1;
    reducibleUnits -= 1;
  }

  let currentUnits = nextBlocks.reduce((total, block) => total + block.units, 0);
  while (currentUnits > totalUnits) {
    const target = nextBlocks
      .filter((block) => block.units > hardMinimumUnits(block))
      .sort((left, right) => {
        const priorityDelta = shrinkPriority(left) - shrinkPriority(right);
        if (priorityDelta !== 0) return priorityDelta;
        return right.units - left.units;
      })[0];

    if (!target) break;
    target.units -= 1;
    currentUnits -= 1;
  }

  return nextBlocks.filter((block) => block.units > 0);
};

const buildReminderCoverage = (
  data: BrandOpsData,
  blocks: CadenceFlowBlock[],
  baseDate: Date
): CadenceReminderCoverage[] => {
  const cadence = data.settings.cadenceFlow;
  const reminders: CadenceReminderCoverage[] = [];

  if (cadence.calendarSyncEnabled) {
    blocks.forEach((block) => {
      const startAt = isoForHour(baseDate, block.startHour);
      reminders.push({
        id: `cadence-${block.id}`,
        title: block.title,
        channel: 'browser',
        detail: `Reminder ${cadence.remindBeforeMinutes}m before ${block.title.toLowerCase()}.`,
        at: shiftMinutes(startAt, -cadence.remindBeforeMinutes)
      });
    });
  }

  data.followUps
    .filter((item) => !item.completed)
    .slice(0, 3)
    .forEach((item) => {
      reminders.push({
        id: `follow-up-${item.id}`,
        title: item.reason,
        channel: 'browser',
        detail: 'Follow-up reminder generated from the relationship queue.',
        at: item.dueAt
      });
    });

  data.publishingQueue
    .filter((item) => Boolean(item.scheduledFor || item.reminderAt))
    .slice(0, 3)
    .forEach((item) => {
      reminders.push({
        id: `publishing-${item.id}`,
        title: item.title,
        channel: 'browser',
        detail: 'Presence reminder generated from the publishing queue.',
        at: item.reminderAt ?? item.scheduledFor ?? item.createdAt
      });
    });

  return reminders
    .sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime())
    .slice(0, 8);
};

export const buildCadenceSourceId = (dateKey: string, blockTitle: string) =>
  `${dateKey}::${blockTitle}`;

export const operatorCadenceFlow = {
  build(data: BrandOpsData, baseDate = new Date()): OperatorCadenceDigest {
    const preset = MODE_PRESETS[data.settings.cadenceFlow.mode];
    const startHour = data.settings.notificationCenter.workdayStartHour;
    const endHour = data.settings.notificationCenter.workdayEndHour;
    const totalUnits = Math.max(2, Math.round((endHour - startHour) * 2));
    const blockDrafts = compressBlocks(buildDraftBlocks(data), totalUnits);

    let cursorUnits = 0;
    const blocks: CadenceFlowBlock[] = blockDrafts.map((block) => {
      const start = startHour + unitsToHours(cursorUnits);
      cursorUnits += block.units;
      const end = startHour + unitsToHours(cursorUnits);

      return {
        id: block.id,
        title: block.title,
        category: block.category,
        startHour: start,
        endHour: end,
        sectionId: block.sectionId,
        objective: block.objective,
        syncTargets: block.syncTargets
      };
    });

    const reminderCoverage = buildReminderCoverage(data, blocks, baseDate);
    const edges: CadenceFlowEdge[] = [
      {
        id: 'brief-to-cadence',
        from: 'Execution Center',
        to: 'Cadence blocks',
        kind: 'reminder',
        detail: `${humanModeLabel(data.settings.cadenceFlow.mode)} turns today’s priorities into protected time blocks.`
      },
      {
        id: 'cadence-to-calendar',
        from: 'Cadence blocks',
        to: 'Reminders',
        kind: 'calendar',
        detail: data.settings.cadenceFlow.calendarSyncEnabled
          ? 'Cadence blocks surface lead reminders in the cockpit before each protected window.'
          : 'Enable cadence calendar reminders to get timed prompts before startup, deep work, delivery, and shutdown blocks.'
      },
      {
        id: 'execution-to-reminders',
        from: 'Publishing + relationships',
        to: 'Follow-ups',
        kind: 'task',
        detail:
          'Publishing slots, follow-ups, and opportunity next actions roll into reminder coverage for the day.'
      },
      {
        id: 'sync-to-artifacts',
        from: 'Sync runs',
        to: 'Integration hub artifacts',
        kind: 'artifact',
        detail: data.settings.cadenceFlow.artifactSyncEnabled
          ? 'Each sync run can log a daily snapshot artifact so the system leaves a trail.'
          : 'Enable artifact sync to log daily sync snapshots into the integration hub.'
      }
    ];

    return {
      mode: data.settings.cadenceFlow.mode,
      headline: `${preset.label} · ${blocks.filter((block) => block.category === 'deep-work').length} deep work blocks`,
      blocks,
      edges,
      reminderCoverage,
      artifactSummary: data.settings.cadenceFlow.artifactSyncEnabled
        ? 'Sync runs log a daily snapshot artifact for traceability.'
        : 'Artifact logging is off; your sync still works, but it will not leave a daily system record.'
    };
  },

  isoRangeForBlock(block: CadenceFlowBlock, baseDate = new Date()) {
    return {
      startAt: isoForHour(baseDate, block.startHour),
      endAt: isoForHour(baseDate, block.endHour)
    };
  }
};
