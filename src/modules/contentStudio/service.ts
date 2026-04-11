import { llmProviderAdapter } from '../../services/llm/providerAdapter';
import { BrandOpsData, PostDraft } from '../../types/domain';

export async function generatePostDraft(data: BrandOpsData, idea: string): Promise<PostDraft> {
  const profile = data.promptProfiles.find((item) => item.id === data.settings.activePromptProfileId);
  const text = await llmProviderAdapter.generate(
    {
      goal: `Create LinkedIn post about: ${idea}`,
      context: `Headline: ${data.brand.headline}. Offer: ${data.brand.coreOffer}. Keywords: ${data.brand.keywords.join(', ')}`,
      promptProfile: profile
    },
    data.settings
  );

  return {
    id: crypto.randomUUID(),
    idea,
    text,
    channel: 'linkedin',
    createdAt: new Date().toISOString()
  };
}
