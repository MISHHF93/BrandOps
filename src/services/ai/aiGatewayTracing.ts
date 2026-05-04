import type { BrandOpsData } from '../../types/domain';
import { prependOperatorTrace, sanitizeOperatorTraceDetails } from '../dataset/operatorTraces';
import type { ChatCompletionResult, EmbeddingsResult } from './nlpInferenceGateway';

function lastUserContentChars(messages: { role: string; content: string }[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'user' && typeof m.content === 'string') {
      return m.content.length;
    }
  }
  return 0;
}

/** Persist one operator trace after a chat completion attempt (no raw prompts). */
export async function persistChatGatewayTrace(
  loadData: () => Promise<BrandOpsData>,
  persist: (d: BrandOpsData) => Promise<void>,
  args: {
    messages: { role: string; content: string }[];
    result: ChatCompletionResult;
    durationMs: number;
    modelId: string;
    workerId?: string | null;
    route?: string;
    surface?: string;
  }
): Promise<void> {
  const fresh = await loadData();
  const outcome = args.result.ok ? 'success' : 'failure';
  const details: Record<string, unknown> = {
    kind: 'chat',
    durationMs: args.durationMs,
    modelId: args.modelId,
    userContentChars: lastUserContentChars(args.messages),
    responseChars: args.result.ok ? args.result.text.length : 0
  };
  if (args.workerId != null && args.workerId !== '') {
    details.workerId = args.workerId;
  }
  if (!args.result.ok) {
    details.code = args.result.code;
    if (typeof args.result.status === 'number') details.httpStatus = args.result.status;
  }
  const next = prependOperatorTrace(fresh, {
    source: 'assistant',
    verb: 'ai.gateway.chat',
    surface: args.surface ?? 'chat',
    route: args.route ?? 'nlpInferenceGateway.chat',
    outcome,
    details: sanitizeOperatorTraceDetails(details)
  });
  await persist(next);
}

/** Persist one operator trace after an embeddings attempt (batch stats only). */
export async function persistEmbeddingsGatewayTrace(
  loadData: () => Promise<BrandOpsData>,
  persist: (d: BrandOpsData) => Promise<void>,
  args: {
    result: EmbeddingsResult;
    durationMs: number;
    modelId: string;
    batchSize: number;
    route?: string;
    surface?: string;
  }
): Promise<void> {
  const fresh = await loadData();
  const outcome = args.result.ok ? 'success' : 'failure';
  const details: Record<string, unknown> = {
    kind: 'embeddings',
    durationMs: args.durationMs,
    modelId: args.modelId,
    batchSize: args.batchSize,
    vectorDims:
      args.result.ok && args.result.embeddings[0]
        ? args.result.embeddings[0].length
        : null
  };
  if (!args.result.ok) {
    details.code = args.result.code;
    if (typeof args.result.status === 'number') details.httpStatus = args.result.status;
  }
  const next = prependOperatorTrace(fresh, {
    source: 'assistant',
    verb: 'ai.gateway.embeddings',
    surface: args.surface ?? 'workspace',
    route: args.route ?? 'nlpInferenceGateway.embeddings',
    outcome,
    details: sanitizeOperatorTraceDetails(details)
  });
  await persist(next);
}
