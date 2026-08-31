/**
 * Generic async retry with exponential backoff and jitter.
 * Retries on transient errors (429, 5xx, network/abort); fails fast on
 * permanent errors (401, 403, 404).
 */

export interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface RetryResult<T> {
  ok: boolean;
  result?: T;
  error?: unknown;
  attempts: number;
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const PERMANENT_STATUS_CODES = new Set([401, 403, 404]);

function isRetryableError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof TypeError) return true;
  if (error instanceof Error && error.message.includes('fetch')) return true;
  return false;
}

function parseRetryAfter(response: Response): number | null {
  const header = response.headers.get('retry-after');
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.min(seconds * 1000, 60_000);
}

function computeDelay(attempt: number, config: Required<RetryConfig>, retryAfterMs: number | null): number {
  const exponential = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * config.baseDelayMs;
  const delay = Math.min(exponential + jitter, config.maxDelayMs);
  return retryAfterMs != null ? Math.max(delay, retryAfterMs) : delay;
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FetchLike {
  // eslint-disable-next-line no-undef -- DOM RequestInit type
  (url: string, init: RequestInit): Promise<Response>;
}

/**
 * Retries a fetch call with exponential backoff.
 * @param fetchFn - The fetch function to call (defaults to globalThis.fetch)
 * @param url - The URL to fetch
 * @param init - RequestInit options
 * @param config - Retry configuration
 * @returns The Response on success, or throws on non-retryable/permanent errors
 */
export async function retryFetch(
  url: string,
  // eslint-disable-next-line no-undef -- DOM RequestInit type
  init: RequestInit,
  config: RetryConfig = {},
  fetchFn: FetchLike = globalThis.fetch
): Promise<Response> {
  const cfg: Required<RetryConfig> = {
    maxRetries: config.maxRetries ?? 3,
    baseDelayMs: config.baseDelayMs ?? 1000,
    maxDelayMs: config.maxDelayMs ?? 30_000
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const response = await fetchFn(url, init);

      if (response.ok) return response;

      if (PERMANENT_STATUS_CODES.has(response.status)) {
        return response;
      }

      if (RETRYABLE_STATUS_CODES.has(response.status)) {
        lastError = new Error(`HTTP ${response.status}`);
        if (attempt < cfg.maxRetries) {
          const retryAfterMs = parseRetryAfter(response);
          await delayMs(computeDelay(attempt, cfg, retryAfterMs));
          continue;
        }
        return response;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < cfg.maxRetries && isRetryableError(error)) {
        await delayMs(computeDelay(attempt, cfg, null));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
