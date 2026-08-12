import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.BRIDGE_PROXY_PORT ?? 8787);
const SHARED_SECRET = (process.env.BRIDGE_SHARED_SECRET ?? '').trim();
const TARGET_URL = (process.env.BRIDGE_TARGET_URL ?? '').trim();
const TELEGRAM_TOKEN = process.env.TELEGRAM_WEBHOOK_TOKEN ?? '';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? '';
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? '';
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = (() => {
  const configured = Number(process.env.BRIDGE_UPSTREAM_TIMEOUT_MS ?? 10_000);
  return Number.isSafeInteger(configured) && configured > 0 ? configured : 10_000;
})();
const LOCAL_RECEIVER_ENABLED =
  process.env.BRIDGE_ENABLE_LOCAL_RECEIVER === '1' ||
  process.env.BRIDGE_ENABLE_LOCAL_RECEIVER === 'true';

/** Fixed-window rate limit (P1-2). Defaults: 60 inbound POSTs per IP per minute; off unless `BRIDGE_RATE_LIMIT=1`. */
const RATE_LIMIT_ENABLED =
  process.env.BRIDGE_RATE_LIMIT === '1' || process.env.BRIDGE_RATE_LIMIT === 'true';
const RATE_LIMIT_WINDOW_MS = (() => {
  const v = Number(process.env.BRIDGE_RATE_LIMIT_WINDOW_MS ?? 60_000);
  return Number.isSafeInteger(v) && v > 0 ? v : 60_000;
})();
const RATE_LIMIT_MAX = (() => {
  const v = Number(process.env.BRIDGE_RATE_LIMIT_MAX ?? 60);
  return Number.isSafeInteger(v) && v > 0 ? v : 60;
})();
const rateBuckets = new Map();

const clientKey = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return `fwd:${forwarded.split(',')[0].trim().slice(0, 64)}`;
  }
  return `ip:${String(req.socket.remoteAddress ?? 'unknown').slice(0, 64)}`;
};

const pruneRateBuckets = (now) => {
  if (rateBuckets.size < 1024) return;
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) rateBuckets.delete(key);
  }
};

const isRateLimited = (req, now) => {
  const key = clientKey(req);
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    pruneRateBuckets(now);
    rateBuckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
};

if (SHARED_SECRET.length < 24) {
  console.error('[bridge-proxy] BRIDGE_SHARED_SECRET must be at least 24 characters.');
  process.exit(1);
}
const isAllowedTargetUrl = (() => {
  try {
    const parsed = new URL(TARGET_URL);
    if (parsed.username || parsed.password) return false;
    if (parsed.protocol === 'https:') return true;
    return (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '[::1]')
    );
  } catch {
    return false;
  }
})();
if (!isAllowedTargetUrl) {
  console.error(
    '[bridge-proxy] BRIDGE_TARGET_URL must use HTTPS (HTTP is allowed only for loopback development).'
  );
  process.exit(1);
}

const canonicalize = (envelope) =>
  JSON.stringify({
    version: envelope.version,
    platform: envelope.platform,
    timestamp: envelope.timestamp,
    nonce: envelope.nonce,
    payload: envelope.payload
  });

const signEnvelope = (unsignedEnvelope) =>
  createHmac('sha256', SHARED_SECRET).update(canonicalize(unsignedEnvelope)).digest('hex');

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

class RequestBodyTooLargeError extends Error {}
class InvalidJsonError extends Error {}
class UpstreamTimeoutError extends Error {}
class UpstreamRequestError extends Error {}

const readRequestBody = async (req) => {
  const contentLength = req.headers['content-length'];
  if (
    typeof contentLength === 'string' &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > MAX_REQUEST_BODY_BYTES
  ) {
    req.resume();
    throw new RequestBodyTooLargeError('Request body exceeds the 1 MiB limit.');
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_REQUEST_BODY_BYTES) {
      req.resume();
      throw new RequestBodyTooLargeError('Request body exceeds the 1 MiB limit.');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, totalBytes);
};

const parseRequestJson = (raw) => {
  if (raw.length === 0) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    throw new InvalidJsonError('Request body must be valid JSON.');
  }
};

const verifyWhatsAppSignature = (rawBuffer, headerValue) => {
  if (!headerValue || typeof headerValue !== 'string' || !headerValue.startsWith('sha256=')) {
    return false;
  }
  const receivedHex = headerValue.slice('sha256='.length);
  if (!/^[a-f0-9]{64}$/i.test(receivedHex)) return false;
  const expected = createHmac('sha256', WHATSAPP_APP_SECRET).update(rawBuffer).digest();
  const received = Buffer.from(receivedHex, 'hex');
  return timingSafeEqual(received, expected);
};

const verifyTelegramRequest = (req) => {
  const token = req.headers['x-telegram-bot-api-secret-token'];
  if (typeof token !== 'string') return false;
  const expected = Buffer.from(TELEGRAM_TOKEN);
  const received = Buffer.from(token);
  return received.length === expected.length && timingSafeEqual(received, expected);
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const providerDeliveryNonce = (platform, payload) => {
  if (platform === 'telegram' && isRecord(payload)) {
    const updateId = payload.update_id;
    if (typeof updateId === 'number' || typeof updateId === 'string') {
      const normalized = String(updateId).trim().slice(0, 160);
      if (normalized) return `telegram:update:${normalized}`;
    }
  }

  if (platform === 'whatsapp' && isRecord(payload)) {
    const entry = Array.isArray(payload.entry) ? payload.entry[0] : undefined;
    const change = isRecord(entry) && Array.isArray(entry.changes) ? entry.changes[0] : undefined;
    const value = isRecord(change) && isRecord(change.value) ? change.value : undefined;
    const message =
      isRecord(value) && Array.isArray(value.messages) ? value.messages[0] : undefined;
    const messageId = isRecord(message) ? message.id : undefined;
    if (typeof messageId === 'string') {
      const normalized = messageId.trim().slice(0, 160);
      if (normalized) return `whatsapp:message:${normalized}`;
    }
  }

  return randomUUID();
};

const isValidEnvelopeShape = (envelope) =>
  isRecord(envelope) &&
  envelope.version === 'v1' &&
  (envelope.platform === 'telegram' || envelope.platform === 'whatsapp') &&
  typeof envelope.timestamp === 'string' &&
  Number.isFinite(Date.parse(envelope.timestamp)) &&
  typeof envelope.nonce === 'string' &&
  envelope.nonce.trim().length > 0 &&
  Object.prototype.hasOwnProperty.call(envelope, 'payload') &&
  typeof envelope.signature === 'string' &&
  /^[a-f0-9]{64}$/i.test(envelope.signature);

const verifyEnvelopeSignature = (envelope) => {
  const expected = createHmac('sha256', SHARED_SECRET).update(canonicalize(envelope)).digest();
  const received = Buffer.from(envelope.signature, 'hex');
  return timingSafeEqual(received, expected);
};

const forwardEnvelope = async (envelope) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  timeout.unref();

  try {
    const response = await fetch(TARGET_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'AGENT_BRIDGE_ENVELOPE',
        payload: { envelope }
      }),
      redirect: 'error',
      signal: controller.signal
    });

    await response.body?.cancel();
    return {
      ok: response.ok,
      status: response.status
    };
  } catch {
    if (controller.signal.aborted) {
      throw new UpstreamTimeoutError(`Upstream request timed out after ${UPSTREAM_TIMEOUT_MS}ms.`);
    }
    throw new UpstreamRequestError('Upstream receiver request failed.');
  } finally {
    clearTimeout(timeout);
  }
};

const server = createServer(async (req, res) => {
  try {
    if (!req.url || !req.method) {
      sendJson(res, 400, { ok: false, error: 'Invalid request.' });
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, { ok: true, service: 'bridge-proxy' });
      return;
    }

    if (req.method === 'POST' && req.url === '/agent-bridge') {
      if (RATE_LIMIT_ENABLED && isRateLimited(req, Date.now())) {
        res.setHeader('retry-after', Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
        sendJson(res, 429, { ok: false, error: 'Rate limit exceeded. Try again shortly.' });
        return;
      }
      if (!LOCAL_RECEIVER_ENABLED) {
        sendJson(res, 404, { ok: false, error: 'Local bridge receiver is disabled.' });
        return;
      }
      const raw = await readRequestBody(req);
      const json = parseRequestJson(raw);
      const envelope =
        isRecord(json) &&
        json.type === 'AGENT_BRIDGE_ENVELOPE' &&
        isRecord(json.payload) &&
        isValidEnvelopeShape(json.payload.envelope)
          ? json.payload.envelope
          : null;
      if (!envelope) {
        sendJson(res, 400, { ok: false, error: 'Invalid bridge envelope.' });
        return;
      }
      if (!verifyEnvelopeSignature(envelope)) {
        sendJson(res, 401, { ok: false, error: 'Bridge envelope signature failed.' });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        service: 'bridge-proxy-local-receiver',
        receivedType: json.type
      });
      return;
    }

    /** WhatsApp Cloud API subscription verification (GET) */
    if (req.method === 'GET' && req.url?.startsWith('/webhooks/whatsapp')) {
      if (!WHATSAPP_VERIFY_TOKEN.trim()) {
        sendJson(res, 503, { ok: false, error: 'WHATSAPP_VERIFY_TOKEN is not set.' });
        return;
      }
      const u = new URL(req.url, 'http://127.0.0.1');
      const mode = u.searchParams.get('hub.mode');
      const token = u.searchParams.get('hub.verify_token');
      const challenge = u.searchParams.get('hub.challenge');
      if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN && challenge) {
        res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(challenge);
        return;
      }
      sendJson(res, 403, { ok: false, error: 'WhatsApp verification token mismatch.' });
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
      return;
    }

    if (RATE_LIMIT_ENABLED && isRateLimited(req, Date.now())) {
      res.setHeader('retry-after', Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
      sendJson(res, 429, { ok: false, error: 'Rate limit exceeded. Try again shortly.' });
      return;
    }

    const platform =
      req.url === '/webhooks/telegram'
        ? 'telegram'
        : req.url === '/webhooks/whatsapp'
          ? 'whatsapp'
          : null;

    if (!platform) {
      sendJson(res, 404, { ok: false, error: 'Unknown webhook route.' });
      return;
    }

    if (platform === 'telegram') {
      if (!TELEGRAM_TOKEN.trim()) {
        sendJson(res, 503, { ok: false, error: 'TELEGRAM_WEBHOOK_TOKEN is not set.' });
        return;
      }
      if (!verifyTelegramRequest(req)) {
        sendJson(res, 401, { ok: false, error: 'Telegram verification failed.' });
        return;
      }
    } else if (!WHATSAPP_APP_SECRET.trim()) {
      sendJson(res, 503, { ok: false, error: 'WHATSAPP_APP_SECRET is not set.' });
      return;
    }

    const raw = await readRequestBody(req);
    if (
      platform === 'whatsapp' &&
      !verifyWhatsAppSignature(raw, req.headers['x-hub-signature-256'])
    ) {
      sendJson(res, 401, { ok: false, error: 'WhatsApp payload signature failed.' });
      return;
    }
    const payload = parseRequestJson(raw);
    const unsignedEnvelope = {
      version: 'v1',
      platform,
      timestamp: new Date().toISOString(),
      nonce: providerDeliveryNonce(platform, payload),
      payload
    };
    const signedEnvelope = {
      ...unsignedEnvelope,
      signature: signEnvelope(unsignedEnvelope)
    };

    const forwarded = await forwardEnvelope(signedEnvelope);
    sendJson(res, forwarded.ok ? 200 : 502, {
      ok: forwarded.ok,
      platform,
      upstreamStatus: forwarded.status
    });
  } catch (error) {
    const statusCode =
      error instanceof RequestBodyTooLargeError
        ? 413
        : error instanceof InvalidJsonError
          ? 400
          : error instanceof UpstreamTimeoutError
            ? 504
            : error instanceof UpstreamRequestError
              ? 502
              : 500;
    sendJson(res, statusCode, {
      ok: false,
      error:
        error instanceof RequestBodyTooLargeError ||
        error instanceof InvalidJsonError ||
        error instanceof UpstreamTimeoutError ||
        error instanceof UpstreamRequestError
          ? error.message
          : 'Internal proxy error.'
    });
  }
});

server.listen(PORT, () => {
  const address = server.address();
  const listeningPort = typeof address === 'object' && address ? address.port : PORT;
  console.log(`[bridge-proxy] listening on http://localhost:${listeningPort}`);
});
