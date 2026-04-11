import { llmProviderAdapter } from '../../services/llm/providerAdapter';
import { BrandOpsData, OutreachDraft } from '../../types/domain';

export async function generateOutreachDraft(
  data: BrandOpsData,
  targetName: string,
  targetRole: string,
  objective: string
): Promise<OutreachDraft> {
  const profile = data.promptProfiles.find((item) => item.id === data.settings.activePromptProfileId);
  const message = await llmProviderAdapter.generate(
    {
      goal: `Draft outreach to ${targetName} (${targetRole}) to ${objective}`,
      context: `Builder profile: ${data.brand.headline}. Collaboration modes: ${data.brand.collaborationModes.join(', ')}`,
      promptProfile: profile
    },
    data.settings
  );

  return {
    id: crypto.randomUUID(),
    targetName,
    targetRole,
    objective,
    message,
    createdAt: new Date().toISOString()
  };
}
