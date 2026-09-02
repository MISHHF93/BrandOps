/**
 * Agent-to-agent handoffs: one session delegating a scoped piece of work to
 * another.
 *
 * `agentHandoffs` has been declared on `BrandOpsData` with a fully specified
 * type — required capabilities, minimum context, allowed and prohibited actions,
 * budgets, expiry, a seven-state lifecycle — and **nothing implemented it**. A
 * promise in the schema, found by a sweep for fields no reader touches.
 *
 * The single design rule, because delegation is the classic way authority grows
 * by accident:
 *
 *   **A handoff can only ever narrow. It never grants.**
 *
 * Concretely, and enforced in two places rather than one:
 *
 * - `proposeHandoff` refuses to write down a capability or context bundle the
 *   *source* session does not itself hold. You cannot delegate what you were
 *   never given.
 * - `effectiveCapabilities` intersects the handoff's requirements with what the
 *   *target* session holds right now, at the moment of use. So a handoff written
 *   while the target was privileged does not survive that privilege being
 *   revoked, and the stored handoff is never read as an authority in its own
 *   right.
 *
 * Either check alone would leave a hole. Without the first, a low-trust agent
 * could mint a handoff naming capabilities it never had and hand it to a
 * high-trust agent, laundering scope through the document. Without the second,
 * a handoff would be a capability grant frozen in time, outliving the revocation
 * it was supposed to respect. The directive's warning that possession of a
 * connection is not authorization applies exactly here: possession of a *handoff*
 * is not authorization either.
 *
 * Budgets are counted, not recorded. `recordHandoffUsage` refuses the call that
 * would cross a limit — not the one after it — and closes the handoff, because a
 * limit discovered after the spend is not a limit.
 *
 * Nothing here executes anything. In keeping with the rule the gateway states
 * for itself, a handoff produces reviewable state inside BrandOps; it is a
 * scoped request and a ledger, and every side effect still goes through the
 * capability path that already exists.
 */
import type {
  AgentCapabilityId,
  AgentHandoff,
  AgentHandoffsState,
  ContextBundleId,
  ExternalAgentSession
} from '../../types/agentInterop';
import { AGENT_CAPABILITY_IDS, CONTEXT_BUNDLE_IDS } from '../../types/agentInterop';
import type { BrandOpsData } from '../../types/domain';
import { getAgentSessionById } from './sessions';

/** Why a handoff operation was refused. Narrow on purpose: each maps to one rule. */
export type HandoffRefusalCode =
  | 'source_unknown'
  | 'source_revoked'
  | 'target_unknown'
  | 'target_revoked'
  | 'capability_not_held'
  | 'bundle_not_held'
  | 'contradictory_actions'
  | 'already_expired'
  | 'handoff_unknown'
  | 'wrong_state'
  | 'budget_exhausted'
  | 'invalid_input';

export interface HandoffResult {
  workspace: BrandOpsData;
  ok: boolean;
  handoff?: AgentHandoff;
  errorCode?: HandoffRefusalCode;
  error?: string;
}

export interface ProposeHandoffInput {
  /** The delegating session. Everything the handoff may contain derives from it. */
  sourceSessionId: string;
  /** The session being asked to do the work. */
  targetSessionId: string;
  objective: string;
  requiredCapabilities: string[];
  minimumContext: ContextBundleId[];
  allowedActions?: string[];
  prohibitedActions?: string[];
  expectedOutput: string;
  budget?: AgentHandoff['budget'];
  expiration?: string;
  sourceArtifacts?: string[];
  returnDestination?: string;
  checkpointId?: string;
}

const EMPTY: AgentHandoffsState = { entries: [], updatedAt: '' };

export function handoffsState(workspace: BrandOpsData): AgentHandoffsState {
  return workspace.agentHandoffs ?? EMPTY;
}

export function listHandoffs(workspace: BrandOpsData): AgentHandoff[] {
  return handoffsState(workspace).entries;
}

export function getHandoffById(workspace: BrandOpsData, id: string): AgentHandoff | undefined {
  return listHandoffs(workspace).find((entry) => entry.id === id);
}

function refuse(
  workspace: BrandOpsData,
  errorCode: HandoffRefusalCode,
  error: string
): HandoffResult {
  return { workspace, ok: false, errorCode, error };
}

function withEntries(workspace: BrandOpsData, entries: AgentHandoff[], now: string): BrandOpsData {
  return { ...workspace, agentHandoffs: { entries, updatedAt: now } };
}

function replaceEntry(workspace: BrandOpsData, next: AgentHandoff, now: string): BrandOpsData {
  return withEntries(
    workspace,
    listHandoffs(workspace).map((entry) => (entry.id === next.id ? next : entry)),
    now
  );
}

/** An active session, or the reason it cannot act. */
function activeSession(
  workspace: BrandOpsData,
  sessionId: string
): { session?: ExternalAgentSession; missing: boolean; revoked: boolean } {
  const session = getAgentSessionById(workspace, sessionId);
  if (!session) return { missing: true, revoked: false };
  if (session.status !== 'active') return { session, missing: false, revoked: true };
  return { session, missing: false, revoked: false };
}

function isExpired(handoff: AgentHandoff, now: string): boolean {
  return Boolean(handoff.expiration) && handoff.expiration! <= now;
}

/**
 * The capabilities this handoff actually confers, right now.
 *
 * An intersection, never a union, and recomputed on every use rather than read
 * from the handoff. Returns an empty list — not the target's own capabilities —
 * whenever the handoff is not usable, so a caller that forgets to check the
 * status still gets nothing rather than everything.
 */
export function effectiveCapabilities(
  workspace: BrandOpsData,
  handoffId: string,
  now = new Date().toISOString()
): AgentCapabilityId[] {
  const handoff = getHandoffById(workspace, handoffId);
  if (!handoff) return [];
  if (handoff.status !== 'accepted' && handoff.status !== 'in_progress') return [];
  if (isExpired(handoff, now)) return [];

  const target = activeSession(workspace, handoff.targetAgent);
  if (!target.session || target.revoked) return [];

  const required = new Set(handoff.requiredCapabilities);
  return target.session.grantedCapabilities.filter((cap) => required.has(cap));
}

/**
 * Write down a delegation, after checking the delegator could make it.
 *
 * Every refusal here is a rule about scope, not a validation nicety.
 */
export function proposeHandoff(
  workspace: BrandOpsData,
  input: ProposeHandoffInput,
  now = new Date().toISOString()
): HandoffResult {
  const objective = input.objective?.trim() ?? '';
  const expectedOutput = input.expectedOutput?.trim() ?? '';
  if (!objective || !expectedOutput) {
    return refuse(
      workspace,
      'invalid_input',
      'A handoff needs an objective and an expected output; without them nothing can judge whether it was met.'
    );
  }

  const source = activeSession(workspace, input.sourceSessionId);
  if (source.missing) return refuse(workspace, 'source_unknown', 'No such delegating session.');
  if (source.revoked)
    return refuse(workspace, 'source_revoked', 'The delegating session has been revoked.');

  const target = activeSession(workspace, input.targetSessionId);
  if (target.missing) return refuse(workspace, 'target_unknown', 'No such target session.');
  if (target.revoked)
    return refuse(workspace, 'target_revoked', 'The target session has been revoked.');

  if (input.expiration && input.expiration <= now) {
    return refuse(
      workspace,
      'already_expired',
      'That expiry is in the past, so the handoff could never be used.'
    );
  }

  const capabilities = input.requiredCapabilities.filter((cap): cap is AgentCapabilityId =>
    (AGENT_CAPABILITY_IDS as readonly string[]).includes(cap)
  );
  if (capabilities.length !== input.requiredCapabilities.length) {
    return refuse(workspace, 'invalid_input', 'A required capability is not a known capability.');
  }

  /**
   * The escalation check. A session cannot delegate authority it does not have,
   * so the handoff may not even *name* such a capability — recording it would
   * leave a document asserting a scope nobody ever held.
   */
  const held = new Set<string>(source.session!.grantedCapabilities);
  const overreach = capabilities.filter((cap) => !held.has(cap));
  if (overreach.length) {
    return refuse(
      workspace,
      'capability_not_held',
      `The delegating session does not hold ${overreach.join(', ')}, so it cannot hand them on.`
    );
  }

  const bundles = input.minimumContext.filter((bundle) =>
    (CONTEXT_BUNDLE_IDS as readonly string[]).includes(bundle)
  );
  if (bundles.length !== input.minimumContext.length) {
    return refuse(workspace, 'invalid_input', 'A requested context bundle is not a known bundle.');
  }
  const heldBundles = new Set<string>(source.session!.grantedBundles);
  const bundleOverreach = bundles.filter((bundle) => !heldBundles.has(bundle));
  if (bundleOverreach.length) {
    return refuse(
      workspace,
      'bundle_not_held',
      `The delegating session cannot read ${bundleOverreach.join(', ')}, so it cannot pass it on.`
    );
  }

  const allowedActions = (input.allowedActions ?? []).map((a) => a.trim()).filter(Boolean);
  const prohibitedActions = (input.prohibitedActions ?? []).map((a) => a.trim()).filter(Boolean);
  const contradiction = allowedActions.filter((a) => prohibitedActions.includes(a));
  if (contradiction.length) {
    /**
     * Refused rather than resolved. Picking a winner would mean deciding, on the
     * delegator's behalf, whether they meant to permit or forbid — and either
     * reading is a scope decision nobody made.
     */
    return refuse(
      workspace,
      'contradictory_actions',
      `${contradiction.join(', ')} is both allowed and prohibited; the handoff does not say what is meant.`
    );
  }

  const entries = listHandoffs(workspace);
  const handoff: AgentHandoff = {
    id: `handoff-${entries.length + 1}-${now}`,
    sourceAgent: input.sourceSessionId,
    targetAgent: input.targetSessionId,
    objective,
    checkpointId: input.checkpointId,
    requiredCapabilities: capabilities,
    minimumContext: bundles,
    sourceArtifacts: input.sourceArtifacts ?? [],
    allowedActions,
    prohibitedActions,
    expectedOutput,
    budget: input.budget ?? {},
    usage: { tokens: 0, elapsedMs: 0, toolCalls: 0, cost: 0 },
    expiration: input.expiration,
    returnDestination: input.returnDestination,
    status: 'proposed',
    createdAt: now,
    updatedAt: now
  };

  return {
    workspace: withEntries(workspace, [...entries, handoff], now),
    ok: true,
    handoff
  };
}

/** The target accepts or declines. Only the proposed state can be decided. */
export function decideHandoff(
  workspace: BrandOpsData,
  handoffId: string,
  decision: 'accepted' | 'rejected',
  now = new Date().toISOString(),
  note?: string
): HandoffResult {
  const handoff = getHandoffById(workspace, handoffId);
  if (!handoff) return refuse(workspace, 'handoff_unknown', 'No such handoff.');
  if (handoff.status !== 'proposed') {
    return refuse(
      workspace,
      'wrong_state',
      `This handoff is ${handoff.status}; only a proposed one can be accepted or rejected.`
    );
  }
  if (isExpired(handoff, now)) {
    // Expiry wins over acceptance, and is recorded rather than silently ignored.
    const expired: AgentHandoff = { ...handoff, status: 'expired', updatedAt: now };
    return {
      workspace: replaceEntry(workspace, expired, now),
      ok: false,
      handoff: expired,
      errorCode: 'already_expired',
      error: 'This handoff expired before it was accepted.'
    };
  }

  const target = activeSession(workspace, handoff.targetAgent);
  if (target.missing) return refuse(workspace, 'target_unknown', 'The target session is gone.');
  if (target.revoked)
    return refuse(workspace, 'target_revoked', 'The target session has been revoked.');

  const next: AgentHandoff = { ...handoff, status: decision, notes: note, updatedAt: now };
  return { workspace: replaceEntry(workspace, next, now), ok: true, handoff: next };
}

/** Accepted work actually begins. */
export function startHandoff(
  workspace: BrandOpsData,
  handoffId: string,
  now = new Date().toISOString()
): HandoffResult {
  const handoff = getHandoffById(workspace, handoffId);
  if (!handoff) return refuse(workspace, 'handoff_unknown', 'No such handoff.');
  if (handoff.status !== 'accepted') {
    return refuse(workspace, 'wrong_state', `This handoff is ${handoff.status}, not accepted.`);
  }
  if (isExpired(handoff, now)) {
    const expired: AgentHandoff = { ...handoff, status: 'expired', updatedAt: now };
    return {
      workspace: replaceEntry(workspace, expired, now),
      ok: false,
      handoff: expired,
      errorCode: 'already_expired',
      error: 'This handoff expired before it started.'
    };
  }
  const next: AgentHandoff = { ...handoff, status: 'in_progress', updatedAt: now };
  return { workspace: replaceEntry(workspace, next, now), ok: true, handoff: next };
}

/**
 * Charge a handoff for what it just spent.
 *
 * Refuses the call that *would* cross a limit rather than the one after it, and
 * closes the handoff when it does — a budget checked after the spend is not a
 * budget. The handoff is left `completed` with its usage intact, so what was
 * spent stays legible after it stops.
 */
export function recordHandoffUsage(
  workspace: BrandOpsData,
  handoffId: string,
  spend: Partial<AgentHandoff['usage']>,
  now = new Date().toISOString()
): HandoffResult {
  const handoff = getHandoffById(workspace, handoffId);
  if (!handoff) return refuse(workspace, 'handoff_unknown', 'No such handoff.');
  if (handoff.status !== 'in_progress' && handoff.status !== 'accepted') {
    return refuse(workspace, 'wrong_state', `This handoff is ${handoff.status} and cannot spend.`);
  }
  if (isExpired(handoff, now)) {
    const expired: AgentHandoff = { ...handoff, status: 'expired', updatedAt: now };
    return {
      workspace: replaceEntry(workspace, expired, now),
      ok: false,
      handoff: expired,
      errorCode: 'already_expired',
      error: 'This handoff has expired.'
    };
  }

  const proposed = {
    tokens: handoff.usage.tokens + (spend.tokens ?? 0),
    elapsedMs: handoff.usage.elapsedMs + (spend.elapsedMs ?? 0),
    toolCalls: handoff.usage.toolCalls + (spend.toolCalls ?? 0),
    cost: handoff.usage.cost + (spend.cost ?? 0)
  };
  const over = (limit: number | undefined, value: number) =>
    typeof limit === 'number' && value > limit;
  const exceeded =
    over(handoff.budget.tokenLimit, proposed.tokens) ||
    over(handoff.budget.timeLimitMs, proposed.elapsedMs) ||
    over(handoff.budget.toolCallLimit, proposed.toolCalls) ||
    over(handoff.budget.costLimit, proposed.cost);

  if (exceeded) {
    const closed: AgentHandoff = {
      ...handoff,
      status: 'completed',
      result: handoff.result ?? 'Stopped: budget exhausted.',
      updatedAt: now
    };
    return {
      workspace: replaceEntry(workspace, closed, now),
      ok: false,
      handoff: closed,
      errorCode: 'budget_exhausted',
      error: 'This spend would exceed the handoff budget, so it was not made.'
    };
  }

  const next: AgentHandoff = { ...handoff, usage: proposed, updatedAt: now };
  return { workspace: replaceEntry(workspace, next, now), ok: true, handoff: next };
}

/** The work is done and says what it produced. */
export function completeHandoff(
  workspace: BrandOpsData,
  handoffId: string,
  result: string,
  now = new Date().toISOString()
): HandoffResult {
  const handoff = getHandoffById(workspace, handoffId);
  if (!handoff) return refuse(workspace, 'handoff_unknown', 'No such handoff.');
  if (handoff.status !== 'in_progress') {
    return refuse(workspace, 'wrong_state', `This handoff is ${handoff.status}, not in progress.`);
  }
  const next: AgentHandoff = {
    ...handoff,
    status: 'completed',
    result: result.trim(),
    updatedAt: now
  };
  return { workspace: replaceEntry(workspace, next, now), ok: true, handoff: next };
}

/** Withdrawn before it finished. Terminal states stay as they are. */
export function cancelHandoff(
  workspace: BrandOpsData,
  handoffId: string,
  now = new Date().toISOString(),
  note?: string
): HandoffResult {
  const handoff = getHandoffById(workspace, handoffId);
  if (!handoff) return refuse(workspace, 'handoff_unknown', 'No such handoff.');
  if (['completed', 'cancelled', 'rejected', 'expired'].includes(handoff.status)) {
    return refuse(workspace, 'wrong_state', `This handoff is already ${handoff.status}.`);
  }
  const next: AgentHandoff = { ...handoff, status: 'cancelled', notes: note, updatedAt: now };
  return { workspace: replaceEntry(workspace, next, now), ok: true, handoff: next };
}

/**
 * Move every lapsed handoff to `expired`.
 *
 * Expiry is enforced at each point of use above, so this is bookkeeping rather
 * than the safety mechanism — it exists so a list shows the truth without
 * someone having to try to use every row to find out.
 */
export function expireHandoffs(
  workspace: BrandOpsData,
  now = new Date().toISOString()
): BrandOpsData {
  const entries = listHandoffs(workspace);
  const lapsed = (entry: AgentHandoff) =>
    isExpired(entry, now) && ['proposed', 'accepted', 'in_progress'].includes(entry.status);
  if (!entries.some(lapsed)) return workspace;

  return withEntries(
    workspace,
    entries.map((entry) =>
      lapsed(entry) ? { ...entry, status: 'expired', updatedAt: now } : entry
    ),
    now
  );
}
