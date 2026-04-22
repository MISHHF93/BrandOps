/**
 * `MobileApp` is hosted from multiple HTML documents. `data-app-surface` on `<html>` (set in
 * `renderChatbotSurface` and aligned with this list) and these props are the single source
 * of truth for which document is current — not a separate "chatbot-web" string on the component.
 */
export type AppDocumentSurfaceId = 'mobile' | 'welcome' | 'dashboard' | 'integrations' | 'help';

/**
 * Maps the hosting document to the coarse agent / audit `source` expected by
 * `executeAgentWorkspaceCommand` (web bundle vs mobile primary entry).
 */
export function mapDocumentSurfaceToAgentSource(
  surface: string | undefined
): 'chatbot-web' | 'chatbot-mobile' {
  if (
    surface === 'mobile' ||
    surface === 'chatbot' ||
    surface === undefined ||
    surface === ''
  ) {
    return 'chatbot-mobile';
  }
  return 'chatbot-web';
}
