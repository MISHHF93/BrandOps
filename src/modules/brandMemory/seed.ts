import { BrandOpsData } from '../../types/domain';

export const seedData: BrandOpsData = {
  brand: {
    headline: 'AI Systems Architect | End-to-End AI Product Builder',
    tone: 'confident, pragmatic, technical',
    coreOffer: 'Design and ship AI systems from ideation to production.',
    collaborationModes: ['Consulting sprint', 'Fractional AI lead', 'Delivery partner'],
    keywords: ['RAG', 'agentic workflows', 'MLOps', 'product strategy']
  },
  posts: [
    {
      id: 'post-1',
      idea: 'What most teams get wrong with AI adoption',
      text: 'AI value appears when you redesign workflows, not when you only add a model call.',
      channel: 'linkedin',
      createdAt: new Date().toISOString()
    }
  ],
  outreach: [
    {
      id: 'outreach-1',
      targetName: 'Jordan',
      targetRole: 'Head of Product',
      objective: 'Book a 20 min discovery call',
      message: 'I help teams move from AI experiments to production outcomes. Open to compare notes?',
      createdAt: new Date().toISOString()
    }
  ],
  opportunities: [
    {
      id: 'opp-1',
      company: 'Northstar Labs',
      contact: 'Jordan M',
      stage: 'discovery',
      valueUsd: 25000,
      notes: 'Needs agent workflow for customer support.',
      updatedAt: new Date().toISOString()
    }
  ],
  promptProfiles: [
    {
      id: 'default',
      name: 'Operator Voice',
      stylePrompt: 'Write concise, technical, outcomes-focused messaging with confident tone.',
      temperature: 0.4
    }
  ],
  settings: {
    llmProvider: 'local',
    activePromptProfileId: 'default'
  }
};
