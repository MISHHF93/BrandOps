import { describe, expect, it } from 'vitest';
import { defaultCopilotWorkerRegistry } from '../../src/config/copilotWorkerDefaults';
import type { AppSettings } from '../../src/types/domain';
import {
  buildCopilotContextHintBlock,
  resolveActiveCopilotWorker
} from '../../src/services/ai/copilotWorkers';
import { seedData } from '../../src/modules/brandMemory/seed';

describe('copilotWorkers', () => {
  it('resolveActiveCopilotWorker honors activeWorkerId', () => {
    const settings = {
      ...seedData.settings,
      copilotWorkers: {
        ...defaultCopilotWorkerRegistry,
        activeWorkerId: 'pipeline-coach'
      }
    } as AppSettings;
    expect(resolveActiveCopilotWorker(settings)?.id).toBe('pipeline-coach');
  });

  it('falls back to first worker when id unknown', () => {
    const settings = {
      ...seedData.settings,
      copilotWorkers: {
        workers: defaultCopilotWorkerRegistry.workers,
        activeWorkerId: 'missing-id'
      }
    } as AppSettings;
    expect(resolveActiveCopilotWorker(settings)?.id).toBe('brandops-default');
  });

  it('buildCopilotContextHintBlock includes vault lines when requested', () => {
    const worker = defaultCopilotWorkerRegistry.workers.find((w) => w.id === 'content-strategist')!;
    const block = buildCopilotContextHintBlock(seedData, worker);
    expect(block).toContain('Brand vault');
  });
});
