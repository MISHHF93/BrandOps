import { AiGenerationRequest, AiGenerationResponse, AiProviderAdapter } from '../aiAdapters/types';

class LocalTemplateProvider implements AiProviderAdapter {
  id = 'local' as const;

  async generate(request: AiGenerationRequest): Promise<AiGenerationResponse> {
    return {
      provider: this.id,
      model: 'template-v1',
      text: `Placeholder generation for objective: ${request.objective}`
    };
  }
}

export const llmProviderAdapter: AiProviderAdapter = new LocalTemplateProvider();
