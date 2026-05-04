import type { CopilotWorkerRegistrySettings } from '../types/domain';

/** Canonical seeded copilots — capped count mirrored in storage normalization. */
export const defaultCopilotWorkerRegistry = {
  activeWorkerId: 'brandops-default',
  workers: [
    {
      id: 'brandops-default',
      name: 'BrandOps Assistant',
      description: 'Balanced strategic assistant with conservative workspace actions.',
      systemInstructions:
        'You are concise, strategic, and execution-minded. Answer the operator directly.',
      allowedAgentCommands: ['pipeline health']
    },
    {
      id: 'pipeline-coach',
      name: 'Pipeline Coach',
      description: 'Prioritizes CRM health, ranking, and follow-up clarity.',
      systemInstructions:
        'Prioritize pipeline hygiene, opportunity ranking, urgency signals, and one concrete next action per reply.',
      allowedAgentCommands: ['pipeline health']
    },
    {
      id: 'content-strategist',
      name: 'Content Strategist',
      description: 'Angles for library and publishing narrative — no automatic workspace commands.',
      systemInstructions:
        'Focus on content angles, audience fit, hooks, and channel tone; avoid deep CRM mechanics unless asked.',
      allowedAgentCommands: [],
      contextHints: { includeBrandVault: true }
    }
  ]
} satisfies CopilotWorkerRegistrySettings;
