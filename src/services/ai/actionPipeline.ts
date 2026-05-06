import type { AgentWorkspaceResult } from '../agent/agentWorkspaceEngine';
import type { CopilotWorker } from '../../types/domain';
import {
  extractFirstJsonString,
  isAllowedForWorker,
  MAX_STRUCTURED_AGENT_COMMAND_CHARS,
  parseStructuredAiApplyPayload
} from './llmStructuredApply';

/** Max steps in a single hosted pipeline (bound cost / abuse). */
export const MAX_ACTION_PIPELINE_STEPS = 12;

export type AiExecutablePayload =
  | { kind: 'none' }
  | { kind: 'single'; commandText: string }
  | { kind: 'pipeline'; commands: string[]; stopOnError: boolean };

const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;

function parsePipelineFromRoot(root: Record<string, unknown>): AiExecutablePayload | null {
  const raw = root.brandOpsActionPipeline ?? root.brand_ops_action_pipeline;
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (p.version !== 2 && p.version !== '2') return null;

  const stepsRaw = p.steps;
  if (!Array.isArray(stepsRaw) || stepsRaw.length === 0) return null;
  if (stepsRaw.length > MAX_ACTION_PIPELINE_STEPS) return null;

  const commands: string[] = [];
  for (const step of stepsRaw) {
    if (!step || typeof step !== 'object') return null;
    const s = step as Record<string, unknown>;
    const cmd = s.executeAgentCommand ?? s.execute_agent_command;
    if (typeof cmd !== 'string') return null;
    const trimmed = cmd.trim().slice(0, MAX_STRUCTURED_AGENT_COMMAND_CHARS);
    if (!trimmed.length || !PRINTABLE_ASCII.test(trimmed)) return null;
    commands.push(trimmed);
  }

  let stopOnError = true;
  const pol = p.onError ?? p.on_error;
  if (pol === 'continue' || pol === 'CONTINUE') stopOnError = false;

  return { kind: 'pipeline', commands, stopOnError };
}

/**
 * Parse v2 `brandOpsActionPipeline` first, then v1 `brandOpsStructuredApply`, from model text.
 */
export function parseAiExecutablePayload(modelText: string): AiExecutablePayload {
  const jsonRaw = extractFirstJsonString(modelText);
  if (!jsonRaw) return { kind: 'none' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonRaw) as unknown;
  } catch {
    return { kind: 'none' };
  }
  if (!parsed || typeof parsed !== 'object') return { kind: 'none' };
  const root = parsed as Record<string, unknown>;

  const pipe = parsePipelineFromRoot(root);
  if (pipe) return pipe;

  const v1 = parseStructuredAiApplyPayload(modelText);
  if (v1.kind === 'execute_agent_command') {
    return { kind: 'single', commandText: v1.commandText };
  }
  return { kind: 'none' };
}

/** Every command must match the worker allow-list (same rules as v1). */
export function arePipelineCommandsAllowed(
  worker: CopilotWorker | null,
  commands: string[]
): boolean {
  if (!commands.length) return false;
  return commands.every((c) => isAllowedForWorker(worker, c));
}

export async function runSequentialAgentCommands(
  commands: string[],
  execute: (text: string) => Promise<AgentWorkspaceResult>,
  options: { stopOnError: boolean }
): Promise<{ results: AgentWorkspaceResult[]; stoppedAfterIndex?: number }> {
  const results: AgentWorkspaceResult[] = [];
  for (let i = 0; i < commands.length; i += 1) {
    const r = await execute(commands[i]);
    results.push(r);
    if (!r.ok && options.stopOnError) {
      return { results, stoppedAfterIndex: i };
    }
  }
  return { results };
}

export function formatPipelineAutoRunSummary(
  results: AgentWorkspaceResult[],
  stoppedAfterIndex?: number
): string {
  const lines = results.map((r, i) => {
    const flag = r.ok ? 'Ok' : 'Issue';
    return `${i + 1}. ${r.action} — ${flag}: ${r.summary}`;
  });
  let out = `(Auto-run · ${results.length} step(s))\n${lines.join('\n')}`;
  if (stoppedAfterIndex !== undefined) {
    out += `\n(Pipeline stopped on step ${stoppedAfterIndex + 1}.)`;
  }
  return out;
}
