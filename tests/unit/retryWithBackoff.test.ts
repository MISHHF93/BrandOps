import { describe, it, expect, vi } from 'vitest';
import { retryFetch } from '../../src/services/ai/retryWithBackoff';

function makeResponse(status: number, body?: unknown, headers?: Record<string, string>): Response {
  return new Response(body != null ? JSON.stringify(body) : null, {
    status,
    headers: new Headers(headers)
  });
}

function makeFetch(responses: Array<{ response?: Response; error?: Error }>) {
  let callCount = 0;
  return vi.fn(async () => {
    const entry = responses[callCount++] ?? responses[responses.length - 1];
    if (entry.error) throw entry.error;
    return entry.response ?? makeResponse(200);
  });
}

describe('retryFetch', () => {
  it('returns immediately on success', async () => {
    const fetchFn = makeFetch([{ response: makeResponse(200, { ok: true }) }]);
    const res = await retryFetch('https://api.test.com/v1/chat', { method: 'POST' }, {}, fetchFn);
    expect(res.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('retries on 500 and succeeds', async () => {
    const fetchFn = makeFetch([
      { response: makeResponse(500) },
      { response: makeResponse(200, { ok: true }) }
    ]);
    const res = await retryFetch(
      'https://api.test.com/v1/chat',
      { method: 'POST' },
      { baseDelayMs: 10 },
      fetchFn
    );
    expect(res.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 and respects Retry-After', async () => {
    const fetchFn = makeFetch([
      { response: makeResponse(429, null, { 'retry-after': '0.01' }) },
      { response: makeResponse(200, { ok: true }) }
    ]);
    const res = await retryFetch(
      'https://api.test.com/v1/chat',
      { method: 'POST' },
      { baseDelayMs: 10 },
      fetchFn
    );
    expect(res.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 401 (permanent error)', async () => {
    const fetchFn = makeFetch([{ response: makeResponse(401) }]);
    const res = await retryFetch(
      'https://api.test.com/v1/chat',
      { method: 'POST' },
      { baseDelayMs: 10 },
      fetchFn
    );
    expect(res.status).toBe(401);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not retry on 403 (permanent error)', async () => {
    const fetchFn = makeFetch([{ response: makeResponse(403) }]);
    const res = await retryFetch(
      'https://api.test.com/v1/chat',
      { method: 'POST' },
      { baseDelayMs: 10 },
      fetchFn
    );
    expect(res.status).toBe(403);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('retries on network error and eventually throws', async () => {
    const fetchFn = makeFetch([
      { error: new TypeError('fetch failed') },
      { error: new TypeError('fetch failed') },
      { error: new TypeError('fetch failed') },
      { error: new TypeError('fetch failed') }
    ]);
    await expect(
      retryFetch(
        'https://api.test.com/v1/chat',
        { method: 'POST' },
        { maxRetries: 3, baseDelayMs: 10 },
        fetchFn
      )
    ).rejects.toThrow('fetch failed');
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it('returns last retryable response after maxRetries exhausted', async () => {
    const fetchFn = makeFetch([
      { response: makeResponse(503) },
      { response: makeResponse(503) },
      { response: makeResponse(503) },
      { response: makeResponse(503) }
    ]);
    const res = await retryFetch(
      'https://api.test.com/v1/chat',
      { method: 'POST' },
      { maxRetries: 3, baseDelayMs: 10 },
      fetchFn
    );
    expect(res.status).toBe(503);
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });
});
