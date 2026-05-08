import type {
  AiAssistantTraceSurface,
  AiAssistantTurnTrace,
  AiCitationChunk,
  BrandOpsData
} from '../../types/domain';
import {
  AI_IO_TRACE_SCHEMA_VERSION,
  sanitizeAiCitationChunks
} from './aiIoProvenance';
import { sanitizeOrphanInlineMarkers } from './aiInlineCitations';

export const MAX_AI_ASSISTANT_TURN_TRACES = 400;

const MAX_PREVIEW_CHARS = 900;

export type AiAssistantTurnTraceInput = {
  surface: AiAssistantTraceSurface;
  outcome: 'success' | 'failure';
  user_turn_preview: string;
  assistant_preview: string;
  citations: AiCitationChunk[];
  model_id?: string;
  worker_id?: string;
  duration_ms?: number;
  message_id?: string;
  /** Non-resolving `[cite: …]` markers (audit). */
  orphan_inline_markers?: string[];
  id?: string;
  at?: string;
};

function clampPreview(s: string): string {
  const t = s.trim();
  return t.length <= MAX_PREVIEW_CHARS ? t : `${t.slice(0, MAX_PREVIEW_CHARS)}…`;
}

export function buildAiAssistantTurnTrace(input: AiAssistantTurnTraceInput): AiAssistantTurnTrace {
  const citations = sanitizeAiCitationChunks(input.citations as unknown);
  const orphans = sanitizeOrphanInlineMarkers(input.orphan_inline_markers ?? []);
  return {
    id: input.id ?? `ai-turn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    at: input.at ?? new Date().toISOString(),
    trace_schema_version: AI_IO_TRACE_SCHEMA_VERSION,
    surface: input.surface,
    outcome: input.outcome,
    message_id: input.message_id,
    user_turn_preview: clampPreview(input.user_turn_preview),
    assistant_preview: clampPreview(input.assistant_preview),
    citations,
    ...(orphans.length ? { orphan_inline_markers: orphans } : {}),
    model_id: input.model_id,
    worker_id: input.worker_id,
    duration_ms: input.duration_ms
  };
}

/**
 * Append one Assistant turn trace (citations + previews only — no API keys).
 * Respects {@link AppSettings.operatorTraceCollectionEnabled} alongside operator traces.
 */
export function prependAiAssistantTurnTrace(
  data: BrandOpsData,
  input: AiAssistantTurnTraceInput
): BrandOpsData {
  if (!data.settings.operatorTraceCollectionEnabled) return data;
  const entry = buildAiAssistantTurnTrace(input);
  const prior = data.aiAssistantTraces?.entries ?? [];
  return {
    ...data,
    aiAssistantTraces: {
      entries: [entry, ...prior].slice(0, MAX_AI_ASSISTANT_TURN_TRACES)
    }
  };
}
