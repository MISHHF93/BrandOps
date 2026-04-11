import { AppSettings, PromptProfile } from '../../types/domain';

export interface LlmGenerationInput {
  goal: string;
  context: string;
  promptProfile?: PromptProfile;
}

export interface LlmProvider {
  generate(input: LlmGenerationInput, settings: AppSettings): Promise<string>;
}

class LocalTemplateProvider implements LlmProvider {
  async generate(input: LlmGenerationInput): Promise<string> {
    const style = input.promptProfile?.stylePrompt ?? 'Clear technical tone';
    return `Goal: ${input.goal}\n\nContext: ${input.context}\n\nDraft (${style}):\nI help teams design and ship AI systems that deliver measurable business outcomes. Let's align on one high-impact workflow and ship quickly.`;
  }
}

export const llmProviderAdapter: LlmProvider = new LocalTemplateProvider();
