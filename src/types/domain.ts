export type OpportunityStage = 'lead' | 'discovery' | 'proposal' | 'active' | 'closed';

export interface BrandProfile {
  headline: string;
  tone: string;
  coreOffer: string;
  collaborationModes: string[];
  keywords: string[];
}

export interface PostDraft {
  id: string;
  idea: string;
  text: string;
  channel: 'linkedin' | 'x' | 'email';
  createdAt: string;
}

export interface OutreachDraft {
  id: string;
  targetName: string;
  targetRole: string;
  objective: string;
  message: string;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  company: string;
  contact: string;
  stage: OpportunityStage;
  valueUsd: number;
  notes: string;
  updatedAt: string;
}

export interface PromptProfile {
  id: string;
  name: string;
  stylePrompt: string;
  temperature: number;
}

export interface AppSettings {
  llmProvider: 'local' | 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  customEndpoint?: string;
  activePromptProfileId: string;
}

export interface BrandOpsData {
  brand: BrandProfile;
  posts: PostDraft[];
  outreach: OutreachDraft[];
  opportunities: Opportunity[];
  promptProfiles: PromptProfile[];
  settings: AppSettings;
}
