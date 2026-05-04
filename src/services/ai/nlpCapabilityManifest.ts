/**
 * Single checklist for NLP / AI I/O readiness — product + engineering alignment.
 * Update statuses when wiring new surfaces (Ask completions UI, embeddings index, etc.).
 */
export type NlpCapabilityStatus = 'implemented' | 'stub' | 'planned';

export interface NlpCapabilityRow {
  id: string;
  label: string;
  status: NlpCapabilityStatus;
  notes: string;
}

export const NLP_CAPABILITY_CHECKLIST: readonly NlpCapabilityRow[] = [
  {
    id: 'workspace-ai-bridge',
    label: 'Persisted aiBridge (URLs + model IDs)',
    status: 'implemented',
    notes: 'Stored in AppSettings.aiBridge; secrets via chrome.storage.local key brandops_ai_openai_compat_key.'
  },
  {
    id: 'gateway-chat-completions',
    label: 'OpenAI-compatible chat completions client',
    status: 'implemented',
    notes: 'runChatCompletion in nlpInferenceGateway.ts — POST /v1/chat/completions.'
  },
  {
    id: 'gateway-embeddings',
    label: 'OpenAI-compatible embeddings client',
    status: 'implemented',
    notes: 'runEmbeddings in nlpInferenceGateway.ts — POST /v1/embeddings.'
  },
  {
    id: 'policy-gates',
    label: 'Runtime policy gates + aiAdapterMode',
    status: 'implemented',
    notes: 'external-opt-in + aiRuntimePolicy.externalNlpHttpEnabled + endpoint + API key required.'
  },
  {
    id: 'operator-traces-ai-io',
    label: 'Dataset traces for AI request/response lifecycle',
    status: 'implemented',
    notes: 'persistChatGatewayTrace / persistEmbeddingsGatewayTrace write ai.gateway.* verbs when collection enabled.'
  },
  {
    id: 'internal-on-device-nlp',
    label: 'Bundled on-device transformer / embedder',
    status: 'planned',
    notes: 'No WASM/onnx runtime shipped yet; use localModelEnabled + future adapter.'
  },
  {
    id: 'chat-ui-binding',
    label: 'Assistant transcript wired to gateway',
    status: 'implemented',
    notes: 'Mobile Assistant routes lines prefixed with ask: through runChatCompletion (+ optional structured pipeline-health auto-run).'
  },
  {
    id: 'embedding-index-storage',
    label: 'Persisted embedding index for content library slices',
    status: 'implemented',
    notes: 'BrandOpsData.embeddingIndex normalized in storage; refresh via “sync content embeddings” command.'
  },
  {
    id: 'copilot-worker-registry',
    label: 'First-class copilot worker registry (personas + picker)',
    status: 'implemented',
    notes:
      'AppSettings.copilotWorkers with normalization; Assistant picker; Ask prompts compose NC + worker; per-worker allow-list + model override.'
  }
];

export function countNlpCapabilitiesByStatus(
  status: NlpCapabilityStatus
): number {
  return NLP_CAPABILITY_CHECKLIST.filter((r) => r.status === status).length;
}
