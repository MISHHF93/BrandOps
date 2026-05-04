import type { BrandOpsData, CopilotWorker } from '../../types/domain';
import type { ChatCompletionMessage } from './nlpInferenceGateway';
import { buildCopilotContextHintBlock } from './copilotWorkers';

const GLOBAL_ROLE_LABEL = 'Global operator role (notificationCenter.roleContext)';

function buildStructuredJsonInstructions(worker: CopilotWorker | null): string {
  const cmds =
    worker?.allowedAgentCommands?.map((c) => c.trim()).filter((c) => c.length > 0) ?? [];
  if (!cmds.length) {
    return `Structured automation: do NOT output executeAgentCommand JSON blocks — this copilot is not authorized for automatic workspace commands. Answer in prose only.`;
  }
  const allowedList = cmds.join(' | ');
  return `Optional: after your answer you MAY append one JSON code block so the app can run an allowed read-only command:
\`\`\`json
{"brandOpsStructuredApply":{"version":1,"executeAgentCommand":"${cmds[0]}"}}
\`\`\`
Allowed executeAgentCommand strings ONLY (exact spelling): ${allowedList}
Never suggest destructive commands. Omit the JSON block if unsure.`;
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

  const system = `${persona}\n\n${structured}\n\n${globalBaseline}\n\nWorkspace context:\n${ctx}${scoped}`.slice(
    0,
    28_000
  );

  return [
    { role: 'system', content: system },
    { role: 'user', content: userQuestion.trim().slice(0, 8000) }
  ];
}
