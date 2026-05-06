import type { BrandOpsData } from '../../types/domain';

const MAX_RESUME_PHASE_CHARS = 2800;

/**
 * Optional appendix for hosted Ask: explicit phased instructions plus stored résumé artifact.
 * Phase R sits after global role/template so models align jargon without overriding Brand facts.
 */
export function buildNeuralPhasingResumeBlock(workspace: BrandOpsData): string {
  const ctx = workspace.settings.notificationCenter.resumeNeuralPhaseContext.trim();
  if (!ctx.length) return '';

  const clipped = ctx.slice(0, MAX_RESUME_PHASE_CHARS);
  return [
    '### Neural phasing — Phase R (résumé grounding)',
    'Phase R captures operator background (skills, roles, narrative bullets). Use it to infer expertise, seniority, and domain vocabulary in answers.',
    'Precedence: explicit Brand profile lines and Global operator role above outrank Phase R if they conflict; treat Phase R as supplemental unless the user asks to revise identity.',
    clipped
  ].join('\n');
}
