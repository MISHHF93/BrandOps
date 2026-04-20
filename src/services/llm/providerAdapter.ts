import { AiGenerationRequest, AiGenerationResponse, AiProviderAdapter } from '../aiAdapters/types';
import { isAiProviderEnabled } from '../aiAdapters/runtimePolicy';

class LocalTemplateProvider implements AiProviderAdapter {
  id = 'local' as const;

  async generate(request: AiGenerationRequest): Promise<AiGenerationResponse> {
    const objective = request.objective.trim() || 'your workflow objective';
    return {
      provider: this.id,
      model: 'template-v1',
      text: `AI generation is not enabled for this build yet. Capture objective "${objective}" in your notes and complete this draft manually from the dashboard context.`
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
