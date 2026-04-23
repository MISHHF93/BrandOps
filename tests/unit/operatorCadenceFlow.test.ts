import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildCadenceSourceId,
  operatorCadenceFlow
} from '../../src/services/intelligence/operatorCadenceFlow';
import { cloneDemoSampleData, cloneSeedData } from '../helpers/fixtures';

describe('operatorCadenceFlow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds an AI developer day with protected maker blocks and sync coverage', () => {
    const data = cloneSeedData();
    data.settings.cadenceFlow.calendarSyncEnabled = true;

    const digest = operatorCadenceFlow.build(data, new Date('2026-04-11T12:00:00.000Z'));

    expect(digest.headline).toContain('Balanced operator cadence');
    expect(digest.blocks.some((block) => block.category === 'startup')).toBe(true);
    expect(digest.blocks.filter((block) => block.category === 'deep-work')).toHaveLength(2);
    expect(digest.blocks.at(-1)?.category).toBe('shutdown');
    expect(
      digest.blocks.every(
        (block, index, blocks) =>
          block.endHour > block.startHour &&
          (index === 0 || block.startHour >= blocks[index - 1].endHour)
      )
    ).toBe(true);
    expect(
      digest.reminderCoverage.some(
        (reminder) => reminder.id.startsWith('cadence-') && reminder.channel === 'browser'
      )
    ).toBe(true);
  });

  it('compresses the day shape so blocks do not overflow the configured workday', () => {
    const data = cloneSeedData();
    data.settings.notificationCenter.workdayStartHour = 9;
    data.settings.notificationCenter.workdayEndHour = 13;
    data.settings.cadenceFlow.deepWorkBlockCount = 3;
    data.settings.cadenceFlow.deepWorkBlockHours = 2;

    const digest = operatorCadenceFlow.build(data, new Date('2026-04-11T12:00:00.000Z'));
    const lastBlock = digest.blocks.at(-1);

    expect(digest.blocks[0]?.startHour).toBe(9);
    expect(lastBlock?.endHour).toBeLessThanOrEqual(13);
    expect(digest.blocks.every((block) => block.endHour > block.startHour)).toBe(true);
  });

  it('falls back to artifact-off and browser-first reminders when sync is disabled', () => {
    const data = cloneDemoSampleData();
    data.settings.cadenceFlow.calendarSyncEnabled = false;
    data.settings.cadenceFlow.artifactSyncEnabled = false;

    const digest = operatorCadenceFlow.build(data, new Date('2026-04-11T12:00:00.000Z'));

    expect(digest.artifactSummary).toContain('Artifact logging is off');
    expect(digest.reminderCoverage.some((reminder) => reminder.id.startsWith('cadence-'))).toBe(
      false
    );
    expect(digest.reminderCoverage.some((reminder) => reminder.channel === 'browser')).toBe(true);
  });

  it('builds stable source ids for synced cadence blocks', () => {
    expect(buildCadenceSourceId('2026-04-11', 'Deep work 1')).toBe('2026-04-11::Deep work 1');
  });
});
