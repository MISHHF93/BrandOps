import { describe, expect, it } from 'vitest';
import { buildHostedAskMessages } from '../../src/services/ai/hostedAskTurn';
import { defaultCopilotWorkerRegistry } from '../../src/config/copilotWorkerDefaults';
import { seedData } from '../../src/modules/brandMemory/seed';
import { cloneSeedData } from '../helpers/fixtures';

describe('hostedAskTurn', () => {
  it('layers worker persona onto system message', () => {
    const coach = defaultCopilotWorkerRegistry.workers.find((w) => w.id === 'pipeline-coach')!;
    const msgs = buildHostedAskMessages(seedData, 'What matters today?', coach);
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('Pipeline Coach');
    expect(msgs[0].content).toContain('pipeline health');
    expect(msgs[1].content).toBe('What matters today?');
  });

  it('disallows structured automation prose when worker has empty allow-list', () => {
    const strategist = defaultCopilotWorkerRegistry.workers.find(
      (w) => w.id === 'content-strategist'
    )!;
    const msgs = buildHostedAskMessages(seedData, 'Hook ideas?', strategist);
    expect(msgs[0].content).toContain(
      'do NOT output executeAgentCommand or brandOpsActionPipeline JSON'
    );
  });

  it('appends operator twin résumé block when twin resume artifact is stored', () => {
    const ws = cloneSeedData();
    ws.settings.operatorTwin = {
      ...ws.settings.operatorTwin,
      resumeArtifact: 'sections:a | skills:b',
      version: 1
    };
    const msgs = buildHostedAskMessages(ws, 'Hello', null);
    expect(msgs[0].content).toContain('Operator twin');
    expect(msgs[0].content).toContain('sections:a');
    expect(msgs[0].content).toContain('Global prompt scaffold');
  });

  it('documents citation envelope parsing beside Ask completions', () => {
    const coach = defaultCopilotWorkerRegistry.workers.find((w) => w.id === 'pipeline-coach')!;
    const msgs = buildHostedAskMessages(seedData, 'What matters today?', coach);
    expect(msgs[0].content).toContain('brandOpsAiProvenance');
  });
});
