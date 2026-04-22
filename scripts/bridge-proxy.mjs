import { createHmac, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.BRIDGE_PROXY_PORT ?? 8787);
const SHARED_SECRET = process.env.BRIDGE_SHARED_SECRET ?? '';
const TARGET_URL = process.env.BRIDGE_TARGET_URL ?? '';
const TELEGRAM_TOKEN = process.env.TELEGRAM_WEBHOOK_TOKEN ?? '';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? '';

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

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw);
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

    const payload = await readJsonBody(req);
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
