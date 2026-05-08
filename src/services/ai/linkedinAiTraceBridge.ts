/**
 * Bridge identifiers for future LinkedIn overlay AI traces (same graph primitives as Assistant).
 * Content scripts should avoid importing workspace-heavy modules from here only when wiring traces.
 */
export const LINKEDIN_AI_TRACE_SURFACE = 'linkedin_overlay' as const;

export function nextLinkedInAiTraceId(): string {
  return `li-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
