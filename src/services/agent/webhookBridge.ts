import { RuntimeMessage } from '../messaging/messages';

type BridgePlatform = 'telegram' | 'whatsapp';

export interface WebhookBridgeEnvelope {
  version: 'v1';
  platform: BridgePlatform;
  timestamp: string;
  nonce: string;
  payload: unknown;
  signature: string;
}

export interface UnsignedWebhookBridgeEnvelope {
  version: 'v1';
  platform: BridgePlatform;
  timestamp: string;
  nonce: string;
  payload: unknown;
}

const DEFAULT_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const encoder = new TextEncoder();

const canonicalizeEnvelope = (envelope: UnsignedWebhookBridgeEnvelope) =>
  JSON.stringify({
    version: envelope.version,
    platform: envelope.platform,
    timestamp: envelope.timestamp,
    nonce: envelope.nonce,
    payload: envelope.payload
  });

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const fromHex = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error('Invalid hex signature format.');
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
};

const parseIsoTimestamp = (value: string) => {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const toUnsignedEnvelope = (envelope: WebhookBridgeEnvelope): UnsignedWebhookBridgeEnvelope => ({
  version: envelope.version,
  platform: envelope.platform,
  timestamp: envelope.timestamp,
  nonce: envelope.nonce,
  payload: envelope.payload
});

const importHmacKey = async (secret: string) => {
  const keyBytes = encoder.encode(secret);
  return crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify'
  ]);
};

export const signWebhookBridgeEnvelope = async (
  secret: string,
  envelope: UnsignedWebhookBridgeEnvelope
): Promise<string> => {
  const key = await importHmacKey(secret);
  const message = encoder.encode(canonicalizeEnvelope(envelope));
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, message);
  return toHex(new Uint8Array(signatureBuffer));
};

export const verifyWebhookBridgeEnvelope = async (
  secret: string,
  envelope: WebhookBridgeEnvelope,
  options?: { maxClockSkewMs?: number; now?: Date }
): Promise<{ valid: boolean; reason?: string }> => {
  if (!secret.trim()) {
    return { valid: false, reason: 'Bridge secret is empty.' };
  }
  if (envelope.version !== 'v1') {
    return { valid: false, reason: `Unsupported bridge envelope version: ${envelope.version}` };
  }
  if (!envelope.nonce.trim()) {
    return { valid: false, reason: 'Missing bridge nonce.' };
  }

  const timestampMs = parseIsoTimestamp(envelope.timestamp);
  if (!Number.isFinite(timestampMs)) {
    return { valid: false, reason: 'Invalid envelope timestamp.' };
  }

  const nowMs = (options?.now ?? new Date()).getTime();
  const maxClockSkewMs = options?.maxClockSkewMs ?? DEFAULT_MAX_CLOCK_SKEW_MS;
  if (Math.abs(nowMs - timestampMs) > maxClockSkewMs) {
    return { valid: false, reason: 'Envelope timestamp outside allowed clock skew.' };
  }

  let incomingBytes: Uint8Array;
  try {
    incomingBytes = fromHex(envelope.signature);
  } catch (error) {
    return {
      valid: false,
      reason: error instanceof Error ? error.message : 'Invalid envelope signature.'
    };
  }

  const key = await importHmacKey(secret);
  const message = encoder.encode(canonicalizeEnvelope(toUnsignedEnvelope(envelope)));
  const incomingBuffer = Uint8Array.from(incomingBytes).buffer;
  const valid = await crypto.subtle.verify('HMAC', key, incomingBuffer, message);
  if (!valid) {
    return { valid: false, reason: 'Signature verification failed.' };
  }

  return { valid: true };
};

export const toRuntimeWebhookMessage = (
  envelope: WebhookBridgeEnvelope
): Extract<RuntimeMessage, { type: 'AGENT_CHANNEL_WEBHOOK' }> => ({
  type: 'AGENT_CHANNEL_WEBHOOK',
  payload: {
    platform: envelope.platform,
    raw: envelope.payload
  }
});
