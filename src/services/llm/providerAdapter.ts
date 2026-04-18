import { AiGenerationRequest, AiGenerationResponse, AiProviderAdapter } from '../aiAdapters/types';
import { isAiProviderEnabled } from '../aiAdapters/runtimePolicy';

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

class DisabledProvider implements AiProviderAdapter {
  id = 'local' as const;

  async generate(request: AiGenerationRequest): Promise<AiGenerationResponse> {
    throw new Error(
      `Local AI provider is disabled by runtime policy. Core BrandOps workflows do not require AI generation. Objective: ${request.objective}`
    );
  }
}

export const llmProviderAdapter: AiProviderAdapter = isAiProviderEnabled('local')
  ? new LocalTemplateProvider()
  : new DisabledProvider();
