import type { BrandOpsData, CopilotWorker } from '../../types/domain';
import type { ChatCompletionMessage } from './nlpInferenceGateway';
import { buildCopilotContextHintBlock } from './copilotWorkers';
import { buildNeuralPhasingResumeBlock } from './neuralPhasing';

const GLOBAL_ROLE_LABEL = 'Global operator role (notificationCenter.roleContext)';

function buildStructuredJsonInstructions(worker: CopilotWorker | null): string {
  const cmds =
    worker?.allowedAgentCommands?.map((c) => c.trim()).filter((c) => c.length > 0) ?? [];
  if (!cmds.length) {
    return `Structured automation: do NOT output executeAgentCommand or brandOpsActionPipeline JSON — this copilot is not authorized for automatic workspace commands. Answer in prose only.`;
  }
  const allowedList = cmds.join(' | ');
  const exampleCmd = cmds[0];
  return `Optional automation: after your answer you MAY append ONE json code block.

**Single command (v1):**
\`\`\`json
{"brandOpsStructuredApply":{"version":1,"executeAgentCommand":"${exampleCmd}"}}
\`\`\`

**Multi-step pipeline (v2) — runs in order:**
\`\`\`json
{"brandOpsActionPipeline":{"version":2,"onError":"stop","steps":[{"executeAgentCommand":"${exampleCmd}"}]}}
\`\`\`

Allowed executeAgentCommand strings ONLY (exact spelling, use only from this list): ${allowedList}
Never suggest destructive commands. Omit JSON if unsure.

v2 limits: ≤12 steps; each command same length rules as typed chat. onError may be "stop" (default) or "continue".`;
}

export function buildHostedAskMessages(
  workspace: BrandOpsData,
  userQuestion: string,
  worker: CopilotWorker | null
): ChatCompletionMessage[] {
  const nc = workspace.settings.notificationCenter;
  const globalBaseline = `${GLOBAL_ROLE_LABEL}:\n${nc.roleContext.trim().slice(0, 2500)}\n\nGlobal prompt scaffold:\n${nc.promptTemplate.trim().slice(0, 2000)}`;

  const persona = worker
    ? `Active copilot: ${worker.name}${worker.description ? ` — ${worker.description}` : ''}\nCopilot instructions:\n${worker.systemInstructions.trim()}`
    : 'Copilot: default BrandOps assistant behavior.';

  const structured = buildStructuredJsonInstructions(worker);

  const activeOpp = workspace.opportunities.filter((o) => !o.archivedAt).length;
  const ctxLines = [
    `Operator: ${workspace.brand.operatorName}`,
    `Focus metric: ${workspace.brand.focusMetric.slice(0, 280)}`,
    `Active opportunities: ${activeOpp}`,
    `Content library items: ${workspace.contentLibrary.length}`,
    `Publishing queue items: ${workspace.publishingQueue.length}`,
    `Open follow-ups: ${workspace.followUps.filter((f) => !f.completed).length}`
  ];
  const ctx = ctxLines.join('\n');
  const scoped = buildCopilotContextHintBlock(workspace, worker);
  const neuralResume = buildNeuralPhasingResumeBlock(workspace);
  const phased = neuralResume ? `\n\n${neuralResume}` : '';

  const system =
    `${persona}\n\n${structured}\n\n${globalBaseline}${phased}\n\nWorkspace context:\n${ctx}${scoped}`.slice(
      0,
      28_000
    );

  return [
    { role: 'system', content: system },
    { role: 'user', content: userQuestion.trim().slice(0, 8000) }
  ];
}
