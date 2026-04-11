export type AiProviderId = 'local' | 'openai' | 'anthropic' | 'custom';

export interface AiGenerationRequest {
  objective: string;
  context?: Record<string, unknown>;
}

export interface AiGenerationResponse {
  text: string;
  provider: AiProviderId;
  model: string;
}

export interface AiProviderAdapter {
  id: AiProviderId;
  generate(request: AiGenerationRequest): Promise<AiGenerationResponse>;
}
