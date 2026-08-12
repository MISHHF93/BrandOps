import type { BrandOpsData } from '../../types/domain';
import type {
  AiPipelineRunLogState,
  PipelineRun,
  PipelineStepRun
} from '../../types/aiIntegrationSuite';
import { AI_PIPELINE_RUN_SCHEMA_VERSION } from '../../types/aiIntegrationSuite';

const MAX_AI_PIPELINE_RUNS = 80;

export function sanitizePipelineRun(run: PipelineRun): PipelineRun {
  const run_id = run.run_id?.trim().slice(0, 120) || 'run-unknown';
  const pipeline_id = run.pipeline_id?.trim().slice(0, 120) || 'pipeline-unknown';
  const steps: PipelineStepRun[] = (run.steps ?? []).map((s) => {
    const step_id =
      typeof s.step_id === 'string' && s.step_id.trim() ? s.step_id.trim().slice(0, 80) : 'step';
    return {
      step_id,
      status: validStepStatus(s.status) ? s.status : 'skipped',
      started_at: clip(s.started_at, 48),
      ended_at: clip(s.ended_at, 48),
      detail: clip(s.detail, 400)
    };
  });
  const audit_tags = Array.isArray(run.audit_tags)
    ? run.audit_tags
        .filter((x): x is string => typeof x === 'string')
        .map((t) => t.trim().slice(0, 64))
        .filter(Boolean)
        .slice(0, 16)
    : undefined;
  return {
    run_id,
    pipeline_id,
    schema_version: AI_PIPELINE_RUN_SCHEMA_VERSION,
    started_at: run.started_at.trim().slice(0, 48),
    ended_at: run.ended_at?.trim().slice(0, 48),
    status: validRunStatus(run.status) ? run.status : 'failure',
    operator_mode: run.operator_mode,
    selected_model_id: run.selected_model_id?.trim().slice(0, 160),
    steps,
    error_message: run.error_message?.trim().slice(0, 400),
    ...(audit_tags?.length ? { audit_tags } : {})
  };
}

function clip(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

function validStepStatus(s: PipelineStepRun['status']): boolean {
  return (
    s === 'pending' || s === 'running' || s === 'success' || s === 'failure' || s === 'skipped'
  );
}

function validRunStatus(s: PipelineRun['status']): boolean {
  return s === 'running' || s === 'success' || s === 'failure' || s === 'partial';
}

export function prependAiPipelineRun(data: BrandOpsData, run: PipelineRun): BrandOpsData {
  if (!data.settings.operatorTraceCollectionEnabled) return data;
  const sanitized = sanitizePipelineRun(run);
  const prior = data.aiPipelineRuns?.entries ?? [];
  const entries = [sanitized, ...prior].slice(0, MAX_AI_PIPELINE_RUNS);
  return {
    ...data,
    aiPipelineRuns: {
      schema_version: AI_PIPELINE_RUN_SCHEMA_VERSION,
      entries
    }
  };
}

export function normalizeAiPipelineRuns(value: unknown): AiPipelineRunLogState | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = (value as { entries?: unknown }).entries;
  if (!Array.isArray(raw)) return undefined;
  const entries: PipelineRun[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as PipelineRun;
    if (typeof r.run_id !== 'string' || typeof r.pipeline_id !== 'string') continue;
    entries.push(sanitizePipelineRun(r));
    if (entries.length >= MAX_AI_PIPELINE_RUNS) break;
  }
  if (!entries.length) return undefined;
  return {
    schema_version: AI_PIPELINE_RUN_SCHEMA_VERSION,
    entries
  };
}
