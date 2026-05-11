import type { AssistantAskTraceSummaryUI } from '../../types/aiTraceGraph';

export type TrustBand = 'high' | 'moderate' | 'low';

/** Derived UX signal — not persisted; recomputed from trace summary + local claim checks. */
export interface TrustScore {
  score_0_100: number;
  band: TrustBand;
  rationale_lines: string[];
}

/**
 * Heuristic trust score for Ask surfaces — combines governance hints and unresolved citation markers.
 */
export function deriveTrustScore(
  summary: Pick<
    AssistantAskTraceSummaryUI,
    'hallucination_risk' | 'evidence_completeness' | 'missing_evidence_notes'
  >,
  opts?: { orphanMarkerCount?: number }
): TrustScore {
  const rationale_lines: string[] = [];
  let base = 56;

  switch (summary.hallucination_risk) {
    case 'low':
      base = 88;
      rationale_lines.push('Model-reported hallucination risk: low.');
      break;
    case 'medium':
      base = 68;
      rationale_lines.push('Model-reported hallucination risk: medium.');
      break;
    case 'high':
      base = 36;
      rationale_lines.push('Model-reported hallucination risk: high.');
      break;
    default:
      base = 56;
      rationale_lines.push('Hallucination risk not supplied — scoring conservatively.');
  }

  switch (summary.evidence_completeness) {
    case 'full':
      base += 8;
      rationale_lines.push('Evidence completeness labeled full.');
      break;
    case 'partial':
      base += 2;
      rationale_lines.push('Evidence completeness labeled partial.');
      break;
    case 'none':
      base -= 14;
      rationale_lines.push('No attributed evidence rows — verify before relying on answer.');
      break;
    default:
      rationale_lines.push('Evidence completeness unknown.');
  }

  const orphans = opts?.orphanMarkerCount ?? 0;
  if (orphans > 0) {
    const penalty = Math.min(28, orphans * 9);
    base -= penalty;
    rationale_lines.push(`${orphans} unresolved inline citation marker(s) — claim check needed.`);
  }

  const noteDebt = summary.missing_evidence_notes?.length ?? 0;
  if (noteDebt > 0) {
    const penalty = Math.min(15, noteDebt * 4);
    base -= penalty;
    rationale_lines.push(`${noteDebt} governance note(s) attached to this trace.`);
  }

  const score_0_100 = Math.round(Math.min(100, Math.max(0, base)));
  const band: TrustBand = score_0_100 >= 74 ? 'high' : score_0_100 >= 42 ? 'moderate' : 'low';

  return { score_0_100, band, rationale_lines };
}
