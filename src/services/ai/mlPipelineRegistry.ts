/**
 * Canonical inventory of ML-adjacent and neural inference surfaces in BrandOps.
 *
 * **Extension runtime (shipped):** hosted chat + hosted embeddings both execute only through
 * {@link ./nlpInferenceGateway.ts} — same adapter mode, runtime policy, timeout discipline, and API key.
 *
 * **Not bundled in the extension:** CLI toy MLP (`scripts/run-native-model.mjs`) and Ollama smoke
 * (`scripts/setup-local-inference.mjs`) — operator tooling only; they never replace the gateway.
 *
 * **Not ML:** `localIntelligence` / cadence math are deterministic rules — listed here so operators
 * do not confuse them with neural models.
 */

export type MlPipelineStageId =
  | 'hosted-chat-completions'
  | 'hosted-embeddings'
  | 'embedding-index-storage'
  | 'cli-native-tiny-mlp'
  | 'dev-ollama-local'
  | 'rules-local-intelligence';

export interface MlPipelineStage {
  id: MlPipelineStageId;
  /** Operator-facing name */
  label: string;
  /** Runs inside the browser extension bundle */
  inExtensionRuntime: boolean;
  /** Primary module or script */
  entry: string;
  /** What invokes it */
  consumers: string[];
}

/** Ordered for docs — count reflects distinct surfaces (not HuggingFace checkpoints). */
export const ML_PIPELINE_STAGES: readonly MlPipelineStage[] = [
  {
    id: 'hosted-chat-completions',
    label: 'Hosted chat completions (OpenAI-compatible)',
    inExtensionRuntime: true,
    entry: 'src/services/ai/nlpInferenceGateway.ts → runChatCompletion',
    consumers: [
      'mobileApp.tsx (ask: lines)',
      'aiIoProvenance.ts (brandOpsAiProvenance envelope)',
      'copilot optional model override'
    ]
  },
  {
    id: 'hosted-embeddings',
    label: 'Hosted embeddings (OpenAI-compatible)',
    inExtensionRuntime: true,
    entry: 'src/services/ai/nlpInferenceGateway.ts → runEmbeddings',
    consumers: ['contentEmbeddingsPipeline.ts', 'agent sync-content-embeddings']
  },
  {
    id: 'embedding-index-storage',
    label: 'Embedding vector persistence (workspace)',
    inExtensionRuntime: true,
    entry: 'BrandOpsData.embeddingIndex + storage normalization',
    consumers: ['contentEmbeddingsPipeline merge', 'native CLI mirrors (export-only)']
  },
  {
    id: 'rules-local-intelligence',
    label: 'Deterministic ranking / signals (not neural)',
    inExtensionRuntime: true,
    entry: 'src/services/intelligence/localIntelligence.ts',
    consumers: ['Today digest', 'pipeline health readouts', 'cockpit ordering']
  },
  {
    id: 'cli-native-tiny-mlp',
    label: 'Offline toy MLP intent probe (hash embedding)',
    inExtensionRuntime: false,
    entry: 'scripts/run-native-model.mjs + scripts/lib/nativeTinyMlp.mjs',
    consumers: ['npm run native:model:run', 'artifact resonance reports']
  },
  {
    id: 'dev-ollama-local',
    label: 'Local Ollama smoke (dev machine)',
    inExtensionRuntime: false,
    entry: 'scripts/setup-local-inference.mjs',
    consumers: ['npm run local:model:smoke']
  }
];

/** Neural HTTP paths that must stay unified — single policy gate and secrets. */
export const HOSTED_NLP_UNIFIED_IN_GATEWAY = true as const;

/** Distinct neural HTTP operations from the extension (both implemented in `nlpInferenceGateway`). */
const HOSTED_NEURAL_HTTP_OPERATIONS = ['chat/completions', 'embeddings'] as const;

export function hostedNeuralHttpOperationCount(): number {
  return HOSTED_NEURAL_HTTP_OPERATIONS.length;
}

/** All documented surfaces including rules engine + CLI (operator clarity). */
export function documentedMlPipelineSurfaceCount(): number {
  return ML_PIPELINE_STAGES.length;
}

export function summarizeMlInventoryLines(): string[] {
  const hosted = ML_PIPELINE_STAGES.filter(
    (s) =>
      s.inExtensionRuntime && (s.id === 'hosted-chat-completions' || s.id === 'hosted-embeddings')
  );
  return [
    `Hosted NLP unified in gateway: ${HOSTED_NLP_UNIFIED_IN_GATEWAY ? 'yes' : 'no'} — ${hostedNeuralHttpOperationCount()} HTTP operations (chat + embeddings) share resolveChatPolicy + API key.`,
    `Extension ML/neural stages (hosted): ${hosted.map((h) => h.label).join(' · ')}.`,
    `Total documented pipeline surfaces (rules + CLI included): ${documentedMlPipelineSurfaceCount()}.`
  ];
}
