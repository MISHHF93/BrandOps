import type { AppSettings } from '../../types/domain';
import { aiRuntimePolicy } from '../aiAdapters/runtimePolicy';
import {
  BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY,
  getOpenAiCompatibleApiKey
} from './aiSecretsAccess';

export type NlpGatewayFailureCode =
  | 'adapter_disabled'
  | 'policy_blocked'
  | 'missing_endpoint'
  | 'missing_api_key'
  | 'http_error'
  | 'bad_response';

export type ChatCompletionMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface ChatCompletionInput {
  messages: ChatCompletionMessage[];
  /** Overrides settings.aiBridge.chatModelId when set. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Provider-dependent; sends OpenAI-style `response_format: { type: 'json_object' }` when true. */
  responseFormatJsonObject?: boolean;
}

export type ChatCompletionResult =
  | { ok: true; text: string; raw?: unknown }
  | { ok: false; code: NlpGatewayFailureCode; message: string; status?: number; raw?: unknown };

export interface EmbeddingInput {
  texts: string[];
  model?: string;
}

export type EmbeddingsResult =
  | { ok: true; embeddings: number[][]; raw?: unknown }
  | { ok: false; code: NlpGatewayFailureCode; message: string; status?: number; raw?: unknown };

export function joinOpenAiCompatibleUrl(base: string, segment: string): string {
  const b = base.trim().replace(/\/+$/, '');
  const s = segment.replace(/^\/+/, '');
  return `${b}/${s}`;
}

function resolveChatPolicy(
  settings: AppSettings
): { ok: true } | { ok: false; code: NlpGatewayFailureCode; message: string } {
  if (settings.aiAdapterMode === 'disabled') {
    return { ok: false, code: 'adapter_disabled', message: 'AI adapter mode is disabled.' };
  }
  if (settings.aiAdapterMode === 'local-only') {
    return {
      ok: false,
      code: 'adapter_disabled',
      message: 'Local-only mode does not call hosted NLP endpoints.'
    };
  }
  if (!aiRuntimePolicy.externalNlpHttpEnabled) {
    return {
      ok: false,
      code: 'policy_blocked',
      message: 'Hosted NLP HTTP bridge disabled by runtime policy.'
    };
  }
  return { ok: true };
}

/** Embedding root: dedicated URL if set, otherwise inference base. */
function embeddingRoot(settings: AppSettings): string {
  const e = settings.aiBridge.embeddingBaseUrl.trim();
  if (e.length > 0) return e;
  return settings.aiBridge.inferenceBaseUrl.trim();
}

export async function runChatCompletion(
  settings: AppSettings,
  input: ChatCompletionInput
): Promise<ChatCompletionResult> {
  const pol = resolveChatPolicy(settings);
  if (!pol.ok) return { ok: false, code: pol.code, message: pol.message };

  const base = settings.aiBridge.inferenceBaseUrl.trim();
  if (!base) {
    return {
      ok: false,
      code: 'missing_endpoint',
      message: 'Configure settings.aiBridge.inferenceBaseUrl (OpenAI-compatible /v1 root).'
    };
  }

  const apiKey = await getOpenAiCompatibleApiKey();
  if (!apiKey) {
    return {
      ok: false,
      code: 'missing_api_key',
      message: `Set API key in chrome.storage.local["${BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY}"].`
    };
  }

  const url = joinOpenAiCompatibleUrl(base, 'chat/completions');
  const model = input.model?.trim() || settings.aiBridge.chatModelId;
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 55_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: input.messages,
        ...(typeof input.temperature === 'number' ? { temperature: input.temperature } : {}),
        ...(typeof input.maxTokens === 'number' ? { max_tokens: input.maxTokens } : {}),
        ...(input.responseFormatJsonObject ? { response_format: { type: 'json_object' } } : {})
      }),
      signal: controller.signal
    });

    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      return {
        ok: false,
        code: 'http_error',
        message: `HTTP ${res.status}`,
        status: res.status,
        raw: parsed
      };
    }

    const p = parsed as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = p?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return {
        ok: false,
        code: 'bad_response',
        message: 'Completion response missing choices[0].message.content.',
        raw: parsed
      };
    }

    return { ok: true, text, raw: parsed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed.';
    return {
      ok: false,
      code: 'http_error',
      message: controller.signal.aborted ? 'Request timed out.' : msg
    };
  } finally {
    globalThis.clearTimeout(timer);
  }
}

/** Uses embedding root URL + `/embeddings`. */
export async function runEmbeddings(
  settings: AppSettings,
  input: EmbeddingInput
): Promise<EmbeddingsResult> {
  const pol = resolveChatPolicy(settings);
  if (!pol.ok) return { ok: false, code: pol.code, message: pol.message };

  const root = embeddingRoot(settings);
  if (!root) {
    return {
      ok: false,
      code: 'missing_endpoint',
      message: 'Configure aiBridge.embeddingBaseUrl or inferenceBaseUrl for embeddings.'
    };
  }

  const apiKey = await getOpenAiCompatibleApiKey();
  if (!apiKey) {
    return {
      ok: false,
      code: 'missing_api_key',
      message: `Set API key in chrome.storage.local["${BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY}"].`
    };
  }

  const url = joinOpenAiCompatibleUrl(root, 'embeddings');
  const model = input.model?.trim() || settings.aiBridge.embeddingModelId;
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 55_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: input.texts
      }),
      signal: controller.signal
    });

    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      return {
        ok: false,
        code: 'http_error',
        message: `HTTP ${res.status}`,
        status: res.status,
        raw: parsed
      };
    }

    const p = parsed as { data?: Array<{ embedding?: number[] }> };
    const vectors =
      p?.data?.map((d) => d.embedding).filter((v): v is number[] => Array.isArray(v)) ?? [];
    if (vectors.length !== input.texts.length) {
      return {
        ok: false,
        code: 'bad_response',
        message: 'Embeddings response length mismatch.',
        raw: parsed
      };
    }

    return { ok: true, embeddings: vectors, raw: parsed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed.';
    return {
      ok: false,
      code: 'http_error',
      message: controller.signal.aborted ? 'Request timed out.' : msg
    };
  } finally {
    globalThis.clearTimeout(timer);
  }
}
