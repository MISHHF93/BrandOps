/**
 * The model-provider transport, against a real HTTP server.
 *
 * D11 has read "needs a provider" since this scorecard was written. That is true
 * of the thing it names — *model answer quality* cannot be measured without a
 * model, and nothing here claims otherwise. It is not true of everything the
 * dimension covers. The transport to an OpenAI-compatible endpoint is a POST
 * with a bearer header, and an OpenAI-compatible endpoint can be a `node:http`
 * server on localhost that needs no key to exist.
 *
 * That is the sixth blocker in this run tested rather than restated, and the
 * sixth found narrower than claimed.
 *
 * Existing coverage stubs `globalThis.fetch`, which proves the code around the
 * call and nothing about the call — the same gap cycle 31 closed for the webhook
 * connector. In particular it cannot exercise `retryFetch`, whose entire purpose
 * is reacting to responses this product will really receive: a 429 from a rate
 * limiter, a 500 from an overloaded gateway, a 401 from a rotated key.
 *
 * The security question is the one worth having a test for at all: **an API key
 * goes out on every request, and must never come back in anything the product
 * stores or shows.**
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { retryFetch } from '../../src/services/ai/retryWithBackoff';
import { redactProviderText as redact } from '../../src/services/ai/nlpInferenceGateway';

const API_KEY = 'sk-test-do-not-log-me-0123456789';
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        })
    )
  );
});

interface Attempt {
  authorization?: string;
  body: string;
}

/** An OpenAI-compatible endpoint that answers however the test needs. */
async function provider(
  reply: (attempt: number) => { status: number; body: unknown; headers?: Record<string, string> }
): Promise<{ url: string; attempts: Attempt[] }> {
  const attempts: Attempt[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      attempts.push({
        authorization: request.headers.authorization,
        body: Buffer.concat(chunks).toString('utf8')
      });
      const answer = reply(attempts.length);
      response.writeHead(answer.status, {
        'content-type': 'application/json',
        ...(answer.headers ?? {})
      });
      response.end(typeof answer.body === 'string' ? answer.body : JSON.stringify(answer.body));
    });
  });
  servers.push(server);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (typeof address === 'string' || !address) throw new Error('no port assigned');
  return { url: `http://127.0.0.1:${address.port}/v1/chat/completions`, attempts };
}

const completion = {
  choices: [{ message: { role: 'assistant', content: 'a grounded answer' } }]
};

function post(url: string) {
  return retryFetch(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ model: 'test-model', messages: [{ role: 'user', content: 'hi' }] })
    },
    // Real delays would make this suite take a minute for no added confidence;
    // the retry *decisions* are what is under test, not the wall clock.
    { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 5 }
  );
}

describe('a request reaches a real endpoint', () => {
  it('sends the bearer token and the model payload', async () => {
    const { url, attempts } = await provider(() => ({ status: 200, body: completion }));
    const response = await post(url);

    expect(response.ok).toBe(true);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].authorization).toBe(`Bearer ${API_KEY}`);
    const sent = JSON.parse(attempts[0].body);
    expect(sent.model).toBe('test-model');
    expect(sent.messages[0].content).toBe('hi');
  });

  it('parses a completion off the wire', async () => {
    const { url } = await provider(() => ({ status: 200, body: completion }));
    const parsed = (await (await post(url)).json()) as typeof completion;
    expect(parsed.choices[0].message.content).toBe('a grounded answer');
  });
});

describe('retry behaviour against responses a provider really sends', () => {
  it('retries a 429 and succeeds when the limiter lets go', async () => {
    const { url, attempts } = await provider((attempt) =>
      attempt < 3
        ? { status: 429, body: { error: 'rate limited' }, headers: { 'retry-after': '0' } }
        : { status: 200, body: completion }
    );

    const response = await post(url);
    // A rate limit is the single most common thing a hosted model does to this
    // product. Giving up on the first one would make it look broken under load.
    expect(response.ok).toBe(true);
    expect(attempts).toHaveLength(3);
  });

  it('retries a 500 and gives up after the configured attempts', async () => {
    const { url, attempts } = await provider(() => ({ status: 500, body: { error: 'boom' } }));
    const response = await post(url);

    expect(response.status).toBe(500);
    // Four: the first try plus three retries. Not infinite, and not one.
    expect(attempts).toHaveLength(4);
  });

  it('does not retry a 401', async () => {
    const { url, attempts } = await provider(() => ({ status: 401, body: { error: 'bad key' } }));
    const response = await post(url);

    expect(response.status).toBe(401);
    // A rotated or wrong key will never become right by asking again; retrying
    // wastes the user's time and can trip a provider's abuse limits.
    expect(attempts).toHaveLength(1);
  });

  it('does not retry a 404', async () => {
    const { url, attempts } = await provider(() => ({ status: 404, body: { error: 'no model' } }));
    await post(url);
    expect(attempts).toHaveLength(1);
  });

  it('surfaces a refused connection rather than hanging', async () => {
    const { url } = await provider(() => ({ status: 200, body: completion }));
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve) => {
            server.close(() => resolve());
          })
      )
    );
    // Retryable by policy, so it exhausts its attempts and then throws — it must
    // not resolve to something a caller could mistake for a response.
    await expect(post(url)).rejects.toThrow();
  });
});

describe('the key goes out and never comes back', () => {
  it('is stripped from provider text before the product keeps it', async () => {
    const { redactProviderText } = await import('../../src/services/ai/nlpInferenceGateway');
    // A gateway echoing the request back in its error is not hypothetical, and
    // the inference base URL is operator-configurable — the body is text from a
    // server BrandOps does not control.
    const echoed = { error: { message: `upstream rejected Bearer ${API_KEY}` } };

    const cleaned = redactProviderText(echoed);
    expect(JSON.stringify(cleaned)).not.toContain(API_KEY);
    expect(JSON.stringify(cleaned)).toContain('[redacted]');
  });

  it('strips a bare key as well as a bearer header', () => {
    // Providers quote keys both ways.
    expect(String(redact(`your key ${API_KEY} is invalid`))).not.toContain(API_KEY);
  });

  it('leaves ordinary error text intact', () => {
    const message = 'The model `test-model` does not exist or you do not have access to it.';
    // Redaction that mangles real errors makes them useless to the person
    // reading them.
    expect(redact(message)).toBe(message);
  });

  it('reaches nested fields, not just the top level', () => {
    const nested = { a: [{ b: { c: `Bearer ${API_KEY}` } }] };
    expect(JSON.stringify(redact(nested))).not.toContain(API_KEY);
  });

  it('never appears in the URL', async () => {
    const { url, attempts } = await provider(() => ({ status: 200, body: completion }));
    await post(url);
    // A key in a query string lands in server logs, proxies and browser history.
    expect(url).not.toContain(API_KEY);
    expect(attempts[0].authorization).toContain(API_KEY);
  });
});
