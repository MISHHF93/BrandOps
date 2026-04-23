/**
 * Logical document / marketing surface id. Used for `MobileApp` `surfaceLabel`, agent source
 * mapping, and related strings.
 *
 * **Shell hosts (`MobileApp`):** `mobile`, `welcome`, `dashboard`, `integrations` — all boot
 * through `renderChatbotSurface` (`src/pages/chatbotWeb/renderChatbotSurface.tsx`), which sets
 * `data-app-surface` on `<html>`.
 *
 * **`help`:** the Knowledge Center (`help.html` → `HelpKnowledgeRoot`) is **not** a `MobileApp`
 * host and does not use `renderChatbotSurface`. The id may still appear in docs, tests, or future
 * routing so it stays in this union.
 */
export type AppDocumentSurfaceId = 'mobile' | 'welcome' | 'dashboard' | 'integrations' | 'help';

/**
 * Maps the hosting document to the coarse agent / audit `source` expected by
 * `executeAgentWorkspaceCommand` (web bundle vs mobile primary entry).
 */
export function mapDocumentSurfaceToAgentSource(
  surface: string | undefined
): 'chatbot-web' | 'chatbot-mobile' {
  if (surface === 'mobile' || surface === 'chatbot' || surface === undefined || surface === '') {
    return 'chatbot-mobile';
  }
  return 'chatbot-web';
}
