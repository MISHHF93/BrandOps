/**
 * Where workspace mutations are allowed. Chatbot and channel ingress should use
 * {@link executeAgentWorkspaceCommand}; legacy Zustand actions remain for unused module panels
 * and must not be mounted from chatbot entrypoints.
 */
export const MUTATION_SURFACES = {
  /** Primary: chat UI + all web entrypoints using MobileApp. */
  agentCommandEngine: 'src/services/agent/agentWorkspaceEngine.ts',
  /** Adapters: Telegram / WhatsApp / webhooks through background. */
  backgroundRuntime: 'src/background/index.ts',
  /** Optional: LinkedIn page companion; writes through storage (capture flows). */
  linkedinContentScript: 'src/content/linkedinOverlay.ts',
  /** Legacy: Zustand store — keep for unmounted module panels; prefer engine for new work. */
  brandOpsStore: 'src/state/useBrandOpsStore.ts'
} as const;
