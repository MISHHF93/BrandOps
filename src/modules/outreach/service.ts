import { AiProviderAdapter } from '../../services/aiAdapters/types';

export async function generateOutreachDraft(adapter: AiProviderAdapter, target: string): Promise<string> {
  const response = await adapter.generate({ objective: `Draft outreach message for ${target}` });
  return response.text;
}
