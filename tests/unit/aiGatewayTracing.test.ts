import { describe, expect, it } from 'vitest';
import { persistChatGatewayTrace } from '../../src/services/ai/aiGatewayTracing';
import { seedData } from '../../src/modules/brandMemory/seed';

describe('persistChatGatewayTrace', () => {
  it('prepends ai.gateway.chat trace when collection enabled', async () => {
    const base = structuredClone(seedData);
    base.settings.operatorTraceCollectionEnabled = true;
    base.operatorTraces = { entries: [] };

    let saved = base;
    await persistChatGatewayTrace(
      async () => saved,
      async (next) => {
        saved = next;
      },
      {
        messages: [{ role: 'user', content: 'hello' }],
        result: { ok: false, code: 'missing_endpoint', message: 'No URL' },
        durationMs: 4,
        modelId: 'gpt-test',
        citationCount: 3
      }
    );

    expect(saved.operatorTraces?.entries?.[0]?.verb).toBe('ai.gateway.chat');
    expect(saved.operatorTraces?.entries?.[0]?.outcome).toBe('failure');
    expect(saved.operatorTraces?.entries?.[0]?.details?.citationCount).toBe(3);
  });
});
