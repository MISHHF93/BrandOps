/**
 * Server-side input validation for external-agent tool calls, plus the
 * prompt-injection guard. Every free-text field an agent supplies is sanitized,
 * length-capped, and screened before it is persisted or passed downstream.
 */

export const MAX_AGENT_FREE_TEXT = 4000;
export const MAX_AGENT_TITLE = 300;
export const MAX_AGENT_EVIDENCE_REFS = 12;
export const MAX_IDEMPOTENCY_KEY_LEN = 200;

function stripControlChars(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) continue;
    out += value[i];
  }
  return out;
}

export function sanitizeAgentText(
  value: unknown,
  fallback = '',
  max = MAX_AGENT_FREE_TEXT
): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = stripControlChars(value).replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

const INJECTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  {
    pattern:
      /\bignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|directives?)\b/i,
    label: 'instruction-override attempt'
  },
  { pattern: /\bdisregard\s+(all\s+)?(previous|prior)\b/i, label: 'instruction-override attempt' },
  {
    pattern:
      /\byou\s+are\s+now\s+(?:an?\s+|the\s+)?(?:openai|claude|gpt|a\.i\.|assistant|chatbot)\b/i,
    label: 'persona-injection attempt'
  },
  {
    pattern: /<(?:system|assistant|user|prompt|instructions?|goal)\s*>|<\[\||\[\[(?:sys|inst)/i,
    label: 'markup-injection attempt'
  },
  {
    pattern: /\breveal\s+(your|the)\s+(?:(?:system|hidden)\s+)*(?:system|hidden)\s+(?:prompt|instructions?)\b/i,
    label: 'prompt-exfiltration attempt'
  },
  {
    pattern:
      /\bdo\s+not\s+(?:follow|obey|listen\s+to)\s+(?:the\s+)?(?:system|previous)\s+(?:prompt|instructions?)\b/i,
    label: 'override attempt'
  },
  {
    pattern: /\b(?:pretend|act)\s+(?:you\s+are|as\s+if)\s+(?:a\s+)?(?:different|new)\s+persona\b/i,
    label: 'persona-injection attempt'
  }
];

export interface InjectionVerdict {
  injected: boolean;
  reason?: string;
}

export function detectPromptInjection(text: string): InjectionVerdict {
  const sample = text.slice(0, 2000);
  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(sample)) {
      return { injected: true, reason: `Suspected ${label} in inbound text.` };
    }
  }
  return { injected: false };
}

export function assertNoPromptInjection(...texts: Array<string | undefined>): void {
  for (const text of texts) {
    if (!text) continue;
    const verdict = detectPromptInjection(text);
    if (verdict.injected) {
      throw new AgentInputError(
        'prompt_injection_detected',
        verdict.reason ?? 'Suspected prompt injection.'
      );
    }
  }
}

/**
 * Screen user ASK input for prompt injection before it enters the AI pipeline.
 * Unlike agent text (which is fully rejected), ASK input from the user is the
 * authorized operator — but user-provided context (pasted web content, uploaded
 * documents, received messages) can carry indirect injection attempts.
 *
 * Returns the detection result. The caller decides whether to block, warn, or
 * proceed with a provenance note. This does NOT throw — it reports.
 */
export function screenAskInput(text: string): InjectionVerdict {
  return detectPromptInjection(text);
}

export class AgentInputError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AgentInputError';
  }
}

export function assertRequiredString(
  value: unknown,
  field: string,
  max = MAX_AGENT_FREE_TEXT
): string {
  const cleaned = sanitizeAgentText(value, '', max);
  if (!cleaned) {
    throw new AgentInputError('invalid_argument', `Missing required string argument "${field}".`);
  }
  return cleaned;
}

export function assertOptionalString(
  value: unknown,
  field: string,
  max = MAX_AGENT_FREE_TEXT
): string | undefined {
  if (value === undefined || value === null) return undefined;
  const cleaned = sanitizeAgentText(value, '', max);
  return cleaned || undefined;
}

export function assertEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[]
): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new AgentInputError(
    'invalid_argument',
    `Argument "${field}" must be one of: ${allowed.join(', ')}.`
  );
}

export function assertId(value: unknown, field: string, max = 200): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new AgentInputError(
      'invalid_argument',
      `Argument "${field}" must be a non-empty id (max ${max} chars).`
    );
  }
  return value.trim();
}

export function assertIdempotencyKey(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > MAX_IDEMPOTENCY_KEY_LEN) {
    throw new AgentInputError(
      'invalid_argument',
      'idempotencyKey must be a non-empty string (max 200 chars).'
    );
  }
  return value.trim();
}
