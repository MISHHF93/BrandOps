import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { createServer, request as httpRequest, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const BRIDGE_SECRET = 'bridge-shared-test-secret';
const PROXY_ENVIRONMENT_KEYS = [
  'BRIDGE_ENABLE_LOCAL_RECEIVER',
  'BRIDGE_PROXY_PORT',
  'BRIDGE_SHARED_SECRET',
  'BRIDGE_TARGET_URL',
  'BRIDGE_UPSTREAM_TIMEOUT_MS',
  'BRIDGE_RATE_LIMIT',
  'BRIDGE_RATE_LIMIT_WINDOW_MS',
  'BRIDGE_RATE_LIMIT_MAX',
  'TELEGRAM_WEBHOOK_TOKEN',
  'WHATSAPP_APP_SECRET',
  'WHATSAPP_VERIFY_TOKEN'
] as const;

type Cleanup = () => Promise<void>;
type UpstreamRequest = {
  body: string;
  headers: Record<string, string | string[] | undefined>;
  method: string | undefined;
  url: string | undefined;
};

const cleanups: Cleanup[] = [];

afterEach(async () => {
  const results = await Promise.allSettled(
    cleanups
      .splice(0)
      .reverse()
      .map((cleanup) => cleanup())
  );
  const failed = results.find((result) => result.status === 'rejected');
  if (failed?.status === 'rejected') throw failed.reason;
});

const startProxy = async (overrides: Record<string, string> = {}) => {
  const childEnvironment = { ...process.env };
  for (const key of PROXY_ENVIRONMENT_KEYS) delete childEnvironment[key];

  Object.assign(childEnvironment, {
    BRIDGE_PROXY_PORT: '0',
    BRIDGE_SHARED_SECRET: BRIDGE_SECRET,
    BRIDGE_TARGET_URL: 'http://127.0.0.1:9/unreachable',
    BRIDGE_UPSTREAM_TIMEOUT_MS: '1000',
    ...overrides
  });

  const child = spawn(process.execPath, [resolve(process.cwd(), 'scripts/bridge-proxy.mjs')], {
    cwd: process.cwd(),
    env: childEnvironment,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  let stderr = '';
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });

  let port: number;
  try {
    port = await new Promise<number>((resolvePort, rejectPort) => {
      let stdout = '';
      const startupTimeout = setTimeout(() => {
        rejectPort(new Error(`Bridge proxy did not start. stderr: ${stderr}`));
      }, 5000);

      const cleanupListeners = () => {
        clearTimeout(startupTimeout);
        child.stdout.off('data', onStdout);
        child.off('error', onError);
        child.off('exit', onExit);
      };
      const onStdout = (chunk: string) => {
        stdout += chunk;
        const match = stdout.match(/listening on http:\/\/localhost:(\d+)/);
        if (!match) return;
        cleanupListeners();
        resolvePort(Number(match[1]));
      };
      const onError = (error: Error) => {
        cleanupListeners();
        rejectPort(error);
      };
      const onExit = (code: number | null) => {
        cleanupListeners();
        rejectPort(new Error(`Bridge proxy exited with code ${code}. stderr: ${stderr}`));
      };

      child.stdout.on('data', onStdout);
      child.once('error', onError);
      child.once('exit', onExit);
    });
  } catch (error) {
    child.kill();
    throw error;
  }

  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise<void>((resolveExit) => {
      child.once('exit', () => resolveExit());
    });
    child.kill();
    await exited;
  };
  cleanups.push(stop);

  return { baseUrl: `http://127.0.0.1:${port}`, stop };
};

const startUpstream = async (
  handler?: (request: UpstreamRequest, response: ServerResponse) => void | Promise<void>
) => {
  const requests: UpstreamRequest[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const captured = {
      body: Buffer.concat(chunks).toString('utf8'),
      headers: request.headers,
      method: request.method,
      url: request.url
    };
    requests.push(captured);
    if (handler) {
      await handler(captured, response);
      return;
    }
    response.writeHead(204);
    response.end();
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', rejectListen);
      resolveListen();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Upstream server has no TCP port.');

  const close = async () => {
    if (!server.listening) return;
    const closed = new Promise<void>((resolveClose, rejectClose) => {
      server.close((error) => (error ? rejectClose(error) : resolveClose()));
    });
    server.closeAllConnections();
    await closed;
  };
  cleanups.push(close);

  return { requests, url: `http://127.0.0.1:${address.port}/agent-bridge` };
};

const canonicalize = (envelope: Record<string, unknown>) =>
  JSON.stringify({
    version: envelope.version,
    platform: envelope.platform,
    timestamp: envelope.timestamp,
    nonce: envelope.nonce,
    payload: envelope.payload
  });

const sign = (secret: string, value: string) =>
  createHmac('sha256', secret).update(value).digest('hex');

const postChunked = async (url: string, headers: Record<string, string>, chunks: string[]) =>
  new Promise<{ body: string; status: number | undefined }>((resolveResponse, rejectResponse) => {
    const request = httpRequest(url, { method: 'POST', headers }, (response) => {
      const responseChunks: Buffer[] = [];
      response.on('data', (chunk) => responseChunks.push(Buffer.from(chunk)));
      response.once('end', () => {
        resolveResponse({
          body: Buffer.concat(responseChunks).toString('utf8'),
          status: response.statusCode
        });
      });
    });
    request.once('error', rejectResponse);
    for (const chunk of chunks) request.write(chunk);
    request.end();
  });

describe('bridge proxy HTTP boundaries', () => {
  it('fails closed when provider POST authentication secrets are absent', async () => {
    const proxy = await startProxy();

    const telegramResponse = await fetch(`${proxy.baseUrl}/webhooks/telegram`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    expect(telegramResponse.status).toBe(503);
    await expect(telegramResponse.json()).resolves.toMatchObject({
      ok: false,
      error: 'TELEGRAM_WEBHOOK_TOKEN is not set.'
    });

    const whatsappResponse = await fetch(`${proxy.baseUrl}/webhooks/whatsapp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    expect(whatsappResponse.status).toBe(503);
    await expect(whatsappResponse.json()).resolves.toMatchObject({
      ok: false,
      error: 'WHATSAPP_APP_SECRET is not set.'
    });
  });

  it('verifies the Telegram secret token and forwards only the signed envelope', async () => {
    const telegramToken = 'telegram-secret-token';
    const upstream = await startUpstream();
    const proxy = await startProxy({
      BRIDGE_TARGET_URL: upstream.url,
      TELEGRAM_WEBHOOK_TOKEN: telegramToken
    });

    const rejected = await fetch(`${proxy.baseUrl}/webhooks/telegram`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    expect(rejected.status).toBe(401);

    const payload = { message: { text: 'secure telegram message' } };
    const accepted = await fetch(`${proxy.baseUrl}/webhooks/telegram`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': telegramToken
      },
      body: JSON.stringify(payload)
    });
    expect(accepted.status).toBe(200);
    expect(upstream.requests).toHaveLength(1);

    const forwarded = JSON.parse(upstream.requests[0].body) as {
      type: string;
      payload: { envelope: Record<string, unknown>; secret?: string };
    };
    expect(forwarded.type).toBe('AGENT_BRIDGE_ENVELOPE');
    expect(forwarded.payload.secret).toBeUndefined();
    expect(forwarded.payload.envelope.payload).toEqual(payload);
    expect(forwarded.payload.envelope.signature).toBe(
      sign(BRIDGE_SECRET, canonicalize(forwarded.payload.envelope))
    );
  });

  it('authenticates WhatsApp POSTs with x-hub-signature-256, independent of the GET token', async () => {
    const appSecret = 'whatsapp-app-secret';
    const upstream = await startUpstream();
    const proxy = await startProxy({
      BRIDGE_TARGET_URL: upstream.url,
      WHATSAPP_APP_SECRET: appSecret,
      WHATSAPP_VERIFY_TOKEN: 'get-subscription-token-only'
    });
    const rawBody = JSON.stringify({ entry: [{ id: 'whatsapp-event' }] });

    const accepted = await fetch(`${proxy.baseUrl}/webhooks/whatsapp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': `sha256=${sign(appSecret, rawBody)}`
      },
      body: rawBody
    });
    expect(accepted.status).toBe(200);
    expect(upstream.requests).toHaveLength(1);

    const rejected = await fetch(`${proxy.baseUrl}/webhooks/whatsapp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-verify-token': 'get-subscription-token-only'
      },
      body: rawBody
    });
    expect(rejected.status).toBe(401);
    expect(upstream.requests).toHaveLength(1);
  });

  it('rejects request bodies larger than 1 MiB with 413', async () => {
    const proxy = await startProxy({ TELEGRAM_WEBHOOK_TOKEN: 'telegram-secret-token' });
    const oversizedBody = JSON.stringify({ data: 'x'.repeat(1024 * 1024) });

    const response = await fetch(`${proxy.baseUrl}/webhooks/telegram`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': 'telegram-secret-token'
      },
      body: oversizedBody
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'Request body exceeds the 1 MiB limit.'
    });

    const chunkedResponse = await postChunked(
      `${proxy.baseUrl}/webhooks/telegram`,
      {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': 'telegram-secret-token'
      },
      ['x'.repeat(1024 * 1024), 'x']
    );
    expect(chunkedResponse.status).toBe(413);
    expect(JSON.parse(chunkedResponse.body)).toMatchObject({
      ok: false,
      error: 'Request body exceeds the 1 MiB limit.'
    });
  });

  it('aborts a stalled upstream request and returns 504', async () => {
    const upstream = await startUpstream(() => undefined);
    const proxy = await startProxy({
      BRIDGE_TARGET_URL: upstream.url,
      BRIDGE_UPSTREAM_TIMEOUT_MS: '100',
      TELEGRAM_WEBHOOK_TOKEN: 'telegram-secret-token'
    });

    const response = await fetch(`${proxy.baseUrl}/webhooks/telegram`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': 'telegram-secret-token'
      },
      body: '{}'
    });

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'Upstream request timed out after 100ms.'
    });
  });

  it('validates local receiver envelope shape and HMAC with its configured secret', async () => {
    const proxy = await startProxy({ BRIDGE_ENABLE_LOCAL_RECEIVER: '1' });
    const unsignedEnvelope = {
      version: 'v1',
      platform: 'telegram',
      timestamp: '2026-08-10T12:00:00.000Z',
      nonce: 'local-receiver-nonce',
      payload: { message: { text: 'authenticated locally' } }
    };
    const envelope = {
      ...unsignedEnvelope,
      signature: sign(BRIDGE_SECRET, canonicalize(unsignedEnvelope))
    };

    const accepted = await fetch(`${proxy.baseUrl}/agent-bridge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'AGENT_BRIDGE_ENVELOPE', payload: { envelope } })
    });
    expect(accepted.status).toBe(200);
    await expect(accepted.json()).resolves.toMatchObject({
      ok: true,
      service: 'bridge-proxy-local-receiver'
    });

    const badSignature = await fetch(`${proxy.baseUrl}/agent-bridge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'AGENT_BRIDGE_ENVELOPE',
        payload: { envelope: { ...envelope, signature: '0'.repeat(64) } }
      })
    });
    expect(badSignature.status).toBe(401);

    const malformed = await fetch(`${proxy.baseUrl}/agent-bridge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'AGENT_BRIDGE_ENVELOPE', payload: { envelope: {} } })
    });
    expect(malformed.status).toBe(400);
  });

  it('rejects inbound POSTs beyond the fixed-window rate limit with 429', async () => {
    const proxy = await startProxy({
      BRIDGE_ENABLE_LOCAL_RECEIVER: '1',
      BRIDGE_RATE_LIMIT: '1',
      BRIDGE_RATE_LIMIT_MAX: '3',
      BRIDGE_RATE_LIMIT_WINDOW_MS: '60000'
    });
    const unsignedEnvelope = {
      version: 'v1',
      platform: 'telegram',
      timestamp: '2026-08-10T12:00:00.000Z',
      nonce: 'rate-limit-nonce',
      payload: { message: { text: 'within budget' } }
    };
    const envelope = {
      ...unsignedEnvelope,
      signature: sign(BRIDGE_SECRET, canonicalize(unsignedEnvelope))
    };
    const postEnvelope = () =>
      fetch(`${proxy.baseUrl}/agent-bridge`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'AGENT_BRIDGE_ENVELOPE', payload: { envelope } })
      });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await postEnvelope();
      expect(response.status).toBe(200);
    }

    const limited = await postEnvelope();
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');
    await expect(limited.json()).resolves.toMatchObject({
      ok: false,
      error: 'Rate limit exceeded. Try again shortly.'
    });

    const health = await fetch(`${proxy.baseUrl}/health`);
    expect(health.status).toBe(200);
  });

  it('does not buffer or reflect an upstream error body', async () => {
    const sentinel = 'receiver-private-debug-secret';
    const upstream = await startUpstream((_request, response) => {
      response.writeHead(500, { 'content-type': 'text/plain' });
      response.end(sentinel);
    });
    const proxy = await startProxy({
      BRIDGE_TARGET_URL: upstream.url,
      TELEGRAM_WEBHOOK_TOKEN: 'telegram-secret-token'
    });

    const response = await fetch(`${proxy.baseUrl}/webhooks/telegram`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': 'telegram-secret-token'
      },
      body: '{}'
    });
    const responseText = await response.text();

    expect(response.status).toBe(502);
    expect(responseText).not.toContain(sentinel);
    expect(JSON.parse(responseText)).toMatchObject({
      ok: false,
      upstreamStatus: 500
    });
  });

  it('refuses upstream redirects so signed payloads cannot be replayed to another origin', async () => {
    const redirectTarget = await startUpstream();
    const redirectingUpstream = await startUpstream((_request, response) => {
      response.writeHead(307, { location: redirectTarget.url });
      response.end();
    });
    const proxy = await startProxy({
      BRIDGE_TARGET_URL: redirectingUpstream.url,
      TELEGRAM_WEBHOOK_TOKEN: 'telegram-secret-token'
    });

    const response = await fetch(`${proxy.baseUrl}/webhooks/telegram`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': 'telegram-secret-token'
      },
      body: '{}'
    });

    expect(response.status).toBe(502);
    expect(redirectingUpstream.requests).toHaveLength(1);
    expect(redirectTarget.requests).toHaveLength(0);
  });

  it('maps upstream connection failures to a generic 502', async () => {
    const proxy = await startProxy({ TELEGRAM_WEBHOOK_TOKEN: 'telegram-secret-token' });

    const response = await fetch(`${proxy.baseUrl}/webhooks/telegram`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': 'telegram-secret-token'
      },
      body: '{}'
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Upstream receiver request failed.'
    });
  });

  it('normalizes the shared secret and rejects secrets shorter than 24 characters', async () => {
    const upstream = await startUpstream();
    const proxy = await startProxy({
      BRIDGE_SHARED_SECRET: `  ${BRIDGE_SECRET}  `,
      BRIDGE_TARGET_URL: upstream.url,
      TELEGRAM_WEBHOOK_TOKEN: 'telegram-secret-token'
    });

    const accepted = await fetch(`${proxy.baseUrl}/webhooks/telegram`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': 'telegram-secret-token'
      },
      body: '{}'
    });
    expect(accepted.status).toBe(200);
    const forwarded = JSON.parse(upstream.requests[0].body) as {
      payload: { envelope: Record<string, unknown> };
    };
    expect(forwarded.payload.envelope.signature).toBe(
      sign(BRIDGE_SECRET, canonicalize(forwarded.payload.envelope))
    );

    await expect(startProxy({ BRIDGE_SHARED_SECRET: 'too-short' })).rejects.toThrow(
      'at least 24 characters'
    );
  });

  it('uses stable provider delivery IDs as replay nonces', async () => {
    const upstream = await startUpstream();
    const proxy = await startProxy({
      BRIDGE_TARGET_URL: upstream.url,
      TELEGRAM_WEBHOOK_TOKEN: 'telegram-secret-token'
    });
    const payload = {
      update_id: 987654,
      message: { text: 'add note: retry-safe', from: { id: 42 } }
    };

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`${proxy.baseUrl}/webhooks/telegram`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-telegram-bot-api-secret-token': 'telegram-secret-token'
        },
        body: JSON.stringify(payload)
      });
      expect(response.status).toBe(200);
    }

    expect(upstream.requests).toHaveLength(2);
    const nonces = upstream.requests.map((request) => {
      const forwarded = JSON.parse(request.body) as {
        payload: { envelope: { nonce: string } };
      };
      return forwarded.payload.envelope.nonce;
    });
    expect(nonces).toEqual(['telegram:update:987654', 'telegram:update:987654']);
  });
});
