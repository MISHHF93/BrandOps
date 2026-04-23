/**
 * Local / stub LLM entrypoint. If you add a real OpenAI-style adapter, pass workspace `BrandProfile`
 * into the system or user turn using `formatBrandProfileForAi` / `getBrandTemplateReplacements` in
 * `../ai/brandProfileContext.ts` (plain labeled UTF-8; no embedding or custom model required).
 */
import { AiGenerationRequest, AiGenerationResponse, AiProviderAdapter } from '../aiAdapters/types';
import { isAiProviderEnabled } from '../aiAdapters/runtimePolicy';
import { agentOrchestrator } from '../agent/orchestrator';

class LocalTemplateProvider implements AiProviderAdapter {
  id = 'local' as const;

  async generate(request: AiGenerationRequest): Promise<AiGenerationResponse> {
    const objective = request.objective.trim() || 'your workflow objective';
    const orchestrated = await agentOrchestrator.execute({
      objective,
      context: request.context
    });

    return {
      provider: this.id,
      model: 'template-v1',
      text:
        `${orchestrated.responseText} ` +
        `Current objective: "${objective}". ` +
        'This local provider is a deterministic scaffold; connect external providers for production-grade generation.'
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
