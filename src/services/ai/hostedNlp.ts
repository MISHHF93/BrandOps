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

export { runChatCompletion, runEmbeddings } from './nlpInferenceGateway';

export { type MlPipelineStage, type MlPipelineStageId } from './mlPipelineRegistry';
