/**
 * The webhook connector against a real HTTP server.
 *
 * D7 has read "no live delivery verified" since this scorecard was written, and
 * the reason given was credentials. That is true of Gmail, Slack and CRM
 * connectors. It is not true of the one connector that exists: an outbound
 * webhook POSTs to a URL, and a URL can be served by `node:http` on localhost
 * with nothing to authenticate against.
 *
 * Until now the connector was only ever exercised with an injected fake
 * `fetchImpl`. That proves the logic around the call and nothing about the call
 * — including, notably, whether the real `fetch` even satisfies the `FetchLike`
 * shape the module declares. A connector that has never touched a socket is a
 * connector nobody has seen work.
 *
 * So these tests use the global `fetch` against a server that records what
 * arrives. What is verified: the request reaches a listener, with the method,
 * content type and body the dispatcher intended; a server error is reported as a
 * failure rather than a success; a refused connection is a failure rather than a
 * crash; and the verification string carries evidence a person can check against
 * the receiving end.
 *
 * What is still **not** verified, and is not claimed: any vendor integration.
 * Delivery to Slack's API is not delivery to a socket that says 200.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createWebhookConnector } from '../../src/services/execution/connectors/webhookConnector';
import type { FetchLike } from '../../src/services/execution/connectors/webhookConnector';

interface Received {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

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

/** A real listener on a real port. */
async function listen(
  handler: (received: Received) => { status: number; body: string }
): Promise<{ url: string; received: Received[] }> {
  const received: Received[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      const entry: Received = {
        method: request.method ?? '',
        url: request.url ?? '',
        headers: request.headers,
        body: Buffer.concat(chunks).toString('utf8')
      };
      received.push(entry);
      const reply = handler(entry);
      response.writeHead(reply.status, { 'content-type': 'text/plain' });
      response.end(reply.body);
    });
  });
  servers.push(server);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (typeof address === 'string' || !address) throw new Error('no port assigned');
  return { url: `http://127.0.0.1:${address.port}/hook`, received };
}

/**
 * The real one. Passing global `fetch` here is itself part of the test: the
 * module declares a `FetchLike` shape, and nothing had ever confirmed the
 * platform's `fetch` satisfies it.
 */
const realFetch = fetch as unknown as FetchLike;

/**
 * Registered deliberately. The connector's default allowlist is
 * `['webhook-post', 'notify']`, and these fixtures send `send-email` — they
 * passed only because `execute` did not check its own list, which is the defect
 * the last test in this file found.
 */
const REGISTERED = ['send-email'];

const request = {
  action: 'send-email',
  target: 'someone@example.com',
  summary: 'Send the launch note',
  proposalId: 'proposal-1'
};

describe('a webhook actually reaches a listener', () => {
  it('delivers the action over HTTP', async () => {
    const { url, received } = await listen(() => ({ status: 200, body: 'accepted' }));
    const connector = createWebhookConnector({
      url,
      fetchImpl: realFetch,
      actions: ['send-email']
    });

    const result = await connector.execute(request);

    expect(result.ok).toBe(true);
    // The whole point: something arrived, at a real socket.
    expect(received).toHaveLength(1);
    expect(received[0].method).toBe('POST');
    expect(received[0].url).toBe('/hook');
  });

  it('sends the action as JSON the receiver can act on', async () => {
    const { url, received } = await listen(() => ({ status: 200, body: 'ok' }));
    await createWebhookConnector({ url, fetchImpl: realFetch, actions: ['send-email'] }).execute(
      request
    );

    expect(String(received[0].headers['content-type'])).toContain('application/json');
    const payload = JSON.parse(received[0].body);
    // A receiver has to be able to tell what was asked and about what.
    expect(payload.action).toBe('send-email');
    expect(payload.target).toBe('someone@example.com');
    expect(payload.proposalId).toBe('proposal-1');
  });

  it('returns evidence a person can check at the other end', async () => {
    const { url } = await listen(() => ({ status: 200, body: 'ok' }));
    const result = await createWebhookConnector({
      url,
      fetchImpl: realFetch,
      actions: ['send-email']
    }).execute(request);

    // Cycle 15 made receipts distinguish proven from claimed. This is where the
    // proof comes from, and it has to name the status and the host reached.
    expect(result.verification).toContain('200');
    expect(result.verification).toContain('127.0.0.1');
  });
});

describe('a delivery that does not succeed says so', () => {
  it('reports a server error as a failure', async () => {
    const { url, received } = await listen(() => ({ status: 500, body: 'boom' }));
    const result = await createWebhookConnector({
      url,
      fetchImpl: realFetch,
      actions: ['send-email']
    }).execute(request);

    // It arrived and was rejected. Reporting that as success is the fabricated
    // verification this codebase has had to remove twice.
    expect(received).toHaveLength(1);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('500');
  });

  it('reports a refused connection as a failure, not a crash', async () => {
    const { url } = await listen(() => ({ status: 200, body: 'ok' }));
    // Close it, then post into the hole.
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve) => {
            server.close(() => resolve());
          })
      )
    );

    const result = await createWebhookConnector({
      url,
      fetchImpl: realFetch,
      actions: ['send-email']
    }).execute(request);
    expect(result.ok).toBe(false);
    expect(
      result.error,
      'a dead endpoint must produce a reason, not an empty failure'
    ).toBeTruthy();
  });

  it('reports a 404 as a failure even though the socket answered', async () => {
    const { url } = await listen(() => ({ status: 404, body: 'no such hook' }));
    const result = await createWebhookConnector({
      url,
      fetchImpl: realFetch,
      actions: ['send-email']
    }).execute(request);
    // "The server replied" and "the action happened" are different facts.
    expect(result.ok).toBe(false);
  });
});

describe('what it refuses to send to', () => {
  it('refuses a non-http scheme without opening a socket', async () => {
    const connector = createWebhookConnector({
      url: 'file:///etc/passwd',
      fetchImpl: async () => {
        throw new Error('must not be called');
      },
      actions: REGISTERED
    });
    const result = await connector.execute(request);
    expect(result.ok).toBe(false);
  });

  it('refuses a URL carrying credentials', async () => {
    const connector = createWebhookConnector({
      url: 'https://user:secret@example.com/hook',
      fetchImpl: async () => {
        throw new Error('must not be called');
      },
      actions: REGISTERED
    });
    const result = await connector.execute(request);
    // A credential in a URL ends up in logs, receipts and error messages.
    expect(result.ok).toBe(false);
  });

  it('performs only the actions it was registered for', async () => {
    const { url, received } = await listen(() => ({ status: 200, body: 'ok' }));
    const connector = createWebhookConnector({
      url,
      fetchImpl: realFetch,
      actions: ['send-email']
    });

    expect(connector.actions).toEqual(['send-email']);
    // The dispatcher matches on this list; nothing outside it should reach the
    // socket even if the connector is handed it directly.
    await connector.execute({ ...request, action: 'delete-everything' });
    const posted = received.map((entry) => JSON.parse(entry.body).action);
    expect(posted).not.toContain('delete-everything');
  });
});
