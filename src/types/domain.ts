export type ExtensionSurface = 'popup' | 'dashboard' | 'options' | 'content';

export type OpportunityStage = 'lead' | 'discovery' | 'proposal' | 'active' | 'closed';

export type WorkspaceModuleId =
  | 'dashboard'
  | 'brand-memory'
  | 'content-studio'
  | 'outreach-assistant'
  | 'opportunity-crm'
  | 'settings';

export interface WorkspaceModule {
  id: WorkspaceModuleId;
  title: string;
  description: string;
  status: 'available' | 'planned';
}

export interface BrandProfile {
  name: string;
  headline: string;
  tone: string;
  coreOffer: string;
  collaborationModes: string[];
  keywords: string[];
}

export interface AppSettings {
  llmProvider: 'local' | 'openai' | 'anthropic' | 'custom';
  activePromptProfileId: string;
  customEndpoint?: string;
  apiKey?: string;
}

export interface Opportunity {
  id: string;
  company: string;
  contact: string;
  stage: OpportunityStage;
  valueUsd: number;
  nextStep: string;
  updatedAt: string;
}

export interface SeedMetadata {
  seededAt: string;
  source: 'default-demo';
  version: string;
}

export interface BrandOpsData {
  brand: BrandProfile;
  opportunities: Opportunity[];
  modules: WorkspaceModule[];
  settings: AppSettings;
  seed: SeedMetadata;
}
