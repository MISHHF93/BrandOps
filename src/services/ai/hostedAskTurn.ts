import type { BrandOpsData, CopilotWorker } from '../../types/domain';
import type { ChatCompletionMessage } from './nlpInferenceGateway';
import { buildCopilotContextHintBlock } from './copilotWorkers';
import { buildNeuralPhasingResumeBlock } from './neuralPhasing';
import { buildPlatformAwareAskReadout } from './platformAwareAskContext';
import { buildExpertOperatorAskSystemBlock } from './expertOperatorIntegration';

const GLOBAL_ROLE_LABEL = 'Global operator role (notificationCenter.roleContext)';

function buildCitationEnvelopeInstructions(): string {
  return `Citation traceability (optional — omit entirely when you cannot ground claims): when retrieval or workspace facts informed your answer, you MAY expose structured provenance as structured JSON (never invent IDs).

Preferred shape — append ONE fenced JSON block AFTER prose (same fence MAY also include automation keys recognized below):

\`\`\`json
{"brandOpsAiProvenance":{"version":1,"citations":[{"source":"ISO_42001.pdf","chunk_id":12,"page":14,"confidence":0.94,"retrieval_timestamp":"2026-05-08T12:00:00Z"}]}}
\`\`\`

source_type must be one of: workspace_entity | integration_hub | linked_document | web_retrieval | browser_overlay | user_attachment | audio | image | video | document | unknown.

Multimodal hints belong under citations[].multimodal as { modality, mime_type, uri_hint (relative/id only), duration_ms, dimensions {w,h}, transcript_span {start_ms,end_ms} }.

If you emit BOTH citations AND automation JSON (brandOpsStructuredApply / brandOpsActionPipeline), merge keys inside the SAME JSON object — never rely on multiple fenced blocks for machine payloads.

Human-readable prose must remain understandable without opening JSON — no secrets or API keys in JSON fields.

Governance (optional): inside the same \`brandOpsAiProvenance\` object you MAY add:
- \`governance_tags\`: string array of short labels (e.g. ["finance-disclaimer","pii-safe"])
- \`hallucination_risk\`: low | medium | high | unknown
- \`evidence_completeness\`: full | partial | none (honest vs citations returned)
- \`missing_evidence_notes\`: string array explaining gaps or unstoppable speculation
- \`reproduction_notes\`: operator-facing hint to re-validate (URLs/commands allowed only if non-secret)

Example:
\`\`\`json
{"brandOpsAiProvenance":{"version":1,"citations":[{"source":"Playbook","chunk_id":3}],"governance_tags":["scoped-to-workspace"],"hallucination_risk":"low","evidence_completeness":"partial","missing_evidence_notes":["No live CRM row fetched"],"reproduction_notes":"Re-run ask: with same workspace export hash."}}
\`\`\`

Inline citation markers (optional): when your answer references retrieval chunks by id, you MAY insert markers exactly like \`[cite: 12]\` or \`[cite: ISO_42001.pdf]\` using the same \`chunk_id\` values listed in \`brandOpsAiProvenance.citations\`. Each marker should resolve to exactly one citation row — omit markers if unsure.`;
}

function buildStructuredJsonInstructions(worker: CopilotWorker | null): string {
  const cmds = worker?.allowedAgentCommands?.map((c) => c.trim()).filter((c) => c.length > 0) ?? [];
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
  worker: CopilotWorker | null,
  /** Optional routing / QA hints from {@link ./aiAskRouting.ts} (keeps citations path unchanged). */
  routingAugmentation?: string
): ChatCompletionMessage[] {
  const nc = workspace.settings.notificationCenter;
  const globalBaseline = `${GLOBAL_ROLE_LABEL}:\n${nc.roleContext.trim().slice(0, 2500)}\n\nGlobal prompt scaffold:\n${nc.promptTemplate.trim().slice(0, 2000)}`;

  const persona = worker
    ? `Active copilot: ${worker.name}${worker.description ? ` — ${worker.description}` : ''}\nCopilot instructions:\n${worker.systemInstructions.trim()}`
    : 'Copilot: default BrandOps assistant behavior.';

  const structured = buildStructuredJsonInstructions(worker);
  const citationIx = buildCitationEnvelopeInstructions();

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
  const platformContext = buildPlatformAwareAskReadout(workspace).contextBlock;
  const expertOperatorContext = buildExpertOperatorAskSystemBlock(workspace, userQuestion);

  let system = `${persona}\n\n${structured}\n\n${citationIx}\n\n${globalBaseline}${phased}\n\nWorkspace context:\n${ctx}${scoped}\n\n${platformContext}\n\n${expertOperatorContext}`;
  const routingBlock = routingAugmentation?.trim();
  if (routingBlock) {
    system += `\n\nOperator routing & QA hints:\n${routingBlock}`;
  }

  return [
    { role: 'system', content: system.slice(0, 28_000) },
    { role: 'user', content: userQuestion.trim().slice(0, 8000) }
  ];
}
