import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.BRIDGE_PROXY_PORT ?? 8787);
const SHARED_SECRET = process.env.BRIDGE_SHARED_SECRET ?? '';
const TARGET_URL = process.env.BRIDGE_TARGET_URL ?? '';
const TELEGRAM_TOKEN = process.env.TELEGRAM_WEBHOOK_TOKEN ?? '';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? '';
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? '';

if (!SHARED_SECRET) {
  console.error('[bridge-proxy] Missing BRIDGE_SHARED_SECRET.');
  process.exit(1);
}
if (!TARGET_URL) {
  console.error('[bridge-proxy] Missing BRIDGE_TARGET_URL.');
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

const readRequestBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  if (raw.length === 0) return { raw, json: {} };
  return { raw, json: JSON.parse(raw.toString('utf8')) };
};

const verifyWhatsAppSignature = (rawBuffer, headerValue) => {
  if (!WHATSAPP_APP_SECRET) return true;
  if (!headerValue || typeof headerValue !== 'string' || !headerValue.startsWith('sha256=')) {
    return false;
  }
  const expected = createHmac('sha256', WHATSAPP_APP_SECRET)
    .update(rawBuffer)
    .digest();
  const received = Buffer.from(headerValue.replace(/^sha256=/, ''), 'hex');
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
};

const verifyTelegramRequest = (req) => {
  if (!TELEGRAM_TOKEN) return true;
  const token = req.headers['x-telegram-bot-api-secret-token'];
  return token === TELEGRAM_TOKEN;
};

const verifyWhatsAppRequest = (req) => {
  if (!WHATSAPP_VERIFY_TOKEN) return true;
  const token = req.headers['x-verify-token'];
  return token === WHATSAPP_VERIFY_TOKEN;
};

const forwardEnvelope = async (envelope) => {
  const response = await fetch(TARGET_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'AGENT_BRIDGE_ENVELOPE',
      payload: {
        envelope,
        secret: SHARED_SECRET
      }
    })
  });

  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body: text
  };
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

    /** WhatsApp Cloud API subscription verification (GET) */
    if (req.method === 'GET' && req.url?.startsWith('/webhooks/whatsapp')) {
      if (!WHATSAPP_VERIFY_TOKEN) {
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

    if (platform === 'telegram' && !verifyTelegramRequest(req)) {
      sendJson(res, 401, { ok: false, error: 'Telegram verification failed.' });
      return;
    }

    if (platform === 'whatsapp' && !verifyWhatsAppRequest(req)) {
      sendJson(res, 401, { ok: false, error: 'WhatsApp verification failed.' });
      return;
    }

    const { raw, json: payload } = await readRequestBody(req);
    if (platform === 'whatsapp' && !verifyWhatsAppSignature(raw, req.headers['x-hub-signature-256'])) {
      sendJson(res, 401, { ok: false, error: 'WhatsApp payload signature failed.' });
      return;
    }
    const unsignedEnvelope = {
      version: 'v1',
      platform,
      timestamp: new Date().toISOString(),
      nonce: randomUUID(),
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
      upstreamStatus: forwarded.status,
      upstreamBody: forwarded.body
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown proxy error.'
    });
  }
});

server.listen(PORT, () => {
  console.log(`[bridge-proxy] listening on http://localhost:${PORT}`);
});
