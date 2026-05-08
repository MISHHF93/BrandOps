/**
 * Single import surface for **hosted** neural inference inside the extension.
 *
 * Implementations live in {@link ./nlpInferenceGateway.ts}; this module exists so product code does
 * not scatter direct gateway imports and so docs can point to one funnel (`hostedNlp`).
 */

export type {
  ChatCompletionInput,
  ChatCompletionMessage,
  ChatCompletionResult,
  EmbeddingInput,
  EmbeddingsResult,
  HostedNlpRoutingPreview,
  NlpGatewayFailureCode
} from './nlpInferenceGateway';

export {
  describeHostedNlpRouting,
  joinOpenAiCompatibleUrl,
  runChatCompletion,
  runEmbeddings
} from './nlpInferenceGateway';

export {
  documentedMlPipelineSurfaceCount,
  HOSTED_NEURAL_HTTP_OPERATIONS,
  HOSTED_NLP_UNIFIED_IN_GATEWAY,
  hostedNeuralHttpOperationCount,
  ML_PIPELINE_STAGES,
  summarizeMlInventoryLines,
  type MlPipelineStage,
  type MlPipelineStageId
} from './mlPipelineRegistry';
