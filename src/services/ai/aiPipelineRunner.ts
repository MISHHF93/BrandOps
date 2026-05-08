import type { BrandOpsData } from '../../types/domain';
import {
  AI_PIPELINE_RUN_SCHEMA_VERSION,
  type PipelineRun,
  type PipelineStepRun
} from '../../types/aiIntegrationSuite';
import { getAiPipelineDefinition } from './aiPipelineCatalog';
import { prependAiPipelineRun } from './aiPipelineRunPersistence';
import { resolveHostedAssistantRouting } from './aiAskRouting';
import { runChatCompletion } from './nlpInferenceGateway';
import { buildHostedAskMessages } from './hostedAskTurn';
import { resolveActiveCopilotWorker } from './copilotWorkers';

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function buildWorkspaceDeterministicDigest(
  workspace: BrandOpsData,
  pipelineLabel: string
): string {
  const activeOpps = workspace.opportunities.filter((o) => !o.archivedAt).length;
  const lines = [
    `Pipeline: ${pipelineLabel}`,
    `Operator: ${workspace.brand.operatorName.trim().slice(0, 80)}`,
    `Open opportunities: ${activeOpps}`,
    `Content library: ${workspace.contentLibrary.length}`,
    `Publishing queue: ${workspace.publishingQueue.length}`,
    `Follow-ups open: ${workspace.followUps.filter((f) => !f.completed).length}`,
    `Integration sources: ${workspace.integrationHub.sources.length}`,
    `Artifacts synced: ${workspace.integrationHub.artifacts.length}`
  ];
  return lines.join('\n');
}

async function hostedAssistBrief(args: {
  workspace: BrandOpsData;
  userPrompt: string;
}): Promise<{ ok: boolean; text?: string; detail: string }> {
  const settings = args.workspace.settings;
  const worker = resolveActiveCopilotWorker(settings);
  const routing = resolveHostedAssistantRouting({
    settings,
    workerModelId: worker?.chatModelId ?? null
  });
  const augment = [routing.behaviorHint, routing.diagnosticsDetail].filter(Boolean).join('\n\n');
  const messages = buildHostedAskMessages(
    args.workspace,
    args.userPrompt.trim().slice(0, 4000),
    worker,
    augment.length ? augment : undefined
  );
  const workerCap = worker?.maxCompletionTokens;
  const cap =
    typeof workerCap === 'number' && workerCap > 0 && routing.maxTokens
      ? Math.min(workerCap, routing.maxTokens)
      : routing.maxTokens ?? workerCap;
  const result = await runChatCompletion(settings, {
    messages,
    model: routing.modelId,
    ...(typeof cap === 'number' && cap > 0 ? { maxTokens: cap } : {}),
    ...(routing.temperature !== undefined ? { temperature: routing.temperature } : {})
  });
  if (!result.ok) {
    return { ok: false, detail: `${result.code}: ${result.message}` };
  }
  return {
    ok: true,
    text: result.text,
    detail: `hosted_completion_ok model=${routing.modelId}`
  };
}

export async function executeAiPipeline(args: {
  workspace: BrandOpsData;
  pipelineId: string;
  /** When pipeline lists {@link human_review_gate}, pass true to continue automated demo/tests. */
  humanReviewAck?: boolean;
  completionPrompt?: string;
}): Promise<PipelineRun> {
  const def = getAiPipelineDefinition(args.pipelineId);
  const routing = resolveHostedAssistantRouting({
    settings: args.workspace.settings,
    workerModelId: resolveActiveCopilotWorker(args.workspace.settings)?.chatModelId ?? null
  });
  const run: PipelineRun = {
    run_id: `pipe-${uid()}`,
    pipeline_id: args.pipelineId,
    schema_version: AI_PIPELINE_RUN_SCHEMA_VERSION,
    started_at: nowIso(),
    status: 'running',
    operator_mode: args.workspace.settings.aiOperatorMode,
    selected_model_id: routing.modelId,
    steps: [],
    audit_tags: [`routing:${routing.policy.policy_id}`, `task:${routing.taskType}`]
  };

  if (!def) {
    run.status = 'failure';
    run.error_message = 'Unknown pipeline id.';
    run.ended_at = nowIso();
    return run;
  }

  let halted = false;

  for (const step of def.steps) {
    const rec: PipelineStepRun = {
      step_id: step.step_id,
      status: 'running',
      started_at: nowIso()
    };
    run.steps.push(rec);

    try {
      switch (step.kind) {
        case 'validate_inputs':
          rec.status = args.workspace.settings ? 'success' : 'failure';
          rec.detail = 'Workspace settings present.';
          break;
        case 'deterministic_digest': {
          const digest = buildWorkspaceDeterministicDigest(args.workspace, def.label);
          rec.status = 'success';
          rec.detail = digest.slice(0, 800);
          break;
        }
        case 'hosted_completion': {
          const prompt =
            args.completionPrompt?.trim() ||
            `Execute pipeline "${def.label}" step "${step.label}" using workspace digest context only when factual; otherwise ask clarifying questions.`;
          const hosted = await hostedAssistBrief({ workspace: args.workspace, userPrompt: prompt });
          rec.status = hosted.ok ? 'success' : 'failure';
          rec.detail = hosted.text
            ? `${hosted.detail}\n---\n${hosted.text.slice(0, 1200)}`
            : hosted.detail;
          if (!hosted.ok) halted = true;
          break;
        }
        case 'governance_checkpoint':
          rec.status = 'success';
          rec.detail =
            'Checkpoint: verify disclosures and speculative language before publishing externally.';
          break;
        case 'human_review_gate':
          if (step.requires_human_ok && !args.humanReviewAck) {
            rec.status = 'skipped';
            rec.detail = 'Awaiting operator acknowledgement.';
            halted = true;
          } else {
            rec.status = 'success';
            rec.detail = 'Review acknowledged.';
          }
          break;
        case 'export_audit_metadata':
          rec.status = 'success';
          rec.detail = (run.audit_tags ?? []).join(', ');
          break;
        default:
          rec.status = 'skipped';
          rec.detail = `Unhandled step kind: ${String((step as { kind?: string }).kind)}`;
      }
    } catch (e) {
      rec.status = 'failure';
      rec.detail = e instanceof Error ? e.message : 'step_failed';
      halted = true;
    }
    rec.ended_at = nowIso();
    if (halted) break;
  }

  run.ended_at = nowIso();
  const anyFail = run.steps.some((s) => s.status === 'failure');
  const anySkipHuman = run.steps.some(
    (s) => s.status === 'skipped' && s.detail?.includes('Awaiting operator')
  );
  run.status = anyFail ? 'failure' : anySkipHuman ? 'partial' : 'success';
  return run;
}

export async function runAiPipelineWithPersistence(args: {
  data: BrandOpsData;
  pipelineId: string;
  humanReviewAck?: boolean;
  completionPrompt?: string;
}): Promise<{ data: BrandOpsData; run: PipelineRun }> {
  const run = await executeAiPipeline({
    workspace: args.data,
    pipelineId: args.pipelineId,
    humanReviewAck: args.humanReviewAck,
    completionPrompt: args.completionPrompt
  });
  const next = prependAiPipelineRun(args.data, run);
  return { data: next, run };
}
