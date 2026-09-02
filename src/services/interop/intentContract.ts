/**
 * User Intent Contract — parsing and enforcement.
 *
 * A connection is not an authorization. Before BrandOps runs a consequential
 * capability it requires the caller to declare *what it is trying to do and
 * why*, so the gateway can check that the request belongs to work the user
 * authorized rather than trusting that possession of a granted capability is
 * self-justifying.
 *
 * Enforcement ladder (see `BRANDOPS_MCP_GATEWAY_DIRECTIVE.md` §6):
 * - `READ` capabilities        → no contract (reads are scoped by bundle grants).
 * - `GENERATE` / `PREPARE`     → contract synthesized when absent, always audited.
 * - `EXTERNAL_ACTION`          → `objective` + `reason` required.
 * - `SENSITIVE_ACTION`         → additionally requires explicit `confirm: true`.
 *
 * The contract is data, never instructions: every field is sanitized through the
 * same path as any other agent-supplied text before it is recorded.
 */
import type { AgentCapabilityId, AgentIntentContract } from '../../types/agentInterop';
import type { PermissionTier } from '../../types/executionState';
import { sanitizeAgentText } from './validation';

const MAX_LIST_ITEMS = 12;
const MAX_FIELD_LENGTH = 400;

export interface IntentContractVerdict {
  ok: boolean;
  contract?: AgentIntentContract;
  errorCode?: 'intent_contract_required' | 'intent_contract_expired' | 'confirmation_required';
  error?: string;
}

/** Tiers whose requests are consequential enough to require a declared contract. */
export function tierRequiresDeclaredIntent(tier: PermissionTier): boolean {
  return tier === 'EXTERNAL_ACTION' || tier === 'SENSITIVE_ACTION';
}

/** Tiers that carry a contract at all (reads are governed by bundle scope instead). */
export function tierCarriesIntent(tier: PermissionTier): boolean {
  return tier !== 'READ';
}

function textField(value: unknown): string {
  return sanitizeAgentText(value).slice(0, MAX_FIELD_LENGTH);
}

function listField(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => textField(item))
    .filter((item) => Boolean(item))
    .slice(0, MAX_LIST_ITEMS);
}

/**
 * Read the `intent` object off a tool call's arguments and decide whether the
 * request may proceed. Never throws — the gateway turns a verdict into an
 * audited failure so a rejected contract is as visible as a rejected token.
 */
export function parseIntentContract(input: {
  args: Record<string, unknown>;
  capabilityId: AgentCapabilityId;
  tier: PermissionTier;
  /** Free-text purpose from the call envelope, used when synthesizing. */
  purpose?: string;
  now?: Date;
}): IntentContractVerdict {
  const { args, capabilityId, tier } = input;
  const now = input.now ?? new Date();
  const raw = (args.intent ?? {}) as Record<string, unknown>;

  const objective = textField(raw.objective);
  const reason = textField(raw.reason);
  const declared = Boolean(objective || reason);

  if (tierRequiresDeclaredIntent(tier) && (!objective || !reason)) {
    return {
      ok: false,
      errorCode: 'intent_contract_required',
      error:
        `Capability ${capabilityId} is tier ${tier} and requires a User Intent Contract. ` +
        'Supply `intent: { objective, reason }` — and `constraints`/`allowedActions` where they apply.'
    };
  }

  const expiresAtRaw = textField(raw.expiresAt);
  let expiresAt: string | undefined;
  if (expiresAtRaw) {
    const parsed = new Date(expiresAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      return {
        ok: false,
        errorCode: 'intent_contract_expired',
        error: `intent.expiresAt is not a valid ISO timestamp: ${expiresAtRaw}`
      };
    }
    if (parsed.getTime() <= now.getTime()) {
      return {
        ok: false,
        errorCode: 'intent_contract_expired',
        error: `Intent contract expired at ${parsed.toISOString()}; it cannot authorize work now.`
      };
    }
    expiresAt = parsed.toISOString();
  }

  const confirmed = raw.confirm === true || raw.confirmed === true;
  if (tier === 'SENSITIVE_ACTION' && !confirmed) {
    return {
      ok: false,
      errorCode: 'confirmation_required',
      error:
        `Capability ${capabilityId} is tier SENSITIVE_ACTION. It requires explicit ` +
        '`intent.confirm: true` in addition to the objective and reason; nothing was recorded.'
    };
  }

  const contract: AgentIntentContract = {
    objective: objective || textField(input.purpose) || `Unstated objective for ${capabilityId}.`,
    reason: reason || `No reason declared by the client for ${capabilityId}.`,
    requestedCapability: capabilityId,
    allowedActions: listField(raw.allowedActions),
    constraints: listField(raw.constraints),
    confirmed,
    origin: declared ? 'declared' : 'synthesized',
    ...(textField(raw.target) ? { target: textField(raw.target) } : {}),
    ...(expiresAt ? { expiresAt } : {})
  };

  return { ok: true, contract };
}

/** One-line rendering for audit entries, receipts, and approval surfaces. */
export function formatIntentContract(contract: AgentIntentContract): string {
  const parts = [`objective: ${contract.objective}`, `reason: ${contract.reason}`];
  if (contract.target) parts.push(`target: ${contract.target}`);
  if (contract.allowedActions.length) parts.push(`allowed: ${contract.allowedActions.join(', ')}`);
  if (contract.constraints.length) parts.push(`constraints: ${contract.constraints.join(', ')}`);
  if (contract.expiresAt) parts.push(`expires: ${contract.expiresAt}`);
  parts.push(contract.origin === 'declared' ? 'declared by client' : 'synthesized by BrandOps');
  return parts.join(' | ');
}

/** JSON Schema fragment shared by every MCP tool that carries a contract. */
export const INTENT_CONTRACT_SCHEMA = {
  type: 'object',
  description:
    'User Intent Contract. Required for external and sensitive actions; recorded on every mutation.',
  properties: {
    objective: { type: 'string', description: 'What you are trying to accomplish for the user.' },
    reason: { type: 'string', description: 'Why this capability is the right way to do it.' },
    target: { type: 'string', description: 'Concrete target (recipient, account, plan id).' },
    allowedActions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Actions this contract authorizes. Anything else is out of contract.'
    },
    constraints: {
      type: 'array',
      items: { type: 'string' },
      description: 'Limits you commit to (budget, scope, do-not-touch).'
    },
    expiresAt: { type: 'string', description: 'ISO timestamp after which the contract is void.' },
    confirm: {
      type: 'boolean',
      description: 'Explicit confirmation. Required for SENSITIVE_ACTION capabilities.'
    }
  },
  required: []
} as const;
