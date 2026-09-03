export type BrandOpsAgentId =
  | 'orchestrator'
  | 'workspace'
  | 'research'
  | 'content-brand'
  | 'growth'
  | 'operations'
  | 'builder'
  | 'media';

export type BrandOpsAgentModelRoute =
  | 'reasoning'
  | 'throughput'
  | 'voice'
  | 'transcription'
  | 'speech'
  | 'image'
  | 'embedding';

export interface BrandOpsAgentDefinition {
  id: BrandOpsAgentId;
  name: string;
  description: string;
  capabilities: readonly string[];
  connectorFamilies: readonly string[];
  defaultModelRoute: BrandOpsAgentModelRoute;
}

export interface BrandOpsSystemAgentDefinition {
  id:
    | 'router'
    | 'memory'
    | 'verification'
    | 'permissions'
    | 'security'
    | 'analytics'
    | 'cost-optimizer'
    | 'workflow-scheduler';
  name: string;
  responsibility: string;
}

export interface BrandOpsModelRouterSettings {
  reasoningModelId: string;
  throughputModelId: string;
  voiceModelId: string;
  transcriptionModelId: string;
  speechModelId: string;
  imageModelId: string;
  embeddingModelId: string;
}

export const BRANDOPS_AGENT_CATALOG: readonly BrandOpsAgentDefinition[] = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    description: 'Decomposes requests, routes specialists, gathers approvals, and verifies outcomes.',
    capabilities: ['route work', 'approval planning', 'outcome verification'],
    connectorFamilies: ['all'],
    defaultModelRoute: 'reasoning'
  },
  {
    id: 'workspace',
    name: 'Workspace',
    description: 'Works across Gmail, Calendar, Drive, Docs, Sheets, Slides, Meet, and Chat.',
    capabilities: ['workspace context', 'documents', 'calendar', 'messages'],
    connectorFamilies: ['google', 'microsoft', 'communication', 'knowledge'],
    defaultModelRoute: 'throughput'
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Searches, compares, summarizes, and produces grounded research briefs.',
    capabilities: ['search', 'synthesis', 'source grounding'],
    connectorFamilies: ['knowledge', 'data', 'google'],
    defaultModelRoute: 'reasoning'
  },
  {
    id: 'content-brand',
    name: 'Content & Brand',
    description: 'Creates brand-aware content, campaigns, repurposing plans, and editorial calendars.',
    capabilities: ['brand voice', 'content drafts', 'publishing plans'],
    connectorFamilies: ['social', 'marketing', 'knowledge'],
    defaultModelRoute: 'reasoning'
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Turns analytics, engagement, conversion, and audience signals into next actions.',
    capabilities: ['analytics', 'experiments', 'opportunity signals'],
    connectorFamilies: ['marketing', 'data', 'social', 'google'],
    defaultModelRoute: 'throughput'
  },
  {
    id: 'operations',
    name: 'Operations',
    description: 'Coordinates workflows, follow-ups, approvals, tasks, and recurring operations.',
    capabilities: ['workflow execution', 'follow-ups', 'scheduling'],
    connectorFamilies: ['automation', 'crm', 'meetings', 'google'],
    defaultModelRoute: 'throughput'
  },
  {
    id: 'builder',
    name: 'Builder',
    description: 'Builds and debugs code, APIs, integrations, MCP tools, and technical projects.',
    capabilities: ['code', 'integrations', 'testing'],
    connectorFamilies: ['development', 'mcp', 'observability', 'google'],
    defaultModelRoute: 'reasoning'
  },
  {
    id: 'media',
    name: 'Media',
    description: 'Handles images, voice, transcription, video, and visual asset workflows.',
    capabilities: ['image generation', 'transcription', 'voice'],
    connectorFamilies: ['social', 'ai', 'google'],
    defaultModelRoute: 'image'
  }
];

export const BRANDOPS_SYSTEM_AGENT_CATALOG: readonly BrandOpsSystemAgentDefinition[] = [
  { id: 'router', name: 'Router', responsibility: 'Selects agents and tools for the declared intent.' },
  { id: 'memory', name: 'Memory', responsibility: 'Retrieves and stores governed Digital Twin context.' },
  { id: 'verification', name: 'Verification', responsibility: 'Checks evidence, outcomes, and execution receipts.' },
  { id: 'permissions', name: 'Permissions', responsibility: 'Scopes context, capabilities, and approvals.' },
  { id: 'security', name: 'Security', responsibility: 'Enforces trust boundaries and connector safeguards.' },
  { id: 'analytics', name: 'Analytics', responsibility: 'Normalizes performance and outcome signals.' },
  { id: 'cost-optimizer', name: 'Cost Optimizer', responsibility: 'Chooses efficient model paths within policy.' },
  { id: 'workflow-scheduler', name: 'Workflow Scheduler', responsibility: 'Coordinates recurring work and timing.' }
];

export const DEFAULT_BRANDOPS_MODEL_ROUTER: BrandOpsModelRouterSettings = {
  reasoningModelId: 'gemini-3.8-flash',
  throughputModelId: 'gemini-3.5-flash-lite',
  voiceModelId: 'gemini-3.1-flash-live',
  transcriptionModelId: 'gemini-3.5-transcribe',
  speechModelId: 'gemini-3.1-flash-tts',
  imageModelId: 'nano-banana-2',
  embeddingModelId: 'gemini-embedding-2'
};

export function modelIdForAgent(
  agentId: BrandOpsAgentId,
  settings: BrandOpsModelRouterSettings = DEFAULT_BRANDOPS_MODEL_ROUTER
): string {
  const agent = BRANDOPS_AGENT_CATALOG.find((candidate) => candidate.id === agentId);
  if (!agent) return settings.reasoningModelId;
  return settings[`${agent.defaultModelRoute}ModelId`];
}

export function resolveBrandOpsAgent(agentId: string): BrandOpsAgentDefinition | null {
  return BRANDOPS_AGENT_CATALOG.find((agent) => agent.id === agentId) ?? null;
}