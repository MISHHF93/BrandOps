import type { AppSettings } from '../../types/domain';
import { aiRuntimePolicy } from '../aiAdapters/runtimePolicy';
import { getOpenAiCompatibleApiKey, describeAiSecretsStorageHint } from './aiSecretsAccess';
import { retryFetch } from './retryWithBackoff';

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

/** Turns bare `HTTP n` into actionable copy when OpenAI-compatible APIs return 401/403/404. */
/**
 * Strip anything that looks like a credential out of provider-supplied text.
 *
 * The inference base URL is operator-configurable — this product supports Azure
 * OpenAI and any OpenAI-compatible endpoint — so the response body is text from
 * a server BrandOps does not control. Some gateways and proxies echo the request
 * back in their errors, and the request carries `Authorization: Bearer <key>`.
 *
 * Without this, that snippet flows straight into the returned `message` and
 * `raw`, which reach traces, checkpoints and the interface. A key that leaves in
 * a header must not come back in something the product stores.
 *
 * Applied to provider text on the way *in*, at the one place it enters, rather
 * than at each of the places it later gets written.
 */
export function redactProviderText<T>(value: T): T {
  if (typeof value === 'string') {
    return value
      .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
      .replace(/\bsk-[A-Za-z0-9._-]{8,}/g, '[redacted]') as unknown as T;
  }
  if (Array.isArray(value)) return value.map((entry) => redactProviderText(entry)) as unknown as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        redactProviderText(entry)
      ])
    ) as unknown as T;
  }
  return value;
}

function openAiCompatibleHttpDetail(status: number, parsed: unknown): string {
  const providerSnippet = (): string => {
    if (!parsed || typeof parsed !== 'object') return '';
    const o = parsed as Record<string, unknown>;
    const err = o.error;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object') {
      const m = (err as Record<string, unknown>).message;
      if (typeof m === 'string') return m;
    }
    const top = o.message;
    return typeof top === 'string' ? top : '';
  };
  const detail = providerSnippet().trim();

  switch (status) {
    case 401:
      return [
        'HTTP 401 — API key rejected or not sent correctly for this endpoint.',
        detail && `Provider: ${detail}`
      ]
        .filter(Boolean)
        .join(' ');
    case 403:
      return [
        'HTTP 403 — forbidden (check model access, org permissions, VPN/IP allowlists, or key scope).',
        detail && `Provider: ${detail}`
      ]
        .filter(Boolean)
        .join(' ');
    case 404:
      return [
        'HTTP 404 — wrong base URL or path (expect an OpenAI-compatible root with /v1/…).',
        detail && `Provider: ${detail}`
      ]
        .filter(Boolean)
        .join(' ');
    default:
      return detail ? `HTTP ${status} — ${detail}` : `HTTP ${status}`;
  }
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

  const apiKey = await getOpenAiCompatibleApiKey(base);
  if (!apiKey) {
    return {
      ok: false,
      code: 'missing_api_key',
      message: `Configure hosted API key (${describeAiSecretsStorageHint()}).`
    };
  }

  const url = joinOpenAiCompatibleUrl(base, 'chat/completions');
  const model = input.model?.trim() || settings.aiBridge.chatModelId;
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 55_000);

  try {
    const res = await retryFetch(url, {
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
        message: redactProviderText(openAiCompatibleHttpDetail(res.status, parsed)),
        status: res.status,
        raw: redactProviderText(parsed)
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

/** Snapshot of where hosted chat vs embeddings POST (same policy + key; optional dedicated embed URL). */
export interface HostedNlpRoutingPreview {
  chatInferenceRoot: string;
  embeddingRootResolved: string;
  embeddingUsesInferenceFallback: boolean;
  chatModelId: string;
  embeddingModelId: string;
}

export function describeHostedNlpRouting(settings: AppSettings): HostedNlpRoutingPreview {
  const inferenceBase = settings.aiBridge.inferenceBaseUrl.trim();
  const embeddingDedicated = settings.aiBridge.embeddingBaseUrl.trim();
  const embeddingRootResolved = embeddingDedicated.length > 0 ? embeddingDedicated : inferenceBase;
  return {
    chatInferenceRoot: inferenceBase,
    embeddingRootResolved,
    embeddingUsesInferenceFallback: embeddingDedicated.length === 0,
    chatModelId: settings.aiBridge.chatModelId,
    embeddingModelId: settings.aiBridge.embeddingModelId
  };
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

  const apiKey = await getOpenAiCompatibleApiKey(root);
  if (!apiKey) {
    return {
      ok: false,
      code: 'missing_api_key',
      message: `Configure hosted API key (${describeAiSecretsStorageHint()}).`
    };
  }

  const url = joinOpenAiCompatibleUrl(root, 'embeddings');
  const model = input.model?.trim() || settings.aiBridge.embeddingModelId;
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 55_000);

  try {
    const res = await retryFetch(url, {
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
        message: redactProviderText(openAiCompatibleHttpDetail(res.status, parsed)),
        status: res.status,
        raw: redactProviderText(parsed)
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
