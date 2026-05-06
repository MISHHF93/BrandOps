import { describe, expect, it, vi } from 'vitest';
import {
  MAX_ACTION_PIPELINE_STEPS,
  parseAiExecutablePayload,
  arePipelineCommandsAllowed,
  runSequentialAgentCommands,
  formatPipelineAutoRunSummary
} from '../../src/services/ai/actionPipeline';
import { defaultCopilotWorkerRegistry } from '../../src/config/copilotWorkerDefaults';

describe('actionPipeline', () => {
  const coach = defaultCopilotWorkerRegistry.workers.find((w) => w.id === 'pipeline-coach')!;

  it('parses v1 executeAgentCommand inside json', () => {
    const text = 'Here is help.\n```json\n{"brandOpsStructuredApply":{"version":1,"executeAgentCommand":"pipeline health"}}\n```';
    const p = parseAiExecutablePayload(text);
    expect(p).toEqual({ kind: 'single', commandText: 'pipeline health' });
  });

  it('parses v2 pipeline with snake_case keys', () => {
    const text = `
{"brand_ops_action_pipeline":{"version":2,"on_error":"stop","steps":[
  {"execute_agent_command":"pipeline health"},
  {"executeAgentCommand":"pipeline health"}
]}}
`;
    const p = parseAiExecutablePayload(text);
    expect(p.kind).toBe('pipeline');
    if (p.kind === 'pipeline') {
      expect(p.commands).toEqual(['pipeline health', 'pipeline health']);
      expect(p.stopOnError).toBe(true);
    }
  });

  it('parses onError continue', () => {
    const text = JSON.stringify({
      brandOpsActionPipeline: {
        version: 2,
        onError: 'continue',
        steps: [{ executeAgentCommand: 'pipeline health' }]
      }
    });
    const p = parseAiExecutablePayload(text);
    expect(p).toMatchObject({ kind: 'pipeline', stopOnError: false });
  });

  it('prefers v2 when both keys present', () => {
    const text = JSON.stringify({
      brandOpsActionPipeline: {
        version: 2,
        steps: [{ executeAgentCommand: 'pipeline health' }]
      },
      brandOpsStructuredApply: { version: 1, executeAgentCommand: 'add note: x' }
    });
    expect(parseAiExecutablePayload(text).kind).toBe('pipeline');
  });

  it('rejects empty steps and too many steps', () => {
    expect(parseAiExecutablePayload(JSON.stringify({ brandOpsActionPipeline: { version: 2, steps: [] } })).kind).toBe(
      'none'
    );
    const many = Array.from({ length: MAX_ACTION_PIPELINE_STEPS + 1 }, () => ({
      executeAgentCommand: 'pipeline health'
    }));
    expect(
      parseAiExecutablePayload(JSON.stringify({ brandOpsActionPipeline: { version: 2, steps: many } })).kind
    ).toBe('none');
  });

  it('arePipelineCommandsAllowed checks every step', () => {
    expect(arePipelineCommandsAllowed(coach, ['pipeline health'])).toBe(true);
    expect(arePipelineCommandsAllowed(coach, ['pipeline health', 'add note: rogue'])).toBe(false);
    expect(arePipelineCommandsAllowed(null, ['pipeline health'])).toBe(false);
  });

  it('runSequentialAgentCommands does not run subsequent steps after first failure', async () => {
    const exec = vi.fn(async (t: string) =>
      t === 'good'
        ? { ok: true, action: 'pipeline-health' as const, summary: 'fine' }
        : { ok: false, action: 'unsupported' as const, summary: 'bad' }
    );
    const out = await runSequentialAgentCommands(['bad', 'good'], exec, { stopOnError: true });
    expect(exec).toHaveBeenCalledTimes(1);
    expect(out.results).toHaveLength(1);
    expect(out.stoppedAfterIndex).toBe(0);
  });

  it('runSequentialAgentCommands runs remaining steps when stopOnError false', async () => {
    const exec = vi.fn(async () => ({ ok: false, action: 'unsupported' as const, summary: 'x' }));
    const out = await runSequentialAgentCommands(['a', 'b'], exec, { stopOnError: false });
    expect(exec).toHaveBeenCalledTimes(2);
    expect(out.stoppedAfterIndex).toBeUndefined();
  });

  it('formatPipelineAutoRunSummary includes stop hint', () => {
    const summary = formatPipelineAutoRunSummary(
      [
        { ok: true, action: 'pipeline-health', summary: 'ok1' },
        { ok: false, action: 'unsupported', summary: 'fail' }
      ],
      1
    );
    expect(summary).toContain('2 step');
    expect(summary).toContain('stopped on step 2');
  });
});
