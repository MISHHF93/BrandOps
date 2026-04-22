/**
 * Where workspace mutations are allowed. Chatbot and channel ingress should use
 * {@link executeAgentWorkspaceCommand}. Direct `storageService` access lives in
 * the command engine, background, scheduler paths, and optional content scripts.
 */
export const MUTATION_SURFACES = {
  /** Primary: chat UI + all web entrypoints using MobileApp. */
  agentCommandEngine: 'src/services/agent/agentWorkspaceEngine.ts',
  /** Adapters: Telegram / WhatsApp / webhooks through background. */
  backgroundRuntime: 'src/background/index.ts',
  /** Optional: LinkedIn page companion; writes through storage (capture flows). */
  linkedinContentScript: 'src/content/linkedinOverlay.ts'
} as const;
