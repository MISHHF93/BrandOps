/**
 * G19 / invariant 5 — the Memory Firewall on the agent-write path.
 *
 * `src/services/memory/memoryFirewall.ts` has always modeled this correctly: it
 * sanitizes, classifies trust by source, and scores instruction risk, and its
 * `CandidateSource` union has carried `'external-agent-message'` and
 * `'mcp-response'` from the start. Nothing outside `services/memory/` ever
 * called it. Like the agent identity registry before Phase 4, it was a correct
 * module that enforced nothing.
 *
 * **What this screens, precisely.** The directive's wording is about *external
 * tool output* — content BrandOps consumes when acting as an MCP client, which
 * is G17 and does not exist yet. On the server side the equivalent untrusted
 * input is agent-authored free text arriving as tool arguments and heading for
 * workspace state: an achievement description, a Twin claim, an action summary.
 * That is what this screens. It is not the same thing as the directive's clause,
 * and it is not claimed to be.
 *
 * **Why it is a second screen, not a duplicate one.** `validation.ts` matches
 * inbound text against prompt-injection signatures. This runs a different
 * assessment — trust classification by provenance, plus instruction-risk scoring
 * over the sanitized text — and it records a candidate entry, so what an agent
 * tried to write is inspectable after the fact rather than only at the moment it
 * was refused.
 *
 * **What it deliberately does not do.** It does not gate on
 * `requiresVerification`. Agent-authored content is `AGENT_REPORTED`, so the
 * firewall asks for verification on essentially every write — and BrandOps
 * already answers that with the approval gate and the proposal queue. Turning
 * that into a second refusal would block every legitimate agent write while
 * protecting against nothing. The firewall's `reject` is the verdict that
 * changes behavior here; everything else is recorded and passed through.
 */
import { processThroughFirewall } from '../memory/memoryFirewall';
import type { AgentCapabilityId } from '../../types/agentInterop';

/** Total characters submitted for screening. The firewall caps at 2000 of its own. */
const MAX_SCREENED_CHARS = 4000;

export interface MemoryScreenVerdict {
  /** False when the call carried no free text — nothing to screen, nothing to claim. */
  screened: boolean;
  allow: boolean;
  errorCode?: string;
  reason?: string;
  /** Audit line. Empty when nothing was screened. */
  summary: string;
}

/**
 * Every string an agent supplied, in argument order. Recursive because evidence
 * refs and intent contracts nest — text that reaches workspace state through a
 * nested field is exactly as untrusted as text at the top level.
 */
function collectAgentText(value: unknown, out: string[], budget = { left: MAX_SCREENED_CHARS }) {
  if (budget.left <= 0) return;
  if (typeof value === 'string') {
    const slice = value.slice(0, budget.left);
    if (slice.trim()) {
      out.push(slice);
      budget.left -= slice.length;
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectAgentText(entry, out, budget);
    return;
  }
  if (value && typeof value === 'object') {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectAgentText(entry, out, budget);
    }
  }
}

/**
 * Screens agent-authored content on its way into workspace state.
 *
 * Content is submitted as `external-agent-message`, which classifies as
 * `EXTERNAL_SOURCE` and can never classify as verified. That direction is the
 * point: the firewall exists to lower trust, never to launder it upward.
 */
export function screenAgentContent(input: {
  args: Record<string, unknown>;
  capabilityId: AgentCapabilityId;
  sessionId: string;
  clientKind: string;
}): MemoryScreenVerdict {
  const parts: string[] = [];
  collectAgentText(input.args, parts);
  const content = parts.join('\n').trim();
  if (!content) {
    return { screened: false, allow: true, summary: '' };
  }

  const verdict = processThroughFirewall({
    content,
    source: 'external-agent-message',
    sourceLabel: `${input.clientKind}:${input.sessionId}`,
    traceId: input.capabilityId
  });

  const descriptor =
    `Memory firewall — ${verdict.candidate.trustClassification}, ` +
    `instruction risk ${verdict.candidate.instructionRisk}, action ${verdict.action}.`;

  if (verdict.action === 'reject') {
    return {
      screened: true,
      allow: false,
      errorCode: 'memory_firewall_rejected',
      reason:
        verdict.reason ??
        'Content was rejected by the Memory Firewall and was not written to the workspace.',
      summary: `Blocked ${input.capabilityId}: ${descriptor}`
    };
  }

  return { screened: true, allow: true, summary: descriptor };
}
