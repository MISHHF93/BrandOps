import type { BrandOpsData } from '../../types/domain';
import { getOperatorTwinResumeArtifact } from './readResumeArtifact';

const DEFAULT_MAX_RESUME_PHASE_CHARS = 2800;

/**
 * Hosted Ask appendix: explicit neural-phasing instructions plus stored résumé artifact.
 * Sits after global role/template so models align jargon without overriding Brand facts.
 */
export function buildOperatorTwinSystemBlock(
  workspace: BrandOpsData,
  options?: { maxResumeChars?: number }
): string {
  const maxChars = options?.maxResumeChars ?? DEFAULT_MAX_RESUME_PHASE_CHARS;
  const ctx = getOperatorTwinResumeArtifact(workspace);
  if (!ctx.length) return '';

  const clipped = ctx.slice(0, maxChars);
  return [
    '### Operator twin — Phase R (résumé grounding)',
    'Phase R captures operator background (skills, roles, narrative bullets). Use it to infer expertise, seniority, and domain vocabulary in answers.',
    'Precedence: explicit Brand profile lines and Global operator role above outrank Phase R if they conflict; treat Phase R as supplemental unless the user asks to revise identity.',
    clipped
  ].join('\n');
}
