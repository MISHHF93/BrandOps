import { AiProviderAdapter } from '../../services/aiAdapters/types';

export async function generateContentIdea(
  adapter: AiProviderAdapter,
  topic: string
): Promise<string> {
  const response = await adapter.generate({ objective: `Create a post outline about: ${topic}` });
  return response.text;
}
