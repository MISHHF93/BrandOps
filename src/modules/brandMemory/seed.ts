import { BrandOpsData } from '../../types/domain';
import { workspaceModules } from '../../shared/config/modules';

export const seedData: BrandOpsData = {
  brand: {
    name: 'BrandOps',
    headline: 'Personal Brand OS for AI Builders',
    tone: 'strategic, sharp, premium, technical',
    coreOffer: 'Turn brand strategy into repeatable execution systems.',
    collaborationModes: ['Fractional advisory', 'Hands-on build sprint', 'Strategic content partner'],
    keywords: ['authority positioning', 'ai workflows', 'lead generation systems', 'thought leadership']
  },
  opportunities: [
    {
      id: 'opp-001',
      company: 'Northstar Ventures',
      contact: 'Taylor Chen',
      stage: 'discovery',
      valueUsd: 24000,
      nextStep: 'Send tailored proposal deck',
      updatedAt: new Date().toISOString()
    }
  ],
  modules: workspaceModules,
  settings: {
    llmProvider: 'local',
    activePromptProfileId: 'operator-v1'
  },
  seed: {
    seededAt: new Date().toISOString(),
    source: 'default-demo',
    version: '0.1.0'
  }
};
